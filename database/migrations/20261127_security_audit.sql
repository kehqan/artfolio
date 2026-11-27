-- Security audit, 27 Nov 2026 (full pre-launch checklist).
-- Run once in the Supabase SQL editor AFTER the pull request is merged and
-- deployed. Safe to run twice. The last query prints a check row.
--
-- What it fixes:
--  1. Everyone's sign-up email was readable by anybody, signed in or not
--     (profiles.email). Now no visitor or user can read that column through
--     the API. Emails the app sends still work: they run inside the database.
--  2. Any signed-in user could read every "collaboration" row (incl. partner
--     emails), every "pool response" and every "discovery offer" (old tables).
--  3. Anyone could list every file name in the photo buckets. Photos still
--     load from their public links; only the listing is closed.
--  4. Anyone could add unlimited "passport view" rows (fills the database).
--  5. Small: one database function without a fixed search_path; the contract
--     fingerprint function was callable without signing in.

begin;

-- 1. Emails private ---------------------------------------------------------
-- Column-level grants: every column of profiles except email stays readable.
-- A NEW profiles column must be added to the grant (re-run this block) or
-- the app can't read it.
revoke select on public.profiles from anon, authenticated;
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name <> 'email';
  execute format('grant select (%s) on public.profiles to anon, authenticated', cols);
end $$;

-- 2. Old tables readable by any signed-in user ----------------------------
drop policy if exists collaborations_select on public.collaborations;
create policy collaborations_select on public.collaborations
  for select using ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists pool_responses_select on public.pool_responses;
create policy pool_responses_select on public.pool_responses
  for select using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.pool_requests r where r.id = pool_responses.request_id and r.user_id = (select auth.uid()))
    or public.is_admin()
  );

-- Not used by the app any more (no rows). Admins only.
drop policy if exists discovery_offers_select on public.discovery_offers;
create policy discovery_offers_select on public.discovery_offers
  for select using (public.is_admin());

-- 3. Storage: no public file listing ----------------------------------------
-- Public buckets serve files by link without any policy. These policies only
-- added "anyone can list every file". Owners keep seeing (and replacing)
-- their own files; admins keep the campaign bucket.
drop policy if exists "Artwork images are publicly viewable" on storage.objects;
drop policy if exists "artwork-images public read" on storage.objects;
drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "post-images public read" on storage.objects;
drop policy if exists "public read" on storage.objects;

drop policy if exists "Owners see their own files" on storage.objects;
create policy "Owners see their own files" on storage.objects
  for select to authenticated using (
    bucket_id in ('artworks', 'artwork-images', 'post-images', 'avatars')
    and (
      owner_id = (select auth.uid())::text
      or (string_to_array(name, '/'))[1] = (select auth.uid())::text
      or (bucket_id = 'avatars' and split_part(split_part(name, '/', 2), '.', 1) = (select auth.uid())::text)
    )
  );

-- 4. Passport views: a brake --------------------------------------------------
create index if not exists idx_passport_views_artwork_time on public.passport_views (artwork_id, viewed_at);

create or replace function public.passport_view_brake()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- More than 600 views of one work in an hour is a script, not people.
  if (select count(*) from public.passport_views
      where artwork_id = new.artwork_id and viewed_at > now() - interval '1 hour') >= 600 then
    return null; -- silently skip
  end if;
  return new;
end $$;
revoke execute on function public.passport_view_brake() from public, anon, authenticated;

drop trigger if exists passport_view_brake on public.passport_views;
create trigger passport_view_brake before insert on public.passport_views
  for each row execute function public.passport_view_brake();

-- 5. Small hardening ----------------------------------------------------------
alter function public.username_from(text) set search_path = public;
revoke execute on function public.contract_terms_hash(uuid) from anon, public;
grant execute on function public.contract_terms_hash(uuid) to authenticated;

commit;

-- Check: expect anon_reads_email = false, listing_policies = 0, brake = 1.
select
  has_column_privilege('anon', 'public.profiles', 'email', 'select') as anon_reads_email,
  has_column_privilege('anon', 'public.profiles', 'username', 'select') as anon_reads_username,
  (select count(*) from pg_policies where schemaname = 'storage' and cmd = 'SELECT' and roles = '{public}') as listing_policies,
  (select count(*) from pg_trigger where tgname = 'passport_view_brake') as brake;
