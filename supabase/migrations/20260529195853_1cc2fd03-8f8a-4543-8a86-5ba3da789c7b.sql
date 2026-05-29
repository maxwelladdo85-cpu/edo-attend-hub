
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'head_teacher', 'teacher');
CREATE TYPE public.arrival_status AS ENUM ('early', 'on_time', 'late');
CREATE TYPE public.departure_status AS ENUM ('left_early', 'on_time', 'overtime');
CREATE TYPE public.attendance_mark AS ENUM ('present', 'late', 'absent');

-- ============ UTILITY TRIGGER FUNCTION ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ SCHOOLS ============
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  lga TEXT NOT NULL,
  ward TEXT,
  category TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  resumption_time TIME NOT NULL DEFAULT '08:00',
  closing_time TIME NOT NULL DEFAULT '14:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER schools_updated_at BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  teacher_id TEXT UNIQUE,
  designation TEXT,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer function (no RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- helper to get current user's school
CREATE OR REPLACE FUNCTION public.current_user_school()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- ============ STUDENTS ============
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  class TEXT NOT NULL,
  gender TEXT,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TEACHER ATTENDANCE ============
CREATE TABLE public.teacher_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  arrival_time TIMESTAMPTZ,
  arrival_lat DOUBLE PRECISION,
  arrival_lng DOUBLE PRECISION,
  arrival_status public.arrival_status,
  arrival_verified BOOLEAN NOT NULL DEFAULT false,
  departure_time TIMESTAMPTZ,
  departure_lat DOUBLE PRECISION,
  departure_lng DOUBLE PRECISION,
  departure_status public.departure_status,
  departure_verified BOOLEAN NOT NULL DEFAULT false,
  head_verified BOOLEAN NOT NULL DEFAULT false,
  head_verified_by UUID REFERENCES auth.users(id),
  head_verified_at TIMESTAMPTZ,
  device_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_user_id, attendance_date)
);

GRANT SELECT, INSERT, UPDATE ON public.teacher_attendance TO authenticated;
GRANT ALL ON public.teacher_attendance TO service_role;

ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER teacher_attendance_updated_at BEFORE UPDATE ON public.teacher_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_teacher_attendance_date ON public.teacher_attendance(attendance_date);
CREATE INDEX idx_teacher_attendance_school ON public.teacher_attendance(school_id);

-- ============ STUDENT ATTENDANCE ============
CREATE TABLE public.student_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  morning_status public.attendance_mark,
  afternoon_status public.attendance_mark,
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, attendance_date)
);

GRANT SELECT, INSERT, UPDATE ON public.student_attendance TO authenticated;
GRANT ALL ON public.student_attendance TO service_role;

ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER student_attendance_updated_at BEFORE UPDATE ON public.student_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_student_attendance_date ON public.student_attendance(attendance_date);
CREATE INDEX idx_student_attendance_school ON public.student_attendance(school_id);

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- SCHOOLS
CREATE POLICY "Authenticated can read schools"
  ON public.schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage schools"
  ON public.schools FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PROFILES
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Head teachers read school profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'head_teacher') AND school_id = public.current_user_school());
CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- USER ROLES
CREATE POLICY "Users read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- STUDENTS
CREATE POLICY "School staff read students"
  ON public.students FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR school_id = public.current_user_school()
  );
CREATE POLICY "School staff manage students"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'head_teacher') AND school_id = public.current_user_school())
  );
CREATE POLICY "School staff update students"
  ON public.students FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'head_teacher') AND school_id = public.current_user_school())
  );
CREATE POLICY "Admins delete students"
  ON public.students FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- TEACHER ATTENDANCE
CREATE POLICY "Teachers read own attendance"
  ON public.teacher_attendance FOR SELECT TO authenticated
  USING (teacher_user_id = auth.uid());
CREATE POLICY "Head teachers read school attendance"
  ON public.teacher_attendance FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'head_teacher') AND school_id = public.current_user_school());
CREATE POLICY "Admins read all attendance"
  ON public.teacher_attendance FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers insert own attendance"
  ON public.teacher_attendance FOR INSERT TO authenticated
  WITH CHECK (teacher_user_id = auth.uid());
CREATE POLICY "Teachers update own attendance"
  ON public.teacher_attendance FOR UPDATE TO authenticated
  USING (teacher_user_id = auth.uid());
CREATE POLICY "Head teachers verify attendance"
  ON public.teacher_attendance FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'head_teacher') AND school_id = public.current_user_school());

-- STUDENT ATTENDANCE
CREATE POLICY "School staff read student attendance"
  ON public.student_attendance FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR school_id = public.current_user_school()
  );
CREATE POLICY "School staff mark student attendance"
  ON public.student_attendance FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR school_id = public.current_user_school()
  );
CREATE POLICY "School staff update student attendance"
  ON public.student_attendance FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR school_id = public.current_user_school()
  );

-- AUDIT LOGS
CREATE POLICY "Users insert own audit log"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());
CREATE POLICY "Admins read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ SIGNUP TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  );

  -- Default role: teacher (admin can promote later)
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'teacher');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
