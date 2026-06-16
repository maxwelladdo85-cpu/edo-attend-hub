import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import {
  useSchools,
  useStaffProfiles,
  useStudents,
  useTeacherAttendanceToday,
  useStudentAttendanceToday,
  isStudentPresent,
  prettyLga,
  prettyCategory,
  safePct,
} from "@/lib/admin-data";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ExportButton } from "@/components/ExportButton";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
});

const COLORS = {
  green: "oklch(0.45 0.13 150)",
  brightGreen: "oklch(0.65 0.17 148)",
  gold: "oklch(0.74 0.15 80)",
  red: "oklch(0.55 0.21 27)",
  muted: "oklch(0.85 0.02 150)",
};

function AnalyticsPage() {
  const { data: schools = [] } = useSchools();
  const { data: staff = [] } = useStaffProfiles();
  const teachers = useMemo(() => staff.filter((s) => s.role === "teacher"), [staff]);
  const headTeachers = useMemo(() => staff.filter((s) => s.role === "head_teacher"), [staff]);
  const teacherUserIds = useMemo(() => new Set(teachers.map((t) => t.user_id)), [teachers]);
  const headUserIds = useMemo(() => new Set(headTeachers.map((t) => t.user_id)), [headTeachers]);
  const { data: students = [] } = useStudents();
  const { data: tAtt = [] } = useTeacherAttendanceToday();
  const { data: sAtt = [] } = useStudentAttendanceToday();

  // Teacher-only attendance (exclude head teachers — they have their own role).
  const teacherOnlyAtt = useMemo(
    () => tAtt.filter((r) => teacherUserIds.has(r.teacher_user_id)),
    [tAtt, teacherUserIds],
  );
  const headOnlyAtt = useMemo(
    () => tAtt.filter((r) => headUserIds.has(r.teacher_user_id)),
    [tAtt, headUserIds],
  );


  // Denominator: registered teachers ∪ any teacher with an attendance row today.
  const teacherDenom = new Set<string>([
    ...teachers.map((t) => t.user_id),
    ...teacherOnlyAtt.map((r) => r.teacher_user_id),
  ]).size;
  const teachersPresent = Math.min(teacherOnlyAtt.filter((r) => r.arrival_time).length, teacherDenom);
  const teachersLate = teacherOnlyAtt.filter((r) => r.arrival_status === "late").length;
  const teachersOnTime = teacherOnlyAtt.filter((r) => r.arrival_status === "on_time" || r.arrival_status === "early").length;
  const teachersAbsent = Math.max(0, teacherDenom - teachersPresent);

  // Head teacher counts
  const headDenom = new Set<string>([
    ...headTeachers.map((t) => t.user_id),
    ...headOnlyAtt.map((r) => r.teacher_user_id),
  ]).size;
  const headsPresent = Math.min(headOnlyAtt.filter((r) => r.arrival_time).length, headDenom);
  const headsLate = headOnlyAtt.filter((r) => r.arrival_status === "late").length;
  const headsOnTime = headOnlyAtt.filter((r) => r.arrival_status === "on_time" || r.arrival_status === "early").length;
  const headsAbsent = Math.max(0, headDenom - headsPresent);

  // Match Overview's pupil denominator (presentStudentIds count, not raw rows).
  const presentStudentIds = new Set(sAtt.filter(isStudentPresent).map((r) => r.student_id));
  const studentDenom = Math.max(students.length, presentStudentIds.size);
  const studentsPresent = Math.min(presentStudentIds.size, studentDenom);
  const studentsAbsent = Math.max(0, studentDenom - studentsPresent);

  const teacherPie = [
    { name: "On time", value: teachersOnTime, fill: COLORS.brightGreen },
    { name: "Late", value: teachersLate, fill: COLORS.gold },
    { name: "Absent", value: teachersAbsent, fill: COLORS.red },
  ];
  const headPie = [
    { name: "On time", value: headsOnTime, fill: COLORS.brightGreen },
    { name: "Late", value: headsLate, fill: COLORS.gold },
    { name: "Absent", value: headsAbsent, fill: COLORS.red },
  ];
  const studentPie = [
    { name: "Present", value: studentsPresent, fill: COLORS.brightGreen },
    { name: "Not marked", value: studentsAbsent, fill: COLORS.muted },
  ];

  const lgaChart = useMemo(() => {
    const schoolToLga = new Map(schools.map((s) => [s.id, s.lga]));
    const lgas = new Map<string, { lga: string; teachers: number; tPresent: number; students: number; sPresent: number }>();
    for (const s of schools) {
      const cur = lgas.get(s.lga) ?? { lga: s.lga, teachers: 0, tPresent: 0, students: 0, sPresent: 0 };
      lgas.set(s.lga, cur);
    }
    for (const t of teachers) {
      const lga = t.school_id ? schoolToLga.get(t.school_id) : null;
      if (!lga) continue; lgas.get(lga)!.teachers += 1;
    }
    for (const r of teacherOnlyAtt) {
      const lga = r.school_id ? schoolToLga.get(r.school_id) : null;
      if (!lga || !r.arrival_time) continue; lgas.get(lga)!.tPresent += 1;
    }
    for (const st of students) {
      const lga = schoolToLga.get(st.school_id); if (!lga) continue; lgas.get(lga)!.students += 1;
    }
    for (const r of sAtt) {
      const lga = schoolToLga.get(r.school_id); if (!lga || !isStudentPresent(r)) continue; lgas.get(lga)!.sPresent += 1;
    }
    return Array.from(lgas.values())
      .map((r) => ({ name: prettyLga(r.lga), Pupils: safePct(r.sPresent, r.students), Teachers: safePct(r.tPresent, r.teachers) }))
      .sort((a, b) => b.Pupils - a.Pupils)
      .slice(0, 10);
  }, [schools, teachers, students, teacherOnlyAtt, sAtt]);

  const typeBar = useMemo(() => {
    const schoolToCat = new Map(schools.map((s) => [s.id, s.category ?? "other"]));
    const buckets = new Map<string, { name: string; teachers: number; tPresent: number; students: number; sPresent: number }>();
    for (const s of schools) {
      const c = s.category ?? "other";
      buckets.set(c, buckets.get(c) ?? { name: prettyCategory(c), teachers: 0, tPresent: 0, students: 0, sPresent: 0 });
    }
    for (const t of teachers) {
      const c = t.school_id ? schoolToCat.get(t.school_id) : null;
      if (!c) continue; buckets.get(c)!.teachers += 1;
    }
    for (const r of teacherOnlyAtt) {
      const c = r.school_id ? schoolToCat.get(r.school_id) : null;
      if (!c || !r.arrival_time) continue; buckets.get(c)!.tPresent += 1;
    }
    for (const st of students) {
      const c = schoolToCat.get(st.school_id); if (!c) continue; buckets.get(c)!.students += 1;
    }
    for (const r of sAtt) {
      const c = schoolToCat.get(r.school_id); if (!c || !isStudentPresent(r)) continue; buckets.get(c)!.sPresent += 1;
    }
    return Array.from(buckets.values()).map((r) => ({ name: r.name, Pupils: safePct(r.sPresent, r.students), Teachers: safePct(r.tPresent, r.teachers) }));
  }, [schools, teachers, students, teacherOnlyAtt, sAtt]);

  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        subtitle="Charts and insights across the Edo State network"
        icon={BarChart3}
        actions={
          <ExportButton
            filename="analytics-summary"
            title="Analytics Summary"
            rows={[
              ...lgaChart.map((r) => ({ section: "Top LGAs", name: r.name, pupils: `${r.Pupils}%`, teachers: `${r.Teachers}%` })),
              ...typeBar.map((r) => ({ section: "School type", name: r.name, pupils: `${r.Pupils}%`, teachers: `${r.Teachers}%` })),
            ]}
            columns={[
              { header: "Section", accessor: (r) => r.section },
              { header: "Name", accessor: (r) => r.name },
              { header: "Pupils present %", accessor: (r) => r.pupils },
              { header: "Teachers present %", accessor: (r) => r.teachers },
            ]}
          />
        }
      />

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-border bg-head-teacher-card shadow-card p-4 sm:p-5">
          <h3 className="font-display font-semibold mb-4">Teacher status today</h3>
          <ChartContainer config={{}} className="aspect-auto h-72">
            <PieChart>
              <Pie data={teacherPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {teacherPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
            </PieChart>
          </ChartContainer>
        </div>

        <div className="rounded-2xl border border-border bg-head-teacher-card shadow-card p-4 sm:p-5">
          <h3 className="font-display font-semibold mb-4">Head teacher status today</h3>
          <ChartContainer config={{}} className="aspect-auto h-72">
            <PieChart>
              <Pie data={headPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {headPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
            </PieChart>
          </ChartContainer>
        </div>

        <div className="rounded-2xl border border-border bg-head-teacher-card shadow-card p-4 sm:p-5">
          <h3 className="font-display font-semibold mb-4">Pupil status today</h3>
          <ChartContainer config={{}} className="aspect-auto h-72">
            <PieChart>
              <Pie data={studentPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {studentPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
            </PieChart>
          </ChartContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-head-teacher-card shadow-card p-4 sm:p-5 mb-6">
        <h3 className="font-display font-semibold mb-1">Top 10 LGAs by pupil attendance</h3>
        <p className="text-xs text-muted-foreground mb-4">Percentage present today</p>
        <ChartContainer
          config={{
            Pupils: { label: "Pupils", color: COLORS.brightGreen },
            Teachers: { label: "Teachers", color: COLORS.green },
          }}
          className="aspect-auto h-80"
        >
          <BarChart data={lgaChart} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={70} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="Pupils" fill="var(--color-Pupils)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Teachers" fill="var(--color-Teachers)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      <LgaRankChart
        title="Top 10 LGAs by teacher attendance"
        seriesName="Teachers"
        color={COLORS.green}
        schools={schools}
        people={teachers}
        attendance={teacherOnlyAtt}
      />

      <LgaRankChart
        title="Top 10 LGAs by head teacher attendance"
        seriesName="Head teachers"
        color={COLORS.gold}
        schools={schools}
        people={headTeachers}
        attendance={headOnlyAtt}
      />




      <div className="rounded-2xl border border-border bg-head-teacher-card shadow-card p-4 sm:p-5">
        <h3 className="font-display font-semibold mb-4">School type comparison</h3>
        <ChartContainer
          config={{
            Pupils: { label: "Pupils", color: COLORS.brightGreen },
            Teachers: { label: "Teachers", color: COLORS.green },
          }}
          className="aspect-auto h-72"
        >
          <BarChart data={typeBar} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="Pupils" fill="var(--color-Pupils)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Teachers" fill="var(--color-Teachers)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}

type LgaRankChartProps = {
  title: string;
  seriesName: string;
  color: string;
  schools: ReturnType<typeof useSchools>["data"] extends (infer U)[] | undefined ? U[] : never;
  people: { user_id: string; school_id: string | null }[];
  attendance: { school_id: string | null; arrival_time: string | null }[];
};

function LgaRankChart({ title, seriesName, color, schools, people, attendance }: LgaRankChartProps) {
  const data = useMemo(() => {
    const schoolToLga = new Map((schools ?? []).map((s) => [s.id, s.lga]));
    const lgas = new Map<string, { lga: string; total: number; present: number }>();
    for (const s of schools ?? []) {
      if (!lgas.has(s.lga)) lgas.set(s.lga, { lga: s.lga, total: 0, present: 0 });
    }
    for (const p of people) {
      const lga = p.school_id ? schoolToLga.get(p.school_id) : null;
      if (!lga) continue;
      lgas.get(lga)!.total += 1;
    }
    for (const r of attendance) {
      const lga = r.school_id ? schoolToLga.get(r.school_id) : null;
      if (!lga || !r.arrival_time) continue;
      lgas.get(lga)!.present += 1;
    }
    return Array.from(lgas.values())
      .map((r) => ({ name: prettyLga(r.lga), value: safePct(r.present, r.total) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [schools, people, attendance]);

  return (
    <div className="rounded-2xl border border-border bg-head-teacher-card shadow-card p-4 sm:p-5 mb-6">
      <h3 className="font-display font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-4">Percentage present today</p>
      <ChartContainer
        config={{ [seriesName]: { label: seriesName, color } }}
        className="aspect-auto h-80"
      >
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={70} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          <Bar dataKey="value" name={seriesName} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

