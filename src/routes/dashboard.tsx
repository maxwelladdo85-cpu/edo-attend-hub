import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2,
  MapPin,
  LogIn,
  LogOut,
  Clock,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, primaryRole } from "@/contexts/AuthContext";
import { DashboardShell, roleLabelFor } from "@/components/DashboardShell";
import { StatCard } from "@/components/StatCard";
import { distanceMeters, getCurrentPosition, classifyArrival, classifyDeparture } from "@/lib/geo";
import { haptic } from "@/lib/haptics";
import { StudentAttendancePanel } from "@/components/StudentAttendancePanel";
import { AdmitStudentCard } from "@/components/AdmitStudentCard";
import {
  markTeacherAttendance,
  getTeacherAttendanceForDate,
  getTeacherAttendanceForSchoolDate,
  getTeacherProfilesForSchool,
  bulkUpsertTeacherProfiles,
  bulkUpsertTeacherAttendance,
  cacheSchool,
  getCachedSchool,
} from "@/lib/offline/localDb";
import { syncNow } from "@/lib/offline/syncEngine";
import { isTransientNetworkError } from "@/lib/offline/networkErrors";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — EdoSAS" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session, loading, roles, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || session) return;
    // Race guard: the AuthContext may not have processed the SIGNED_IN event yet
    // right after sign-in. Re-check Supabase directly before bouncing to /login.
    let cancelled = false;
    supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
      if (!cancelled && !data.session) navigate({ to: "/login", replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [loading, session, navigate]);

  // Redirect admins to the dedicated admin section
  useEffect(() => {
    if (!loading && roles.length > 0 && primaryRole(roles) === "admin") {
      navigate({ to: "/admin", replace: true });
    }
  }, [loading, roles, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (roles.length === 0 || !profile) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const role = primaryRole(roles);
  const label = roleLabelFor(role);

  if (role === "admin") {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardShell nav={[]} roleLabel={label}>
      {role === "head_teacher" ? (
        <>
          <TeacherView />
          <div className="mt-8">
            <HeadTeacherView />
          </div>
        </>
      ) : (
        <>
          <TeacherView />
          {!profile?.school_id && (
            <div className="mt-6 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm flex gap-3">
              <AlertCircle className="h-5 w-5 text-warning-foreground flex-shrink-0" />
              <div>
                <div className="font-medium text-foreground">No school assigned yet</div>
                <div className="text-muted-foreground mt-1">
                  An EdoSAS administrator must assign you to a school before you can mark
                  attendance.
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}

/* ----------------------- TEACHER ----------------------- */
function TeacherView() {
  const { user, profile, refresh, roles } = useAuth();
  const [school, setSchool] = useState<any>(null);
  const [today, setToday] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [busy, setBusy] = useState<"arrival" | "departure" | null>(null);
  const [distanceWarning, setDistanceWarning] = useState<string | null>(null);

  // Default allowed radius (meters) when a school has not configured one.
  // GPS accuracy on phones is typically 5-30m, so 100m is a sensible floor.
  const DEFAULT_RADIUS_M = 20;

  const isHead = primaryRole(roles) === "head_teacher";
  const idLabel = isHead ? "Head Teacher ID" : "Teacher ID";
  const cardBg = "bg-head-teacher-card";

  const load = async () => {
    if (!user) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    const online = typeof navigator === "undefined" ? true : navigator.onLine;

    // ALWAYS hydrate from local cache first so the screen works instantly and
    // the Mark buttons are usable even when there is no network.
    if (profile?.school_id) {
      const cached = await getCachedSchool(profile.school_id);
      if (cached) setSchool(cached);
    }
    const localToday = await getTeacherAttendanceForDate(user.id, dateStr);
    if (localToday) setToday(localToday);

    try {
      const [{ data: s }, { data: a }, { data: st }] = await Promise.all([
        profile?.school_id
          ? supabase.from("schools").select("*").eq("id", profile.school_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        supabase
          .from("teacher_attendance")
          .select("*")
          .eq("teacher_user_id", user.id)
          .eq("attendance_date", dateStr)
          .maybeSingle(),
        profile?.school_id && profile?.class_taught
          ? supabase
              .from("students")
              .select("*")
              .eq("school_id", profile.school_id)
              .eq("class", profile.class_taught)
              .order("student_id", { ascending: true })
          : Promise.resolve({ data: [] } as any),
      ]);
      if (s) {
        setSchool(s);
        void cacheSchool(s); // keep local copy fresh for next offline session
      }
      // Prefer the locally cached row if it's newer than the server copy (offline edits not yet synced).
      const local = await getTeacherAttendanceForDate(user.id, dateStr);
      const localNewer =
        local && (!a?.updated_at || (local.updated_at && local.updated_at > a.updated_at));
      setToday(localNewer ? local : (a ?? local ?? null));
      setStudents(st ?? []);
    } catch {
      // Offline / network failure — local cache already loaded above; nothing to do.
      if (!online) {
        // Keep last-known school/students in state; do not overwrite with empty.
      }
    }
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [user?.id, profile?.school_id, profile?.class_taught]);

  const mark = async (kind: "arrival" | "departure") => {
    if (!user || !profile?.school_id || !school) {
      toast.error("Your school is not configured");
      return;
    }
    setBusy(kind);
    try {
      // Capture the exact timestamp the moment the button is pressed
      const now = new Date().toISOString();
      const dateStr = now.slice(0, 10);

      // Same offline-first behavior as student attendance: GPS is best-effort.
      // Some Android browsers try a network location lookup and throw
      // "TypeError: Failed to fetch" when offline; that must not block saving.
      let lat: number | null = null;
      let lng: number | null = null;
      let verified = false;
      let dist: number | null = null;
      try {
        const pos = await getCurrentPosition();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (err: any) {
        console.warn("Teacher attendance location unavailable; saving without GPS", err);
      }

      const allowedRadius = school.radius_meters ?? DEFAULT_RADIUS_M;
      if (
        lat !== null &&
        lng !== null &&
        school.latitude !== null &&
        school.longitude !== null
      ) {
        dist = distanceMeters(lat, lng, school.latitude, school.longitude);
        verified = dist <= allowedRadius;
      }

      if (!verified && dist !== null) {
        const teacherName = profile?.full_name ?? "Teacher";
        if (isHead) {
          setDistanceWarning(
            `Dear Head Teacher ${teacherName}, you marked your attendance out of range (${Math.round(dist)} m from your school, allowed radius ${allowedRadius} m). Please ensure you are within the school premises when marking attendance.`,
          );
        } else {
          setDistanceWarning(
            `Dear teacher ${teacherName}, you marked your attendance out of range (${Math.round(dist)} m from your school, allowed radius ${allowedRadius} m).`,
          );
        }
      } else {
        setDistanceWarning(null);
      }

      const status =
        kind === "arrival"
          ? classifyArrival(now, school.resumption_time)
          : classifyDeparture(now, school.closing_time);

      // Offline-first: write locally + enqueue. Sync engine pushes when online.
      const saved = await markTeacherAttendance({
        user_id: user.id,
        school_id: school.id,
        attendance_date: dateStr,
        kind,
        time: now,
        lat,
        lng,
        status,
        verified,
        device_info: navigator.userAgent.slice(0, 200),
      });
      setToday(saved);

      const timeLabel = new Date(now).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const online = typeof navigator === "undefined" ? true : navigator.onLine;
      const offlineSuffix = online ? "" : " (saved offline — will sync when back online)";

      if (kind === "arrival") {
        const arrivalLabel =
          status === "early"
            ? "Well done, you arrived early"
            : status === "late"
              ? "You arrived late"
              : `Arrival marked at ${timeLabel} — on time`;
        if (verified) {
          void haptic("success");
          toast.success(arrivalLabel + offlineSuffix);
        } else {
          void haptic("warning");
          toast.warning(
            dist === null
              ? `Arrival recorded at ${timeLabel} without GPS location${offlineSuffix}`
              : `Arrival recorded at ${timeLabel}, but you are ${Math.round(dist)} m from ${school.name}.${offlineSuffix}`,
          );
        }
      } else {
        const departureLabel =
          status === "left_early"
            ? "Early"
            : status === "overtime"
              ? "Departed after closing time"
              : status.replace("_", " ");
        if (verified) {
          void haptic("success");
          toast.success(`Departure marked at ${timeLabel} — ${departureLabel}${offlineSuffix}`);
        } else {
          void haptic("warning");
          toast.warning(
            dist === null
              ? `Departure recorded at ${timeLabel} without GPS location${offlineSuffix}`
              : `Departure recorded at ${timeLabel}, but you are ${Math.round(dist)} m from ${school.name}.${offlineSuffix}`,
          );
        }
      }

      // Fire-and-forget background sync attempt; harmless if offline.
      if (online) {
        void syncNow(school.id).catch((err) => {
          if (!isTransientNetworkError(err)) console.warn("Teacher attendance sync failed", err);
        });
      }
    } catch (e: any) {
      void haptic("error");
      if (isTransientNetworkError(e)) {
        toast.success(
          "Attendance saved on this phone. It will sync when the connection is stable.",
        );
      } else {
        toast.error(e.message ?? "Could not save attendance");
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          Welcome, {profile?.full_name?.split(" ")[0] ?? "Teacher"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {school ? school.name : "No school assigned"} ·{" "}
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
          <UserCheck className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">{idLabel}:</span>
          <span className="font-mono font-semibold text-foreground">
            {profile?.teacher_id ?? "—"}
          </span>
          {profile?.class_taught && (
            <>
              <span className="text-border">|</span>
              <span className="text-muted-foreground">Class:</span>
              <span className="font-semibold text-foreground">{profile.class_taught}</span>
            </>
          )}
        </div>
      </div>

      {distanceWarning && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm flex gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-destructive">Attendance Marked</div>
            <div className="text-destructive/80 mt-1">{distanceWarning}</div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className={`rounded-2xl border border-border ${cardBg} p-6 shadow-card`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Arrival
              </div>
              <div className="mt-2 text-2xl font-bold font-display">
                {today?.arrival_time
                  ? new Date(today.arrival_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </div>
              {today?.arrival_status && <StatusBadge status={today.arrival_status} />}
              {today?.arrival_lat != null && today?.arrival_lng != null && (
                <a
                  href={`https://www.google.com/maps?q=${today.arrival_lat},${today.arrival_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 flex items-center gap-1 text-xs sm:text-[11px] text-primary font-mono hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5 sm:h-3 sm:w-3 flex-shrink-0" />
                  <span className="break-all">
                    {today.arrival_lat.toFixed(4)}, {today.arrival_lng.toFixed(4)}
                  </span>
                </a>
              )}
              {today?.arrival_lat != null &&
                today?.arrival_lng != null &&
                school?.latitude != null &&
                school?.longitude != null && (
                  <div className="mt-1 text-xs sm:text-[11px] text-muted-foreground">
                    Distance:{" "}
                    {Math.round(
                      distanceMeters(
                        today.arrival_lat,
                        today.arrival_lng,
                        school.latitude,
                        school.longitude,
                      ),
                    ).toLocaleString()}{" "}
                    m from school
                  </div>
                )}
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center">
              <LogIn className="h-6 w-6 text-primary" />
            </div>
          </div>
          <Button
            onClick={() => mark("arrival")}
            disabled={!!busy || !!today?.arrival_time || !school}
            className="w-full mt-5 bg-gradient-primary hover:opacity-90 h-12 text-base"
          >
            {busy === "arrival" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : today?.arrival_time ? (
              "Already marked"
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Mark arrival
              </>
            )}
          </Button>
        </div>

        <div className={`rounded-2xl border border-border ${cardBg} p-6 shadow-card`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Departure
              </div>
              <div className="mt-2 text-2xl font-bold font-display">
                {today?.departure_time
                  ? new Date(today.departure_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </div>
              {today?.departure_status && <StatusBadge status={today.departure_status} />}
              {today?.departure_lat != null && today?.departure_lng != null && (
                <a
                  href={`https://www.google.com/maps?q=${today.departure_lat},${today.departure_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 flex items-center gap-1 text-xs sm:text-[11px] text-primary font-mono hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5 sm:h-3 sm:w-3 flex-shrink-0" />
                  <span className="break-all">
                    {today.departure_lat.toFixed(4)}, {today.departure_lng.toFixed(4)}
                  </span>
                </a>
              )}
              {today?.departure_lat != null &&
                today?.departure_lng != null &&
                school?.latitude != null &&
                school?.longitude != null && (
                  <div className="mt-1 text-xs sm:text-[11px] text-muted-foreground">
                    Distance:{" "}
                    {Math.round(
                      distanceMeters(
                        today.departure_lat,
                        today.departure_lng,
                        school.latitude,
                        school.longitude,
                      ),
                    ).toLocaleString()}{" "}
                    m from school
                  </div>
                )}
            </div>
            <div className="h-12 w-12 rounded-xl bg-gold/15 grid place-items-center">
              <LogOut className="h-6 w-6 text-gold-foreground" />
            </div>
          </div>
          <Button
            onClick={() => mark("departure")}
            disabled={!!busy || !today?.arrival_time || !!today?.departure_time || !school}
            variant="outline"
            className="w-full mt-5 h-12 text-base"
          >
            {busy === "departure" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : today?.departure_time ? (
              "Already marked"
            ) : !today?.arrival_time ? (
              "Mark arrival first"
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Mark departure
              </>
            )}
          </Button>
        </div>
      </div>

      {school && (
        <div className={`rounded-2xl border border-border ${cardBg} p-6 shadow-card`}>
          <h3 className="font-display font-semibold mb-3">School details</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <Info
              label="Resumption time"
              value={school.resumption_time?.slice(0, 5)}
              icon={Clock}
            />
            <Info label="Closing time" value={school.closing_time?.slice(0, 5)} icon={Clock} />
            <Info label="Approved radius" value={`${school.radius_meters} m`} icon={MapPin} />
            <Info label="LGA" value={school.lga} icon={Building2} />
          </div>
        </div>
      )}

      <AdmitStudentCard schoolName={school?.name} onAdded={load} />

      <StudentAttendancePanel />
    </div>
  );
}

function Info({ label, value, icon: Icon }: any) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium">{value ?? "—"}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    early: { label: "Early", cls: "bg-success/15 text-success" },
    on_time: { label: "On time", cls: "bg-success/15 text-success" },
    late: { label: "Late", cls: "bg-destructive/15 text-destructive" },
    left_early: { label: "Early", cls: "bg-destructive/15 text-destructive" },
    overtime: { label: "Departed after closing time", cls: "bg-gold/20 text-gold-foreground" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mt-2 ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

/* ----------------------- HEAD TEACHER ----------------------- */
function HeadTeacherView() {
  const { profile, user } = useAuth();
  const [school, setSchool] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [records, setRecords] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!profile?.school_id) {
      setLoading(false);
      return;
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    setLoading(true);

    const [cachedSchool, cachedTeachers, cachedRecords] = await Promise.all([
      getCachedSchool(profile.school_id),
      getTeacherProfilesForSchool(profile.school_id),
      getTeacherAttendanceForSchoolDate(profile.school_id, dateStr),
    ]);
    if (cachedSchool) setSchool(cachedSchool);
    if (cachedTeachers.length) setTeachers(cachedTeachers.filter((t: any) => t.user_id !== user?.id));
    if (cachedRecords.length) {
      setRecords(Object.fromEntries(cachedRecords.map((r: any) => [r.teacher_user_id, r])));
    }

    try {
      const [{ data: sc }, { data: ts }, { data: rs }] = await Promise.all([
        supabase.from("schools").select("*").eq("id", profile.school_id).maybeSingle(),
        supabase
          .from("profiles")
          .select("user_id, full_name, designation, teacher_id, class_taught, school_id")
          .eq("school_id", profile.school_id),
        supabase
          .from("teacher_attendance")
          .select("*")
          .eq("school_id", profile.school_id)
          .eq("attendance_date", dateStr),
      ]);
      if (sc) {
        setSchool(sc);
        void cacheSchool(sc);
      }
      if (ts) {
        setTeachers(ts.filter((t: any) => t.user_id !== user?.id));
        void bulkUpsertTeacherProfiles(ts as any);
      }
      if (rs) {
        setRecords(Object.fromEntries(rs.map((r: any) => [r.teacher_user_id, r])));
        void bulkUpsertTeacherAttendance(rs.map((r: any) => ({ ...r, user_id: r.teacher_user_id })) as any);
      }
    } catch (e: any) {
      if (!isTransientNetworkError(e)) console.warn("Teacher attendance list failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [profile?.school_id, user?.id]);

  // Live updates: whenever any teacher in this school marks/updates attendance,
  // refresh the Head Teacher's roster so it shows up immediately.
  useEffect(() => {
    if (!profile?.school_id) return;
    const channel = supabase
      .channel(`head-teacher-attendance-${profile.school_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teacher_attendance",
          filter: `school_id=eq.${profile.school_id}`,
        },
        () => {
          load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    /* eslint-disable-next-line */
  }, [profile?.school_id]);

  // Also refresh whenever the tab regains focus or the device comes back online,
  // so head teachers see fresh data even if the realtime socket missed an event.
  useEffect(() => {
    const onFocus = () => load();
    const onOnline = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
    /* eslint-disable-next-line */
  }, [profile?.school_id]);

  const verify = async (id: string) => {
    const { error } = await supabase
      .from("teacher_attendance")
      .update({ head_verified: true, head_verified_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Verified");
    load();
  };

  const markFor = async (teacher: any, kind: "arrival" | "departure") => {
    if (!school || !user) return;
    const key = `${teacher.user_id}-${kind}`;
    setBusy(key);
    try {
      const now = new Date().toISOString();
      const dateStr = now.slice(0, 10);
      const existing = records[teacher.user_id];

      if (kind === "departure" && !existing?.arrival_time) {
        toast.error("Mark arrival first");
        return;
      }

      const status =
        kind === "arrival"
          ? classifyArrival(now, school.resumption_time)
          : classifyDeparture(now, school.closing_time);

      const saved = await markTeacherAttendance({
        user_id: teacher.user_id,
        school_id: school.id,
        attendance_date: dateStr,
        kind,
        time: now,
        lat: null,
        lng: null,
        status,
        verified: true,
        includeVerificationFields: true,
        head_verified: true,
        head_verified_by: user.id,
        head_verified_at: now,
        device_info: `marked by head teacher (${profile?.full_name ?? user.id})`,
      });

      setRecords((prev) => ({ ...prev, [teacher.user_id]: saved }));
      toast.success(`${kind === "arrival" ? "Arrival" : "Departure"} marked for ${teacher.full_name}`);

      if (navigator.onLine !== false) {
        void syncNow(school.id).catch((err) => {
          if (!isTransientNetworkError(err)) console.warn("Teacher attendance sync failed", err);
        });
      }
    } catch (e: any) {
      if (isTransientNetworkError(e)) {
        toast.success("Attendance saved on this phone. It will sync when the connection is stable.");
      } else {
        toast.error(e.message ?? "Could not save");
      }
    } finally {
      setBusy(null);
    }
  };

  const all = Object.values(records);
  const present = all.filter((r: any) => r.arrival_time).length;
  const late = all.filter((r: any) => r.arrival_status === "late").length;
  const leftEarly = all.filter((r: any) => r.departure_status === "left_early").length;
  const pending = all.filter((r: any) => r.arrival_time && !r.head_verified).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Head Teacher Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Today's teacher attendance · {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={UserCheck}
          label="Present"
          value={present}
          tone="success"
          className="bg-head-teacher-card"
        />
        <StatCard
          icon={Clock}
          label="Late"
          value={late}
          tone="warning"
          className="bg-head-teacher-card"
        />
        <StatCard
          icon={LogOut}
          label="Left early"
          value={leftEarly}
          tone="destructive"
          className="bg-head-teacher-card"
        />
        <StatCard
          icon={AlertCircle}
          label="Pending"
          value={pending}
          tone="gold"
          className="bg-head-teacher-card"
        />
      </div>

      <div className="rounded-2xl border border-border bg-head-teacher-card shadow-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-display font-semibold">Teachers in your school</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Mark on a teacher's behalf if they couldn't sign in.
          </p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin inline" />
          </div>
        ) : teachers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No teachers assigned to this school yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {teachers.map((t) => {
              const r = records[t.user_id];
              return (
                <div
                  key={t.user_id}
                  className="p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0 sm:min-w-[180px]">
                    <div className="font-medium truncate">{t.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.teacher_id ?? "—"}
                      {t.class_taught ? ` · ${t.class_taught}` : ""}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4 text-sm">
                    <div className="min-w-0 sm:min-w-[110px]">
                      <div className="text-muted-foreground text-xs">Arrival</div>
                      <div>
                        {r?.arrival_time
                          ? new Date(r.arrival_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </div>
                      {r?.arrival_status && <StatusBadge status={r.arrival_status} />}
                      {r?.arrival_lat != null && r?.arrival_lng != null && (
                        <a
                          href={`https://www.google.com/maps?q=${r.arrival_lat},${r.arrival_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center gap-1 text-[11px] text-primary font-mono hover:underline"
                        >
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="break-all">
                            {r.arrival_lat.toFixed(4)}, {r.arrival_lng.toFixed(4)}
                          </span>
                        </a>
                      )}
                    </div>
                    <div className="min-w-0 sm:min-w-[110px]">
                      <div className="text-muted-foreground text-xs">Departure</div>
                      <div>
                        {r?.departure_time
                          ? new Date(r.departure_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </div>
                      {r?.departure_status && <StatusBadge status={r.departure_status} />}
                      {r?.departure_lat != null && r?.departure_lng != null && (
                        <a
                          href={`https://www.google.com/maps?q=${r.departure_lat},${r.departure_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center gap-1 text-[11px] text-primary font-mono hover:underline"
                        >
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="break-all">
                            {r.departure_lat.toFixed(4)}, {r.departure_lng.toFixed(4)}
                          </span>
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    {r?.arrival_time ? (
                      r.head_verified ? (
                        <Badge className="bg-success/15 text-success border-success/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Button size="sm" variant="default" onClick={() => verify(r.id)}>
                          Verify
                        </Button>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Awaiting teacher to mark arrival
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
