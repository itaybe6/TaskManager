## Supabase פרומפט מוכן (SQL Editor)

הדבק ב־Supabase:

- **שלב 1 (סכמה)**: הרץ את הקובץ `supabase/schema.sql`
- **שלב 2 (סכמה עסקית)**: הרץ את הקובץ `supabase/schema.business.sql`
- **שלב 3 (נתונים)**: הרץ את הקובץ `supabase/seed.sql`
- **שלב 4 (נתונים עסקיים)**: הרץ את הקובץ `supabase/seed.business.sql`

### פרומפט קצר להדבקה לצ׳אט / AI Assistant של Supabase

צור לי ב־Supabase (Postgres) סכמה לפרויקט “TaskManager” עם:

- טבלת `public.users`:
  - `id uuid primary key default gen_random_uuid()`
  - `display_name text not null`
  - `role_title text`
  - `avatar_url text`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
- טבלת `public.tasks`:
  - `id uuid primary key default gen_random_uuid()`
  - `title text not null`
  - `description text`
  - `status` enum עם הערכים: `todo`, `in_progress`, `done` (ברירת מחדל `todo`)
  - `priority` enum עם הערכים: `low`, `medium`, `high` (ברירת מחדל `medium`)
  - `assignee_id uuid references public.users(id) on delete set null`
  - `due_at timestamptz`
  - `tags text[] default '{}'`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
- טריגר שמעדכן `updated_at` בכל `UPDATE` לשתי הטבלאות.
- אינדקסים:
  - על `tasks.status`, `tasks.priority`, `tasks.due_at`, `tasks.updated_at desc`, `tasks.assignee_id`
  - אינדקס חיפוש GIN על `to_tsvector(title || ' ' || description)`
- הפעל RLS לשתי הטבלאות + מדיניות פיתוח זמנית שמאפשרת CRUD לכולם (אזהרה: לא לפרודקשן).

בסוף, צור גם קובץ seed שמכניס 3 משתמשים ו־3 משימות לדוגמה.

### פרומפט “עסקי” (טבלאות מפורטות לעסק)

הרחב את הסכמה עם:
- `clients` (לקוחות)
- `projects` (פרויקטים) עם FK ל־clients
- הרחבת `tasks` עם `project_id` (FK ל־projects, nullable)
- `documents` (מטא־דאטה לקבצים ב־Supabase Storage) עם `project_id` + `uploaded_by`
- `invoices` + `invoice_items` (חשבוניות עם שורות)
- `transactions` (income/expense) כולל קישור אופציונלי למסמך קבלה
- `price_list_items` (מחירון)

כולל enums, אינדקסים, טריגר `updated_at`, והפעלת RLS עם policies פתוחות לפיתוח.

