import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useEffect } from "react";
import { Map as MapIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import {
  useSchools,
  useTeacherProfiles,
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
  const { data: teachers = [] } = useTeacherProfiles();
  const { data: students = [] } = useStudents();
  const { data: tAtt = [] } = useTeacherAttendanceToday();
  const { data: sAtt = [] } = useStudentAttendanceToday();

  // Fix default Leaflet icon URLs (not strictly needed for CircleMarkers, but safe)
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
  }, []);

  const points = useMemo(() => {
    const teacherBySchool = new Map<string, { total: number; present: number }>();
    for (const t of teachers) {
      if (!t.school_id) continue;
      const cur = teacherBySchool.get(t.school_id) ?? { total: 0, present: 0 };
      cur.total += 1;
      teacherBySchool.set(t.school_id, cur);
    }
    for (const r of tAtt) {
      if (!r.school_id || !r.arrival_time) continue;
      const cur = teacherBySchool.get(r.school_id);
      if (cur) cur.present += 1;
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
        const tRaw = teacherBySchool.get(s.id) ?? { total: 0, present: 0 };
        const stRaw = studentBySchool.get(s.id) ?? { total: 0, present: 0 };
        const t = { total: tRaw.total, present: Math.min(tRaw.present, tRaw.total) };
        const st = { total: stRaw.total, present: Math.min(stRaw.present, stRaw.total) };
        return { school: s, t, st, pupilPct: safePct(st.present, st.total), teacherPct: safePct(t.present, t.total) };
      });
  }, [schools, teachers, students, tAtt, sAtt]);

  const colorFor = (pct: number) => {
    if (pct >= 75) return "oklch(0.55 0.18 148)"; // green
    if (pct >= 40) return "oklch(0.74 0.15 80)"; // gold
    return "oklch(0.55 0.21 27)"; // red
  };

  return (
    <div>
      <AdminPageHeader title="Attendance Map" subtitle="Zoom in on each school across Edo State" icon={MapIcon} />

      <div className="rounded-2xl border border-border bg-head-teacher-card shadow-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex flex-wrap items-center gap-4 text-xs">
          <span className="font-medium">Pupil attendance:</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "oklch(0.55 0.18 148)" }} /> ≥ 75%</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "oklch(0.74 0.15 80)" }} /> 40–74%</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "oklch(0.55 0.21 27)" }} /> &lt; 40%</span>
          <span className="ml-auto text-muted-foreground">{points.length} schools</span>
        </div>
        <div style={{ height: "calc(100vh - 280px)", minHeight: 480 }}>
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
                pathOptions={{ color: colorFor(p.pupilPct), fillColor: colorFor(p.pupilPct), fillOpacity: 0.7, weight: 2 }}
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
