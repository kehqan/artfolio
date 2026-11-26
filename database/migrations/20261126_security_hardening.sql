-- Security before launch (2026-11-26). Run after 20261126_legal.sql.
-- Safe to run more than once.
--
--   1. Speed limits: nobody can send hundreds of messages, chats, reports,
--      deals, posts, follows or invites in a few minutes.
--   2. Block a person: they can't message you, start a deal with you or
--      follow you. Blocking also removes follows both ways.
--   3. Reports get a fifth reason: spam, scams or harassment.
--   4. People who sign an agreement through a link confirm their email first,
--      with a 6-digit code. The signing record says so.
--   5. Old tables: two unused tables (viewer_profiles, discovery_offers) no
--      longer take new rows; passport views only count real works.
--   6. Housekeeping from the Supabase security check: trigger functions can't
--      be called from outside, and nine helper functions get a fixed
--      search_path.

-- ─── 1. Speed limits ───────────────────────────────────────────────────────
create table if not exists public.rate_events (
  id      bigint generated always as identity primary key,
  user_id uuid not null,
  kind    text not null,
  at      timestamptz not null default now()
);
create index if not exists rate_events_lookup on public.rate_events (user_id, kind, at desc);
alter table public.rate_events enable row level security;
revoke all on public.rate_events from anon, authenticated;

-- Counts what the signed-in person did lately and stops them past the limit.
-- Database jobs, the service role and admins are never limited.
create or replace function public.rate_check(p_kind text, p_per_min int, p_per_hour int, p_per_day int)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  n_min int; n_hour int; n_day int;
begin
  if v_uid is null or public.is_admin() then return; end if;
  select count(*) filter (where at > now() - interval '1 minute'),
         count(*) filter (where at > now() - interval '1 hour'),
         count(*)
    into n_min, n_hour, n_day
    from rate_events
   where user_id = v_uid and kind = p_kind and at > now() - interval '1 day';
  if n_min >= p_per_min or n_hour >= p_per_hour or n_day >= p_per_day then
    raise exception 'You''re doing that a lot. Wait a few minutes and try again.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into rate_events (user_id, kind) values (v_uid, p_kind);
end $$;
revoke all on function public.rate_check(text, int, int, int) from public, anon, authenticated;

-- One trigger function for every table: arguments are kind, per minute, per hour, per day.
create or replace function public.rate_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform rate_check(tg_argv[0], tg_argv[1]::int, tg_argv[2]::int, tg_argv[3]::int);
  return new;
end $$;

do $$
declare t record;
begin
  for t in
    select * from (values
      ('messages',        'message',        '20', '300', '1000'),
      ('conversations',   'conversation',   '5',  '30',  '100'),
      ('notifications',   'notification',   '30', '400', '1500'),
      ('content_reports', 'report',         '3',  '10',  '20'),
      ('deals',           'deal',           '5',  '30',  '100'),
      ('contracts',       'contract',       '5',  '30',  '60'),
      ('project_invites', 'project_invite', '10', '60',  '150'),
      ('scene_posts',     'scene_post',     '3',  '20',  '50'),
      ('posts',           'post',           '5',  '30',  '100'),
      ('followers',       'follow',         '30', '200', '500'),
      ('artworks',        'artwork',        '30', '300', '1000')
    ) as v(tbl, kind, per_min, per_hour, per_day)
  loop
    if to_regclass('public.' || t.tbl) is not null then
      execute format('drop trigger if exists rate_guard on public.%I', t.tbl);
      execute format('create trigger rate_guard before insert on public.%I for each row execute function public.rate_guard(%L, %L, %L, %L)',
                     t.tbl, t.kind, t.per_min, t.per_hour, t.per_day);
    end if;
  end loop;
end $$;

-- A message can be long, but not a book: stops one message filling the chat.
-- (NOT VALID: old messages aren't checked, new ones are.)
alter table public.messages drop constraint if exists messages_body_length;
alter table public.messages add constraint messages_body_length check (char_length(body) <= 5000) not valid;

-- Old speed records are only needed for a day.
do $$ begin
  perform cron.schedule('rate_events_cleanup', '17 3 * * *', $c$delete from public.rate_events where at < now() - interval '2 days'$c$);
exception when others then
  raise notice 'pg_cron not available: delete old rows from rate_events by hand now and then';
end $$;

-- ─── 2. Block a person ─────────────────────────────────────────────────────
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon;
grant select, insert, delete on public.user_blocks to authenticated;
drop policy if exists "See who you blocked" on public.user_blocks;
create policy "See who you blocked" on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
drop policy if exists "Block someone" on public.user_blocks;
create policy "Block someone" on public.user_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
drop policy if exists "Unblock someone" on public.user_blocks;
create policy "Unblock someone" on public.user_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

drop trigger if exists rate_guard on public.user_blocks;
create trigger rate_guard before insert on public.user_blocks
  for each row execute function public.rate_guard('block', '10', '60', '200');

-- Either of the two blocked the other. Only used inside the database.
create or replace function public.is_blocked(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_a is not null and p_b is not null and exists (
    select 1 from user_blocks
     where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a));
$$;
revoke all on function public.is_blocked(uuid, uuid) from public, anon, authenticated;

create or replace function public.block_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_a uuid; v_b uuid; c record;
begin
  if tg_table_name = 'messages' then
    select participant_a, participant_b into c from conversations where id = new.conversation_id;
    v_a := new.sender_id;
    v_b := case when c.participant_a = new.sender_id then c.participant_b else c.participant_a end;
  elsif tg_table_name = 'conversations' then
    v_a := new.participant_a; v_b := new.participant_b;
  elsif tg_table_name = 'deals' then
    v_a := new.artist_id; v_b := new.venue_id;
  elsif tg_table_name = 'followers' then
    v_a := new.follower_id; v_b := new.following_id;
  end if;
  if is_blocked(v_a, v_b) then
    raise exception 'You can''t contact this person.' using errcode = 'P0001', hint = 'blocked';
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['messages', 'conversations', 'deals', 'followers'] loop
    execute format('drop trigger if exists a_block_guard on public.%I', t);
    execute format('create trigger a_block_guard before insert on public.%I for each row execute function public.block_guard()', t);
  end loop;
end $$;

-- Blocking someone also stops the follows between you.
create or replace function public.block_unfollow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from followers
   where (follower_id = new.blocker_id and following_id = new.blocked_id)
      or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end $$;
drop trigger if exists block_unfollow on public.user_blocks;
create trigger block_unfollow after insert on public.user_blocks
  for each row execute function public.block_unfollow();

-- ─── 3. Reports: spam, scams or harassment ─────────────────────────────────
alter table public.content_reports drop constraint if exists content_reports_reason_check;
alter table public.content_reports add constraint content_reports_reason_check
  check (reason in ('copyright', 'illegal', 'personal', 'abuse', 'other'));

create or replace function public.report_content(
  p_url text, p_reason text, p_details text, p_name text, p_email text,
  p_rights_holder boolean, p_good_faith boolean
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_email text := nullif(lower(trim(p_email)), '');
  v_id bigint;
  v_to text := (select nullif(trim(reports_to), '') from email_config where id);
begin
  if nullif(trim(p_url), '') is null or length(p_url) > 600 then raise exception 'Add the link to the page or work' using errcode = '22023'; end if;
  if p_reason not in ('copyright', 'illegal', 'personal', 'abuse', 'other') then raise exception 'Pick what is wrong' using errcode = '22023'; end if;
  if length(trim(coalesce(p_details, ''))) < 10 or length(p_details) > 4000 then raise exception 'Tell us a bit more (10 to 4000 characters)' using errcode = '22023'; end if;
  if nullif(trim(p_name), '') is null or length(p_name) > 200 then raise exception 'Add your name' using errcode = '22023'; end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then raise exception 'Add an email we can answer' using errcode = '22023'; end if;
  if not coalesce(p_good_faith, false) then raise exception 'Confirm that what you wrote is true' using errcode = '22023'; end if;
  if p_reason = 'copyright' and not coalesce(p_rights_holder, false) then
    raise exception 'Only the person who made the work, or someone acting for them, can report a copy' using errcode = '22023';
  end if;
  -- Keep it from being used to flood us.
  if (select count(*) from content_reports where reporter_email = v_email and created_at > now() - interval '1 day') >= 10
     or (select count(*) from content_reports where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Too many reports right now. Please write to us instead.' using errcode = '54000';
  end if;

  insert into content_reports (url, reason, details, reporter_name, reporter_email, rights_holder, good_faith, reporter_id)
  values (trim(p_url), p_reason, trim(p_details), trim(p_name), v_email, coalesce(p_rights_holder, false), true, auth.uid())
  returning id into v_id;

  perform email_enqueue(null, v_email, 'report_received', jsonb_build_object('report_id', v_id), interval '0 minutes', 'report_received:' || v_id);
  if v_to is not null then
    perform email_enqueue(null, v_to, 'report_new', jsonb_build_object('report_id', v_id), interval '0 minutes', 'report_new:' || v_id);
  end if;
  return v_id;
end $$;
revoke all on function public.report_content(text, text, text, text, text, boolean, boolean) from public;
grant execute on function public.report_content(text, text, text, text, text, boolean, boolean) to anon, authenticated;

-- ─── 4. Email code for people who sign through a link ──────────────────────
-- Only a hash of the code is kept. A code works for 15 minutes and 5 tries.
create table if not exists public.contract_sign_codes (
  contract_id  uuid primary key references public.contracts (id) on delete cascade,
  code_hash    text not null,
  email        text not null,
  expires_at   timestamptz not null,
  attempts     int not null default 0,
  sent_today   int not null default 1,
  first_sent_at timestamptz not null default now(),
  last_sent_at timestamptz not null default now()
);
alter table public.contract_sign_codes enable row level security;
revoke all on public.contract_sign_codes from anon, authenticated;

create or replace function public.sign_code_hash(p_contract uuid, p_code text) returns text
language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(p_contract::text || ':' || trim(p_code), 'sha256'), 'hex');
$$;
revoke all on function public.sign_code_hash(uuid, text) from public, anon, authenticated;

-- The signing page calls this before signing. Signed in as the other party:
-- no code needed. Otherwise a code goes to the email on the agreement.
create or replace function public.send_signing_code(p_contract_id uuid, p_token text)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  c public.contracts;
  s public.contract_sign_codes;
  v_code text;
begin
  select * into c from contracts where id = p_contract_id;
  if not found or c.status in ('draft', 'cancelled') or c.counterparty_signed_at is not null then
    raise exception 'Contract not available for signing' using errcode = '42501';
  end if;
  if auth.uid() is not null and c.counterparty_id = auth.uid() then
    return jsonb_build_object('needed', false);
  end if;
  if not (p_token is not null and c.counterparty_token is not null and c.counterparty_token = p_token) then
    raise exception 'Contract not available for signing' using errcode = '42501';
  end if;
  if nullif(trim(c.counterparty_email), '') is null then
    return jsonb_build_object('needed', false);
  end if;

  select * into s from contract_sign_codes where contract_id = c.id for update;
  if found then
    if s.last_sent_at > now() - interval '45 seconds' then
      raise exception 'We just sent a code. Wait a minute before asking for a new one.' using errcode = 'P0001', hint = 'rate_limited';
    end if;
    if s.first_sent_at > now() - interval '1 day' and s.sent_today >= 6 then
      raise exception 'Too many codes today. Try again tomorrow or ask the sender for help.' using errcode = 'P0001', hint = 'rate_limited';
    end if;
  end if;

  v_code := lpad(((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
  insert into contract_sign_codes (contract_id, code_hash, email, expires_at)
  values (c.id, sign_code_hash(c.id, v_code), lower(trim(c.counterparty_email)), now() + interval '15 minutes')
  on conflict (contract_id) do update set
    code_hash = excluded.code_hash, email = excluded.email, expires_at = excluded.expires_at, attempts = 0,
    sent_today = case when contract_sign_codes.first_sent_at > now() - interval '1 day' then contract_sign_codes.sent_today + 1 else 1 end,
    first_sent_at = case when contract_sign_codes.first_sent_at > now() - interval '1 day' then contract_sign_codes.first_sent_at else now() end,
    last_sent_at = now();

  perform email_enqueue(null, c.counterparty_email, 'sign_code',
    jsonb_build_object('contract_id', c.id, 'code', v_code), interval '0 minutes', null);
  return jsonb_build_object('needed', true, 'email', lower(trim(c.counterparty_email)));
end $$;
revoke all on function public.send_signing_code(uuid, text) from public;
grant execute on function public.send_signing_code(uuid, text) to anon, authenticated;

-- Signing now takes the code. The old three-argument version goes, so nobody
-- can sign through a link without it.
drop function if exists public.sign_contract_as_counterparty(uuid, text, text);
create or replace function public.sign_contract_as_counterparty(
  p_contract_id uuid, p_token text, p_signature text, p_code text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  c public.contracts;
  s public.contract_sign_codes;
  sig text := nullif(trim(p_signature), '');
  v_by_code boolean := false;
begin
  if sig is null or length(sig) > 200 then
    raise exception 'A signature name is required' using errcode = '22023';
  end if;

  select * into c from contracts where id = p_contract_id for update;
  if not found or c.status in ('draft', 'cancelled') then
    raise exception 'Contract not available for signing' using errcode = '42501';
  end if;
  if not (
    (p_token is not null and c.counterparty_token is not null and c.counterparty_token = p_token)
    or (auth.uid() is not null and c.counterparty_id = auth.uid())
  ) then
    raise exception 'Contract not available for signing' using errcode = '42501';
  end if;
  if c.counterparty_signed_at is not null then
    raise exception 'Contract already signed by counterparty' using errcode = '23505';
  end if;

  -- Through a link: the email code must match.
  if not (auth.uid() is not null and c.counterparty_id = auth.uid()) and nullif(trim(c.counterparty_email), '') is not null then
    if nullif(trim(p_code), '') is null then
      raise exception 'Enter the code we emailed you.' using errcode = 'P0001', hint = 'code_needed';
    end if;
    select * into s from contract_sign_codes where contract_id = c.id for update;
    if not found or s.expires_at < now() then
      return jsonb_build_object('error', 'That code has expired. Ask for a new one.');
    end if;
    if s.attempts >= 5 then
      return jsonb_build_object('error', 'Too many wrong tries. Ask for a new code.');
    end if;
    if s.code_hash <> sign_code_hash(c.id, p_code) then
      -- Returned, not raised, so the wrong try is counted.
      update contract_sign_codes set attempts = attempts + 1 where contract_id = c.id;
      return jsonb_build_object('error', 'That code isn''t right. Check the email and try again.');
    end if;
    delete from contract_sign_codes where contract_id = c.id;
    v_by_code := true;
  end if;

  perform set_config('artomango.signing_contract', c.id::text, true);
  update contracts set counterparty_signed_at = now(), counterparty_signature = sig where id = c.id;
  perform set_config('artomango.signing_contract', '', true);

  if v_by_code then
    update contract_signatures set signed_via = 'link, email confirmed with code'
     where contract_id = c.id and party = 'counterparty';
  end if;

  return get_contract_for_signing(c.id, p_token);
end $$;
revoke all on function public.sign_contract_as_counterparty(uuid, text, text, text) from public;
grant execute on function public.sign_contract_as_counterparty(uuid, text, text, text) to anon, authenticated;

-- The code email, plus the report emails from 20261126_legal.sql (same
-- function, so the two files stay in step).
create or replace function public.email_compose(r public.email_outbox, p_site text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare cr public.content_reports; v_why text; c public.contracts;
begin
  if r.kind = 'sign_code' then
    select * into c from contracts where id = (r.data->>'contract_id')::uuid;
    if not found or c.counterparty_signed_at is not null then return null; end if;
    return jsonb_build_object(
      'label', 'Signing code',
      'subject', 'Your signing code: ' || (r.data->>'code'),
      'heading', 'Your code is ' || (r.data->>'code'),
      'greeting', 'Hi ' || coalesce(nullif(trim(c.counterparty_name), ''), 'there') || ',',
      'paras', jsonb_build_array(
        'Type this code on the agreement page to sign "' || c.title || '". It works for 15 minutes.',
        'It shows us the person signing is the one this agreement was sent to. If you didn''t ask for it, ignore this email. Nobody can sign without the code.'),
      'button', 'Back to the agreement',
      'url', p_site || '/contracts/sign/' || c.id || '?t=' || c.counterparty_token,
      'line', 'Your code: ' || (r.data->>'code'));
  end if;
  if r.kind in ('report_received', 'report_new') then
    select * into cr from content_reports where id = (r.data->>'report_id')::bigint;
    if not found then return null; end if;
    v_why := case cr.reason when 'copyright' then 'It copies someone''s work'
                            when 'illegal' then 'It breaks the law'
                            when 'personal' then 'It shares someone''s private details'
                            when 'abuse' then 'Spam, a scam or harassment'
                            else 'Something else' end;
    if r.kind = 'report_received' then
      return jsonb_build_object(
        'label', 'Report received',
        'subject', 'We got your report',
        'heading', 'We got your report',
        'greeting', 'Hi ' || cr.reporter_name || ',',
        'paras', jsonb_build_array(
          'Thanks for telling us. A person, not a machine, will look at it and write back to you at this address, usually within 3 working days.',
          'If it''s urgent, reply to this email.'),
        'facts', jsonb_build_array(jsonb_build_array('Page', cr.url), jsonb_build_array('Why', v_why), jsonb_build_array('Report number', '#' || cr.id)),
        'button', 'See what happens next', 'url', p_site || '/report#next',
        'line', 'A person will look at it and write back.');
    end if;
    return jsonb_build_object(
      'label', 'New report',
      'subject', 'New report #' || cr.id || ': ' || v_why,
      'heading', 'Someone reported a page',
      'paras', jsonb_build_array(
        cr.reporter_name || ' (' || cr.reporter_email || ') reported ' || cr.url || '.',
        case when cr.rights_holder then 'They say it''s their work, or they act for the artist.' else 'They don''t say it''s their work.' end),
      'quote', left(cr.details, 600),
      'facts', jsonb_build_array(jsonb_build_array('Why', v_why), jsonb_build_array('Report number', '#' || cr.id)),
      'button', 'Open the page', 'url', cr.url,
      'line', v_why);
  end if;
  return email_compose_base(r, p_site);
end $$;

-- ─── 5. Old tables ─────────────────────────────────────────────────────────
-- Nothing in the app writes to these any more; any signed-in person could
-- add rows (even under someone else's id). Reading stays as it was.
drop policy if exists "viewer_profiles_insert" on public.viewer_profiles;
drop policy if exists "discovery_offers_insert" on public.discovery_offers;
revoke insert, update, delete on public.viewer_profiles from anon, authenticated;
revoke insert, update, delete on public.discovery_offers from anon, authenticated;

-- Passport views: still counted for anyone, but only for a real, visible work
-- and without storing an IP address.
drop policy if exists "Anyone can insert passport views" on public.passport_views;
create policy "Anyone can insert passport views" on public.passport_views for insert to anon, authenticated
  with check (viewer_ip is null and exists (select 1 from public.artworks a where a.id = artwork_id));

-- ─── 6. Housekeeping ───────────────────────────────────────────────────────
-- Trigger functions run on their own; nobody needs to call them through the API.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('username_from', 'email_img', 'email_date', 'email_city', 'projects_touch',
                         'contract_terms_json', 'email_is_news', 'email_esc', 'email_contract_facts')
  loop
    execute format('alter function %s set search_path = public, extensions', f.sig);
  end loop;
end $$;

-- Check: should list rate_guard and a_block_guard on the tables above.
select tgrelid::regclass as "table", tgname as "trigger"
  from pg_trigger where not tgisinternal and tgname in ('rate_guard', 'a_block_guard')
 order by 1, 2;
