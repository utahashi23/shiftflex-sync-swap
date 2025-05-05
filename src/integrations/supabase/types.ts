export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          employee_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          organization: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          organization?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shift_swap_matches: {
        Row: {
          acceptor_id: string
          acceptor_shift_id: string
          created_at: string
          id: string
          requester_id: string
          requester_shift_id: string
          status: string
        }
        Insert: {
          acceptor_id: string
          acceptor_shift_id: string
          created_at?: string
          id?: string
          requester_id: string
          requester_shift_id: string
          status?: string
        }
        Update: {
          acceptor_id?: string
          acceptor_shift_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          requester_shift_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_swap_matches_acceptor_shift_id_fkey"
            columns: ["acceptor_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swap_matches_requester_shift_id_fkey"
            columns: ["requester_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_swap_potential_matches: {
        Row: {
          acceptor_request_id: string
          acceptor_shift_id: string
          created_at: string
          id: string
          match_date: string
          requester_request_id: string
          requester_shift_id: string
          status: string
        }
        Insert: {
          acceptor_request_id: string
          acceptor_shift_id: string
          created_at?: string
          id?: string
          match_date: string
          requester_request_id: string
          requester_shift_id: string
          status?: string
        }
        Update: {
          acceptor_request_id?: string
          acceptor_shift_id?: string
          created_at?: string
          id?: string
          match_date?: string
          requester_request_id?: string
          requester_shift_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_swap_potential_matches_acceptor_request_id_fkey"
            columns: ["acceptor_request_id"]
            isOneToOne: false
            referencedRelation: "shift_swap_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swap_potential_matches_acceptor_shift_id_fkey"
            columns: ["acceptor_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swap_potential_matches_requester_request_id_fkey"
            columns: ["requester_request_id"]
            isOneToOne: false
            referencedRelation: "shift_swap_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swap_potential_matches_requester_shift_id_fkey"
            columns: ["requester_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_swap_preferred_dates: {
        Row: {
          accepted_types: string[]
          created_at: string
          date: string
          id: string
          request_id: string
          shift_id: string | null
        }
        Insert: {
          accepted_types: string[]
          created_at?: string
          date: string
          id?: string
          request_id: string
          shift_id?: string | null
        }
        Update: {
          accepted_types?: string[]
          created_at?: string
          date?: string
          id?: string
          request_id?: string
          shift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_swap_preferred_dates_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "shift_swap_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swap_preferred_dates_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_swap_requests: {
        Row: {
          acceptor_id: string | null
          acceptor_shift_id: string | null
          created_at: string
          id: string
          preferred_dates_count: number | null
          requester_id: string
          requester_shift_id: string
          status: string
          updated_at: string
        }
        Insert: {
          acceptor_id?: string | null
          acceptor_shift_id?: string | null
          created_at?: string
          id?: string
          preferred_dates_count?: number | null
          requester_id: string
          requester_shift_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          acceptor_id?: string | null
          acceptor_shift_id?: string | null
          created_at?: string
          id?: string
          preferred_dates_count?: number | null
          requester_id?: string
          requester_shift_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_swap_requests_acceptor_shift_id_fkey"
            columns: ["acceptor_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swap_requests_requester_shift_id_fkey"
            columns: ["requester_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          colleague_type: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          start_time: string
          status: string
          truck_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          colleague_type?: string | null
          created_at?: string
          date: string
          end_time: string
          id?: string
          start_time: string
          status?: string
          truck_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          colleague_type?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          start_time?: string
          status?: string
          truck_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      truck_names: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
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
      check_existing_match: {
        Args: { request_id1: string; request_id2: string }
        Returns: {
          id: string
          created_at: string
          status: string
          requester_request_id: string
          acceptor_request_id: string
        }[]
      }
      create_swap_request_safe: {
        Args: { p_requester_shift_id: string; p_status?: string }
        Returns: string
      }
      delete_preferred_date_rpc: {
        Args: { p_day_id: string; p_request_id: string }
        Returns: Json
      }
      delete_preferred_date_safe: {
        Args: { p_day_id: string; p_request_id: string }
        Returns: Json
      }
      delete_swap_request_safe: {
        Args: { p_request_id: string; p_user_id: string }
        Returns: Json
      }
      get_all_preferred_dates: {
        Args: Record<PropertyKey, never>
        Returns: {
          accepted_types: string[]
          created_at: string
          date: string
          id: string
          request_id: string
          shift_id: string | null
        }[]
      }
      get_all_shifts: {
        Args: Record<PropertyKey, never>
        Returns: {
          colleague_type: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          start_time: string
          status: string
          truck_name: string | null
          updated_at: string
          user_id: string
        }[]
      }
      get_all_swap_requests: {
        Args: Record<PropertyKey, never>
        Returns: {
          acceptor_id: string | null
          acceptor_shift_id: string | null
          created_at: string
          id: string
          preferred_dates_count: number | null
          requester_id: string
          requester_shift_id: string
          status: string
          updated_at: string
        }[]
      }
      get_shift_by_id: {
        Args: { shift_id: string }
        Returns: {
          colleague_type: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          start_time: string
          status: string
          truck_name: string | null
          updated_at: string
          user_id: string
        }[]
      }
      get_swap_request_by_id: {
        Args: { p_request_id: string }
        Returns: {
          acceptor_id: string | null
          acceptor_shift_id: string | null
          created_at: string
          id: string
          preferred_dates_count: number | null
          requester_id: string
          requester_shift_id: string
          status: string
          updated_at: string
        }[]
      }
      get_user_matches_with_rls: {
        Args: { user_id: string }
        Returns: {
          match_id: string
          match_status: string
          created_at: string
          match_date: string
          my_request_id: string
          other_request_id: string
          my_shift_id: string
          my_shift_date: string
          my_shift_start_time: string
          my_shift_end_time: string
          my_shift_truck: string
          other_shift_id: string
          other_shift_date: string
          other_shift_start_time: string
          other_shift_end_time: string
          other_shift_truck: string
          other_user_id: string
          other_user_name: string
        }[]
      }
      get_user_swap_requests_safe: {
        Args: { p_user_id: string; p_status: string }
        Returns: {
          id: string
          status: string
          requester_id: string
          requester_shift_id: string
          created_at: string
          shift: Json
          preferred_dates: Json
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      test_admin_access: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      user_is_involved_in_swap_request: {
        Args: { request_id: string; auth_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
