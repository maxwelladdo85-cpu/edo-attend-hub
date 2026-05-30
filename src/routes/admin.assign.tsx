import { createFileRoute } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminShell";
import { AssignTeachersPanel } from "@/components/AssignTeachersPanel";

export const Route = createFileRoute("/admin/assign")({
  component: AssignPage,
});

function AssignPage() {
  return (
    <div>
      <AdminPageHeader title="Assign Teachers" subtitle="Assign teachers to a school and class" icon={UserPlus} />
      <AssignTeachersPanel />
    </div>
  );
}
