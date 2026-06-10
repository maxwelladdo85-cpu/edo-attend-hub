import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ExportButton, type ExportColumn } from "@/components/ExportButton";
import { useSchools, prettyLga, prettyCategory } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Attendance Reports — EdoSAS" }] }),
  component: ReportsPage,
});

// Platform launch — earliest selectable date.
const PLATFORM_START = "2026-01-01";
const todayStr = () => new Date().toISOString().slice(0, 10);

type Mode = "teacher" | "pupil";

type TeacherRow = {
  attendance_date: string;
  school_id: string | null;
  teacher_user_id: string;
  arrival_time: string | null;
  arrival_status: string | null;
  departure_time: string | null;
  departure_status: string | null;
  head_verified: boolean;
};

type PupilRow = {
  attendance_date: string;
  school_id: string;
  student_id: string;
  morning_status: string | null;
  afternoon_status: string | null;
  morning_marked_at: string | null;
  afternoon_marked_at: string | null;
};

async function pageAll<T>(
  build: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
) {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

function useTeacherReport(start: string, end: string, enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ["admin", "report", "teacher", start, end],
    queryFn: async () => {
      const rows = await pageAll<TeacherRow>(async (from, to) => {
        const { data, error } = await supabase
          .from("teacher_attendance")
          .select(
            "attendance_date,school_id,teacher_user_id,arrival_time,arrival_status,departure_time,departure_status,head_verified",
          )
          .gte("attendance_date", start)
          .lte("attendance_date", end)
          .order("attendance_date", { ascending: false })
          .range(from, to);
        return { data: data as TeacherRow[] | null, error };
      });
      const ids = Array.from(new Set(rows.map((r) => r.teacher_user_id)));
      const profiles = ids.length
        ? (
            await supabase
              .from("profiles")
              .select("user_id,full_name,teacher_id")
              .in("user_id", ids)
          ).data ?? []
        : [];
      const byId = new Map(profiles.map((p: any) => [p.user_id, p]));
      return rows.map((r) => ({ ...r, profile: byId.get(r.teacher_user_id) as any }));
    },
  });
}

function usePupilReport(start: string, end: string, enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ["admin", "report", "pupil", start, end],
    queryFn: async () => {
      const rows = await pageAll<PupilRow>(async (from, to) => {
        const { data, error } = await supabase
          .from("student_attendance")
          .select(
            "attendance_date,school_id,student_id,morning_status,afternoon_status,morning_marked_at,afternoon_marked_at",
          )
          .gte("attendance_date", start)
          .lte("attendance_date", end)
          .order("attendance_date", { ascending: false })
          .range(from, to);
        return { data: data as PupilRow[] | null, error };
      });
      const ids = Array.from(new Set(rows.map((r) => r.student_id)));
      const students = ids.length
        ? (
            await supabase
              .from("students")
              .select("id,full_name,student_id,class")
              .in("id", ids)
          ).data ?? []
        : [];
      const byId = new Map(students.map((s: any) => [s.id, s]));
      return rows.map((r) => ({ ...r, student: byId.get(r.student_id) as any }));
    },
  });
}

function fmtTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ReportsPage() {
  const [mode, setMode] = useState<Mode>("teacher");
  const [start, setStart] = useState<string>(PLATFORM_START);
  const [end, setEnd] = useState<string>(todayStr());
  const [lga, setLga] = useState<string>("all");
  const [schoolType, setSchoolType] = useState<string>("all");
  const [schoolId, setSchoolId] = useState<string>("all");

  const { data: schools = [] } = useSchools();

  const lgaOptions = useMemo(
    () => Array.from(new Set(schools.map((s) => s.lga))).sort(),
    [schools],
  );
  const typeOptions = useMemo(
    () => Array.from(new Set(schools.map((s) => s.category).filter(Boolean) as string[])).sort(),
    [schools],
  );
  const filteredSchools = useMemo(
    () =>
      schools.filter(
        (s) =>
          (lga === "all" || s.lga === lga) &&
          (schoolType === "all" || s.category === schoolType),
      ),
    [schools, lga, schoolType],
  );
  const schoolIdSet = useMemo(() => new Set(filteredSchools.map((s) => s.id)), [filteredSchools]);
  const schoolNameById = useMemo(
    () => new Map(schools.map((s) => [s.id, s])),
    [schools],
  );

  const validRange = start >= PLATFORM_START && end >= start;

  const teacherQ = useTeacherReport(start, end, validRange && mode === "teacher");
  const pupilQ = usePupilReport(start, end, validRange && mode === "pupil");

  const teacherRows = useMemo(() => {
    const rows = teacherQ.data ?? [];
    return rows.filter(
      (r) =>
        (schoolId !== "all" ? r.school_id === schoolId : true) &&
        (r.school_id ? schoolIdSet.has(r.school_id) : false),
    );
  }, [teacherQ.data, schoolId, schoolIdSet]);

  const pupilRows = useMemo(() => {
    const rows = pupilQ.data ?? [];
    return rows.filter(
      (r) =>
        (schoolId !== "all" ? r.school_id === schoolId : true) &&
        schoolIdSet.has(r.school_id),
    );
  }, [pupilQ.data, schoolId, schoolIdSet]);

  const teacherColumns: ExportColumn<(typeof teacherRows)[number]>[] = [
    { header: "Date", accessor: (r) => r.attendance_date },
    { header: "Teacher", accessor: (r) => r.profile?.full_name ?? "" },
    { header: "Teacher ID", accessor: (r) => r.profile?.teacher_id ?? "" },
    {
      header: "School",
      accessor: (r) => (r.school_id ? schoolNameById.get(r.school_id)?.name ?? "" : ""),
    },
    {
      header: "LGA",
      accessor: (r) =>
        r.school_id ? prettyLga(schoolNameById.get(r.school_id)?.lga ?? "") : "",
    },
    {
      header: "School Type",
      accessor: (r) =>
        r.school_id ? prettyCategory(schoolNameById.get(r.school_id)?.category ?? null) : "",
    },
    { header: "Arrival", accessor: (r) => fmtTime(r.arrival_time) },
    { header: "Arrival Status", accessor: (r) => r.arrival_status ?? "" },
    { header: "Departure", accessor: (r) => fmtTime(r.departure_time) },
    { header: "Departure Status", accessor: (r) => r.departure_status ?? "" },
    { header: "Head Verified", accessor: (r) => (r.head_verified ? "Yes" : "No") },
  ];

  const pupilColumns: ExportColumn<(typeof pupilRows)[number]>[] = [
    { header: "Date", accessor: (r) => r.attendance_date },
    { header: "Pupil", accessor: (r) => r.student?.full_name ?? "" },
    { header: "Pupil ID", accessor: (r) => r.student?.student_id ?? "" },
    { header: "Class", accessor: (r) => r.student?.class ?? "" },
    { header: "School", accessor: (r) => schoolNameById.get(r.school_id)?.name ?? "" },
    {
      header: "LGA",
      accessor: (r) => prettyLga(schoolNameById.get(r.school_id)?.lga ?? ""),
    },
    {
      header: "School Type",
      accessor: (r) => prettyCategory(schoolNameById.get(r.school_id)?.category ?? null),
    },
    { header: "Morning Status", accessor: (r) => r.morning_status ?? "" },
    { header: "Morning Time", accessor: (r) => fmtTime(r.morning_marked_at) },
    { header: "Afternoon Status", accessor: (r) => r.afternoon_status ?? "" },
    { header: "Afternoon Time", accessor: (r) => fmtTime(r.afternoon_marked_at) },
  ];

  const loading = mode === "teacher" ? teacherQ.isLoading : pupilQ.isLoading;
  const error = mode === "teacher" ? teacherQ.error : pupilQ.error;
  const rowCount = mode === "teacher" ? teacherRows.length : pupilRows.length;

  const fileBase = `edosas-${mode}-attendance-${start}_to_${end}`;
  const reportTitle = `${mode === "teacher" ? "Teacher" : "Pupil"} Attendance — ${start} to ${end}`;

  return (
    <div>
      <AdminPageHeader
        title="Attendance Reports"
        subtitle="Download attendance records as CSV, Excel, or PDF"
        icon={FileDown}
        actions={
          mode === "teacher" ? (
            <ExportButton
              filename={fileBase}
              title={reportTitle}
              columns={teacherColumns}
              rows={teacherRows}
              disabled={loading}
            />
          ) : (
            <ExportButton
              filename={fileBase}
              title={reportTitle}
              columns={pupilColumns}
              rows={pupilRows}
              disabled={loading}
            />
          )
        }
      />

      <div className="rounded-2xl border border-border bg-head-teacher-card shadow-card p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Record type</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teacher">Teachers</SelectItem>
                <SelectItem value="pupil">Pupils</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              min={PLATFORM_START}
              max={end}
              value={start}
              onChange={(e) => setStart(e.target.value || PLATFORM_START)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              min={start}
              max={todayStr()}
              value={end}
              onChange={(e) => setEnd(e.target.value || todayStr())}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">LGA</Label>
            <Select
              value={lga}
              onValueChange={(v) => {
                setLga(v);
                setSchoolId("all");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All LGAs</SelectItem>
                {lgaOptions.map((l) => (
                  <SelectItem key={l} value={l}>
                    {prettyLga(l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">School type</Label>
            <Select
              value={schoolType}
              onValueChange={(v) => {
                setSchoolType(v);
                setSchoolId("all");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {typeOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {prettyCategory(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">School</Label>
            <Select value={schoolId} onValueChange={setSchoolId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All schools</SelectItem>
                {filteredSchools
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            {!validRange ? (
              <span className="text-destructive">
                Select a valid range (from {PLATFORM_START} onwards).
              </span>
            ) : loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading records…
              </span>
            ) : error ? (
              <span className="text-destructive">Failed to load records.</span>
            ) : (
              <span>
                {rowCount.toLocaleString()} record{rowCount === 1 ? "" : "s"} ready to export.
              </span>
            )}
          </div>
          <div className="text-xs">Earliest available date: {PLATFORM_START}</div>
        </div>
      </div>
    </div>
  );
}
