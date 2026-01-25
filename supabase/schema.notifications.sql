-- Notifications + Push tokens
-- Run AFTER: supabase/schema.sql
-- Sends a push (server-side) on INSERT into notifications (via Edge Function webhook).

create extension if not exists pgcrypto;
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Store Expo push tokens per user (supports multiple devices)
create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  expo_push_token text not null,
  device_platform text null, -- 'ios' | 'android' | 'web'
  device_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_push_tokens_token_key unique(expo_push_token)
);

drop trigger if exists user_push_tokens_set_updated_at on public.user_push_tokens;
create trigger user_push_tokens_set_updated_at
before update on public.user_push_tokens
for each row execute function public.set_updated_at();

create index if not exists user_push_tokens_user_idx on public.user_push_tokens(user_id);

-- Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  sender_user_id uuid null references public.users(id) on delete set null,
  title text not null,
  body text null,
  data jsonb null,
  is_read boolean not null default false,
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create index if not exists notifications_recipient_created_idx on public.notifications(recipient_user_id, created_at desc);
create index if not exists notifications_recipient_is_read_idx on public.notifications(recipient_user_id, is_read, created_at desc);

-- RLS (dev-friendly)
alter table public.user_push_tokens enable row level security;
alter table public.notifications enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_push_tokens' and policyname='user_push_tokens_select_all') then
    create policy user_push_tokens_select_all on public.user_push_tokens for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_push_tokens' and policyname='user_push_tokens_write_all') then
    create policy user_push_tokens_write_all on public.user_push_tokens for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='notifications_select_all') then
    create policy notifications_select_all on public.notifications for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='notifications_write_all') then
    create policy notifications_write_all on public.notifications for all using (true) with check (true);
  end if;
end $$;

-- Edge Function webhook sender (pg_net -> HTTP POST)
-- You MUST replace the URL below with your project URL:
--   https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notification
create or replace function public.notify_push_on_notification_insert()
returns trigger
language plpgsql
as $$
declare
  hook_url text := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notification';
begin
  perform net.http_post(
    url := hook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- Optional: simple shared secret; set the same in Edge Function env
      'x-webhook-secret', coalesce(current_setting('app.webhook_secret', true), '')
    ),
    body := jsonb_build_object(
      'notification_id', new.id,
      'recipient_user_id', new.recipient_user_id,
      'title', new.title,
      'body', new.body,
      'data', new.data
    )
  );
  return new;
end $$;

drop trigger if exists notifications_push_trigger on public.notifications;
create trigger notifications_push_trigger
after insert on public.notifications
for each row execute function public.notify_push_on_notification_insert();

-- ============================================================
-- Task reminders (48h / 24h / 12h before due_at)
-- Rules:
-- - Create reminders only if task has due_at AND assignee_id AND status != 'done'
-- - If task becomes done -> reminders removed (no push will be sent)
-- - Reminders are sent by inserting into public.notifications (which already pushes)
-- ============================================================

create table if not exists public.task_reminder_jobs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  hours_before int not null check (hours_before in (12, 24, 48)),
  remind_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'cancelled')),
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_reminder_jobs_task_hours_key unique(task_id, hours_before)
);

drop trigger if exists task_reminder_jobs_set_updated_at on public.task_reminder_jobs;
create trigger task_reminder_jobs_set_updated_at
before update on public.task_reminder_jobs
for each row execute function public.set_updated_at();

create index if not exists task_reminder_jobs_status_remind_idx
on public.task_reminder_jobs(status, remind_at asc);
create index if not exists task_reminder_jobs_recipient_idx
on public.task_reminder_jobs(recipient_user_id, remind_at desc);

-- Keep reminder jobs in sync with tasks changes
create or replace function public.sync_task_reminders()
returns trigger
language plpgsql
as $$
declare
  hrs int;
  remind_ts timestamptz;
begin
  -- Simple & deterministic: rebuild jobs whenever relevant fields change.
  delete from public.task_reminder_jobs where task_id = new.id;

  if new.due_at is null then
    return new;
  end if;

  if new.status = 'done' then
    return new;
  end if;

  if new.assignee_id is null then
    return new;
  end if;

  foreach hrs in array array[48, 24, 12]
  loop
    remind_ts := new.due_at - make_interval(hours => hrs);
    -- If the reminder time is already in the past, skip creating it.
    if remind_ts > now() then
      insert into public.task_reminder_jobs (task_id, recipient_user_id, hours_before, remind_at)
      values (new.id, new.assignee_id, hrs, remind_ts);
    end if;
  end loop;

  return new;
end $$;

drop trigger if exists tasks_sync_reminders_trigger on public.tasks;
create trigger tasks_sync_reminders_trigger
after insert or update of due_at, status, assignee_id on public.tasks
for each row execute function public.sync_task_reminders();

-- Worker that sends due reminders by inserting into `public.notifications`
create or replace function public.process_task_reminder_jobs(max_jobs int default 100)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  sent_count int := 0;
  task_title text;
  body_text text;
begin
  for r in
    select j.id, j.task_id, j.recipient_user_id, j.hours_before
    from public.task_reminder_jobs j
    join public.tasks t on t.id = j.task_id
    where j.status = 'pending'
      and j.remind_at <= now()
      and t.status <> 'done'
      and t.due_at is not null
      and t.assignee_id = j.recipient_user_id
    order by j.remind_at asc
    limit max_jobs
    for update skip locked
  loop
    select t.title into task_title from public.tasks t where t.id = r.task_id;
    body_text := format('"%s" בעוד %s שעות', coalesce(task_title, 'משימה'), r.hours_before);

    insert into public.notifications (recipient_user_id, title, body, data)
    values (
      r.recipient_user_id,
      'תזכורת למשימה',
      body_text,
      jsonb_build_object('kind', 'task_reminder', 'task_id', r.task_id, 'hours_before', r.hours_before)
    );

    update public.task_reminder_jobs
    set status = 'sent', sent_at = now()
    where id = r.id;

    sent_count := sent_count + 1;
  end loop;

  return sent_count;
end $$;

-- RLS (dev-friendly)
alter table public.task_reminder_jobs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='task_reminder_jobs' and policyname='task_reminder_jobs_select_all'
  ) then
    create policy task_reminder_jobs_select_all on public.task_reminder_jobs for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='task_reminder_jobs' and policyname='task_reminder_jobs_write_all'
  ) then
    create policy task_reminder_jobs_write_all on public.task_reminder_jobs for all using (true) with check (true);
  end if;
end $$;

-- Schedule the worker (every 5 minutes)
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'task_reminders_every_5m') then
    -- Use a plain string here (avoid nesting dollar-quoted strings)
    perform cron.schedule('task_reminders_every_5m', '*/5 * * * *', 'select public.process_task_reminder_jobs();');
  end if;
exception
  when undefined_table then
    -- Some environments may not have pg_cron enabled; you can enable it in Supabase
    -- or run `process_task_reminder_jobs()` from an external scheduler.
    null;
end $$;

