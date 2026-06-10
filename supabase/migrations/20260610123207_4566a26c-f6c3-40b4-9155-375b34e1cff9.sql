-- Allow teachers (in addition to head teachers and admins) to admit (insert) and edit
-- students, but ONLY for their own school. School is taken from the teacher's profile
-- via the existing current_user_school() security-definer function, so teachers cannot
-- admit pupils into a different school.

DROP POLICY IF EXISTS "School staff manage students" ON public.students;
DROP POLICY IF EXISTS "School staff update students" ON public.students;

CREATE POLICY "School staff manage students"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    (
      public.has_role(auth.uid(), 'head_teacher'::app_role)
      OR public.has_role(auth.uid(), 'teacher'::app_role)
    )
    AND school_id = public.current_user_school()
  )
);

CREATE POLICY "School staff update students"
ON public.students
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    (
      public.has_role(auth.uid(), 'head_teacher'::app_role)
      OR public.has_role(auth.uid(), 'teacher'::app_role)
    )
    AND school_id = public.current_user_school()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    (
      public.has_role(auth.uid(), 'head_teacher'::app_role)
      OR public.has_role(auth.uid(), 'teacher'::app_role)
    )
    AND school_id = public.current_user_school()
  )
);