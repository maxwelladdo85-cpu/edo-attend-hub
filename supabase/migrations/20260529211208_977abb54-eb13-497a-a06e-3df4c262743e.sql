ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_taught text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
  _school uuid;
  _class text;
BEGIN
  BEGIN
    _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'teacher'::app_role);
  EXCEPTION WHEN OTHERS THEN
    _role := 'teacher'::app_role;
  END;

  BEGIN
    _school := NULLIF(NEW.raw_user_meta_data->>'school_id','')::uuid;
  EXCEPTION WHEN OTHERS THEN
    _school := NULL;
  END;

  _class := NULLIF(NEW.raw_user_meta_data->>'class_taught','');

  IF _role = 'admin'::app_role THEN
    _school := NULL;
    _class := NULL;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, phone, school_id, class_taught)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    _school,
    _class
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  RETURN NEW;
END;
$function$;