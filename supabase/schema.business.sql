-- Business schema extension for TaskManager
-- Run AFTER `supabase/schema.sql`
-- Covers: clients, projects, documents, invoices, invoice_items, transactions
-- And extends `public.tasks` with `project_id`.

create extension if not exists pgcrypto;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type public.project_status as enum ('planned', 'active', 'on_hold', 'completed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'doc_kind') then
    create type public.doc_kind as enum ('general', 'receipt', 'invoice', 'quote', 'contract', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type public.transaction_type as enum ('income', 'expense');
  end if;

  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type public.invoice_status as enum ('draft', 'sent', 'paid', 'void');
  end if;
end $$;

-- Reuse `public.set_updated_at()` from base schema

-- Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_user_id uuid null,
  notes text null,
  total_price numeric(12,2) null,
  remaining_to_pay numeric(12,2) null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add columns/constraints if table already exists
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='clients' and column_name='client_user_id'
  ) then
    alter table public.clients add column client_user_id uuid null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='clients' and column_name='total_price'
  ) then
    alter table public.clients add column total_price numeric(12,2) null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='clients' and column_name='remaining_to_pay'
  ) then
    alter table public.clients add column remaining_to_pay numeric(12,2) null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='clients_client_user_id_fkey'
  ) then
    alter table public.clients
      add constraint clients_client_user_id_fkey
      foreign key (client_user_id) references public.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='clients_client_user_id_key'
  ) then
    alter table public.clients
      add constraint clients_client_user_id_key unique (client_user_id);
  end if;
end $$;

-- Backward-compatible cleanup (if columns exist from older schema)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='clients' and column_name='contact_name'
  ) then
    alter table public.clients drop column contact_name;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='clients' and column_name='email'
  ) then
    alter table public.clients drop column email;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='clients' and column_name='phone'
  ) then
    alter table public.clients drop column phone;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='clients' and column_name='address'
  ) then
    alter table public.clients drop column address;
  end if;
end $$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

-- Client contacts (multiple contacts per client)
create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  email text null,
  phone text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists client_contacts_set_updated_at on public.client_contacts;
create trigger client_contacts_set_updated_at
before update on public.client_contacts
for each row execute function public.set_updated_at();

create index if not exists client_contacts_client_idx
on public.client_contacts(client_id, updated_at desc);

create index if not exists clients_client_user_idx
on public.clients(client_user_id);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  name text not null,
  description text null,
  status public.project_status not null default 'active',
  start_date date null,
  end_date date null,
  budget numeric(12,2) null,
  currency text not null default 'ILS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- Extend tasks with project_id (nullable)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='tasks' and column_name='project_id'
  ) then
    alter table public.tasks add column project_id uuid null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='tasks_project_id_fkey'
  ) then
    alter table public.tasks
      add constraint tasks_project_id_fkey
      foreign key (project_id) references public.projects(id) on delete set null;
  end if;
end $$;

-- Extend tasks with client_id (nullable) so tasks can be general or client-related
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='tasks' and column_name='client_id'
  ) then
    alter table public.tasks add column client_id uuid null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='tasks_client_id_fkey'
  ) then
    alter table public.tasks
      add constraint tasks_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null;
  end if;
end $$;

-- Documents (metadata for Supabase Storage files)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind public.doc_kind not null default 'general',
  title text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text null,
  size_bytes bigint null,
  uploaded_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create index if not exists documents_project_kind_created_idx
on public.documents(project_id, kind, created_at desc);

-- Invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  invoice_no text not null,
  status public.invoice_status not null default 'draft',
  issued_at date null,
  due_at date null,
  currency text not null default 'ILS',
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_invoice_no_key unique(invoice_no)
);

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create index if not exists invoices_project_status_issued_idx
on public.invoices(project_id, status, issued_at desc);

-- Invoice items
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  title text not null,
  qty numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists invoice_items_invoice_idx
on public.invoice_items(invoice_id);

-- Transactions (income / expense)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type public.transaction_type not null,
  category text null,
  description text null,
  amount numeric(12,2) not null,
  currency text not null default 'ILS',
  occurred_at timestamptz not null default now(),
  receipt_document_id uuid null references public.documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create index if not exists transactions_project_type_occurred_idx
on public.transactions(project_id, type, occurred_at desc);

-- Helpful composite indexes
create index if not exists projects_client_status_idx on public.projects(client_id, status);
create index if not exists tasks_project_status_updated_idx on public.tasks(project_id, status, updated_at desc);
create index if not exists tasks_client_status_updated_idx on public.tasks(client_id, status, updated_at desc);

-- RLS (dev-friendly)
alter table public.clients enable row level security;
alter table public.client_contacts enable row level security;
alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.transactions enable row level security;

do $$
begin
  -- CLIENTS
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='clients' and policyname='clients_select_all') then
    create policy clients_select_all on public.clients for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='clients' and policyname='clients_write_all') then
    create policy clients_write_all on public.clients for all using (true) with check (true);
  end if;

  -- CLIENT CONTACTS
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='client_contacts' and policyname='client_contacts_select_all') then
    create policy client_contacts_select_all on public.client_contacts for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='client_contacts' and policyname='client_contacts_write_all') then
    create policy client_contacts_write_all on public.client_contacts for all using (true) with check (true);
  end if;

  -- PROJECTS
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='projects' and policyname='projects_select_all') then
    create policy projects_select_all on public.projects for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='projects' and policyname='projects_write_all') then
    create policy projects_write_all on public.projects for all using (true) with check (true);
  end if;

  -- DOCUMENTS
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='documents' and policyname='documents_select_all') then
    create policy documents_select_all on public.documents for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='documents' and policyname='documents_write_all') then
    create policy documents_write_all on public.documents for all using (true) with check (true);
  end if;

  -- INVOICES
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='invoices' and policyname='invoices_select_all') then
    create policy invoices_select_all on public.invoices for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='invoices' and policyname='invoices_write_all') then
    create policy invoices_write_all on public.invoices for all using (true) with check (true);
  end if;

  -- INVOICE ITEMS
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='invoice_items' and policyname='invoice_items_select_all') then
    create policy invoice_items_select_all on public.invoice_items for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='invoice_items' and policyname='invoice_items_write_all') then
    create policy invoice_items_write_all on public.invoice_items for all using (true) with check (true);
  end if;

  -- TRANSACTIONS
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='transactions' and policyname='transactions_select_all') then
    create policy transactions_select_all on public.transactions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='transactions' and policyname='transactions_write_all') then
    create policy transactions_write_all on public.transactions for all using (true) with check (true);
  end if;
end $$;

