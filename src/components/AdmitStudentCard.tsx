import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  schoolName?: string | null;
  onAdded?: () => void;
};

export function AdmitStudentCard({ schoolName, onAdded }: Props) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [klass, setKlass] = useState(profile?.class_taught ?? "");
  const [gender, setGender] = useState<string>("");
  const [parentContact, setParentContact] = useState("");

  const canAdmit = !!profile?.school_id;

  const reset = () => {
    setStudentId("");
    setFullName("");
    setKlass(profile?.class_taught ?? "");
    setGender("");
    setParentContact("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.school_id) {
      toast.error("Your school is not configured. Contact your administrator.");
      return;
    }
    if (!studentId.trim() || !fullName.trim() || !klass.trim()) {
      toast.error("Student ID, full name and class are required");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("students").insert({
        // school_id is always taken from the teacher's own profile — they
        // cannot admit a pupil into any other school.
        school_id: profile.school_id,
        student_id: studentId.trim(),
        full_name: fullName.trim(),
        class: klass.trim(),
        gender: gender || null,
        parent_contact: parentContact.trim() || null,
      });
      if (error) throw error;
      toast.success(`${fullName.trim()} admitted to ${klass.trim()}`);
      reset();
      setOpen(false);
      onAdded?.();
    } catch (err: any) {
      const msg = err?.message ?? "Could not admit student";
      toast.error(
        msg.toLowerCase().includes("duplicate")
          ? "A student with this ID already exists in your school."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Admit a student
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            New pupils are automatically admitted to{" "}
            <span className="font-medium text-foreground">
              {schoolName ?? "your school"}
            </span>
            .
          </p>
        </div>
        {!open && (
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            disabled={!canAdmit}
          >
            New student
          </Button>
        )}
      </div>

      {!canAdmit && (
        <p className="mt-3 text-sm text-destructive">
          Your school is not assigned yet. Ask your administrator to assign a
          school before admitting students.
        </p>
      )}

      {open && (
        <form onSubmit={submit} className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="adm-sid">Student ID</Label>
            <Input
              id="adm-sid"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. STU-001"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="adm-name">Full name</Label>
            <Input
              id="adm-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Surname First-name"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="adm-class">Class</Label>
            <Input
              id="adm-class"
              value={klass}
              onChange={(e) => setKlass(e.target.value)}
              placeholder="e.g. Primary 3"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="adm-gender">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="adm-gender">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="adm-contact">Parent contact (optional)</Label>
            <Input
              id="adm-contact"
              value={parentContact}
              onChange={(e) => setParentContact(e.target.value)}
              placeholder="Phone or email"
            />
          </div>
          <div className="sm:col-span-2 flex gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Admitting…
                </>
              ) : (
                "Admit student"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
