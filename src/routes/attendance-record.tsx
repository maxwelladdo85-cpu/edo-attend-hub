import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth, primaryRole } from "@/contexts/AuthContext";
import { DashboardShell, roleLabelFor } from "@/components/DashboardShell";
import { WeeklyAttendanceRecord } from "@/components/WeeklyAttendanceRecord";

export const Route = createFileRoute("/attendance-record")({
  head: () => ({ meta: [{ title: "Attendance Record — EdoSAS" }] }),
  component: AttendanceRecordPage,
});

function AttendanceRecordPage() {
  const { session, loading, profile, roles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session || !profile) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const role = primaryRole(roles);
  const label = roleLabelFor(role);

  return (
    <DashboardShell nav={[]} roleLabel={label}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Attendance Record</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your weekly attendance summary.
          </p>
        </div>
        <WeeklyAttendanceRecord />
      </div>
    </DashboardShell>
  );
}
