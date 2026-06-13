import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { EVENT_TYPE_META, EVENT_SEVERITY_META } from "@/lib/event-meta";

type ChatMsg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const body = (await request.json()) as { messages?: ChatMsg[] };
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (messages.length === 0) return new Response("messages required", { status: 400 });

        const auth = request.headers.get("authorization") ?? "";
        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const PUB = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const sb = createClient(SUPABASE_URL, PUB, {
          global: { headers: auth ? { Authorization: auth } : {} },
          auth: { persistSession: false },
        });

        const { data: events } = await sb
          .from("events")
          .select("event_type,severity,title_en,title_sq,summary,location_name,lat,lng,source_count,status,created_at,expires_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(120);

        const fmt = (e: NonNullable<typeof events>[number]) => {
          const t = EVENT_TYPE_META[e.event_type as keyof typeof EVENT_TYPE_META]?.label ?? e.event_type;
          const s = EVENT_SEVERITY_META[e.severity as keyof typeof EVENT_SEVERITY_META]?.label ?? e.severity;
          const mins = Math.round((Date.now() - new Date(e.created_at).getTime()) / 60000);
          const corr = e.source_count > 1 ? ` · ${e.source_count} sources` : "";
          return `- [${s}] ${t} @ ${e.location_name} · ${mins}m ago${corr} (${e.status}) — ${e.title_en}${e.summary ? ` · ${e.summary}` : ""}`;
        };

        const ground = (events ?? []).map(fmt).join("\n");

        const system = `You are TiranaFlow's live city intelligence assistant for Tirana, Albania. Answer using ONLY the verified live incidents below — never invent. These come from Albanian news sources (Top Channel, Balkanweb, Reporter.al, Panorama, Syri.net, Google News, etc.), AI-extracted and geocoded within Tirana municipality. Multi-source events ("N sources") are higher-confidence. Be local, fast, trustworthy, concise. Use Albanian neighborhood names. Weigh severity and recency; flag CRITICAL prominently. If nothing relevant exists, say so plainly. Short paragraphs, bullets. Never claim to dispatch services.

CURRENT TIME: ${new Date().toISOString()}

LIVE VERIFIED INCIDENTS (active now):
${ground || "(no active incidents right now)"}`;

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        return result.toTextStreamResponse();
      },
    },
  },
});
