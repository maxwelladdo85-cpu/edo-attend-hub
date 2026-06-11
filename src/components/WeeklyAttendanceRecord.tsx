import { useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Returns the Monday (start) of the current ISO week in local time.
function getMondayOfThisWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  return monday;
}

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function WeeklyAttendanceRecord({ teacherUserId }: { teacherUserId?: string } = {}) {
  const { user } = useAuth();
  const targetId = teacherUserId ?? user?.id;
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<Record<string, any>>({});

  const monday = getMondayOfThisWeek();
  const week = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return { date: d, dateStr: toDateStr(d), label: WEEKDAY_LABELS[i] };
  });

  useEffect(() => {
    if (!targetId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const start = week[0].dateStr;
      const end = week[4].dateStr;
      const { data } = await supabase
        .from("teacher_attendance")
        .select("attendance_date, arrival_time, departure_time, arrival_status")
        .eq("teacher_user_id", targetId)
        .gte("attendance_date", start)
        .lte("attendance_date", end);
      if (cancelled) return;
      const map: Record<string, any> = {};
      (data ?? []).forEach((r: any) => { map[r.attendance_date] = r; });
      setRecords(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  const today = toDateStr(new Date());
  const presentDays = week.filter(d => records[d.dateStr]?.arrival_time).length;
  const rate = Math.round((presentDays / 5) * 100);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center">
            <CalendarCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg">Attendance record</h3>
            <p className="text-xs text-muted-foreground">This week ({week[0].date.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – {week[4].date.toLocaleDateString(undefined, { day: "numeric", month: "short" })})</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-display text-primary">{rate}%</div>
          <div className="text-xs text-muted-foreground">{presentDays} / 5 days</div>
        </div>
      </div>

      {loading ? (
        <div className="py-8 grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {week.map(({ date, dateStr, label }) => {
            const rec = records[dateStr];
            const present = !!rec?.arrival_time;
            const isToday = dateStr === today;
            const isFuture = dateStr > today;
            return (
              <div
                key={dateStr}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                  isToday ? "border-primary/40 bg-primary/5" : "border-border bg-background"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isFuture ? (
                    <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center">
                      <span className="text-xs text-muted-foreground">—</span>
                    </div>
                  ) : present ? (
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  ) : (
                    <XCircle className="h-8 w-8 text-destructive/70" />
                  )}
                  <div>
                    <div className="font-medium text-sm">
                      {label} <span className="text-muted-foreground font-normal">· {date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                      {isToday && <span className="ml-2 text-[10px] uppercase tracking-wide text-primary font-semibold">Today</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isFuture
                        ? "Upcoming"
                        : present
                        ? `Arrived ${new Date(rec.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : "Absent"}
                    </div>
                  </div>
                </div>
                {present && rec.departure_time && (
                  <div className="text-xs text-muted-foreground">
                    Left {new Date(rec.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
