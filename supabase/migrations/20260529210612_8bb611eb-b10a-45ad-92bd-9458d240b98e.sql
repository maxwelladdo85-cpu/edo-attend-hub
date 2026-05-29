CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
  _school uuid;
BEGIN
  -- Pick role from metadata; default to teacher; only allow valid values
  BEGIN
    _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'teacher'::app_role);
  EXCEPTION WHEN OTHERS THEN
    _role := 'teacher'::app_role;
  END;

  -- School from metadata (nullable, ignored for admin)
  BEGIN
    _school := NULLIF(NEW.raw_user_meta_data->>'school_id','')::uuid;
  EXCEPTION WHEN OTHERS THEN
    _school := NULL;
  END;

  IF _role = 'admin'::app_role THEN
    _school := NULL;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, phone, school_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    _school
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists on auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;