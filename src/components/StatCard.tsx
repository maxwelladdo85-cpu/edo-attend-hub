import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "success" | "warning" | "destructive" | "gold";
}) {
  const toneStyles = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    gold: "bg-gold/15 text-gold-foreground",
  }[tone];

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground font-medium truncate">{label}</div>
          <div className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-bold font-display text-foreground">{value}</div>
          {hint && <div className="mt-1 text-[10px] sm:text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg grid place-items-center flex-shrink-0 ${toneStyles}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}
