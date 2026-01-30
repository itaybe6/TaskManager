-- Seed data for TaskManager (users + tasks)
-- Run AFTER schema.sql

-- Idempotent reset (safe for dev)
delete from public.tasks;
delete from public.users;

-- Users
insert into public.users (id, display_name, avatar_url, role) values
  ('11111111-1111-1111-1111-111111111111', 'דניאל כהן', null, 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'נועה לוי', null, 'admin'),
  ('33333333-3333-3333-3333-333333333333', 'איתי', null, 'admin');

-- Tasks (examples similar to the UI mockups)
insert into public.tasks (
  id, description, status, assignee_id, due_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'יש לאסוף את כל הנתונים מהמחלקות השונות ולבנות את המצגת הסופית לישיבת ההנהלה. חשוב לשים דגש על נתוני הצמיחה והתחזיות לשנה הבאה.',
    'todo',
    '11111111-1111-1111-1111-111111111111',
    now() + interval '2 days'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'מעבר על סטטוסים, חסמים והחלטות לשבוע הבא.',
    'todo',
    '22222222-2222-2222-2222-222222222222',
    now() + interval '1 day' + interval '14 hours'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'לשלוח חשבוניות ללקוחות עבור החודש האחרון.',
    'done',
    '33333333-3333-3333-3333-333333333333',
    now() - interval '3 days'
  );

