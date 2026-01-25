-- Personal tasks (private per logged-in user)
-- Run AFTER:
-- - supabase/schema.sql
-- - supabase/schema.auth.sync_users.sql (recommended)
--
-- Behavior:
-- - Shared tasks: visible to everyone (is_personal=false)
-- - Personal tasks: visible only to owner_user_id (must equal auth.uid())

create extension if not exists pgcrypto;

-- Columns
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='tasks' and column_name='is_personal'
  ) then
    alter table public.tasks add column is_personal boolean not null default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='tasks' and column_name='owner_user_id'
  ) then
    alter table public.tasks add column owner_user_id uuid null references public.users(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname='tasks_personal_owner_check') then
    alter table public.tasks
      add constraint tasks_personal_owner_check
      check ((is_personal = false) or (owner_user_id is not null));
  end if;
end $$;

create index if not exists tasks_owner_idx on public.tasks(owner_user_id);
create index if not exists tasks_is_personal_idx on public.tasks(is_personal);

-- Replace permissive policies with personal-aware policies
do $$
begin
  -- Drop old policies if they exist
  if exists (select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks_select_all') then
    drop policy tasks_select_all on public.tasks;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks_write_all') then
    drop policy tasks_write_all on public.tasks;
  end if;

  -- SELECT: everyone sees shared + own personal
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks_select_visible') then
    create policy tasks_select_visible
    on public.tasks
    for select
    using (is_personal = false or owner_user_id = auth.uid());
  end if;

  -- INSERT: shared tasks can be created by anyone; personal must belong to auth user
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks_insert_visible') then
    create policy tasks_insert_visible
    on public.tasks
    for insert
    with check (
      (is_personal = false and owner_user_id is null)
      or (is_personal = true and owner_user_id = auth.uid())
    );
  end if;

  -- UPDATE: can update shared tasks, and personal tasks only if you own them
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks_update_visible') then
    create policy tasks_update_visible
    on public.tasks
    for update
    using (is_personal = false or owner_user_id = auth.uid())
    with check (
      (is_personal = false and owner_user_id is null)
      or (is_personal = true and owner_user_id = auth.uid())
    );
  end if;

  -- DELETE: can delete shared tasks, and personal tasks only if you own them
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks_delete_visible') then
    create policy tasks_delete_visible
    on public.tasks
    for delete
    using (is_personal = false or owner_user_id = auth.uid());
  end if;
end $$;

