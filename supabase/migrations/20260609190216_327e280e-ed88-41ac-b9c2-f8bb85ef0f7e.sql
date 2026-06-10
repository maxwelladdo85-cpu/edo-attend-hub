CREATE OR REPLACE FUNCTION public.resolve_teacher_email(_teacher_id text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
BEGIN
  SELECT u.email INTO _email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE lower(p.teacher_id) = lower(_teacher_id)
  LIMIT 1;

  IF _email IS NULL THEN
    RAISE EXCEPTION 'No account found for that Teacher ID';
  END IF;

  RETURN _email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_teacher_email(text) TO anon, authenticated;