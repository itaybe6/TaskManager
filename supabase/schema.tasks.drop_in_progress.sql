-- Migration: remove `in_progress` from `public.task_status`
-- Also converts existing tasks with status=in_progress -> todo.
-- Safe to run once; re-running should be mostly safe.

begin;

-- If enum exists, migrate it to a new enum with only ('todo','done').
do $$
begin
  if exists (select 1 from pg_type where typname = 'task_status') then
    -- Convert any existing rows first (so cast won't fail)
    update public.tasks set status = 'todo' where status::text = 'in_progress';

    -- Create a new enum type if not exists
    if not exists (select 1 from pg_type where typname = 'task_status_v2') then
      create type public.task_status_v2 as enum ('todo', 'done');
    end if;

    -- Switch column to the new type (idempotent-ish)
    begin
      alter table public.tasks
        alter column status type public.task_status_v2
        using (status::text::public.task_status_v2);
    exception
      when undefined_column then
        -- tasks table not present (or no status) - skip
        null;
      when others then
        -- If already migrated or cast failed for other reasons, skip with notice.
        raise notice 'Skipping status type alter: %', sqlerrm;
    end;

    -- Replace original type name
    begin
      drop type public.task_status;
      alter type public.task_status_v2 rename to task_status;
    exception when others then
      -- If something still depends / already renamed, don't hard fail
      raise notice 'Skipping type replace: %', sqlerrm;
    end;
  end if;
end $$;

commit;

