import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, User } from "lucide-react";
import { useAuth, primaryRole } from "@/contexts/AuthContext";
import { DashboardShell, roleLabelFor } from "@/components/DashboardShell";
import { WeeklyAttendanceRecord } from "@/components/WeeklyAttendanceRecord";
import { SchoolAttendanceOverview } from "@/components/SchoolAttendanceOverview";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export const Route = createFileRoute("/attendance-record")({
  head: () => ({ meta: [{ title: "Attendance Record — EdoSAS" }] }),
  component: AttendanceRecordPage,
});

type TeacherOption = {
  user_id: string;
  full_name: string | null;
  teacher_id: string | null;
};

function AttendanceRecordPage() {
  const { session, loading, profile, roles, user } = useAuth();
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | undefined>();
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [viewingOwn, setViewingOwn] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);

  const role = primaryRole(roles);
  const isHead = role === "head_teacher";
  const isTeacher = role === "teacher";
  const canViewOverview = isHead || isTeacher;

  useEffect(() => {
    if (!isHead || !profile?.school_id) return;
    let cancelled = false;
    (async () => {
      setTeachersLoading(true);
      // Get teacher user_ids in school
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");
      const teacherIds = (roleRows ?? []).map((r: any) => r.user_id);
      if (teacherIds.length === 0) {
        if (!cancelled) { setTeachers([]); setTeachersLoading(false); }
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, teacher_id, school_id")
        .eq("school_id", profile.school_id)
        .in("user_id", teacherIds);
      if (cancelled) return;
      const list = (profs ?? [])
        .map((p: any) => ({ user_id: p.user_id, full_name: p.full_name, teacher_id: p.teacher_id }))
        .sort((a: TeacherOption, b: TeacherOption) => (a.teacher_id ?? "").localeCompare(b.teacher_id ?? ""));
      setTeachers(list);
      setTeachersLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isHead, profile?.school_id]);

  if (loading || !session || !profile) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const label = roleLabelFor(role);
  const viewingId = isHead && !viewingOwn ? selectedTeacherId : user?.id;
  const selectedTeacher = teachers.find((t) => t.user_id === selectedTeacherId);

  return (
    <DashboardShell nav={[]} roleLabel={label}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Attendance Record</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isHead
              ? "View your own record or select a teacher to view theirs."
              : "Your weekly attendance summary."}
          </p>
        </div>

        {isHead && (
          <div className="mx-2 sm:mx-0 rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
            <div className="flex items-center gap-3">
              <Button
                variant={viewingOwn ? "default" : "outline"}
                onClick={() => {
                  setViewingOwn(true);
                  setSelectedTeacherId(undefined);
                }}
                className="gap-2"
              >
                <User className="h-4 w-4" />
                Head teacher's attendance record
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <label className="text-sm font-medium mb-2 block">Select teacher</label>
              <Select
                value={selectedTeacherId}
                onValueChange={(v) => {
                  setSelectedTeacherId(v);
                  setViewingOwn(false);
                }}
                disabled={teachersLoading || teachers.length === 0}
              >
                <SelectTrigger className="w-full md:w-[420px]">
                  <SelectValue
                    placeholder={
                      teachersLoading
                        ? "Loading teachers..."
                        : teachers.length === 0
                        ? "No teachers found"
                        : "Choose a Oracle ID"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.user_id} value={t.user_id}>
                      {(t.teacher_id ?? "—") + (t.full_name ? ` · ${t.full_name}` : "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTeacher && (
                <p className="text-xs text-muted-foreground mt-2">
                  Viewing record for <span className="font-medium text-foreground">{selectedTeacher.full_name ?? selectedTeacher.teacher_id}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {viewingId ? (
          <WeeklyAttendanceRecord key={viewingId} teacherUserId={viewingId} />
        ) : isHead ? (
          <div className="mx-2 sm:mx-0 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            Select a teacher above to view their attendance record, or view your own record.
          </div>
        ) : null}

        {canViewOverview && <SchoolAttendanceOverview />}
      </div>
    </DashboardShell>
  );
}
