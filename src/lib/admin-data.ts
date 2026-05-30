import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SchoolLite = {
  id: string;
  name: string;
  lga: string;
  category: string | null;
  latitude: number;
  longitude: number;
};

export type TeacherAttendanceLite = {
  id: string;
  school_id: string | null;
  teacher_user_id: string;
  arrival_time: string | null;
  arrival_status: string | null;
  departure_time: string | null;
  head_verified: boolean;
};

export type StudentAttendanceLite = {
  student_id: string;
  school_id: string;
  morning_status: string | null;
  afternoon_status: string | null;
};

export type TeacherProfileLite = {
  user_id: string;
  school_id: string | null;
};

export type StudentLite = {
  id: string;
  school_id: string;
};

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function prettyLga(lga: string) {
  return lga
    .split("-")
    .map((s) => s.charAt(0) + s.slice(1).toLowerCase())
    .join(" ");
}

export function prettyCategory(c: string | null) {
  if (!c) return "Other";
  if (c === "primary") return "Primary";
  if (c === "junior_secondary") return "Junior Secondary";
  return c;
}

// Reference (entity) datasets — change rarely. Cache for 10 min, keep in
// memory 30 min so navigating between admin tabs is instant after first load.
const REF_STALE = 10 * 60_000;
const REF_GC = 30 * 60_000;

// Attendance — changes throughout the day. 60s stale, refetch every 90s
// only when the tab is focused, so switching sidebar sections is instant
// and background tabs don't spam the API.
const ATT_STALE = 60_000;
const ATT_GC = 10 * 60_000;
const ATT_REFETCH = 90_000;

// PostgREST caps responses at 1000 rows by default, so fetch in pages.
async function fetchAllPaged<T>(
  query: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await query(from, to);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

export function useSchools() {
  return useQuery({
    queryKey: ["admin", "schools"],
    queryFn: async () => {
      return await fetchAllPaged<SchoolLite>(async (from, to) => {
        const { data, error } = await supabase
          .from("schools")
          .select("id,name,lga,category,latitude,longitude")
          .range(from, to);
        return { data: data as SchoolLite[] | null, error };
      });
    },
    staleTime: REF_STALE,
    gcTime: REF_GC,
    refetchOnWindowFocus: false,
  });
}

export function useTeacherProfiles() {
  return useQuery({
    queryKey: ["admin", "teacher-profiles"],
    queryFn: async () => {
      const { data: roleRows, error: rerr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");
      if (rerr) throw rerr;
      const ids = (roleRows ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [] as TeacherProfileLite[];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,school_id")
        .in("user_id", ids);
      if (error) throw error;
      return (data ?? []) as TeacherProfileLite[];
    },
    staleTime: REF_STALE,
    gcTime: REF_GC,
    refetchOnWindowFocus: false,
  });
}

export function useStudents() {
  return useQuery({
    queryKey: ["admin", "students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id,school_id")
        .limit(50000);
      if (error) throw error;
      return (data ?? []) as StudentLite[];
    },
    staleTime: REF_STALE,
    gcTime: REF_GC,
    refetchOnWindowFocus: false,
  });
}

export function useTeacherAttendanceToday() {
  return useQuery({
    queryKey: ["admin", "teacher-attendance", todayStr()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("id,school_id,teacher_user_id,arrival_time,arrival_status,departure_time,head_verified")
        .eq("attendance_date", todayStr())
        .limit(20000);
      if (error) throw error;
      // De-duplicate by teacher_user_id so a teacher with multiple rows in a
      // single day cannot be counted more than once.
      const byTeacher = new Map<string, TeacherAttendanceLite>();
      for (const row of (data ?? []) as TeacherAttendanceLite[]) {
        const existing = byTeacher.get(row.teacher_user_id);
        // Prefer the row with an arrival_time, otherwise keep the first.
        if (!existing || (!existing.arrival_time && row.arrival_time)) {
          byTeacher.set(row.teacher_user_id, row);
        }
      }
      return Array.from(byTeacher.values());
    },
    staleTime: ATT_STALE,
    gcTime: ATT_GC,
    refetchInterval: ATT_REFETCH,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

export function useStudentAttendanceToday() {
  return useQuery({
    queryKey: ["admin", "student-attendance", todayStr()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_attendance")
        .select("student_id,school_id,morning_status,afternoon_status")
        .eq("attendance_date", todayStr())
        .limit(50000);
      if (error) throw error;
      // De-duplicate by student_id, merging morning + afternoon so a student
      // present in either slot is counted once.
      const byStudent = new Map<string, StudentAttendanceLite>();
      for (const row of (data ?? []) as StudentAttendanceLite[]) {
        const existing = byStudent.get(row.student_id);
        if (!existing) {
          byStudent.set(row.student_id, { ...row });
        } else {
          byStudent.set(row.student_id, {
            ...existing,
            morning_status: existing.morning_status ?? row.morning_status,
            afternoon_status: existing.afternoon_status ?? row.afternoon_status,
          });
        }
      }
      return Array.from(byStudent.values());
    },
    staleTime: ATT_STALE,
    gcTime: ATT_GC,
    refetchInterval: ATT_REFETCH,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

/** Round a ratio to a whole percentage, clamped to [0, 100]. */
export function safePct(numerator: number, denominator: number) {
  if (!denominator || denominator <= 0) return 0;
  const n = Math.min(numerator, denominator);
  return Math.round((n / denominator) * 100);
}

export function isStudentPresent(r: { morning_status: string | null; afternoon_status: string | null }) {
  return r.morning_status === "present" || r.afternoon_status === "present";
}
