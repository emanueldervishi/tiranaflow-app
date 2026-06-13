export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      events: {
        Row: {
          confidence: number
          created_at: string
          event_type: Database["public"]["Enums"]["event_type"]
          expires_at: string
          id: string
          image_url: string | null
          is_active: boolean
          lat: number
          lng: number
          location_name: string
          severity: Database["public"]["Enums"]["event_severity"]
          source_count: number
          sources: Json
          status: Database["public"]["Enums"]["event_status"]
          summary: string | null
          title_en: string
          title_sq: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          event_type: Database["public"]["Enums"]["event_type"]
          expires_at: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          lat: number
          lng: number
          location_name: string
          severity: Database["public"]["Enums"]["event_severity"]
          source_count?: number
          sources?: Json
          status?: Database["public"]["Enums"]["event_status"]
          summary?: string | null
          title_en: string
          title_sq: string
        }
        Update: {
          confidence?: number
          created_at?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          expires_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          lat?: number
          lng?: number
          location_name?: string
          severity?: Database["public"]["Enums"]["event_severity"]
          source_count?: number
          sources?: Json
          status?: Database["public"]["Enums"]["event_status"]
          summary?: string | null
          title_en?: string
          title_sq?: string
        }
        Relationships: []
      }
      geocode_cache: {
        Row: {
          created_at: string
          lat: number | null
          lng: number | null
          query: string
        }
        Insert: {
          created_at?: string
          lat?: number | null
          lng?: number | null
          query: string
        }
        Update: {
          created_at?: string
          lat?: number | null
          lng?: number | null
          query?: string
        }
        Relationships: []
      }
      ingestion_log: {
        Row: {
          duration_ms: number
          errors: Json
          events_created: number
          events_deduped: number
          id: string
          items_fetched: number
          run_at: string
        }
        Insert: {
          duration_ms?: number
          errors?: Json
          events_created?: number
          events_deduped?: number
          id?: string
          items_fetched?: number
          run_at?: string
        }
        Update: {
          duration_ms?: number
          errors?: Json
          events_created?: number
          events_deduped?: number
          id?: string
          items_fetched?: number
          run_at?: string
        }
        Relationships: []
      }
      processed_items: {
        Row: {
          link_hash: string
          processed_at: string
        }
        Insert: {
          link_hash: string
          processed_at?: string
        }
        Update: {
          link_hash?: string
          processed_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          trusted_reporter_score: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          trusted_reporter_score?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          trusted_reporter_score?: number
        }
        Relationships: []
      }
      report_votes: {
        Row: {
          created_at: string
          report_id: string
          user_id: string
          vote: Database["public"]["Enums"]["vote_kind"]
        }
        Insert: {
          created_at?: string
          report_id: string
          user_id: string
          vote: Database["public"]["Enums"]["vote_kind"]
        }
        Update: {
          created_at?: string
          report_id?: string
          user_id?: string
          vote?: Database["public"]["Enums"]["vote_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "report_votes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          address: string | null
          ai_generated: boolean
          confirmations: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          inaccurate_count: number
          latitude: number
          longitude: number
          severity: Database["public"]["Enums"]["severity_level"]
          source: string | null
          title: string
          type: Database["public"]["Enums"]["report_type"]
        }
        Insert: {
          address?: string | null
          ai_generated?: boolean
          confirmations?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          inaccurate_count?: number
          latitude: number
          longitude: number
          severity: Database["public"]["Enums"]["severity_level"]
          source?: string | null
          title: string
          type: Database["public"]["Enums"]["report_type"]
        }
        Update: {
          address?: string | null
          ai_generated?: boolean
          confirmations?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          inaccurate_count?: number
          latitude?: number
          longitude?: number
          severity?: Database["public"]["Enums"]["severity_level"]
          source?: string | null
          title?: string
          type?: Database["public"]["Enums"]["report_type"]
        }
        Relationships: []
      }
      sources: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          kind: Database["public"]["Enums"]["source_kind"]
          name: string
          url: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          kind: Database["public"]["Enums"]["source_kind"]
          name: string
          url: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["source_kind"]
          name?: string
          url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      event_severity: "critical" | "warning" | "info"
      event_status: "unconfirmed" | "confirmed" | "resolved"
      event_type:
        | "accident"
        | "traffic"
        | "fire"
        | "flood"
        | "protest"
        | "police"
        | "power_outage"
        | "weather"
        | "other"
      report_type:
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
        | "other"
      severity_level: "low" | "serious" | "critical"
      source_kind: "rss" | "google_news"
      vote_kind: "confirm" | "inaccurate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      event_severity: ["critical", "warning", "info"],
      event_status: ["unconfirmed", "confirmed", "resolved"],
      event_type: [
        "accident",
        "traffic",
        "fire",
        "flood",
        "protest",
        "police",
        "power_outage",
        "weather",
        "other",
      ],
      report_type: [
        "traffic_accident",
        "road_block",
        "protest",
        "heavy_traffic",
        "construction",
        "police_activity",
        "fire",
        "flood",
        "dangerous_area",
        "broken_road",
        "other",
      ],
      severity_level: ["low", "serious", "critical"],
      source_kind: ["rss", "google_news"],
      vote_kind: ["confirm", "inaccurate"],
    },
  },
} as const
