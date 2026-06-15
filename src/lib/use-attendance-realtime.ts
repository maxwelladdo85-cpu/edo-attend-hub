import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { todayStr } from "@/lib/admin-data";

/**
 * Subscribes to live changes on teacher_attendance and student_attendance,
 * and invalidates the admin "today" queries so the dashboard refreshes the
 * moment a teacher or student is marked.
 */
export function useAttendanceRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const today = todayStr();

    const invalidateTeachers = () =>
      qc.invalidateQueries({ queryKey: ["admin", "teacher-attendance", today] });
    const invalidateStudents = () =>
      qc.invalidateQueries({ queryKey: ["admin", "student-attendance", today] });

    const channel = supabase
      .channel("admin-attendance-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teacher_attendance" },
        invalidateTeachers,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_attendance" },
        invalidateStudents,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
