-- Artomango: reasons for artists to come back (2026-11-26)
-- Paste all of this into the Supabase SQL editor and press Run. Safe to run twice.
--
-- 1. Buy links: an artist can put any shop link behind a work's Buy button
--    (their own shop, Etsy, Artsy, a payment link). No commission. We count
--    taps on it, never who tapped.
-- 2. Open calls: open calls, grants and residencies that the Artomango team
--    (admins) adds and checks. Artists read them and add deadlines to their
--    Planner. Nothing here needs an account to read.
--
-- Privacy: a Buy tap stores the work, where the tap came from (site, label,
-- passport) and the hour. No IP address, device, cookie or person.

-- ─── 1. Buy links ──────────────────────────────────────────────────────────
create table if not exists public.artwork_buy_links (
  artwork_id uuid primary key references public.artworks (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  url text not null check (url ~* '^https://[^\s/$.?#][^\s]*$' and char_length(url) <= 600),
  updated_at timestamptz not null default now()
);

alter table public.artwork_buy_links enable row level security;
revoke all on public.artwork_buy_links from anon;
grant select, insert, update, delete on public.artwork_buy_links to authenticated;

-- Only the work's artist sets or reads the link directly. Visitors get it
-- through buy_links_for() and buy_go() below.
drop policy if exists "Artists manage their buy links" on public.artwork_buy_links;
create policy "Artists manage their buy links" on public.artwork_buy_links
  for all to authenticated
  using (exists (select 1 from public.artworks a where a.id = artwork_buy_links.artwork_id and a.user_id = (select auth.uid())))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.artworks a where a.id = artwork_buy_links.artwork_id and a.user_id = (select auth.uid()))
  );

create index if not exists artwork_buy_links_user_idx on public.artwork_buy_links (user_id);

create table if not exists public.buy_clicks (
  id bigint generated always as identity primary key,
  artwork_id uuid not null references public.artworks (id) on delete cascade,
  label_id uuid references public.wall_labels (id) on delete set null,
  source text not null check (source in ('site', 'label', 'passport', 'other')),
  hour timestamptz not null default date_trunc('hour', now())
);

create index if not exists buy_clicks_artwork_idx on public.buy_clicks (artwork_id, hour);
create index if not exists buy_clicks_label_idx on public.buy_clicks (label_id) where label_id is not null;

alter table public.buy_clicks enable row level security;
revoke all on public.buy_clicks from anon;
grant select on public.buy_clicks to authenticated;

drop policy if exists "Artists see taps on their works" on public.buy_clicks;
create policy "Artists see taps on their works" on public.buy_clicks
  for select to authenticated
  using (exists (select 1 from public.artworks a where a.id = buy_clicks.artwork_id and a.user_id = (select auth.uid())));

-- Can this work be bought right now? Not when it's sold, reserved, not for
-- sale, or still in the studio.
create or replace function public.work_buyable(a public.artworks) returns boolean
language sql stable set search_path = public as $$
  select replace(lower(coalesce(a.status, '')), ' ', '_') not in ('sold', 'reserved', 'concept', 'in_progress')
     and coalesce(a.sale_method, '') <> 'not_for_sale';
$$;

-- Which of these works have a Buy link, and the shop's web address to show
-- on the button ("Buy on etsy.com"). For anyone.
--
-- Later, when Artomango has its own checkout: a work on a venue's wall
-- (its label has a deal or a venue) will sell through Artomango instead of
-- the artist's link, so the venue's share is paid. That switch belongs here
-- and in buy_go(), so every Buy button follows it at once. Sales on the
-- artist's own site and links stay commission free.
create or replace function public.buy_links_for(p_artwork_ids uuid[])
returns table (artwork_id uuid, host text)
language sql stable security definer set search_path = public as $$
  select b.artwork_id,
         regexp_replace(lower(substring(b.url from '^https://([^/:?#]+)')), '^www\.', '')
  from public.artwork_buy_links b
  join public.artworks a on a.id = b.artwork_id
  where b.artwork_id = any(p_artwork_ids[1:200]) and public.work_buyable(a);
$$;

revoke all on function public.buy_links_for(uuid[]) from public;
grant execute on function public.buy_links_for(uuid[]) to anon, authenticated;

-- A visitor tapped Buy: count it and hand back where to send them.
-- Returns null when there's no link (the site then opens the piece instead).
create or replace function public.buy_go(p_artwork uuid, p_source text, p_code text default null)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  a public.artworks;
  link text;
  lab uuid;
  src text := case when p_source in ('site', 'label', 'passport') then p_source else 'other' end;
begin
  select * into a from public.artworks where id = p_artwork;
  if a.id is null or not public.work_buyable(a) then return null; end if;
  select url into link from public.artwork_buy_links where artwork_id = a.id;
  if link is null then return null; end if;
  if p_code is not null then
    select id into lab from public.wall_labels where code = upper(left(p_code, 12)) and artwork_id = a.id;
  end if;
  -- A brake on someone tapping again and again to inflate the numbers.
  if (select count(*) from public.buy_clicks where artwork_id = a.id and hour = date_trunc('hour', now())) < 300 then
    insert into public.buy_clicks (artwork_id, label_id, source) values (a.id, lab, case when lab is not null then 'label' else src end);
    -- Also shows in the label's "what they did next".
    if lab is not null then
      insert into public.label_scans (label_id, artwork_id, action) values (lab, a.id, 'buy');
    end if;
  end if;
  return link;
end;
$$;

revoke all on function public.buy_go(uuid, text, text) from public;
grant execute on function public.buy_go(uuid, text, text) to anon, authenticated;

-- ─── 2. Open calls ─────────────────────────────────────────────────────────
create table if not exists public.open_calls (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  organizer text check (char_length(organizer) <= 120),
  kind text not null default 'open_call' check (kind in ('open_call', 'grant', 'residency', 'prize')),
  -- Where it is (or who can apply): drives the "Near you" filter.
  region text not null default 'europe' check (region in ('prague', 'czechia', 'europe', 'world', 'online')),
  place text check (char_length(place) <= 120),
  deadline date not null,
  url text not null check (url ~* '^https?://[^\s/$.?#][^\s]*$' and char_length(url) <= 600),
  summary text check (char_length(summary) <= 600),
  -- Plain words: "Free to apply", "€25 fee", "Up to €5,000".
  fee text check (char_length(fee) <= 60),
  award text check (char_length(award) <= 80),
  published boolean not null default true,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists open_calls_deadline_idx on public.open_calls (deadline) where published;

alter table public.open_calls enable row level security;
grant select on public.open_calls to anon, authenticated;
grant insert, update, delete on public.open_calls to authenticated;

drop policy if exists "Anyone reads published open calls" on public.open_calls;
create policy "Anyone reads published open calls" on public.open_calls
  for select to anon, authenticated using (published or public.is_admin());

drop policy if exists "Admins add open calls" on public.open_calls;
create policy "Admins add open calls" on public.open_calls
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins change open calls" on public.open_calls;
create policy "Admins change open calls" on public.open_calls
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins remove open calls" on public.open_calls;
create policy "Admins remove open calls" on public.open_calls
  for delete to authenticated using (public.is_admin());

create or replace function public.open_calls_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists open_calls_touch on public.open_calls;
create trigger open_calls_touch before update on public.open_calls
  for each row execute function public.open_calls_touch();

-- If a deadline moves, move it in the Planners of everyone who added it.
-- (Planner entries for open calls have source 'open_call' and origin_id = the call.)
create or replace function public.open_calls_sync_planner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.deadline is distinct from old.deadline or new.title is distinct from old.title then
    update public.calendar_events
       set start_date = new.deadline, end_date = null, title = 'Deadline: ' || new.title
     where source = 'open_call' and origin_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists open_calls_sync_planner on public.open_calls;
create trigger open_calls_sync_planner after update on public.open_calls
  for each row execute function public.open_calls_sync_planner();

create index if not exists calendar_events_origin_idx on public.calendar_events (origin_id) where origin_id is not null;

-- How many artists put each call in their Planner (only admins see this).
create or replace function public.open_call_saves()
returns table (call_id uuid, n bigint)
language sql stable security definer set search_path = public as $$
  select origin_id, count(distinct user_id) from public.calendar_events
  where source = 'open_call' and origin_id is not null and public.is_admin()
  group by origin_id;
$$;

revoke all on function public.open_call_saves() from public;
grant execute on function public.open_call_saves() to authenticated;
