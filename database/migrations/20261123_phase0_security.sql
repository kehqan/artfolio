-- Phase 0 security lockdown (2026-11-23)
--
-- Run once in the Supabase SQL editor (or `supabase db push`). Safe to re-run:
-- every policy is dropped before it is recreated.
--
-- Fixes:
--   1. Any signed-in user could make themselves admin (profiles.role), and a
--      signup could pass role=admin in its metadata.
--   2. hero_config / site_settings had RLS off; campaign_slides, hero_settings,
--      admin_settings and featured_posts were writable by any signed-in user.
--   3. Every contract with a signing token was readable by anyone.
--   4. Anyone could insert a message into any conversation.
--   5. Any signed-in user could delete anyone's follows / wishlist rows.
-- And gives admins the permissions the admin panel needs, which also fixes
-- "admin edits to other people's profiles do nothing".
--
-- To make someone an admin after this runs, use the SQL editor:
--   update public.profiles set role = 'admin' where email = '<their email>';

begin;

-- ─── 1. Admin check ─────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ─── 2. Nobody can grant themselves admin ───────────────────────────────────
-- Requests from the app (anon / authenticated JWTs) may only set or remove the
-- admin role when the caller is already an admin. The SQL editor, service role
-- and the auth signup trigger have no app JWT and are not affected.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role = 'admin' then
      raise exception 'Only an admin can grant the admin role' using errcode = '42501';
    end if;
  elsif new.role is distinct from old.role
        and (new.role = 'admin' or old.role = 'admin') then
    raise exception 'Only an admin can change the admin role' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before insert or update of role on public.profiles
  for each row execute function public.guard_profile_role();

-- Signups may only choose a normal role.
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
    case when requested in ('artist', 'gallery', 'venue') then requested else 'artist' end,
    lower(replace(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), ' ', ''))
      || floor(random() * 10000)::text
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ─── 3. Admin permissions used by the admin panel ───────────────────────────
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles" on public.profiles
  for delete using (public.is_admin());

drop policy if exists "Admins can update any artwork" on public.artworks;
create policy "Admins can update any artwork" on public.artworks
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete any artwork" on public.artworks;
create policy "Admins can delete any artwork" on public.artworks
  for delete using (public.is_admin());

drop policy if exists "Admins can read all exhibitions" on public.exhibitions;
create policy "Admins can read all exhibitions" on public.exhibitions
  for select using (public.is_admin());

drop policy if exists "Admins can update any exhibition" on public.exhibitions;
create policy "Admins can update any exhibition" on public.exhibitions
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete any exhibition" on public.exhibitions;
create policy "Admins can delete any exhibition" on public.exhibitions
  for delete using (public.is_admin());

-- ─── 4. Site content: everyone reads, only admins write ─────────────────────
alter table public.hero_config   enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Public can read hero config" on public.hero_config;
create policy "Public can read hero config" on public.hero_config
  for select using (true);
drop policy if exists "Admins manage hero config" on public.hero_config;
create policy "Admins manage hero config" on public.hero_config
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings
  for select using (true);
drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Admins manage site settings" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manage" on public.campaign_slides;
drop policy if exists "Admins manage campaign slides" on public.campaign_slides;
create policy "Admins manage campaign slides" on public.campaign_slides
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Authenticated users can update hero settings" on public.hero_settings;
drop policy if exists "Admins manage hero settings" on public.hero_settings;
create policy "Admins manage hero settings" on public.hero_settings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin settings writable by authenticated" on public.admin_settings;
drop policy if exists "Admins manage admin settings" on public.admin_settings;
create policy "Admins manage admin settings" on public.admin_settings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Authenticated users can manage featured posts" on public.featured_posts;
drop policy if exists "Admins manage featured posts" on public.featured_posts;
create policy "Admins manage featured posts" on public.featured_posts
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin can manage editor picks" on public.editor_picks;
drop policy if exists "Admins manage editor picks" on public.editor_picks;
create policy "Admins manage editor picks" on public.editor_picks
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── 5. Contracts: no public reads; token signing goes through functions ────
drop policy if exists "Public token access for signing" on public.contracts;

-- Parties keep their update rights, but cannot move a contract to someone else.
drop policy if exists "Parties can update their contracts" on public.contracts;
create policy "Parties can update their contracts" on public.contracts
  for update
  using ((auth.uid() = initiator_id) or (auth.uid() = counterparty_id))
  with check ((auth.uid() = initiator_id) or (auth.uid() = counterparty_id));

-- Returns the contract (without its token) plus its artworks, if the caller
-- holds the signing token or is the signed-in counterparty. Drafts stay hidden.
create or replace function public.get_contract_for_signing(p_contract_id uuid, p_token text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.contracts;
begin
  select * into c from public.contracts where id = p_contract_id;
  if not found or c.status = 'draft' then
    return null;
  end if;
  if not (
    (p_token is not null and c.counterparty_token is not null and c.counterparty_token = p_token)
    or (auth.uid() is not null and c.counterparty_id = auth.uid())
  ) then
    return null;
  end if;

  return (to_jsonb(c) - 'counterparty_token') || jsonb_build_object(
    'artworks',
    coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'medium', a.medium, 'price', a.price))
      from public.contract_artworks ca
      join public.artworks a on a.id = ca.artwork_id
      where ca.contract_id = c.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Records the counterparty's signature. If the initiator has already signed,
-- the contract becomes "signed" and provenance entries are written for its
-- artworks (the external signer could never write those directly).
create or replace function public.sign_contract_as_counterparty(
  p_contract_id uuid,
  p_token text,
  p_signature text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  c public.contracts;
  now_ts timestamptz := now();
  sig text := nullif(trim(p_signature), '');
begin
  if sig is null or length(sig) > 200 then
    raise exception 'A signature name is required' using errcode = '22023';
  end if;

  select * into c from public.contracts where id = p_contract_id for update;
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

  update public.contracts set
    counterparty_signed_at = now_ts,
    counterparty_signature = sig,
    status      = case when c.initiator_signed_at is not null then 'signed' else 'partially_signed' end,
    executed_at = case when c.initiator_signed_at is not null then now_ts else executed_at end
  where id = c.id
  returning * into c;

  if c.status = 'signed' then
    insert into public.provenance_entries (artwork_id, event_type, date, notes)
    select ca.artwork_id,
           case when c.contract_type = 'exhibition' then 'exhibited' else 'transferred' end,
           now_ts::date,
           'Part of signed contract: ' || c.title || ' (' || coalesce(c.reference_number, left(c.id::text, 8)) || ')'
    from public.contract_artworks ca
    where ca.contract_id = c.id;
  end if;

  return public.get_contract_for_signing(c.id, p_token);
end;
$$;

revoke all on function public.get_contract_for_signing(uuid, text) from public;
revoke all on function public.sign_contract_as_counterparty(uuid, text, text) from public;
grant execute on function public.get_contract_for_signing(uuid, text) to anon, authenticated;
grant execute on function public.sign_contract_as_counterparty(uuid, text, text) to anon, authenticated;

-- ─── 6. Messages: only participants, only as themselves ─────────────────────
drop policy if exists "Anyone can send messages" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages" on public.messages
  for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

-- ─── 7. Follows / wishlists: only your own rows ─────────────────────────────
drop policy if exists "follows_new_insert" on public.follows;
create policy "follows_new_insert" on public.follows
  for insert with check (auth.uid() = viewer_id);
drop policy if exists "follows_new_delete" on public.follows;
create policy "follows_new_delete" on public.follows
  for delete using (auth.uid() = viewer_id);

drop policy if exists "wishlists_insert" on public.wishlists;
create policy "wishlists_insert" on public.wishlists
  for insert with check (auth.uid() = viewer_id);
drop policy if exists "wishlists_delete" on public.wishlists;
create policy "wishlists_delete" on public.wishlists
  for delete using (auth.uid() = viewer_id);
drop policy if exists "wishlists_select" on public.wishlists;
create policy "wishlists_select" on public.wishlists
  for select using (auth.uid() = viewer_id);

commit;
