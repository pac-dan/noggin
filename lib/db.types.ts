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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity: {
        Row: {
          body: string | null
          card_id: string | null
          created_at: string | null
          happened_at: string
          id: string
          owner: string
          project_key: string | null
          ref: string
          source: string
          title: string
        }
        Insert: {
          body?: string | null
          card_id?: string | null
          created_at?: string | null
          happened_at?: string
          id?: string
          owner: string
          project_key?: string | null
          ref: string
          source: string
          title: string
        }
        Update: {
          body?: string | null
          card_id?: string | null
          created_at?: string | null
          happened_at?: string
          id?: string
          owner?: string
          project_key?: string | null
          ref?: string
          source?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_practice_streaks"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "activity_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_quiet_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      briefs: {
        Row: {
          attention: string | null
          created_at: string | null
          day: string
          id: string
          owner: string
          questions: Json | null
          today: Json | null
          yesterday: string | null
        }
        Insert: {
          attention?: string | null
          created_at?: string | null
          day: string
          id?: string
          owner: string
          questions?: Json | null
          today?: Json | null
          yesterday?: string | null
        }
        Update: {
          attention?: string | null
          created_at?: string | null
          day?: string
          id?: string
          owner?: string
          questions?: Json | null
          today?: Json | null
          yesterday?: string | null
        }
        Relationships: []
      }
      captures: {
        Row: {
          created_at: string | null
          filed: Json | null
          id: string
          owner: string
          status: string
          transcript: string
        }
        Insert: {
          created_at?: string | null
          filed?: Json | null
          id?: string
          owner: string
          status?: string
          transcript: string
        }
        Update: {
          created_at?: string | null
          filed?: Json | null
          id?: string
          owner?: string
          status?: string
          transcript?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          aliases: string[]
          context_for_claude: string | null
          created_at: string | null
          health_url: string | null
          id: string
          idea_decide_after: string | null
          idea_done: string | null
          idea_itch: string | null
          idea_who: string | null
          idea_why_now: string | null
          kind: Database["public"]["Enums"]["card_kind"]
          links: Json | null
          name: string
          next_up: string | null
          owner: string
          people: string[] | null
          progress: number | null
          revisit_on: string | null
          slug: string
          sort: number | null
          status: Database["public"]["Enums"]["card_status"]
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          aliases?: string[]
          context_for_claude?: string | null
          created_at?: string | null
          health_url?: string | null
          id?: string
          idea_decide_after?: string | null
          idea_done?: string | null
          idea_itch?: string | null
          idea_who?: string | null
          idea_why_now?: string | null
          kind: Database["public"]["Enums"]["card_kind"]
          links?: Json | null
          name: string
          next_up?: string | null
          owner: string
          people?: string[] | null
          progress?: number | null
          revisit_on?: string | null
          slug: string
          sort?: number | null
          status?: Database["public"]["Enums"]["card_status"]
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          aliases?: string[]
          context_for_claude?: string | null
          created_at?: string | null
          health_url?: string | null
          id?: string
          idea_decide_after?: string | null
          idea_done?: string | null
          idea_itch?: string | null
          idea_who?: string | null
          idea_why_now?: string | null
          kind?: Database["public"]["Enums"]["card_kind"]
          links?: Json | null
          name?: string
          next_up?: string | null
          owner?: string
          people?: string[] | null
          progress?: number | null
          revisit_on?: string | null
          slug?: string
          sort?: number | null
          status?: Database["public"]["Enums"]["card_status"]
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      decisions: {
        Row: {
          answer: string
          brief_id: string | null
          card_id: string | null
          created_at: string | null
          id: string
          owner: string
          question: string
        }
        Insert: {
          answer: string
          brief_id?: string | null
          card_id?: string | null
          created_at?: string | null
          id?: string
          owner: string
          question: string
        }
        Update: {
          answer?: string
          brief_id?: string | null
          card_id?: string | null
          created_at?: string | null
          id?: string
          owner?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_practice_streaks"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "decisions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_quiet_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      health_checks: {
        Row: {
          card_id: string
          checked_at: string | null
          id: string
          latency_ms: number | null
          ok: boolean
          owner: string
          status_code: number | null
        }
        Insert: {
          card_id: string
          checked_at?: string | null
          id?: string
          latency_ms?: number | null
          ok: boolean
          owner: string
          status_code?: number | null
        }
        Update: {
          card_id?: string
          checked_at?: string | null
          id?: string
          latency_ms?: number | null
          ok?: boolean
          owner?: string
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_checks_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_checks_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_practice_streaks"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "health_checks_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_quiet_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      log_entries: {
        Row: {
          body: string
          card_id: string
          created_at: string | null
          id: string
          owner: string
          progress_delta: number | null
          source: string
        }
        Insert: {
          body: string
          card_id: string
          created_at?: string | null
          id?: string
          owner: string
          progress_delta?: number | null
          source?: string
        }
        Update: {
          body?: string
          card_id?: string
          created_at?: string | null
          id?: string
          owner?: string
          progress_delta?: number | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_entries_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_entries_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_practice_streaks"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "log_entries_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_quiet_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_checkins: {
        Row: {
          created_at: string | null
          owner: string
          plan: string
          scores: Json
          week: number
        }
        Insert: {
          created_at?: string | null
          owner: string
          plan: string
          scores: Json
          week: number
        }
        Update: {
          created_at?: string | null
          owner?: string
          plan?: string
          scores?: Json
          week?: number
        }
        Relationships: []
      }
      plan_days: {
        Row: {
          day: string
          meals: Json | null
          note: string | null
          owner: string
          plan: string
          rough: boolean
        }
        Insert: {
          day: string
          meals?: Json | null
          note?: string | null
          owner: string
          plan: string
          rough?: boolean
        }
        Update: {
          day?: string
          meals?: Json | null
          note?: string | null
          owner?: string
          plan?: string
          rough?: boolean
        }
        Relationships: []
      }
      plan_settings: {
        Row: {
          owner: string
          plan: string
          settings: Json
        }
        Insert: {
          owner: string
          plan: string
          settings?: Json
        }
        Update: {
          owner?: string
          plan?: string
          settings?: Json
        }
        Relationships: []
      }
      plan_ticks: {
        Row: {
          created_at: string | null
          day: string
          item: string
          owner: string
          plan: string
        }
        Insert: {
          created_at?: string | null
          day: string
          item: string
          owner: string
          plan: string
        }
        Update: {
          created_at?: string | null
          day?: string
          item?: string
          owner?: string
          plan?: string
        }
        Relationships: []
      }
      practice_checks: {
        Row: {
          card_id: string
          day: string
          id: string
          owner: string
        }
        Insert: {
          card_id: string
          day?: string
          id?: string
          owner: string
        }
        Update: {
          card_id?: string
          day?: string
          id?: string
          owner?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_checks_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_checks_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_practice_streaks"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "practice_checks_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_quiet_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          card_id: string
          created_at: string | null
          done: boolean | null
          id: string
          label: string
          owner: string
          sort: number | null
        }
        Insert: {
          card_id: string
          created_at?: string | null
          done?: boolean | null
          id?: string
          label: string
          owner: string
          sort?: number | null
        }
        Update: {
          card_id?: string
          created_at?: string | null
          done?: boolean | null
          id?: string
          label?: string
          owner?: string
          sort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_practice_streaks"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "tasks_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_quiet_cards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_practice_streaks: {
        Row: {
          card_id: string | null
          current_streak: number | null
          last_day: string | null
        }
        Relationships: []
      }
      v_quiet_cards: {
        Row: {
          aliases: string[] | null
          context_for_claude: string | null
          created_at: string | null
          health_url: string | null
          id: string | null
          idea_decide_after: string | null
          idea_done: string | null
          idea_itch: string | null
          idea_who: string | null
          idea_why_now: string | null
          kind: Database["public"]["Enums"]["card_kind"] | null
          links: Json | null
          name: string | null
          next_up: string | null
          owner: string | null
          people: string[] | null
          progress: number | null
          revisit_on: string | null
          slug: string | null
          sort: number | null
          status: Database["public"]["Enums"]["card_status"] | null
          summary: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      card_kind: "project" | "practice" | "service" | "idea"
      card_status:
        | "planning"
        | "building"
        | "ongoing"
        | "live"
        | "shelved"
        | "done"
        | "archived"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      card_kind: ["project", "practice", "service", "idea"],
      card_status: [
        "planning",
        "building",
        "ongoing",
        "live",
        "shelved",
        "done",
        "archived",
      ],
    },
  },
} as const
