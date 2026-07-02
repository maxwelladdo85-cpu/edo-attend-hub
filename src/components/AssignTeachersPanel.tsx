import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus, Search, CheckCircle2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = "primary" | "junior_secondary";

const CLASS_GROUPS: Record<Category, { label: string; options: string[] }[]> = {
  primary: [
    { label: "Early Childhood / Nursery", options: ["Nursery 1", "Nursery 2", "Kindergarten (KG) / Nursery 3"] },
    { label: "Primary", options: ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"] },
  ],
  junior_secondary: [
    { label: "Junior Secondary", options: ["JSS 1 (Basic 7)", "JSS 2 (Basic 8)", "JSS 3 (Basic 9)"] },
  ],
};

function prettyLga(lga: string) {
  return lga
    .split("-")
    .map((s) => s.charAt(0) + s.slice(1).toLowerCase())
    .join(" ");
}

type SchoolRow = { id: string; name: string; lga: string; category: Category };
type TeacherRow = {
  id: string;
  user_id: string;
  full_name: string;
  teacher_id: string | null;
  school_id: string | null;
  class_taught: string | null;
};

export function AssignTeachersPanel() {
  const qc = useQueryClient();
  const [lga, setLga] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [teacherUserId, setTeacherUserId] = useState("");
  const [classTaught, setClassTaught] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: schools = [], isLoading: schoolsLoading } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id,name,lga,category")
        .order("name")
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as SchoolRow[];
    },
  });

  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ["admin-teachers"],
    queryFn: async () => {
      const { data: roleRows, error: rerr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");
      if (rerr) throw rerr;
      const ids = (roleRows ?? []).map((r: any) => r.user_id);
      if (ids.length === 0) return [] as TeacherRow[];
      const { data, error } = await supabase
        .from("profiles")
        .select("id,user_id,full_name,teacher_id,school_id,class_taught")
        .in("user_id", ids)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as TeacherRow[];
    },
  });

  const lgas = useMemo(() => {
    const set = new Set(schools.map((s) => s.lga));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [schools]);

  const filteredSchools = useMemo(
    () => (lga ? schools.filter((s) => s.lga === lga).sort((a, b) => a.name.localeCompare(b.name)) : []),
    [schools, lga],
  );

  const selectedSchool = useMemo(
    () => schools.find((s) => s.id === schoolId) ?? null,
    [schools, schoolId],
  );

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        t.full_name.toLowerCase().includes(q) ||
        (t.teacher_id ?? "").toLowerCase().includes(q),
    );
  }, [teachers, search]);

  const handleAssign = async () => {
    if (!teacherUserId || !schoolId || !classTaught) {
      toast.error("Pick a teacher, school and class");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ school_id: schoolId, class_taught: classTaught })
      .eq("user_id", teacherUserId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Teacher assigned");
    setTeacherUserId("");
    setClassTaught("");
    await qc.invalidateQueries({ queryKey: ["admin-teachers"] });
  };

  const schoolNameById = (id: string | null) => schools.find((s) => s.id === id)?.name ?? "Unassigned";

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <div className="p-5 border-b border-border flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-primary" />
        <h3 className="font-display font-semibold">Assign teacher to a class</h3>
      </div>

      <div className="p-5 grid lg:grid-cols-2 gap-6">
        {/* Left: filters + selection */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Local government</Label>
            <Select value={lga} onValueChange={(v) => { setLga(v); setSchoolId(""); setClassTaught(""); }}>
              <SelectTrigger>
                <SelectValue placeholder={schoolsLoading ? "Loading…" : "Select LGA"} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {lgas.map((l) => (
                  <SelectItem key={l} value={l}>{prettyLga(l)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>School</Label>
            <Select value={schoolId} onValueChange={(v) => { setSchoolId(v); setClassTaught(""); }} disabled={!lga}>
              <SelectTrigger>
                <SelectValue placeholder={lga ? "Select school" : "Pick LGA first"} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {filteredSchools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={classTaught} onValueChange={setClassTaught} disabled={!selectedSchool}>
              <SelectTrigger>
                <SelectValue placeholder={selectedSchool ? "Select class" : "Pick school first"} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {selectedSchool &&
                  CLASS_GROUPS[selectedSchool.category].map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleAssign}
            disabled={saving || !teacherUserId || !schoolId || !classTaught}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign teacher"}
          </Button>
        </div>

        {/* Right: teacher picker */}
        <div className="space-y-3">
          <Label>Teacher</Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or Oracle ID"
              className="pl-9"
            />
          </div>
          <div className="rounded-xl border border-border max-h-80 overflow-y-auto divide-y divide-border">
            {teachersLoading ? (
              <div className="p-6 text-center text-muted-foreground">
                <Loader2 className="h-4 w-4 inline animate-spin" />
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No teachers found.</div>
            ) : (
              filteredTeachers.map((t) => {
                const active = t.user_id === teacherUserId;
                return (
                  <button
                    key={t.user_id}
                    type="button"
                    onClick={() => setTeacherUserId(t.user_id)}
                    className={`w-full text-left p-3 flex items-center gap-3 transition-colors ${
                      active ? "bg-primary/10" : "hover:bg-muted"
                    }`}
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center font-mono text-[11px] font-semibold text-primary">
                      {t.teacher_id ?? "—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{t.full_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" />
                        {schoolNameById(t.school_id)}
                        {t.class_taught ? ` · ${t.class_taught}` : ""}
                      </div>
                    </div>
                    {active && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
