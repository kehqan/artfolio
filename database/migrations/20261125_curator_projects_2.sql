-- Artomango: curator projects (part 2)
-- Run once in the Supabase SQL editor, after part 1. Safe to run again.
--
--   1. Open projects: artists can offer work to a project that is open.
--   2. Invite by link: a curator invites someone by email; the link opens
--      the project, and once they're signed in they can offer works.
--   3. Public project page: the curator can share a page with the project
--      and its signed works.
--   4. Project dates go into the curator's Planner by themselves.
--   5. Emails speak about projects ("invited you to join Spring Light"),
--      and curators get the venue-side show reminders.

-- ─── 1. Public page switch ──────────────────────────────────────────────────
alter table public.projects add column if not exists is_public boolean not null default false;

-- ─── 2. Invitations by email ────────────────────────────────────────────────
create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  email text check (email is null or char_length(email) <= 320),
  name text check (name is null or char_length(name) <= 160),
  token uuid not null unique default gen_random_uuid(),
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists project_invites_project_idx on public.project_invites (project_id);

alter table public.project_invites enable row level security;

-- Helpers that read past row security, so the two tables' rules don't loop.
create or replace function public.owns_project(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from projects where id = p_id and owner_id = auth.uid());
$$;
create or replace function public.invited_to_project(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_invites where project_id = p_id and accepted_by = auth.uid());
$$;

drop policy if exists "Curators manage their invites" on public.project_invites;
create policy "Curators manage their invites" on public.project_invites
  for all to authenticated using (public.owns_project(project_id)) with check (public.owns_project(project_id));

-- People who opened an invitation can see the project.
drop policy if exists "Invited people can see the project" on public.projects;
create policy "Invited people can see the project" on public.projects
  for select to authenticated using (public.invited_to_project(id));

-- Opening an invitation link while signed in ties it to you.
create or replace function public.accept_project_invite(p_token uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_project uuid;
begin
  if auth.uid() is null then return null; end if;
  update project_invites set accepted_by = auth.uid(), accepted_at = now()
   where token = p_token and (accepted_by is null or accepted_by = auth.uid())
  returning project_id into v_project;
  return v_project;
end $$;
revoke all on function public.accept_project_invite(uuid) from public;
grant execute on function public.accept_project_invite(uuid) to authenticated;

-- ─── 3. Who may put a deal in a project ─────────────────────────────────────
-- The curator, when inviting. An artist, when offering to an open project
-- or one they were invited to. Either way the curator is the deal's venue side.
create or replace function public.deals_project_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare p projects;
begin
  if new.project_id is null or (tg_op = 'UPDATE' and new.project_id is not distinct from old.project_id) then
    return new;
  end if;
  select * into p from projects where id = new.project_id;
  if not found or p.owner_id <> new.venue_id then
    raise exception 'This project belongs to someone else';
  end if;
  if auth.uid() = p.owner_id then return new; end if;
  if auth.uid() = new.artist_id and new.started_by = auth.uid() and p.status = 'active'
     and (p.is_open or exists (select 1 from project_invites i where i.project_id = p.id and i.accepted_by = auth.uid())) then
    return new;
  end if;
  raise exception 'Only the project''s curator, or an artist it is open to, can add a deal to it';
end $$;

-- ─── 4. The public page (and invitation page) ───────────────────────────────
-- Readable without an account when the project is public, open, or the
-- visitor has a valid invitation link. Signed works only on a public page.
create or replace function public.public_project(p_id uuid, p_token uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p projects; v_invite project_invites; v_works jsonb := '[]'::jsonb; v_owner jsonb;
begin
  select * into p from projects where id = p_id;
  if not found then return null; end if;
  if p_token is not null then
    select * into v_invite from project_invites where token = p_token and project_id = p.id;
  end if;
  if not (p.is_public or (p.is_open and p.status = 'active') or v_invite.id is not null or p.owner_id = auth.uid()) then
    return null;
  end if;
  select jsonb_build_object('id', pr.id, 'name', coalesce(nullif(trim(pr.full_name), ''), 'A curator'), 'avatar', pr.avatar_url,
                            'username', pr.username, 'location', pr.location)
    into v_owner from profiles pr where pr.id = p.owner_id;
  if p.is_public or p.owner_id = auth.uid() then
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', a.id, 'title', a.title, 'image', a.images[1], 'medium', a.medium,
             'width_cm', a.width_cm, 'height_cm', a.height_cm,
             'artist', coalesce(nullif(trim(ap.full_name), ''), 'Artist'), 'artist_username', ap.username)
           order by d.updated_at, array_position(d.artwork_ids, a.id)), '[]'::jsonb)
      into v_works
      from deals d
      join artworks a on a.id = any(d.artwork_ids)
      left join profiles ap on ap.id = a.user_id
     where d.project_id = p.id and d.status = 'signed';
  end if;
  return jsonb_build_object(
    'id', p.id, 'kind', p.kind, 'title', p.title, 'starts_on', p.starts_on, 'ends_on', p.ends_on,
    'place', p.place, 'online', p.online, 'about', p.about, 'looking_for', p.looking_for,
    'cover_url', p.cover_url, 'is_open', p.is_open and p.status = 'active', 'is_public', p.is_public,
    'status', p.status, 'owner', v_owner, 'works', v_works,
    'invite', case when v_invite.id is not null then jsonb_build_object('name', v_invite.name) end);
end $$;
grant execute on function public.public_project(uuid, uuid) to anon, authenticated;

-- ─── 5. Project dates in the curator's Planner ──────────────────────────────
create or replace function public.projects_to_planner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    delete from calendar_events where source = 'project' and origin_id = coalesce(new.id, old.id);
    if tg_op <> 'DELETE' and new.status = 'active' and coalesce(new.starts_on, new.ends_on) is not null then
      insert into calendar_events (user_id, title, description, type, start_date, end_date, all_day, location, cover_url, source, origin_id)
      values (new.owner_id, new.title,
              case new.kind when 'collection' then 'Collection' when 'event' then 'Event' else 'Exhibition' end || ' · your project',
              case when new.kind = 'collection' then 'deadline' else 'exhibition' end,
              coalesce(new.starts_on, new.ends_on), case when new.starts_on is not null then new.ends_on end,
              true, new.place, new.cover_url, 'project', new.id);
    end if;
  exception when others then
    raise warning 'projects_to_planner: %', sqlerrm;
  end;
  return coalesce(new, old);
end $$;

drop trigger if exists projects_to_planner on public.projects;
create trigger projects_to_planner after insert or update of title, kind, starts_on, ends_on, place, cover_url, status or delete on public.projects
  for each row execute function public.projects_to_planner();

-- Projects that already have dates.
update public.projects set title = title where coalesce(starts_on, ends_on) is not null;

-- ─── 6. Emails about projects ───────────────────────────────────────────────
-- Same as emails_v2's email_compose, plus project wording and curators on
-- the venue side of show reminders. Only if the emails SQL has been run.
do $outer$
begin
  if exists (select 1 from pg_proc where proname = 'email_compose') then
    execute $e$
create or replace function public.email_compose(r public.email_outbox, p_site text) returns jsonb
language plpgsql stable security definer set search_path = public as $c$
declare
  d   public.deals;
  c   public.contracts;
  cv  public.conversations;
  pr  public.pool_requests;
  v_who text; v_works text; v_n int; v_offer boolean; v_url text; v_unread int; v_last record;
  v_imgs jsonb; v_step int; v_me_init boolean; v_other uuid; v_city text; v_terms jsonb; v_facts jsonb;
  base jsonb; v_pt text;
begin
  -- Deals ------------------------------------------------------------------
  if r.kind like 'deal_%' or r.kind = 'nudge_answer' then
    select * into d from deals where id = (r.data->>'deal_id')::uuid;
    if not found then return null; end if;
    v_works := email_works(d.artwork_ids);
    v_n := cardinality(d.artwork_ids);
    v_offer := d.started_by = d.artist_id;
    v_url := p_site || '/dashboard/messages?tab=deals&deal=' || d.id;
    v_imgs := email_work_images(d.artwork_ids, p_site);
    -- A curator's project, if the deal belongs to one (curator projects).
    if d.project_id is not null then select title into v_pt from projects where id = d.project_id; end if;

    if r.kind in ('deal_new', 'nudge_answer') then
      if d.status <> 'sent' then return null; end if;
      v_who := email_name(d.started_by);
      base := jsonb_build_object('from', email_person(d.started_by, p_site), 'images', v_imgs, 'steps', 0,
                                 'quote', d.note, 'url', v_url,
                                 'button', case when v_offer then 'See the offer' else 'Answer the request' end);
      if r.kind = 'nudge_answer' then
        return base || jsonb_build_object(
          'label', 'Waiting for you',
          'subject', v_who || ' is waiting for your answer',
          'heading', v_who || ' is waiting for your answer',
          'paras', jsonb_build_array(
            case when v_offer then v_who || ' offered you ' || v_works || ' a few days ago.'
                 else v_who || ' asked to show ' || v_works || ' a few days ago.' end,
            'A quick yes or no thanks helps them plan. It takes one tap.'),
          'quote', null);
      end if;
      if v_pt is not null then
        if v_offer then
          return base || jsonb_build_object(
            'label', 'New offer',
            'subject', v_who || ' would like to join ' || v_pt,
            'heading', v_who || ' would like to join ' || v_pt,
            'paras', jsonb_build_array(v_who || ' offered ' || v_works || ' for ' || v_pt || '.', 'Have a look, then say yes or no thanks. It takes one tap.'));
        end if;
        return base || jsonb_build_object(
          'label', 'Invitation',
          'subject', v_who || ' invited you to join ' || v_pt,
          'heading', v_who || ' invited you to join ' || v_pt,
          'paras', jsonb_build_array(v_who || ' would like to include ' || v_works || ' in ' || v_pt || '.', 'Have a look, then say I''m in or no thanks. It takes one tap.'),
          'button', 'See the invitation');
      end if;
      if v_offer then
        return base || jsonb_build_object(
          'label', 'New offer',
          'subject', v_who || ' offered you ' || v_n || case when v_n = 1 then ' work' else ' works' end,
          'heading', v_who || ' would like to show their work at your place',
          'paras', jsonb_build_array(v_who || ' offered you ' || v_works || '.', 'Have a look, then say yes or no thanks. It takes one tap.'));
      end if;
      return base || jsonb_build_object(
        'label', 'New request',
        'subject', v_who || ' would like to show your work',
        'heading', v_who || ' would like to show your work',
        'paras', jsonb_build_array(v_who || ' asked to show ' || v_works || '.', 'Have a look, then say yes or no thanks. It takes one tap.'));

    elsif r.kind = 'deal_interested' then
      v_other := case when v_offer then d.venue_id else d.artist_id end;
      v_who := email_name(v_other);
      base := jsonb_build_object('from', email_person(v_other, p_site), 'images', v_imgs, 'steps', 1, 'url', v_url, 'label', 'Good news');
      if v_offer then
        return base || jsonb_build_object(
          'subject', v_who || ' is interested in your work',
          'heading', v_who || ' is interested',
          'paras', jsonb_build_array(v_who || ' would like to show ' || v_works || '.', 'They''ll send you an agreement to sign next. You don''t need to do anything yet.'),
          'button', 'Open the deal');
      end if;
      return base || jsonb_build_object(
        'subject', v_who || ' said yes',
        'heading', v_who || ' said yes',
        'paras', jsonb_build_array(v_who || ' is happy to show ' || v_works || ' with you.', 'Send the agreement to make it official. We fill it in from the deal, so you only check the dates.'),
        'button', 'Send the agreement');

    elsif r.kind = 'deal_declined' then
      v_other := case when v_offer then d.venue_id else d.artist_id end;
      v_who := email_name(v_other);
      return jsonb_build_object(
        'label', 'Not this time', 'from', email_person(v_other, p_site),
        'subject', v_who || ' passed this time',
        'heading', v_who || ' passed this time',
        'paras', case when v_offer
          then jsonb_build_array(v_who || ' said no thanks to ' || v_works || ' for now.', 'It happens to every artist. Other places are looking for art right now.')
          else jsonb_build_array(v_who || ' said no thanks to showing ' || v_works || ' for now.', 'There are more artists whose work is ready for a wall.') end,
        'button', case when v_offer then 'See who''s looking for art' else 'Find artists' end,
        'url', p_site || '/dashboard/looking');

    elsif r.kind = 'deal_withdrawn' then
      v_who := email_name(d.started_by);
      return jsonb_build_object(
        'label', 'Withdrawn', 'from', email_person(d.started_by, p_site),
        'subject', v_who || ' withdrew their ' || case when v_offer then 'offer' else 'request' end,
        'heading', v_who || ' withdrew their ' || case when v_offer then 'offer' else 'request' end,
        'paras', jsonb_build_array('The ' || case when v_offer then 'offer' else 'request' end || ' for ' || v_works || ' is closed. There''s nothing you need to do.'),
        'button', 'Open your deals', 'url', p_site || '/dashboard/messages?tab=deals');
    end if;
    return null;
  end if;

  -- Agreements and shows -----------------------------------------------------
  if r.kind like 'contract_%' or r.kind in ('nudge_sign', 'show_starts', 'show_ends') then
    select * into c from contracts where id = (r.data->>'contract_id')::uuid;
    if not found or c.status = 'cancelled' then return null; end if;
    v_url := p_site || '/dashboard/contracts/' || c.id;
    if r.to_email is not null then
      if c.counterparty_token is null then return null; end if;
      v_url := p_site || '/contracts/sign/' || c.id || '?t=' || c.counterparty_token;
    end if;
    v_me_init := r.user_id is not null and r.user_id = c.initiator_id;
    v_other := case when v_me_init then c.counterparty_id else c.initiator_id end;
    v_who := case when v_me_init then c.counterparty_name else c.initiator_name end;
    select email_work_images(array_agg(ca.artwork_id), p_site) into v_imgs from contract_artworks ca where ca.contract_id = c.id;
    v_step := case when exists (select 1 from deals where contract_id = c.id) then 2 end;
    v_facts := email_contract_facts(c);
    base := jsonb_build_object('images', coalesce(v_imgs, '[]'::jsonb), 'facts', v_facts, 'url', v_url,
                               'from', case when v_other is not null then email_person(v_other, p_site)
                                            else jsonb_build_object('name', v_who) end);
    if v_step is not null then base := base || jsonb_build_object('steps', v_step); end if;

    if r.kind in ('contract_to_sign', 'contract_link', 'nudge_sign') then
      if c.status in ('draft', 'signed') then return null; end if;
      -- Whose signature is missing?
      if (v_me_init and c.initiator_signed_at is not null) or (not v_me_init and c.counterparty_signed_at is not null) then
        return null;
      end if;
      if r.kind = 'nudge_sign' then
        return base || jsonb_build_object(
          'label', 'Still to sign',
          'subject', '“' || c.title || '” still needs your signature',
          'heading', 'The agreement still needs your signature',
          'greeting', case when r.to_email is not null then 'Hi ' || c.counterparty_name || ',' end,
          'paras', jsonb_build_array(v_who || ' is waiting for you to sign “' || c.title || '”.', 'Read it through and sign by typing your full name. It takes a minute.'),
          'button', 'Read and sign', 'show_link', r.to_email is not null);
      end if;
      return base || jsonb_build_object(
        'label', 'Agreement',
        'subject', c.initiator_name || ' sent you an agreement to sign',
        'heading', 'An agreement to sign',
        'greeting', case when r.kind = 'contract_link' then 'Hi ' || c.counterparty_name || ',' end,
        'paras', jsonb_build_array(
          c.initiator_name || ' sent you “' || c.title || '”.',
          'Read it through, then sign by typing your full name.'
            || case when r.kind = 'contract_link' then ' You don''t need an account.' else ' Once you''ve both signed, the dates go into your planner.' end),
        'button', 'Read and sign', 'show_link', r.kind = 'contract_link');

    elsif r.kind = 'contract_your_turn' then
      if c.initiator_signed_at is not null then return null; end if;
      return base || jsonb_build_object(
        'label', 'Your turn',
        'subject', c.counterparty_name || ' signed. Your turn',
        'heading', c.counterparty_name || ' signed',
        'paras', jsonb_build_array(c.counterparty_name || ' signed “' || c.title || '”.', 'Add your signature and it''s done.'),
        'button', 'Sign now');

    elsif r.kind in ('contract_signed', 'contract_signed_link') then
      if c.status <> 'signed' then return null; end if;
      base := base || jsonb_build_object('label', 'Signed by both', 'celebrate', true, 'heading', 'It''s a deal',
                                         'subject', 'Signed by both: ' || c.title);
      if v_step is not null then base := base || jsonb_build_object('steps', 3); end if;
      if r.kind = 'contract_signed_link' then
        return base || jsonb_build_object(
          'greeting', 'Hi ' || c.counterparty_name || ',',
          'paras', jsonb_build_array('You and ' || c.initiator_name || ' have both signed “' || c.title || '”.', 'Keep this email. The link below opens the signed copy any time.'),
          'button', 'See the signed agreement', 'show_link', true);
      end if;
      return base || jsonb_build_object(
        'paras', jsonb_build_array('You and ' || v_who || ' have both signed “' || c.title || '”.', 'The key dates are in your planner, and the signed copy is kept in Papers.'),
        'button', 'See the signed agreement');

    elsif r.kind in ('show_starts', 'show_ends') then
      if c.status <> 'signed' then return null; end if;
      base := base - 'steps';
      -- The venue hears about "Ada Marek's show", the artist about "your show at Mango Corner".
      if exists (select 1 from profiles where id = r.user_id and role in ('venue', 'gallery', 'curator')) then
        if r.kind = 'show_starts' then
          if c.start_date is null or c.start_date < current_date then return null; end if;
          return base || jsonb_build_object(
            'label', 'Coming up',
            'subject', v_who || '''s show starts ' || to_char(c.start_date, 'FMDay'),
            'heading', v_who || '''s show starts ' || to_char(c.start_date, 'FMDay'),
            'paras', jsonb_build_array('“' || c.title || '” opens on ' || email_date(c.start_date) || '.',
              'Check the hanging time with ' || v_who || ', and tell your guests. A small opening evening goes a long way.'),
            'button', 'See the agreement');
        end if;
        if c.end_date is null or c.end_date < current_date then return null; end if;
        return base || jsonb_build_object(
          'label', 'Ending soon',
          'subject', v_who || '''s show ends next ' || to_char(c.end_date, 'FMDay'),
          'heading', v_who || '''s show ends next ' || to_char(c.end_date, 'FMDay'),
          'paras', jsonb_build_array('“' || c.title || '” ends on ' || email_date(c.end_date) || '.',
            'Agree on a pickup time with ' || v_who || '. Ready for the next artist? Post your wall again in one tap.'),
          'button', 'See the agreement');
      end if;
      if r.kind = 'show_starts' then
        if c.start_date is null or c.start_date < current_date then return null; end if;
        return base || jsonb_build_object(
          'label', 'Coming up',
          'subject', 'Your show at ' || coalesce(c.venue_name, v_who) || ' starts ' || to_char(c.start_date, 'FMDay'),
          'heading', 'Your show starts ' || to_char(c.start_date, 'FMDay'),
          'paras', jsonb_build_array(
            '“' || c.title || '” opens on ' || email_date(c.start_date) || '.',
            case when c.installation_date is not null and c.installation_date <> c.start_date
                 then 'Hanging is on ' || email_date(c.installation_date) || '. ' else '' end
              || 'Check the details with ' || v_who || ' and tell your people. It''s a good moment to share your site.'),
          'button', 'See the agreement');
      end if;
      if c.end_date is null or c.end_date < current_date then return null; end if;
      return base || jsonb_build_object(
        'label', 'Ending soon',
        'subject', 'Your show at ' || coalesce(c.venue_name, v_who) || ' ends next ' || to_char(c.end_date, 'FMDay'),
        'heading', 'Your show ends next ' || to_char(c.end_date, 'FMDay'),
        'paras', jsonb_build_array(
          '“' || c.title || '” ends on ' || email_date(c.end_date) || '.',
          'Plan the pickup with ' || v_who || coalesce(' (works back by ' || email_date(coalesce(c.deinstallation_date, c.unsold_return_by)) || ')', '')
            || '. Sold anything? Record it in Money so your numbers stay right.'),
        'button', 'See the agreement');
    end if;
    return null;
  end if;

  -- A venue near you is looking for art ---------------------------------------
  if r.kind = 'wall_nearby' then
    select * into pr from pool_requests where id = (r.data->>'post_id')::uuid;
    if not found or coalesce(pr.status, 'open') <> 'open' then return null; end if;
    -- Already offered something to this post? Then no need.
    if exists (select 1 from deals where pool_request_id = pr.id and artist_id = r.user_id) then return null; end if;
    v_who := email_name(pr.user_id);
    v_city := coalesce(nullif(trim(regexp_replace(coalesce(pr.location_name, pr.location, ''), '^.*,', '')), ''), 'your city');
    v_terms := coalesce(pr.details, '{}'::jsonb);
    v_facts := coalesce((select jsonb_agg(f) filter (where f->>1 is not null) from (values
      (jsonb_build_array('Where', nullif(trim(coalesce(pr.location_name, pr.location)), ''))),
      (jsonb_build_array('Wall', nullif(v_terms->>'wall', ''))),
      (jsonb_build_array('How long', nullif(v_terms->>'duration', ''))),
      (jsonb_build_array('Selling', case when (v_terms->>'sells')::boolean is true
          then 'Yes' || coalesce(', ' || (v_terms->>'commission') || '% commission', '')
          when (v_terms->>'sells')::boolean is false then 'Display only' end))
    ) v(f)), '[]'::jsonb);
    return jsonb_build_object(
      'label', 'Looking for art',
      'from', email_person(pr.user_id, p_site),
      'images', coalesce((select jsonb_agg(u) from (select email_img(x, p_site) u from unnest(
          array_remove(array[pr.cover_image] || coalesce(pr.images, '{}'), null)) x where email_img(x, p_site) is not null limit 1) y), '[]'::jsonb),
      'subject', v_who || ' in ' || initcap(v_city) || ' is looking for art',
      'heading', v_who || ' is looking for art',
      'paras', jsonb_build_array('A place in ' || initcap(v_city) || ' wants art for its walls: “' || pr.title || '”.',
                                 'If your work fits, offer it in a minute. You pick the works, they say yes or no thanks.'),
      'quote', nullif(left(trim(pr.description), 300), ''),
      'facts', v_facts,
      'button', 'Offer your work', 'url', p_site || '/dashboard/looking',
      'line', 'A place in ' || initcap(v_city) || ' wants art for its walls.');
  end if;

  -- Messages -------------------------------------------------------------------
  if r.kind = 'message' then
    select * into cv from conversations where id = (r.data->>'conversation_id')::uuid;
    if not found then return null; end if;
    select count(*) into v_unread from messages m
    where m.conversation_id = cv.id and m.sender_id is distinct from r.user_id
      and coalesce(m.template_key, '') <> 'deal'
      and not coalesce(case when r.user_id = cv.participant_a then m.read_by_a else m.read_by_b end, false);
    if v_unread = 0 then return null; end if;
    select m.body, m.sender_id, coalesce(case when m.sender_id is not null then email_name(m.sender_id) end, nullif(trim(m.guest_name), ''), cv.guest_name, 'Someone') as who
      into v_last
    from messages m
    where m.conversation_id = cv.id and m.sender_id is distinct from r.user_id
      and coalesce(m.template_key, '') <> 'deal'
    order by m.created_at desc limit 1;
    return jsonb_build_object(
      'label', 'Message',
      'from', case when v_last.sender_id is not null then email_person(v_last.sender_id, p_site)
                   else jsonb_build_object('name', v_last.who, 'sub', 'Visitor') end,
      'subject', case when v_unread = 1 then 'New message from ' || v_last.who else v_unread || ' new messages from ' || v_last.who end,
      'heading', case when v_unread = 1 then v_last.who || ' wrote to you' else v_last.who || ' sent you ' || v_unread || ' messages' end,
      'paras', case when v_unread = 1 then '[]'::jsonb else jsonb_build_array('Here''s the latest:') end,
      'quote', left(v_last.body, 500) || case when length(v_last.body) > 500 then '…' else '' end,
      'line', left(v_last.body, 140) || case when length(v_last.body) > 140 then '…' else '' end,
      'button', 'Reply', 'url', p_site || '/dashboard/messages?c=' || cv.id);
  end if;

  return null;
end $c$;
    $e$;
  end if;
end
$outer$;
