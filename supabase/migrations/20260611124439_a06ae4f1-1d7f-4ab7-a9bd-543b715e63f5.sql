ALTER TABLE public.schools ALTER COLUMN radius_meters SET DEFAULT 20;
UPDATE public.schools SET radius_meters = 20 WHERE radius_meters IS NULL OR radius_meters < 20;