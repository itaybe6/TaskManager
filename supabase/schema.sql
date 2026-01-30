-- Supabase schema for TaskManager (RTL app)
-- Paste into Supabase SQL editor (or run via migration).

-- UUID generation
create extension if not exists pgcrypto;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('todo', 'done');
  end if;
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'client');
  end if;
end $$;

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Users table (app-level users; not tied to Supabase Auth yet)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  avatar_url text null,
  role public.user_role not null default 'client',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add role column if table already exists
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='role'
  ) then
    alter table public.users add column role public.user_role not null default 'client';
  end if;
end $$;

-- Make existing admins explicit
update public.users
set role = 'admin'
where display_name in ('איתי', 'אדיר');

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- Tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  status public.task_status not null default 'todo',

  assignee_id uuid null references public.users(id) on delete set null,
  due_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- Indexes (for list + filter + search)
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_due_at_idx on public.tasks(due_at);
create index if not exists tasks_updated_at_idx on public.tasks(updated_at desc);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id);

-- Basic full-text search over title/description (optional)
create index if not exists tasks_search_idx
on public.tasks using gin (to_tsvector('simple', coalesce(description,'')));

-- RLS (development-friendly defaults)
-- NOTE: If you want production security, replace these permissive policies.
alter table public.users enable row level security;
alter table public.tasks enable row level security;

do $$
begin
  -- USERS
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='users' and policyname='users_select_all'
  ) then
    create policy users_select_all on public.users for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='users' and policyname='users_write_all'
  ) then
    create policy users_write_all on public.users
    for all using (true) with check (true);
  end if;

  -- TASKS
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='tasks' and policyname='tasks_select_all'
  ) then
    create policy tasks_select_all on public.tasks for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='tasks' and policyname='tasks_write_all'
  ) then
    create policy tasks_write_all on public.tasks
    for all using (true) with check (true);
  end if;
end $$;

