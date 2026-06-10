import { createFileRoute } from "@tanstack/react-router";
import { Users, GraduationCap, School as SchoolIcon, UserCheck, AlertCircle, Activity, ShieldCheck } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { AdminPageHeader } from "@/components/AdminShell";
import {
  useSchools,
  useTeacherProfiles,
  useStudents,
  useTeacherAttendanceToday,
  useStudentAttendanceToday,
  useStaffProfiles,
  isStudentPresent,
} from "@/lib/admin-data";
import { ExportButton } from "@/components/ExportButton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/")({
  component: OverviewPage,
});

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function OverviewPage() {
  const { data: schools = [] } = useSchools();
  const { data: teachers = [] } = useTeacherProfiles();
  const { data: students = [] } = useStudents();
  const { data: staff = [] } = useStaffProfiles();
  const { data: tAtt = [] } = useTeacherAttendanceToday();
  const { data: sAtt = [] } = useStudentAttendanceToday();

  // De-duplicate by teacher to avoid multiple attendance rows inflating counts.
  const presentTeacherIds = new Set(
    tAtt.filter((r) => r.arrival_time).map((r) => r.teacher_user_id),
  );
  const lateTeacherIds = new Set(
    tAtt.filter((r) => r.arrival_status === "late").map((r) => r.teacher_user_id),
  );
  const presentStudentIds = new Set(
    sAtt.filter(isStudentPresent).map((r) => r.student_id),
  );

  // Denominator is the union of registered teachers and any teacher with an
  // attendance row today, so the percentage can never exceed 100%.
  const teacherDenom = new Set<string>([
    ...teachers.map((t) => t.user_id),
    ...tAtt.map((r) => r.teacher_user_id),
  ]).size;
  const studentDenom = Math.max(students.length, presentStudentIds.size);

  const teachersPresent = Math.min(presentTeacherIds.size, teacherDenom);
  const teachersLate = lateTeacherIds.size;
  const studentsPresent = Math.min(presentStudentIds.size, studentDenom);

  const teacherPct = pct(teachersPresent, teacherDenom);
  const studentPct = pct(studentsPresent, studentDenom);

  return (
    <div>
      <AdminPageHeader
        title="State-wide Overview"
        subtitle={`Live attendance across Edo State · ${new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}`}
        icon={Activity}
        actions={
          <ExportButton
            filename={`statewide-overview-${new Date().toISOString().slice(0, 10)}`}
            title="State-wide Overview"
            rows={[
              { metric: "Schools", value: schools.length },
              { metric: "Primary schools", value: schools.filter((s) => s.category === "primary").length },
              { metric: "Junior Secondary schools", value: schools.filter((s) => s.category === "junior_secondary").length },
              { metric: "Teachers (registered)", value: teachers.length },
              { metric: "Pupils (registered)", value: students.length },
              { metric: "Teachers present today", value: teachersPresent },
              { metric: "Teachers present %", value: `${teacherPct}%` },
              { metric: "Teachers late today", value: teachersLate },
              { metric: "Pupils present today", value: studentsPresent },
              { metric: "Pupils present %", value: `${studentPct}%` },
              { metric: "Pupils not marked", value: Math.max(0, students.length - studentsPresent) },
            ]}
            columns={[
              { header: "Metric", accessor: (r) => r.metric },
              { header: "Value", accessor: (r) => r.value },
            ]}
          />
        }
      />

      <div className="rounded-2xl p-6 bg-gradient-to-br from-primary via-primary/90 to-gold text-primary-foreground shadow-card mb-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Pupils present statewide</div>
            <div className="mt-2 flex items-baseline gap-3">
              <div className="text-5xl font-bold font-display">{studentPct}%</div>
              <div className="text-sm opacity-90">{studentsPresent.toLocaleString()} of {studentDenom.toLocaleString()}</div>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Teachers present statewide</div>
            <div className="mt-2 flex items-baseline gap-3">
              <div className="text-5xl font-bold font-display">{teacherPct}%</div>
              <div className="text-sm opacity-90">{teachersPresent.toLocaleString()} of {teacherDenom.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Network</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard
          icon={SchoolIcon}
          label="Schools"
          value={schools.length}
          hint={`${schools.filter((s) => s.category === "primary").length} Primary · ${schools.filter((s) => s.category === "junior_secondary").length} Junior Sec.`}
          className="bg-head-teacher-card"
        />
        <StatCard icon={Users} label="Teachers" value={teachers.length} className="bg-head-teacher-card" />
        <StatCard icon={GraduationCap} label="Students" value={students.length} tone="gold" className="bg-head-teacher-card" />
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Today</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={UserCheck} label="Teachers present" value={teachersPresent} tone="success" hint={`${teacherPct}%`} className="bg-head-teacher-card" />
        <StatCard icon={AlertCircle} label="Teachers late" value={teachersLate} tone="warning" className="bg-head-teacher-card" />
        <StatCard icon={UserCheck} label="Pupils present" value={studentsPresent} tone="success" hint={`${studentPct}%`} className="bg-head-teacher-card" />
        <StatCard icon={AlertCircle} label="Pupils not marked" value={Math.max(0, students.length - studentsPresent)} tone="destructive" className="bg-head-teacher-card" />
      </div>
    </div>
  );
}
