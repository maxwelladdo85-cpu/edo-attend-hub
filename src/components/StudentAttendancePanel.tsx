import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, GraduationCap, Loader2, Sun, Sunset } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Mark = "present" | "late" | "absent";
type Session = "morning_status" | "afternoon_status";

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  class: string;
  gender: string | null;
}

interface AttendanceRow {
  student_id: string;
  morning_status: Mark | null;
  afternoon_status: Mark | null;
}

const MARKS: { value: Mark; label: string; cls: string }[] = [
  { value: "present", label: "Present", cls: "bg-success text-success-foreground hover:bg-success/90" },
  { value: "late", label: "Late", cls: "bg-gold text-gold-foreground hover:bg-gold/90" },
  { value: "absent", label: "Absent", cls: "bg-destructive text-destructive-foreground hover:bg-destructive/90" },
];

export function StudentAttendancePanel() {
  const { user, profile } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<Record<string, AttendanceRow>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const dateStr = format(date, "yyyy-MM-dd");

  useEffect(() => {
    const load = async () => {
      if (!profile?.school_id || !profile?.class_taught) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const [{ data: st }, { data: att }] = await Promise.all([
        supabase
          .from("students")
          .select("*")
          .eq("school_id", profile.school_id)
          .eq("class", profile.class_taught)
          .order("student_id", { ascending: true }),
        supabase
          .from("student_attendance")
          .select("student_id, morning_status, afternoon_status")
          .eq("school_id", profile.school_id)
          .eq("attendance_date", dateStr),
      ]);
      setStudents(st ?? []);
      const map: Record<string, AttendanceRow> = {};
      (att ?? []).forEach((r: any) => { map[r.student_id] = r; });
      setRows(map);
      setLoading(false);
    };
    load();
  }, [profile?.school_id, profile?.class_taught, dateStr]);

  const mark = async (student: Student, session: Session, value: Mark) => {
    if (!user || !profile?.school_id) return;
    const key = `${student.id}-${session}`;
    setSavingKey(key);
    try {
      const existing = rows[student.id];
      const payload = {
        student_id: student.id,
        school_id: profile.school_id,
        attendance_date: dateStr,
        morning_status: session === "morning_status" ? value : existing?.morning_status ?? null,
        afternoon_status: session === "afternoon_status" ? value : existing?.afternoon_status ?? null,
        marked_by: user.id,
      };
      const { error } = await supabase
        .from("student_attendance")
        .upsert([payload], { onConflict: "student_id,attendance_date" });
      if (error) throw error;
      setRows((prev) => ({
        ...prev,
        [student.id]: { ...(prev[student.id] ?? { student_id: student.id, morning_status: null, afternoon_status: null }), [session]: value },
      }));
    } catch (e: any) {
      toast.error(e.message ?? "Could not save attendance");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <h3 className="font-display font-semibold">
            Student attendance {profile?.class_taught ? `· ${profile.class_taught}` : ""}
          </h3>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(date, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              disabled={(d) => d > new Date()}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {!profile?.class_taught ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Class not assigned yet.</div>
      ) : loading ? (
        <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
      ) : students.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">No students in your class yet.</div>
      ) : (
        <div className="divide-y divide-border">
          {students.map((s) => {
            const row = rows[s.id];
            return (
              <div key={s.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center font-mono text-xs font-semibold text-primary">
                  {s.student_id}
                </div>
                <div className="flex-1 min-w-[140px]">
                  <div className="font-medium truncate">{s.full_name}</div>
                  <div className="text-xs text-muted-foreground">{s.class}{s.gender ? ` · ${s.gender}` : ""}</div>
                </div>
                <SessionPicker icon={Sun} label="Morning" current={row?.morning_status ?? null}
                  saving={savingKey?.startsWith(`${s.id}-morning_status`) ?? false}
                  onPick={(v) => mark(s, "morning_status", v)} />
                <SessionPicker icon={Sunset} label="Afternoon" current={row?.afternoon_status ?? null}
                  saving={savingKey?.startsWith(`${s.id}-afternoon_status`) ?? false}
                  onPick={(v) => mark(s, "afternoon_status", v)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SessionPicker({ icon: Icon, label, current, saving, onPick }: { icon: any; label: string; current: Mark | null; saving: boolean; onPick: (v: Mark) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        <Icon className="h-3 w-3" />{label}
      </div>
      <div className="flex gap-1">
        {MARKS.map((m) => {
          const active = current === m.value;
          return (
            <button
              key={m.value}
              disabled={saving}
              onClick={() => onPick(m.value)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md border border-border transition",
                active ? m.cls : "bg-background hover:bg-muted text-muted-foreground",
                saving && "opacity-50 cursor-not-allowed",
              )}
            >
              {m.label[0]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
