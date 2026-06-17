import { useEffect, useMemo, useState } from "react";
import { Loader2, Users, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function getMondayOfThisWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
}
function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Mode = "teachers" | "students";

type TeacherRow = {
  user_id: string;
  full_name: string | null;
  class_taught: string | null;
  rate: number;
  presentDays: number;
  status: "early" | "on_time" | "late" | "—";
};
type StudentRow = {
  id: string;
  full_name: string;
  class: string;
  rate: number;
  presentDays: number;
};

export function SchoolAttendanceOverview() {
  const { profile, roles } = useAuth();
  const schoolId = profile?.school_id;
  const isHead = roles.includes("head_teacher") || roles.includes("admin");
  const teacherClass = profile?.class_taught ?? null;
  const [mode, setMode] = useState<Mode>(isHead ? "teachers" : "students");
  const [loading, setLoading] = useState(false);
  const [teacherRows, setTeacherRows] = useState<TeacherRow[]>([]);
  const [studentRows, setStudentRows] = useState<StudentRow[]>([]);

  const today = useMemo(() => toDateStr(new Date()), []);
  const start = today;
  const end = today;


  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (mode === "teachers") {
        // teacher ids in school
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "teacher");
        const teacherIds = (roleRows ?? []).map((r: any) => r.user_id);
        if (teacherIds.length === 0) {
          if (!cancelled) { setTeacherRows([]); setLoading(false); }
          return;
        }
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, class_taught, school_id")
          .eq("school_id", schoolId)
          .in("user_id", teacherIds);
        const schoolTeacherIds = (profs ?? []).map((p: any) => p.user_id);
        const { data: att } = await supabase
          .from("teacher_attendance")
          .select("teacher_user_id, attendance_date, arrival_time, arrival_status")
          .in("teacher_user_id", schoolTeacherIds.length ? schoolTeacherIds : ["00000000-0000-0000-0000-000000000000"])
          .gte("attendance_date", start)
          .lte("attendance_date", end);

        const byTeacher: Record<string, any[]> = {};
        (att ?? []).forEach((r: any) => {
          (byTeacher[r.teacher_user_id] ||= []).push(r);
        });
        const rows: TeacherRow[] = (profs ?? []).map((p: any) => {
          const recs = byTeacher[p.user_id] ?? [];
          const present = recs.filter((r) => r.arrival_time).length;
          const counts: Record<string, number> = { early: 0, on_time: 0, late: 0 };
          recs.forEach((r) => { if (r.arrival_status) counts[r.arrival_status] = (counts[r.arrival_status] ?? 0) + 1; });
          let status: TeacherRow["status"] = "—";
          const total = counts.early + counts.on_time + counts.late;
          if (total > 0) {
            status = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as TeacherRow["status"];
          }
          return {
            user_id: p.user_id,
            full_name: p.full_name,
            class_taught: p.class_taught,
            rate: Math.round((present / 5) * 100),
            presentDays: present,
            status,
          };
        }).sort((a: TeacherRow, b: TeacherRow) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
        if (!cancelled) setTeacherRows(rows);
      } else {
        let studQuery = supabase
          .from("students")
          .select("id, full_name, class")
          .eq("school_id", schoolId);
        if (!isHead && teacherClass) {
          studQuery = studQuery.eq("class", teacherClass);
        }
        const { data: studs } = await studQuery;
        const ids = (studs ?? []).map((s: any) => s.id);
        const { data: att } = await supabase
          .from("student_attendance")
          .select("student_id, attendance_date, morning_status, afternoon_status")
          .in("student_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
          .gte("attendance_date", start)
          .lte("attendance_date", end);
        const byStudent: Record<string, Set<string>> = {};
        (att ?? []).forEach((r: any) => {
          if (r.morning_status === "present" || r.afternoon_status === "present" || r.morning_status === "late" || r.afternoon_status === "late") {
            (byStudent[r.student_id] ||= new Set()).add(r.attendance_date);
          }
        });
        const rows: StudentRow[] = (studs ?? []).map((s: any) => {
          const present = byStudent[s.id]?.size ?? 0;
          return {
            id: s.id,
            full_name: s.full_name,
            class: s.class,
            presentDays: present,
            rate: Math.round((present / 5) * 100),
          };
        }).sort((a: StudentRow, b: StudentRow) => a.full_name.localeCompare(b.full_name));
        if (!cancelled) setStudentRows(rows);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [mode, schoolId, start, end, isHead, teacherClass]);

  const statusLabel = (s: TeacherRow["status"]) => {
    if (s === "early") return <Badge className="bg-success/15 text-success hover:bg-success/15 border-success/30">Early</Badge>;
    if (s === "on_time") return <Badge variant="secondary">On time</Badge>;
    if (s === "late") return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15 border-destructive/30">Late</Badge>;
    return <span className="text-muted-foreground text-xs">—</span>;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-lg">School attendance overview</h3>
          <p className="text-xs text-muted-foreground">This week ({start} – {end})</p>
        </div>
        <div className="flex gap-2">
          {isHead && (
            <Button
              variant={mode === "teachers" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("teachers")}
              className="gap-2"
            >
              <Users className="h-4 w-4" /> Teachers
            </Button>
          )}
          <Button
            variant={mode === "students" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("students")}
            className="gap-2"
          >
            <GraduationCap className="h-4 w-4" /> Students
            {!isHead && teacherClass ? ` · ${teacherClass}` : ""}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : mode === "teachers" ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher name</TableHead>
                <TableHead>Class taught</TableHead>
                <TableHead>Attendance rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teacherRows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No teachers found.</TableCell></TableRow>
              ) : teacherRows.map((t) => (
                <TableRow key={t.user_id}>
                  <TableCell className="font-medium">{t.full_name ?? "—"}</TableCell>
                  <TableCell>{t.class_taught ?? "—"}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-primary">{t.rate}%</span>
                    <span className="text-xs text-muted-foreground ml-2">({t.presentDays}/5)</span>
                  </TableCell>
                  <TableCell>{statusLabel(t.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Attendance rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentRows.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">No students found.</TableCell></TableRow>
              ) : studentRows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell>{s.class}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-primary">{s.rate}%</span>
                    <span className="text-xs text-muted-foreground ml-2">({s.presentDays}/5)</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
