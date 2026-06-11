CREATE TABLE public.academic_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_periods_dates_chk CHECK (end_date >= start_date)
);

GRANT SELECT ON public.academic_periods TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.academic_periods TO authenticated;
GRANT ALL ON public.academic_periods TO service_role;

ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read academic periods"
  ON public.academic_periods FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert academic periods"
  ON public.academic_periods FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update academic periods"
  ON public.academic_periods FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete academic periods"
  ON public.academic_periods FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_academic_periods_updated_at
  BEFORE UPDATE ON public.academic_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();