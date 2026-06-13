import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return json({ ok: true });
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || request.headers.get("x-cron-secret") !== expected) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await supabase
    .from("events")
    .update({ is_active: false })
    .eq("is_active", true)
    .lt("expires_at", new Date().toISOString())
    .select("id");
  if (error) return json({ error: error.message }, 500);
  return json({ expired: data?.length ?? 0 });
});
