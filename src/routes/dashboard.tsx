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

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — EdoSUBEB Smart Attendance" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session, loading, roles, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
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
        <HeadTeacherView />
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
  const { user, profile } = useAuth();
  const [school, setSchool] = useState<any>(null);
  const [today, setToday] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [busy, setBusy] = useState<"arrival" | "departure" | null>(null);

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
          <span className="text-muted-foreground">Teacher ID:</span>
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
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
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

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
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

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationIcon className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold">My students {profile?.class_taught ? `· ${profile.class_taught}` : ""}</h3>
          </div>
          <span className="text-xs text-muted-foreground">{students.length} total</span>
        </div>
        {students.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {profile?.class_taught ? "No students in your class yet." : "Class not assigned yet."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {students.map((s) => (
              <div key={s.id} className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center font-mono text-xs font-semibold text-primary">
                  {s.student_id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.full_name}</div>
                  <div className="text-xs text-muted-foreground">{s.class}{s.gender ? ` · ${s.gender}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
  const { profile } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!profile?.school_id) { setLoading(false); return; }
    const dateStr = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from("teacher_attendance").select("*").eq("school_id", profile.school_id).eq("attendance_date", dateStr).order("arrival_time", { ascending: true });
    const recs = data ?? [];
    setRecords(recs);
    const ids = [...new Set(recs.map((r) => r.teacher_user_id))];
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("user_id, full_name, designation").in("user_id", ids);
      setProfiles(Object.fromEntries((ps ?? []).map((p: any) => [p.user_id, p])));
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.school_id]);

  const verify = async (id: string) => {
    const { error } = await supabase.from("teacher_attendance").update({ head_verified: true, head_verified_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Verified");
    load();
  };

  const present = records.filter((r) => r.arrival_time).length;
  const late = records.filter((r) => r.arrival_status === "late").length;
  const leftEarly = records.filter((r) => r.departure_status === "left_early").length;
  const pending = records.filter((r) => r.arrival_time && !r.head_verified).length;

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
        <div className="p-5 border-b border-border"><h3 className="font-display font-semibold">Today's records</h3></div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No teachers have marked attendance yet today.</div>
        ) : (
          <div className="divide-y divide-border">
            {records.map((r) => {
              const p = profiles[r.teacher_user_id];
              return (
                <div key={r.id} className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-medium">{p?.full_name ?? "Teacher"}</div>
                    <div className="text-xs text-muted-foreground">{p?.designation ?? "—"}</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-muted-foreground text-xs">Arrival</div>
                    <div>{r.arrival_time ? new Date(r.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-muted-foreground text-xs">Departure</div>
                    <div>{r.departure_time ? new Date(r.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                  </div>
                  <div>{r.arrival_status && <StatusBadge status={r.arrival_status} />}</div>
                  {r.head_verified ? (
                    <Badge className="bg-success/15 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                  ) : (
                    <Button size="sm" onClick={() => verify(r.id)} className="bg-gradient-primary hover:opacity-90">Verify</Button>
                  )}
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
  const [stats, setStats] = useState({ schools: 0, teachers: 0, students: 0, present: 0, late: 0, absent: 0 });
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const dateStr = new Date().toISOString().slice(0, 10);
      const [{ count: schools }, { count: teachers }, { count: students }, { data: att }] = await Promise.all([
        supabase.from("schools").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("teacher_attendance").select("*").eq("attendance_date", dateStr).order("arrival_time", { ascending: false }).limit(20),
      ]);
      const present = att?.filter((r: any) => r.arrival_time).length ?? 0;
      const late = att?.filter((r: any) => r.arrival_status === "late").length ?? 0;
      setStats({
        schools: schools ?? 0,
        teachers: teachers ?? 0,
        students: students ?? 0,
        present,
        late,
        absent: (teachers ?? 0) - present,
      });
      setFeed(att ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          Welcome, {profile?.full_name?.split(" ")[0] ?? "Administrator"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">EdoSUBEB statewide administration · {new Date().toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={School} label="Schools" value={stats.schools} />
        <StatCard icon={Users} label="Teachers" value={stats.teachers} />
        <StatCard icon={GraduationIcon} label="Students" value={stats.students} />
        <StatCard icon={UserCheck} label="Present today" value={stats.present} tone="success" />
        <StatCard icon={Clock} label="Late today" value={stats.late} tone="warning" />
        <StatCard icon={AlertCircle} label="Absent today" value={Math.max(0, stats.absent)} tone="destructive" />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-display font-semibold">Real-time activity</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : feed.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No attendance activity yet today.</div>
        ) : (
          <div className="divide-y divide-border">
            {feed.map((r) => (
              <div key={r.id} className="p-4 flex flex-wrap items-center gap-3 text-sm">
                <MapPin className={`h-4 w-4 ${r.arrival_verified ? "text-success" : "text-destructive"}`} />
                <div className="flex-1">
                  <div className="font-medium">Teacher attendance</div>
                  <div className="text-xs text-muted-foreground">
                    {r.arrival_time ? `Arrived ${new Date(r.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                    {r.departure_time ? ` · Left ${new Date(r.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                  </div>
                </div>
                {r.arrival_status && <StatusBadge status={r.arrival_status} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
