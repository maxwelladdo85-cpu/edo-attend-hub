import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MapPin, LogIn, LogOut, Users, School, Clock, AlertCircle, CheckCircle2, UserCheck, Building2, Activity, GraduationCap as GraduationIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, primaryRole } from "@/contexts/AuthContext";
import { DashboardShell, roleLabelFor } from "@/components/DashboardShell";
import { StatCard } from "@/components/StatCard";
import { distanceMeters, getCurrentPosition, classifyArrival, classifyDeparture } from "@/lib/geo";
import { AssignTeachersPanel } from "@/components/AssignTeachersPanel";
import { StudentAttendancePanel } from "@/components/StudentAttendancePanel";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — EdoSUBEB Smart Attendance" }] }),
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
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && !data.session) navigate({ to: "/login", replace: true });
    });
    return () => { cancelled = true; };
  }, [loading, session, navigate]);

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

  return (
    <DashboardShell nav={[]} roleLabel={label}>
      {role === "admin" ? (
        <AdminView />
      ) : role === "head_teacher" ? (
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
                <div className="text-muted-foreground mt-1">An EdoSUBEB administrator must assign you to a school before you can mark attendance.</div>
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

  const isHead = primaryRole(roles) === "head_teacher";
  const idLabel = isHead ? "Head Teacher ID" : "Teacher ID";
  const cardBg = isHead ? "bg-head-teacher-card" : "bg-card";

  const load = async () => {
    if (!user) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    const [{ data: s }, { data: a }, { data: st }] = await Promise.all([
      profile?.school_id
        ? supabase.from("schools").select("*").eq("id", profile.school_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      supabase.from("teacher_attendance").select("*").eq("teacher_user_id", user.id).eq("attendance_date", dateStr).maybeSingle(),
      profile?.school_id && profile?.class_taught
        ? supabase.from("students").select("*").eq("school_id", profile.school_id).eq("class", profile.class_taught).order("student_id", { ascending: true })
        : Promise.resolve({ data: [] } as any),
    ]);
    setSchool(s);
    setToday(a);
    setStudents(st ?? []);
  };

  useEffect(() => {
    // Only auto-refresh when the school is missing. class_taught is intentionally
    // null for Head Teachers — refreshing on it caused an infinite loader loop.
    if (user && !profile?.school_id) {
      void refresh();
    }
  }, [user, profile?.school_id, refresh]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id, profile?.school_id, profile?.class_taught]);

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

      // Best-effort location capture — does NOT block saving the time
      let lat: number | null = null;
      let lng: number | null = null;
      let verified = false;
      let dist: number | null = null;
      try {
        const pos = await getCurrentPosition();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        dist = distanceMeters(lat, lng, school.latitude, school.longitude);
        verified = dist <= (school.radius_meters ?? 100);
      } catch {
        // Location unavailable — still record the time, just unverified
      }

      if (kind === "arrival") {
        const status = classifyArrival(now, school.resumption_time);
        const { error } = await supabase.from("teacher_attendance").upsert(
          {
            teacher_user_id: user.id,
            school_id: school.id,
            attendance_date: dateStr,
            arrival_time: now,
            arrival_lat: lat,
            arrival_lng: lng,
            arrival_status: status,
            arrival_verified: verified,
            device_info: navigator.userAgent.slice(0, 200),
          },
          { onConflict: "teacher_user_id,attendance_date" },
        );
        if (error) throw error;
        const timeLabel = new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        if (verified) {
          toast.success(`Arrival marked at ${timeLabel} — ${status.replace("_", " ")}`);
        } else if (dist !== null) {
          toast.warning(`Arrival recorded at ${timeLabel}, but you are ${Math.round(dist)}m from ${school.name} (unverified).`);
        } else {
          toast.warning(`Arrival recorded at ${timeLabel} without location (unverified).`);
        }
      } else {
        const status = classifyDeparture(now, school.closing_time);
        const { error } = await supabase
          .from("teacher_attendance")
          .update({
            departure_time: now,
            departure_lat: lat,
            departure_lng: lng,
            departure_status: status,
            departure_verified: verified,
          })
          .eq("teacher_user_id", user.id)
          .eq("attendance_date", dateStr);
        if (error) throw error;
        const timeLabel = new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        toast.success(`Departure marked at ${timeLabel} — ${status.replace("_", " ")}`);
      }
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Could not save attendance");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Welcome, {profile?.full_name?.split(" ")[0] ?? "Teacher"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{school ? school.name : "No school assigned"} · {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
          <UserCheck className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">{idLabel}:</span>
          <span className="font-mono font-semibold text-foreground">{profile?.teacher_id ?? "—"}</span>
          {profile?.class_taught && (
            <>
              <span className="text-border">|</span>
              <span className="text-muted-foreground">Class:</span>
              <span className="font-semibold text-foreground">{profile.class_taught}</span>
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className={`rounded-2xl border border-border ${cardBg} p-6 shadow-card`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Arrival</div>
              <div className="mt-2 text-2xl font-bold font-display">
                {today?.arrival_time ? new Date(today.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
              </div>
              {today?.arrival_status && <StatusBadge status={today.arrival_status} />}
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center">
              <LogIn className="h-6 w-6 text-primary" />
            </div>
          </div>
          <Button onClick={() => mark("arrival")} disabled={!!busy || !!today?.arrival_time || !school} className="w-full mt-5 bg-gradient-primary hover:opacity-90">
            {busy === "arrival" ? <Loader2 className="h-4 w-4 animate-spin" /> : today?.arrival_time ? "Already marked" : (<><MapPin className="h-4 w-4 mr-2" />Mark arrival</>)}
          </Button>
        </div>

        <div className={`rounded-2xl border border-border ${cardBg} p-6 shadow-card`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Departure</div>
              <div className="mt-2 text-2xl font-bold font-display">
                {today?.departure_time ? new Date(today.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
              </div>
              {today?.departure_status && <StatusBadge status={today.departure_status} />}
            </div>
            <div className="h-12 w-12 rounded-xl bg-gold/15 grid place-items-center">
              <LogOut className="h-6 w-6 text-gold-foreground" />
            </div>
          </div>
          <Button onClick={() => mark("departure")} disabled={!!busy || !today?.arrival_time || !!today?.departure_time || !school} variant="outline" className="w-full mt-5">
            {busy === "departure" ? <Loader2 className="h-4 w-4 animate-spin" /> : today?.departure_time ? "Already marked" : !today?.arrival_time ? "Mark arrival first" : (<><MapPin className="h-4 w-4 mr-2" />Mark departure</>)}
          </Button>
        </div>
      </div>

      {school && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display font-semibold mb-3">School details</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <Info label="Resumption time" value={school.resumption_time?.slice(0,5)} icon={Clock} />
            <Info label="Closing time" value={school.closing_time?.slice(0,5)} icon={Clock} />
            <Info label="Approved radius" value={`${school.radius_meters} m`} icon={MapPin} />
            <Info label="LGA" value={school.lga} icon={Building2} />
          </div>
        </div>
      )}

      <StudentAttendancePanel />
    </div>
  );
}

function Info({ label, value, icon: Icon }: any) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center"><Icon className="h-4 w-4 text-muted-foreground" /></div>
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
    left_early: { label: "Left early", cls: "bg-destructive/15 text-destructive" },
    overtime: { label: "Overtime", cls: "bg-gold/20 text-gold-foreground" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mt-2 ${s.cls}`}>{s.label}</span>;
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
    if (!profile?.school_id) { setLoading(false); return; }
    const dateStr = new Date().toISOString().slice(0, 10);
    const [{ data: sc }, { data: ts }, { data: rs }] = await Promise.all([
      supabase.from("schools").select("*").eq("id", profile.school_id).maybeSingle(),
      supabase.from("profiles").select("user_id, full_name, designation, teacher_id, class_taught").eq("school_id", profile.school_id),
      supabase.from("teacher_attendance").select("*").eq("school_id", profile.school_id).eq("attendance_date", dateStr),
    ]);
    setSchool(sc);
    setTeachers((ts ?? []).filter((t: any) => t.user_id !== user?.id));
    setRecords(Object.fromEntries((rs ?? []).map((r: any) => [r.teacher_user_id, r])));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.school_id, user?.id]);

  const verify = async (id: string) => {
    const { error } = await supabase.from("teacher_attendance").update({ head_verified: true, head_verified_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
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

      if (kind === "arrival") {
        const status = classifyArrival(now, school.resumption_time);
        const { error } = await supabase.from("teacher_attendance").upsert(
          {
            teacher_user_id: teacher.user_id,
            school_id: school.id,
            attendance_date: dateStr,
            arrival_time: now,
            arrival_status: status,
            arrival_verified: true,
            head_verified: true,
            head_verified_by: user.id,
            head_verified_at: now,
            device_info: `marked by head teacher (${profile?.full_name ?? user.id})`,
          },
          { onConflict: "teacher_user_id,attendance_date" },
        );
        if (error) throw error;
        toast.success(`Arrival marked for ${teacher.full_name}`);
      } else {
        if (!existing?.arrival_time) {
          toast.error("Mark arrival first");
          return;
        }
        const status = classifyDeparture(now, school.closing_time);
        const { error } = await supabase
          .from("teacher_attendance")
          .update({
            departure_time: now,
            departure_status: status,
            departure_verified: true,
          })
          .eq("teacher_user_id", teacher.user_id)
          .eq("attendance_date", dateStr);
        if (error) throw error;
        toast.success(`Departure marked for ${teacher.full_name}`);
      }
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Could not save");
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
        <p className="text-sm text-muted-foreground mt-1">Today's teacher attendance · {new Date().toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={UserCheck} label="Present" value={present} tone="success" />
        <StatCard icon={Clock} label="Late" value={late} tone="warning" />
        <StatCard icon={LogOut} label="Left early" value={leftEarly} tone="destructive" />
        <StatCard icon={AlertCircle} label="Pending" value={pending} tone="gold" />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-display font-semibold">Teachers in your school</h3>
          <p className="text-xs text-muted-foreground mt-1">Mark on a teacher's behalf if they couldn't sign in.</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : teachers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No teachers assigned to this school yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {teachers.map((t) => {
              const r = records[t.user_id];
              return (
                <div key={t.user_id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                  <div className="flex-1 min-w-0 sm:min-w-[180px]">
                    <div className="font-medium truncate">{t.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.teacher_id ?? "—"}{t.class_taught ? ` · ${t.class_taught}` : ""}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4 text-sm">
                    <div className="min-w-0 sm:min-w-[110px]">
                      <div className="text-muted-foreground text-xs">Arrival</div>
                      <div>{r?.arrival_time ? new Date(r.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                      {r?.arrival_status && <StatusBadge status={r.arrival_status} />}
                    </div>
                    <div className="min-w-0 sm:min-w-[110px]">
                      <div className="text-muted-foreground text-xs">Departure</div>
                      <div>{r?.departure_time ? new Date(r.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                      {r?.departure_status && <StatusBadge status={r.departure_status} />}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    <Button
                      size="sm"
                      variant={r?.arrival_time ? "outline" : "default"}
                      disabled={busy === `${t.user_id}-arrival` || !!r?.arrival_time}
                      onClick={() => markFor(t, "arrival")}
                      className={!r?.arrival_time ? "bg-gradient-primary hover:opacity-90 flex-1 sm:flex-none" : "flex-1 sm:flex-none"}
                    >
                      {busy === `${t.user_id}-arrival` ? <Loader2 className="h-3 w-3 animate-spin" /> : r?.arrival_time ? "Arrived" : "Mark arrival"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === `${t.user_id}-departure` || !r?.arrival_time || !!r?.departure_time}
                      onClick={() => markFor(t, "departure")}
                      className="flex-1 sm:flex-none"
                    >
                      {busy === `${t.user_id}-departure` ? <Loader2 className="h-3 w-3 animate-spin" /> : r?.departure_time ? "Left" : "Mark departure"}
                    </Button>
                    {r?.arrival_time && (r.head_verified ? (
                      <Badge className="bg-success/15 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => verify(r.id)}>Verify</Button>
                    ))}
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


/* ----------------------- ADMIN ----------------------- */
function AdminView() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    schools: 0, teachers: 0, students: 0,
    present: 0, late: 0, absent: 0,
    studentsPresent: 0, studentsAbsent: 0,
  });
  const [feed, setFeed] = useState<any[]>([]);
  const [teacherNames, setTeacherNames] = useState<Record<string, any>>({});
  const [schoolNames, setSchoolNames] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const refresh = async () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const [{ count: schools }, { count: teachers }, { count: students }, { data: att }, { data: satt }] = await Promise.all([
      supabase.from("schools").select("*", { count: "exact", head: true }),
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("teacher_attendance").select("*").eq("attendance_date", dateStr).order("arrival_time", { ascending: false }).limit(50),
      supabase.from("student_attendance").select("morning_status,afternoon_status").eq("attendance_date", dateStr),
    ]);
    const present = att?.filter((r: any) => r.arrival_time).length ?? 0;
    const late = att?.filter((r: any) => r.arrival_status === "late").length ?? 0;
    const studentsPresent = satt?.filter((r: any) => r.morning_status === "present" || r.afternoon_status === "present").length ?? 0;
    setStats({
      schools: schools ?? 0,
      teachers: teachers ?? 0,
      students: students ?? 0,
      present,
      late,
      absent: Math.max(0, (teachers ?? 0) - present),
      studentsPresent,
      studentsAbsent: Math.max(0, (students ?? 0) - studentsPresent),
    });
    const recs = att ?? [];
    setFeed(recs);
    const tids = [...new Set(recs.map((r: any) => r.teacher_user_id))];
    const sids = [...new Set(recs.map((r: any) => r.school_id).filter(Boolean))];
    if (tids.length) {
      const { data: ps } = await supabase.from("profiles").select("user_id, full_name, teacher_id").in("user_id", tids);
      setTeacherNames(Object.fromEntries((ps ?? []).map((p: any) => [p.user_id, p])));
    }
    if (sids.length) {
      const { data: ss } = await supabase.from("schools").select("id, name").in("id", sids);
      setSchoolNames(Object.fromEntries((ss ?? []).map((s: any) => [s.id, s])));
    }
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("admin-attendance")
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_attendance" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "student_attendance" }, () => refresh())
      .subscribe();
    const interval = setInterval(refresh, 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 bg-gradient-to-br from-primary via-primary/90 to-gold text-primary-foreground shadow-card">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">
              Welcome, {profile?.full_name?.split(" ")[0] ?? "Administrator"}
            </h1>
            <p className="text-sm opacity-90 mt-1">EdoSUBEB statewide administration · {liveTime.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            Live · {liveTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Network overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard icon={School} label="Schools" value={stats.schools} />
          <StatCard icon={Users} label="Teachers" value={stats.teachers} />
          <StatCard icon={GraduationIcon} label="Students" value={stats.students} tone="gold" />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Teachers today</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard icon={UserCheck} label="Present" value={stats.present} tone="success" hint={`${stats.teachers ? Math.round((stats.present / stats.teachers) * 100) : 0}% of teachers`} />
          <StatCard icon={Clock} label="Late" value={stats.late} tone="warning" hint={`${stats.teachers ? Math.round((stats.late / stats.teachers) * 100) : 0}% of teachers`} />
          <StatCard icon={AlertCircle} label="Absent" value={stats.absent} tone="destructive" hint={`${stats.teachers ? Math.round((stats.absent / stats.teachers) * 100) : 0}% of teachers`} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Students today</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard icon={UserCheck} label="Present" value={stats.studentsPresent} tone="success" hint={`${stats.students ? Math.round((stats.studentsPresent / stats.students) * 100) : 0}% of students`} />
          <StatCard icon={AlertCircle} label="Not marked" value={stats.studentsAbsent} tone="destructive" hint={`${stats.students ? Math.round((stats.studentsAbsent / stats.students) * 100) : 0}% of students`} />
          <StatCard icon={GraduationIcon} label="Total enrolled" value={stats.students} tone="gold" />
        </div>
      </div>

      <AssignTeachersPanel />

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold">Real-time activity</h3>
          </div>
          <span className="text-xs text-muted-foreground">Auto-refresh every 30s</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : feed.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No attendance activity yet today.</div>
        ) : (
          <div className="divide-y divide-border">
            {feed.map((r) => {
              const t = teacherNames[r.teacher_user_id];
              const s = schoolNames[r.school_id];
              return (
                <div key={r.id} className="p-4 flex flex-wrap items-center gap-3 text-sm">
                  <div className={`h-9 w-9 rounded-lg grid place-items-center ${r.arrival_verified ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}>
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-medium">{t?.full_name ?? "Teacher"} {t?.teacher_id && <span className="text-xs text-muted-foreground font-mono">({t.teacher_id})</span>}</div>
                    <div className="text-xs text-muted-foreground">
                      {s?.name ?? "—"}
                      {r.arrival_time ? ` · Arrived ${new Date(r.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                      {r.departure_time ? ` · Left ${new Date(r.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                    </div>
                  </div>
                  {r.arrival_status && <StatusBadge status={r.arrival_status} />}
                  {r.head_verified && <Badge className="bg-success/15 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

