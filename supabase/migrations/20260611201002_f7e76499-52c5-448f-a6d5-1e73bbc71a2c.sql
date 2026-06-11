CREATE POLICY "Head teachers read roles in their school"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'head_teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p_self
    JOIN public.profiles p_target ON p_target.user_id = user_roles.user_id
    WHERE p_self.user_id = auth.uid()
      AND p_self.school_id IS NOT NULL
      AND p_self.school_id = p_target.school_id
  )
);