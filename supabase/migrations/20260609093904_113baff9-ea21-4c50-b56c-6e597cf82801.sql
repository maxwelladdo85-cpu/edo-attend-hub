
-- 1. Audit logs: remove client insert policy
DROP POLICY IF EXISTS "Users insert own audit log" ON public.audit_logs;

-- 2. Students SELECT: require role
DROP POLICY IF EXISTS "School staff read students" ON public.students;
CREATE POLICY "School staff read students" ON public.students
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    (public.has_role(auth.uid(), 'teacher'::app_role)
     OR public.has_role(auth.uid(), 'head_teacher'::app_role))
    AND school_id = public.current_user_school()
  )
);

-- 3. Student attendance: require role on read/insert/update
DROP POLICY IF EXISTS "School staff mark student attendance" ON public.student_attendance;
CREATE POLICY "School staff mark student attendance" ON public.student_attendance
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    (public.has_role(auth.uid(), 'teacher'::app_role)
     OR public.has_role(auth.uid(), 'head_teacher'::app_role))
    AND school_id = public.current_user_school()
  )
);

DROP POLICY IF EXISTS "School staff read student attendance" ON public.student_attendance;
CREATE POLICY "School staff read student attendance" ON public.student_attendance
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    (public.has_role(auth.uid(), 'teacher'::app_role)
     OR public.has_role(auth.uid(), 'head_teacher'::app_role))
    AND school_id = public.current_user_school()
  )
);

DROP POLICY IF EXISTS "School staff update student attendance" ON public.student_attendance;
CREATE POLICY "School staff update student attendance" ON public.student_attendance
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    (public.has_role(auth.uid(), 'teacher'::app_role)
     OR public.has_role(auth.uid(), 'head_teacher'::app_role))
    AND school_id = public.current_user_school()
  )
);

-- 4. Teacher attendance: prevent teachers from changing verification fields
CREATE OR REPLACE FUNCTION public.prevent_teacher_self_verify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'head_teacher'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    NEW.head_verified := OLD.head_verified;
    NEW.head_verified_by := OLD.head_verified_by;
    NEW.head_verified_at := OLD.head_verified_at;
    NEW.arrival_verified := OLD.arrival_verified;
    NEW.departure_verified := OLD.departure_verified;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_teacher_self_verify ON public.teacher_attendance;
CREATE TRIGGER trg_prevent_teacher_self_verify
BEFORE UPDATE ON public.teacher_attendance
FOR EACH ROW EXECUTE FUNCTION public.prevent_teacher_self_verify();

-- 5. Realtime: drop attendance tables from publication (app does not use realtime)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'teacher_attendance'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.teacher_attendance';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'student_attendance'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.student_attendance';
  END IF;
END $$;
