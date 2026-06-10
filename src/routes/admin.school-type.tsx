import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { School as SchoolIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import { StatCard } from "@/components/StatCard";
import {
  useSchools,
  useTeacherProfiles,
  useStudents,
  useTeacherAttendanceRange,
  useStudentAttendanceRange,
  isStudentPresent,
  prettyCategory,
  safePct,
} from "@/lib/admin-data";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ExportButton } from "@/components/ExportButton";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { useAdminDateRange } from "@/contexts/AdminDateRangeContext";

export const Route = createFileRoute("/admin/school-type")({
  component: BySchoolTypePage,
});

function BySchoolTypePage() {
  const { from, to } = useAdminDateRange();
  const { data: schools = [] } = useSchools();
  const { data: teachers = [] } = useTeacherProfiles();
  const { data: students = [] } = useStudents();
  const { data: tAtt = [] } = useTeacherAttendanceRange(from, to);
  const { data: sAtt = [] } = useStudentAttendanceRange(from, to);

  const rows = useMemo(() => {
    const schoolToCat = new Map(schools.map((s) => [s.id, s.category ?? "other"]));
    const buckets = new Map<string, {
      category: string;
      schools: number;
      teachers: number;
      teachersPresent: number;
      students: number;
      studentsPresent: number;
    }>();

    for (const s of schools) {
      const c = s.category ?? "other";
      const cur = buckets.get(c) ?? { category: c, schools: 0, teachers: 0, teachersPresent: 0, students: 0, studentsPresent: 0 };
      cur.schools += 1;
      buckets.set(c, cur);
    }
    for (const t of teachers) {
      const c = t.school_id ? schoolToCat.get(t.school_id) : null;
      if (!c) continue;
      const cur = buckets.get(c); if (!cur) continue;
      cur.teachers += 1;
    }
    for (const r of tAtt) {
      const c = r.school_id ? schoolToCat.get(r.school_id) : null;
      if (!c || !r.arrival_time) continue;
      const cur = buckets.get(c); if (!cur) continue;
      cur.teachersPresent += 1;
    }
    for (const st of students) {
      const c = schoolToCat.get(st.school_id);
      if (!c) continue;
      const cur = buckets.get(c); if (!cur) continue;
      cur.students += 1;
    }
    for (const r of sAtt) {
      const c = schoolToCat.get(r.school_id);
      if (!c || !isStudentPresent(r)) continue;
      const cur = buckets.get(c); if (!cur) continue;
      cur.studentsPresent += 1;
    }
    return Array.from(buckets.values()).map((r) => ({
      ...r,
      teachersPresent: Math.min(r.teachersPresent, r.teachers),
      studentsPresent: Math.min(r.studentsPresent, r.students),
      teacherPct: safePct(r.teachersPresent, r.teachers),
      studentPct: safePct(r.studentsPresent, r.students),
    }));
  }, [schools, teachers, students, tAtt, sAtt]);

  const chartData = rows.map((r) => ({ type: prettyCategory(r.category), Teachers: r.teacherPct, Pupils: r.studentPct }));

  return (
    <div>
      <AdminPageHeader
        title="Attendance by School Type"
        subtitle="Comparison of Primary vs Junior Secondary schools"
        icon={SchoolIcon}
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <DateRangeFilter />
            <ExportButton
              filename={`attendance-by-school-type-${from}_to_${to}`}
              title={`Attendance by School Type · ${from} → ${to}`}
              rows={rows}
              columns={[
                { header: "School type", accessor: (r) => prettyCategory(r.category) },
                { header: "Schools", accessor: (r) => r.schools },
                { header: "Teachers", accessor: (r) => r.teachers },
                { header: "Teachers present", accessor: (r) => r.teachersPresent },
                { header: "Teachers present %", accessor: (r) => `${r.teacherPct}%` },
                { header: "Pupils", accessor: (r) => r.students },
                { header: "Pupils present", accessor: (r) => r.studentsPresent },
                { header: "Pupils present %", accessor: (r) => `${r.studentPct}%` },
              ]}
            />
          </div>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {rows.map((r) => (
          <StatCard
            key={r.category}
            icon={SchoolIcon}
            label={prettyCategory(r.category)}
            value={`${r.studentPct}%`}
            hint={`${r.schools} schools · ${r.teacherPct}% teachers present`}
            className="bg-head-teacher-card"
          />
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-head-teacher-card shadow-card p-4 sm:p-5 mb-6">
        <h3 className="font-display font-semibold mb-4">Present today (%)</h3>
        <ChartContainer
          config={{
            Teachers: { label: "Teachers", color: "oklch(0.45 0.13 150)" },
            Pupils: { label: "Pupils", color: "oklch(0.74 0.15 80)" },
          }}
          className="aspect-auto h-72"
        >
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="Teachers" fill="var(--color-Teachers)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Pupils" fill="var(--color-Pupils)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      <div className="rounded-2xl border border-border bg-head-teacher-card shadow-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border"><h3 className="font-display font-semibold">Breakdown</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left p-3">School type</th>
                <th className="text-right p-3">Schools</th>
                <th className="text-right p-3">Teachers present</th>
                <th className="text-right p-3">Pupils present</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.category} className="hover:bg-muted/30">
                  <td className="p-3 font-medium">{prettyCategory(r.category)}</td>
                  <td className="p-3 text-right">{r.schools}</td>
                  <td className="p-3 text-right">{r.teachersPresent} / {r.teachers} <span className="text-muted-foreground">({r.teacherPct}%)</span></td>
                  <td className="p-3 text-right">{r.studentsPresent} / {r.students} <span className="text-muted-foreground">({r.studentPct}%)</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
