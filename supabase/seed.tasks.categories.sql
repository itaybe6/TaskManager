-- Seed for task categories + assign existing tasks
-- Run AFTER:
--   supabase/schema.tasks.categories.sql

-- Upsert default categories (3 requested):
-- - Projects (פרויקטים)
-- - Marketing (פרסום)
-- - Finance (פיננסים)
insert into public.task_categories (id, name, slug, color)
values
  ('44444444-4444-4444-4444-444444444444', 'פרויקטים', 'projects', '#4d7fff'),
  ('55555555-5555-5555-5555-555555555555', 'פרסום', 'marketing', '#7c3aed'),
  ('66666666-6666-6666-6666-666666666666', 'פיננסים', 'finance', '#059669')
on conflict (slug) do update set
  name = excluded.name,
  color = excluded.color,
  updated_at = now();

-- Optional: assign existing seeded tasks by heuristic (safe/no-op if task IDs not present)
update public.tasks set category_id = '44444444-4444-4444-4444-444444444444'
where id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

update public.tasks set category_id = '66666666-6666-6666-6666-666666666666'
where id in ('cccccccc-cccc-cccc-cccc-cccccccccccc');

