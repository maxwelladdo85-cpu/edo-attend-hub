// Sync engine: drains the outbox to Supabase, then pulls server-side changes
// back down. Designed to be called whenever the network becomes available,
// when the app foregrounds, and on a light interval.

import { supabase } from "@/integrations/supabase/client";
import {
  bulkUpsertStudentAttendance,
  bulkUpsertTeacherAttendance,
  listOutbox,
  markOutboxFailure,
  removeOutboxEntry,
} from "./localDb";
import { getMeta, setMeta } from "./storage";
import type { CachedStudentAttendance, CachedTeacherAttendance, OutboxEntry } from "./types";

type Listener = (state: SyncState) => void;
export interface SyncState {
  online: boolean;
  syncing: boolean;
  pending: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

let state: SyncState = {
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  syncing: false,
  pending: 0,
  lastSyncedAt: null,
  lastError: null,
};
const listeners = new Set<Listener>();
let started = false;
let inFlight: Promise<void> | null = null;
// Set when syncNow is called while another sync is already running. Ensures
// rows enqueued after the in-flight sync snapshotted the outbox get pushed
// immediately instead of waiting for the next 60s tick.
let rerunRequested = false;
let rerunSchoolId: string | null = null;

function emit() {
  for (const l of listeners) l(state);
}
function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  emit();
}

export function getSyncState(): SyncState {
  return state;
}
export function subscribeSync(l: Listener): () => void {
  listeners.add(l);
  l(state);
  return () => listeners.delete(l);
}

async function pushOne(entry: OutboxEntry): Promise<void> {
  if (entry.op === "upsert_student_attendance") {
    const {
      head_verified,
      head_verified_by,
      head_verified_at,
      arrival_verified,
      departure_verified,
      ...payload
    } = entry.payload as any;
    const { error } = await supabase
      .from("student_attendance")
      .upsert([payload], { onConflict: "student_id,attendance_date" });
    if (error) throw error;
  } else if (entry.op === "upsert_teacher_attendance") {
    const { error } = await supabase
      .from("teacher_attendance")
      .upsert([entry.payload as any], { onConflict: "user_id,attendance_date" });
    if (error) throw error;
  } else {
    throw new Error(`Unknown outbox op: ${entry.op}`);
  }
}

async function pullDeltas(schoolId: string) {
  const meta = await getMeta();
  const sSince = meta.student_attendance_pulled_at ?? "1970-01-01T00:00:00Z";
  const tSince = meta.teacher_attendance_pulled_at ?? "1970-01-01T00:00:00Z";

  // Pull rows updated on the server since our last successful pull. We don't
  // overwrite a row that still has a pending outbox entry — the push will win.
  const pendingKeys = new Set((await listOutbox()).map((e) => e.row_key));

  const [{ data: sa }, { data: ta }] = await Promise.all([
    supabase
      .from("student_attendance")
      .select("*")
      .eq("school_id", schoolId)
      .gt("updated_at", sSince)
      .order("updated_at", { ascending: true })
      .limit(1000),
    supabase
      .from("teacher_attendance")
      .select("*")
      .eq("school_id", schoolId)
      .gt("updated_at", tSince)
      .order("updated_at", { ascending: true })
      .limit(1000),
  ]);

  const sRows: CachedStudentAttendance[] = (sa ?? [])
    .map((r: any) => ({ ...r, local_key: `${r.student_id}_${r.attendance_date}` }) as CachedStudentAttendance)
    .filter((r: CachedStudentAttendance) => !pendingKeys.has(r.local_key));
  const tRows: CachedTeacherAttendance[] = (ta ?? [])
    .map((r: any) => ({ ...r, local_key: `${r.user_id}_${r.attendance_date}` }) as CachedTeacherAttendance)
    .filter((r: CachedTeacherAttendance) => !pendingKeys.has(r.local_key));

  if (sRows.length) await bulkUpsertStudentAttendance(sRows);
  if (tRows.length) await bulkUpsertTeacherAttendance(tRows);

  const newest = (arr: { updated_at?: string | null }[]) =>
    arr.reduce<string | null>((acc, r) => (r.updated_at && (!acc || r.updated_at > acc) ? r.updated_at : acc), null);
  const newSa = newest(sa ?? []);
  const newTa = newest(ta ?? []);
  await setMeta({
    student_attendance_pulled_at: newSa ?? meta.student_attendance_pulled_at,
    teacher_attendance_pulled_at: newTa ?? meta.teacher_attendance_pulled_at,
  });
}

export async function syncNow(schoolId?: string | null): Promise<void> {
  if (inFlight) {
    // Coalesce: remember that another pass is needed once the current one ends.
    rerunRequested = true;
    if (schoolId) rerunSchoolId = schoolId;
    return inFlight;
  }
  if (!state.online) {
    setState({ pending: (await listOutbox()).length });
    return;
  }
  inFlight = (async () => {
    setState({ syncing: true, lastError: null });
    try {
      // 1) Drain outbox FIFO
      const entries = await listOutbox();
      for (const entry of entries) {
        try {
          await pushOne(entry);
          await removeOutboxEntry(entry);
        } catch (err: any) {
          await markOutboxFailure(entry, err?.message ?? String(err));
          // Stop on first failure to preserve order; will retry next tick.
          throw err;
        }
      }
      // 2) Pull deltas (only if we know the school)
      if (schoolId) await pullDeltas(schoolId);
      setState({ lastSyncedAt: new Date().toISOString(), pending: 0 });
    } catch (err: any) {
      setState({ lastError: err?.message ?? String(err), pending: (await listOutbox()).length });
    } finally {
      setState({ syncing: false, pending: (await listOutbox()).length });
      inFlight = null;
      // If marks landed in the outbox while we were syncing, drain them now.
      if (rerunRequested) {
        const nextSchool = rerunSchoolId ?? schoolId ?? null;
        rerunRequested = false;
        rerunSchoolId = null;
        if ((await listOutbox()).length > 0) {
          void syncNow(nextSchool);
        }
      }
    }
  })();
  return inFlight;
}

export async function refreshPendingCount() {
  setState({ pending: (await listOutbox()).length });
}

/** Wire browser + Capacitor lifecycle events to trigger sync. Safe to call many times. */
export function startSyncEngine(getSchoolId: () => string | null | undefined) {
  if (started) return;
  started = true;

  const trigger = () => {
    void syncNow(getSchoolId() ?? null);
  };

  // Browser online/offline
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      setState({ online: true });
      trigger();
    });
    window.addEventListener("offline", () => setState({ online: false }));
    window.addEventListener("focus", trigger);
  }

  // Capacitor network + app resume (no-op on web)
  (async () => {
    try {
      const { Network } = await import("@capacitor/network");
      const status = await Network.getStatus();
      setState({ online: status.connected });
      Network.addListener("networkStatusChange", (s) => {
        setState({ online: s.connected });
        if (s.connected) trigger();
      });
    } catch {
      /* not in native */
    }
    try {
      const { App } = await import("@capacitor/app");
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) trigger();
      });
    } catch {
      /* not in native */
    }
  })();

  // Light interval while foregrounded
  if (typeof window !== "undefined") {
    setInterval(() => {
      if (document.visibilityState === "visible" && state.online) trigger();
    }, 60_000);
  }

  // Initial pending count + first attempt
  void refreshPendingCount();
  trigger();
}
