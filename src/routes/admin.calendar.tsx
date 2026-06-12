import { createFileRoute } from "@tanstack/react-router";
import { AcademicPeriodsCard } from "@/components/AcademicPeriodsCard";
import { HolidaysCard } from "@/components/HolidaysCard";

export const Route = createFileRoute("/admin/calendar")({
  head: () => ({ meta: [{ title: "Academic Calendar — EdoSAS" }] }),
  component: AdminCalendarPage,
});

function AdminCalendarPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Academic Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set academic terms, mark state-wide holidays, and define non-school days.
          Weekends are automatically excluded from school days.
        </p>
      </div>
      <AcademicPeriodsCard />
      <HolidaysCard />
    </div>
  );
}
