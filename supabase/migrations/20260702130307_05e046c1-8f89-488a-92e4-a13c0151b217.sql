CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON public.teacher_attendance (attendance_date);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date_teacher ON public.teacher_attendance (attendance_date, teacher_user_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON public.student_attendance (attendance_date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date_student ON public.student_attendance (attendance_date, student_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students (school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles (school_id);