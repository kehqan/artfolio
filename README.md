# Artomango

A platform for artists and venues: manage works, publish a public profile and
art passport, find collaborators in the Pool, run exhibitions and sign
contracts.

Built with Next.js 14 (App Router), Supabase (Postgres, Auth, Storage) and
Tailwind, deployed on Vercel.

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (publishable) key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps key for the map and place search |

No server-side secret is needed. Access control lives in the database
(row level security), so never put the Supabase service role key in this app.

## Database

`database/migrations/` holds the SQL changes, named by date and applied in
order in the Supabase SQL editor. `database/schema.sql` is a snapshot of the
whole public schema (tables, indexes, triggers, policies) taken on 2026-11-24;
refresh it after each migration. `database/migrations.sql` is an older partial
schema kept for reference only.

Admins are set by hand in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = '<email>';
```

Supabase Auth must list `<site>/reset-password` under
Authentication > URL Configuration > Redirect URLs for password reset emails.

## Emails

Emails about deals, agreements and messages are sent by the database, not by
the app, so the app still needs no server secret. Triggers put each event in
`email_outbox`; every minute pg_cron runs `email_send_due()`, which groups what
is waiting per person into one email and sends it through Resend with pg_net.
The Resend key lives in Supabase Vault. See
`database/migrations/20261124_emails.sql` for the setup, and check what went
out with `select * from email_log limit 50;` in the SQL editor.

## Crash reports and usage counts

Both are off until their keys are set in Vercel, and both keep personal data out.

- **Crash reports: Sentry** (EU region). Browser setup in `src/lib/crash.ts`
  (loads after the page), server in `src/sentry.server.config.ts`, what gets
  stripped in `src/lib/sentry-scrub.ts`. No session replay, no tracing.
- **Usage counts: PostHog** (EU cloud), no SDK and no cookies.
  `track("event")` from `src/lib/analytics.ts` posts to `/api/e`, which passes
  only known events on to PostHog without the visitor's IP. Add a new event
  name to both `AnalyticsEvent` and the list in `src/app/api/e/route.ts`.

Environment variables (Vercel > Settings > Environment Variables):
`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
(for readable stack traces), `NEXT_PUBLIC_POSTHOG_KEY`.

## Where things are

- `src/app` – pages and API routes (`/dashboard/*` needs sign-in, `/admin` needs the admin role; see `src/middleware.ts`)
- `src/components/ui` – shared UI kit; see `DESIGN_SYSTEM.md`
- `src/styles/tokens.css` – design tokens
- `src/lib/supabase` – browser and server Supabase clients

## Working on it

Work on a branch and open a pull request; Vercel builds a preview for each
one. Run `npm run build` before pushing, since it also type-checks.
