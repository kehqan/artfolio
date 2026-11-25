-- Artomango: wall labels with a QR code.
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- A wall label is one printed label for one work in one place (a cafe, a
-- show, a collector's home). Its QR code opens artomango.com/s/<code>,
-- which counts the scan and shows the piece page /l/<code>.
--
-- Privacy: a scan stores which label, the hour, and what happened next on
-- that visit. No IP address, device, browser, cookie or location. A person
-- is linked to a scan only when they choose to follow or write, and the page
-- tells them so.
--
-- Sales per label: 'price' shows the price, 'ask' shows "Ask about this
-- piece", 'off' hides selling (for loans and exhibitions). The artist can
-- switch it any way. A venue or curator in the deal can only switch it off.

-- ─── 1. Labels ─────────────────────────────────────────────────────────────
create or replace function public.new_label_code() returns text
language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.wall_labels where code = c);
  end loop;
  return c;
end;
$$;

create table if not exists public.wall_labels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  artwork_id uuid not null references public.artworks (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  -- The place, as written on the label and the piece page.
  place_name text check (char_length(place_name) <= 120),
  place_city text check (char_length(place_city) <= 120),
  place_profile uuid references public.profiles (id) on delete set null,
  starts_on date,
  ends_on date,
  design text not null default 'quiet' check (design in ('quiet', 'mango', 'ink', 'picture')),
  size text not null default 'card' check (size in ('card', 'post', 'stand')),
  language text not null default 'en' check (language in ('en', 'cs', 'both')),
  -- Which details print: { year, medium, size, note, place } (title and artist always do).
  show jsonb not null default '{"year": true, "medium": true, "size": true, "note": false, "place": false}'::jsonb,
  note text check (char_length(note) <= 140),
  sales text not null default 'price' check (sales in ('price', 'ask', 'off')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

-- Tables can't use a function that reads the same table as a default while
-- being created, so the default is set afterwards.
alter table public.wall_labels alter column code set default public.new_label_code();

create index if not exists wall_labels_artwork_idx on public.wall_labels (artwork_id);
create index if not exists wall_labels_deal_idx on public.wall_labels (deal_id) where deal_id is not null;
create index if not exists wall_labels_place_idx on public.wall_labels (place_profile) where place_profile is not null;

-- Who may manage a label: the work's artist, whoever made the label, and the
-- other person in the label's deal (or the curator of its project).
create or replace function public.can_manage_label(l public.wall_labels) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.artworks a where a.id = l.artwork_id and a.user_id = auth.uid())
    or l.created_by = auth.uid()
    or exists (select 1 from public.deals d where d.id = l.deal_id and auth.uid() in (d.artist_id, d.venue_id))
    or exists (select 1 from public.projects p where p.id = l.project_id and p.owner_id = auth.uid())
  );
$$;

-- Who may make a label for a work: its artist, or someone in a deal for it.
create or replace function public.can_label_work(p_artwork uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.artworks a where a.id = p_artwork and a.user_id = auth.uid())
    or exists (select 1 from public.deals d
               where p_artwork = any(d.artwork_ids) and auth.uid() in (d.artist_id, d.venue_id)
                 and d.status in ('interested', 'agreement_sent', 'signed'))
  );
$$;

alter table public.wall_labels enable row level security;
grant select, insert, update, delete on public.wall_labels to authenticated;

drop policy if exists "People on a label can see it" on public.wall_labels;
create policy "People on a label can see it" on public.wall_labels
  for select to authenticated using (public.can_manage_label(wall_labels));

drop policy if exists "Make a label for a work you can label" on public.wall_labels;
create policy "Make a label for a work you can label" on public.wall_labels
  for insert to authenticated with check (created_by = auth.uid() and public.can_label_work(artwork_id));

drop policy if exists "People on a label can change it" on public.wall_labels;
create policy "People on a label can change it" on public.wall_labels
  for update to authenticated using (public.can_manage_label(wall_labels)) with check (public.can_manage_label(wall_labels));

drop policy if exists "People on a label can delete it" on public.wall_labels;
create policy "People on a label can delete it" on public.wall_labels
  for delete to authenticated using (public.can_manage_label(wall_labels));

-- Keep the work and code fixed, and only let the artist turn selling on.
create or replace function public.wall_labels_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  is_artist boolean := exists (select 1 from public.artworks a where a.id = new.artwork_id and a.user_id = auth.uid());
  has_price boolean := exists (select 1 from public.artworks a where a.id = new.artwork_id and a.price is not null);
begin
  if tg_op = 'UPDATE' then
    if new.code <> old.code or new.artwork_id <> old.artwork_id or new.created_by <> old.created_by then
      raise exception 'These details of a label cannot change';
    end if;
    if not is_artist and old.sales = 'off' and new.sales <> 'off' then
      raise exception 'Only the artist can turn selling back on for this label' using errcode = '42501';
    end if;
    if not is_artist and old.sales = 'ask' and new.sales = 'price' then
      raise exception 'Only the artist can show the price on this label' using errcode = '42501';
    end if;
  end if;
  -- No price on the work: the label can only say "ask about it".
  if new.sales = 'price' and not has_price then
    new.sales := 'ask';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists wall_labels_guard on public.wall_labels;
create trigger wall_labels_guard before insert or update on public.wall_labels
  for each row execute function public.wall_labels_guard();

-- ─── 2. Scans ──────────────────────────────────────────────────────────────
create table if not exists public.label_scans (
  id bigint generated always as identity primary key,
  label_id uuid not null references public.wall_labels (id) on delete cascade,
  artwork_id uuid not null references public.artworks (id) on delete cascade,
  hour timestamptz not null default date_trunc('hour', now()),
  action text not null check (action in ('scan', 'passport', 'follow', 'ask', 'buy')),
  -- Only set when a signed-in person chose to follow or write.
  person_id uuid references public.profiles (id) on delete set null
);

create index if not exists label_scans_label_idx on public.label_scans (label_id, hour);
create index if not exists label_scans_artwork_idx on public.label_scans (artwork_id, hour);

alter table public.label_scans enable row level security;
revoke all on public.label_scans from anon;
grant select on public.label_scans to authenticated;

-- The artist reads their own works' scans (including who followed or asked).
-- Everyone else gets totals through label_stats below. Nobody inserts directly.
drop policy if exists "Artists see scans of their works" on public.label_scans;
create policy "Artists see scans of their works" on public.label_scans
  for select to authenticated
  using (exists (select 1 from public.artworks a where a.id = label_scans.artwork_id and a.user_id = auth.uid()));

-- Record one thing that happened on a label's page. Called by the site.
create or replace function public.record_label_event(p_code text, p_action text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  l public.wall_labels;
begin
  if p_action not in ('scan', 'passport', 'follow', 'ask', 'buy') then return; end if;
  select * into l from public.wall_labels where code = upper(left(p_code, 12));
  if l.id is null then return; end if;
  -- A brake on someone refreshing a page to inflate the numbers.
  if (select count(*) from public.label_scans where label_id = l.id and hour = date_trunc('hour', now())) >= 600 then
    return;
  end if;
  insert into public.label_scans (label_id, artwork_id, action, person_id)
  values (l.id, l.artwork_id, p_action,
          case when p_action in ('follow', 'ask', 'buy') then auth.uid() else null end);
end;
$$;

revoke all on function public.record_label_event(text, text) from public;
grant execute on function public.record_label_event(text, text) to anon, authenticated;

-- Totals per label for everyone who manages it (artist, venue, curator).
-- No people, only numbers.
create or replace function public.label_stats(p_label_ids uuid[])
returns table (label_id uuid, action text, hour timestamptz, n bigint)
language sql stable security definer set search_path = public as $$
  select s.label_id, s.action, s.hour, count(*)
  from public.label_scans s
  join public.wall_labels l on l.id = s.label_id
  where s.label_id = any(p_label_ids) and public.can_manage_label(l)
    and s.hour > now() - interval '120 days'
  group by s.label_id, s.action, s.hour;
$$;

revoke all on function public.label_stats(uuid[]) from public;
grant execute on function public.label_stats(uuid[]) to authenticated;

-- ─── 3. The public piece page ──────────────────────────────────────────────
-- Everything the page behind the QR needs, in one call, for anyone.
create or replace function public.label_page(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  l public.wall_labels;
  a public.artworks;
  sold boolean;
begin
  select * into l from public.wall_labels where code = upper(left(p_code, 12));
  if l.id is null then return null; end if;
  select * into a from public.artworks where id = l.artwork_id;
  if a.id is null then return null; end if;
  sold := lower(coalesce(a.status, '')) = 'sold';

  return jsonb_build_object(
    'label', jsonb_build_object(
      'code', l.code, 'sales', case when sold then 'off' else l.sales end, 'sold', sold,
      'place_name', l.place_name, 'place_city', l.place_city,
      'starts_on', l.starts_on, 'ends_on', l.ends_on, 'note', l.note,
      'place', (select jsonb_build_object('username', p.username, 'avatar_url', p.avatar_url, 'name', coalesce(nullif(p.venue_name, ''), p.full_name))
                from public.profiles p where p.id = l.place_profile)
    ),
    'work', jsonb_build_object(
      'id', a.id, 'title', a.title, 'year', a.year, 'medium', a.medium,
      'width_cm', a.width_cm, 'height_cm', a.height_cm, 'depth_cm', a.depth_cm,
      'images', coalesce(to_jsonb(a.images), '[]'::jsonb), 'description', a.description,
      'editions', a.editions, 'framed', a.framed, 'certificate_id', a.certificate_id,
      'authentication_status', a.authentication_status,
      'price', case when l.sales = 'price' and not sold then a.price end,
      'currency', case when l.sales = 'price' and not sold then a.currency end
    ),
    'artist', (select jsonb_build_object('id', p.id, 'full_name', p.full_name, 'username', p.username,
                                         'avatar_url', p.avatar_url, 'location', p.location, 'bio', left(p.bio, 400))
               from public.profiles p where p.id = a.user_id),
    'followers', (select count(*) from public.followers f where f.following_id = a.user_id),
    'passport', coalesce((
      select jsonb_agg(e order by e->>'date' desc nulls last) from (
        select jsonb_build_object('event_type', pe.event_type, 'date', pe.date, 'location', pe.location,
                                  'owner_name', case when pe.is_anonymous then null else pe.owner_name end) as e
        from public.provenance_entries pe where pe.artwork_id = a.id
        order by pe.date desc nulls last limit 3
      ) x), '[]'::jsonb),
    'passport_count', (select count(*) from public.provenance_entries pe where pe.artwork_id = a.id),
    'more', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'title', o.title, 'image', o.images[1]))
      from (select id, title, images from public.artworks
            where user_id = a.user_id and id <> a.id and coalesce(array_length(images, 1), 0) > 0
              and lower(coalesce(status, '')) not in ('concept', 'in_progress')
            order by created_at desc limit 6) o), '[]'::jsonb),
    -- Other works with a label in the same place right now.
    'neighbours', coalesce((
      select jsonb_agg(jsonb_build_object('code', n.code, 'title', w.title, 'image', w.images[1], 'artist', ap.full_name))
      from (select distinct on (x.artwork_id) x.code, x.artwork_id from public.wall_labels x
            where x.id <> l.id and x.artwork_id <> l.artwork_id
              and ((l.place_profile is not null and x.place_profile = l.place_profile)
                   or (l.project_id is not null and x.project_id = l.project_id))
              and (x.ends_on is null or x.ends_on >= current_date)
            order by x.artwork_id, x.created_at desc limit 8) n
      join public.artworks w on w.id = n.artwork_id
      left join public.profiles ap on ap.id = w.user_id), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.label_page(text) from public;
grant execute on function public.label_page(text) to anon, authenticated;

-- ─── 4. Privacy fix: stop keeping passport visitors' IP addresses ──────────
-- The passport view counter used to save each visitor's IP. The site no
-- longer sends it; this clears the ones already saved.
update public.passport_views set viewer_ip = null where viewer_ip is not null;
