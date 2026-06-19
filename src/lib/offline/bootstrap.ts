// Initial offline cache: download the teacher's school + current-term data
// the first time we see them online. After this, the UI reads from localDb
// and the sync engine keeps it fresh.

import { supabase } from "@/integrations/supabase/client";
import {
  bulkUpsertStudentAttendance,
  bulkUpsertStudents,
  bulkUpsertTeacherAttendance,
  bulkUpsertTeacherProfiles,
  cacheSchool,
} from "./localDb";
import { getMeta, setMeta } from "./storage";
import type {
  CachedStudent,
  CachedStudentAttendance,
  CachedTeacherProfile,
  CachedTeacherAttendance,
} from "./types";

const PAGE_SIZE = 1000;

interface BootstrapOptions {
  schoolId: string;
  force?: boolean;
}

/** Returns the date window [start, end] (inclusive) of the current academic period for this school. */
async function getCurrentTermWindow(schoolId: string): Promise<{ start: string; end: string } | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("academic_periods")
    .select("start_date, end_date")
    .lte("start_date", today)
    .gte("end_date", today)
    .order("start_date", { ascending: false })
    .limit(1);
  const row = data?.[0];
  if (!row) return null;
  return { start: row.start_date as string, end: row.end_date as string };
}

async function pullAllStudents(schoolId: string) {
  let from = 0;
  const collected: CachedStudent[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from("students")
      .select("id, student_id, full_name, class, gender, school_id")
      .eq("school_id", schoolId)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    collected.push(...(data as CachedStudent[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  await bulkUpsertStudents(collected);
  return collected.length;
}

async function pullTeacherProfiles(schoolId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, designation, teacher_id, class_taught, school_id")
    .eq("school_id", schoolId);
  if (error) throw error;
  const rows = (data ?? []).filter((r: any) => r.user_id && r.school_id) as CachedTeacherProfile[];
  await bulkUpsertTeacherProfiles(rows);
  return rows.length;
}

async function pullStudentAttendance(schoolId: string, start: string, end: string) {
  let from = 0;
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from("student_attendance")
      .select("*")
      .eq("school_id", schoolId)
      .gte("attendance_date", start)
      .lte("attendance_date", end)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    const rows: CachedStudentAttendance[] = data.map((r: any) => ({
      ...r,
      local_key: `${r.student_id}_${r.attendance_date}`,
      updated_at: r.updated_at ?? new Date().toISOString(),
    }));
    await bulkUpsertStudentAttendance(rows);
    total += rows.length;
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return total;
}

async function pullTeacherAttendance(schoolId: string, start: string, end: string) {
  const { data, error } = await supabase
    .from("teacher_attendance")
    .select("*")
    .eq("school_id", schoolId)
    .gte("attendance_date", start)
    .lte("attendance_date", end);
  if (error) throw error;
  const rows: CachedTeacherAttendance[] = (data ?? []).map((r: any) => ({
    ...r,
    user_id: r.teacher_user_id,
    local_key: `${r.teacher_user_id}_${r.attendance_date}`,
    updated_at: r.updated_at ?? new Date().toISOString(),
  }));
  await bulkUpsertTeacherAttendance(rows);
  return rows.length;
}

export async function bootstrapOfflineData(opts: BootstrapOptions) {
  const meta = await getMeta();
  if (!opts.force && meta.bootstrap_school_id === opts.schoolId && meta.students_pulled_at) {
    return { skipped: true as const };
  }

  const window = (await getCurrentTermWindow(opts.schoolId)) ?? {
    // Fallback to a 90-day window if no academic period configured.
    start: new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  };

  const [{ data: school }, students, teachers, sAtt, tAtt] = await Promise.all([
    supabase.from("schools").select("*").eq("id", opts.schoolId).maybeSingle(),
    pullAllStudents(opts.schoolId),
    pullTeacherProfiles(opts.schoolId),
    pullStudentAttendance(opts.schoolId, window.start, window.end),
    pullTeacherAttendance(opts.schoolId, window.start, window.end),
  ]);
  if (school) await cacheSchool(school);

  const now = new Date().toISOString();
  await setMeta({
    bootstrap_school_id: opts.schoolId,
    students_pulled_at: now,
    student_attendance_pulled_at: now,
    teacher_attendance_pulled_at: now,
  });

  return { skipped: false as const, students, teachers, sAtt, tAtt };
}
