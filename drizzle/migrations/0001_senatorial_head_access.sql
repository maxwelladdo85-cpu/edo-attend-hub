CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role app_role; _school uuid; _class text; _tid text; _district text;
BEGIN
  BEGIN
    _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'teacher'::app_role);
  EXCEPTION WHEN OTHERS THEN _role := 'teacher'::app_role; END;
  BEGIN
    _school := NULLIF(NEW.raw_user_meta_data->>'school_id','')::uuid;
  EXCEPTION WHEN OTHERS THEN _school := NULL; END;
  _class := NULLIF(NEW.raw_user_meta_data->>'class_taught','');
  _tid := NULLIF(NEW.raw_user_meta_data->>'teacher_id','');
  _district := NULLIF(NEW.raw_user_meta_data->>'senatorial_district','');
  IF _role IN ('admin'::app_role, 'senatorial_head'::app_role) THEN
    _school := NULL; _class := NULL;
  END IF;
  IF _role <> 'senatorial_head'::app_role THEN _district := NULL; END IF;
  INSERT INTO public.profiles (user_id, full_name, phone, school_id, class_taught, teacher_id, senatorial_district)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone', _school, _class, _tid, _district);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END; $$;

CREATE POLICY "Senatorial heads read schools" ON public.schools FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'senatorial_head'));
CREATE POLICY "Senatorial heads read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'senatorial_head'));
CREATE POLICY "Senatorial heads read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'senatorial_head'));
CREATE POLICY "Senatorial heads read teacher attendance" ON public.teacher_attendance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'senatorial_head'));
CREATE POLICY "Senatorial heads read student attendance" ON public.student_attendance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'senatorial_head'));
CREATE POLICY "Senatorial heads read students" ON public.students FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'senatorial_head'));

INSERT INTO public.user_roles (user_id, role) VALUES ('92f96e6b-8be8-44f6-9971-f2db4e6bd488', 'senatorial_head') ON CONFLICT DO NOTHING;