import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, Trash2, ArrowLeft, User as UserIcon } from "lucide-react";
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

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — EdoSUBEB Smart Attendance" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { session, loading, profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session || !profile) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const role = primaryRole(roles);
  const label = roleLabelFor(role);

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
        <h1 className="text-2xl md:text-3xl font-bold font-display">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account preferences and data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="h-4 w-4" /> Account
          </CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
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
        </CardContent>
      </Card>

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
                  credentials from EdoSUBEB Smart Attendance. Attendance records
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
