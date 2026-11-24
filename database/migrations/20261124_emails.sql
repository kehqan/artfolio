-- Artomango: emails for deals, agreements and messages
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- How it works
--   1. Triggers on deals, contracts and messages put a row in email_outbox
--      whenever something happens that the other person should hear about.
--   2. Every minute, pg_cron runs email_send_due(). It groups what's waiting
--      per person (several updates become one email), writes the emails and
--      hands them to Resend through pg_net in one batch call.
--   3. The Resend API key lives in Supabase Vault, never in the app or repo.
--
-- Not spammy by design
--   - At most one email per person every `quiet_minutes` (default 10). Anything
--     that happens in between is gathered into one "what's new" email.
--   - Chat messages wait 10 minutes and are only emailed if still unread.
--     One email per chat, however many messages arrived.
--   - The lines a deal adds to the chat ("We're interested!") are not emailed
--     on their own; the deal step email already says it.
--   - Anyone can turn emails off from the link in every email, or in Profile.
--
-- After running this file, finish the setup (see the PR):
--   select vault.create_secret('re_...your Resend key...', 'resend_api_key');
--   update public.email_config set site_url = 'https://your-domain', enabled = true;

-- Both are built into Supabase. If either line errors, switch them on under
-- Database > Extensions instead and run this file again.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ─── 1. Settings (one row, only readable by the database itself) ───────────
create table if not exists public.email_config (
  id            boolean primary key default true check (id),
  enabled       boolean not null default false,
  site_url      text,
  from_address  text not null default 'Artomango <onboarding@resend.dev>',
  reply_to      text,
  test_to       text,                 -- when set, every email goes here instead (for testing)
  quiet_minutes integer not null default 10 check (quiet_minutes between 0 and 240),
  updated_at    timestamptz not null default now()
);
insert into public.email_config (id) values (true) on conflict (id) do nothing;
alter table public.email_config enable row level security;
revoke all on public.email_config from anon, authenticated;

-- ─── 2. Each person's choice, and their one-click "turn off" token ─────────
create table if not exists public.email_prefs (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  updates    boolean not null default true,
  token      text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  updated_at timestamptz not null default now()
);
alter table public.email_prefs enable row level security;
revoke all on public.email_prefs from anon, authenticated;

create or replace function public.my_email_updates() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select updates from email_prefs where user_id = auth.uid()), true);
$$;

create or replace function public.set_email_updates(p_on boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  insert into email_prefs (user_id, updates) values (auth.uid(), coalesce(p_on, true))
  on conflict (user_id) do update set updates = excluded.updates, updated_at = now();
  if not coalesce(p_on, true) then
    update email_outbox set status = 'skipped', note = 'turned off'
    where user_id = auth.uid() and status = 'queued';
  end if;
  return coalesce(p_on, true);
end $$;

-- From the link in an email; works without signing in.
create or replace function public.email_turn_off(p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if p_token is null or length(p_token) < 32 then return false; end if;
  update email_prefs set updates = false, updated_at = now() where token = p_token returning user_id into v_user;
  if v_user is null then return false; end if;
  update email_outbox set status = 'skipped', note = 'turned off' where user_id = v_user and status = 'queued';
  return true;
end $$;

revoke all on function public.my_email_updates() from public;
revoke all on function public.set_email_updates(boolean) from public;
revoke all on function public.email_turn_off(text) from public;
grant execute on function public.my_email_updates() to authenticated;
grant execute on function public.set_email_updates(boolean) to authenticated;
grant execute on function public.email_turn_off(text) to anon, authenticated;

-- ─── 3. The outbox ─────────────────────────────────────────────────────────
create table if not exists public.email_outbox (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id) on delete cascade,   -- someone on Artomango
  to_email    text,                                                 -- or someone signing by link
  kind        text not null,
  data        jsonb not null default '{}',
  dedupe_key  text,
  send_after  timestamptz not null default now(),
  status      text not null default 'queued' check (status in ('queued', 'sent', 'skipped')),
  note        text,
  attempts    integer not null default 0,
  request_id  bigint,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  check (user_id is not null or to_email is not null)
);
create index if not exists email_outbox_due_idx on public.email_outbox (send_after) where status = 'queued';
create index if not exists email_outbox_user_sent_idx on public.email_outbox (user_id, sent_at desc) where status = 'sent';
create unique index if not exists email_outbox_dedupe_idx on public.email_outbox (dedupe_key) where status = 'queued';
alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from anon, authenticated;

create or replace function public.email_enqueue(
  p_user uuid, p_email text, p_kind text, p_data jsonb,
  p_delay interval default interval '1 minute', p_dedupe text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_quiet integer := coalesce((select quiet_minutes from email_config where id), 10);
  v_after timestamptz := now() + p_delay;
  v_last  timestamptz;
  v_email text := nullif(lower(trim(p_email)), '');
begin
  if p_user is null and v_email is null then return; end if;
  if p_user is null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return; end if;
  if p_user is not null then
    if exists (select 1 from email_prefs where user_id = p_user and not updates) then return; end if;
    select max(sent_at) into v_last from email_outbox where user_id = p_user and status = 'sent';
    if v_last is not null then v_after := greatest(v_after, v_last + make_interval(mins => v_quiet)); end if;
    v_email := null;
  end if;
  insert into email_outbox (user_id, to_email, kind, data, dedupe_key, send_after)
  values (p_user, v_email, p_kind, coalesce(p_data, '{}'), p_dedupe, v_after)
  on conflict (dedupe_key) where status = 'queued' do nothing;
end $$;
revoke all on function public.email_enqueue(uuid, text, text, jsonb, interval, text) from public, anon, authenticated;

-- ─── 4. What puts things in the outbox ─────────────────────────────────────
-- Email trouble must never stop the app, so each trigger swallows its errors.

create or replace function public.email_on_deal() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_other uuid := case when new.started_by = new.artist_id then new.venue_id else new.artist_id end;
  v_data  jsonb := jsonb_build_object('deal_id', new.id);
begin
  begin
    if tg_op = 'INSERT' then
      perform email_enqueue(v_other, null, 'deal_new', v_data, interval '1 minute', 'deal_new:' || new.id);
    elsif new.status is distinct from old.status then
      if new.status in ('interested', 'declined') then
        perform email_enqueue(new.started_by, null, 'deal_' || new.status, v_data);
      elsif new.status = 'withdrawn' then
        perform email_enqueue(v_other, null, 'deal_withdrawn', v_data);
      end if;
      -- 'agreement_sent' and 'signed' are told by the agreement's own emails.
    end if;
  exception when others then
    raise warning 'email_on_deal: %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists email_on_deal on public.deals;
create trigger email_on_deal after insert or update of status on public.deals
  for each row execute function public.email_on_deal();

create or replace function public.email_on_contract() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_data jsonb := jsonb_build_object('contract_id', new.id);
  v_sent boolean := new.status = 'sent' and (tg_op = 'INSERT' or old.status = 'draft');
begin
  begin
    -- Sent: ask the other side to sign.
    if v_sent then
      if new.counterparty_id is not null then
        perform email_enqueue(new.counterparty_id, null, 'contract_to_sign', v_data, interval '1 minute', 'contract_to_sign:' || new.id);
      elsif new.counterparty_email is not null and new.counterparty_token is not null then
        perform email_enqueue(null, new.counterparty_email, 'contract_link', v_data, interval '1 minute', 'contract_link:' || new.id);
      end if;
    end if;

    if tg_op = 'UPDATE' then
      -- The other side signed first: the sender's turn.
      if old.counterparty_signed_at is null and new.counterparty_signed_at is not null
         and new.initiator_signed_at is null then
        perform email_enqueue(new.initiator_id, null, 'contract_your_turn', v_data);
      end if;
      -- Signed by both.
      if old.status is distinct from 'signed' and new.status = 'signed' then
        perform email_enqueue(new.initiator_id, null, 'contract_signed', v_data);
        if new.counterparty_id is not null then
          perform email_enqueue(new.counterparty_id, null, 'contract_signed', v_data);
        elsif new.counterparty_email is not null and new.counterparty_token is not null then
          perform email_enqueue(null, new.counterparty_email, 'contract_signed_link', v_data);
        end if;
      end if;
    end if;
  exception when others then
    raise warning 'email_on_contract: %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists email_on_contract on public.contracts;
create trigger email_on_contract after insert or update on public.contracts
  for each row execute function public.email_on_contract();

create or replace function public.email_on_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c       public.conversations;
  v_rcpt  uuid;
begin
  begin
    if coalesce(new.template_key, '') = 'deal' then return new; end if;
    select * into c from conversations where id = new.conversation_id;
    if not found then return new; end if;
    v_rcpt := case
      when new.sender_id is null then c.participant_b          -- a visitor wrote in
      when new.sender_id = c.participant_a then c.participant_b
      else c.participant_a end;
    if v_rcpt is null or v_rcpt = new.sender_id then return new; end if;
    perform email_enqueue(v_rcpt, null, 'message', jsonb_build_object('conversation_id', c.id),
                          interval '10 minutes', 'message:' || v_rcpt || ':' || c.id);
  exception when others then
    raise warning 'email_on_message: %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists email_on_message on public.messages;
create trigger email_on_message after insert on public.messages
  for each row execute function public.email_on_message();

-- ─── 5. Writing the emails ─────────────────────────────────────────────────
create or replace function public.email_esc(t text) returns text
language sql immutable as $$
  select replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

-- What to call someone: a venue by its venue name, everyone else by name.
create or replace function public.email_name(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    case when p.role in ('venue', 'gallery') then nullif(trim(p.venue_name), '') end,
    nullif(trim(p.full_name), ''), 'Someone')
  from (select 1) x left join profiles p on p.id = p_user;
$$;

-- “Blue Hour” · “Blue Hour” and “Salt” · “Blue Hour”, “Salt” and 2 more
create or replace function public.email_works(p_ids uuid[]) returns text
language sql stable security definer set search_path = public as $$
  with t as (
    select '“' || coalesce(nullif(trim(a.title), ''), 'Untitled') || '”' as title, row_number() over (order by array_position(p_ids, a.id)) as n, count(*) over () as total
    from artworks a where a.id = any(p_ids)
  )
  select case
    when (select count(*) from t) = 0 then 'your works'
    when (select max(total) from t) = 1 then (select title from t)
    when (select max(total) from t) = 2 then (select string_agg(title, ' and ' order by n) from t)
    when (select max(total) from t) = 3 then (select string_agg(title, ', ' order by n) from t where n < 3) || ' and ' || (select title from t where n = 3)
    else (select string_agg(title, ', ' order by n) from t where n <= 2) || ' and ' || ((select max(total) from t) - 2) || ' more'
  end;
$$;

-- One outbox row → {subject, heading, paras[], quote, button, url, greeting?, line?}
-- (line is the short preview used when several updates share one email)
-- or null when there's nothing to say anymore (already read, withdrawn, signed…).
create or replace function public.email_compose(r public.email_outbox, p_site text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  d   public.deals;
  c   public.contracts;
  cv  public.conversations;
  v_who text; v_works text; v_n int; v_offer boolean; v_url text; v_unread int; v_last record;
begin
  if r.kind like 'deal_%' then
    select * into d from deals where id = (r.data->>'deal_id')::uuid;
    if not found then return null; end if;
    v_works := email_works(d.artwork_ids);
    v_n := cardinality(d.artwork_ids);
    v_offer := d.started_by = d.artist_id;
    v_url := p_site || '/dashboard/messages?tab=deals&deal=' || d.id;

    if r.kind = 'deal_new' then
      if d.status <> 'sent' then return null; end if;
      v_who := email_name(d.started_by);
      if v_offer then
        return jsonb_build_object(
          'subject', v_who || ' offered you ' || v_n || case when v_n = 1 then ' work' else ' works' end,
          'heading', v_who || ' would like to show their work at your place',
          'paras', jsonb_build_array(v_who || ' offered you ' || v_works || '.', 'Have a look, then say yes or no thanks. It takes one tap.'),
          'quote', d.note, 'button', 'See the offer', 'url', v_url);
      else
        return jsonb_build_object(
          'subject', v_who || ' would like to show your work',
          'heading', v_who || ' would like to show your work',
          'paras', jsonb_build_array(v_who || ' asked to show ' || v_works || '.', 'Have a look, then say yes or no thanks. It takes one tap.'),
          'quote', d.note, 'button', 'Answer the request', 'url', v_url);
      end if;

    elsif r.kind = 'deal_interested' then
      v_who := email_name(case when v_offer then d.venue_id else d.artist_id end);
      if v_offer then  -- a venue said yes to an artist's offer
        return jsonb_build_object(
          'subject', v_who || ' is interested in your work',
          'heading', v_who || ' is interested',
          'paras', jsonb_build_array(v_who || ' would like to show ' || v_works || '.', 'They''ll send you an agreement to sign next. You don''t need to do anything yet.'),
          'button', 'Open the deal', 'url', v_url);
      else            -- an artist said yes to a venue's request
        return jsonb_build_object(
          'subject', v_who || ' said yes',
          'heading', v_who || ' said yes',
          'paras', jsonb_build_array(v_who || ' is happy to show ' || v_works || ' with you.', 'Send the agreement to make it official. We fill it in from the deal, so you only check the dates.'),
          'button', 'Send the agreement', 'url', v_url);
      end if;

    elsif r.kind = 'deal_declined' then
      v_who := email_name(case when v_offer then d.venue_id else d.artist_id end);
      if v_offer then
        return jsonb_build_object(
          'subject', v_who || ' passed this time',
          'heading', v_who || ' passed this time',
          'paras', jsonb_build_array(v_who || ' said no thanks to ' || v_works || ' for now.', 'It happens to every artist. Other places are looking for art right now.'),
          'button', 'See who''s looking for art', 'url', p_site || '/dashboard/looking');
      else
        return jsonb_build_object(
          'subject', v_who || ' passed this time',
          'heading', v_who || ' passed this time',
          'paras', jsonb_build_array(v_who || ' said no thanks to showing ' || v_works || ' for now.', 'There are more artists whose work is ready for a wall.'),
          'button', 'Find artists', 'url', p_site || '/dashboard/looking');
      end if;

    elsif r.kind = 'deal_withdrawn' then
      v_who := email_name(d.started_by);
      return jsonb_build_object(
        'subject', v_who || ' withdrew their ' || case when v_offer then 'offer' else 'request' end,
        'heading', v_who || ' withdrew their ' || case when v_offer then 'offer' else 'request' end,
        'paras', jsonb_build_array('The ' || case when v_offer then 'offer' else 'request' end || ' for ' || v_works || ' is closed. There''s nothing you need to do.'),
        'button', 'Open your deals', 'url', p_site || '/dashboard/messages?tab=deals');
    end if;
    return null;
  end if;

  if r.kind like 'contract_%' then
    select * into c from contracts where id = (r.data->>'contract_id')::uuid;
    if not found or c.status = 'cancelled' then return null; end if;
    v_url := p_site || '/dashboard/contracts/' || c.id;

    if r.kind in ('contract_to_sign', 'contract_link') then
      if c.counterparty_signed_at is not null or c.status = 'draft' then return null; end if;
      if r.kind = 'contract_link' then
        if c.counterparty_token is null then return null; end if;
        v_url := p_site || '/contracts/sign/' || c.id || '?t=' || c.counterparty_token;
      end if;
      return jsonb_build_object(
        'subject', c.initiator_name || ' sent you an agreement to sign',
        'heading', 'An agreement to sign',
        'greeting', case when r.kind = 'contract_link' then 'Hi ' || c.counterparty_name || ',' end,
        'paras', jsonb_build_array(
          c.initiator_name || ' sent you “' || c.title || '”.',
          'Read it through, then sign by typing your full name.'
            || case when r.kind = 'contract_link' then ' You don''t need an account.' else ' Once you''ve both signed, the dates go into your planner.' end),
        'button', 'Read and sign', 'url', v_url,
        'show_link', r.kind = 'contract_link');

    elsif r.kind = 'contract_your_turn' then
      if c.initiator_signed_at is not null then return null; end if;
      return jsonb_build_object(
        'subject', c.counterparty_name || ' signed. Your turn',
        'heading', c.counterparty_name || ' signed',
        'paras', jsonb_build_array(c.counterparty_name || ' signed “' || c.title || '”.', 'Add your signature and it''s done.'),
        'button', 'Sign now', 'url', v_url);

    elsif r.kind in ('contract_signed', 'contract_signed_link') then
      if c.status <> 'signed' then return null; end if;
      if r.kind = 'contract_signed_link' then
        return jsonb_build_object(
          'subject', 'Signed by both: ' || c.title,
          'heading', 'It''s signed',
          'greeting', 'Hi ' || c.counterparty_name || ',',
          'paras', jsonb_build_array('You and ' || c.initiator_name || ' have both signed “' || c.title || '”.', 'Keep this email. The link below opens the signed copy any time.'),
          'button', 'See the signed agreement',
          'url', p_site || '/contracts/sign/' || c.id || '?t=' || c.counterparty_token, 'show_link', true);
      end if;
      v_who := case when r.user_id = c.initiator_id then c.counterparty_name else c.initiator_name end;
      return jsonb_build_object(
        'subject', 'Signed by both: ' || c.title,
        'heading', 'It''s a deal',
        'paras', jsonb_build_array('You and ' || v_who || ' have both signed “' || c.title || '”.', 'The key dates are in your planner, and the signed copy is kept in Papers.'),
        'button', 'See the signed agreement', 'url', v_url);
    end if;
    return null;
  end if;

  if r.kind = 'message' then
    select * into cv from conversations where id = (r.data->>'conversation_id')::uuid;
    if not found then return null; end if;
    select count(*) into v_unread from messages m
    where m.conversation_id = cv.id and m.sender_id is distinct from r.user_id
      and coalesce(m.template_key, '') <> 'deal'
      and not coalesce(case when r.user_id = cv.participant_a then m.read_by_a else m.read_by_b end, false);
    if v_unread = 0 then return null; end if;
    select m.body, coalesce(case when m.sender_id is not null then email_name(m.sender_id) end, nullif(trim(m.guest_name), ''), cv.guest_name, 'Someone') as who
      into v_last
    from messages m
    where m.conversation_id = cv.id and m.sender_id is distinct from r.user_id
      and coalesce(m.template_key, '') <> 'deal'
    order by m.created_at desc limit 1;
    return jsonb_build_object(
      'subject', case when v_unread = 1 then 'New message from ' || v_last.who else v_unread || ' new messages from ' || v_last.who end,
      'heading', case when v_unread = 1 then v_last.who || ' wrote to you' else v_last.who || ' sent you ' || v_unread || ' messages' end,
      'paras', case when v_unread = 1 then '[]'::jsonb else jsonb_build_array('Here''s the latest:') end,
      'quote', left(v_last.body, 500) || case when length(v_last.body) > 500 then '…' else '' end,
      'line', left(v_last.body, 140) || case when length(v_last.body) > 140 then '…' else '' end,
      'button', 'Reply', 'url', p_site || '/dashboard/messages?c=' || cv.id);
  end if;

  return null;
end $$;

-- Items → {subject, html, text}. One item gets its own email; several become one "what's new".
create or replace function public.email_render(p_items jsonb, p_site text, p_off_url text) returns jsonb
language plpgsql stable set search_path = public as $$
declare
  f_head text := 'font-family:''Darker Grotesque'',''Arial Narrow'',Arial,sans-serif;font-weight:700;color:#111110;';
  f_ui   text := 'font-family:''Instrument Sans'',-apple-system,''Segoe UI'',Helvetica,Arial,sans-serif;';
  one    boolean := jsonb_array_length(p_items) = 1;
  it     jsonb;
  p      jsonb;
  v_subject text; v_heading text; v_pre text; v_button text; v_url text;
  body_h text := ''; body_t text := ''; foot_h text; foot_t text;
begin
  if one then
    it := p_items->0;
    v_subject := it->>'subject'; v_heading := it->>'heading'; v_button := it->>'button'; v_url := it->>'url';
    v_pre := coalesce(it->'paras'->>0, it->>'quote', '');
    if it->>'greeting' is not null then
      body_h := body_h || '<p style="margin:0 0 14px;' || f_ui || 'font-size:16px;line-height:1.55;color:#5C5346;">' || email_esc(it->>'greeting') || '</p>';
      body_t := body_t || (it->>'greeting') || E'\n\n';
    end if;
    for p in select * from jsonb_array_elements(coalesce(it->'paras', '[]')) loop
      body_h := body_h || '<p style="margin:0 0 14px;' || f_ui || 'font-size:16px;line-height:1.55;color:#5C5346;">' || email_esc(p #>> '{}') || '</p>';
      body_t := body_t || (p #>> '{}') || E'\n\n';
    end loop;
    if nullif(trim(it->>'quote'), '') is not null then
      body_h := body_h || '<div style="margin:6px 0 18px;padding:14px 16px;background:#F5F0E8;border-radius:10px;' || f_ui
        || 'font-size:15px;line-height:1.55;color:#111110;white-space:pre-line;">' || email_esc(trim(it->>'quote')) || '</div>';
      body_t := body_t || '"' || trim(it->>'quote') || E'"\n\n';
    end if;
  else
    v_subject := (p_items->0->>'subject') || ' and ' || (jsonb_array_length(p_items) - 1)
      || case when jsonb_array_length(p_items) = 2 then ' more update' else ' more updates' end;
    v_heading := 'Here''s what''s new';
    v_button := 'Open Artomango'; v_url := p_site || '/dashboard';
    v_pre := p_items->0->>'subject';
    for it in select * from jsonb_array_elements(p_items) loop
      body_h := body_h || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E8E0D0;"><tr>'
        || '<td style="padding:14px 0;' || f_ui || 'font-size:16px;line-height:1.4;color:#111110;font-weight:600;">' || email_esc(it->>'subject')
        || '<div style="margin-top:4px;font-weight:400;font-size:14px;color:#5C5346;">' || email_esc(coalesce(it->>'line', it->'paras'->>0, it->>'quote', '')) || '</div></td>'
        || '<td align="right" valign="top" style="padding:14px 0 14px 12px;white-space:nowrap;' || f_ui || 'font-size:14px;">'
        || '<a href="' || email_esc(it->>'url') || '" style="color:#111110;font-weight:600;text-decoration:underline;">' || email_esc(it->>'button') || '</a></td></tr></table>';
      body_t := body_t || '• ' || (it->>'subject') || E'\n  ' || (it->>'url') || E'\n\n';
    end loop;
  end if;

  if p_off_url is not null then
    foot_h := 'You get this because you have an Artomango account. <a href="' || email_esc(p_off_url) || '" style="color:#7A6F5B;text-decoration:underline;">Turn off these emails</a>';
    foot_t := 'Turn off these emails: ' || p_off_url;
  else
    foot_h := 'Sent by Artomango, where artists and venues make shows happen. If you weren''t expecting this, you can ignore it.';
    foot_t := 'Sent by Artomango. If you weren''t expecting this, you can ignore it.';
  end if;

  return jsonb_build_object(
    'subject', v_subject,
    'text', coalesce(v_heading, '') || E'\n\n' || body_t || v_button || ': ' || v_url || E'\n\n—\n' || foot_t,
    'html',
'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
|| '<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">'
|| '<title>' || email_esc(v_subject) || '</title>'
|| '<link href="https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@700&family=Instrument+Sans:wght@400;600&display=swap" rel="stylesheet">'
|| '</head><body style="margin:0;padding:0;background:#FBF8F0;-webkit-text-size-adjust:100%;">'
|| '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' || email_esc(left(v_pre, 140)) || '</div>'
|| '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F0;"><tr><td align="center" style="padding:32px 16px 40px;">'
|| '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">'
-- wordmark
|| '<tr><td style="padding:0 4px 18px;"><a href="' || email_esc(p_site) || '" style="text-decoration:none;">'
|| '<img src="' || email_esc(p_site) || '/logo.png" width="26" height="26" alt="" style="vertical-align:middle;border:0;margin-right:8px;">'
|| '<span style="' || f_head || 'font-size:24px;vertical-align:middle;">Artomango</span></a></td></tr>'
-- card
|| '<tr><td style="background:#FFFFFF;border:1.5px solid #111110;border-radius:16px;box-shadow:5px 5px 0 #111110;padding:32px 28px 28px;">'
|| '<h1 style="margin:0 0 16px;' || f_head || 'font-size:34px;line-height:1.05;">' || email_esc(v_heading) || '</h1>'
|| body_h
|| '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;"><tr>'
|| '<td style="background:#FFD400;border:1.5px solid #111110;border-radius:10px;box-shadow:2px 2px 0 #111110;">'
|| '<a href="' || email_esc(v_url) || '" style="display:inline-block;padding:13px 22px;' || f_ui || 'font-size:15px;font-weight:600;line-height:1;color:#111110;text-decoration:none;">'
|| email_esc(v_button) || ' &rarr;</a></td></tr></table>'
|| case when one and coalesce((p_items->0->>'show_link')::boolean, false) then
     '<p style="margin:18px 0 0;' || f_ui || 'font-size:13px;line-height:1.5;color:#7A6F5B;word-break:break-all;">Or copy this link into your browser:<br><a href="'
     || email_esc(v_url) || '" style="color:#111110;">' || email_esc(v_url) || '</a></p>' else '' end
|| '</td></tr>'
-- footer
|| '<tr><td style="padding:22px 4px 0;' || f_ui || 'font-size:13px;line-height:1.5;color:#7A6F5B;">' || foot_h || '</td></tr>'
|| '</table></td></tr></table></body></html>');
end $$;

-- ─── 6. Sending (pg_cron calls this every minute) ──────────────────────────
create or replace function public.email_send_due() returns integer
language plpgsql security definer set search_path = public as $$
declare
  cfg     public.email_config;
  v_key   text;
  v_site  text;
  grp     record;
  r       public.email_outbox;
  it      jsonb;
  items   jsonb;
  ids     bigint[];
  all_ids bigint[] := '{}';
  batch   jsonb := '[]';
  v_to    text;
  v_tok   text;
  v_off   text;
  msg     jsonb;
  mail    jsonb;
  v_req   bigint;
begin
  select * into cfg from email_config where id;
  if not found or not cfg.enabled or nullif(trim(cfg.site_url), '') is null then return 0; end if;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null then return 0; end if;
  v_site := rtrim(trim(cfg.site_url), '/');

  -- Resend was busy or down: try those again in a few minutes (3 tries).
  update email_outbox o
     set status = 'queued', request_id = null, dedupe_key = null, attempts = o.attempts + 1,
         send_after = now() + interval '5 minutes', note = 'retrying: ' || coalesce(rs.status_code::text, rs.error_msg, 'timeout')
    from net._http_response rs
   where rs.id = o.request_id and o.status = 'sent' and o.attempts < 3
     and (rs.timed_out or rs.error_msg is not null or rs.status_code = 429 or rs.status_code >= 500);
  update email_outbox o
     set note = 'failed: ' || rs.status_code || ' ' || left(rs.content, 200)
    from net._http_response rs
   where rs.id = o.request_id and o.status = 'sent' and o.note is null
     and rs.status_code between 400 and 499 and rs.status_code <> 429;

  -- News from days ago isn't news.
  update email_outbox set status = 'skipped', note = 'too old'
   where status = 'queued' and created_at < now() - interval '3 days';

  for grp in
    select distinct user_id, to_email from email_outbox
     where status = 'queued' and send_after <= now()
     limit 90
  loop
    items := '[]'; ids := '{}';
    -- Everything waiting for this person goes in the same email.
    for r in
      select * from email_outbox
       where status = 'queued' and user_id is not distinct from grp.user_id and to_email is not distinct from grp.to_email
       order by id
       for update skip locked
    loop
      it := email_compose(r, v_site);
      if it is null then
        update email_outbox set status = 'skipped', note = 'nothing new to say' where id = r.id;
      else
        items := items || jsonb_build_array(it);
        ids := ids || r.id;
      end if;
    end loop;
    continue when jsonb_array_length(items) = 0;

    v_off := null;
    if grp.user_id is not null then
      if exists (select 1 from email_prefs where user_id = grp.user_id and not updates) then
        update email_outbox set status = 'skipped', note = 'turned off' where id = any(ids);
        continue;
      end if;
      select email into v_to from auth.users where id = grp.user_id;
      insert into email_prefs (user_id) values (grp.user_id) on conflict (user_id) do nothing;
      select token into v_tok from email_prefs where user_id = grp.user_id;
      v_off := v_site || '/email/off?t=' || v_tok;
    else
      v_to := grp.to_email;
    end if;
    if nullif(trim(v_to), '') is null then
      update email_outbox set status = 'skipped', note = 'no email address' where id = any(ids);
      continue;
    end if;

    msg := email_render(items, v_site, v_off);
    mail := jsonb_build_object(
      'from', cfg.from_address,
      'to', jsonb_build_array(coalesce(nullif(trim(cfg.test_to), ''), v_to)),
      'subject', case when nullif(trim(cfg.test_to), '') is not null then '[to ' || v_to || '] ' else '' end || (msg->>'subject'),
      'html', msg->>'html',
      'text', msg->>'text');
    if nullif(trim(cfg.reply_to), '') is not null then mail := mail || jsonb_build_object('reply_to', cfg.reply_to); end if;
    if v_off is not null then
      mail := mail || jsonb_build_object('headers', jsonb_build_object('List-Unsubscribe', '<' || v_off || '>'));
    end if;
    batch := batch || jsonb_build_array(mail);
    all_ids := all_ids || ids;
  end loop;

  if jsonb_array_length(batch) = 0 then return 0; end if;

  v_req := net.http_post(
    url := 'https://api.resend.com/emails/batch',
    body := batch,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
    timeout_milliseconds := 15000);
  update email_outbox set status = 'sent', sent_at = now(), request_id = v_req, note = null where id = any(all_ids);
  return jsonb_array_length(batch);
end $$;

revoke all on function public.email_compose(public.email_outbox, text) from public, anon, authenticated;
revoke all on function public.email_render(jsonb, text, text) from public, anon, authenticated;
revoke all on function public.email_send_due() from public, anon, authenticated;
revoke all on function public.email_name(uuid) from public, anon, authenticated;
revoke all on function public.email_works(uuid[]) from public, anon, authenticated;

-- For you in the SQL editor: what went out, and what Resend said.
create or replace view public.email_log with (security_invoker = true) as
  select o.id, o.created_at, o.kind, o.status, o.note, o.attempts, o.sent_at,
         coalesce(u.email, o.to_email) as to_email,
         rs.status_code as resend_status, left(rs.content, 300) as resend_reply
    from public.email_outbox o
    left join auth.users u on u.id = o.user_id
    left join net._http_response rs on rs.id = o.request_id
   order by o.id desc;
revoke all on public.email_log from anon, authenticated;

-- Every minute.
select cron.schedule('artomango-emails', '* * * * *', 'select public.email_send_due()');
