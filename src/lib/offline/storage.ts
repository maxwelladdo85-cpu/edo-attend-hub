// Persistent KV storage backed by IndexedDB (via localforage). Works the same
// in the browser and inside the Capacitor WebView on Android/iOS — app-sandboxed
// IndexedDB is not evicted by the OS, so it survives days of offline use.

import localforage from "localforage";
import type {
  CachedStudent,
  CachedStudentAttendance,
  CachedTeacherAttendance,
  OutboxEntry,
  SyncMeta,
} from "./types";

const DB_NAME = "edosas-offline";

function makeStore<T>(name: string) {
  return localforage.createInstance({
    name: DB_NAME,
    storeName: name,
    driver: [
      localforage.INDEXEDDB,
      localforage.WEBSQL,
      localforage.LOCALSTORAGE,
    ],
  });
}

export const studentsStore = makeStore<CachedStudent>("students");
export const teacherProfilesStore = makeStore<unknown>("teacher_profiles");
export const studentAttendanceStore = makeStore<CachedStudentAttendance>("student_attendance");
export const teacherAttendanceStore = makeStore<CachedTeacherAttendance>("teacher_attendance");
export const outboxStore = makeStore<OutboxEntry>("outbox");
export const metaStore = makeStore<unknown>("meta");
// Cached school details so teachers can mark attendance offline without a
// round trip. Keyed by school id.
export const schoolsStore = makeStore<unknown>("schools");

const META_KEY = "sync_meta";

export async function getMeta(): Promise<SyncMeta> {
  return ((await metaStore.getItem(META_KEY)) as SyncMeta | null) ?? {};
}

export async function setMeta(patch: Partial<SyncMeta>): Promise<SyncMeta> {
  const current = await getMeta();
  const next = { ...current, ...patch };
  await metaStore.setItem(META_KEY, next);
  return next;
}

export async function clearAllOfflineData() {
  await Promise.all([
    studentsStore.clear(),
    teacherProfilesStore.clear(),
    studentAttendanceStore.clear(),
    teacherAttendanceStore.clear(),
    outboxStore.clear(),
    metaStore.clear(),
    schoolsStore.clear(),
  ]);
}

export async function allEntries<T>(store: LocalForage): Promise<T[]> {
  const out: T[] = [];
  await store.iterate<T, void>((value) => {
    out.push(value);
  });
  return out;
}
