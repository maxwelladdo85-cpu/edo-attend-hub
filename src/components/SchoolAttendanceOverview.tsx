import { useEffect, useMemo, useState } from "react";
import { Loader2, Users, GraduationCap, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const dateStr = useMemo(() => toDateStr(selectedDate), [selectedDate]);
  const start = dateStr;
  const end = dateStr;


  const [reloadTick, setReloadTick] = useState(0);

  // Live-refresh when teacher_attendance or student_attendance changes server-side.
  useEffect(() => {
    if (!schoolId) return;
    const channel = supabase
      .channel(`school-attendance-${schoolId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_attendance", filter: `school_id=eq.${schoolId}` },
        () => setReloadTick((n) => n + 1),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teacher_attendance", filter: `school_id=eq.${schoolId}` },
        () => setReloadTick((n) => n + 1),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId]);

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
            rate: present > 0 ? 100 : 0,
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
          if (r.morning_status || r.afternoon_status) {
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
            rate: present > 0 ? 100 : 0,
          };
        }).sort((a: StudentRow, b: StudentRow) => a.full_name.localeCompare(b.full_name));
        if (!cancelled) setStudentRows(rows);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [mode, schoolId, start, end, isHead, teacherClass, reloadTick]);

  const isToday = dateStr === toDateStr(new Date());

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
          <p className="text-xs text-muted-foreground">
            {isToday ? "Today" : format(selectedDate, "EEEE, MMMM d, yyyy")} ({dateStr})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-2", !isToday && "border-primary text-primary")}>
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
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
                <TableHead>Marked</TableHead>
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
                    {t.presentDays > 0
                      ? <Badge className="bg-success/15 text-success hover:bg-success/15 border-success/30">Present</Badge>
                      : <Badge variant="outline" className="text-muted-foreground">Not marked</Badge>}
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
                <TableHead>Marked</TableHead>
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
                    {s.presentDays > 0
                      ? <Badge className="bg-success/15 text-success hover:bg-success/15 border-success/30">Marked</Badge>
                      : <Badge variant="outline" className="text-muted-foreground">Not marked</Badge>}
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
