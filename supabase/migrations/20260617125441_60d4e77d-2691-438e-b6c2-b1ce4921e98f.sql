
CREATE OR REPLACE FUNCTION public.user_in_same_school(_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p_self
    JOIN public.profiles p_target ON p_target.user_id = _target
    WHERE p_self.user_id = auth.uid()
      AND p_self.school_id IS NOT NULL
      AND p_self.school_id = p_target.school_id
  )
$$;

DROP POLICY IF EXISTS "Head teachers read roles in their school" ON public.user_roles;
CREATE POLICY "Head teachers read roles in their school"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'head_teacher'::app_role)
  AND public.user_in_same_school(user_roles.user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles (school_id);
