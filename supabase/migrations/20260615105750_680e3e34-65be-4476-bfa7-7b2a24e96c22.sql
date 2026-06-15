ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_attendance;
ALTER TABLE public.teacher_attendance REPLICA IDENTITY FULL;
ALTER TABLE public.student_attendance REPLICA IDENTITY FULL;