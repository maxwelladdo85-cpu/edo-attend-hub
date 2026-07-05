import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ExternalLink, Loader2 } from "lucide-react";
import { DashboardShell, roleLabelFor } from "@/components/DashboardShell";
import { useAuth, primaryRole } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/courses")({
  head: () => ({ meta: [{ title: "Courses — EdoSAS" }] }),
  component: TeacherCoursesPage,
});

type Course = {
  id: string;
  title: string;
  subject: string | null;
  description: string | null;
  class_level: string | null;
  file_url: string | null;
  created_at: string;
};

function TeacherCoursesPage() {
  const { session, loading, roles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["teacher-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses" as any)
        .select("id,title,subject,description,class_level,file_url,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Course[];
    },
    enabled: !!session,
  });

  const role = primaryRole(roles);
  const label = roleLabelFor(role);

  return (
    <DashboardShell nav={[{ to: "/courses", label: "Courses", icon: BookOpen }]} roleLabel={label}>
      <div className="mb-6 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display">Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse courses published by the administrator. View-only.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center"><Loader2 className="h-5 w-5 inline animate-spin" /></div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
          No courses have been published yet.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card shadow-card p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {[c.subject, c.class_level].filter(Boolean).join(" · ") || "General"}
              </div>
              <h3 className="mt-1 font-display font-semibold text-lg">{c.title}</h3>
              {c.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-4">{c.description}</p>
              )}
              {c.file_url && (
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <a href={c.file_url} target="_blank" rel="noreferrer">
                    Preview <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
