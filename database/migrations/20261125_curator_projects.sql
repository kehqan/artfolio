-- Artomango: curator projects (part 1)
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- A new kind of account, "curator", for people who gather art for an
-- exhibition, an event or a collection. A curator creates projects and
-- invites artists into them. Inviting uses the deals that already exist:
-- the curator takes the venue's place in the deal, and the deal remembers
-- which project it belongs to.

-- ─── 1. Curator accounts ────────────────────────────────────────────────────
-- What a curator puts together (Exhibitions, Events or shows, A collection).
alter table public.profiles add column if not exists curates text[];

-- Sign-ups may now choose "curator" too.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := new.raw_user_meta_data->>'role';
begin
  insert into public.profiles (id, email, full_name, role, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when requested in ('artist', 'gallery', 'venue', 'curator') then requested else 'artist' end,
    lower(replace(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), ' ', ''))
      || floor(random() * 10000)::text
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ─── 2. Projects ────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'exhibition' check (kind in ('exhibition', 'event', 'collection')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  starts_on date,
  ends_on date,
  place text check (char_length(place) <= 300),
  lat double precision,
  lng double precision,
  online boolean not null default false,
  about text check (char_length(about) <= 4000),
  -- mediums[], styles[], count, deal (loan | sale | buy | unsure), commission
  looking_for jsonb not null default '{}'::jsonb,
  cover_url text,
  is_open boolean not null default false,
  status text not null default 'active' check (status in ('active', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create index if not exists projects_owner_idx on public.projects (owner_id);

alter table public.projects enable row level security;

drop policy if exists "Curators manage their projects" on public.projects;
create policy "Curators manage their projects" on public.projects
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Open projects can be seen by anyone signed in (used in part 2).
drop policy if exists "Open projects are visible" on public.projects;
create policy "Open projects are visible" on public.projects
  for select to authenticated using (is_open and status = 'active');

create or replace function public.projects_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.owner_id <> old.owner_id then raise exception 'A project cannot change owner'; end if;
  return new;
end $$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.projects_touch();

-- ─── 3. Deals know their project ────────────────────────────────────────────
alter table public.deals add column if not exists project_id uuid references public.projects (id) on delete set null;
create index if not exists deals_project_idx on public.deals (project_id) where project_id is not null;

-- Only the project's curator can put a deal in a project, as the deal's venue side.
create or replace function public.deals_project_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.project_id is not null
     and (tg_op = 'INSERT' or new.project_id is distinct from old.project_id)
     and not exists (select 1 from projects p where p.id = new.project_id and p.owner_id = new.venue_id and p.owner_id = auth.uid()) then
    raise exception 'Only the project''s curator can add a deal to it';
  end if;
  return new;
end $$;

drop trigger if exists deals_project_guard on public.deals;
create trigger deals_project_guard before insert or update of project_id on public.deals
  for each row execute function public.deals_project_guard();

-- Artists invited into a project can see it.
-- (Defined after deals.project_id exists, since the policy reads it.)
drop policy if exists "Artists in a project can see it" on public.projects;
create policy "Artists in a project can see it" on public.projects
  for select to authenticated using (
    exists (select 1 from deals d where d.project_id = projects.id and d.artist_id = auth.uid())
  );

-- ─── 4. Emails: call curators "Curator", and don't send them artist alerts ──
-- Only if the emails SQL (emails_v2) has been run.
do $outer$
begin
  if exists (select 1 from pg_proc where proname = 'email_img') and exists (select 1 from pg_proc where proname = 'email_name') then
    execute $e$
      create or replace function public.email_person(p_user uuid, p_site text) returns jsonb
      language sql stable security definer set search_path = public as $f$
        select jsonb_build_object(
          'name', email_name(p_user),
          'avatar', email_img(p.avatar_url, p_site),
          'sub', nullif(concat_ws(' · ',
            case when p.role in ('venue', 'gallery') then coalesce(nullif(p.venue_type, ''), 'Venue')
                 when p.role = 'curator' then 'Curator'
                 else 'Artist' end,
            nullif(trim(coalesce(p.location_name, p.location)), '')), ''))
        from (select 1) x left join profiles p on p.id = p_user;
      $f$;
    $e$;
  end if;
  if exists (select 1 from pg_proc where proname = 'email_on_wall_post') then
    execute $e$
create or replace function public.email_on_wall_post() returns trigger
language plpgsql security definer set search_path = public as $w$
declare a record; v_city text := email_city(coalesce(new.location_name, new.location, new.venue_city));
begin
  begin
    if new.request_type is distinct from 'walls' or coalesce(new.status, 'open') <> 'open' then return new; end if;
    if tg_op = 'UPDATE' and old.status is not distinct from new.status then return new; end if;
    for a in
      select p.id from profiles p
      where p.id <> new.user_id
        and coalesce(p.role, 'artist') not in ('venue', 'gallery', 'curator', 'admin')
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
end $w$;
    $e$;
  end if;
end
$outer$;
