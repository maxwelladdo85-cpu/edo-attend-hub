import { useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ExportColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
};

type Props<T> = {
  filename: string;
  title?: string;
  columns: ExportColumn<T>[];
  rows: T[];
  disabled?: boolean;
};

export function ExportButton<T>({ filename, title, columns, rows, disabled }: Props<T>) {
  const [open, setOpen] = useState(false);

  const headers = columns.map((c) => c.header);
  const matrix = () =>
    rows.map((r) =>
      columns.map((c) => {
        const v = c.accessor(r);
        return v == null ? "" : v;
      }),
    );

  const exportCsv = () => {
    const data = [headers, ...matrix()];
    const csv = data
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, `${filename}.csv`);
  };

  const exportXlsx = () => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...matrix()]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    if (title) {
      doc.setFontSize(14);
      doc.text(title, 14, 14);
    }
    autoTable(doc, {
      head: [headers],
      body: matrix().map((r) => r.map((c) => String(c ?? ""))),
      startY: title ? 20 : 10,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 78, 53] },
    });
    doc.save(`${filename}.pdf`);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || rows.length === 0}>
          <Download className="h-4 w-4 mr-1.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportXlsx}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={exportCsv}>CSV (.csv)</DropdownMenuItem>
        <DropdownMenuItem onClick={exportPdf}>PDF (.pdf)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
