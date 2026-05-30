
-- Update handle_new_user to also save teacher_id
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
  _tid text;
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
  _tid := NULLIF(NEW.raw_user_meta_data->>'teacher_id','');

  IF _role = 'admin'::app_role THEN
    _school := NULL;
    _class := NULL;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, phone, school_id, class_taught, teacher_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    _school,
    _class,
    _tid
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill teacher_id for existing users from their auth metadata
UPDATE public.profiles p
SET teacher_id = COALESCE(p.teacher_id, NULLIF(u.raw_user_meta_data->>'teacher_id',''))
FROM auth.users u
WHERE u.id = p.user_id AND p.teacher_id IS NULL;

-- Insert 5 dummy students into the existing teacher's school + class
INSERT INTO public.students (student_id, full_name, class, school_id, gender)
SELECT v.student_id, v.full_name, p.class_taught, p.school_id, v.gender
FROM public.profiles p
CROSS JOIN (VALUES
  ('S01', 'Adaeze Okafor', 'female'),
  ('S02', 'Bola Adeyemi', 'male'),
  ('S03', 'Chinedu Eze', 'male'),
  ('S04', 'Doris Igbinedion', 'female'),
  ('S05', 'Emeka Obi', 'male')
) AS v(student_id, full_name, gender)
WHERE p.school_id IS NOT NULL
  AND p.class_taught IS NOT NULL
  AND p.user_id = '26e0e953-2620-4cf3-a3e1-e069fd17f7b0'
ON CONFLICT DO NOTHING;
