-- Seed data for Business schema
-- Run AFTER:
--   1) supabase/schema.sql
--   2) supabase/schema.business.sql
-- Optional:
--   supabase/seed.sql (this file upserts required users anyway)

-- Upsert users (if base seed not executed)
insert into public.users (id, display_name, role_title, avatar_url)
values
  ('11111111-1111-1111-1111-111111111111', 'דניאל כהן', 'מנהל מוצר', null),
  ('22222222-2222-2222-2222-222222222222', 'נועה לוי', 'מעצבת מוצר', null),
  ('33333333-3333-3333-3333-333333333333', 'איתי', 'מנהל מערכת', null)
on conflict (id) do update set
  display_name = excluded.display_name,
  role_title = excluded.role_title,
  avatar_url = excluded.avatar_url,
  updated_at = now();

-- Clean business tables (order matters because of FKs)
delete from public.invoice_items;
delete from public.invoices;
delete from public.transactions;
delete from public.documents;
-- tasks remain; we will update/link them to projects below
delete from public.price_list_items;
delete from public.projects;
delete from public.clients;

-- Clients
insert into public.clients (id, name, contact_name, email, phone, address, notes)
values
  ('c1111111-1111-1111-1111-111111111111', 'חברת אלפא בע״מ', 'יובל כהן', 'alpha@example.com', '050-0000001', 'ת״א', 'לקוח אסטרטגי'),
  ('c2222222-2222-2222-2222-222222222222', 'בטא שירותים', 'שירה לוי', 'beta@example.com', '050-0000002', 'חיפה', null);

-- Projects
insert into public.projects (id, client_id, name, description, status, start_date, end_date, budget, currency)
values
  ('p1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'מיתוג ומצגות Q4', 'סט מצגות והכנות לישיבת הנהלה', 'active', current_date - 7, null, 25000, 'ILS'),
  ('p2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'שדרוג תהליך שירות', 'טיוב תהליכים והטמעת כלים', 'planned', current_date, null, 18000, 'ILS');

-- Link existing seeded tasks to a project (if they exist)
update public.tasks
set project_id = 'p1111111-1111-1111-1111-111111111111'
where id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

-- Add a couple more project tasks
insert into public.tasks (id, title, description, status, priority, assignee_id, due_at, tags, project_id)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'איסוף נתונים מכל המחלקות',
    'לאסוף KPI ונתוני מכירות, שיווק ומוצר.',
    'todo',
    'high',
    '11111111-1111-1111-1111-111111111111',
    now() + interval '1 day',
    array['כספים','נתונים'],
    'p1111111-1111-1111-1111-111111111111'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'הכנת מסמך דרישות לשדרוג השירות',
    'מסמך Requirements ראשוני לפרויקט בטא.',
    'in_progress',
    'medium',
    '22222222-2222-2222-2222-222222222222',
    now() + interval '5 days',
    array['תהליך','שירות'],
    'p2222222-2222-2222-2222-222222222222'
  )
on conflict (id) do nothing;

-- Documents (metadata only)
insert into public.documents (id, project_id, kind, title, storage_path, file_name, mime_type, size_bytes, uploaded_by)
values
  (
    'd0c00000-0000-0000-0000-000000000001',
    'p1111111-1111-1111-1111-111111111111',
    'general',
    'בריף מצגת Q4',
    'projects/p1111111/brief-q4.pdf',
    'brief-q4.pdf',
    'application/pdf',
    245812,
    '33333333-3333-3333-3333-333333333333'
  ),
  (
    'd0c00000-0000-0000-0000-000000000002',
    'p1111111-1111-1111-1111-111111111111',
    'receipt',
    'קבלה – רכישת אייקונים',
    'projects/p1111111/receipts/icons.png',
    'icons.png',
    'image/png',
    58231,
    '33333333-3333-3333-3333-333333333333'
  );

-- Price list
insert into public.price_list_items (id, title, unit, unit_price, currency, is_active)
values
  ('pr111111-1111-1111-1111-111111111111', 'שעת ייעוץ', 'hour', 450, 'ILS', true),
  ('pr222222-2222-2222-2222-222222222222', 'מצגת מעוצבת', 'unit', 3500, 'ILS', true),
  ('pr333333-3333-3333-3333-333333333333', 'תחזוקה חודשית', 'month', 1200, 'ILS', true);

-- Invoice + items
insert into public.invoices (id, project_id, invoice_no, status, issued_at, due_at, currency, subtotal, tax, total, notes)
values
  (
    'inv11111-1111-1111-1111-111111111111',
    'p1111111-1111-1111-1111-111111111111',
    '2026-0001',
    'sent',
    current_date,
    current_date + 14,
    'ILS',
    3950,
    0,
    3950,
    'תודה על העבודה המשותפת.'
  );

insert into public.invoice_items (id, invoice_id, title, qty, unit_price, line_total)
values
  ('it111111-1111-1111-1111-111111111111', 'inv11111-1111-1111-1111-111111111111', 'שעת ייעוץ', 1, 450, 450),
  ('it222222-2222-2222-2222-222222222222', 'inv11111-1111-1111-1111-111111111111', 'מצגת מעוצבת', 1, 3500, 3500);

-- Transactions (income/expense)
insert into public.transactions (id, project_id, type, category, description, amount, currency, occurred_at, receipt_document_id)
values
  (
    'tx111111-1111-1111-1111-111111111111',
    'p1111111-1111-1111-1111-111111111111',
    'income',
    'חשבונית',
    'חשבונית 2026-0001 (נשלחה)',
    3950,
    'ILS',
    now(),
    null
  ),
  (
    'tx222222-2222-2222-2222-222222222222',
    'p1111111-1111-1111-1111-111111111111',
    'expense',
    'עיצוב',
    'רכישת אייקונים',
    120,
    'ILS',
    now() - interval '2 days',
    'd0c00000-0000-0000-0000-000000000002'
  );

