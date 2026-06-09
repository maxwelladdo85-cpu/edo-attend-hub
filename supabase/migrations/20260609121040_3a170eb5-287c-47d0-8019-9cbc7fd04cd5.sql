
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Best-effort cleanup of app data; FK cascades from auth.users will also fire.
  DELETE FROM public.user_roles WHERE user_id = _uid;
  DELETE FROM public.profiles WHERE user_id = _uid;

  -- Finally remove the auth user
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
