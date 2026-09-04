import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, GraduationCap, School as SchoolIcon, UserCheck, AlertCircle, Activity, ShieldCheck, Filter, X } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { AdminPageHeader } from "@/components/AdminShell";
import {
  useSchools,
  useTeacherProfiles,
  useStudents,
  useTeacherAttendanceToday,
  useStudentAttendanceToday,
  useStaffProfiles,
  isStudentPresent,
  prettyLga,
  prettyCategory,
} from "@/lib/admin-data";
import { ExportButton } from "@/components/ExportButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/")({
  component: OverviewPage,
});

function pct(n: number, d: number): string {
  if (!d) return "0.000";
  const value = Math.min(n, d) / d * 100;
  return value.toFixed(3);
}




function OverviewPage() {
  const { data: schools = [] } = useSchools();
  const { data: teachers = [] } = useTeacherProfiles();
  const { data: students = [] } = useStudents();
  const { data: staff = [] } = useStaffProfiles();
  const { data: tAtt = [] } = useTeacherAttendanceToday();
  const { data: sAtt = [] } = useStudentAttendanceToday();

  const [selectedLga, setSelectedLga] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");

  // Unique filter options
  const lgaOptions = useMemo(() => {
    const set = new Set(schools.map((s) => s.lga).filter(Boolean));
    return Array.from(set).sort();
  }, [schools]);

  const categoryOptions = useMemo(() => {
    const set = new Set(schools.map((s) => s.category).filter((c): c is string => Boolean(c)));
    return Array.from(set).sort();
  }, [schools]);

  // Schools matching LGA + category (used to populate the school-name filter).
  const schoolsInScope = useMemo(() => {
    return schools.filter((s) => {
      if (selectedLga !== "all" && s.lga !== selectedLga) return false;
      if (selectedCategory !== "all" && s.category !== selectedCategory) return false;
      return true;
    });
  }, [schools, selectedLga, selectedCategory]);

  // If the selected school no longer matches the LGA/category filters, drop it.
  const effectiveSchoolId = useMemo(() => {
    if (selectedSchoolId === "all") return "all";
    return schoolsInScope.some((s) => s.id === selectedSchoolId) ? selectedSchoolId : "all";
  }, [selectedSchoolId, schoolsInScope]);

  // Filter schools (LGA + category + specific school)
  const filteredSchools = useMemo(() => {
    if (effectiveSchoolId === "all") return schoolsInScope;
    return schoolsInScope.filter((s) => s.id === effectiveSchoolId);
  }, [schoolsInScope, effectiveSchoolId]);

  const filteredSchoolIds = useMemo(
    () => new Set(filteredSchools.map((s) => s.id)),
    [filteredSchools],
  );

  // Filter staff to those in selected schools
  const filteredStaff = useMemo(
    () => staff.filter((s) => !s.school_id || filteredSchoolIds.has(s.school_id)),
    [staff, filteredSchoolIds],
  );

  // Filter teachers
  const filteredTeachers = useMemo(
    () => teachers.filter((t) => !t.school_id || filteredSchoolIds.has(t.school_id)),
    [teachers, filteredSchoolIds],
  );

  // Filter students
  const filteredStudents = useMemo(
    () => students.filter((s) => filteredSchoolIds.has(s.school_id)),
    [students, filteredSchoolIds],
  );

  // Filter attendance to selected schools
  const filteredTAtt = useMemo(
    () => tAtt.filter((r) => !r.school_id || filteredSchoolIds.has(r.school_id)),
    [tAtt, filteredSchoolIds],
  );
  const filteredSAtt = useMemo(
    () => sAtt.filter((r) => filteredSchoolIds.has(r.school_id)),
    [sAtt, filteredSchoolIds],
  );

  // Split staff into head teachers vs teachers (by role from user_roles).
  const headTeacherIds = useMemo(
    () => new Set(filteredStaff.filter((s) => s.role === "head_teacher").map((s) => s.user_id)),
    [filteredStaff],
  );
  const teacherOnlyIds = useMemo(
    () => new Set(filteredStaff.filter((s) => s.role === "teacher").map((s) => s.user_id)),
    [filteredStaff],
  );

  // De-duplicate by teacher to avoid multiple attendance rows inflating counts.
  const presentTeacherIds = new Set(
    filteredTAtt.filter((r) => r.arrival_time).map((r) => r.teacher_user_id),
  );
  const lateTeacherIds = new Set(
    filteredTAtt.filter((r) => r.arrival_status === "late").map((r) => r.teacher_user_id),
  );
  const presentStudentIds = new Set(
    filteredSAtt.filter(isStudentPresent).map((r) => r.student_id),
  );

  // Head-teacher-specific attendance buckets (teacher_attendance covers both roles).
  const presentHeadIds = new Set(
    [...presentTeacherIds].filter((id) => headTeacherIds.has(id)),
  );
  const lateHeadIds = new Set([...lateTeacherIds].filter((id) => headTeacherIds.has(id)));
  const presentTeacherOnlyIds = new Set(
    [...presentTeacherIds].filter((id) => teacherOnlyIds.has(id) || (!headTeacherIds.has(id))),
  );
  const lateTeacherOnlyIds = new Set(
    [...lateTeacherIds].filter((id) => teacherOnlyIds.has(id) || (!headTeacherIds.has(id))),
  );

  // Denominator is the union of registered teachers and any teacher with an
  // attendance row today, so the percentage can never exceed 100%.
  const teacherDenom = new Set<string>([
    ...filteredTeachers.map((t) => t.user_id),
    ...filteredTAtt.filter((r) => !headTeacherIds.has(r.teacher_user_id)).map((r) => r.teacher_user_id),
  ]).size;
  const headDenom = new Set<string>([
    ...headTeacherIds,
    ...filteredTAtt.filter((r) => headTeacherIds.has(r.teacher_user_id)).map((r) => r.teacher_user_id),
  ]).size;
  const studentDenom = Math.max(filteredStudents.length, presentStudentIds.size);

  const teachersPresent = Math.min(presentTeacherOnlyIds.size, teacherDenom);
  const teachersLate = lateTeacherOnlyIds.size;
  const headsPresent = Math.min(presentHeadIds.size, headDenom);
  const headsLate = lateHeadIds.size;
  const studentsPresent = Math.min(presentStudentIds.size, studentDenom);

  const teacherPct = pct(teachersPresent, teacherDenom);
  const headPct = pct(headsPresent, headDenom);
  const studentPct = pct(studentsPresent, studentDenom);

  // Build subtitle based on active filters
  const activeFilters: string[] = [];
  if (selectedLga !== "all") activeFilters.push(prettyLga(selectedLga));
  if (selectedCategory !== "all") activeFilters.push(prettyCategory(selectedCategory));
  const selectedSchool = effectiveSchoolId !== "all" ? schoolsInScope.find((s) => s.id === effectiveSchoolId) : undefined;
  if (selectedSchool) activeFilters.push(selectedSchool.name);

  const subtitleText = activeFilters.length
    ? `Filtered: ${activeFilters.join(" · ")} · ${new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}`
    : `Live attendance across Edo State · ${new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}`;

  return (
    <div>
      <AdminPageHeader
        title="State-wide Overview"
        subtitle={subtitleText}
        icon={Activity}
        actions={
          <ExportButton
            filename={`statewide-overview-${new Date().toISOString().slice(0, 10)}`}
            title="State-wide Overview"
            rows={[
              { metric: "Schools", value: filteredSchools.length },
              { metric: "Primary schools", value: filteredSchools.filter((s) => s.category === "primary").length },
              { metric: "Junior Secondary schools", value: filteredSchools.filter((s) => s.category === "junior_secondary").length },
              { metric: "Head teachers (registered)", value: headDenom },
              { metric: "Teachers (registered)", value: teacherDenom },
              { metric: "Pupils (registered)", value: filteredStudents.length },
              { metric: "Head teachers present today", value: headsPresent },
              { metric: "Head teachers present %", value: `${headPct}%` },
              { metric: "Head teachers late today", value: headsLate },
              { metric: "Teachers present today", value: teachersPresent },
              { metric: "Teachers present %", value: `${teacherPct}%` },
              { metric: "Teachers late today", value: teachersLate },
              { metric: "Pupils present today", value: studentsPresent },
              { metric: "Pupils present %", value: `${studentPct}%` },
              { metric: "Pupils not marked", value: Math.max(0, filteredStudents.length - studentsPresent) },
            ]}
            columns={[
              { header: "Metric", accessor: (r) => r.metric },
              { header: "Value", accessor: (r) => r.value },
            ]}
          />
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filters</span>
        </div>
        <Select value={selectedLga} onValueChange={setSelectedLga}>
          <SelectTrigger className="w-full sm:w-[200px] bg-background">
            <SelectValue placeholder="All LGAs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All LGAs</SelectItem>
            {lgaOptions.map((lga) => (
              <SelectItem key={lga} value={lga}>
                {prettyLga(lga)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px] bg-background">
            <SelectValue placeholder="All School Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All School Types</SelectItem>
            {categoryOptions.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {prettyCategory(cat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={effectiveSchoolId}
          onValueChange={setSelectedSchoolId}
          disabled={schoolsInScope.length === 0}
        >
          <SelectTrigger className="w-full sm:w-[260px] bg-background">
            <SelectValue placeholder="All Schools" />
          </SelectTrigger>
          <SelectContent className="max-h-[320px]">
            <SelectItem value="all">All Schools ({schoolsInScope.length})</SelectItem>
            {schoolsInScope
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {(selectedLga !== "all" || selectedCategory !== "all" || effectiveSchoolId !== "all") && (
          <button
            onClick={() => { setSelectedLga("all"); setSelectedCategory("all"); setSelectedSchoolId("all"); }}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            {activeFilters.map((label) => (
              <Badge key={label} variant="secondary" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-primary via-primary/90 to-gold text-primary-foreground shadow-card mb-6">
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider opacity-80 truncate">Pupils present {activeFilters.length ? "(filtered)" : "statewide"}</div>
            <div className="mt-2 flex flex-col gap-1">
              <div className="text-3xl sm:text-4xl font-bold font-display tabular-nums leading-none break-words">{studentPct}%</div>
              <div className="text-sm opacity-90 tabular-nums">{studentsPresent.toLocaleString()} of {studentDenom.toLocaleString()}</div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider opacity-80 truncate">Head teachers present {activeFilters.length ? "(filtered)" : "statewide"}</div>
            <div className="mt-2 flex flex-col gap-1">
              <div className="text-3xl sm:text-4xl font-bold font-display tabular-nums leading-none break-words">{headPct}%</div>
              <div className="text-sm opacity-90 tabular-nums">{headsPresent.toLocaleString()} of {headDenom.toLocaleString()}</div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider opacity-80 truncate">Teachers present {activeFilters.length ? "(filtered)" : "statewide"}</div>
            <div className="mt-2 flex flex-col gap-1">
              <div className="text-3xl sm:text-4xl font-bold font-display tabular-nums leading-none break-words">{teacherPct}%</div>
              <div className="text-sm opacity-90 tabular-nums">{teachersPresent.toLocaleString()} of {teacherDenom.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>


      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Network</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={SchoolIcon}
          label="Schools"
          value={filteredSchools.length}
          hint={`${filteredSchools.filter((s) => s.category === "primary").length} Primary · ${filteredSchools.filter((s) => s.category === "junior_secondary").length} Junior Sec.`}
          className="bg-head-teacher-card"
        />
        <StatCard icon={ShieldCheck} label="Head Teachers" value={headDenom} className="bg-head-teacher-card" />
        <StatCard icon={Users} label="Teachers" value={teacherDenom} className="bg-head-teacher-card" />
        <StatCard icon={GraduationCap} label="Students" value={filteredStudents.length} tone="gold" className="bg-head-teacher-card" />
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Today</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={UserCheck} label="Head teachers present" value={headsPresent} tone="success" hint={`${headPct}%`} className="bg-head-teacher-card" />
        <StatCard icon={UserCheck} label="Teachers present" value={teachersPresent} tone="success" hint={`${teacherPct}%`} className="bg-head-teacher-card" />
        <StatCard icon={UserCheck} label="Pupils present" value={studentsPresent} tone="success" hint={`${studentPct}%`} className="bg-head-teacher-card" />
        <StatCard icon={AlertCircle} label="Head teachers late" value={headsLate} tone="warning" className="bg-head-teacher-card" />
        <StatCard icon={AlertCircle} label="Teachers late" value={teachersLate} tone="warning" className="bg-head-teacher-card" />
        <StatCard icon={AlertCircle} label="Pupils not marked" value={Math.max(0, filteredStudents.length - studentsPresent)} tone="destructive" className="bg-head-teacher-card" />
      </div>

      {selectedSchool && (() => {
        const schoolStaff = filteredStaff.filter((s) => s.school_id === selectedSchool.id);
        const heads = schoolStaff.filter((s) => s.role === "head_teacher");
        const tchrs = schoolStaff.filter((s) => s.role === "teacher");
        const attByTeacher = new Map(filteredTAtt.map((r) => [r.teacher_user_id, r]));
        const studentsHere = filteredStudents.filter((s) => s.school_id === selectedSchool.id);
        const presentStudentsHere = filteredSAtt.filter(
          (r) => r.school_id === selectedSchool.id && isStudentPresent(r),
        ).length;

        const fmtTime = (t: string | null) => {
          if (!t) return "—";
          const d = new Date(t);
          return isNaN(d.getTime())
            ? t
            : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        };

        const StaffRow = ({ p }: { p: typeof schoolStaff[number] }) => {
          const att = attByTeacher.get(p.user_id);
          const status = att?.arrival_status ?? (att?.arrival_time ? "present" : "absent");
          const tone =
            status === "present"
              ? "bg-success/10 text-success border-success/20"
              : status === "late"
              ? "bg-warning/10 text-warning border-warning/20"
              : "bg-destructive/10 text-destructive border-destructive/20";
          return (
            <div className="rounded-lg border bg-background/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{p.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 space-x-2">
                    {p.teacher_id && <span>ID: {p.teacher_id}</span>}
                    {p.class_taught && <span>· Class: {p.class_taught}</span>}
                  </div>
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${tone}`}>
                  {status}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Arrival</div>
                  <div className="text-foreground">{fmtTime(att?.arrival_time ?? null)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Departure</div>
                  <div className="text-foreground">{fmtTime(att?.departure_time ?? null)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Head verified</div>
                  <div className="text-foreground">{att?.head_verified ? "Yes" : "No"}</div>
                </div>
              </div>
            </div>
          );
        };

        return (
          <section className="mt-8 rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
              <h2 className="text-base font-semibold text-foreground">
                Review · {selectedSchool.name}
              </h2>
              <div className="text-xs text-muted-foreground">
                {prettyLga(selectedSchool.lga)}
                {selectedSchool.category ? ` · ${prettyCategory(selectedSchool.category)}` : ""}
                {" · "}
                {studentsHere.length} pupils ({presentStudentsHere} present today)
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Head Teacher{heads.length > 1 ? "s" : ""} ({heads.length})
              </div>
              {heads.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">Not assigned</div>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {heads.map((h) => <StaffRow key={h.user_id} p={h} />)}
                </div>
              )}
            </div>

            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Teachers ({tchrs.length})
              </div>
              {tchrs.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">No teachers registered at this school.</div>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {tchrs.map((t) => <StaffRow key={t.user_id} p={t} />)}
                </div>
              )}
            </div>
          </section>
        );
      })()}

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mt-8 mb-3">
        Schools {activeFilters.length ? `(${filteredSchools.length})` : "in Edo State"}
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {filteredSchools.length === 0 && (
          <div className="text-sm text-muted-foreground italic">No schools match the current filters.</div>
        )}
        {filteredSchools.map((school) => {
          const schoolStaff = filteredStaff.filter((s) => s.school_id === school.id);
          const heads = schoolStaff.filter((s) => s.role === "head_teacher");
          const tchrs = schoolStaff.filter((s) => s.role === "teacher");
          return (
            <div key={school.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="font-semibold text-foreground">{school.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {prettyLga(school.lga)}{school.category ? ` · ${prettyCategory(school.category)}` : ""}
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Head Teacher</div>
                  {heads.length === 0 ? (
                    <div className="text-muted-foreground italic">Not assigned</div>
                  ) : (
                    <ul className="mt-0.5">
                      {heads.map((h) => (
                        <li key={h.user_id} className="text-foreground">{h.full_name || "—"}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Teachers ({tchrs.length})
                  </div>
                  {tchrs.length === 0 ? (
                    <div className="text-muted-foreground italic">No teachers registered</div>
                  ) : (
                    <ul className="mt-0.5 grid gap-0.5">
                      {tchrs.map((t) => (
                        <li key={t.user_id} className="text-foreground">
                          {t.full_name || "—"}
                          {t.class_taught ? <span className="text-muted-foreground"> · {t.class_taught}</span> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
