-- Drop `role_title` from public.users
-- Run in Supabase SQL editor (safe / idempotent).

alter table public.users
drop column if exists role_title;

