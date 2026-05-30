import { createFileRoute } from "@tanstack/react-router";
import { Users, GraduationCap, School as SchoolIcon, UserCheck, AlertCircle, Activity } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { AdminPageHeader } from "@/components/AdminShell";
import {
  useSchools,
  useTeacherProfiles,
  useStudents,
  useTeacherAttendanceToday,
  useStudentAttendanceToday,
  isStudentPresent,
} from "@/lib/admin-data";

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
  const { data: tAtt = [] } = useTeacherAttendanceToday();
  const { data: sAtt = [] } = useStudentAttendanceToday();

  const teachersPresent = tAtt.filter((r) => r.arrival_time).length;
  const teachersLate = tAtt.filter((r) => r.arrival_status === "late").length;
  const studentsPresent = sAtt.filter(isStudentPresent).length;

  const teacherPct = pct(teachersPresent, teachers.length);
  const studentPct = pct(studentsPresent, students.length);

  return (
    <div>
      <AdminPageHeader
        title="State-wide Overview"
        subtitle={`Live attendance across Edo State · ${new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}`}
        icon={Activity}
      />

      <div className="rounded-2xl p-6 bg-gradient-to-br from-primary via-primary/90 to-gold text-primary-foreground shadow-card mb-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Pupils present statewide</div>
            <div className="mt-2 flex items-baseline gap-3">
              <div className="text-5xl font-bold font-display">{studentPct}%</div>
              <div className="text-sm opacity-90">{studentsPresent.toLocaleString()} of {students.length.toLocaleString()}</div>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Teachers present statewide</div>
            <div className="mt-2 flex items-baseline gap-3">
              <div className="text-5xl font-bold font-display">{teacherPct}%</div>
              <div className="text-sm opacity-90">{teachersPresent.toLocaleString()} of {teachers.length.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Network</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard icon={SchoolIcon} label="Schools" value={schools.length} className="bg-head-teacher-card" />
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
