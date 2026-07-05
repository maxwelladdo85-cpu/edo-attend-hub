import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/admin/courses")({
  head: () => ({ meta: [{ title: "Courses — EdoSAS" }] }),
  component: AdminCoursesPage,
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

function AdminCoursesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", subject: "", class_level: "", description: "", file_url: "" });
  const [saving, setSaving] = useState(false);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses" as any)
        .select("id,title,subject,description,class_level,file_url,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Course[];
    },
  });

  const create = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    setSaving(true);
    const { error } = await supabase.from("courses" as any).insert({
      title: form.title.trim(),
      subject: form.subject.trim() || null,
      class_level: form.class_level.trim() || null,
      description: form.description.trim() || null,
      file_url: form.file_url.trim() || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Course created");
    setForm({ title: "", subject: "", class_level: "", description: "", file_url: "" });
    await qc.invalidateQueries({ queryKey: ["admin-courses"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    const { error } = await supabase.from("courses" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    await qc.invalidateQueries({ queryKey: ["admin-courses"] });
  };

  return (
    <div>
      <AdminPageHeader title="Courses" subtitle="Only admins can create, edit, or delete courses" icon={BookOpen} />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card shadow-card p-6 space-y-3">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> New course
          </h3>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Class level</Label>
              <Input value={form.class_level} onChange={(e) => setForm({ ...form, class_level: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
          </div>
          <div className="space-y-1.5">
            <Label>Resource URL (optional)</Label>
            <Input placeholder="https://…" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} />
          </div>
          <Button onClick={create} disabled={saving} className="w-full bg-gradient-primary hover:opacity-90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create course"}
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border font-semibold text-sm">All courses ({courses.length})</div>
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center"><Loader2 className="h-4 w-4 inline animate-spin" /></div>
            ) : courses.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No courses yet.</div>
            ) : (
              courses.map((c) => (
                <div key={c.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {[c.subject, c.class_level].filter(Boolean).join(" · ") || "—"}
                    </div>
                    {c.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</div>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
