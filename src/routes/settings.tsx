import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, Trash2, ArrowLeft, User as UserIcon, Save, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, primaryRole } from "@/contexts/AuthContext";
import { DashboardShell, roleLabelFor } from "@/components/DashboardShell";
import { AcademicPeriodsCard } from "@/components/AcademicPeriodsCard";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — EdoSAS" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { session, loading, profile, roles, signOut, refresh } = useAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    class_taught: "",
  });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        class_taught: profile.class_taught || "",
      });
    }
  }, [profile]);

  if (loading || !session || !profile) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const role = primaryRole(roles);
  const label = roleLabelFor(role);

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          class_taught: form.class_taught.trim() || null,
        })
        .eq("user_id", session.user.id);
      if (error) throw error;
      await refresh();
      toast.success("Profile updated");
      setEditing(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      toast.error('Type DELETE to confirm');
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      toast.success("Your account has been deleted");
      await signOut();
      navigate({ to: "/", replace: true });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to delete account");
      setDeleting(false);
    }
  };

  const body = (
    <div className="max-w-2xl mx-auto space-y-6">
      {role === "admin" && (
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
      )}

      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and edit your account information.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="h-4 w-4" /> Account
            </CardTitle>
            <CardDescription>Your account details</CardDescription>
          </div>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="tap-target">
              <Pencil className="h-4 w-4 mr-1.5" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="tap-target">
                <X className="h-4 w-4 mr-1.5" /> Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleSave} disabled={saving} className="tap-target">
                {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {editing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class_taught">Class taught</Label>
                <Input
                  id="class_taught"
                  value={form.class_taught}
                  onChange={(e) => setForm((f) => ({ ...f, class_taught: e.target.value }))}
                  placeholder="e.g. Primary 3"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium text-right">{profile.full_name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-right break-all">{session.user?.email ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium text-right">{label}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium text-right">{profile.phone ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Class taught</span>
                <span className="font-medium text-right">{profile.class_taught ?? "—"}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {role === "admin" && <AcademicPeriodsCard />}

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <ShieldAlert className="h-4 w-4" /> Danger zone
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all data associated with it. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="tap-target">
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete my account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove your profile, role, and sign-in
                  credentials from EdoSAS. Attendance records
                  you submitted may be retained for school reporting. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Label htmlFor="confirm-del" className="text-sm">
                  Type <span className="font-mono font-semibold">DELETE</span> to confirm
                </Label>
                <Input
                  id="confirm-del"
                  autoComplete="off"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting} onClick={() => setConfirmText("")}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting || confirmText.trim().toUpperCase() !== "DELETE"}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Deleting…
                    </>
                  ) : (
                    <>Delete account</>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );

  // Admins don't use DashboardShell — render bare with their own back link
  if (role === "admin") {
    return <div className="min-h-dvh bg-background p-4 sm:p-6 lg:p-8 pt-safe pb-safe">{body}</div>;
  }

  return (
    <DashboardShell nav={[]} roleLabel={label}>
      {body}
    </DashboardShell>
  );
}
