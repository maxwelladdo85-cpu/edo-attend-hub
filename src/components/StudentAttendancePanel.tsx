import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, GraduationCap, Loader2, MapPin, Sun, Sunset } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, primaryRole } from "@/contexts/AuthContext";
import { getCurrentPosition } from "@/lib/geo";

type Mark = "present" | "late" | "absent";
type Session = "morning" | "afternoon";

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
  morning_marked_at: string | null;
  afternoon_marked_at: string | null;
  morning_lat: number | null;
  morning_lng: number | null;
  afternoon_lat: number | null;
  afternoon_lng: number | null;
}

const MARKS: { value: Mark; label: string; cls: string }[] = [
  { value: "present", label: "Present", cls: "bg-success text-success-foreground hover:bg-success/90" },
  { value: "late", label: "Late", cls: "bg-gold text-gold-foreground hover:bg-gold/90" },
  { value: "absent", label: "Absent", cls: "bg-destructive text-destructive-foreground hover:bg-destructive/90" },
];

export function StudentAttendancePanel() {
  const { user, profile, roles } = useAuth();
  const isHead = primaryRole(roles) === "head_teacher";
  const [date, setDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<Record<string, AttendanceRow>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string>("all");

  const dateStr = format(date, "yyyy-MM-dd");

  useEffect(() => {
    const load = async () => {
      if (!profile?.school_id) {
        setLoading(false);
        return;
      }
      // Teachers need a class assigned; head teachers see all classes in the school
      if (!isHead && !profile?.class_taught) {
        setLoading(false);
        return;
      }
      setLoading(true);
      let studentsQuery = supabase
        .from("students")
        .select("*")
        .eq("school_id", profile.school_id)
        .order("class", { ascending: true })
        .order("student_id", { ascending: true });
      if (!isHead) {
        studentsQuery = studentsQuery.eq("class", profile.class_taught!);
      }
      const [{ data: st }, { data: att }] = await Promise.all([
        studentsQuery,
        supabase
          .from("student_attendance")
          .select("*")
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
  }, [profile?.school_id, profile?.class_taught, dateStr, isHead]);

  const mark = async (student: Student, session: Session, value: Mark | null) => {
    if (!user || !profile?.school_id) return;
    const key = `${student.id}-${session}`;
    setSavingKey(key);
    try {
      const now = value ? new Date().toISOString() : null;

      // Best-effort location — does NOT block saving, only captured when marking present
      let lat: number | null = null;
      let lng: number | null = null;
      if (value) {
        try {
          const pos = await getCurrentPosition();
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // location unavailable — still save the mark
        }
      }

      const existing = rows[student.id];
      const isMorning = session === "morning";
      const payload = {
        student_id: student.id,
        school_id: profile.school_id,
        attendance_date: dateStr,
        morning_status: isMorning ? value : existing?.morning_status ?? null,
        afternoon_status: !isMorning ? value : existing?.afternoon_status ?? null,
        morning_marked_at: isMorning ? now : existing?.morning_marked_at ?? null,
        afternoon_marked_at: !isMorning ? now : existing?.afternoon_marked_at ?? null,
        morning_lat: isMorning ? lat : existing?.morning_lat ?? null,
        morning_lng: isMorning ? lng : existing?.morning_lng ?? null,
        afternoon_lat: !isMorning ? lat : existing?.afternoon_lat ?? null,
        afternoon_lng: !isMorning ? lng : existing?.afternoon_lng ?? null,
        marked_by: user.id,
      };
      const { error } = await supabase
        .from("student_attendance")
        .upsert([payload], { onConflict: "student_id,attendance_date" });
      if (error) throw error;

      setRows((prev) => ({
        ...prev,
        [student.id]: { ...(prev[student.id] ?? {} as AttendanceRow), ...payload },
      }));

      if (value && now) {
        const timeLabel = new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        toast.success(`${student.full_name.split(" ")[0]} · ${session} marked at ${timeLabel}${lat !== null ? " · location captured" : ""}`);
      } else {
        toast.success(`${student.full_name.split(" ")[0]} · ${session} cleared`);
      }
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
            {isHead
              ? `Student attendance · All classes${classFilter !== "all" ? ` · ${classFilter}` : ""}`
              : `Student attendance${profile?.class_taught ? ` · ${profile.class_taught}` : ""}`}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isHead && (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="all">All classes</option>
              {[...new Set(students.map((s) => s.class))].sort().map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
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
      </div>

      {!isHead && !profile?.class_taught ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Class not assigned yet.</div>
      ) : loading ? (
        <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
      ) : students.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">{isHead ? "No students enrolled in this school yet." : "No students in your class yet."}</div>
      ) : (() => {
        const visible = isHead && classFilter !== "all" ? students.filter((s) => s.class === classFilter) : students;
        return (
        <div className="divide-y divide-border">
          {students.map((s) => {
            const row = rows[s.id];
            return (
              <div key={s.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="flex flex-col items-center gap-1 cursor-pointer select-none" title="Mark morning">
                    <Checkbox
                      checked={row?.morning_status === "present"}
                      disabled={savingKey === `${s.id}-morning`}
                      onCheckedChange={(v) => mark(s, "morning", v === true ? "present" : null)}
                      className="h-6 w-6"
                    />
                    <span className="text-[10px] text-muted-foreground">AM</span>
                  </label>
                  <label className="flex flex-col items-center gap-1 cursor-pointer select-none" title="Mark afternoon">
                    <Checkbox
                      checked={row?.afternoon_status === "present"}
                      disabled={savingKey === `${s.id}-afternoon`}
                      onCheckedChange={(v) => mark(s, "afternoon", v === true ? "present" : null)}
                      className="h-6 w-6"
                    />
                    <span className="text-[10px] text-muted-foreground">PM</span>
                  </label>
                </div>
                <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center font-mono text-xs font-semibold text-primary">
                  {s.student_id}
                </div>
                <div className="flex-1 min-w-[140px]">
                  <div className="font-medium truncate">{s.full_name}</div>
                  <div className="text-xs text-muted-foreground">{s.class}{s.gender ? ` · ${s.gender}` : ""}</div>
                </div>
                <SessionCheck
                  icon={Sun}
                  label="Morning"
                  current={row?.morning_status ?? null}
                  markedAt={row?.morning_marked_at ?? null}
                  lat={row?.morning_lat ?? null}
                  lng={row?.morning_lng ?? null}
                  saving={savingKey === `${s.id}-morning`}
                  onToggle={(checked) => mark(s, "morning", checked ? "present" : null)}
                />
                <SessionCheck
                  icon={Sunset}
                  label="Afternoon"
                  current={row?.afternoon_status ?? null}
                  markedAt={row?.afternoon_marked_at ?? null}
                  lat={row?.afternoon_lat ?? null}
                  lng={row?.afternoon_lng ?? null}
                  saving={savingKey === `${s.id}-afternoon`}
                  onToggle={(checked) => mark(s, "afternoon", checked ? "present" : null)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SessionCheck({ icon: Icon, label, current, markedAt, lat, lng, saving, onToggle }: {
  icon: any; label: string; current: Mark | null;
  markedAt: string | null; lat: number | null; lng: number | null;
  saving: boolean; onToggle: (checked: boolean) => void;
}) {
  const checked = current === "present";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !saving && onToggle(!checked)}
      onKeyDown={(e) => { if (!saving && (e.key === " " || e.key === "Enter")) { e.preventDefault(); onToggle(!checked); } }}
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-border px-3 py-2 cursor-pointer transition min-w-[140px] select-none",
        checked ? "bg-success/10 border-success/40" : "bg-background hover:bg-muted",
        saving && "opacity-60 cursor-wait",
      )}>

      <div className="flex items-center gap-2">
        <Checkbox
          checked={checked}
          disabled={saving}
          onCheckedChange={(v) => onToggle(v === true)}
          className="h-5 w-5"
        />
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">{label}</span>
        {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
      {checked && markedAt && (
        <div className="text-[10px] text-muted-foreground leading-tight pl-6">
          <div>
            {new Date(markedAt).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}
            {" · "}
            {new Date(markedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          {lat !== null && lng !== null ? (
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              <MapPin className="h-2.5 w-2.5" />{lat.toFixed(4)}, {lng.toFixed(4)}
            </a>
          ) : (
            <span className="text-muted-foreground/70">no location</span>
          )}
        </div>
      )}
    </div>
  );
}
