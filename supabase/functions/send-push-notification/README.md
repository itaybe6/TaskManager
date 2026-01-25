# send-push-notification (Edge Function)

Triggered by `supabase/schema.notifications.sql` via `pg_net` on INSERT into `public.notifications`.

## Required env vars (Supabase -> Edge Functions -> Secrets)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WEBHOOK_SECRET` (optional but recommended)

## SQL trigger config

In `supabase/schema.notifications.sql`, replace:

- `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notification`

with your real project URL.

If you set `WEBHOOK_SECRET`, also set `app.webhook_secret` in Postgres so the trigger sends the same header:

```sql
select set_config('app.webhook_secret', 'YOUR_SECRET', true);
```

