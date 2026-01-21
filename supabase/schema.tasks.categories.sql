-- Task categories extension (dynamic categories)
-- Run AFTER:
--   1) supabase/schema.sql
-- Optional (recommended):
--   supabase/schema.business.sql

create extension if not exists pgcrypto;

-- Table: task_categories
create table if not exists public.task_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  color text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_categories_slug_key unique(slug)
);

drop trigger if exists task_categories_set_updated_at on public.task_categories;
create trigger task_categories_set_updated_at
before update on public.task_categories
for each row execute function public.set_updated_at();

create index if not exists task_categories_name_idx on public.task_categories(name);

-- Extend tasks with category_id (nullable)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='tasks' and column_name='category_id'
  ) then
    alter table public.tasks add column category_id uuid null;
  end if;

  if not exists (select 1 from pg_constraint where conname='tasks_category_id_fkey') then
    alter table public.tasks
      add constraint tasks_category_id_fkey
      foreign key (category_id) references public.task_categories(id) on delete set null;
  end if;
end $$;

create index if not exists tasks_category_idx on public.tasks(category_id);
create index if not exists tasks_category_status_updated_idx on public.tasks(category_id, status, updated_at desc);

-- RLS (dev-friendly)
alter table public.task_categories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='task_categories' and policyname='task_categories_select_all'
  ) then
    create policy task_categories_select_all on public.task_categories for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='task_categories' and policyname='task_categories_write_all'
  ) then
    create policy task_categories_write_all on public.task_categories
    for all using (true) with check (true);
  end if;
end $$;

