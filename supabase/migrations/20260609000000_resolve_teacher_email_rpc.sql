-- RPC function to resolve teacher ID to email (replaces server function for mobile)
-- SECURITY DEFINER: runs with function owner privileges, but only returns the email
-- which is already visible to authenticated users via auth.users in some setups.
CREATE OR REPLACE FUNCTION public.resolve_teacher_email(_teacher_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
BEGIN
  SELECT u.email INTO _email
  FROM auth.users u
  INNER JOIN profiles p ON p.user_id = u.id
  WHERE p.teacher_id = _teacher_id;

  IF _email IS NULL THEN
    RAISE EXCEPTION 'Teacher ID not found: %', _teacher_id;
  END IF;

  RETURN _email;
END;
$function$;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.resolve_teacher_email(text) TO authenticated;
