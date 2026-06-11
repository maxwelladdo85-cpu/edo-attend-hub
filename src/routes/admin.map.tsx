import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useEffect } from "react";
import { Map as MapIcon } from "lucide-react";
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
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/admin/map")({
  component: MapPage,
});

// Edo State approximate center
const EDO_CENTER: [number, number] = [6.5, 6.0];

function MapPage() {
  const { data: schools = [] } = useSchools();
  const { data: staff = [] } = useStaffProfiles();
  const teachers = useMemo(() => staff.filter((s) => s.role === "teacher"), [staff]);
  const teacherUserIds = useMemo(() => new Set(teachers.map((t) => t.user_id)), [teachers]);
  const { data: students = [] } = useStudents();
  const { data: tAtt = [] } = useTeacherAttendanceToday();
  const { data: sAtt = [] } = useStudentAttendanceToday();

  // Fix default Leaflet icon URLs (not strictly needed for CircleMarkers, but safe)
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
  }, []);

  const points = useMemo(() => {
    const teacherBySchool = new Map<string, { total: number; present: number; onTime: number; late: number }>();
    for (const t of teachers) {
      if (!t.school_id) continue;
      const cur = teacherBySchool.get(t.school_id) ?? { total: 0, present: 0, onTime: 0, late: 0 };
      cur.total += 1;
      teacherBySchool.set(t.school_id, cur);
    }
    for (const r of tAtt) {
      if (!r.school_id || !r.arrival_time) continue;
      if (!teacherUserIds.has(r.teacher_user_id)) continue; // exclude head teachers
      const cur = teacherBySchool.get(r.school_id);
      if (!cur) continue;
      cur.present += 1;
      if (r.arrival_status === "late") cur.late += 1;
      else if (r.arrival_status === "on_time" || r.arrival_status === "early") cur.onTime += 1;
    }

    const studentBySchool = new Map<string, { total: number; present: number }>();
    for (const st of students) {
      const cur = studentBySchool.get(st.school_id) ?? { total: 0, present: 0 };
      cur.total += 1;
      studentBySchool.set(st.school_id, cur);
    }
    for (const r of sAtt) {
      if (!isStudentPresent(r)) continue;
      const cur = studentBySchool.get(r.school_id);
      if (cur) cur.present += 1;
    }

    return schools
      .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
      .map((s) => {
        const tRaw = teacherBySchool.get(s.id) ?? { total: 0, present: 0, onTime: 0, late: 0 };
        const stRaw = studentBySchool.get(s.id) ?? { total: 0, present: 0 };
        const t = {
          total: tRaw.total,
          present: Math.min(tRaw.present, tRaw.total),
          onTime: tRaw.onTime,
          late: tRaw.late,
        };
        const st = { total: stRaw.total, present: Math.min(stRaw.present, stRaw.total) };
        // Status: 'late' if any teacher arrived late today, 'on_time' if any
        // attendance recorded with no late arrivals, otherwise 'none'.
        const status: "late" | "on_time" | "none" =
          t.late > 0 ? "late" : t.onTime > 0 ? "on_time" : "none";
        return {
          school: s,
          t,
          st,
          pupilPct: safePct(st.present, st.total),
          teacherPct: safePct(t.present, t.total),
          status,
        };
      });
  }, [schools, teachers, teacherUserIds, students, tAtt, sAtt]);

  const colorFor = (status: "late" | "on_time" | "none") => {
    if (status === "on_time") return "oklch(0.55 0.18 148)"; // green
    if (status === "late") return "oklch(0.55 0.21 27)"; // red
    return "oklch(0.7 0.02 250)"; // neutral gray — no attendance yet
  };

  return (
    <div>
      <AdminPageHeader title="Attendance Map" subtitle="Zoom in on each school across Edo State" icon={MapIcon} />

      <div className="rounded-2xl border border-border bg-head-teacher-card shadow-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex flex-wrap items-center gap-4 text-xs">
          <span className="font-medium">Teacher arrival today:</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "oklch(0.55 0.18 148)" }} /> On time</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "oklch(0.55 0.21 27)" }} /> Late</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "oklch(0.7 0.02 250)" }} /> No attendance yet</span>
          <span className="ml-auto text-muted-foreground">{points.length} schools</span>
        </div>
        <div style={{ height: "calc(100dvh - 280px)", minHeight: 480 }}>
          <MapContainer center={EDO_CENTER} zoom={9} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {points.map((p) => (
              <CircleMarker
                key={p.school.id}
                center={[p.school.latitude, p.school.longitude]}
                radius={8}
                pathOptions={{ color: colorFor(p.status), fillColor: colorFor(p.status), fillOpacity: 0.75, weight: 2 }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{p.school.name}</div>
                    <div className="text-xs text-muted-foreground mb-2">{prettyLga(p.school.lga)} · {prettyCategory(p.school.category)}</div>
                    <div className="space-y-0.5">
                      <div><strong>Pupils:</strong> {p.st.present}/{p.st.total} ({p.pupilPct}%)</div>
                      <div><strong>Teachers:</strong> {p.t.present}/{p.t.total} ({p.teacherPct}%)</div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
