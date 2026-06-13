import { base64ToArrayBuffer, optimizeImageForUpload } from "@/services/media";
import { EVENT_SEVERITY_TO_REPORT, EVENT_TYPE_META } from "@/constants/city";
import { supabase } from "@/lib/supabase";
import type { ChatMessage, CreateReportInput, LiveEvent, Profile, Report } from "@/types/domain";
import type { Database } from "@/types/database";

type ReportRow = Database["public"]["Tables"]["reports"]["Row"];
type EventRow = Database["public"]["Tables"]["events"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const requireClient = () => {
  if (!supabase) throw new Error("TiranaFlow is missing its Supabase configuration.");
  return supabase;
};

const mapReport = (row: ReportRow): Report => ({
  id: row.id,
  title: row.title,
  type: row.type,
  severity: row.severity,
  description: row.description,
  imageUrl: row.image_url,
  latitude: row.latitude,
  longitude: row.longitude,
  address: row.address,
  createdAt: row.created_at,
  createdBy: row.created_by,
  confirmations: row.confirmations,
  inaccurateCount: row.inaccurate_count,
  aiGenerated: row.ai_generated,
  source: row.source,
  sourceCount: 1,
  status: row.confirmations > 0 ? "confirmed" : "unconfirmed",
  isLiveEvent: false,
});

const mapEvent = (row: EventRow): LiveEvent => ({
  id: row.id,
  eventType: row.event_type,
  severity: row.severity,
  titleSq: row.title_sq,
  titleEn: row.title_en,
  summary: row.summary,
  locationName: row.location_name,
  lat: row.lat,
  lng: row.lng,
  confidence: row.confidence,
  isActive: row.is_active,
  sourceCount: row.source_count,
  sources: Array.isArray(row.sources) ? row.sources as LiveEvent["sources"] : [],
  imageUrl: row.image_url,
  status: row.status,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
});

export const eventToReport = (event: LiveEvent): Report => ({
  id: event.id,
  title: event.titleEn || event.titleSq,
  type: EVENT_TYPE_META[event.eventType].reportType,
  severity: EVENT_SEVERITY_TO_REPORT[event.severity],
  description: event.summary,
  imageUrl: event.imageUrl,
  latitude: event.lat,
  longitude: event.lng,
  address: event.locationName,
  createdAt: event.createdAt,
  createdBy: null,
  confirmations: event.status === "confirmed" ? 1 : 0,
  inaccurateCount: 0,
  aiGenerated: true,
  source: "Live news",
  sourceCount: event.sourceCount,
  status: event.status,
  isLiveEvent: true,
});

export const fetchCityData = async () => {
  const client = requireClient();
  const [reportsResult, eventsResult] = await Promise.all([
    client.from("reports").select("*").order("created_at", { ascending: false }).limit(200),
    client.from("events").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(200),
  ]);
  if (reportsResult.error) throw reportsResult.error;
  if (eventsResult.error) throw eventsResult.error;
  const reports = (reportsResult.data ?? []).map(mapReport);
  const events = (eventsResult.data ?? []).map(mapEvent);
  const combined = [...reports, ...events.map(eventToReport)].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return { reports, events, combined };
};

export const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const client = requireClient();
  const { data, error } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as ProfileRow;
  return { id: row.id, name: row.name, email: row.email, avatarUrl: row.avatar_url, trustedReporterScore: row.trusted_reporter_score, createdAt: row.created_at };
};

export const updateProfile = async (userId: string, changes: { name?: string; avatarUrl?: string | null }) => {
  const client = requireClient();
  const { error } = await client.from("profiles").update({ name: changes.name, avatar_url: changes.avatarUrl }).eq("id", userId);
  if (error) throw error;
};

export const createReport = async (userId: string, input: CreateReportInput) => {
  const client = requireClient();
  let imageUrl: string | null = null;
  if (input.imageUri) {
    const optimized = await optimizeImageForUpload(input.imageUri);
    if (!optimized.base64) throw new Error("Could not prepare the report photo.");
    const path = `${userId}/${Date.now()}-report.jpg`;
    const { error: uploadError } = await client.storage.from("report-photos").upload(
      path,
      base64ToArrayBuffer(optimized.base64),
      { contentType: "image/jpeg", upsert: false },
    );
    if (uploadError) throw uploadError;
    const { data: signed, error: signedError } = await client.storage.from("report-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signedError) throw signedError;
    imageUrl = signed.signedUrl;
  }
  const { data, error } = await client.from("reports").insert({
    title: input.title.trim(),
    type: input.type,
    severity: input.severity,
    description: input.description.trim() || null,
    image_url: imageUrl,
    latitude: input.latitude,
    longitude: input.longitude,
    address: input.address,
    created_by: userId,
  }).select("*").single();
  if (error) throw error;
  return mapReport(data);
};

export const voteOnReport = async (userId: string, reportId: string, vote: "confirm" | "inaccurate") => {
  const client = requireClient();
  const { error } = await client.from("report_votes").upsert({ report_id: reportId, user_id: userId, vote });
  if (error) throw error;
};

export const deleteReport = async (userId: string, reportId: string) => {
  const client = requireClient();
  const { error } = await client.from("reports").delete().eq("id", reportId).eq("created_by", userId);
  if (error) throw error;
};

export const askCityAssistant = async (messages: ChatMessage[]) => {
  const client = requireClient();
  const { data, error } = await client.functions.invoke("city-assistant", {
    body: { messages: messages.map(({ role, content }) => ({ role, content })) },
  });
  if (error) throw error;
  if (!data?.answer || typeof data.answer !== "string") throw new Error("The city assistant returned an invalid response.");
  return data.answer as string;
};
