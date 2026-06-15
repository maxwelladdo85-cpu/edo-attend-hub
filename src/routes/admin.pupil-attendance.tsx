import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Search, Loader2, Check, GraduationCap, UserCheck, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  useSchools,
  useStaffProfiles,
  prettyLga,
  prettyCategory,
  type StaffProfile,
  type SchoolLite,
} from "@/lib/admin-data";

export const Route = createFileRoute("/admin/pupil-attendance")({
  head: () => ({ meta: [{ title: "Attendance (Deep Dive) — EdoSUBEB" }] }),
  component: AttendanceDeepDivePage,
});

type RoleFilter = "student" | "teacher" | "head_teacher";

type Student = {
  id: string;
  student_id: string;
  full_name: string;
  class: string;
  school_id: string;
};

type StudentAttRow = {
  id: string;
  student_id: string;
  school_id: string;
  attendance_date: string;
  morning_status: string | null;
  afternoon_status: string | null;
  morning_marked_at: string | null;
  afternoon_marked_at: string | null;
};

type StaffAttRow = {
  id: string;
  teacher_user_id: string;
  school_id: string | null;
  attendance_date: string;
  arrival_time: string | null;
  arrival_status: string | null;
  departure_time: string | null;
  departure_status: string | null;
  head_verified: boolean;
};

const ALL = "__all__";
const EMPTY_STUDENTS: Student[] = [];
const EMPTY_STUDENT_ATT: StudentAttRow[] = [];
const EMPTY_STAFF_ATT: StaffAttRow[] = [];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function timeToIso(date: string, time: string): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function isoToTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isoToDisplay(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// --------- Data hooks ----------

function useStudentsForSchools(schoolIds: string[]) {
  return useQuery({
    queryKey: ["admin", "deep-dive", "students", schoolIds.slice().sort().join(",")],
    enabled: schoolIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id,student_id,full_name,class,school_id")
        .in("school_id", schoolIds)
        .order("class")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Student[];
    },
  });
}

function useStudentAttendanceForSchools(schoolIds: string[], date: string) {
  return useQuery({
    queryKey: ["admin", "deep-dive", "student-att", schoolIds.slice().sort().join(","), date],
    enabled: schoolIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_attendance")
        .select(
          "id,student_id,school_id,attendance_date,morning_status,afternoon_status,morning_marked_at,afternoon_marked_at",
        )
        .in("school_id", schoolIds)
        .eq("attendance_date", date);
      if (error) throw error;
      return (data ?? []) as StudentAttRow[];
    },
  });
}

function useStaffAttendanceForDate(userIds: string[], date: string) {
  return useQuery({
    queryKey: ["admin", "deep-dive", "staff-att", userIds.slice().sort().join(","), date],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_attendance")
        .select(
          "id,teacher_user_id,school_id,attendance_date,arrival_time,arrival_status,departure_time,departure_status,head_verified",
        )
        .in("teacher_user_id", userIds)
        .eq("attendance_date", date);
      if (error) throw error;
      return (data ?? []) as StaffAttRow[];
    },
  });
}

// --------- Page ----------

type Draft = { arrival: string; departure: string };

function AttendanceDeepDivePage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: schools = [] } = useSchools();
  const { data: staff = [] } = useStaffProfiles();

  const [role, setRole] = useState<RoleFilter>("student");
  const [lga, setLga] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(ALL);
  const [schoolId, setSchoolId] = useState<string>(ALL);
  const [date, setDate] = useState(todayStr());
  const [q, setQ] = useState("");

  // Reset dependent selects when parent changes
  useEffect(() => { setSchoolId(ALL); }, [lga, category]);

  const lgas = useMemo(() => {
    const s = new Set<string>();
    for (const sch of schools) if (sch.lga) s.add(sch.lga);
    return Array.from(s).sort();
  }, [schools]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const sch of schools) if (sch.category) s.add(sch.category);
    return Array.from(s).sort();
  }, [schools]);

  const filteredSchools = useMemo<SchoolLite[]>(() => {
    return schools
      .filter((s) => (lga === ALL ? true : s.lga === lga))
      .filter((s) => (category === ALL ? true : s.category === category))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [schools, lga, category]);

  // Require a narrower scope before querying (avoid loading all pupils across 1998 schools).
  const scopeReady = schoolId !== ALL || lga !== ALL || category !== ALL;
  const targetSchoolIds = useMemo(() => {
    if (!scopeReady) return [];
    if (schoolId !== ALL) return [schoolId];
    return filteredSchools.map((s) => s.id);
  }, [scopeReady, schoolId, filteredSchools]);

  // --------- Student path ---------
  const { data: studentsData, isLoading: loadingStudents } = useStudentsForSchools(
    role === "student" ? targetSchoolIds : [],
  );
  const { data: studentAttData, isLoading: loadingStudentAtt } = useStudentAttendanceForSchools(
    role === "student" ? targetSchoolIds : [],
    date,
  );
  const students = studentsData ?? EMPTY_STUDENTS;
  const studentAtt = studentAttData ?? EMPTY_STUDENT_ATT;

  const studentAttByPupil = useMemo(() => {
    const m = new Map<string, StudentAttRow>();
    for (const r of studentAtt) m.set(r.student_id, r);
    return m;
  }, [studentAtt]);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (role !== "student") return;
    const next: Record<string, Draft> = {};
    for (const s of students) {
      const row = studentAttByPupil.get(s.id);
      next[s.id] = {
        arrival: isoToTime(row?.morning_marked_at ?? null),
        departure: isoToTime(row?.afternoon_marked_at ?? null),
      };
    }
    setDrafts(next);
  }, [role, students, studentAttByPupil]);

  // --------- Staff path ---------
  const staffFiltered = useMemo<StaffProfile[]>(() => {
    if (role === "student") return [];
    return staff
      .filter((p) => p.role === role)
      .filter((p) => (targetSchoolIds.length === 0 ? false : p.school_id ? targetSchoolIds.includes(p.school_id) : false))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [staff, role, targetSchoolIds]);

  const staffUserIds = useMemo(() => staffFiltered.map((s) => s.user_id), [staffFiltered]);
  const { data: staffAttData, isLoading: loadingStaffAtt } = useStaffAttendanceForDate(
    role === "student" ? [] : staffUserIds,
    date,
  );
  const staffAtt = staffAttData ?? EMPTY_STAFF_ATT;

  const staffAttByUser = useMemo(() => {
    const m = new Map<string, StaffAttRow>();
    for (const r of staffAtt) {
      const existing = m.get(r.teacher_user_id);
      if (!existing || (!existing.arrival_time && r.arrival_time)) m.set(r.teacher_user_id, r);
    }
    return m;
  }, [staffAtt]);

  // --------- Search & helpers ---------
  const schoolNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of schools) m.set(s.id, s.name);
    return m;
  }, [schools]);

  const setField = (studentRowId: string, field: keyof Draft, val: string) => {
    setDrafts((prev) => ({ ...prev, [studentRowId]: { ...prev[studentRowId], [field]: val } }));
  };

  const saveStudent = async (s: Student) => {
    const draft = drafts[s.id];
    if (!draft) return;
    setSavingId(s.id);
    try {
      const morningIso = timeToIso(date, draft.arrival);
      const afternoonIso = timeToIso(date, draft.departure);
      const payload: Record<string, unknown> = {
        student_id: s.id,
        school_id: s.school_id,
        attendance_date: date,
        morning_marked_at: morningIso,
        afternoon_marked_at: afternoonIso,
        morning_status: morningIso ? "present" : null,
        afternoon_status: afternoonIso ? "present" : null,
        marked_by: profile?.user_id ?? null,
      };
      const { error } = await supabase
        .from("student_attendance")
        .upsert(payload, { onConflict: "student_id,attendance_date" });
      if (error) throw error;
      toast.success(`Saved ${s.full_name}`);
      qc.invalidateQueries({ queryKey: ["admin", "deep-dive", "student-att"] });
      qc.invalidateQueries({ queryKey: ["admin", "student-attendance"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingId(null);
    }
  };

  // --------- Filtered display ---------
  const filteredStudents = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) =>
      [s.full_name, s.student_id, s.class].some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [students, q]);

  const filteredStaff = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return staffFiltered;
    return staffFiltered.filter((p) =>
      [p.full_name, p.teacher_id ?? "", p.class_taught ?? ""].some((v) =>
        String(v).toLowerCase().includes(term),
      ),
    );
  }, [staffFiltered, q]);

  const totalCount = role === "student" ? students.length : staffFiltered.length;
  const loading =
    role === "student" ? loadingStudents || loadingStudentAtt : loadingStaffAtt;

  return (
    <div>
      <AdminPageHeader
        title="Attendance (Deep Dive)"
        subtitle="Drill into attendance by role and by school, with full control"
        icon={Clock}
      />

      {/* Section 1: Role */}
      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Section 1 · Who
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { v: "head_teacher", label: "Head Teachers", Icon: UserCheck },
            { v: "teacher", label: "Teachers", Icon: Users },
            { v: "student", label: "Students", Icon: GraduationCap },
          ] as const).map(({ v, label, Icon }) => {
            const active = role === v;
            return (
              <button
                key={v}
                onClick={() => setRole(v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-card"
                    : "border-border hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Where */}
      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Section 2 · Where
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">LGA</label>
            <Select value={lga} onValueChange={setLga}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-[320px]">
                <SelectItem value={ALL}>All LGAs</SelectItem>
                {lgas.map((l) => <SelectItem key={l} value={l}>{prettyLga(l)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">School Type</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Types</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{prettyCategory(c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">School Name</label>
            <Select value={schoolId} onValueChange={setSchoolId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-[320px]">
                <SelectItem value={ALL}>All Schools ({filteredSchools.length})</SelectItem>
                {filteredSchools.slice(0, 300).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
                {filteredSchools.length > 300 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Showing first 300. Narrow by LGA or School Type to see more.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Date</label>
            <Input
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value || todayStr())}
            />
          </div>
        </div>
      </div>

      {/* Search + counts */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={role === "student" ? "Name, student ID, or class" : "Name, teacher ID, or class"}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{totalCount.toLocaleString()} {role === "student" ? "pupils" : role === "teacher" ? "teachers" : "head teachers"}</Badge>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          {role === "student" ? (
            <table className="w-full text-sm min-w-[820px]">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Pupil</th>
                  <th className="text-left px-4 py-3">Student ID</th>
                  <th className="text-left px-4 py-3">Class</th>
                  <th className="text-left px-4 py-3">School</th>
                  <th className="text-left px-4 py-3">Arrival</th>
                  <th className="text-left px-4 py-3">Departure</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {!scopeReady && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Select an LGA, School Type, or School to load pupils.</td></tr>
                )}
                {scopeReady && loading && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {scopeReady && !loading && filteredStudents.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No pupils found.</td></tr>
                )}
                {filteredStudents.map((s) => {
                  const d = drafts[s.id] ?? { arrival: "", departure: "" };
                  return (
                    <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{s.full_name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{s.student_id}</td>
                      <td className="px-4 py-3">{s.class}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{schoolNameById.get(s.school_id) ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Input type="time" value={d.arrival} onChange={(e) => setField(s.id, "arrival", e.target.value)} className="h-9 w-28" />
                      </td>
                      <td className="px-4 py-3">
                        <Input type="time" value={d.departure} onChange={(e) => setField(s.id, "departure", e.target.value)} className="h-9 w-28" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" onClick={() => saveStudent(s)} disabled={savingId === s.id}>
                          {savingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-1" /> Save</>}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm min-w-[820px]">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Teacher ID</th>
                  <th className="text-left px-4 py-3">Class</th>
                  <th className="text-left px-4 py-3">School</th>
                  <th className="text-left px-4 py-3">Arrival</th>
                  <th className="text-left px-4 py-3">Departure</th>
                  <th className="text-left px-4 py-3">Verified</th>
                </tr>
              </thead>
              <tbody>
                {!scopeReady && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Select an LGA, School Type, or School to load staff.</td></tr>
                )}
                {scopeReady && loading && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {scopeReady && !loading && filteredStaff.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No {role === "teacher" ? "teachers" : "head teachers"} found.</td></tr>
                )}
                {filteredStaff.map((p) => {
                  const row = staffAttByUser.get(p.user_id);
                  const status = row?.arrival_status;
                  return (
                    <tr key={p.user_id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{p.full_name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{p.teacher_id ?? "—"}</td>
                      <td className="px-4 py-3">{p.class_taught ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{p.school_id ? schoolNameById.get(p.school_id) ?? "—" : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{isoToDisplay(row?.arrival_time ?? null)}</span>
                          {status && (
                            <Badge variant={status === "late" ? "destructive" : status === "present" ? "secondary" : "outline"} className="capitalize text-[10px]">
                              {status}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{isoToDisplay(row?.departure_time ?? null)}</td>
                      <td className="px-4 py-3">
                        {row?.head_verified ? (
                          <Badge variant="secondary" className="text-[10px]">Verified</Badge>
                        ) : row ? (
                          <Badge variant="outline" className="text-[10px]">Unverified</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No record</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
