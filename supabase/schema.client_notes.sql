-- Client notes (לקוחות -> הערות + תמונות + סטטוס טופל)
-- Run AFTER: supabase/schema.sql AND supabase/schema.business.sql AND supabase/schema.notifications.sql
--
-- Notes:
-- - Images are stored in Supabase Storage (we'll reuse the existing 'documents' bucket client-side).
-- - This schema uses "dev-friendly" RLS policies like the rest of the project.

create extension if not exists pgcrypto;

-- ============================================================
-- client_notes
-- ============================================================
create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  is_resolved boolean not null default false,
  resolved_at timestamptz null,
  resolved_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists client_notes_set_updated_at on public.client_notes;
create trigger client_notes_set_updated_at
before update on public.client_notes
for each row execute function public.set_updated_at();

create index if not exists client_notes_client_created_idx
on public.client_notes(client_id, created_at desc);

create index if not exists client_notes_resolved_created_idx
on public.client_notes(is_resolved, created_at desc);

create index if not exists client_notes_author_created_idx
on public.client_notes(author_user_id, created_at desc);

-- ============================================================
-- client_note_attachments
-- ============================================================
create table if not exists public.client_note_attachments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.client_notes(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  file_name text not null,
  mime_type text null,
  size_bytes bigint null,
  created_at timestamptz not null default now()
);

create index if not exists client_note_attachments_note_idx
on public.client_note_attachments(note_id, created_at asc);

-- ============================================================
-- Notifications on new client note
-- Inserts 2 notifications (איתי + אדיר) into public.notifications.
-- public.notifications already triggers push via schema.notifications.sql.
-- ============================================================
create or replace function public.notify_on_client_note_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient record;
begin
  for recipient in
    select u.id
    from public.users u
    where u.role = 'admin'
      and u.display_name in ('איתי', 'אדיר', 'אדיר בוקובזה')
  loop
    -- Don't notify the note author (just in case an admin created the note)
    if recipient.id <> new.author_user_id then
      insert into public.notifications (recipient_user_id, sender_user_id, title, body, data)
      values (
        recipient.id,
        new.author_user_id,
        'הערה חדשה מלקוח',
        case when length(coalesce(new.body, '')) > 160 then left(new.body, 160) || '…' else new.body end,
        jsonb_build_object('kind', 'client_note', 'note_id', new.id, 'client_id', new.client_id)
      );
    end if;
  end loop;

  return new;
end $$;

drop trigger if exists client_notes_notify_trigger on public.client_notes;
create trigger client_notes_notify_trigger
after insert on public.client_notes
for each row execute function public.notify_on_client_note_insert();

-- ============================================================
-- RLS (dev-friendly)
-- ============================================================
alter table public.client_notes enable row level security;
alter table public.client_note_attachments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='client_notes' and policyname='client_notes_select_all'
  ) then
    create policy client_notes_select_all on public.client_notes for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='client_notes' and policyname='client_notes_write_all'
  ) then
    create policy client_notes_write_all on public.client_notes for all using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='client_note_attachments' and policyname='client_note_attachments_select_all'
  ) then
    create policy client_note_attachments_select_all on public.client_note_attachments for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='client_note_attachments' and policyname='client_note_attachments_write_all'
  ) then
    create policy client_note_attachments_write_all on public.client_note_attachments for all using (true) with check (true);
  end if;
end $$;

