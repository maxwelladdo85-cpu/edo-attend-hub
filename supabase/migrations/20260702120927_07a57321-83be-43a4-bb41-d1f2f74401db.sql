
ALTER TABLE public.holidays
  ADD COLUMN IF NOT EXISTS day_type text NOT NULL DEFAULT 'holiday';

ALTER TABLE public.holidays
  DROP CONSTRAINT IF EXISTS holidays_day_type_check;

ALTER TABLE public.holidays
  ADD CONSTRAINT holidays_day_type_check
  CHECK (day_type IN ('holiday','staff_only','all_present'));
