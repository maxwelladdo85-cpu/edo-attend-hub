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
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          meta: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          class_taught: string | null
          created_at: string
          designation: string | null
          full_name: string
          id: string
          phone: string | null
          school_id: string | null
          status: string
          teacher_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          class_taught?: string | null
          created_at?: string
          designation?: string | null
          full_name: string
          id?: string
          phone?: string | null
          school_id?: string | null
          status?: string
          teacher_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          class_taught?: string | null
          created_at?: string
          designation?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          school_id?: string | null
          status?: string
          teacher_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          category: string | null
          closing_time: string
          code: string
          created_at: string
          id: string
          latitude: number
          lga: string
          longitude: number
          name: string
          radius_meters: number
          resumption_time: string
          updated_at: string
          ward: string | null
        }
        Insert: {
          category?: string | null
          closing_time?: string
          code: string
          created_at?: string
          id?: string
          latitude: number
          lga: string
          longitude: number
          name: string
          radius_meters?: number
          resumption_time?: string
          updated_at?: string
          ward?: string | null
        }
        Update: {
          category?: string | null
          closing_time?: string
          code?: string
          created_at?: string
          id?: string
          latitude?: number
          lga?: string
          longitude?: number
          name?: string
          radius_meters?: number
          resumption_time?: string
          updated_at?: string
          ward?: string | null
        }
        Relationships: []
      }
      student_attendance: {
        Row: {
          afternoon_status:
            | Database["public"]["Enums"]["attendance_mark"]
            | null
          attendance_date: string
          created_at: string
          id: string
          marked_by: string | null
          morning_status: Database["public"]["Enums"]["attendance_mark"] | null
          school_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          afternoon_status?:
            | Database["public"]["Enums"]["attendance_mark"]
            | null
          attendance_date?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          morning_status?: Database["public"]["Enums"]["attendance_mark"] | null
          school_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          afternoon_status?:
            | Database["public"]["Enums"]["attendance_mark"]
            | null
          attendance_date?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          morning_status?: Database["public"]["Enums"]["attendance_mark"] | null
          school_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class: string
          created_at: string
          full_name: string
          gender: string | null
          id: string
          parent_contact: string | null
          school_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class: string
          created_at?: string
          full_name: string
          gender?: string | null
          id?: string
          parent_contact?: string | null
          school_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          class?: string
          created_at?: string
          full_name?: string
          gender?: string | null
          id?: string
          parent_contact?: string | null
          school_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance: {
        Row: {
          arrival_lat: number | null
          arrival_lng: number | null
          arrival_status: Database["public"]["Enums"]["arrival_status"] | null
          arrival_time: string | null
          arrival_verified: boolean
          attendance_date: string
          created_at: string
          departure_lat: number | null
          departure_lng: number | null
          departure_status:
            | Database["public"]["Enums"]["departure_status"]
            | null
          departure_time: string | null
          departure_verified: boolean
          device_info: string | null
          head_verified: boolean
          head_verified_at: string | null
          head_verified_by: string | null
          id: string
          school_id: string | null
          teacher_user_id: string
          updated_at: string
        }
        Insert: {
          arrival_lat?: number | null
          arrival_lng?: number | null
          arrival_status?: Database["public"]["Enums"]["arrival_status"] | null
          arrival_time?: string | null
          arrival_verified?: boolean
          attendance_date?: string
          created_at?: string
          departure_lat?: number | null
          departure_lng?: number | null
          departure_status?:
            | Database["public"]["Enums"]["departure_status"]
            | null
          departure_time?: string | null
          departure_verified?: boolean
          device_info?: string | null
          head_verified?: boolean
          head_verified_at?: string | null
          head_verified_by?: string | null
          id?: string
          school_id?: string | null
          teacher_user_id: string
          updated_at?: string
        }
        Update: {
          arrival_lat?: number | null
          arrival_lng?: number | null
          arrival_status?: Database["public"]["Enums"]["arrival_status"] | null
          arrival_time?: string | null
          arrival_verified?: boolean
          attendance_date?: string
          created_at?: string
          departure_lat?: number | null
          departure_lng?: number | null
          departure_status?:
            | Database["public"]["Enums"]["departure_status"]
            | null
          departure_time?: string | null
          departure_verified?: boolean
          device_info?: string | null
          head_verified?: boolean
          head_verified_at?: string | null
          head_verified_by?: string | null
          id?: string
          school_id?: string | null
          teacher_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_school: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "head_teacher" | "teacher"
      arrival_status: "early" | "on_time" | "late"
      attendance_mark: "present" | "late" | "absent"
      departure_status: "left_early" | "on_time" | "overtime"
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
      app_role: ["admin", "head_teacher", "teacher"],
      arrival_status: ["early", "on_time", "late"],
      attendance_mark: ["present", "late", "absent"],
      departure_status: ["left_early", "on_time", "overtime"],
    },
  },
} as const
