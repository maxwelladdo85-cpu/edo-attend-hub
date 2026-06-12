import { useEffect, useMemo, useState } from "react";
import { CalendarOff, Loader2, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type Holiday = {
  id: string;
  holiday_date: string;
  label: string;
};

function fmtISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function HolidaysCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [form, setForm] = useState({ holiday_date: "", label: "" });
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("holidays")
      .select("id, holiday_date, label")
      .order("holiday_date", { ascending: true });
    if (error) toast.error(error.message);
    else setHolidays((data as Holiday[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const holidayMap = useMemo(() => {
    const m = new Map<string, Holiday>();
    holidays.forEach((h) => m.set(h.holiday_date, h));
    return m;
  }, [holidays]);

  const handleAdd = async (dateStr?: string) => {
    const date = dateStr ?? form.holiday_date;
    const label = (dateStr ? "Holiday" : form.label.trim()) || "Holiday";
    if (!date) {
      toast.error("Pick a date");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("holidays")
      .insert({ holiday_date: date, label });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Holiday added");
    if (!dateStr) setForm({ holiday_date: "", label: "" });
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("holidays").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Removed");
    load();
  };

  // Calendar grid
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const toggleDate = (d: Date) => {
    const iso = fmtISO(d);
    const existing = holidayMap.get(iso);
    if (existing) {
      handleDelete(existing.id);
    } else {
      handleAdd(iso);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarOff className="h-4 w-4" /> Holidays & non-school days
        </CardTitle>
        <CardDescription>
          Mark state-wide holidays. Weekends are automatically excluded from school
          days everywhere.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick add */}
        <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] items-end">
          <div className="space-y-2">
            <Label htmlFor="hol_date">Date</Label>
            <Input
              id="hol_date"
              type="date"
              value={form.holiday_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, holiday_date: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hol_label">Label</Label>
            <Input
              id="hol_label"
              placeholder="e.g. Eid al-Fitr, Mid-term break"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
          </div>
          <Button
            onClick={() => handleAdd()}
            disabled={saving}
            className="tap-target"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1.5" />
            )}
            Add holiday
          </Button>
        </div>

        {/* Month calendar */}
        <div className="rounded-md border">
          <div className="flex items-center justify-between p-3 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCursor(new Date(year, month - 1, 1))
              }
              className="tap-target"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">{monthLabel}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCursor(new Date(year, month + 1, 1))
              }
              className="tap-target"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 text-xs text-muted-foreground border-b">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="p-2 text-center font-medium">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="aspect-square border-t border-l first:border-l-0" />;
              const iso = fmtISO(d);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const h = holidayMap.get(iso);
              const isHoliday = !!h;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !isWeekend && toggleDate(d)}
                  disabled={isWeekend}
                  className={cn(
                    "aspect-square border-t border-l first:border-l-0 p-1.5 text-left text-xs flex flex-col gap-1 transition-colors",
                    isWeekend && "bg-muted/40 text-muted-foreground cursor-not-allowed",
                    !isWeekend && !isHoliday && "hover:bg-accent",
                    isHoliday && "bg-destructive/15 hover:bg-destructive/25",
                  )}
                  title={
                    isWeekend
                      ? "Weekend (not a school day)"
                      : isHoliday
                      ? `${h?.label} — click to remove`
                      : "Click to mark as holiday"
                  }
                >
                  <span className="font-medium">{d.getDate()}</span>
                  {isWeekend && <span className="text-[10px]">Weekend</span>}
                  {isHoliday && (
                    <span className="text-[10px] truncate text-destructive">
                      {h?.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div className="border rounded-md divide-y">
          {loading ? (
            <div className="p-4 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…
            </div>
          ) : holidays.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No holidays set yet.
            </div>
          ) : (
            holidays.map((h) => (
              <div key={h.id} className="p-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{h.label}</div>
                  <div className="text-xs text-muted-foreground">{h.holiday_date}</div>
                </div>
                <Badge variant="secondary">State-wide</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(h.id)}
                  className="text-destructive hover:text-destructive tap-target"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
