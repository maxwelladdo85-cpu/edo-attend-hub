// Typed wrappers around the offline KV stores. The UI reads and writes here
// only; the sync engine is the single layer that talks to Supabase.

import {
  allEntries,
  outboxStore,
  studentAttendanceStore,
  studentsStore,
  teacherAttendanceStore,
} from "./storage";
import type {
  CachedStudent,
  CachedStudentAttendance,
  CachedTeacherAttendance,
  Mark,
  OutboxEntry,
} from "./types";

function uuid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const studentAttendanceKey = (student_id: string, attendance_date: string) =>
  `${student_id}_${attendance_date}`;

export const teacherAttendanceKey = (user_id: string, attendance_date: string) =>
  `${user_id}_${attendance_date}`;

// ---------- Students ----------
export async function upsertStudent(s: CachedStudent) {
  await studentsStore.setItem(s.id, s);
}
export async function bulkUpsertStudents(list: CachedStudent[]) {
  await Promise.all(list.map((s) => studentsStore.setItem(s.id, s)));
}
export async function getStudentsForSchool(schoolId: string): Promise<CachedStudent[]> {
  const all = await allEntries<CachedStudent>(studentsStore);
  return all.filter((s) => s.school_id === schoolId);
}

// ---------- Student attendance ----------
export async function bulkUpsertStudentAttendance(rows: CachedStudentAttendance[]) {
  await Promise.all(
    rows.map((r) =>
      studentAttendanceStore.setItem(studentAttendanceKey(r.student_id, r.attendance_date), r),
    ),
  );
}

export async function getStudentAttendanceForDate(
  schoolId: string,
  attendance_date: string,
): Promise<CachedStudentAttendance[]> {
  const out: CachedStudentAttendance[] = [];
  await studentAttendanceStore.iterate<CachedStudentAttendance, void>((value) => {
    if (value.school_id === schoolId && value.attendance_date === attendance_date) {
      out.push(value);
    }
  });
  return out;
}

export interface MarkAttendanceInput {
  student_id: string;
  school_id: string;
  attendance_date: string;
  session: "morning" | "afternoon";
  value: Mark | null;
  marked_by: string;
  lat: number | null;
  lng: number | null;
}

/** Write the attendance change locally AND enqueue an outbox entry in one step. */
export async function markStudentAttendance(input: MarkAttendanceInput): Promise<CachedStudentAttendance> {
  const key = studentAttendanceKey(input.student_id, input.attendance_date);
  const existing = (await studentAttendanceStore.getItem(key)) as CachedStudentAttendance | null;
  const now = input.value ? new Date().toISOString() : null;
  const isMorning = input.session === "morning";

  const next: CachedStudentAttendance = {
    local_key: key,
    id: existing?.id ?? null,
    student_id: input.student_id,
    school_id: input.school_id,
    attendance_date: input.attendance_date,
    morning_status: isMorning ? input.value : existing?.morning_status ?? null,
    afternoon_status: !isMorning ? input.value : existing?.afternoon_status ?? null,
    morning_marked_at: isMorning ? now : existing?.morning_marked_at ?? null,
    afternoon_marked_at: !isMorning ? now : existing?.afternoon_marked_at ?? null,
    morning_lat: isMorning ? input.lat : existing?.morning_lat ?? null,
    morning_lng: isMorning ? input.lng : existing?.morning_lng ?? null,
    afternoon_lat: !isMorning ? input.lat : existing?.afternoon_lat ?? null,
    afternoon_lng: !isMorning ? input.lng : existing?.afternoon_lng ?? null,
    marked_by: input.marked_by,
    updated_at: new Date().toISOString(),
    // Teacher edit clears verification locally so the head teacher sees it as
    // re-pending after the sync engine clears it on the server too.
    head_verified: false,
    head_verified_by: null,
    head_verified_at: null,
    arrival_verified: false,
    departure_verified: false,
  };

  await studentAttendanceStore.setItem(key, next);
  await enqueue({
    op: "upsert_student_attendance",
    row_key: key,
    payload: {
      student_id: next.student_id,
      school_id: next.school_id,
      attendance_date: next.attendance_date,
      morning_status: next.morning_status,
      afternoon_status: next.afternoon_status,
      morning_marked_at: next.morning_marked_at,
      afternoon_marked_at: next.afternoon_marked_at,
      morning_lat: next.morning_lat,
      morning_lng: next.morning_lng,
      afternoon_lat: next.afternoon_lat,
      afternoon_lng: next.afternoon_lng,
      marked_by: next.marked_by,
      // The sync engine sends these to the server too, clearing prior approval.
      head_verified: false,
      head_verified_by: null,
      head_verified_at: null,
      arrival_verified: false,
      departure_verified: false,
    },
  });

  return next;
}

// ---------- Teacher attendance ----------
export async function bulkUpsertTeacherAttendance(rows: CachedTeacherAttendance[]) {
  await Promise.all(
    rows.map((r) =>
      teacherAttendanceStore.setItem(teacherAttendanceKey(r.user_id, r.attendance_date), r),
    ),
  );
}

// ---------- Outbox ----------
export async function enqueue(entry: Omit<OutboxEntry, "id" | "created_at" | "attempts">) {
  const full: OutboxEntry = {
    id: uuid(),
    created_at: new Date().toISOString(),
    attempts: 0,
    ...entry,
  };
  // Key by row_key so repeated edits of the same row collapse into one pending
  // upsert (latest payload wins) — avoids unbounded growth when a teacher
  // toggles a student many times offline.
  await outboxStore.setItem(full.row_key + ":" + full.op, full);
  return full;
}

export async function listOutbox(): Promise<OutboxEntry[]> {
  const out: OutboxEntry[] = [];
  await outboxStore.iterate<OutboxEntry, void>((v) => {
    out.push(v);
  });
  return out.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function outboxCount(): Promise<number> {
  return await outboxStore.length();
}

export async function removeOutboxEntry(entry: OutboxEntry) {
  await outboxStore.removeItem(entry.row_key + ":" + entry.op);
}

export async function markOutboxFailure(entry: OutboxEntry, err: string) {
  const next: OutboxEntry = { ...entry, attempts: entry.attempts + 1, last_error: err };
  await outboxStore.setItem(entry.row_key + ":" + entry.op, next);
}
