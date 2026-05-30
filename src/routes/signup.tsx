import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [{ title: "Create account — EdoSUBEB Smart Attendance" }],
  }),
  component: SignupPage,
});

type Role = "teacher" | "head_teacher" | "admin";
type Category = "primary" | "junior_secondary";

const ROLE_LABEL: Record<Role, string> = {
  teacher: "Teacher",
  head_teacher: "Head Teacher",
  admin: "Administrator",
};

const CATEGORY_LABEL: Record<Category, string> = {
  primary: "Primary School",
  junior_secondary: "Junior Secondary School",
};

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

function SignupPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    teacherId: "",
    email: "",
    phone: "",
    password: "",
    role: "teacher" as Role,
    category: "" as "" | Category,
    lga: "",
    schoolId: "",
    classTaught: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  const needsSchool = form.role !== "admin";

  const { data: schools = [] } = useQuery({
    queryKey: ["schools-signup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id,name,category,lga")
        .order("name")
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const lgas = useMemo(() => {
    const set = new Set(schools.map((s) => s.lga));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [schools]);

  const filteredSchools = useMemo(() => {
    if (!form.category || !form.lga) return [];
    return schools
      .filter((s) => s.category === form.category && s.lga === form.lga)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [schools, form.category, form.lga]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (form.role === "admin") {
      if (!form.email) {
        toast.error("Please enter your email address");
        return;
      }
    } else if (!form.teacherId) {
      toast.error("Please enter your Teacher ID");
      return;
    }
    if (needsSchool && !form.schoolId) {
      toast.error("Please select your school");
      return;
    }
    if (needsSchool && !form.classTaught) {
      toast.error("Please select the class you teach");
      return;
    }
    setLoading(true);
    const redirectUrl = `${window.location.origin}/dashboard`;
    const authEmail =
      form.role === "admin"
        ? form.email
        : form.teacherId.includes("@")
          ? form.teacherId
          : `${form.teacherId}@edosubeb.gov.ng`;
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: form.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: form.fullName,
          phone: form.phone,
          role: form.role,
          school_id: needsSchool ? form.schoolId : null,
          class_taught: needsSchool ? form.classTaught : null,
          teacher_id: form.role === "admin" ? null : form.teacherId,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created — you can sign in now.");
    navigate({ to: "/login", replace: true });
  };

  const updateText = (k: "fullName" | "teacherId" | "email" | "phone" | "password") =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative bg-gradient-hero p-12 text-primary-foreground flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-11 w-11 rounded-lg bg-white p-1 grid place-items-center">
            <Logo className="h-9 w-9" />
          </div>
          <div className="font-display font-semibold text-2xl leading-tight">
            <div>EdoSUBEB</div>
            <div className="text-sm tracking-widest font-medium text-primary-foreground/85">SMART ATTENDANCE</div>
          </div>
        </div>
        <div className="text-center -mt-56">
          <h2 className="text-4xl font-bold leading-tight">Join the statewide attendance network.</h2>
          <p className="mt-4 text-primary-foreground/85 max-w-md mx-auto">
            Create your account to start marking attendance, verifying records, or supervising your school.
          </p>
        </div>
        <div className="text-xs text-primary-foreground/70">Select your role and school to get started.</div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <Logo className="h-9 w-9" />
            <span className="font-display font-semibold">EdoSUBEB</span>
          </Link>
          <div className="flex rounded-lg border border-border overflow-hidden mb-6">
            <div className="flex-1 py-2 text-center text-sm font-medium bg-primary text-primary-foreground">
              Sign Up
            </div>
            <Link
              to="/login"
              className="flex-1 py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Sign In
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sign Up</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Choose your role and assigned school.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" required value={form.fullName} onChange={updateText("fullName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teacherId">Teacher ID</Label>
              <Input id="teacherId" type="text" required value={form.teacherId} onChange={updateText("teacherId")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={updateText("phone")} placeholder="090..." />
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v: Role) =>
                  setForm((f) => ({ ...f, role: v, category: "", lga: "", schoolId: "", classTaught: "" }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsSchool && (
              <>
                <div className="space-y-1.5">
                  <Label>School type</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v: Category) =>
                      setForm((f) => ({ ...f, category: v, lga: "", schoolId: "", classTaught: "" }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Select school type" /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
                        <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Local government</Label>
                  <Select
                    value={form.lga}
                    onValueChange={(v) => setForm((f) => ({ ...f, lga: v, schoolId: "" }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select LGA" />

                    </SelectTrigger>
                    <SelectContent>
                      {lgas.map((l) => (
                        <SelectItem key={l} value={l}>{prettyLga(l)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>School</Label>
                  <Select
                    value={form.schoolId}
                    onValueChange={(v) => setForm((f) => ({ ...f, schoolId: v }))}
                    disabled={!form.lga}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={form.lga ? "Select school" : "Pick LGA first"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {filteredSchools.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Class taught</Label>
                  <Select
                    value={form.classTaught}
                    onValueChange={(v) => setForm((f) => ({ ...f, classTaught: v }))}
                    disabled={!form.category}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={form.category ? "Select class" : "Pick school type first"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {form.category &&
                        CLASS_GROUPS[form.category].map((group) => (
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
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={updateText("password")}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary hover:opacity-90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign Up"}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
