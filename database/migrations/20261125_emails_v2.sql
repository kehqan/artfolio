-- Artomango: richer, more personal emails (run after 20261124_emails.sql)
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- What changes
--   Look: artwork photos, who it's from, a small label per email, the 4-step
--   deal tracker, an agreement summary, and a mango "It's a deal" moment.
--   New emails:
--     wall_nearby   A venue near you posted "art for our walls" (to artists)
--     nudge_answer  An offer or request still waiting for your answer, 3 days on
--     nudge_sign    An agreement still waiting for your signature, 2 days on
--     show_starts   Your show starts in 2 days
--     show_ends     Your show ends in a week: plan the pickup
--   Nudges and show reminders are checked every morning at 9:00 Prague time.

-- ─── 1. Small helpers ──────────────────────────────────────────────────────
-- A stored image path → a full URL an email can load.
create or replace function public.email_img(p text, p_site text) returns text
language sql immutable as $$
  select case
    when p is null or trim(p) = '' then null
    when p ~* '^https?://' then p
    when left(p, 1) = '/' then p_site || p
    else null end;
$$;

-- Up to 3 artwork photos, in the order given.
create or replace function public.email_work_images(p_ids uuid[], p_site text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(u order by n), '[]'::jsonb) from (
    select email_img(a.images[1], p_site) as u, array_position(p_ids, a.id) as n
    from artworks a where a.id = any(p_ids) and email_img(a.images[1], p_site) is not null
    order by array_position(p_ids, a.id) limit 3) x;
$$;

-- Who an email is from: name, photo and a short line ("Café · Vinohrady, Prague").
create or replace function public.email_person(p_user uuid, p_site text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', email_name(p_user),
    'avatar', email_img(p.avatar_url, p_site),
    'sub', nullif(concat_ws(' · ',
      case when p.role in ('venue', 'gallery') then coalesce(nullif(p.venue_type, ''), 'Venue') else 'Artist' end,
      nullif(trim(coalesce(p.location_name, p.location)), '')), ''))
  from (select 1) x left join profiles p on p.id = p_user;
$$;

create or replace function public.email_date(d date) returns text
language sql immutable as $$ select to_char(d, 'FMDD Mon YYYY') $$;

create or replace function public.email_city(t text) returns text
language sql immutable as $$
  select nullif(lower(trim(regexp_replace(coalesce(t, ''), '^.*,', ''))), '');
$$;

-- What an agreement says, as short facts for the email.
create or replace function public.email_contract_facts(c public.contracts) returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(f) filter (where f->>1 is not null), '[]'::jsonb) from (values
    (jsonb_build_array('Where', nullif(concat_ws(', ', nullif(c.venue_name, ''), nullif(c.venue_address, '')), ''))),
    (jsonb_build_array('When', case when c.start_date is not null then email_date(c.start_date)
        || coalesce(' to ' || email_date(c.end_date), '') end)),
    (jsonb_build_array('Commission', case when c.commission_pct is not null then trim(to_char(c.commission_pct, 'FM990.##')) || '% if a work sells' end)),
    (jsonb_build_array('Between', c.initiator_name || ' and ' || c.counterparty_name))
  ) v(f);
$$;

-- ─── 2. Writing each email ─────────────────────────────────────────────────
-- One outbox row → an item:
--   subject, heading, paras[], quote, button, url, greeting, line (digest preview),
--   label, from {name, avatar, sub}, images[], steps (0-3), facts [[k, v]], celebrate
-- or null when there's nothing to say anymore.
create or replace function public.email_compose(r public.email_outbox, p_site text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  d   public.deals;
  c   public.contracts;
  cv  public.conversations;
  pr  public.pool_requests;
  v_who text; v_works text; v_n int; v_offer boolean; v_url text; v_unread int; v_last record;
  v_imgs jsonb; v_step int; v_me_init boolean; v_other uuid; v_city text; v_terms jsonb; v_facts jsonb;
  base jsonb;
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
      if exists (select 1 from profiles where id = r.user_id and role in ('venue', 'gallery')) then
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
end $$;

-- ─── 3. The look ───────────────────────────────────────────────────────────
-- Paper page, white card with an ink outline and hard shadow, mango only where
-- it means something (the button, the current step, "It's a deal").
create or replace function public.email_render(p_items jsonb, p_site text, p_off_url text) returns jsonb
language plpgsql stable set search_path = public as $$
declare
  f_head text := 'font-family:''Darker Grotesque'',''Arial Narrow'',Arial,sans-serif;font-weight:700;color:#111110;';
  f_ui   text := 'font-family:''Instrument Sans'',-apple-system,''Segoe UI'',Helvetica,Arial,sans-serif;';
  one    boolean := jsonb_array_length(p_items) = 1;
  it     jsonb; p jsonb; f jsonb; fr jsonb; img jsonb;
  v_subject text; v_heading text; v_pre text; v_button text; v_url text;
  top_h text := ''; body_h text := ''; body_t text := ''; foot_h text; foot_t text;
  n_img int; w int; i int; v_step int; labels text[] := array['Offered', 'Interested', 'Agreement', 'Done'];
  cell text; dot text; celebrate boolean := false;
begin
  if one then
    it := p_items->0;
    v_subject := it->>'subject'; v_heading := it->>'heading'; v_button := it->>'button'; v_url := it->>'url';
    v_pre := coalesce(it->'paras'->>0, it->>'quote', '');
    celebrate := coalesce((it->>'celebrate')::boolean, false);

    -- Label
    if it->>'label' is not null and not celebrate then
      top_h := top_h || '<div style="margin:0 0 18px;"><span style="display:inline-block;padding:5px 11px;border:1.5px solid #111110;border-radius:999px;background:#FFF4BF;'
        || f_ui || 'font-size:12px;font-weight:600;line-height:1;letter-spacing:0.04em;text-transform:uppercase;color:#111110;">' || email_esc(it->>'label') || '</span></div>';
    end if;

    -- From
    fr := it->'from';
    if fr is not null and fr->>'name' is not null then
      top_h := top_h || '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr><td valign="middle" style="padding-right:12px;">'
        || case when fr->>'avatar' is not null
             then '<img src="' || email_esc(fr->>'avatar') || '" width="44" height="44" alt="" style="display:block;width:44px;height:44px;border-radius:999px;border:1px solid #E8E0D0;object-fit:cover;">'
             else '<div style="width:44px;height:44px;border-radius:999px;background:#FFF4BF;border:1px solid #E8E0D0;text-align:center;line-height:44px;' || f_head || 'font-size:22px;">'
                  || email_esc(upper(left(fr->>'name', 1))) || '</div>' end
        || '</td><td valign="middle" style="' || f_ui || '"><div style="font-size:15px;font-weight:600;line-height:1.3;color:#111110;">' || email_esc(fr->>'name') || '</div>'
        || case when fr->>'sub' is not null then '<div style="font-size:13px;line-height:1.4;color:#7A6F5B;">' || email_esc(fr->>'sub') || '</div>' else '' end
        || '</td></tr></table>';
    end if;

    -- Heading
    top_h := top_h || '<h1 style="margin:0 0 16px;' || f_head || 'font-size:34px;line-height:1.05;">' || email_esc(v_heading) || '</h1>';

    -- Artwork photos
    n_img := coalesce(jsonb_array_length(it->'images'), 0);
    if n_img > 0 then
      w := case n_img when 1 then 500 when 2 then 244 else 160 end;
      body_h := body_h || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;"><tr>';
      i := 0;
      for img in select * from jsonb_array_elements(it->'images') loop
        body_h := body_h || '<td valign="top" style="' || case when i > 0 then 'padding-left:10px;' else '' end || '">'
          || '<img src="' || email_esc(img #>> '{}') || '" width="' || w || '" alt="" style="display:block;width:100%;max-width:' || w
          || 'px;height:auto;' || case when n_img > 1 then 'max-height:220px;object-fit:cover;' else 'max-height:420px;object-fit:cover;' end
          || 'border-radius:10px;border:1px solid #E8E0D0;"></td>';
        i := i + 1;
      end loop;
      body_h := body_h || '</tr></table>';
    end if;

    if it->>'greeting' is not null then
      body_h := body_h || '<p style="margin:0 0 14px;' || f_ui || 'font-size:16px;line-height:1.55;color:#5C5346;">' || email_esc(it->>'greeting') || '</p>';
      body_t := body_t || (it->>'greeting') || E'\n\n';
    end if;
    for p in select * from jsonb_array_elements(coalesce(it->'paras', '[]')) loop
      continue when nullif(trim(p #>> '{}'), '') is null;
      body_h := body_h || '<p style="margin:0 0 14px;' || f_ui || 'font-size:16px;line-height:1.55;color:#5C5346;">' || email_esc(p #>> '{}') || '</p>';
      body_t := body_t || (p #>> '{}') || E'\n\n';
    end loop;
    if nullif(trim(it->>'quote'), '') is not null then
      body_h := body_h || '<div style="margin:6px 0 18px;padding:14px 16px;background:#F5F0E8;border-left:3px solid #111110;border-radius:4px 10px 10px 4px;' || f_ui
        || 'font-size:15px;line-height:1.55;color:#111110;white-space:pre-line;">' || email_esc(trim(it->>'quote')) || '</div>';
      body_t := body_t || '"' || trim(it->>'quote') || E'"\n\n';
    end if;

    -- Facts (agreement summary, wall details)
    if coalesce(jsonb_array_length(it->'facts'), 0) > 0 then
      body_h := body_h || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;border:1px solid #E8E0D0;border-radius:10px;border-collapse:separate;">';
      i := 0;
      for f in select * from jsonb_array_elements(it->'facts') loop
        body_h := body_h || '<tr><td valign="top" style="padding:10px 14px;' || case when i > 0 then 'border-top:1px solid #E8E0D0;' else '' end
          || f_ui || 'font-size:13px;line-height:1.4;color:#7A6F5B;width:96px;">' || email_esc(f->>0) || '</td>'
          || '<td valign="top" style="padding:10px 14px 10px 0;' || case when i > 0 then 'border-top:1px solid #E8E0D0;' else '' end
          || f_ui || 'font-size:14px;line-height:1.4;color:#111110;">' || email_esc(f->>1) || '</td></tr>';
        body_t := body_t || (f->>0) || ': ' || (f->>1) || E'\n';
        i := i + 1;
      end loop;
      body_h := body_h || '</table>';
      body_t := body_t || E'\n';
    end if;

    -- The 4-step deal tracker
    if it ? 'steps' and it->>'steps' is not null then
      v_step := (it->>'steps')::int;
      body_h := body_h || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 6px;"><tr>';
      for i in 0..3 loop
        dot := case
          when i < v_step or (i = 3 and v_step = 3) then
            '<div style="width:26px;height:26px;margin:0 auto;border-radius:999px;background:#111110;border:1.5px solid #111110;text-align:center;line-height:26px;' || f_ui || 'font-size:13px;font-weight:600;color:#FFFFFF;">&#10003;</div>'
          when i = v_step then
            '<div style="width:26px;height:26px;margin:0 auto;border-radius:999px;background:#FFD400;border:1.5px solid #111110;text-align:center;line-height:26px;' || f_ui || 'font-size:13px;font-weight:600;color:#111110;">' || (i + 1) || '</div>'
          else
            '<div style="width:26px;height:26px;margin:0 auto;border-radius:999px;background:#FFFFFF;border:1.5px solid #D4C9B4;text-align:center;line-height:26px;' || f_ui || 'font-size:13px;color:#7A6F5B;">' || (i + 1) || '</div>' end;
        cell := '<td width="25%" align="center" valign="top" style="padding:0 2px;">' || dot
          || '<div style="margin-top:6px;' || f_ui || 'font-size:12px;line-height:1.3;' || case when i = v_step then 'font-weight:600;color:#111110;' else 'color:#7A6F5B;' end || '">'
          || labels[i + 1] || '</div></td>';
        body_h := body_h || cell;
      end loop;
      body_h := body_h || '</tr></table>';
      body_t := body_t || 'Step ' || least(v_step + 1, 4) || ' of 4: ' || labels[least(v_step + 1, 4)] || E'\n\n';
    end if;
  else
    -- Several updates in one email
    v_subject := (p_items->0->>'subject') || ' and ' || (jsonb_array_length(p_items) - 1)
      || case when jsonb_array_length(p_items) = 2 then ' more update' else ' more updates' end;
    v_heading := 'Here''s what''s new';
    v_button := 'Open Artomango'; v_url := p_site || '/dashboard';
    v_pre := p_items->0->>'subject';
    top_h := '<h1 style="margin:0 0 16px;' || f_head || 'font-size:34px;line-height:1.05;">' || email_esc(v_heading) || '</h1>';
    for it in select * from jsonb_array_elements(p_items) loop
      body_h := body_h || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E8E0D0;"><tr>'
        || case when it->'images'->>0 is not null or it->'from'->>'avatar' is not null then
             '<td valign="top" width="56" style="padding:14px 12px 14px 0;"><img src="' || email_esc(coalesce(it->'images'->>0, it->'from'->>'avatar'))
             || '" width="56" height="56" alt="" style="display:block;width:56px;height:56px;object-fit:cover;border-radius:'
             || case when it->'images'->>0 is not null then '8px' else '999px' end || ';border:1px solid #E8E0D0;"></td>'
           else '' end
        || '<td valign="top" style="padding:14px 0;' || f_ui || '">'
        || case when it->>'label' is not null then '<div style="font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:#7A6F5B;margin-bottom:3px;">' || email_esc(it->>'label') || '</div>' else '' end
        || '<div style="font-size:16px;line-height:1.35;color:#111110;font-weight:600;">' || email_esc(it->>'subject') || '</div>'
        || '<div style="margin-top:4px;font-size:14px;line-height:1.45;color:#5C5346;">' || email_esc(coalesce(it->>'line', it->'paras'->>0, it->>'quote', '')) || '</div>'
        || '<div style="margin-top:6px;font-size:14px;"><a href="' || email_esc(it->>'url') || '" style="color:#111110;font-weight:600;text-decoration:underline;">' || email_esc(it->>'button') || ' &rarr;</a></div>'
        || '</td></tr></table>';
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
|| '<tr><td style="padding:0 4px 18px;"><a href="' || email_esc(p_site) || '" style="text-decoration:none;">'
|| '<img src="' || email_esc(p_site) || '/logo.png" width="26" height="26" alt="" style="vertical-align:middle;border:0;margin-right:8px;">'
|| '<span style="' || f_head || 'font-size:24px;vertical-align:middle;">Artomango</span></a></td></tr>'
|| '<tr><td style="background:#FFFFFF;border:1.5px solid #111110;border-radius:16px;box-shadow:5px 5px 0 #111110;overflow:hidden;">'
|| case when celebrate then
     '<div style="background:#FFD400;border-bottom:1.5px solid #111110;border-radius:14px 14px 0 0;padding:26px 28px 22px;">'
     || '<div style="' || f_ui || 'font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#111110;margin-bottom:8px;">&#10022; ' || email_esc(coalesce(it->>'label', 'Signed')) || '</div>'
     || '<div style="' || f_head || 'font-size:44px;line-height:1;">' || email_esc(v_heading) || '</div></div>'
   else '' end
|| '<div style="padding:' || case when celebrate then '24px' else '30px' end || ' 28px 28px;">'
|| case when celebrate then replace(top_h, '<h1 style="margin:0 0 16px;' || f_head || 'font-size:34px;line-height:1.05;">' || email_esc(v_heading) || '</h1>', '') else top_h end
|| body_h
|| '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;"><tr>'
|| '<td style="background:#FFD400;border:1.5px solid #111110;border-radius:10px;box-shadow:2px 2px 0 #111110;">'
|| '<a href="' || email_esc(v_url) || '" style="display:inline-block;padding:13px 22px;' || f_ui || 'font-size:15px;font-weight:600;line-height:1;color:#111110;text-decoration:none;">'
|| email_esc(v_button) || ' &rarr;</a></td></tr></table>'
|| case when one and coalesce((p_items->0->>'show_link')::boolean, false) then
     '<p style="margin:18px 0 0;' || f_ui || 'font-size:13px;line-height:1.5;color:#7A6F5B;word-break:break-all;">Or copy this link into your browser:<br><a href="'
     || email_esc(v_url) || '" style="color:#111110;">' || email_esc(v_url) || '</a></p>' else '' end
|| '</div></td></tr>'
|| '<tr><td style="padding:22px 4px 0;' || f_ui || 'font-size:13px;line-height:1.5;color:#7A6F5B;">' || foot_h || '</td></tr>'
|| '</table></td></tr></table></body></html>');
end $$;

-- ─── 4. "A place near you is looking for art" ──────────────────────────────
-- When a venue posts a wall, tell artists nearby who have at least one work.
-- Near = within 30 km when both have a map pin, otherwise the same city name.
create or replace function public.email_on_wall_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record; v_city text := email_city(coalesce(new.location_name, new.location, new.venue_city));
begin
  begin
    if new.request_type is distinct from 'walls' or coalesce(new.status, 'open') <> 'open' then return new; end if;
    if tg_op = 'UPDATE' and old.status is not distinct from new.status then return new; end if;
    for a in
      select p.id from profiles p
      where p.id <> new.user_id
        and coalesce(p.role, 'artist') not in ('venue', 'gallery', 'admin')
        and exists (select 1 from artworks w where w.user_id = p.id)
        and (
          (new.lat is not null and p.lat is not null and new.lng is not null and p.lng is not null
           and 6371 * 2 * asin(sqrt(power(sin(radians(p.lat - new.lat) / 2), 2)
               + cos(radians(new.lat)) * cos(radians(p.lat)) * power(sin(radians(p.lng - new.lng) / 2), 2))) <= 30)
          or (v_city is not null and email_city(coalesce(p.location_name, p.location)) = v_city)
        )
      limit 1000
    loop
      perform email_enqueue(a.id, null, 'wall_nearby', jsonb_build_object('post_id', new.id),
                            interval '5 minutes', 'wall_nearby:' || new.id || ':' || a.id);
    end loop;
  exception when others then
    raise warning 'email_on_wall_post: %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists email_on_wall_post on public.pool_requests;
create trigger email_on_wall_post after insert or update of status on public.pool_requests
  for each row execute function public.email_on_wall_post();

-- ─── 5. Every morning: nudges and show reminders ───────────────────────────
-- Each one is sent at most once (checked by its key in the outbox).
create or replace function public.email_once(p_user uuid, p_email text, p_kind text, p_data jsonb, p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from email_outbox where dedupe_key = p_key or note = 'once:' || p_key) then return; end if;
  perform email_enqueue(p_user, p_email, p_kind, p_data, interval '0 minutes', p_key);
  update email_outbox set note = 'once:' || p_key where dedupe_key = p_key and status = 'queued';
end $$;

create or replace function public.email_daily() returns void
language plpgsql security definer set search_path = public as $$
declare x record;
begin
  -- An offer or request nobody answered in 3 days (not older than 10).
  for x in
    select d.id, case when d.started_by = d.artist_id then d.venue_id else d.artist_id end as who
    from deals d where d.status = 'sent' and d.created_at < now() - interval '3 days' and d.created_at > now() - interval '10 days'
  loop
    perform email_once(x.who, null, 'nudge_answer', jsonb_build_object('deal_id', x.id), 'nudge_answer:' || x.id);
  end loop;

  -- An agreement waiting for a signature for 2 days (not older than 14).
  for x in
    select c.* from contracts c
    where c.status in ('sent', 'partially_signed') and c.created_at < now() - interval '2 days' and c.created_at > now() - interval '14 days'
  loop
    if x.counterparty_signed_at is null then
      if x.counterparty_id is not null then
        perform email_once(x.counterparty_id, null, 'nudge_sign', jsonb_build_object('contract_id', x.id), 'nudge_sign:' || x.id || ':cp');
      elsif x.counterparty_email is not null and x.counterparty_token is not null then
        perform email_once(null, x.counterparty_email, 'nudge_sign', jsonb_build_object('contract_id', x.id), 'nudge_sign:' || x.id || ':cp');
      end if;
    end if;
    if x.initiator_signed_at is null and x.counterparty_signed_at is not null then
      perform email_once(x.initiator_id, null, 'nudge_sign', jsonb_build_object('contract_id', x.id), 'nudge_sign:' || x.id || ':init');
    end if;
  end loop;

  -- Shows starting in 2 days and ending in 7, for both sides of a signed agreement.
  for x in
    select c.id, c.initiator_id, c.counterparty_id,
           case when c.start_date = current_date + 2 then 'show_starts' else 'show_ends' end as kind
    from contracts c
    where c.status = 'signed' and c.contract_type = 'exhibition'
      and (c.start_date = current_date + 2 or c.end_date = current_date + 7)
  loop
    perform email_once(x.initiator_id, null, x.kind, jsonb_build_object('contract_id', x.id), x.kind || ':' || x.id || ':init');
    if x.counterparty_id is not null then
      perform email_once(x.counterparty_id, null, x.kind, jsonb_build_object('contract_id', x.id), x.kind || ':' || x.id || ':cp');
    end if;
  end loop;
end $$;

revoke all on function public.email_daily() from public, anon, authenticated;
revoke all on function public.email_once(uuid, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.email_compose(public.email_outbox, text) from public, anon, authenticated;
revoke all on function public.email_render(jsonb, text, text) from public, anon, authenticated;
revoke all on function public.email_work_images(uuid[], text) from public, anon, authenticated;
revoke all on function public.email_person(uuid, text) from public, anon, authenticated;
revoke all on function public.email_contract_facts(public.contracts) from public, anon, authenticated;

-- 8:00 UTC = 9:00 in Prague (10:00 in summer).
select cron.schedule('artomango-emails-daily', '0 8 * * *', 'select public.email_daily()');
