import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@5.2.5";

type FeedItem = { title: string; link: string; description: string; publishedAt: string; sourceName: string };
type ExtractedEvent = {
  source_index: number;
  is_event: boolean;
  event_type: "accident" | "traffic" | "fire" | "flood" | "protest" | "police" | "power_outage" | "weather" | "other";
  severity: "critical" | "warning" | "info";
  title_sq: string;
  title_en: string;
  summary: string | null;
  location_name: string | null;
  confidence: number;
};

const eventTypes = new Set<ExtractedEvent["event_type"]>([
  "accident", "traffic", "fire", "flood", "protest", "police", "power_outage", "weather", "other",
]);
const severities = new Set<ExtractedEvent["severity"]>(["critical", "warning", "info"]);

const normalizeConfidence = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.min(1, Math.max(0, value));
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return Math.min(1, Math.max(0, numeric));
  const label = String(value ?? "").toLowerCase();
  if (label === "high") return 0.85;
  if (label === "medium") return 0.65;
  if (label === "low") return 0.4;
  return 0;
};

const normalizeExtractedEvent = (value: unknown): ExtractedEvent | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const sourceIndex = Number(row.source_index);
  if (!Number.isInteger(sourceIndex) || sourceIndex < 0) return null;
  const eventType = String(row.event_type ?? "other") as ExtractedEvent["event_type"];
  const severity = String(row.severity ?? "info") as ExtractedEvent["severity"];
  const locationName = typeof row.location_name === "string" && row.location_name.trim() ? row.location_name.trim() : null;
  return {
    source_index: sourceIndex,
    is_event: row.is_event === true || String(row.is_event).toLowerCase() === "true",
    event_type: eventTypes.has(eventType) ? eventType : "other",
    severity: severities.has(severity) ? severity : "info",
    title_sq: String(row.title_sq ?? "").trim(),
    title_en: String(row.title_en ?? row.title_sq ?? "").trim(),
    summary: typeof row.summary === "string" && row.summary.trim() ? row.summary.trim() : null,
    location_name: locationName,
    confidence: normalizeConfidence(row.confidence),
  };
};

const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
});
const asArray = <T>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
const text = (value: unknown) => typeof value === "string" ? value : value && typeof value === "object" && "#text" in value ? String((value as { "#text": unknown })["#text"]) : "";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const expiryHours: Record<ExtractedEvent["event_type"], number> = { accident: 4, traffic: 2, fire: 8, flood: 24, protest: 12, police: 4, power_outage: 6, weather: 12, other: 4 };

const hash = async (value: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const parseFeed = (xml: string, sourceName: string): FeedItem[] => {
  const parsed = new XMLParser({ ignoreAttributes: false, trimValues: true }).parse(xml);
  const nodes = asArray(parsed?.rss?.channel?.item ?? parsed?.feed?.entry);
  return nodes.slice(0, 20).map((item: Record<string, unknown>) => {
    const linkValue = item.link;
    const link = typeof linkValue === "string" ? linkValue : Array.isArray(linkValue) ? String((linkValue[0] as Record<string, unknown>)?.["@_href"] ?? "") : String((linkValue as Record<string, unknown>)?.["@_href"] ?? "");
    return {
      title: text(item.title),
      link,
      description: text(item.description ?? item.summary ?? item.content),
      publishedAt: text(item.pubDate ?? item.published ?? item.updated) || new Date().toISOString(),
      sourceName,
    };
  }).filter((item) => item.title && item.link);
};

const extractWithGemini = async (items: FeedItem[], apiKey: string): Promise<ExtractedEvent[]> => {
  const prompt = `Analyze these Albanian news items for current physical incidents inside Tirana municipality. Return JSON only as an array. Each object must contain source_index, is_event, event_type, severity, title_sq, title_en, summary, location_name, confidence. Valid event_type: accident, traffic, fire, flood, protest, police, power_outage, weather, other. Valid severity: critical, warning, info. Ignore politics, opinion, sports, national stories outside Tirana, and stale non-actionable news. location_name must be specific enough to geocode or null.\n\n${items.map((item, index) => `[${index}] ${item.title}\n${item.description.slice(0, 700)}`).join("\n\n")}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json", maxOutputTokens: 4000 },
    }),
  });
  if (!response.ok) throw new Error(`Gemini extraction failed (${response.status})`);
  const result = await response.json();
  const raw = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.events) ? parsed.events : [];
  return rows.map(normalizeExtractedEvent).filter((event): event is ExtractedEvent => event !== null);
};

const geocode = async (supabase: ReturnType<typeof createClient>, location: string) => {
  const query = `${location}, Tirana, Albania`;
  const { data: cached } = await supabase.from("geocode_cache").select("lat,lng").eq("query", query).maybeSingle();
  if (cached?.lat && cached?.lng) return { lat: cached.lat as number, lng: cached.lng as number };
  await sleep(1050);
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=al&q=${encodeURIComponent(query)}`, { headers: { "User-Agent": "TiranaFlow/1.0" } });
  const rows = await response.json();
  const lat = Number(rows?.[0]?.lat);
  const lng = Number(rows?.[0]?.lon);
  const valid = Number.isFinite(lat) && Number.isFinite(lng) && lat >= 41.27 && lat <= 41.4 && lng >= 19.72 && lng <= 19.91;
  await supabase.from("geocode_cache").upsert({ query, lat: valid ? lat : null, lng: valid ? lng : null });
  return valid ? { lat, lng } : null;
};

const distanceMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * 6371000;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return json({ ok: true });
  const startedAt = Date.now();
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || request.headers.get("x-cron-secret") !== expected) return json({ error: "Unauthorized" }, 401);
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return json({ error: "Missing GEMINI_API_KEY" }, 500);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const errors: { source?: string; message: string }[] = [];
  let fetched = 0;
  let created = 0;
  let deduped = 0;

  try {
    const { data: sources, error: sourceError } = await supabase.from("sources").select("url,name").eq("enabled", true);
    if (sourceError) throw sourceError;
    const feedResults = await Promise.allSettled((sources ?? []).map(async (source) => {
      const response = await fetch(source.url, { signal: AbortSignal.timeout(12000), headers: { "User-Agent": "TiranaFlow/1.0" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return parseFeed(await response.text(), source.name);
    }));

    const allItems: FeedItem[] = [];
    feedResults.forEach((result, index) => {
      if (result.status === "fulfilled") allItems.push(...result.value);
      else errors.push({ source: sources?.[index]?.name, message: String(result.reason) });
    });
    fetched = allItems.length;

    const recentCutoff = Date.now() - 10 * 60 * 60 * 1000;
    const candidates: { item: FeedItem; linkHash: string }[] = [];
    for (const item of allItems) {
      if (new Date(item.publishedAt).getTime() < recentCutoff) continue;
      const linkHash = await hash(item.link);
      const { data: processed } = await supabase.from("processed_items").select("link_hash").eq("link_hash", linkHash).maybeSingle();
      if (!processed) candidates.push({ item, linkHash });
    }

    for (let offset = 0; offset < candidates.length; offset += 12) {
      const batch = candidates.slice(offset, offset + 12);
      let extracted: ExtractedEvent[] = [];
      let extractionSucceeded = true;
      const retryIndexes = new Set<number>();
      try { extracted = await extractWithGemini(batch.map((entry) => entry.item), geminiKey); }
      catch (error) {
        extractionSucceeded = false;
        errors.push({ message: error instanceof Error ? error.message : "AI extraction failed" });
      }

      for (const result of extracted) {
        const entry = batch[result.source_index];
        if (!entry || !result.is_event || result.confidence < 0.6 || !result.location_name) continue;
        const point = await geocode(supabase, result.location_name);
        if (!point) continue;

        const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
        const { data: nearby } = await supabase.from("events").select("id,lat,lng,source_count,sources").eq("event_type", result.event_type).gte("created_at", since).eq("is_active", true);
        const existing = nearby?.find((event) => distanceMeters(point, { lat: event.lat, lng: event.lng }) < 300);
        const source = { url: entry.item.link, name: entry.item.sourceName, fetched_at: new Date().toISOString() };

        if (existing) {
          await supabase.from("events").update({ source_count: existing.source_count + 1, sources: [...(Array.isArray(existing.sources) ? existing.sources : []), source], status: "confirmed" }).eq("id", existing.id);
          deduped += 1;
        } else {
          const expiresAt = new Date(Date.now() + expiryHours[result.event_type] * 60 * 60 * 1000).toISOString();
          const { error } = await supabase.from("events").insert({
            event_type: result.event_type,
            severity: result.severity,
            title_sq: result.title_sq,
            title_en: result.title_en,
            summary: result.summary,
            location_name: result.location_name,
            confidence: result.confidence,
            lat: point.lat,
            lng: point.lng,
            sources: [source],
            source_count: 1,
            status: "unconfirmed",
            expires_at: expiresAt,
          });
          if (error) {
            retryIndexes.add(result.source_index);
            errors.push({ source: entry.item.sourceName, message: error.message });
          } else created += 1;
        }
      }

      if (extractionSucceeded) {
        const processed = batch
          .filter((_, index) => !retryIndexes.has(index))
          .map((entry) => ({ link_hash: entry.linkHash }));
        if (processed.length) await supabase.from("processed_items").upsert(processed);
      }
    }
  } catch (error) {
    errors.push({ message: error instanceof Error ? error.message : "Ingestion failed" });
  }

  const duration = Date.now() - startedAt;
  await supabase.from("ingestion_log").insert({ items_fetched: fetched, events_created: created, events_deduped: deduped, errors, duration_ms: duration });
  return json({ items_fetched: fetched, events_created: created, events_deduped: deduped, errors, duration_ms: duration });
});
