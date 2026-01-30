-- Fix documents table to allow null project_id (for general or client-only documents)
alter table public.documents alter column project_id drop not null;

-- Ensure client_id exists (it should if schema.documents.client.sql was run)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='documents' and column_name='client_id'
  ) then
    alter table public.documents add column client_id uuid null references public.clients(id) on delete cascade;
  end if;
end $$;

-- Update doc_kind enum if needed (tax_invoice was added in another script, but let's be safe)
do $$
begin
  if not exists (
    select 1 from pg_enum e 
    join pg_type t on e.enumtypid = t.oid 
    where t.typname = 'doc_kind' and e.enumlabel = 'tax_invoice'
  ) then
    alter type public.doc_kind add value 'tax_invoice';
  end if;
exception
  when others then
    raise notice 'Could not add tax_invoice to doc_kind enum';
end $$;

-- Create indexes for performance
create index if not exists documents_client_id_idx on public.documents(client_id);
create index if not exists documents_kind_idx on public.documents(kind);
create index if not exists documents_created_at_idx on public.documents(created_at desc);

-- Storage bucket and policies (requires storage schema access)
-- Note: In Supabase, you might need to do this via the dashboard or a separate script
-- but we can include the SQL for storage policies if the user has permissions.

-- 1. Ensure bucket exists (via SQL is tricky, usually via API or Dashboard)
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', true) on conflict do nothing;

-- 2. Storage Policies
-- ALL users can select documents (if public or via RLS)
-- For now, let's assume authenticated users can do everything in 'documents' bucket
/*
create policy "Authenticated users can upload documents"
on storage.objects for insert
to authenticated
with check (bucket_id = 'documents');

create policy "Authenticated users can view documents"
on storage.objects for select
to authenticated
using (bucket_id = 'documents');

create policy "Authenticated users can delete documents"
on storage.objects for delete
to authenticated
using (bucket_id = 'documents');
*/
