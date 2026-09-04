import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  schoolName?: string | null;
  onAdded?: () => void;
};

export function AdmitTeacherCard({ schoolName, onAdded }: Props) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [oracleId, setOracleId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [classTaught, setClassTaught] = useState("");

  const canAdmit = !!profile?.school_id;

  const reset = () => {
    setFullName("");
    setOracleId("");
    setPhone("");
    setEmail("");
    setClassTaught("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !oracleId.trim()) {
      toast.error("Full name and Oracle ID are required");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("head-admit-teacher", {
        body: {
          full_name: fullName.trim(),
          teacher_id: oracleId.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          class_taught: classTaught.trim() || null,
        },
      });
      if (error) {
        // Surface the function's own message when available.
        let msg = error.message ?? "Could not admit teacher";
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const j = await ctx.json();
            if (j?.error) msg = j.error;
          }
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      toast.success(
        `${fullName.trim()} admitted. Sign-in email: ${data?.email} · Password: EdoSAS@2026`,
        { duration: 10000 },
      );
      reset();
      setOpen(false);
      onAdded?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not admit teacher");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-head-teacher-card p-5 sm:p-6 shadow-card mx-2 sm:mx-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Admit a teacher
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            New teachers are automatically admitted to{" "}
            <span className="font-medium text-foreground">{schoolName ?? "your school"}</span>.
          </p>
        </div>
        {!open && (
          <Button size="sm" onClick={() => setOpen(true)} disabled={!canAdmit}>
            New teacher
          </Button>
        )}
      </div>

      {!canAdmit && (
        <p className="mt-3 text-sm text-destructive">
          Your school is not assigned yet. Ask your administrator to assign a school before
          admitting teachers.
        </p>
      )}

      {open && (
        <form onSubmit={submit} className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="adm-t-name">Full name</Label>
            <Input
              id="adm-t-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Surname First-name"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="adm-t-oid">Oracle ID</Label>
            <Input
              id="adm-t-oid"
              value={oracleId}
              onChange={(e) => setOracleId(e.target.value)}
              placeholder="e.g. T1234"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="adm-t-class">Class taught (optional)</Label>
            <Input
              id="adm-t-class"
              value={classTaught}
              onChange={(e) => setClassTaught(e.target.value)}
              placeholder="e.g. Primary 3"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="adm-t-phone">Phone (optional)</Label>
            <Input
              id="adm-t-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="080…"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="adm-t-email">Email (optional)</Label>
            <Input
              id="adm-t-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Leave blank to use the Oracle ID sign-in"
            />
          </div>
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            The new teacher signs in with their Oracle ID and the temporary password{" "}
            <span className="font-mono">EdoSAS@2026</span>.
          </p>
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
                "Admit teacher"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
