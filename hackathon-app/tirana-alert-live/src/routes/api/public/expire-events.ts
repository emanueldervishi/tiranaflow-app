import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/expire-events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { runExpiry } = await import("@/lib/ingestion.server");
          const result = await runExpiry();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[expire-events]", msg);
          return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
