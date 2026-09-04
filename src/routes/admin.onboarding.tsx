import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import * as XLSX from "xlsx";
import { UploadCloud, Download, Loader2, FileSpreadsheet, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSchools } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/onboarding")({
  head: () => ({ meta: [{ title: "Bulk Onboarding — EdoSAS" }] }),
  component: OnboardingPage,
});

type TemplateRow = {
  "Full Name": string;
  "Oracle ID": string;
  "Phone": string;
  "Email": string;
  "Role": "teacher" | "head_teacher";
  "School Name": string;
  "Class Taught": string;
};

const TEMPLATE_HEADERS: (keyof TemplateRow)[] = [
  "Full Name",
  "Oracle ID",
  "Phone",
  "Email",
  "Role",
  "School Name",
  "Class Taught",
];

function OnboardingPage() {
  const { data: schools = [] } = useSchools();
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [defaultPassword, setDefaultPassword] = useState("edosubeb123");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const downloadTemplate = () => {
    const example: TemplateRow[] = [
      {
        "Full Name": "Jane Doe",
        "Oracle ID": "T1000",
        "Phone": "08012345678",
        "Email": "jane@example.com",
        "Role": "teacher",
        "School Name": schools[0]?.name ?? "Example Primary School",
        "Class Taught": "Primary 3",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(example, { header: TEMPLATE_HEADERS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teachers");
    XLSX.writeFile(wb, "edosas-teacher-onboarding-template.xlsx");
  };

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const parsed = XLSX.utils.sheet_to_json<TemplateRow>(ws, { defval: "" });
    setRows(parsed);
    setResults([]);
  };

  const submit = async () => {
    if (rows.length === 0) return;
    const schoolIdByName = new Map(schools.map((s) => [s.name.trim().toLowerCase(), s.id]));

    const users = rows.map((r) => {
      const schoolName = String(r["School Name"] ?? "").trim();
      const school_id = schoolIdByName.get(schoolName.toLowerCase()) ?? "";
      const role = String(r["Role"] ?? "teacher").toLowerCase().trim();
      return {
        full_name: String(r["Full Name"] ?? "").trim(),
        phone: String(r["Phone"] ?? "").trim() || null,
        email: String(r["Email"] ?? "").trim() || null,
        teacher_id: String(r["Oracle ID"] ?? "").trim(),
        role: role === "head_teacher" ? "head_teacher" : "teacher",
        school_id,
        class_taught: String(r["Class Taught"] ?? "").trim() || null,
        _schoolName: schoolName,
      };
    });

    const invalid = users.filter((u) => !u.full_name || !u.teacher_id || !u.school_id);
    if (invalid.length > 0) {
      toast.error(
        `${invalid.length} row(s) invalid. Check Full Name, Oracle ID, and School Name matches an existing school.`,
      );
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-bulk-create-users", {
      body: { users: users.map(({ _schoolName, ...u }) => u), default_password: defaultPassword },
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setResults(data?.results ?? []);
    const ok = (data?.results ?? []).filter((r: any) => r.status === "ok").length;
    toast.success(`Created ${ok} of ${users.length} account(s).`);
  };

  return (
    <div>
      <AdminPageHeader
        title="Bulk Onboarding — Teachers"
        subtitle="Download the template, fill it in, then upload to create accounts."
        icon={UploadCloud}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card shadow-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold">1. Download template</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Columns: <span className="font-mono">{TEMPLATE_HEADERS.join(", ")}</span>. Use the
            school's <strong>exact</strong> name from the schools list. Role must be{" "}
            <span className="font-mono">teacher</span> or{" "}
            <span className="font-mono">head_teacher</span>.
          </p>
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-1.5" />
            Download template (.xlsx)
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <UploadCloud className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold">2. Upload filled template</h3>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="file">Excel file (.xlsx / .csv)</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
            <div>
              <Label htmlFor="pw">Default password</Label>
              <Input id="pw" value={defaultPassword} onChange={(e) => setDefaultPassword(e.target.value)} />
            </div>
            <Button
              onClick={submit}
              disabled={submitting || rows.length === 0}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Create ${rows.length} account(s)`}
            </Button>
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border font-semibold text-sm">Preview ({rows.length} rows)</div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-left uppercase tracking-wider text-muted-foreground">
                <tr>
                  {TEMPLATE_HEADERS.map((h) => (
                    <th key={h} className="px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i}>
                    {TEMPLATE_HEADERS.map((h) => (
                      <td key={h} className="px-3 py-2">{String(r[h] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border font-semibold text-sm">Results</div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 p-3 text-sm">
                {r.status === "ok" ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="font-mono text-xs">{r.teacher_id}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs">{r.status === "ok" ? r.email : r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
