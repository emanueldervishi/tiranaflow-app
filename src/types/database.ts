export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      reports: {
        Row: { id: string; title: string; type: Database["public"]["Enums"]["report_type"]; severity: Database["public"]["Enums"]["severity_level"]; description: string | null; image_url: string | null; latitude: number; longitude: number; address: string | null; created_at: string; created_by: string | null; confirmations: number; inaccurate_count: number; ai_generated: boolean; source: string | null };
        Insert: { id?: string; title: string; type: Database["public"]["Enums"]["report_type"]; severity: Database["public"]["Enums"]["severity_level"]; description?: string | null; image_url?: string | null; latitude: number; longitude: number; address?: string | null; created_at?: string; created_by?: string | null; confirmations?: number; inaccurate_count?: number; ai_generated?: boolean; source?: string | null };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: { id: string; event_type: Database["public"]["Enums"]["event_type"]; severity: Database["public"]["Enums"]["event_severity"]; title_sq: string; title_en: string; summary: string | null; location_name: string; lat: number; lng: number; confidence: number; is_active: boolean; source_count: number; sources: Json; image_url: string | null; status: Database["public"]["Enums"]["event_status"]; created_at: string; expires_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: { id: string; name: string | null; email: string | null; avatar_url: string | null; trusted_reporter_score: number; confirmed_count: number; created_at: string };
        Insert: { id: string; name?: string | null; email?: string | null; avatar_url?: string | null; trusted_reporter_score?: number; confirmed_count?: number; created_at?: string };
        Update: { name?: string | null; avatar_url?: string | null };
        Relationships: [];
      };
      report_votes: {
        Row: { report_id: string; user_id: string; vote: Database["public"]["Enums"]["vote_kind"]; created_at: string };
        Insert: { report_id: string; user_id: string; vote: Database["public"]["Enums"]["vote_kind"]; created_at?: string };
        Update: { vote?: Database["public"]["Enums"]["vote_kind"] };
        Relationships: [];
      };
      user_roles: {
        Row: { id: string; user_id: string; role: Database["public"]["Enums"]["app_role"]; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: { has_role: { Args: { _user_id: string; _role: Database["public"]["Enums"]["app_role"] }; Returns: boolean } };
    Enums: {
      app_role: "admin" | "user";
      event_severity: "critical" | "warning" | "info";
      event_status: "unconfirmed" | "confirmed" | "resolved";
      event_type: "accident" | "traffic" | "fire" | "flood" | "protest" | "police" | "power_outage" | "weather" | "other";
      report_type: "traffic_accident" | "road_block" | "protest" | "heavy_traffic" | "construction" | "police_activity" | "fire" | "flood" | "dangerous_area" | "broken_road" | "other";
      severity_level: "low" | "serious" | "critical";
      vote_kind: "confirm" | "inaccurate";
    };
    CompositeTypes: Record<string, never>;
  };
};
