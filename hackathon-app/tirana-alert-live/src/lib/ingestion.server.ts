// Server-only ingestion pipeline. Import only from server routes/handlers.
import { XMLParser } from "fast-xml-parser";
import { generateText, Output } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type SourceRow = { id: string; url: string; name: string; kind: "rss" | "google_news" };
type FeedItem = { title: string; description: string; link: string; pubDate: string; image?: string; sourceName: string };

const TIRANA_BBOX = { latMin: 41.27, latMax: 41.4, lngMin: 19.72, lngMax: 19.91 };
const EVENT_TYPES = ["accident", "traffic", "fire", "flood", "protest", "police", "power_outage", "weather", "other"] as const;
const EXPIRY_HOURS: Record<(typeof EVENT_TYPES)[number], number> = {
  traffic: 2, accident: 4, fire: 8, flood: 24, protest: 12, police: 4, power_outage: 6, weather: 12, other: 4,
};

const ExtractionSchema = z.object({
  is_event: z.boolean(),
  event_type: z.enum(EVENT_TYPES).optional(),
  severity: z.enum(["critical", "warning", "info"]).optional(),
  title_sq: z.string().max(80).optional(),
  title_en: z.string().max(80).optional(),
  summary: z.string().max(280).optional(),
  location_name: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
  is_active: z.boolean().optional(),
});

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function tokens(s: string): Set<string> {
  return new Set(
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9ëçÿ\s]/gi, " ").split(/\s+/).filter((w) => w.length >= 3),
  );
}
function titleSimilarity(a: string, b: string): number {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

async function fetchFeed(src: SourceRow): Promise<FeedItem[]> {
  const res = await fetch(src.url, {
    headers: { "User-Agent": "TiranaAI/1.0 (+https://tiranaflow.app)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel ?? parsed?.feed;
  if (!channel) return [];
  const rawItems = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : Array.isArray(channel.entry) ? channel.entry : [];
  return rawItems.map((it: Record<string, unknown>) => {
    const link = typeof it.link === "string" ? it.link : (it.link as { "@_href"?: string })?.["@_href"] ?? "";
    const enclosure = it.enclosure as { "@_url"?: string } | undefined;
    const media = it["media:content"] as { "@_url"?: string } | undefined;
    return {
      title: stripHtml(String(it.title ?? "")),
      description: stripHtml(String(it.description ?? it.summary ?? "")),
      link: String(link),
      pubDate: String(it.pubDate ?? it.published ?? it.updated ?? ""),
      image: enclosure?.["@_url"] ?? media?.["@_url"],
      sourceName: src.name,
    } as FeedItem;
  }).filter((i: FeedItem) => i.link && i.title);
}

async function geocode(rawQuery: string, errors: Array<{ kind: string; message: string }>): Promise<{ lat: number; lng: number } | null> {
  const query = `${rawQuery}, Tirana, Albania`.trim();
  const { data: cached } = await supabaseAdmin.from("geocode_cache").select("lat,lng").eq("query", query).maybeSingle();
  if (cached) return cached.lat == null || cached.lng == null ? null : { lat: cached.lat, lng: cached.lng };

  // Nominatim 1 req/sec
  await new Promise((r) => setTimeout(r, 1100));
  try {
    const u = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const r = await fetch(u, { headers: { "User-Agent": "TiranaAI/1.0" }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`Nominatim HTTP ${r.status}`);
    const arr = (await r.json()) as Array<{ lat: string; lon: string }>;
    const hit = arr[0];
    const lat = hit ? parseFloat(hit.lat) : null;
    const lng = hit ? parseFloat(hit.lon) : null;
    await supabaseAdmin.from("geocode_cache").upsert({ query, lat, lng });
    return lat != null && lng != null ? { lat, lng } : null;
  } catch (e) {
    errors.push({ kind: "geocode", message: e instanceof Error ? e.message : String(e) });
    await supabaseAdmin.from("geocode_cache").upsert({ query, lat: null, lng: null });
    return null;
  }
}

export async function runIngestion(): Promise<{ items_fetched: number; events_created: number; events_deduped: number; errors: Array<{ kind: string; message: string }>; duration_ms: number }> {
  const start = Date.now();
  const errors: Array<{ kind: string; message: string }> = [];
  let itemsFetched = 0;
  let eventsCreated = 0;
  let eventsDeduped = 0;

  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    errors.push({ kind: "config", message: "LOVABLE_API_KEY missing" });
    return { items_fetched: 0, events_created: 0, events_deduped: 0, errors, duration_ms: Date.now() - start };
  }

  const { data: sources, error: srcErr } = await supabaseAdmin.from("sources").select("id,url,name,kind").eq("enabled", true);
  if (srcErr || !sources) {
    errors.push({ kind: "sources", message: srcErr?.message ?? "no sources" });
    return { items_fetched: 0, events_created: 0, events_deduped: 0, errors, duration_ms: Date.now() - start };
  }

  // Fetch all feeds in parallel
  const settled = await Promise.allSettled(sources.map((s) => fetchFeed(s as SourceRow)));
  const allItems: FeedItem[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") allItems.push(...r.value);
    else errors.push({ kind: "feed", message: `${sources[i].name}: ${String(r.reason)}` });
  });
  itemsFetched = allItems.length;

  const sixHoursAgo = Date.now() - 6 * 3600 * 1000;
  const gateway = createLovableAiGatewayProvider(key);

  // Cap per-run AI calls to keep cost / latency reasonable
  const MAX_PER_RUN = 40;
  let aiCalls = 0;

  for (const item of allItems) {
    if (aiCalls >= MAX_PER_RUN) break;

    const ts = item.pubDate ? Date.parse(item.pubDate) : Date.now();
    if (!Number.isNaN(ts) && ts < sixHoursAgo) continue;

    const linkHash = await sha256Hex(item.link);
    const { data: seen } = await supabaseAdmin.from("processed_items").select("link_hash").eq("link_hash", linkHash).maybeSingle();
    if (seen) continue;

    // Mark processed immediately to prevent re-attempts even if extraction fails
    await supabaseAdmin.from("processed_items").insert({ link_hash: linkHash });

    aiCalls++;
    let extracted: z.infer<typeof ExtractionSchema>;
    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        experimental_output: Output.object({ schema: ExtractionSchema }),
        prompt: `You are extracting live incidents in Tirana, Albania from a news article. Return STRICT JSON only, no markdown, no prose. If the article is not about a CURRENT incident in Tirana (within the last day, still relevant), return {"is_event": false}.

Article title: ${item.title}
Article description: ${item.description}
Published: ${item.pubDate}

Required JSON schema:
{
  "is_event": boolean,
  "event_type": one of ["accident","traffic","fire","flood","protest","police","power_outage","weather","other"],
  "severity": one of ["critical","warning","info"],
  "title_sq": short Albanian title (max 60 chars),
  "title_en": short English title (max 60 chars),
  "summary": one factual sentence,
  "location_name": specific neighborhood, street, or landmark in Tirana, or null if not clearly stated,
  "confidence": 0.0 to 1.0,
  "is_active": false only if clearly resolved/past
}

Rules: If location is outside Tirana municipality, return is_event=false. If the article is opinion, politics, or general news without a physical incident, return is_event=false.`,
      });
      extracted = experimental_output as z.infer<typeof ExtractionSchema>;
    } catch (e) {
      errors.push({ kind: "ai", message: e instanceof Error ? e.message : String(e) });
      continue;
    }

    if (!extracted.is_event || !extracted.event_type || !extracted.severity || !extracted.location_name) continue;
    if ((extracted.confidence ?? 0) < 0.6) continue;
    if (extracted.is_active === false) continue;

    const geo = await geocode(extracted.location_name, errors);
    if (!geo) continue;
    if (geo.lat < TIRANA_BBOX.latMin || geo.lat > TIRANA_BBOX.latMax || geo.lng < TIRANA_BBOX.lngMin || geo.lng > TIRANA_BBOX.lngMax) continue;

    // Dedupe: last 12h, same type, <300m, title sim >0.65
    const twelveHoursAgo = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("events")
      .select("id,title_en,title_sq,lat,lng,source_count,sources")
      .eq("event_type", extracted.event_type)
      .gte("created_at", twelveHoursAgo);

    const sourceEntry = { url: item.link, name: item.sourceName, fetched_at: new Date().toISOString() };
    const titleEn = extracted.title_en ?? item.title.slice(0, 80);
    const titleSq = extracted.title_sq ?? item.title.slice(0, 80);

    const dup = (recent ?? []).find((r) => {
      const dist = haversineM({ lat: r.lat, lng: r.lng }, geo);
      if (dist > 300) return false;
      const simEn = titleSimilarity(r.title_en, titleEn);
      const simSq = titleSimilarity(r.title_sq, titleSq);
      return Math.max(simEn, simSq) > 0.65;
    });

    if (dup) {
      const existingSources = Array.isArray(dup.sources) ? (dup.sources as Array<{ url: string }>) : [];
      if (existingSources.some((s) => s.url === item.link)) continue;
      await supabaseAdmin
        .from("events")
        .update({
          source_count: dup.source_count + 1,
          sources: [...existingSources, sourceEntry],
          status: dup.source_count + 1 >= 2 ? "confirmed" : "unconfirmed",
        })
        .eq("id", dup.id);
      eventsDeduped++;
      continue;
    }

    const hours = EXPIRY_HOURS[extracted.event_type];
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    const { error: insErr } = await supabaseAdmin.from("events").insert({
      event_type: extracted.event_type,
      severity: extracted.severity,
      title_en: titleEn,
      title_sq: titleSq,
      summary: extracted.summary ?? null,
      location_name: extracted.location_name,
      lat: geo.lat,
      lng: geo.lng,
      confidence: extracted.confidence ?? 0.7,
      source_count: 1,
      sources: [sourceEntry],
      image_url: item.image ?? null,
      expires_at: expiresAt,
      status: "unconfirmed",
    });
    if (insErr) errors.push({ kind: "insert", message: insErr.message });
    else eventsCreated++;
  }

  const duration = Date.now() - start;
  await supabaseAdmin.from("ingestion_log").insert({
    items_fetched: itemsFetched,
    events_created: eventsCreated,
    events_deduped: eventsDeduped,
    errors,
    duration_ms: duration,
  });

  return { items_fetched: itemsFetched, events_created: eventsCreated, events_deduped: eventsDeduped, errors, duration_ms: duration };
}

export async function runExpiry(): Promise<{ expired: number }> {
  const { data, error } = await supabaseAdmin
    .from("events")
    .update({ is_active: false })
    .lt("expires_at", new Date().toISOString())
    .eq("is_active", true)
    .select("id");
  if (error) throw error;
  return { expired: data?.length ?? 0 };
}

// Lightweight poll: fetch feeds, return true if any item is not yet in processed_items.
// Does NOT call AI or geocoding — safe to run every minute.
export async function checkForNewItems(): Promise<{ has_new: boolean; new_count: number; checked: number; errors: number }> {
  const { data: sources } = await supabaseAdmin.from("sources").select("id,url,name,kind").eq("enabled", true);
  if (!sources?.length) return { has_new: false, new_count: 0, checked: 0, errors: 0 };

  const settled = await Promise.allSettled(sources.map((s) => fetchFeed(s as SourceRow)));
  const items: FeedItem[] = [];
  let errors = 0;
  settled.forEach((r) => {
    if (r.status === "fulfilled") items.push(...r.value);
    else errors++;
  });

  const sixHoursAgo = Date.now() - 6 * 3600 * 1000;
  const recent = items.filter((i) => {
    const ts = i.pubDate ? Date.parse(i.pubDate) : Date.now();
    return Number.isNaN(ts) || ts >= sixHoursAgo;
  });
  if (!recent.length) return { has_new: false, new_count: 0, checked: items.length, errors };

  const hashes = await Promise.all(recent.map((i) => sha256Hex(i.link)));
  const { data: seen } = await supabaseAdmin.from("processed_items").select("link_hash").in("link_hash", hashes);
  const seenSet = new Set((seen ?? []).map((s) => s.link_hash));
  const newCount = hashes.filter((h) => !seenSet.has(h)).length;
  return { has_new: newCount > 0, new_count: newCount, checked: items.length, errors };
}
