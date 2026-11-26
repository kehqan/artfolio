-- Artomango: legal basics before launch (run after the email, curator and label SQL)
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- What changes
--   1. Emails show who sends them: company name and postal address, from
--      email_config (fill them in with the update at the bottom).
--   2. Emails stop loading fonts from Google's servers (that sends the
--      reader's IP address to Google when they open the email).
--   3. Two email switches instead of one: "updates" (offers, agreements,
--      messages, reminders) and "news" (a place near you is looking for art,
--      and any future news). People can turn off news and keep updates.
--   4. Mail apps get a real one-click unsubscribe (List-Unsubscribe-Post).
--   5. Reports: anyone can report a page or work that copies their art or
--      breaks the law (EU Digital Services Act "notice and action"). The
--      report is saved, you get an email, and the reporter gets a receipt.

-- ─── 1. Who sends the emails ───────────────────────────────────────────────
alter table public.email_config add column if not exists company_name   text;  -- e.g. 'Artomango s.r.o., IČO 12345678'
alter table public.email_config add column if not exists postal_address text;  -- e.g. 'Vinohradská 1, 120 00 Praha 2, Czechia'
alter table public.email_config add column if not exists reports_to     text;  -- where new reports are emailed

-- ─── 2. Two switches: updates and news ─────────────────────────────────────
alter table public.email_prefs add column if not exists news boolean not null default true;

-- Kinds of email that count as news (not about something you're already doing).
create or replace function public.email_is_news(p_kind text) returns boolean
language sql immutable as $$ select p_kind in ('wall_nearby') $$;

create or replace function public.my_email_news() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select news from email_prefs where user_id = auth.uid()), true);
$$;

create or replace function public.set_email_news(p_on boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  insert into email_prefs (user_id, news) values (auth.uid(), coalesce(p_on, true))
  on conflict (user_id) do update set news = excluded.news, updated_at = now();
  if not coalesce(p_on, true) then
    update email_outbox set status = 'skipped', note = 'news turned off'
    where user_id = auth.uid() and status = 'queued' and email_is_news(kind);
  end if;
  return coalesce(p_on, true);
end $$;

-- From the link in an email, without signing in: turn off only the news.
create or replace function public.email_news_off(p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if p_token is null or length(p_token) < 32 then return false; end if;
  update email_prefs set news = false, updated_at = now() where token = p_token returning user_id into v_user;
  if v_user is null then return false; end if;
  update email_outbox set status = 'skipped', note = 'news turned off'
   where user_id = v_user and status = 'queued' and email_is_news(kind);
  return true;
end $$;

revoke all on function public.my_email_news() from public;
revoke all on function public.set_email_news(boolean) from public;
revoke all on function public.email_news_off(text) from public;
grant execute on function public.my_email_news() to authenticated;
grant execute on function public.set_email_news(boolean) to authenticated;
grant execute on function public.email_news_off(text) to anon, authenticated;

-- Same as before, plus: news isn't queued for people who turned news off.
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
    if email_is_news(p_kind) and exists (select 1 from email_prefs where user_id = p_user and not news) then return; end if;
    select max(sent_at) into v_last from email_outbox where user_id = p_user and status = 'sent';
    if v_last is not null then v_after := greatest(v_after, v_last + make_interval(mins => v_quiet)); end if;
    v_email := null;
  end if;
  insert into email_outbox (user_id, to_email, kind, data, dedupe_key, send_after)
  values (p_user, v_email, p_kind, coalesce(p_data, '{}'), p_dedupe, v_after)
  on conflict (dedupe_key) where status = 'queued' do nothing;
end $$;
revoke all on function public.email_enqueue(uuid, text, text, jsonb, interval, text) from public, anon, authenticated;

-- ─── 3. Reports (notice and action) ────────────────────────────────────────
create table if not exists public.content_reports (
  id            bigint generated always as identity primary key,
  url           text not null,
  reason        text not null check (reason in ('copyright', 'illegal', 'personal', 'other')),
  details       text not null,
  reporter_name text not null,
  reporter_email text not null,
  rights_holder boolean not null default false,   -- "it's my work, or I act for the person who made it"
  good_faith    boolean not null default false,   -- "what I wrote is true and accurate"
  reporter_id   uuid references auth.users (id) on delete set null,
  status        text not null default 'new' check (status in ('new', 'removed', 'kept', 'need_more')),
  decision_note text,                              -- what you decided and why (send it to both sides)
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists content_reports_new_idx on public.content_reports (created_at desc) where status = 'new';
alter table public.content_reports enable row level security;
revoke all on public.content_reports from anon, authenticated;
drop policy if exists "Admins read reports" on public.content_reports;
create policy "Admins read reports" on public.content_reports for select to authenticated using (public.is_admin());
drop policy if exists "Admins decide reports" on public.content_reports;
create policy "Admins decide reports" on public.content_reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, update on public.content_reports to authenticated;

-- The report form calls this. Works signed in or not.
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
  if p_reason not in ('copyright', 'illegal', 'personal', 'other') then raise exception 'Pick what is wrong' using errcode = '22023'; end if;
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

  -- A receipt for the reporter, and a heads-up for you.
  perform email_enqueue(null, v_email, 'report_received', jsonb_build_object('report_id', v_id), interval '0 minutes', 'report_received:' || v_id);
  if v_to is not null then
    perform email_enqueue(null, v_to, 'report_new', jsonb_build_object('report_id', v_id), interval '0 minutes', 'report_new:' || v_id);
  end if;
  return v_id;
end $$;
revoke all on function public.report_content(text, text, text, text, text, boolean, boolean) from public;
grant execute on function public.report_content(text, text, text, text, text, boolean, boolean) to anon, authenticated;

-- ─── 4. Email wording for reports, footer, no Google fonts ─────────────────
-- The existing email_compose and email_render stay as they are, under a new
-- name; the new ones add to them. (If you ever re-run an older email SQL
-- file, run this file again afterwards.)
do $$ begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'email_compose_base') then
    alter function public.email_compose(public.email_outbox, text) rename to email_compose_base;
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'email_render_base') then
    alter function public.email_render(jsonb, text, text) rename to email_render_base;
  end if;
end $$;

create or replace function public.email_compose(r public.email_outbox, p_site text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare cr public.content_reports; v_why text;
begin
  if r.kind in ('report_received', 'report_new') then
    select * into cr from content_reports where id = (r.data->>'report_id')::bigint;
    if not found then return null; end if;
    v_why := case cr.reason when 'copyright' then 'It copies someone''s work'
                            when 'illegal' then 'It breaks the law'
                            when 'personal' then 'It shares someone''s private details'
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

create or replace function public.email_render(p_items jsonb, p_site text, p_off_url text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  m jsonb := email_render_base(p_items, p_site, p_off_url);
  cfg public.email_config;
  v_who text; v_html text; v_text text;
  tail constant text := '</td></tr></table></td></tr></table></body></html>';
begin
  select * into cfg from email_config where id;
  v_who := concat_ws(' · ', 'Artomango', nullif(trim(cfg.company_name), ''), nullif(trim(cfg.postal_address), ''));
  v_html := m->>'html';
  -- Fonts from Google's servers would tell Google who opened the email.
  v_html := regexp_replace(v_html, '<link href="https://fonts\.googleapis\.com[^>]*>', '', 'g');
  -- Who sent it, under the footer.
  if right(v_html, length(tail)) = tail then
    v_html := left(v_html, length(v_html) - length(tail))
      || '<br><br>' || email_esc(v_who)
      || ' &middot; <a href="' || email_esc(p_site) || '/privacy" style="color:#7A6F5B;text-decoration:underline;">Privacy</a>'
      || tail;
  end if;
  v_text := (m->>'text') || E'\n' || v_who || E'\nPrivacy: ' || p_site || '/privacy';
  return m || jsonb_build_object('html', v_html, 'text', v_text);
end $$;

revoke all on function public.email_compose(public.email_outbox, text) from public, anon, authenticated;
revoke all on function public.email_compose_base(public.email_outbox, text) from public, anon, authenticated;
revoke all on function public.email_render(jsonb, text, text) from public, anon, authenticated;
revoke all on function public.email_render_base(jsonb, text, text) from public, anon, authenticated;

-- ─── 5. Sending: same as before, with one-click unsubscribe headers ────────
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
      -- One click from the mail app's own "Unsubscribe" button (RFC 8058).
      mail := mail || jsonb_build_object('headers', jsonb_build_object(
        'List-Unsubscribe', '<' || v_site || '/api/email/unsubscribe?t=' || v_tok || '>',
        'List-Unsubscribe-Post', 'List-Unsubscribe=One-Click'));
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
revoke all on function public.email_send_due() from public, anon, authenticated;

-- ─── 6. Fill these in (then run just this part) ────────────────────────────
-- The law wants every email and the website to say who runs Artomango.
-- update public.email_config set
--   company_name   = 'Your legal name or company, IČO 12345678',
--   postal_address = 'Street 1, 110 00 Praha 1, Czechia',
--   reports_to     = 'you@artomango.com';

-- ─── Check ─────────────────────────────────────────────────────────────────
-- select company_name, postal_address, reports_to from public.email_config;
-- select * from public.content_reports order by id desc;
-- Decide a report:
-- update public.content_reports set status = 'removed', decision_note = 'Copy of the reporter''s work', decided_at = now() where id = 1;
