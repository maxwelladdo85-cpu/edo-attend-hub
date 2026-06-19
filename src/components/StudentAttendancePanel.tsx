import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, GraduationCap, Loader2, MapPin, Sun, Sunset, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth, primaryRole } from "@/contexts/AuthContext";
import { getCurrentPosition } from "@/lib/geo";
import { StatCard } from "@/components/StatCard";
import {
  bulkUpsertStudents,
  getStudentAttendanceForDate,
  getStudentsForSchool,
  markStudentAttendance,
  outboxCount,
} from "@/lib/offline/localDb";
import { getSyncState, subscribeSync, syncNow } from "@/lib/offline/syncEngine";
import { supabase } from "@/integrations/supabase/client";
import { isTransientNetworkError } from "@/lib/offline/networkErrors";

type Mark = "present" | "late" | "absent";
type Session = "morning" | "afternoon";

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  class: string;
  gender: string | null;
  school_id: string;
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
  {
    value: "present",
    label: "Present",
    cls: "bg-success text-success-foreground hover:bg-success/90",
  },
  { value: "late", label: "Late", cls: "bg-gold text-gold-foreground hover:bg-gold/90" },
  {
    value: "absent",
    label: "Absent",
    cls: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
];

export function StudentAttendancePanel() {
  const { user, profile, roles } = useAuth();
  const isHead = primaryRole(roles) === "head_teacher";
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<Record<string, AttendanceRow>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [reloadTick, setReloadTick] = useState(0);
  const [sync, setSync] = useState(getSyncState());

  useEffect(() => subscribeSync(setSync), []);

  const dateStr = format(date, "yyyy-MM-dd");

  useEffect(() => {
    const load = async () => {
      if (!profile?.school_id) {
        setLoading(false);
        return;
      }
      if (!isHead && !profile?.class_taught) {
        setLoading(false);
        return;
      }
      setLoading(true);
      // Read from the on-device cache so this works offline. The sync engine
      // keeps the cache fresh in the background whenever we have internet.
      const [cachedStudents, att] = await Promise.all([
        getStudentsForSchool(profile.school_id),
        getStudentAttendanceForDate(profile.school_id, dateStr),
      ]);
      let allStudents = cachedStudents;
      // If the offline cache is still empty (first login, bootstrap not done
      // yet, or cleared storage), fall back to a direct fetch so the teacher
      // doesn't see an empty class.
      if (allStudents.length === 0 && navigator.onLine !== false) {
        const { data, error } = await supabase
          .from("students")
          .select("id, student_id, full_name, class, gender, school_id")
          .eq("school_id", profile.school_id);
        if (!error && data && data.length > 0) {
          allStudents = data as Student[];
          try {
            await bulkUpsertStudents(data as any);
          } catch {
            /* best effort */
          }
        }
      }
      const filtered = isHead
        ? allStudents
        : allStudents.filter((s) => s.class === profile.class_taught);
      filtered.sort((a, b) =>
        a.class === b.class
          ? a.student_id.localeCompare(b.student_id)
          : a.class.localeCompare(b.class),
      );
      setStudents(filtered);
      const map: Record<string, AttendanceRow> = {};
      att.forEach((r) => {
        map[r.student_id] = r;
      });
      setRows(map);
      setLoading(false);
    };
    load();
  }, [profile?.school_id, profile?.class_taught, dateStr, isHead, reloadTick]);

  const handleUpdate = async () => {
    if (!profile?.school_id) return;
    try {
      await syncNow(profile.school_id);
      setReloadTick((t) => t + 1);
      const pending = await outboxCount();
      if (pending === 0) {
        toast.success("Attendance updated");
      } else {
        toast.message(`${pending} change${pending === 1 ? "" : "s"} still pending`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    }
  };

  const mark = async (student: Student, session: Session, value: Mark | null) => {
    if (!user || !profile?.school_id) return;
    if (session === "afternoon" && !rows[student.id]?.morning_status) {
      toast.error("Mark morning attendance first");
      return;
    }
    const key = `${student.id}-${session}`;
    setSavingKey(key);
    try {


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

      const next = await markStudentAttendance({
        student_id: student.id,
        school_id: profile.school_id,
        attendance_date: dateStr,
        session,
        value,
        marked_by: user.id,
        lat,
        lng,
      });

      setRows((prev) => ({ ...prev, [student.id]: next }));

      const now = session === "morning" ? next.morning_marked_at : next.afternoon_marked_at;
      if (value && now) {
        const timeLabel = new Date(now).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        toast.success(
          `${student.full_name.split(" ")[0]} · ${session} marked at ${timeLabel}${
            lat !== null ? " · location captured" : ""
          }`,
        );
      } else {
        toast.success(`${student.full_name.split(" ")[0]} · ${session} cleared`);
      }

      // Fire-and-forget sync; falls back to retry on next online tick.
      void syncNow(profile.school_id).catch((err) => {
        if (!isTransientNetworkError(err)) console.warn("Student attendance sync failed", err);
      });
    } catch (e: any) {
      if (isTransientNetworkError(e)) {
        toast.success(
          "Attendance saved on this phone. It will sync when the connection is stable.",
        );
      } else {
        toast.error(e.message ?? "Could not save attendance");
      }
    } finally {
      setSavingKey(null);
    }
  };

  const visible =
    isHead && classFilter !== "all" ? students.filter((s) => s.class === classFilter) : students;

  const total = visible.length;
  const amPresent = visible.filter((s) => rows[s.id]?.morning_status === "present").length;
  const amAbsent = total - amPresent;
  const pmPresent = visible.filter((s) => rows[s.id]?.afternoon_status === "present").length;
  const pmAbsent = total - pmPresent;

  return (
    <div
      className={`mx-2 sm:mx-0 rounded-2xl border border-border bg-head-teacher-card shadow-card overflow-hidden`}
    >
      {isHead && total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 p-3 sm:p-5">
          <StatCard
            icon={Users}
            label="Total"
            value={total}
            tone="default"
            className="bg-head-teacher-card"
          />
          <StatCard
            icon={Sun}
            label="AM Present"
            value={`${amPresent}`}
            hint={`${total > 0 ? Math.round((amPresent / total) * 100) : 0}%`}
            tone="success"
            className="bg-head-teacher-card"
          />
          <StatCard
            icon={Sun}
            label="AM Absent"
            value={`${amAbsent}`}
            hint={`${total > 0 ? Math.round((amAbsent / total) * 100) : 0}%`}
            tone="destructive"
            className="bg-head-teacher-card"
          />
          <StatCard
            icon={Sunset}
            label="PM Present"
            value={`${pmPresent}`}
            hint={`${total > 0 ? Math.round((pmPresent / total) * 100) : 0}%`}
            tone="success"
            className="bg-head-teacher-card"
          />
          <StatCard
            icon={Sunset}
            label="PM Absent"
            value={`${pmAbsent}`}
            hint={`${total > 0 ? Math.round((pmAbsent / total) * 100) : 0}%`}
            tone="destructive"
            className="bg-head-teacher-card"
          />
        </div>
      )}
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
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !date && "text-muted-foreground",
                )}
              >
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
        <div className="p-8 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline" />
        </div>
      ) : students.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          {isHead ? "No students enrolled in this school yet." : "No students in your class yet."}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {visible.map((s) => {
            const row = rows[s.id];
            return (
              <div
                key={s.id}
                className="p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 min-w-[3.5rem] max-w-[5rem] rounded-lg bg-primary/10 flex items-center justify-center font-mono text-[10px] font-semibold text-primary flex-shrink-0 overflow-hidden px-1.5">
                    <span className="truncate">{s.student_id}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {s.class}
                      {s.gender ? ` · ${s.gender}` : ""}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:flex-1 sm:justify-end">
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
                    disabled={!row?.morning_status}
                    disabledHint="Mark morning first"
                    onToggle={(checked) => mark(s, "afternoon", checked ? "present" : null)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {((!isHead && profile?.class_taught) || isHead) && students.length > 0 && (
        <div className="sticky bottom-0 z-10 bg-head-teacher-card/95 backdrop-blur border-t border-border p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <Button
            type="button"
            className="w-full h-11 text-base font-semibold"
            onClick={handleUpdate}
            disabled={sync.syncing}
          >
            {sync.syncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating…
              </>
            ) : sync.pending > 0 ? (
              `Update (${sync.pending} pending)`
            ) : (
              "Update"
            )}
          </Button>
          {sync.lastError && (
            <div className="mt-2 text-xs text-destructive text-center truncate">
              {sync.lastError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SessionCheck({
  icon: Icon,
  label,
  current,
  markedAt,
  lat,
  lng,
  saving,
  disabled = false,
  disabledHint,
  onToggle,
}: {
  icon: any;
  label: string;
  current: Mark | null;
  markedAt: string | null;
  lat: number | null;
  lng: number | null;
  saving: boolean;
  disabled?: boolean;
  disabledHint?: string;
  onToggle: (checked: boolean) => void;
}) {
  const checked = current === "present";
  const locked = saving || disabled;
  return (
    <div
      role="button"
      tabIndex={0}
      title={disabled && disabledHint ? disabledHint : undefined}
      aria-disabled={disabled}
      onClick={() => !locked && onToggle(!checked)}
      onKeyDown={(e) => {
        if (!locked && (e.key === " " || e.key === "Enter")) {
          e.preventDefault();
          onToggle(!checked);
        }
      }}
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-border px-3 py-2 cursor-pointer transition select-none w-full sm:w-auto sm:min-w-[140px]",
        checked ? "bg-success/10 border-success/40" : "bg-background hover:bg-muted",
        saving && "opacity-60 cursor-wait",
        disabled && !saving && "opacity-50 cursor-not-allowed hover:bg-background",
      )}
    >
      <div className="flex items-center gap-2">
        <Checkbox
          checked={checked}
          disabled={locked}
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
            {new Date(markedAt).toLocaleDateString([], {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
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
              <MapPin className="h-2.5 w-2.5" />
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </a>
          ) : (
            <span className="text-muted-foreground/70">no location</span>
          )}
        </div>
      )}
    </div>
  );
}
