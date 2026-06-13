import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Report } from "./report-meta";

const SeverityEnum = z.enum(["low", "serious", "critical"]);
const TypeEnum = z.enum([
  "traffic_accident","road_block","protest","heavy_traffic","construction",
  "police_activity","fire","flood","dangerous_area","broken_road","other",
]);

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { reports: (data ?? []) as Report[] };
  });

export const listMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reports")
      .select("*")
      .eq("created_by", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { reports: (data ?? []) as Report[] };
  });

export const deleteReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reports")
      .delete()
      .eq("id", data.id)
      .eq("created_by", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("reports")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { report: row as Report | null };
  });

export const createReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      title: z.string().min(2).max(120),
      type: TypeEnum,
      severity: SeverityEnum,
      description: z.string().max(1000).optional().nullable(),
      image_path: z.string().optional().nullable(),
      latitude: z.number(),
      longitude: z.number(),
      address: z.string().max(240).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    let image_url: string | null = null;
    if (data.image_path) {
      const { data: signed } = await context.supabase.storage
        .from("report-photos")
        .createSignedUrl(data.image_path, 60 * 60 * 24 * 365);
      image_url = signed?.signedUrl ?? null;
    }
    const { data: row, error } = await context.supabase
      .from("reports")
      .insert({
        title: data.title,
        type: data.type,
        severity: data.severity,
        description: data.description ?? null,
        image_url,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address ?? null,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { report: row as Report };
  });

export const voteReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      report_id: z.string().uuid(),
      vote: z.enum(["confirm", "inaccurate"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("report_votes")
      .upsert({ report_id: data.report_id, user_id: context.userId, vote: data.vote });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const myStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count: total } = await context.supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("created_by", context.userId);
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    return { totalReports: total ?? 0, profile };
  });
