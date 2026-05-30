import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Building2 } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import {
  useSchools,
  useTeacherProfiles,
  useStudents,
  useTeacherAttendanceToday,
  useStudentAttendanceToday,
  isStudentPresent,
  prettyLga,
  safePct,
} from "@/lib/admin-data";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export const Route = createFileRoute("/admin/lga")({
  component: ByLgaPage,
});

function ByLgaPage() {
  const { data: schools = [] } = useSchools();
  const { data: teachers = [] } = useTeacherProfiles();
  const { data: students = [] } = useStudents();
  const { data: tAtt = [] } = useTeacherAttendanceToday();
  const { data: sAtt = [] } = useStudentAttendanceToday();

  const rows = useMemo(() => {
    const schoolToLga = new Map(schools.map((s) => [s.id, s.lga]));
    const lgas = new Map<string, {
      lga: string;
      schools: number;
      teachers: number;
      teachersPresent: number;
      students: number;
      studentsPresent: number;
    }>();

    for (const s of schools) {
      const cur = lgas.get(s.lga) ?? { lga: s.lga, schools: 0, teachers: 0, teachersPresent: 0, students: 0, studentsPresent: 0 };
      cur.schools += 1;
      lgas.set(s.lga, cur);
    }
    for (const t of teachers) {
      const lga = t.school_id ? schoolToLga.get(t.school_id) : null;
      if (!lga) continue;
      const cur = lgas.get(lga); if (!cur) continue;
      cur.teachers += 1;
    }
    for (const r of tAtt) {
      const lga = r.school_id ? schoolToLga.get(r.school_id) : null;
      if (!lga || !r.arrival_time) continue;
      const cur = lgas.get(lga); if (!cur) continue;
      cur.teachersPresent += 1;
    }
    for (const st of students) {
      const lga = schoolToLga.get(st.school_id);
      if (!lga) continue;
      const cur = lgas.get(lga); if (!cur) continue;
      cur.students += 1;
    }
    for (const r of sAtt) {
      const lga = schoolToLga.get(r.school_id);
      if (!lga || !isStudentPresent(r)) continue;
      const cur = lgas.get(lga); if (!cur) continue;
      cur.studentsPresent += 1;
    }

    return Array.from(lgas.values())
      .map((r) => ({
        ...r,
        teacherPct: r.teachers ? Math.round((r.teachersPresent / r.teachers) * 100) : 0,
        studentPct: r.students ? Math.round((r.studentsPresent / r.students) * 100) : 0,
      }))
      .sort((a, b) => a.lga.localeCompare(b.lga));
  }, [schools, teachers, students, tAtt, sAtt]);

  const chartData = rows.map((r) => ({ lga: prettyLga(r.lga), Teachers: r.teacherPct, Pupils: r.studentPct }));

  return (
    <div>
      <AdminPageHeader title="Attendance by LGA" subtitle="Live attendance broken down by Local Government Area" icon={Building2} />

      <div className="rounded-2xl border border-border bg-head-teacher-card shadow-card p-4 sm:p-5 mb-6">
        <h3 className="font-display font-semibold mb-4">Present today (%)</h3>
        <div className="w-full overflow-x-auto">
          <div style={{ minWidth: Math.max(600, rows.length * 60) }}>
            <ChartContainer
              config={{
                Teachers: { label: "Teachers", color: "oklch(0.45 0.13 150)" },
                Pupils: { label: "Pupils", color: "oklch(0.74 0.15 80)" },
              }}
              className="aspect-auto h-72"
            >
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="lga" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={70} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="Teachers" fill="var(--color-Teachers)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pupils" fill="var(--color-Pupils)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-head-teacher-card shadow-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border">
          <h3 className="font-display font-semibold">Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left p-3">LGA</th>
                <th className="text-right p-3">Schools</th>
                <th className="text-right p-3">Teachers</th>
                <th className="text-right p-3">Teachers present</th>
                <th className="text-right p-3">Pupils</th>
                <th className="text-right p-3">Pupils present</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.lga} className="hover:bg-muted/30">
                  <td className="p-3 font-medium">{prettyLga(r.lga)}</td>
                  <td className="p-3 text-right">{r.schools}</td>
                  <td className="p-3 text-right">{r.teachers}</td>
                  <td className="p-3 text-right">
                    <span className="font-medium">{r.teachersPresent}</span>
                    <span className="text-muted-foreground"> ({r.teacherPct}%)</span>
                  </td>
                  <td className="p-3 text-right">{r.students}</td>
                  <td className="p-3 text-right">
                    <span className="font-medium">{r.studentsPresent}</span>
                    <span className="text-muted-foreground"> ({r.studentPct}%)</span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
