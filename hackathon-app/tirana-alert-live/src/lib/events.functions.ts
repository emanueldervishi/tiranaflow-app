import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LiveEvent } from "@/lib/event-meta";

export const listActiveEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("events")
      .select("id,event_type,severity,title_sq,title_en,summary,location_name,lat,lng,confidence,is_active,source_count,sources,image_url,status,created_at,expires_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const events = (data ?? []) as unknown as LiveEvent[];
    const rank = { critical: 0, warning: 1, info: 2 } as const;
    events.sort((a, b) => rank[a.severity] - rank[b.severity] || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { events };
  });

export const latestIngestionLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("ingestion_log")
      .select("id,run_at,items_fetched,events_created,events_deduped,errors,duration_ms")
      .order("run_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { log: data ?? null };
  });

export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: Boolean(data) };
  });

export const triggerIngestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { runIngestion } = await import("@/lib/ingestion.server");
    const result = await runIngestion();
    return result;
  });
