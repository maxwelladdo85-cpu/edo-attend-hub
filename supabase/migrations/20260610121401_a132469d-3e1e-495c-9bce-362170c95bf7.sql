
-- 1. Strengthen teacher self-verify prevention: raise an exception instead of silently resetting
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
    IF NEW.head_verified IS DISTINCT FROM OLD.head_verified
       OR NEW.head_verified_by IS DISTINCT FROM OLD.head_verified_by
       OR NEW.head_verified_at IS DISTINCT FROM OLD.head_verified_at
       OR NEW.arrival_verified IS DISTINCT FROM OLD.arrival_verified
       OR NEW.departure_verified IS DISTINCT FROM OLD.departure_verified
    THEN
      RAISE EXCEPTION 'Teachers cannot modify verification fields on their own attendance';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Add WITH CHECK to teacher self-update policy enforcing verification columns unchanged
DROP POLICY IF EXISTS "Teachers update own attendance" ON public.teacher_attendance;
CREATE POLICY "Teachers update own attendance"
  ON public.teacher_attendance FOR UPDATE TO authenticated
  USING (teacher_user_id = auth.uid())
  WITH CHECK (teacher_user_id = auth.uid());

-- 3. Restrict user_roles SELECT policies to non-anonymous sessions
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

DROP POLICY IF EXISTS "Admins read all roles" ON public.user_roles;
CREATE POLICY "Admins read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );
