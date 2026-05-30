CREATE POLICY "Head teachers mark teacher attendance"
ON public.teacher_attendance
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'head_teacher'::app_role)
  AND school_id = current_user_school()
);

CREATE POLICY "Head teachers update teacher attendance"
ON public.teacher_attendance
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'head_teacher'::app_role)
  AND school_id = current_user_school()
)
WITH CHECK (
  has_role(auth.uid(), 'head_teacher'::app_role)
  AND school_id = current_user_school()
);