import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, MapPin, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { distanceMeters } from "@/lib/geo";
import { ExportButton } from "@/components/ExportButton";
import { fetchAllPaged } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/flagged")({
  head: () => ({ meta: [{ title: "Flagged Teachers — EdoSAS" }] }),
  component: FlaggedPage,
});

type Row = {
  id: string;
  teacher_user_id: string;
  school_id: string | null;
  attendance_date: string;
  arrival_time: string | null;
  arrival_status: string | null;
  arrival_lat: number | null;
  arrival_lng: number | null;
};
type School = {
  id: string;
  name: string;
  lga: string;
  category: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number | null;
};
type Profile = {
  user_id: string;
  full_name: string | null;
  teacher_id: string | null;
  phone: string | null;
};

function daysAgoStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function useFlagged({ fromDate, toDate }: { fromDate: string; toDate: string }) {
  return useQuery({
    queryKey: ["admin", "flagged", fromDate, toDate],
    queryFn: async () => {
      const attendance = await fetchAllPaged<Row>(async (from, to) => {
        const { data, error } = await supabase
          .from("teacher_attendance")
          .select(
            "id,teacher_user_id,school_id,attendance_date,arrival_time,arrival_status,arrival_lat,arrival_lng",
          )
          .gte("attendance_date", fromDate)
          .lte("attendance_date", toDate)
          .not("arrival_time", "is", null)
          .range(from, to);
        return { data: data as Row[] | null, error };
      });

      const schoolIds = Array.from(
        new Set(attendance.map((r) => r.school_id).filter(Boolean) as string[]),
      );
      const teacherIds = Array.from(new Set(attendance.map((r) => r.teacher_user_id)));

      const [schoolsRes, profilesRes] = await Promise.all([
        schoolIds.length
          ? supabase
              .from("schools")
              .select("id,name,lga,category,latitude,longitude,radius_meters")
              .in("id", schoolIds)
          : Promise.resolve({ data: [], error: null } as any),
        teacherIds.length
          ? supabase
              .from("profiles")
              .select("user_id,full_name,teacher_id,phone")
              .in("user_id", teacherIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (schoolsRes.error) throw schoolsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const schoolMap = new Map<string, School>(
        ((schoolsRes.data ?? []) as School[]).map((s) => [s.id, s]),
      );
      const profileMap = new Map<string, Profile>(
        ((profilesRes.data ?? []) as Profile[]).map((p) => [p.user_id, p]),
      );

      return attendance
        .map((r) => {
          const school = r.school_id ? schoolMap.get(r.school_id) : undefined;
          const profile = profileMap.get(r.teacher_user_id);
          let distance: number | null = null;
          if (
            school &&
            r.arrival_lat != null &&
            r.arrival_lng != null
          ) {
            distance = distanceMeters(
              r.arrival_lat,
              r.arrival_lng,
              school.latitude,
              school.longitude,
            );
          }
          const radius = school?.radius_meters ?? 20;
          const outOfRange = distance != null && distance > radius;
          const late = r.arrival_status === "late";
          return { row: r, school, profile, distance, radius, outOfRange, late };
        })
        .filter((x) => x.late || x.outOfRange);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function FlaggedPage() {
  const [fromDate, setFromDate] = useState(daysAgoStr(7));
  const [toDate, setToDate] = useState(daysAgoStr(0));
  const [filter, setFilter] = useState<"all" | "late" | "range">("all");
  const [q, setQ] = useState("");
  const [schoolType, setSchoolType] = useState<string>("all");
  const [lga, setLga] = useState<string>("all");
  const { data = [], isLoading } = useFlagged({ fromDate, toDate });


  const filtered = useMemo(() => {
    return data.filter((x) => {
      if (filter === "late" && !x.late) return false;
      if (filter === "range" && !x.outOfRange) return false;
      if (schoolType !== "all" && x.school?.category !== schoolType) return false;
      if (lga !== "all" && x.school?.lga !== lga) return false;
      if (q) {
        const needle = q.toLowerCase();
        const hay = [
          x.profile?.full_name,
          x.profile?.teacher_id,
          x.profile?.phone,
          x.school?.name,
          x.school?.lga,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data, filter, schoolType, lga, q]);

  const lateCount = data.filter((x) => x.late).length;
  const rangeCount = data.filter((x) => x.outOfRange).length;

  const schoolTypes = useMemo(() => {
    const cats = Array.from(new Set(data.map((x) => x.school?.category).filter(Boolean) as string[]));
    cats.sort();
    return cats;
  }, [data]);

  const lgas = useMemo(() => {
    const list = Array.from(new Set(data.map((x) => x.school?.lga).filter(Boolean) as string[]));
    list.sort();
    return list;
  }, [data]);

  const prettyCategory = (c: string | null) => {
    if (!c) return "Other";
    if (c === "primary") return "Primary";
    if (c === "junior_secondary") return "Junior Secondary";
    return c;
  };

  return (
    <div>
      <AdminPageHeader
        title="Flagged Teachers"
        subtitle="Teachers who arrived late or marked attendance outside the approved school radius"
        icon={AlertTriangle}
        actions={
          <ExportButton
            filename={`flagged-teachers-${fromDate}-to-${toDate}`}
            title={`Flagged Teachers · ${fromDate} to ${toDate}`}
            rows={filtered}
            columns={[
              { header: "Teacher", accessor: (x) => x.profile?.full_name ?? "Unknown" },
              { header: "Teacher ID", accessor: (x) => x.profile?.teacher_id ?? "" },
              { header: "Phone", accessor: (x) => x.profile?.phone ?? "" },
              { header: "School", accessor: (x) => x.school?.name ?? "" },
              { header: "LGA", accessor: (x) => x.school?.lga ?? "" },
              { header: "School Type", accessor: (x) => prettyCategory(x.school?.category ?? null) },
              { header: "Date", accessor: (x) => x.row.attendance_date },
              { header: "Arrival", accessor: (x) => x.row.arrival_time ? new Date(x.row.arrival_time).toLocaleString() : "" },
              { header: "Distance (m)", accessor: (x) => x.distance != null ? Math.round(x.distance) : "" },
              { header: "Radius (m)", accessor: (x) => x.radius },
              { header: "Late", accessor: (x) => x.late ? "Yes" : "No" },
              { header: "Out of range", accessor: (x) => x.outOfRange ? "Yes" : "No" },
            ]}
          />
        }
      />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1">
            From
          </label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-44"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1">
            To
          </label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All ({data.length})
          </Button>
          <Button
            variant={filter === "late" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("late")}
          >
            <Clock className="h-3.5 w-3.5 mr-1" /> Late ({lateCount})
          </Button>
          <Button
            variant={filter === "range" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("range")}
          >
            <MapPin className="h-3.5 w-3.5 mr-1" /> Out of range ({rangeCount})
          </Button>
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
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search teacher, school, or LGA"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Teacher</th>
                <th className="text-left px-3 py-2">School</th>
                <th className="text-left px-3 py-2">LGA</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Arrival</th>
                <th className="text-left px-3 py-2">Distance</th>
                <th className="text-left px-3 py-2">Flag</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    No flagged teachers for the selected period.
                  </td>
                </tr>
              )}
              {filtered.map((x) => (
                <tr key={x.row.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {x.profile?.full_name ?? "Unknown teacher"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {x.profile?.teacher_id ?? "—"}
                      {x.profile?.phone ? ` · ${x.profile.phone}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">{x.school?.name ?? "—"}</td>
                  <td className="px-3 py-2">{x.school?.lga ?? "—"}</td>
                  <td className="px-3 py-2">{x.row.attendance_date}</td>
                  <td className="px-3 py-2">
                    {x.row.arrival_time
                      ? new Date(x.row.arrival_time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {x.distance != null
                      ? `${Math.round(x.distance).toLocaleString()} m (limit ${x.radius} m)`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {x.late && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-warning px-2 py-0.5 text-xs">
                          <Clock className="h-3 w-3" /> Late
                        </span>
                      )}
                      {x.outOfRange && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive px-2 py-0.5 text-xs">
                          <MapPin className="h-3 w-3" /> Out of range
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
