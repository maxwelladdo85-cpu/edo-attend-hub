import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ExportButton } from "@/components/ExportButton";

export const Route = createFileRoute("/admin/lga")({
  component: ByLgaPage,
});

function ByLgaPage() {
  const { data: schools = [] } = useSchools();
  const { data: staff = [] } = useStaffProfiles();
  const teachers = useMemo(() => staff.filter((s) => s.role === "teacher"), [staff]);
  const teacherUserIds = useMemo(() => new Set(teachers.map((t) => t.user_id)), [teachers]);
  const { data: students = [] } = useStudents();
  const { data: tAtt = [] } = useTeacherAttendanceToday();
  const { data: sAtt = [] } = useStudentAttendanceToday();

  const [selectedLga, setSelectedLga] = useState<string>("all");
  const [selectedSchoolType, setSelectedSchoolType] = useState<string>("all");

  const lgaOptions = useMemo(() => {
    const list = Array.from(new Set(schools.map((s) => s.lga))).filter(Boolean);
    list.sort();
    return list;
  }, [schools]);

  const schoolTypeOptions = useMemo(() => {
    const cats = Array.from(new Set(schools.map((s) => s.category))).filter(Boolean) as string[];
    cats.sort();
    return cats;
  }, [schools]);

  const filteredSchoolIds = useMemo(() => {
    return new Set(
      schools
        .filter((s) => {
          if (selectedLga !== "all" && s.lga !== selectedLga) return false;
          if (selectedSchoolType !== "all" && s.category !== selectedSchoolType) return false;
          return true;
        })
        .map((s) => s.id)
    );
  }, [schools, selectedLga, selectedSchoolType]);

  const rows = useMemo(() => {
    const schoolToLga = new Map(
      schools
        .filter((s) => filteredSchoolIds.has(s.id))
        .map((s) => [s.id, s.lga])
    );

    const lgas = new Map<string, {
      lga: string;
      schools: number;
      teachers: number;
      teachersPresent: number;
      students: number;
      studentsPresent: number;
    }>();

    for (const s of schools) {
      if (!filteredSchoolIds.has(s.id)) continue;
      const cur = lgas.get(s.lga) ?? { lga: s.lga, schools: 0, teachers: 0, teachersPresent: 0, students: 0, studentsPresent: 0 };
      cur.schools += 1;
      lgas.set(s.lga, cur);
    }
    for (const t of teachers) {
      if (!t.school_id || !filteredSchoolIds.has(t.school_id)) continue;
      const lga = schoolToLga.get(t.school_id);
      if (!lga) continue;
      const cur = lgas.get(lga); if (!cur) continue;
      cur.teachers += 1;
    }
    for (const r of tAtt) {
      if (!r.school_id || !filteredSchoolIds.has(r.school_id)) continue;
      if (!teacherUserIds.has(r.teacher_user_id)) continue; // exclude head teachers
      const lga = schoolToLga.get(r.school_id);
      if (!lga || !r.arrival_time) continue;
      const cur = lgas.get(lga); if (!cur) continue;
      cur.teachersPresent += 1;
    }
    for (const st of students) {
      if (!filteredSchoolIds.has(st.school_id)) continue;
      const lga = schoolToLga.get(st.school_id);
      if (!lga) continue;
      const cur = lgas.get(lga); if (!cur) continue;
      cur.students += 1;
    }
    for (const r of sAtt) {
      if (!filteredSchoolIds.has(r.school_id)) continue;
      const lga = schoolToLga.get(r.school_id);
      if (!lga || !isStudentPresent(r)) continue;
      const cur = lgas.get(lga); if (!cur) continue;
      cur.studentsPresent += 1;
    }

    return Array.from(lgas.values())
      .map((r) => ({
        ...r,
        teachersPresent: Math.min(r.teachersPresent, r.teachers),
        studentsPresent: Math.min(r.studentsPresent, r.students),
        teacherPct: safePct(r.teachersPresent, r.teachers),
        studentPct: safePct(r.studentsPresent, r.students),
      }))
      .sort((a, b) => a.lga.localeCompare(b.lga));
  }, [schools, teachers, students, tAtt, sAtt, filteredSchoolIds]);

  const chartData = rows.map((r) => ({ lga: prettyLga(r.lga), Teachers: r.teacherPct, Pupils: r.studentPct }));

  return (
    <div>
      <AdminPageHeader
        title="Attendance by LGA"
        subtitle="Live attendance broken down by Local Government Area"
        icon={Building2}
        actions={
          <ExportButton
            filename="attendance-by-lga"
            title="Attendance by LGA"
            rows={rows}
            columns={[
              { header: "LGA", accessor: (r) => prettyLga(r.lga) },
              { header: "Schools", accessor: (r) => r.schools },
              { header: "Teachers", accessor: (r) => r.teachers },
              { header: "Teachers present", accessor: (r) => r.teachersPresent },
              { header: "Teachers present %", accessor: (r) => `${r.teacherPct}%` },
              { header: "Pupils", accessor: (r) => r.students },
              { header: "Pupils present", accessor: (r) => r.studentsPresent },
              { header: "Pupils present %", accessor: (r) => `${r.studentPct}%` },
            ]}
          />
        }
      />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1">
            LGA
          </label>
          <Select value={selectedLga} onValueChange={setSelectedLga}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All LGAs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All LGAs</SelectItem>
              {lgaOptions.map((l) => (
                <SelectItem key={l} value={l}>
                  {prettyLga(l)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1">
            School type
          </label>
          <Select value={selectedSchoolType} onValueChange={setSelectedSchoolType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {schoolTypeOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {prettyCategory(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
