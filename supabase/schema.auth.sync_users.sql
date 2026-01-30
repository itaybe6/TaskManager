-- Sync Supabase Auth users -> public.users
-- Run this in Supabase SQL editor.
--
-- Why:
-- - `auth.users` is Supabase Auth's table
-- - `public.users` in this project is an app-level users table
-- This script makes sure every new Auth user gets a matching row in `public.users`.

-- 1) Trigger function: create/update public.users when a new auth user is created
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, role, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email, 'משתמש'),
    (
      case
        when lower(new.raw_user_meta_data->>'role') in ('admin', 'client')
          then lower(new.raw_user_meta_data->>'role')
        when coalesce(new.raw_user_meta_data->>'display_name', '') in ('איתי', 'אדיר')
          then 'admin'
        else 'client'
      end
    )::public.user_role,
    now(),
    now()
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        role = excluded.role,
        updated_at = now();

  return new;
end;
$$;

-- Lock down function privileges (recommended)
revoke all on function public.handle_new_auth_user() from public;

-- 2) Trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- 3) Backfill: create public.users rows for existing auth users (your 2 users included)
insert into public.users (id, display_name, role, created_at, updated_at)
select
  au.id,
  coalesce(au.raw_user_meta_data->>'display_name', au.email, 'משתמש') as display_name,
  (
    case
      when lower(au.raw_user_meta_data->>'role') in ('admin', 'client')
        then lower(au.raw_user_meta_data->>'role')
      when coalesce(au.raw_user_meta_data->>'display_name', '') in ('איתי', 'אדיר')
        then 'admin'
      else 'client'
    end
  )::public.user_role,
  now(),
  now()
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null;

