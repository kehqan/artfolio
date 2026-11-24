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

## Where things are

- `src/app` – pages and API routes (`/dashboard/*` needs sign-in, `/admin` needs the admin role; see `src/middleware.ts`)
- `src/components/ui` – shared UI kit; see `DESIGN_SYSTEM.md`
- `src/styles/tokens.css` – design tokens
- `src/lib/supabase` – browser and server Supabase clients

## Working on it

Work on a branch and open a pull request; Vercel builds a preview for each
one. Run `npm run build` before pushing, since it also type-checks.
