// Offline-first data shapes. These mirror the Supabase columns we cache locally.

export type Mark = "present" | "late" | "absent";

export interface CachedStudent {
  id: string;
  student_id: string;
  full_name: string;
  class: string;
  gender: string | null;
  school_id: string;
}

export interface CachedTeacherProfile {
  user_id: string;
  full_name: string;
  designation: string | null;
  teacher_id: string | null;
  class_taught: string | null;
  school_id: string;
}

export interface CachedStudentAttendance {
  // Local primary key uses `${student_id}_${attendance_date}` so we can upsert
  // without needing a server-generated id while offline.
  local_key: string;
  id?: string | null; // server id once known
  student_id: string;
  school_id: string;
  attendance_date: string; // yyyy-MM-dd
  morning_status: Mark | null;
  afternoon_status: Mark | null;
  morning_marked_at: string | null;
  afternoon_marked_at: string | null;
  morning_lat: number | null;
  morning_lng: number | null;
  afternoon_lat: number | null;
  afternoon_lng: number | null;
  marked_by: string;
  updated_at: string;
  // Server-managed verification flags. Cached for display only; teacher edits
  // clear them locally and the sync engine clears them on the server.
  head_verified?: boolean | null;
  head_verified_by?: string | null;
  head_verified_at?: string | null;
  arrival_verified?: boolean | null;
  departure_verified?: boolean | null;
}

export interface CachedTeacherAttendance {
  local_key: string; // `${teacher_user_id}_${attendance_date}`
  user_id?: string;
  teacher_user_id: string;
  school_id: string;
  attendance_date: string;
  arrival_time: string | null;
  arrival_status?: string | null;
  arrival_lat: number | null;
  arrival_lng: number | null;
  arrival_verified?: boolean | null;
  departure_time: string | null;
  departure_status?: string | null;
  departure_lat: number | null;
  departure_lng: number | null;
  departure_verified?: boolean | null;
  head_verified?: boolean | null;
  head_verified_by?: string | null;
  head_verified_at?: string | null;
  device_info?: string | null;
  updated_at: string;
}

export type OutboxOp = "upsert_student_attendance" | "upsert_teacher_attendance";

export interface OutboxEntry {
  id: string; // uuid
  op: OutboxOp;
  row_key: string; // local_key of the row this operation refers to
  payload: Record<string, unknown>;
  created_at: string;
  attempts: number;
  last_error?: string;
}

export interface SyncMeta {
  // ISO timestamp of the most recent server `updated_at` we've pulled per table.
  students_pulled_at?: string;
  student_attendance_pulled_at?: string;
  teacher_attendance_pulled_at?: string;
  bootstrap_school_id?: string;
}
