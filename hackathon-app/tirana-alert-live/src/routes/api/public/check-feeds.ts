import { createFileRoute } from "@tanstack/react-router";

// Lightweight live-poll endpoint. Quickly checks RSS feeds for unseen items.
// If anything new exists, triggers the full ingestion pipeline. Safe to call every minute.
export const Route = createFileRoute("/api/public/check-feeds")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { checkForNewItems, runIngestion } = await import("@/lib/ingestion.server");
          const check = await checkForNewItems();
          if (!check.has_new) {
            return Response.json({ ok: true, triggered: false, ...check });
          }
          const result = await runIngestion();
          return Response.json({ ok: true, triggered: true, check, result });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[check-feeds]", msg);
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
