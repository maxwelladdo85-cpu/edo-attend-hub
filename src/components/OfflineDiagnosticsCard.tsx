// Offline diagnostics: shows the user (and us, when debugging) exactly what's
// cached on this device, how big the outbox is, and lets them force a resync
// or wipe the local cache and re-bootstrap from the server.

import { useCallback, useEffect, useState } from "react";
import { Database, HardDriveDownload, Loader2, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { bootstrapOfflineData } from "@/lib/offline/bootstrap";
import { listOutbox } from "@/lib/offline/localDb";
import {
  clearAllOfflineData,
  studentAttendanceStore,
  studentsStore,
  teacherAttendanceStore,
} from "@/lib/offline/storage";
import { syncNow, useSyncState } from "@/lib/offline/useSync";

interface Counts {
  students: number;
  studentAttendance: number;
  teacherAttendance: number;
  outbox: number;
}

export function OfflineDiagnosticsCard() {
  const { profile } = useAuth();
  const sync = useSyncState();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [busy, setBusy] = useState<"sync" | "rebuild" | "clear" | null>(null);

  const refresh = useCallback(async () => {
    const [students, sa, ta, ob] = await Promise.all([
      studentsStore.length(),
      studentAttendanceStore.length(),
      teacherAttendanceStore.length(),
      listOutbox(),
    ]);
    setCounts({ students, studentAttendance: sa, teacherAttendance: ta, outbox: ob.length });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, sync.lastSyncedAt, sync.pending]);

  const handleSync = async () => {
    setBusy("sync");
    try {
      await syncNow(profile?.school_id ?? null);
      await refresh();
      toast.success("Sync complete");
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed");
    } finally {
      setBusy(null);
    }
  };

  const handleRebuild = async () => {
    if (!profile?.school_id) {
      toast.error("No school assigned to your profile");
      return;
    }
    setBusy("rebuild");
    try {
      await bootstrapOfflineData({ schoolId: profile.school_id, force: true });
      await refresh();
      toast.success("Offline cache rebuilt from server");
    } catch (e: any) {
      toast.error(e?.message ?? "Rebuild failed");
    } finally {
      setBusy(null);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Clear all offline data on this device? Unsynced changes will be lost.")) return;
    setBusy("clear");
    try {
      await clearAllOfflineData();
      await refresh();
      toast.success("Offline data cleared");
    } catch (e: any) {
      toast.error(e?.message ?? "Clear failed");
    } finally {
      setBusy(null);
    }
  };

  const lastSynced = sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleString() : "Never";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4" /> Offline storage
        </CardTitle>
        <CardDescription>
          What's saved on this device, and tools to fix sync problems.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center gap-2">
          {sync.online ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Wifi className="h-4 w-4" /> Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <WifiOff className="h-4 w-4" /> Offline
            </span>
          )}
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">Last sync: {lastSynced}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Students" value={counts?.students} />
          <Stat label="Student attendance" value={counts?.studentAttendance} />
          <Stat label="Teacher attendance" value={counts?.teacherAttendance} />
          <Stat label="Pending sync" value={counts?.outbox} highlight={!!counts?.outbox} />
        </div>

        {sync.lastError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-xs">
            Last error: {sync.lastError}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" variant="default" onClick={handleSync} disabled={busy !== null || !sync.online}>
            {busy === "sync" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
            Sync now
          </Button>
          <Button size="sm" variant="outline" onClick={handleRebuild} disabled={busy !== null || !sync.online}>
            {busy === "rebuild" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <HardDriveDownload className="h-4 w-4 mr-1.5" />}
            Rebuild cache
          </Button>
          <Button size="sm" variant="ghost" onClick={handleClear} disabled={busy !== null} className="text-destructive hover:text-destructive">
            {busy === "clear" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
            Clear offline data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number | undefined; highlight?: boolean }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={"text-lg font-semibold tabular-nums " + (highlight ? "text-amber-600 dark:text-amber-400" : "")}>
        {value ?? "—"}
      </div>
    </div>
  );
}
