## Supabase פרומפט מוכן (SQL Editor)

הדבק ב־Supabase:

- **שלב 1 (סכמה)**: הרץ את הקובץ `supabase/schema.sql`
- **שלב 2 (סכמה עסקית)**: הרץ את הקובץ `supabase/schema.business.sql`
- **שלב 3 (קטגוריות משימות)**: הרץ את הקובץ `supabase/schema.tasks.categories.sql`
- **שלב 3.1 (התראות + פוש)**: הרץ את הקובץ `supabase/schema.notifications.sql`
- **שלב 4 (נתונים)**: הרץ את הקובץ `supabase/seed.sql`
- **שלב 5 (נתונים עסקיים)**: הרץ את הקובץ `supabase/seed.business.sql`
- **שלב 6 (seed קטגוריות משימות)**: הרץ את הקובץ `supabase/seed.tasks.categories.sql`

### פרומפט קצר להדבקה לצ׳אט / AI Assistant של Supabase

צור לי ב־Supabase (Postgres) סכמה לפרויקט “TaskManager” עם:

- טבלת `public.users`:
  - `id uuid primary key default gen_random_uuid()`
  - `display_name text not null`
  - `avatar_url text`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
- טבלת `public.tasks`:
  - `id uuid primary key default gen_random_uuid()`
  - `description text not null`
  - `status` enum עם הערכים: `todo`, `done` (ברירת מחדל `todo`)
  - `assignee_id uuid references public.users(id) on delete set null`
  - `due_at timestamptz`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
- טריגר שמעדכן `updated_at` בכל `UPDATE` לשתי הטבלאות.
- אינדקסים:
  - על `tasks.status`, `tasks.due_at`, `tasks.updated_at desc`, `tasks.assignee_id`
  - אינדקס חיפוש GIN על `to_tsvector(description)`
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

כולל enums, אינדקסים, טריגר `updated_at`, והפעלת RLS עם policies פתוחות לפיתוח.

