import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

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
type School = { id: string; name: string; lga: string };

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
        ? await supabase.from("schools").select("id,name,lga").in("id", ids)
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
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((s) =>
      [s.full_name, s.student_id, s.class, s.school?.name, s.school?.lga, s.parent_contact, s.parent_nin]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [data, q]);

  return (
    <div>
      <AdminPageHeader
        title="Admitted Pupils"
        subtitle={`All students admitted by teachers · ${data.length.toLocaleString()} total`}
        icon={GraduationCap}
      />

      <div className="relative mb-4 max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, student ID, class, school, NIN…"
          className="pl-9"
        />
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
