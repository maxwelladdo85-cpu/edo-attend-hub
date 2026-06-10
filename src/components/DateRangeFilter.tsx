import { Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAdminDateRange, PLATFORM_START } from "@/contexts/AdminDateRangeContext";

export function DateRangeFilter({ className }: { className?: string }) {
  const { from, to, setFrom, setTo, reset, isToday } = useAdminDateRange();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className={`flex flex-wrap items-end gap-2 ${className ?? ""}`}>
      <div>
        <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
          <CalendarIcon className="h-3 w-3" /> From
        </label>
        <Input
          type="date"
          value={from}
          min={PLATFORM_START}
          max={to || today}
          onChange={(e) => setFrom(e.target.value || PLATFORM_START)}
          className="h-9 w-[150px]"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
          <CalendarIcon className="h-3 w-3" /> To
        </label>
        <Input
          type="date"
          value={to}
          min={from || PLATFORM_START}
          max={today}
          onChange={(e) => setTo(e.target.value || today)}
          className="h-9 w-[150px]"
        />
      </div>
      {!isToday && (
        <Button variant="ghost" size="sm" onClick={reset} className="h-9" title="Reset to today">
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Today
        </Button>
      )}
    </div>
  );
}
