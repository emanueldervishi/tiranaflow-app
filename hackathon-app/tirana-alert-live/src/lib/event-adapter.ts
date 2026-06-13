import type { LiveEvent, EventType } from "@/lib/event-meta";
import type { Report, ReportType, Severity } from "@/lib/report-meta";

const TYPE_MAP: Record<EventType, ReportType> = {
  accident: "traffic_accident",
  traffic: "heavy_traffic",
  fire: "fire",
  flood: "flood",
  protest: "protest",
  police: "police_activity",
  power_outage: "dangerous_area",
  weather: "other",
  other: "other",
};

const SEV_MAP: Record<LiveEvent["severity"], Severity> = {
  critical: "critical",
  warning: "serious",
  info: "low",
};

/**
 * Adapt a live event to the legacy Report shape so existing UI (map pins,
 * feed cards, detail sheet) renders unchanged. `confirmations` is repurposed
 * as source_count - 1 so the existing "Confirm · N" pill reads as source
 * corroboration.
 */
export function eventToReport(e: LiveEvent): Report & { __event: LiveEvent; __source: "event" | "report" } {
  return {
    id: e.id,
    title: e.title_en || e.title_sq,
    type: TYPE_MAP[e.event_type] ?? "other",
    severity: SEV_MAP[e.severity],
    description: e.summary,
    image_url: e.image_url,
    latitude: e.lat,
    longitude: e.lng,
    address: e.location_name,
    created_at: e.created_at,
    created_by: null,
    confirmations: Math.max(0, e.source_count - 1),
    inaccurate_count: 0,
    __event: e,
    __source: "event",
  };
}

const TYPE_REVERSE: Record<ReportType, EventType> = {
  traffic_accident: "accident",
  heavy_traffic: "traffic",
  fire: "fire",
  flood: "flood",
  protest: "protest",
  police_activity: "police",
  road_block: "traffic",
  construction: "traffic",
  dangerous_area: "other",
  broken_road: "other",
  other: "other",
};

const SEV_REVERSE: Record<Severity, LiveEvent["severity"]> = {
  critical: "critical",
  serious: "warning",
  low: "info",
};

/** Wrap a user-submitted Report into the same shape EventCard expects. */
export function reportToFeedItem(r: Report): Report & { __event: LiveEvent; __source: "event" | "report" } {
  const synthetic: LiveEvent = {
    id: r.id,
    event_type: TYPE_REVERSE[r.type] ?? "other",
    severity: SEV_REVERSE[r.severity],
    title_sq: r.title,
    title_en: r.title,
    summary: r.description ?? null,
    location_name: r.address ?? "Tirana",
    lat: r.latitude,
    lng: r.longitude,
    confidence: 1,
    is_active: true,
    source_count: 1,
    sources: [],
    image_url: r.image_url ?? null,
    status: r.confirmations > 0 ? "confirmed" : "unconfirmed",
    created_at: r.created_at,
    expires_at: null,
  } as unknown as LiveEvent;
  return { ...r, __event: synthetic, __source: "report" };
}
