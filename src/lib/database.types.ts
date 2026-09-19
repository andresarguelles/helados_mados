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
      coupons: {
        Row: {
          created_at: string
          digital_awarded: boolean
          dynamic_id: string
          id: string
          physical_awarded: boolean
          redeemed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digital_awarded?: boolean
          dynamic_id: string
          id?: string
          physical_awarded?: boolean
          redeemed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          digital_awarded?: boolean
          dynamic_id?: string
          id?: string
          physical_awarded?: boolean
          redeemed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_dynamic_id_fkey"
            columns: ["dynamic_id"]
            isOneToOne: false
            referencedRelation: "dynamics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamics: {
        Row: {
          created_at: string
          description: string
          ends_at: string
          id: string
          keyword: string
          physical_redeemed: number
          physical_stock: number
          prize_label: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          ends_at: string
          id?: string
          keyword: string
          physical_redeemed?: number
          physical_stock: number
          prize_label: string
          starts_at: string
        }
        Update: {
          created_at?: string
          description?: string
          ends_at?: string
          id?: string
          keyword?: string
          physical_redeemed?: number
          physical_stock?: number
          prize_label?: string
          starts_at?: string
        }
        Relationships: []
      }
      ip_redemption_logs: {
        Row: {
          count: number
          dynamic_id: string
          first_seen: string
          ip_hash: string
          last_seen: string
        }
        Insert: {
          count?: number
          dynamic_id: string
          first_seen?: string
          ip_hash: string
          last_seen?: string
        }
        Update: {
          count?: number
          dynamic_id?: string
          first_seen?: string
          ip_hash?: string
          last_seen?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_redemption_logs_dynamic_id_fkey"
            columns: ["dynamic_id"]
            isOneToOne: false
            referencedRelation: "dynamics"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          ast_hash: string
          doc_id: string
          id: string
          platform: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          ast_hash: string
          doc_id: string
          id?: string
          platform: string
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          ast_hash?: string
          doc_id?: string
          id?: string
          platform?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      legal_versions: {
        Row: {
          ast_hash: string
          doc_id: string
          published_at: string
          version: string
        }
        Insert: {
          ast_hash: string
          doc_id: string
          published_at?: string
          version: string
        }
        Update: {
          ast_hash?: string
          doc_id?: string
          published_at?: string
          version?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_confirmed_at: string | null
          avatar_url: string | null
          birthdate: string | null
          created_at: string
          email: string | null
          first_name: string | null
          google_bonus_awarded: boolean
          id: string
          is_admin: boolean
          last_name: string | null
          phone: string | null
          profile_bonus_awarded: boolean
          total_points: number
          username: string | null
          whatsapp_opt_in: boolean
          whatsapp_opt_in_at: string | null
        }
        Insert: {
          age_confirmed_at?: string | null
          avatar_url?: string | null
          birthdate?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          google_bonus_awarded?: boolean
          id: string
          is_admin?: boolean
          last_name?: string | null
          phone?: string | null
          profile_bonus_awarded?: boolean
          total_points?: number
          username?: string | null
          whatsapp_opt_in?: boolean
          whatsapp_opt_in_at?: string | null
        }
        Update: {
          age_confirmed_at?: string | null
          avatar_url?: string | null
          birthdate?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          google_bonus_awarded?: boolean
          id?: string
          is_admin?: boolean
          last_name?: string | null
          phone?: string | null
          profile_bonus_awarded?: boolean
          total_points?: number
          username?: string | null
          whatsapp_opt_in?: boolean
          whatsapp_opt_in_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_legal: {
        Args: { p_docs: Json; p_platform: string }
        Returns: Json
      }
      claim_google_bonus: { Args: never; Returns: Json }
      complete_signup: {
        Args: {
          p_age_confirmed: boolean
          p_legal: Json
          p_phone: string
          p_platform: string
          p_username: string
          p_whatsapp_opt_in: boolean
        }
        Returns: Json
      }
      get_leaderboard: {
        Args: { p_period?: string }
        Returns: {
          es_tu_fila: boolean
          points: number
          username: string
        }[]
      }
      get_leaderboard_range: {
        Args: { p_period: string }
        Returns: {
          range_end: string
          range_start: string
        }[]
      }
      google_name_parts: {
        Args: { p_data: Json }
        Returns: {
          first_name: string
          last_name: string
        }[]
      }
      hook_google_only_signup: { Args: { event: Json }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_adult: { Args: { p_birthdate: string }; Returns: boolean }
      legal_current_versions: {
        Args: never
        Returns: {
          ast_hash: string
          doc_id: string
          version: string
        }[]
      }
      my_legal_status: { Args: never; Returns: Json }
      phone_is_valid: { Args: { p_phone: string }; Returns: boolean }
      redeem_keyword: {
        Args: { p_ip_hash: string; p_keyword: string }
        Returns: Json
      }
      scan_coupon: { Args: { p_coupon_id: string }; Returns: Json }
      update_my_profile: {
        Args: {
          p_birthdate: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_whatsapp_opt_in: boolean
        }
        Returns: Json
      }
      username_available: { Args: { p_username: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
