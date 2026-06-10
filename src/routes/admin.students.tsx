import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ExportButton } from "@/components/ExportButton";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { useAdminDateRange } from "@/contexts/AdminDateRangeContext";

export const Route = createFileRoute("/admin/students")({
  head: () => ({ meta: [{ title: "Admitted Pupils — EdoSAS" }] }),
  component: StudentsPage,
});

type Student = {
  id: string;
  student_id: string;
  full_name: string;
  class: string;
  gender: string | null;
  school_id: string;
  parent_contact: string | null;
  parent_nin: string | null;
  created_at: string;
};
type School = { id: string; name: string; lga: string; category: string | null };

function useAllStudents() {
  return useQuery({
    queryKey: ["admin", "students-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(
          "id,student_id,full_name,class,gender,school_id,parent_contact,parent_nin,created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      const students = (data ?? []) as Student[];
      const ids = Array.from(new Set(students.map((s) => s.school_id)));
      const { data: schoolsData } = ids.length
        ? await supabase.from("schools").select("id,name,lga,category").in("id", ids)
        : { data: [] as School[] };
      const schoolMap = new Map<string, School>(
        ((schoolsData ?? []) as School[]).map((s: School) => [s.id, s]),
      );
      return students.map((s) => ({ ...s, school: schoolMap.get(s.school_id) }));
    },
  });
}

function StudentsPage() {
  const { data = [], isLoading } = useAllStudents();
  const { from, to } = useAdminDateRange();
  const [q, setQ] = useState("");
  const [schoolType, setSchoolType] = useState<string>("all");
  const [lga, setLga] = useState<string>("all");

  const schoolTypes = useMemo(() => {
    const cats = Array.from(new Set(data.map((s) => s.school?.category).filter(Boolean) as string[]));
    cats.sort();
    return cats;
  }, [data]);

  const lgas = useMemo(() => {
    const list = Array.from(new Set(data.map((s) => s.school?.lga).filter(Boolean) as string[]));
    list.sort();
    return list;
  }, [data]);

  const prettyCategory = (c: string | null) => {
    if (!c) return "Other";
    if (c === "primary") return "Primary";
    if (c === "junior_secondary") return "Junior Secondary";
    return c;
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    // End of day for the "to" date so the full day is inclusive.
    const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const toMs = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
    return data.filter((s) => {
      if (schoolType !== "all" && s.school?.category !== schoolType) return false;
      if (lga !== "all" && s.school?.lga !== lga) return false;
      const created = new Date(s.created_at).getTime();
      if (created < fromMs || created > toMs) return false;
      if (!term) return true;
      return [s.full_name, s.student_id, s.class, s.school?.name, s.school?.lga, s.parent_contact, s.parent_nin]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [data, q, schoolType, lga, from, to]);

  return (
    <div>
      <AdminPageHeader
        title="Admitted Pupils"
        subtitle={`All students admitted by teachers · ${data.length.toLocaleString()} total`}
        icon={GraduationCap}
        actions={
          <ExportButton
            filename="admitted-pupils"
            title="Admitted Pupils"
            rows={rows}
            columns={[
              { header: "Student", accessor: (s) => s.full_name },
              { header: "Student ID", accessor: (s) => s.student_id },
              { header: "Class", accessor: (s) => s.class },
              { header: "Gender", accessor: (s) => s.gender ?? "" },
              { header: "School", accessor: (s) => s.school?.name ?? "" },
              { header: "LGA", accessor: (s) => s.school?.lga ?? "" },
              { header: "School Type", accessor: (s) => prettyCategory(s.school?.category ?? null) },
              { header: "Parent Contact", accessor: (s) => s.parent_contact ?? "" },
              { header: "Parent NIN", accessor: (s) => s.parent_nin ?? "" },
              { header: "Admitted", accessor: (s) => new Date(s.created_at).toLocaleDateString() },
            ]}
          />
        }
      />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, student ID, class, school, NIN…"
            className="pl-9"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1">
            School type
          </label>
          <Select value={schoolType} onValueChange={setSchoolType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {schoolTypes.map((c) => (
                <SelectItem key={c} value={c}>
                  {prettyCategory(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1">
            LGA
          </label>
          <Select value={lga} onValueChange={setLga}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All LGAs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All LGAs</SelectItem>
              {lgas.map((l) => (
                <SelectItem key={l} value={l}>
                  {l
                    .split("-")
                    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                    .join(" ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Student ID</th>
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Gender</th>
                <th className="text-left px-4 py-3">School</th>
                <th className="text-left px-4 py-3">LGA</th>
                <th className="text-left px-4 py-3">Parent Contact</th>
                <th className="text-left px-4 py-3">Parent NIN</th>
                <th className="text-left px-4 py-3">Admitted</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No students found</td></tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.student_id}</td>
                    <td className="px-4 py-3">{s.class}</td>
                    <td className="px-4 py-3">{s.gender ?? "—"}</td>
                    <td className="px-4 py-3">{s.school?.name ?? "—"}</td>
                    <td className="px-4 py-3">{s.school?.lga ?? "—"}</td>
                    <td className="px-4 py-3">{s.parent_contact ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.parent_nin ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
