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
      areas: {
        Row: {
          created_at: string
          id: string
          name: string
          region_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          region_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          region_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          swap_match_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          swap_match_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          swap_match_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_swap_match_id_fkey"
            columns: ["swap_match_id"]
            isOneToOne: true
            referencedRelation: "shift_swap_potential_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      colleague_types: {
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
      improved_shift_swaps: {
        Row: {
          accepted_shift_types: string[]
          created_at: string
          id: string
          matched_with_id: string | null
          requester_id: string
          requester_shift_id: string
          status: string
          updated_at: string
          wanted_date: string
        }
        Insert: {
          accepted_shift_types?: string[]
          created_at?: string
          id?: string
          matched_with_id?: string | null
          requester_id: string
          requester_shift_id: string
          status?: string
          updated_at?: string
          wanted_date: string
        }
        Update: {
          accepted_shift_types?: string[]
          created_at?: string
          id?: string
          matched_with_id?: string | null
          requester_id?: string
          requester_shift_id?: string
          status?: string
          updated_at?: string
          wanted_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "improved_shift_swaps_matched_with_id_fkey"
            columns: ["matched_with_id"]
            isOneToOne: false
            referencedRelation: "improved_shift_swaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improved_shift_swaps_requester_shift_id_fkey"
            columns: ["requester_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      improved_swap_wanted_dates: {
        Row: {
          created_at: string
          date: string
          id: string
          swap_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          swap_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          swap_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "improved_swap_wanted_dates_swap_id_fkey"
            columns: ["swap_id"]
            isOneToOne: false
            referencedRelation: "improved_shift_swaps"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_blocks: {
        Row: {
          block_number: number
          created_at: string
          end_date: string
          id: string
          original_block_id: string | null
          split_designation: string | null
          start_date: string
          status: string
        }
        Insert: {
          block_number: number
          created_at?: string
          end_date: string
          id?: string
          original_block_id?: string | null
          split_designation?: string | null
          start_date: string
          status?: string
        }
        Update: {
          block_number?: number
          created_at?: string
          end_date?: string
          id?: string
          original_block_id?: string | null
          split_designation?: string | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_blocks_original_block_id_fkey"
            columns: ["original_block_id"]
            isOneToOne: false
            referencedRelation: "leave_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_swap_matches: {
        Row: {
          acceptor_id: string
          acceptor_leave_block_id: string
          created_at: string
          id: string
          requester_id: string
          requester_leave_block_id: string
          status: string
          updated_at: string
        }
        Insert: {
          acceptor_id: string
          acceptor_leave_block_id: string
          created_at?: string
          id?: string
          requester_id: string
          requester_leave_block_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          acceptor_id?: string
          acceptor_leave_block_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          requester_leave_block_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_swap_matches_acceptor_leave_block_id_fkey"
            columns: ["acceptor_leave_block_id"]
            isOneToOne: false
            referencedRelation: "leave_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_swap_matches_requester_leave_block_id_fkey"
            columns: ["requester_leave_block_id"]
            isOneToOne: false
            referencedRelation: "leave_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_swap_requests: {
        Row: {
          created_at: string
          id: string
          requested_leave_block_id: string
          requester_id: string
          requester_leave_block_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          requested_leave_block_id: string
          requester_id: string
          requester_leave_block_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          requested_leave_block_id?: string
          requester_id?: string
          requester_leave_block_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_swap_requests_requested_leave_block_id_fkey"
            columns: ["requested_leave_block_id"]
            isOneToOne: false
            referencedRelation: "leave_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_swap_requests_requester_leave_block_id_fkey"
            columns: ["requester_leave_block_id"]
            isOneToOne: false
            referencedRelation: "leave_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
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
      regions: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      shift_lengths: {
        Row: {
          created_at: string
          hours: number
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          hours: number
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          hours?: number
          id?: string
          status?: string
        }
        Relationships: []
      }
      shift_swap_acceptances: {
        Row: {
          accepted_at: string | null
          id: string
          match_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          match_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_swap_acceptances_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "shift_swap_potential_matches"
            referencedColumns: ["id"]
          },
        ]
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
          acceptor_has_accepted: boolean
          acceptor_request_id: string
          acceptor_shift_id: string
          created_at: string
          id: string
          match_date: string
          requester_has_accepted: boolean
          requester_request_id: string
          requester_shift_id: string
          status: string
        }
        Insert: {
          acceptor_has_accepted?: boolean
          acceptor_request_id: string
          acceptor_shift_id: string
          created_at?: string
          id?: string
          match_date: string
          requester_has_accepted?: boolean
          requester_request_id: string
          requester_shift_id: string
          status?: string
        }
        Update: {
          acceptor_has_accepted?: boolean
          acceptor_request_id?: string
          acceptor_shift_id?: string
          created_at?: string
          id?: string
          match_date?: string
          requester_has_accepted?: boolean
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
      shift_swap_preferences: {
        Row: {
          acceptable_shift_types: string[] | null
          created_at: string
          id: string
          preferred_areas: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acceptable_shift_types?: string[] | null
          created_at?: string
          id?: string
          preferred_areas?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acceptable_shift_types?: string[] | null
          created_at?: string
          id?: string
          preferred_areas?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          area_id: string | null
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_names_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_leave_blocks: {
        Row: {
          created_at: string
          id: string
          leave_block_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leave_block_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leave_block_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_leave_blocks_leave_block_id_fkey"
            columns: ["leave_block_id"]
            isOneToOne: false
            referencedRelation: "leave_blocks"
            referencedColumns: ["id"]
          },
        ]
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
      user_swap_preferences: {
        Row: {
          area_id: string | null
          created_at: string
          id: string
          region_id: string | null
          user_id: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          id?: string
          region_id?: string | null
          user_id: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          id?: string
          region_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_swap_preferences_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_swap_preferences_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
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
      confirm_shift_swap: {
        Args: { request_id: string; confirming_user_id: string }
        Returns: Json
      }
      create_leave_swap_match: {
        Args: {
          p_requester_id: string
          p_acceptor_id: string
          p_requester_leave_block_id: string
          p_acceptor_leave_block_id: string
        }
        Returns: string
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
      find_leave_swap_matches: {
        Args: Record<PropertyKey, never>
        Returns: {
          requester1_id: string
          requester2_id: string
          requester1_leave_block_id: string
          requester2_leave_block_id: string
          requester1_block_number: number
          requester2_block_number: number
        }[]
      }
      find_shift_swap_matches: {
        Args: Record<PropertyKey, never>
        Returns: {
          request1_id: string
          request2_id: string
          requester1_id: string
          requester2_id: string
          shift1_id: string
          shift2_id: string
          shift1_date: string
          shift2_date: string
          compatibility_score: number
        }[]
      }
      get_all_leave_blocks: {
        Args: Record<PropertyKey, never>
        Returns: {
          block_number: number
          created_at: string
          end_date: string
          id: string
          original_block_id: string | null
          split_designation: string | null
          start_date: string
          status: string
        }[]
      }
      get_all_leave_swap_requests: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          requester_id: string
          requester_leave_block_id: string
          requested_leave_block_id: string
          requester_block_number: number
          requester_start_date: string
          requester_end_date: string
          requested_block_number: number
          requested_start_date: string
          requested_end_date: string
          status: string
          created_at: string
        }[]
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
      get_all_regions_and_areas: {
        Args: Record<PropertyKey, never>
        Returns: {
          region_id: string
          region_name: string
          region_status: string
          area_id: string
          area_name: string
          area_status: string
          area_region_id: string
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
      get_swap_request_details: {
        Args: { p_request_id: string }
        Returns: {
          id: string
          requester_id: string
          requester_shift_id: string
          acceptor_id: string
          acceptor_shift_id: string
          status: string
          created_at: string
          updated_at: string
          preferred_dates_count: number
          requester_first_name: string
          requester_last_name: string
          requester_employee_id: string
        }[]
      }
      get_user_leave_blocks: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          user_id: string
          leave_block_id: string
          block_number: number
          start_date: string
          end_date: string
          status: string
          created_at: string
        }[]
      }
      get_user_leave_swap_matches: {
        Args: { p_user_id: string }
        Returns: {
          match_id: string
          match_status: string
          created_at: string
          my_leave_block_id: string
          my_block_number: number
          my_start_date: string
          my_end_date: string
          other_leave_block_id: string
          other_block_number: number
          other_start_date: string
          other_end_date: string
          other_user_id: string
          other_user_name: string
          is_requester: boolean
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
      get_user_swap_preferences: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          user_id: string
          region_id: string
          area_id: string
          created_at: string
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
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      match_shift_swap_requests: {
        Args: { request1_id: string; request2_id: string }
        Returns: boolean
      }
      test_admin_access: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      user_can_access_conversation: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      user_is_involved_in_match: {
        Args: { p_match_id: string; p_user_id: string }
        Returns: boolean
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
