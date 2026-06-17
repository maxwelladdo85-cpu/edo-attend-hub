import { CloudOff, CloudUpload, RefreshCw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { syncNow, useSyncState } from "@/lib/offline/useSync";
import { cn } from "@/lib/utils";

export function SyncStatusBar({ className }: { className?: string }) {
  const { profile } = useAuth();
  const s = useSyncState();

  // Hide the bar entirely when we're online, idle, and have nothing pending —
  // keeps the dashboard clean during normal use.
  if (s.online && !s.syncing && s.pending === 0 && !s.lastError) return null;

  const tone = !s.online
    ? "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300"
    : s.lastError
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : "bg-primary/10 text-primary border-primary/20";

  const Icon = !s.online ? CloudOff : s.syncing ? RefreshCw : s.pending > 0 ? CloudUpload : Wifi;

  const label = !s.online
    ? s.pending > 0
      ? `Offline — ${s.pending} change${s.pending === 1 ? "" : "s"} pending`
      : "Offline — changes will sync when you're back online"
    : s.syncing
      ? "Syncing…"
      : s.pending > 0
        ? `${s.pending} change${s.pending === 1 ? "" : "s"} pending`
        : s.lastError
          ? `Sync error: ${s.lastError}`
          : "Online";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm",
        tone,
        className,
      )}
      role="status"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={cn("h-4 w-4 flex-shrink-0", s.syncing && "animate-spin")} />
        <span className="truncate">{label}</span>
      </div>
      {s.online && (s.pending > 0 || s.lastError) && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          disabled={s.syncing}
          onClick={() => syncNow(profile?.school_id ?? null)}
        >
          Sync now
        </Button>
      )}
    </div>
  );
}
