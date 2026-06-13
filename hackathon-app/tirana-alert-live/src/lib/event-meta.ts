import {
  AlertTriangle,
  Car,
  CloudRain,
  Flame,
  Megaphone,
  ShieldAlert,
  TrafficCone,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type EventType =
  | "accident"
  | "traffic"
  | "fire"
  | "flood"
  | "protest"
  | "police"
  | "power_outage"
  | "weather"
  | "other";

export type EventSeverity = "critical" | "warning" | "info";
export type EventStatus = "unconfirmed" | "confirmed" | "resolved";

export type LiveEvent = {
  id: string;
  event_type: EventType;
  severity: EventSeverity;
  title_sq: string;
  title_en: string;
  summary: string | null;
  location_name: string;
  lat: number;
  lng: number;
  confidence: number;
  is_active: boolean;
  source_count: number;
  sources: Array<{ url: string; name: string; fetched_at: string }>;
  image_url: string | null;
  status: EventStatus;
  created_at: string;
  expires_at: string;
};

export const EVENT_TYPE_META: Record<EventType, { label: string; icon: LucideIcon; color: string }> = {
  accident:     { label: "Accident",     icon: Car,         color: "#f97316" },
  traffic:      { label: "Traffic",      icon: TrafficCone, color: "#f59e0b" },
  fire:         { label: "Fire",         icon: Flame,       color: "#dc2626" },
  flood:        { label: "Flood",        icon: Waves,       color: "#0ea5e9" },
  protest:      { label: "Protest",      icon: Megaphone,   color: "#8b5cf6" },
  police:       { label: "Police",       icon: ShieldAlert, color: "#2563eb" },
  power_outage: { label: "Power outage", icon: Zap,         color: "#eab308" },
  weather:      { label: "Weather",      icon: CloudRain,   color: "#0891b2" },
  other:        { label: "Incident",     icon: AlertTriangle, color: "#525252" },
};

export const EVENT_SEVERITY_META: Record<EventSeverity, { label: string; rank: number; className: string }> = {
  critical: { label: "Critical", rank: 3, className: "bg-red-600 text-white" },
  warning:  { label: "Warning",  rank: 2, className: "bg-amber-500 text-white" },
  info:     { label: "Info",     rank: 1, className: "bg-blue-600 text-white" },
};

export function eventTimeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
