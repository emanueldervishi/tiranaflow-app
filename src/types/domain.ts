export type UUID = string;

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
export type EventType = "accident" | "traffic" | "fire" | "flood" | "protest" | "police" | "power_outage" | "weather" | "other";
export type EventSeverity = "critical" | "warning" | "info";
export type EventStatus = "unconfirmed" | "confirmed" | "resolved";

export type Report = {
  id: UUID;
  title: string;
  type: ReportType;
  severity: Severity;
  description: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  createdAt: string;
  createdBy: string | null;
  confirmations: number;
  inaccurateCount: number;
  aiGenerated: boolean;
  source: string | null;
  sourceCount: number;
  status: EventStatus;
  isLiveEvent: boolean;
};

export type LiveEvent = {
  id: UUID;
  eventType: EventType;
  severity: EventSeverity;
  titleSq: string;
  titleEn: string;
  summary: string | null;
  locationName: string;
  lat: number;
  lng: number;
  confidence: number;
  isActive: boolean;
  sourceCount: number;
  sources: { url: string; name: string; fetched_at: string }[];
  imageUrl: string | null;
  status: EventStatus;
  createdAt: string;
  expiresAt: string;
};

export type Profile = {
  id: UUID;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  trustedReporterScore: number;
  createdAt: string;
};

export type CreateReportInput = {
  title: string;
  type: ReportType;
  severity: Severity;
  description: string;
  imageUri: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type SessionUser = {
  id: string;
  email: string | null;
};
