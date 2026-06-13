import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

import type { EventSeverity, EventType, ReportType, Severity } from "@/types/domain";

type IconName = ComponentProps<typeof Ionicons>["name"];

export const TIRANA_CENTER = { latitude: 41.3275, longitude: 19.8187 };

export const REPORT_TYPES: Record<ReportType, { label: string; icon: IconName; color: string; tint: string }> = {
  traffic_accident: { label: "Traffic accident", icon: "car-outline", color: "#F06B32", tint: "#FFF0E8" },
  road_block: { label: "Road block", icon: "remove-circle-outline", color: "#D85F27", tint: "#FFF0E8" },
  protest: { label: "Protest", icon: "megaphone-outline", color: "#795FC7", tint: "#F1EDFF" },
  heavy_traffic: { label: "Heavy traffic", icon: "warning-outline", color: "#C98A1A", tint: "#FFF6DD" },
  construction: { label: "Construction", icon: "construct-outline", color: "#A77B19", tint: "#FFF7DC" },
  police_activity: { label: "Police activity", icon: "shield-outline", color: "#326DC5", tint: "#EAF2FF" },
  fire: { label: "Fire", icon: "flame-outline", color: "#D1433B", tint: "#FFEDEC" },
  flood: { label: "Flood", icon: "water-outline", color: "#2187B5", tint: "#E9F7FC" },
  dangerous_area: { label: "Dangerous area", icon: "alert-circle-outline", color: "#C3365A", tint: "#FFEAF0" },
  broken_road: { label: "Broken road", icon: "build-outline", color: "#6F6964", tint: "#F1EFED" },
  other: { label: "Other", icon: "ellipsis-horizontal", color: "#565656", tint: "#F1F1F1" },
};

export const EVENT_TYPE_META: Record<EventType, { label: string; icon: IconName; color: string; reportType: ReportType }> = {
  accident: { label: "Accident", icon: "car-outline", color: "#F06B32", reportType: "traffic_accident" },
  traffic: { label: "Traffic", icon: "warning-outline", color: "#C98A1A", reportType: "heavy_traffic" },
  fire: { label: "Fire", icon: "flame-outline", color: "#D1433B", reportType: "fire" },
  flood: { label: "Flood", icon: "water-outline", color: "#2187B5", reportType: "flood" },
  protest: { label: "Protest", icon: "megaphone-outline", color: "#795FC7", reportType: "protest" },
  police: { label: "Police", icon: "shield-outline", color: "#326DC5", reportType: "police_activity" },
  power_outage: { label: "Power outage", icon: "flash-outline", color: "#756725", reportType: "other" },
  weather: { label: "Weather", icon: "rainy-outline", color: "#397A9B", reportType: "other" },
  other: { label: "Other", icon: "alert-outline", color: "#565656", reportType: "other" },
};

export const SEVERITY_META: Record<Severity, { label: string; rank: number; color: string; tint: string }> = {
  low: { label: "Low", rank: 1, color: "#2E8B57", tint: "#E8F5ED" },
  serious: { label: "Serious", rank: 2, color: "#C47D12", tint: "#FFF3D7" },
  critical: { label: "Critical", rank: 3, color: "#D43C32", tint: "#FFE9E7" },
};

export const EVENT_SEVERITY_TO_REPORT: Record<EventSeverity, Severity> = {
  info: "low",
  warning: "serious",
  critical: "critical",
};

export const timeAgo = (iso: string) => {
  const seconds = Math.max(0, Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};
