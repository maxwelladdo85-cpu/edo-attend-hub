import { useEffect, useState } from "react";
import { CalendarRange, Loader2, Plus, Trash2, Check } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const LABEL_PRESETS = [
  "First Term (2025/2026 Academic Session)",
  "Second Term (2025/2026 Academic Session)",
  "Third Term (2025/2026 Academic Session)",
];

type Period = {
  id: string;
  label: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
};

export function AcademicPeriodsCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [form, setForm] = useState({ label: "", start_date: "", end_date: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("academic_periods")
      .select("*")
      .order("start_date", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setPeriods((data as Period[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!form.start_date || !form.end_date) {
      toast.error("Start and end dates are required");
      return;
    }
    if (form.end_date < form.start_date) {
      toast.error("End date must be on or after start date");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("academic_periods").insert({
      label: form.label.trim() || null,
      start_date: form.start_date,
      end_date: form.end_date,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Academic period saved");
    setForm({ label: "", start_date: "", end_date: "" });
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("academic_periods").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Removed");
    load();
  };

  const setActive = async (p: Period) => {
    const { error } = await (supabase as any)
      .from("academic_periods")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="h-4 w-4" /> Academic periods
        </CardTitle>
        <CardDescription>
          Define the start and end dates of an academic period (e.g. term or session).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] items-end">
          <div className="space-y-2">
            <Label htmlFor="ap_label">Label (optional)</Label>
            <Select
              value={LABEL_PRESETS.includes(form.label) ? form.label : ""}
              onValueChange={(v) => setForm((f) => ({ ...f, label: v }))}
            >
              <SelectTrigger id="ap_label">
                <SelectValue placeholder="Select a term…" />
              </SelectTrigger>
              <SelectContent>
                {LABEL_PRESETS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ap_start">Start date</Label>
            <Input
              id="ap_start"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ap_end">End date</Label>
            <Input
              id="ap_end"
              type="date"
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            />
          </div>
          <Button onClick={handleAdd} disabled={saving} className="tap-target">
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
            Add
          </Button>
        </div>

        <div className="border rounded-md divide-y">
          {loading ? (
            <div className="p-4 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…
            </div>
          ) : periods.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No academic periods yet.
            </div>
          ) : (
            periods.map((p) => (
              <div key={p.id} className="p-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {p.label ?? "Academic period"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.start_date} → {p.end_date}
                  </div>
                </div>
                {p.is_active ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
                <Button variant="outline" size="sm" onClick={() => setActive(p)} className="tap-target">
                  <Check className="h-4 w-4 mr-1.5" />
                  {p.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(p.id)}
                  className="text-destructive hover:text-destructive tap-target"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
