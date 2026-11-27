-- Real-world edge cases before launch (2026-11-27).
-- Run once in the Supabase SQL editor, after the PR is merged. Safe to run again.
--
--   1. New accounts get clean web addresses again ("Jiří O'Brien" becomes
--      jiriobrien1234, not jiřío'brien1234). The fix from 24 Nov was undone by
--      the curator update on 25 Nov. Sign-up also no longer fails if the
--      random number happens to be taken.
--   2. People can delete their own account (Profile, at the bottom). Their
--      works, posts, chats and files go. Agreements signed by both sides stay
--      with the other person, because they're a record of a deal.
--   3. Deleting an account no longer gets stuck when that person invited
--      someone, or wrote a provenance or authentication entry.
--   4. The admin "delete user" button removes the whole account, not just the
--      profile (before, the person could still sign in to an empty account).
--   5. Nobody can record a sale in someone else's name.

-- ─── 1. Clean usernames, again ─────────────────────────────────────────────
create or replace function public.username_from(p_text text)
returns text language sql immutable as $$
  select coalesce(nullif(left(regexp_replace(
    translate(lower(coalesce(p_text, '')),
      'áàâäãåāăąçćčďéèêëēėęěíìîïīįłñńňóòôöõøōőřšśťúùûüūůűųýÿžźżß',
      'aaaaaaaaacccdeeeeeeeeiiiiiilnnnoooooooorsstuuuuuuuuyyzzzs'),
    '[^a-z0-9]+', '', 'g'), 24), ''), 'artist');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested text := new.raw_user_meta_data->>'role';
  base text := public.username_from(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)));
  candidate text;
  tries int := 0;
begin
  loop
    candidate := base || floor(random() * 10000)::text;
    exit when not exists (select 1 from public.profiles where username = candidate);
    tries := tries + 1;
    if tries > 20 then candidate := base || floor(random() * 100000000)::text; exit; end if;
  end loop;

  insert into public.profiles (id, email, full_name, role, username)
  values (
    new.id,
    lower(new.email),
    left(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), 100),
    case when requested in ('artist', 'gallery', 'venue', 'curator') then requested else 'artist' end,
    candidate
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Optional: clean the usernames that already have odd characters (one today).
-- This changes that person's public address, so old links to it stop
-- working. Remove the two dashes to run it.
-- update public.profiles
--   set username = public.username_from(username) || floor(random() * 10000)::text
--   where username !~ '^[a-z0-9_]+$';

-- ─── 3. Nothing may block an account from being deleted ────────────────────
alter table public.profiles drop constraint if exists profiles_referred_by_fkey;
alter table public.profiles add constraint profiles_referred_by_fkey
  foreign key (referred_by) references auth.users (id) on delete set null;

alter table public.provenance_entries drop constraint if exists provenance_entries_added_by_fkey;
alter table public.provenance_entries add constraint provenance_entries_added_by_fkey
  foreign key (added_by) references auth.users (id) on delete set null;

alter table public.authentication_log drop constraint if exists authentication_log_performed_by_fkey;
alter table public.authentication_log add constraint authentication_log_performed_by_fkey
  foreign key (performed_by) references auth.users (id) on delete set null;

-- A signed agreement outlives the account of the person who sent it: the
-- other side keeps their copy. (Who sent it stays in the agreement's text.)
alter table public.contracts alter column initiator_id drop not null;
alter table public.contracts drop constraint if exists contracts_initiator_id_fkey;
alter table public.contracts add constraint contracts_initiator_id_fkey
  foreign key (initiator_id) references auth.users (id) on delete set null;

-- ─── 2. Delete my account ──────────────────────────────────────────────────
-- The files a person uploaded, so the app can remove them first (files can
-- only be removed through Supabase Storage, not with SQL).
create or replace function public.my_storage_files()
returns table (bucket text, path text)
language sql stable security definer set search_path = public, storage as $$
  select o.bucket_id::text, o.name::text from storage.objects o
   where o.owner_id = auth.uid()::text
     and o.bucket_id in ('avatars', 'post-images', 'artworks', 'artwork-images');
$$;
revoke all on function public.my_storage_files() from public, anon;
grant execute on function public.my_storage_files() to authenticated;

-- People may remove their own files (two buckets had no rule for it).
drop policy if exists "Owners delete their own files" on storage.objects;
create policy "Owners delete their own files" on storage.objects
  for delete to authenticated
  using (owner_id = (select auth.uid())::text
         and bucket_id in ('avatars', 'post-images', 'artworks', 'artwork-images'));

create or replace function public.delete_my_account()
returns void
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if exists (select 1 from profiles where id = me and role = 'admin') then
    raise exception 'An admin account can''t delete itself here. Remove the admin role first.' using errcode = '42501';
  end if;
  -- Agreements this person sent that aren't signed by both sides go with them.
  delete from contracts where initiator_id = me and executed_at is null;
  -- Everything else follows from the account (works, posts, chats, deals...).
  delete from auth.users where id = me;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ─── 4. Admin: delete the whole account ────────────────────────────────────
create or replace function public.admin_delete_user(p_id uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_id = auth.uid() then raise exception 'You can''t delete your own admin account here' using errcode = '42501'; end if;
  delete from contracts where initiator_id = p_id and executed_at is null;
  delete from auth.users where id = p_id;
end $$;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ─── 5. Sales are recorded by the person they belong to ────────────────────
drop policy if exists "Sales are recorded by their owner" on public.sales;
create policy "Sales are recorded by their owner" on public.sales
  as restrictive for insert to public
  with check (user_id = (select auth.uid()));

-- ─── Check ─────────────────────────────────────────────────────────────────
-- Should return: clean_signup = true, blockers = 0, functions = 3.
select
  (select prosrc like '%username_from%' from pg_proc where proname = 'handle_new_user' and pronamespace = 'public'::regnamespace) as clean_signup,
  (select count(*) from pg_constraint where contype = 'f' and confdeltype = 'a'
     and confrelid = 'auth.users'::regclass and connamespace = 'public'::regnamespace) as blockers,
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
     and proname in ('my_storage_files', 'delete_my_account', 'admin_delete_user')) as functions;
