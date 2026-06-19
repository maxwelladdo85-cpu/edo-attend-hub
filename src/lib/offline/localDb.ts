// Typed wrappers around the offline KV stores. The UI reads and writes here
// only; the sync engine is the single layer that talks to Supabase.

import {
  allEntries,
  outboxStore,
  schoolsStore,
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
// Conflict resolution: when pulling server rows we skip any row whose server
// `updated_at` is older than what we already have locally. This keeps a
// freshly-marked-offline edit from being clobbered by a stale server copy
// during the same sync cycle. Pure last-write-wins by ISO timestamp.
export async function bulkUpsertStudentAttendance(rows: CachedStudentAttendance[]) {
  await Promise.all(
    rows.map(async (r) => {
      const key = studentAttendanceKey(r.student_id, r.attendance_date);
      const existing = (await studentAttendanceStore.getItem(key)) as CachedStudentAttendance | null;
      if (existing?.updated_at && r.updated_at && existing.updated_at > r.updated_at) return;
      await studentAttendanceStore.setItem(key, r);
    }),
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
    // Keep verification fields local-only for now. The live student_attendance
    // table does not have these columns, so sending them during sync would keep
    // the outbox stuck with pending changes.
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
    },
  });

  return next;
}

// ---------- Teacher attendance ----------
export async function bulkUpsertTeacherAttendance(rows: CachedTeacherAttendance[]) {
  await Promise.all(
    rows.map(async (r) => {
      const key = teacherAttendanceKey(r.user_id, r.attendance_date);
      const existing = (await teacherAttendanceStore.getItem(key)) as CachedTeacherAttendance | null;
      if (existing?.updated_at && r.updated_at && existing.updated_at > r.updated_at) return;
      await teacherAttendanceStore.setItem(key, r);
    }),
  );
}

export async function getTeacherAttendanceForDate(
  user_id: string,
  attendance_date: string,
): Promise<any | null> {
  const key = teacherAttendanceKey(user_id, attendance_date);
  return (await teacherAttendanceStore.getItem(key)) as any | null;
}

export interface MarkTeacherAttendanceInput {
  user_id: string;
  school_id: string;
  attendance_date: string;
  kind: "arrival" | "departure";
  time: string; // ISO
  lat: number | null;
  lng: number | null;
  status: string | null;
  verified: boolean;
  device_info?: string | null;
}

/** Write teacher attendance locally and enqueue an outbox entry. Works offline. */
export async function markTeacherAttendance(input: MarkTeacherAttendanceInput) {
  const key = teacherAttendanceKey(input.user_id, input.attendance_date);
  const existing = (await teacherAttendanceStore.getItem(key)) as any | null;
  const isArrival = input.kind === "arrival";

  const next: any = {
    local_key: key,
    user_id: input.user_id,
    teacher_user_id: input.user_id,
    school_id: input.school_id,
    attendance_date: input.attendance_date,
    arrival_time: isArrival ? input.time : existing?.arrival_time ?? null,
    arrival_lat: isArrival ? input.lat : existing?.arrival_lat ?? null,
    arrival_lng: isArrival ? input.lng : existing?.arrival_lng ?? null,
    arrival_status: isArrival ? input.status : existing?.arrival_status ?? null,
    arrival_verified: isArrival ? input.verified : existing?.arrival_verified ?? false,
    departure_time: !isArrival ? input.time : existing?.departure_time ?? null,
    departure_lat: !isArrival ? input.lat : existing?.departure_lat ?? null,
    departure_lng: !isArrival ? input.lng : existing?.departure_lng ?? null,
    departure_status: !isArrival ? input.status : existing?.departure_status ?? null,
    departure_verified: !isArrival ? input.verified : existing?.departure_verified ?? false,
    device_info: input.device_info ?? existing?.device_info ?? null,
    updated_at: new Date().toISOString(),
  };

  await teacherAttendanceStore.setItem(key, next);
  await enqueue({
    op: "upsert_teacher_attendance",
    row_key: key,
    payload: {
      teacher_user_id: next.teacher_user_id,
      school_id: next.school_id,
      attendance_date: next.attendance_date,
      arrival_time: next.arrival_time,
      arrival_lat: next.arrival_lat,
      arrival_lng: next.arrival_lng,
      arrival_status: next.arrival_status,
      arrival_verified: next.arrival_verified,
      departure_time: next.departure_time,
      departure_lat: next.departure_lat,
      departure_lng: next.departure_lng,
      departure_status: next.departure_status,
      departure_verified: next.departure_verified,
      device_info: next.device_info,
    },
  });

  return next;
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
