GRANT SELECT ON public.schools TO anon;
CREATE POLICY "Anyone can read schools" ON public.schools FOR SELECT TO anon USING (true);