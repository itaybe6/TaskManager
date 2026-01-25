-- Seed data for TaskManager (users + tasks)
-- Run AFTER schema.sql

-- Idempotent reset (safe for dev)
delete from public.tasks;
delete from public.users;

-- Users
insert into public.users (id, display_name, avatar_url) values
  ('11111111-1111-1111-1111-111111111111', 'דניאל כהן', null),
  ('22222222-2222-2222-2222-222222222222', 'נועה לוי', null),
  ('33333333-3333-3333-3333-333333333333', 'איתי', null);

-- Tasks (examples similar to the UI mockups)
insert into public.tasks (
  id, title, description, status, priority, assignee_id, due_at, tags
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'הכנת מצגת רבעונית',
    'יש לאסוף את כל הנתונים מהמחלקות השונות ולבנות את המצגת הסופית לישיבת ההנהלה. חשוב לשים דגש על נתוני הצמיחה והתחזיות לשנה הבאה.',
    'in_progress',
    'high',
    '11111111-1111-1111-1111-111111111111',
    now() + interval '2 days',
    array['כספים','ניהול','רבעון 4']
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'פגישת צוות שבועית',
    'מעבר על סטטוסים, חסמים והחלטות לשבוע הבא.',
    'todo',
    'medium',
    '22222222-2222-2222-2222-222222222222',
    now() + interval '1 day' + interval '14 hours',
    array['ניהול']
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'שליחת חשבוניות',
    'לשלוח חשבוניות ללקוחות עבור החודש האחרון.',
    'done',
    'low',
    '33333333-3333-3333-3333-333333333333',
    now() - interval '3 days',
    array['כספים']
  );

