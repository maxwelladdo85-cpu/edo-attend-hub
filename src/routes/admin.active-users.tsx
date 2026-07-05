import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import { ExportButton } from "@/components/ExportButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSchools, useStaffProfiles } from "@/lib/admin-data";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/admin/active-users")({
  head: () => ({ meta: [{ title: "Active Users — EdoSAS" }] }),
  component: ActiveUsersPage,
});

type AttRow = { teacher_user_id: string; attendance_date: string; arrival_time: string | null };

function ActiveUsersPage() {
  const { data: staff = [], isLoading } = useStaffProfiles();
  const { data: schools = [] } = useSchools();
  const [search, setSearch] = useState("");

  const { data: recentAtt = [] } = useQuery({
    queryKey: ["admin", "active-users-att"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("teacher_user_id,attendance_date,arrival_time")
        .gte("attendance_date", since.toISOString().slice(0, 10))
        .order("attendance_date", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return (data ?? []) as AttRow[];
    },
    staleTime: 60_000,
  });

  const schoolNameById = useMemo(() => {
    const m = new Map<string, string>();
    schools.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [schools]);

  const attByUser = useMemo(() => {
    const m = new Map<string, { last: string; days: Set<string> }>();
    for (const r of recentAtt) {
      const cur = m.get(r.teacher_user_id) ?? { last: "", days: new Set<string>() };
      cur.days.add(r.attendance_date);
      if (r.arrival_time && (!cur.last || r.arrival_time > cur.last)) cur.last = r.arrival_time;
      m.set(r.teacher_user_id, cur);
    }
    return m;
  }, [recentAtt]);

  const today = new Date().toISOString().slice(0, 10);

  const rows = useMemo(() => {
    return staff.map((s) => {
      const att = attByUser.get(s.user_id);
      const active = att?.days.has(today) ?? false;
      return {
        user_id: s.user_id,
        name: s.full_name,
        oracle_id: s.teacher_id ?? "",
        role: s.role === "head_teacher" ? "Head Teacher" : "Teacher",
        school: schoolNameById.get(s.school_id ?? "") ?? "Unassigned",
        class_taught: s.class_taught ?? "",
        last_seen: att?.last ?? "",
        days_active_30: att?.days.size ?? 0,
        status: active ? "Active today" : att?.days.size ? "Recently active" : "Inactive",
      };
    });
  }, [staff, attByUser, schoolNameById, today]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.oracle_id.toLowerCase().includes(q) ||
        r.school.toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div>
      <AdminPageHeader
        title="Active Users"
        subtitle="Teachers & head teachers with recent activity (last 30 days)"
        icon={Activity}
        actions={
          <ExportButton
            filename={`active-users-${today}`}
            title="Active Users"
            rows={filtered}
            columns={[
              { header: "Full Name", accessor: (r) => r.name },
              { header: "Oracle ID", accessor: (r) => r.oracle_id },
              { header: "Role", accessor: (r) => r.role },
              { header: "School", accessor: (r) => r.school },
              { header: "Class Taught", accessor: (r) => r.class_taught },
              { header: "Last Sign-in", accessor: (r) => r.last_seen ? new Date(r.last_seen).toLocaleString() : "" },
              { header: "Active Days (30d)", accessor: (r) => r.days_active_30 },
              { header: "Status", accessor: (r) => r.status },
            ]}
          />
        }
      />

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, Oracle ID or school"
              className="pl-9"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Oracle ID</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3">30-day activity</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No users found.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.user_id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.oracle_id || "—"}</td>
                    <td className="px-4 py-3">{r.role}</td>
                    <td className="px-4 py-3">{r.school}</td>
                    <td className="px-4 py-3">{r.class_taught || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.last_seen ? formatDistanceToNow(new Date(r.last_seen), { addSuffix: true }) : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.days_active_30} days</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={
                          r.status === "Active today"
                            ? "bg-success/10 text-success border-success/20"
                            : r.status === "Recently active"
                            ? "bg-warning/10 text-warning border-warning/20"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {r.status}
                      </Badge>
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
