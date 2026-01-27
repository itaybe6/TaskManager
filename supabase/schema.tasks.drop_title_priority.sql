-- Migration: remove `title` + `priority` from `public.tasks`
-- Safe to run multiple times.
-- Run AFTER `supabase/schema.sql` (and any schema extensions).

begin;

-- Drop old indexes that reference removed columns (if they exist)
drop index if exists public.tasks_priority_idx;
drop index if exists public.tasks_search_idx;

-- Drop columns if they exist
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'title'
  ) then
    alter table public.tasks drop column title;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'priority'
  ) then
    alter table public.tasks drop column priority;
  end if;
end $$;

-- Ensure description is required
update public.tasks set description = '' where description is null;
alter table public.tasks alter column description set not null;

-- Recreate search index (now only over description)
create index if not exists tasks_search_idx
on public.tasks using gin (to_tsvector('simple', coalesce(description,'')));

-- Drop enum type if no longer used
do $$
begin
  if exists (select 1 from pg_type where typname = 'task_priority') then
    begin
      drop type public.task_priority;
    exception when dependent_objects_still_exist then
      -- If something else still references it, don't fail the migration.
      raise notice 'task_priority type still has dependencies; skipping drop';
    end;
  end if;
end $$;

commit;

