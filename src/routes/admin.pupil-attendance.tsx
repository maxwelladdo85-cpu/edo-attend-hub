import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Search, Save, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { useSchools, prettyLga, prettyCategory } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/pupil-attendance")({
  head: () => ({ meta: [{ title: "Pupil Attendance — EdoSUBEB" }] }),
  component: PupilAttendancePage,
});

type Student = {
  id: string;
  student_id: string;
  full_name: string;
  class: string;
  school_id: string;
};

type AttRow = {
  id: string;
  student_id: string;
  school_id: string;
  attendance_date: string;
  morning_status: string | null;
  afternoon_status: string | null;
  morning_marked_at: string | null;
  afternoon_marked_at: string | null;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Turn "HH:MM" + a date into an ISO timestamp (local time).
function timeToIso(date: string, time: string): string | null {
  if (!time) return null;
  // Build a local Date so the user sees the time they typed.
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

function useStudentsForSchool(schoolId: string | null) {
  return useQuery({
    queryKey: ["admin", "pupil-att", "students", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id,student_id,full_name,class,school_id")
        .eq("school_id", schoolId!)
        .order("class")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Student[];
    },
  });
}

function useAttendanceForSchool(schoolId: string | null, date: string) {
  return useQuery({
    queryKey: ["admin", "pupil-att", "rows", schoolId, date],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_attendance")
        .select(
          "id,student_id,school_id,attendance_date,morning_status,afternoon_status,morning_marked_at,afternoon_marked_at",
        )
        .eq("school_id", schoolId!)
        .eq("attendance_date", date);
      if (error) throw error;
      return (data ?? []) as AttRow[];
    },
  });
}

type Draft = { arrival: string; departure: string };

function PupilAttendancePage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: schools = [] } = useSchools();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [date, setDate] = useState(todayStr());
  const [q, setQ] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const sortedSchools = useMemo(
    () => [...schools].sort((a, b) => a.name.localeCompare(b.name)),
    [schools],
  );

  // Auto-pick the first school once schools load.
  useEffect(() => {
    if (!schoolId && sortedSchools.length > 0) setSchoolId(sortedSchools[0].id);
  }, [schoolId, sortedSchools]);

  const { data: students = [], isLoading: loadingStudents } = useStudentsForSchool(schoolId);
  const { data: attRows = [], isLoading: loadingAtt } = useAttendanceForSchool(schoolId, date);

  const attByStudent = useMemo(() => {
    const m = new Map<string, AttRow>();
    for (const r of attRows) m.set(r.student_id, r);
    return m;
  }, [attRows]);

  // Hydrate drafts when data changes.
  useEffect(() => {
    const next: Record<string, Draft> = {};
    for (const s of students) {
      const row = attByStudent.get(s.id);
      next[s.id] = {
        arrival: isoToTime(row?.morning_marked_at ?? null),
        departure: isoToTime(row?.afternoon_marked_at ?? null),
      };
    }
    setDrafts(next);
  }, [students, attByStudent]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) =>
      [s.full_name, s.student_id, s.class].some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [students, q]);

  const setField = (studentId: string, field: keyof Draft, val: string) => {
    setDrafts((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [field]: val } }));
  };

  const saveStudent = async (s: Student) => {
    if (!schoolId) return;
    const draft = drafts[s.id];
    if (!draft) return;
    setSavingId(s.id);
    try {
      const morningIso = timeToIso(date, draft.arrival);
      const afternoonIso = timeToIso(date, draft.departure);

      const payload: Record<string, unknown> = {
        student_id: s.id,
        school_id: schoolId,
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
      qc.invalidateQueries({ queryKey: ["admin", "pupil-att", "rows", schoolId, date] });
      qc.invalidateQueries({ queryKey: ["admin", "student-attendance"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSavingId(null);
    }
  };

  const selectedSchool = sortedSchools.find((s) => s.id === schoolId);

  return (
    <div>
      <AdminPageHeader
        title="Pupil Attendance"
        subtitle="Manually set each pupil's arrival (morning) and departure (afternoon) times"
        icon={Clock}
      />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="min-w-[260px]">
          <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1">
            School
          </label>
          <Select value={schoolId ?? ""} onValueChange={(v) => setSchoolId(v)}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select school" />
            </SelectTrigger>
            <SelectContent className="max-h-[320px]">
              {sortedSchools.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} <span className="text-muted-foreground">· {prettyLga(s.lga)}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Date
          </label>
          <Input
            type="date"
            value={date}
            min="2026-01-01"
            max={todayStr()}
            onChange={(e) => setDate(e.target.value || todayStr())}
            className="w-44"
          />
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Search pupil
          </label>
          <Search className="h-4 w-4 absolute left-3 top-[34px] text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, student ID, or class"
            className="pl-9"
          />
        </div>
      </div>

      {selectedSchool && (
        <div className="mb-3 text-xs text-muted-foreground">
          {selectedSchool.name} · {prettyLga(selectedSchool.lga)} ·{" "}
          {prettyCategory(selectedSchool.category)} · {students.length.toLocaleString()} pupils
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Pupil</th>
                <th className="text-left px-4 py-3">Student ID</th>
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Arrival (morning)</th>
                <th className="text-left px-4 py-3">Departure (afternoon)</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {(loadingStudents || loadingAtt) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!loadingStudents && !loadingAtt && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No pupils found.
                  </td>
                </tr>
              )}
              {filtered.map((s) => {
                const d = drafts[s.id] ?? { arrival: "", departure: "" };
                return (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.student_id}</td>
                    <td className="px-4 py-3">{s.class}</td>
                    <td className="px-4 py-3">
                      <Input
                        type="time"
                        value={d.arrival}
                        onChange={(e) => setField(s.id, "arrival", e.target.value)}
                        className="h-9 w-32"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="time"
                        value={d.departure}
                        onChange={(e) => setField(s.id, "departure", e.target.value)}
                        className="h-9 w-32"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => saveStudent(s)}
                        disabled={savingId === s.id}
                      >
                        {savingId === s.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5 mr-1" /> Save
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
