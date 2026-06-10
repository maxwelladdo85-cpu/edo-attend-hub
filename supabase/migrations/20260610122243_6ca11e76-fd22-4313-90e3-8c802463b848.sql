ALTER TABLE public.schools ALTER COLUMN radius_meters SET DEFAULT 1;

-- Also update existing schools that still have the old 100m default
UPDATE public.schools SET radius_meters = 1 WHERE radius_meters = 100;