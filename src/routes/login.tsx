import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import authBg from "@/assets/auth-bg.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — EdoSAS" }],
  }),
  component: LoginPage,
});

type Role = "teacher" | "head_teacher" | "admin";

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading, roles: userRoles, profile } = useAuth();
  const [role, setRole] = useState<Role>("teacher");
  const [teacherId, setTeacherId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session || authLoading) return;
    if (userRoles.length === 0 || !profile) return;
    navigate({ to: "/dashboard", replace: true });
  }, [session, authLoading, userRoles.length, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let signInEmail = email;
      if (role === "teacher" || role === "head_teacher") {
        const { data, error } = await supabase.rpc("resolve_teacher_email" as any, {
          _teacher_id: teacherId,
        });
        if (error) throw new Error(error.message);
        signInEmail = data as string;
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data.session) {
        toast.error("Sign in failed — no session returned");
        return;
      }
      toast.success("Welcome back");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const roleOptions: { value: Role; label: string }[] = [
    { value: "teacher", label: "Teacher" },
    { value: "head_teacher", label: "Head Teacher" },
    { value: "admin", label: "Admin" },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div
        className="hidden lg:flex relative p-12 text-primary-foreground flex-col justify-between overflow-hidden bg-gradient-hero"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url(${authBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-11 w-11 rounded-lg bg-white p-1 grid place-items-center">
            <Logo className="h-9 w-9" />
          </div>
          <div className="font-display font-semibold">EdoSAS</div>
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-tight">Punctuality. Presence. Performance.</h2>
          <p className="mt-4 text-primary-foreground/85 max-w-md">
            Securely sign in to mark attendance, verify records, or monitor schools across Edo State in real time.
          </p>
        </div>
        <div className="text-xs text-primary-foreground/70">Strength · Achievement · Excellence</div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <Logo className="h-9 w-9" />
            <span className="font-display font-semibold">EdoSAS</span>
          </Link>
          <div className="flex rounded-lg border border-border overflow-hidden mb-6">
            <Link
              to="/signup"
              className="flex-1 py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Sign Up
            </Link>
            <div className="flex-1 py-2 text-center text-sm font-medium bg-primary text-primary-foreground">
              Sign In
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sign in to your account</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Select your role to continue.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="grid grid-cols-3 gap-2">
                {roleOptions.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`py-2 px-2 rounded-md text-xs font-medium border transition-colors ${
                      role === r.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {role === "teacher" || role === "head_teacher" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="teacherId">{role === "head_teacher" ? "Head Teacher ID" : "Teacher ID"}</Label>
                  <Input
                    id="teacherId"
                    required
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    placeholder={role === "head_teacher" ? "e.g. H1000" : "e.g. T1000"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edo.gov.ng" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary hover:opacity-90">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
