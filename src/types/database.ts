export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  grind: {
    Tables: {
      app_accounts: {
        Row: {
          created_at: string
          setup_completed_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          setup_completed_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          setup_completed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          equipment: string
          id: string
          load_convention: string
          load_mode: string
          name: string
          origin: string
          owner_id: string | null
          primary_muscle: string
        }
        Insert: {
          archived_at?: string | null
          category: string
          created_at?: string
          equipment: string
          id?: string
          load_convention: string
          load_mode?: string
          name: string
          origin: string
          owner_id?: string | null
          primary_muscle: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          equipment?: string
          id?: string
          load_convention?: string
          load_mode?: string
          name?: string
          origin?: string
          owner_id?: string | null
          primary_muscle?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "app_accounts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      routine_exercises: {
        Row: {
          exercise_id: string
          id: string
          load_mode: string
          notes: string
          position: number
          rest_seconds: number
          routine_id: string
        }
        Insert: {
          exercise_id: string
          id: string
          load_mode: string
          notes?: string
          position: number
          rest_seconds: number
          routine_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          load_mode?: string
          notes?: string
          position?: number
          rest_seconds?: number
          routine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routine_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_sets: {
        Row: {
          canonical_kg: number | null
          entered_load: string | null
          entered_unit: string
          id: string
          position: number
          reps: number | null
          routine_exercise_id: string
          set_type: string
        }
        Insert: {
          canonical_kg?: number | null
          entered_load?: string | null
          entered_unit: string
          id: string
          position: number
          reps?: number | null
          routine_exercise_id: string
          set_type: string
        }
        Update: {
          canonical_kg?: number | null
          entered_load?: string | null
          entered_unit?: string
          id?: string
          position?: number
          reps?: number | null
          routine_exercise_id?: string
          set_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_sets_routine_exercise_id_fkey"
            columns: ["routine_exercise_id"]
            isOneToOne: false
            referencedRelation: "routine_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_templates: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "routine_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "app_accounts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_settings: {
        Row: {
          default_rest_seconds: number
          preferred_unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          default_rest_seconds?: number
          preferred_unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          default_rest_seconds?: number
          preferred_unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "app_accounts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      workout_command_receipts: {
        Row: {
          created_at: string
          operation_id: string
          owner_id: string
          request: Json
          result: Json
        }
        Insert: {
          created_at?: string
          operation_id: string
          owner_id: string
          request: Json
          result: Json
        }
        Update: {
          created_at?: string
          operation_id?: string
          owner_id?: string
          request?: Json
          result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workout_command_receipts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "app_accounts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          exercise_id: string
          id: string
          load_convention: string
          load_mode: string
          name: string
          notes: string
          position: number
          rest_seconds: number
          session_id: string
        }
        Insert: {
          exercise_id: string
          id: string
          load_convention: string
          load_mode: string
          name: string
          notes?: string
          position: number
          rest_seconds: number
          session_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          load_convention?: string
          load_mode?: string
          name?: string
          notes?: string
          position?: number
          rest_seconds?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          finished_at: string | null
          id: string
          name: string
          owner_id: string
          revision: number
          source_routine_id: string | null
          started_at: string
          status: string
          timezone: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          name: string
          owner_id: string
          revision?: number
          source_routine_id?: string | null
          started_at?: string
          status?: string
          timezone: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          revision?: number
          source_routine_id?: string | null
          started_at?: string
          status?: string
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "app_accounts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "workout_sessions_source_routine_id_fkey"
            columns: ["source_routine_id"]
            isOneToOne: false
            referencedRelation: "routine_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          canonical_kg: number | null
          completed_at: string | null
          entered_load: string | null
          entered_unit: string
          id: string
          position: number
          reps: number | null
          set_type: string
          workout_exercise_id: string
        }
        Insert: {
          canonical_kg?: number | null
          completed_at?: string | null
          entered_load?: string | null
          entered_unit: string
          id: string
          position: number
          reps?: number | null
          set_type: string
          workout_exercise_id: string
        }
        Update: {
          canonical_kg?: number | null
          completed_at?: string | null
          entered_load?: string | null
          entered_unit?: string
          id?: string
          position?: number
          reps?: number | null
          set_type?: string
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_workout_command: {
        Args: {
          p_command: Json
          p_expected_revision: number
          p_operation_id: string
          p_session_id: string
        }
        Returns: Json
      }
      archive_custom_exercise: {
        Args: { p_exercise_id: string; p_operation_id: string }
        Returns: Json
      }
      archive_routine: {
        Args: {
          p_expected_version: number
          p_operation_id: string
          p_routine_id: string
        }
        Returns: Json
      }
      cancel_workout: {
        Args: {
          p_expected_revision: number
          p_operation_id: string
          p_session_id: string
        }
        Returns: Json
      }
      complete_grind_setup: {
        Args: { p_default_rest_seconds: number; p_preferred_unit: string }
        Returns: {
          default_rest_seconds: number
          preferred_unit: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finish_workout: {
        Args: {
          p_expected_revision: number
          p_operation_id: string
          p_session_id: string
        }
        Returns: Json
      }
      get_active_workout: { Args: never; Returns: Json }
      get_previous_performance: {
        Args: {
          p_exercise_id: string
          p_load_convention?: string
          p_load_mode: string
        }
        Returns: Json
      }
      get_routine: { Args: { p_routine_id: string }; Returns: Json }
      get_workout: { Args: { p_session_id: string }; Returns: Json }
      join_grind: {
        Args: never
        Returns: {
          created_at: string
          setup_completed_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "app_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_routines: { Args: never; Returns: Json }
      list_workout_history: {
        Args: {
          p_before_finished_at?: string
          p_before_id?: string
          p_limit?: number
        }
        Returns: Json
      }
      save_custom_exercise: {
        Args: { p_exercise_id: string; p_operation_id: string; p_payload: Json }
        Returns: Json
      }
      save_grind_settings: {
        Args: { p_default_rest_seconds: number; p_preferred_unit: string }
        Returns: {
          default_rest_seconds: number
          preferred_unit: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_routine: {
        Args: {
          p_expected_version: number
          p_operation_id: string
          p_routine_id: string
          p_template: Json
        }
        Returns: Json
      }
      start_workout: {
        Args: {
          p_operation_id: string
          p_routine_id?: string
          p_timezone?: string
        }
        Returns: Json
      }
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
  grind: {
    Enums: {},
  },
} as const
