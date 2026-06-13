import {
  AlertTriangle,
  Car,
  Construction,
  Flame,
  Megaphone,
  ShieldAlert,
  Siren,
  Slash,
  TrafficCone,
  Waves,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type ReportType =
  | "traffic_accident"
  | "road_block"
  | "protest"
  | "heavy_traffic"
  | "construction"
  | "police_activity"
  | "fire"
  | "flood"
  | "dangerous_area"
  | "broken_road"
  | "other";

export type Severity = "low" | "serious" | "critical";

export const REPORT_TYPES: Record<
  ReportType,
  { label: string; icon: LucideIcon; color: string; tint: string }
> = {
  traffic_accident: { label: "Traffic accident", icon: Car,         color: "#f97316", tint: "#fff7ed" },
  road_block:       { label: "Road block",       icon: Slash,       color: "#ea580c", tint: "#fff7ed" },
  protest:          { label: "Protest",          icon: Megaphone,   color: "#8b5cf6", tint: "#f5f3ff" },
  heavy_traffic:    { label: "Heavy traffic",    icon: TrafficCone, color: "#f59e0b", tint: "#fffbeb" },
  construction:     { label: "Construction",     icon: Construction,color: "#eab308", tint: "#fefce8" },
  police_activity:  { label: "Police activity",  icon: Siren,       color: "#2563eb", tint: "#eff6ff" },
  fire:             { label: "Fire",             icon: Flame,       color: "#dc2626", tint: "#fef2f2" },
  flood:            { label: "Flood",            icon: Waves,       color: "#0ea5e9", tint: "#f0f9ff" },
  dangerous_area:   { label: "Dangerous area",   icon: ShieldAlert, color: "#e11d48", tint: "#fff1f2" },
  broken_road:      { label: "Broken road",      icon: Wrench,      color: "#78716c", tint: "#f5f5f4" },
  other:            { label: "Other",            icon: AlertTriangle,color:"#525252", tint: "#f5f5f5" },
};

export const SEVERITY_META: Record<Severity, { label: string; rank: number; className: string; ring: string }> = {
  low: {
    label: "Low",
    rank: 1,
    className: "bg-severity-low text-severity-low-foreground",
    ring: "ring-severity-low/40",
  },
  serious: {
    label: "Serious",
    rank: 2,
    className: "bg-severity-serious text-severity-serious-foreground",
    ring: "ring-severity-serious/40",
  },
  critical: {
    label: "Critical",
    rank: 3,
    className: "bg-severity-critical text-severity-critical-foreground",
    ring: "ring-severity-critical/40",
  },
};

export const TIRANA_CENTER = { lat: 41.3275, lng: 19.8187 };

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export type Report = {
  id: string;
  title: string;
  type: ReportType;
  severity: Severity;
  description: string | null;
  image_url: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  created_at: string;
  created_by: string | null;
  confirmations: number;
  inaccurate_count: number;
};
