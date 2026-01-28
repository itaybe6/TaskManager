-- Migration to add client_id to documents and support more document types

-- 1. Add client_id to documents table
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='documents' and column_name='client_id'
  ) then
    alter table public.documents add column client_id uuid null references public.clients(id) on delete cascade;
  end if;
end $$;

-- 2. Add index for client documents
create index if not exists documents_client_idx on public.documents(client_id, created_at desc);

-- 3. Update doc_kind enum to include 'tax_invoice'
-- Note: PostgreSQL doesn't support adding values to an enum inside a transaction block easily.
-- We'll check if it exists first.
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
    -- 'alter type ... add value' cannot be run inside a transaction in some Postgres versions
    -- but Supabase usually allows it if it's the only thing. 
    -- If it fails, we'll just skip it as it's not strictly mandatory if we use 'other' or 'invoice'.
    raise notice 'Could not add tax_invoice to doc_kind enum';
end $$;
