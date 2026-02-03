-- Deletes ONLY the demo rows that were previously seeded by this repo.
-- Safe to run multiple times.

begin;

-- Undo the linking of base-seeded tasks to the demo project (if it happened)
update public.tasks
set project_id = null
where id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
) and project_id = 'a1111111-1111-1111-1111-111111111111';

-- Delete demo tasks that were added
delete from public.tasks
where id in (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
);

-- Delete demo invoice + items
delete from public.invoice_items
where invoice_id = 'c1111111-aaaa-bbbb-cccc-111111111111';

delete from public.invoices
where id = 'c1111111-aaaa-bbbb-cccc-111111111111';

-- Delete demo transactions
delete from public.transactions
where id in (
  'e1111111-1111-1111-1111-111111111111',
  'e2222222-2222-2222-2222-222222222222'
);

-- Delete demo documents
delete from public.documents
where id in (
  'd0c00000-0000-0000-0000-000000000001',
  'd0c00000-0000-0000-0000-000000000002'
);

-- Delete demo projects (will cascade to related rows where FKs are cascade)
delete from public.projects
where id in (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222'
);

-- Delete demo client contacts then clients
delete from public.client_contacts
where client_id in (
  'c1111111-1111-1111-1111-111111111111',
  'c2222222-2222-2222-2222-222222222222'
);

delete from public.clients
where id in (
  'c1111111-1111-1111-1111-111111111111',
  'c2222222-2222-2222-2222-222222222222'
);

-- Delete demo users (only if they still exist)
delete from public.users
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

commit;

