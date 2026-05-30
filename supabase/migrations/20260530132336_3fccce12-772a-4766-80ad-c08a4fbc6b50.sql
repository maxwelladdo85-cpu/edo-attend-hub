ALTER TABLE public.student_attendance
  ADD COLUMN IF NOT EXISTS morning_marked_at timestamptz,
  ADD COLUMN IF NOT EXISTS morning_lat double precision,
  ADD COLUMN IF NOT EXISTS morning_lng double precision,
  ADD COLUMN IF NOT EXISTS afternoon_marked_at timestamptz,
  ADD COLUMN IF NOT EXISTS afternoon_lat double precision,
  ADD COLUMN IF NOT EXISTS afternoon_lng double precision;