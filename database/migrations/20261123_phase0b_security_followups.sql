-- Phase 0 follow-ups (2026-11-23). Run after 20261123_phase0_security.sql.
-- Safe to re-run.
--
--   1. Legacy artists / venues tables: only admins write (any signed-in user could).
--   2. authentication_log: only the artwork owner or an admin can add entries,
--      and only in their own name (anyone signed in could forge the trail).
--   3. Admins can add provenance entries (the admin API route allowed it, the
--      database didn't).
--   4. Message notifications reach the other person in the conversation
--      (they were silently blocked).
--   5. Follow button: the app uses `followers`; the "new follower"
--      notification trigger was on the legacy `follows` table and referenced
--      columns that table doesn't have.
--   6. Visitors without an account can message an artist again, through a
--      checked, rate-limited function.
--   7. Trigger functions can no longer be called directly through the API, and
--      all functions have a fixed search_path (Supabase advisor warnings).

begin;

-- ─── 1. Legacy directory tables ─────────────────────────────────────────────
drop policy if exists "artists_insert" on public.artists;
drop policy if exists "artists_update" on public.artists;
drop policy if exists "Admins manage artists" on public.artists;
create policy "Admins manage artists" on public.artists
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "venues_insert" on public.venues;
drop policy if exists "venues_update" on public.venues;
drop policy if exists "Admins manage venues" on public.venues;
create policy "Admins manage venues" on public.venues
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── 2. Authentication audit log ────────────────────────────────────────────
drop policy if exists "Auth log insert by authenticated" on public.authentication_log;
drop policy if exists "Owner or admin writes auth log" on public.authentication_log;
create policy "Owner or admin writes auth log" on public.authentication_log
  for insert with check (
    performed_by = auth.uid()
    and (
      public.is_admin()
      or exists (select 1 from public.artworks a where a.id = artwork_id and a.user_id = auth.uid())
    )
  );

-- ─── 3. Admin provenance ────────────────────────────────────────────────────
drop policy if exists "Admins manage provenance" on public.provenance_entries;
create policy "Admins manage provenance" on public.provenance_entries
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── 4. Message notifications to the other participant ──────────────────────
drop policy if exists "Notify conversation partner" on public.notifications;
create policy "Notify conversation partner" on public.notifications
  for insert with check (
    type = 'message'
    and exists (
      select 1 from public.conversations c
      where (c.participant_a = auth.uid() and c.participant_b = user_id)
         or (c.participant_b = auth.uid() and c.participant_a = user_id)
    )
  );

-- ─── 5. Follows ─────────────────────────────────────────────────────────────
create or replace function public.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  follower_name text;
begin
  select full_name into follower_name from public.profiles where id = new.follower_id;
  insert into public.notifications (user_id, type, title, body, data)
  values (
    new.following_id,
    'follow',
    'New follower',
    coalesce(nullif(follower_name, ''), 'Someone') || ' started following you',
    jsonb_build_object('follower_id', new.follower_id)
  );
  return new;
end;
$$;

drop trigger if exists on_new_follow on public.follows;
drop trigger if exists on_new_follow on public.followers;
create trigger on_new_follow
  after insert on public.followers
  for each row execute function public.notify_new_follower();

create unique index if not exists followers_unique_pair on public.followers (follower_id, following_id);

-- ─── 6. Guest messages ──────────────────────────────────────────────────────
create or replace function public.start_guest_conversation(
  p_recipient_id uuid,
  p_guest_name text,
  p_guest_email text,
  p_body text,
  p_context_type text default 'direct',
  p_context_id text default null,
  p_context_title text default null,
  p_context_meta jsonb default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_name  text := left(trim(coalesce(p_guest_name, '')), 100);
  v_email text := lower(left(trim(coalesce(p_guest_email, '')), 200));
  v_body  text := left(trim(coalesce(p_body, '')), 4000);
  v_convo uuid;
begin
  if v_name = '' or v_body = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Name, valid email and message are required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_recipient_id) then
    raise exception 'Recipient not found' using errcode = '22023';
  end if;
  -- Basic spam brake: 5 per email per hour, 20 guest messages per recipient per hour.
  if (select count(*) from public.conversations
      where guest_email = v_email and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.conversations
      where participant_b = p_recipient_id and participant_a is null
        and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many messages, try again later' using errcode = '53400';
  end if;

  insert into public.conversations (
    participant_a, participant_b, context_type, context_id, context_title, context_meta,
    guest_name, guest_email, last_message_at, last_message_preview
  ) values (
    null, p_recipient_id, coalesce(nullif(p_context_type, ''), 'direct'), p_context_id,
    left(p_context_title, 200), p_context_meta, v_name, v_email, now(), left(v_body, 120)
  ) returning id into v_convo;

  insert into public.messages (conversation_id, sender_id, guest_name, guest_email, body, read_by_a, read_by_b)
  values (v_convo, null, v_name, v_email, v_body, true, false);

  insert into public.notifications (user_id, type, title, body, data)
  values (p_recipient_id, 'message', 'Message from ' || v_name, left(v_body, 80),
          jsonb_build_object('conversation_id', v_convo));

  return v_convo;
end;
$$;

revoke all on function public.start_guest_conversation(uuid, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.start_guest_conversation(uuid, text, text, text, text, text, text, jsonb) to anon, authenticated;

-- ─── 7. Function hardening ──────────────────────────────────────────────────
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
  loop
    execute format('alter function %s set search_path = public', f);
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end;
$$;

commit;
