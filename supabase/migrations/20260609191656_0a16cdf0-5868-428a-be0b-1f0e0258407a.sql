
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  level text NOT NULL,
  basic_number int NOT NULL,
  sort_order int NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.classes TO anon, authenticated;
GRANT ALL ON public.classes TO service_role;

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view classes" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Admins manage classes" ON public.classes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.classes (name, level, basic_number, sort_order) VALUES
  ('Primary 1', 'Primary', 1, 1),
  ('Primary 2', 'Primary', 2, 2),
  ('Primary 3', 'Primary', 3, 3),
  ('Primary 4', 'Primary', 4, 4),
  ('Primary 5', 'Primary', 5, 5),
  ('Primary 6', 'Primary', 6, 6),
  ('JSS 1 (Basic 7)', 'JSS', 7, 7),
  ('JSS 2 (Basic 8)', 'JSS', 8, 8),
  ('JSS 3 (Basic 9)', 'JSS', 9, 9);
