import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarOff, GraduationCap, Loader2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type DayType = "holiday" | "staff_only" | "all_present";
type Row = { day_type: DayType };

export function CalendarStats() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("holidays")
        .select("day_type");
      if (!mounted) return;
      if (!error) setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const counts = useMemo(() => {
    const c = { holiday: 0, staff_only: 0, all_present: 0 };
    for (const r of rows) if (r.day_type in c) c[r.day_type]++;
    return c;
  }, [rows]);

  const activeSchoolDays = counts.staff_only + counts.all_present;

  const items = [
    {
      label: "Holidays",
      value: counts.holiday,
      icon: CalendarOff,
      classes: "bg-destructive/10 text-destructive border-destructive/20",
      iconClasses: "bg-destructive/15 text-destructive",
    },
    {
      label: "Staff-only days",
      value: counts.staff_only,
      icon: Users,
      classes:
        "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
      iconClasses: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    },
    {
      label: "All-present days",
      value: counts.all_present,
      icon: GraduationCap,
      classes:
        "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400",
      iconClasses: "bg-green-500/15 text-green-600 dark:text-green-400",
    },
    {
      label: "Active school days",
      value: activeSchoolDays,
      icon: CalendarDays,
      classes: "bg-primary/10 text-primary border-primary/20",
      iconClasses: "bg-primary/15 text-primary",
      hint: "Staff-only + All-present",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Card key={it.label} className={cn("border bg-card text-card-foreground", it.classes.replace(/text-[^\s]+/g, ""))}>
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className={cn(
                  "h-10 w-10 rounded-md flex items-center justify-center shrink-0",
                  it.iconClasses,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground leading-tight">
                  {it.label}
                </div>
                <div className="text-2xl font-semibold leading-tight text-foreground mt-0.5">
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    it.value
                  )}
                </div>
                {it.hint && (
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {it.hint}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

