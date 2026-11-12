ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'senatorial_head';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS senatorial_district text;