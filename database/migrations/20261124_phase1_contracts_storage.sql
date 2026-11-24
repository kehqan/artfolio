-- Phase 1 (2026-11-24): stronger contract signatures, storage rules, small fixes.
-- Run after the two 20261123 migrations. Safe to re-run.
--
--   1. Contract signatures get a signing record (who, when, IP, browser,
--      whether they signed from an account or a link) and a fingerprint
--      (SHA-256) of the exact terms and artworks they agreed to.
--   2. Terms and artworks are locked once anyone has signed; the counterparty
--      can never edit terms; each side can only sign for itself; signatures
--      can't be removed; status is derived from the signatures.
--   3. When both sides have signed, provenance entries and calendar dates for
--      both parties are written by the database (the app could only write
--      them for the person who signed last, and failed for external signers).
--   4. Storage: campaign images are admin-only; avatars/post images can only
--      be written in your own folder; every bucket accepts images only, up to
--      10 MB.
--   5. Fix: public calendar events failed to save because the "sync to The
--      Scene" trigger used column names calendar_events doesn't have.
--   6. Drop a duplicate index added on 2026-11-23.

begin;

-- ─── 1. Signing record and terms fingerprint ────────────────────────────────
create table if not exists public.contract_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  party text not null check (party in ('initiator', 'counterparty')),
  signer_user_id uuid references auth.users(id) on delete set null,
  signer_name text not null,
  signer_email text,
  signed_via text not null check (signed_via in ('account', 'link')),
  terms_hash text not null,
  ip_address text,
  user_agent text,
  signed_at timestamptz not null default now(),
  unique (contract_id, party)
);

alter table public.contract_signatures enable row level security;

drop policy if exists "Parties read signatures" on public.contract_signatures;
create policy "Parties read signatures" on public.contract_signatures
  for select using (
    public.is_admin() or exists (
      select 1 from public.contracts c
      where c.id = contract_signatures.contract_id
        and (c.initiator_id = auth.uid() or c.counterparty_id = auth.uid())
    )
  );
-- No insert/update/delete policies: rows are written only by the trigger below.

-- The terms are every contract column except identity, status, signature
-- and bookkeeping columns.
create or replace function public.contract_terms_json(c public.contracts)
returns jsonb
language sql
immutable
as $$
  select to_jsonb(c) - array[
    'id', 'status', 'reference_number', 'counterparty_token', 'counterparty_id',
    'initiator_signed_at', 'initiator_signature', 'counterparty_signed_at',
    'counterparty_signature', 'executed_at', 'created_at', 'updated_at'
  ];
$$;

create or replace function public.contract_terms_hash(p_contract_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select encode(sha256(convert_to((
    public.contract_terms_json(c) || jsonb_build_object(
      'artwork_ids',
      coalesce((select jsonb_agg(ca.artwork_id order by ca.artwork_id)
                from public.contract_artworks ca where ca.contract_id = c.id), '[]'::jsonb)
    )
  )::text, 'UTF8')), 'hex')
  from public.contracts c
  where c.id = p_contract_id;
$$;

revoke all on function public.contract_terms_hash(uuid) from public;
grant execute on function public.contract_terms_hash(uuid) to authenticated;

-- ─── 2. Guard contract updates ──────────────────────────────────────────────
create or replace function public.guard_contract_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_app      boolean := coalesce(auth.role(), '') in ('anon', 'authenticated');
  is_init     boolean := auth.uid() is not null and auth.uid() = old.initiator_id;
  is_cp       boolean := auth.uid() is not null and auth.uid() = old.counterparty_id;
  via_link    boolean := current_setting('artomango.signing_contract', true) = old.id::text;
  any_signed  boolean := old.initiator_signed_at is not null or old.counterparty_signed_at is not null;
begin
  if is_app then
    -- Terms
    if public.contract_terms_json(new) is distinct from public.contract_terms_json(old)
       and (not is_init or any_signed) then
      raise exception 'Contract terms are locked once signed, and only the sender can edit them'
        using errcode = '42501';
    end if;
    -- Who the contract is with
    if new.counterparty_id is distinct from old.counterparty_id
       or new.counterparty_token is distinct from old.counterparty_token then
      if not is_init or any_signed then
        raise exception 'Only the sender can change who the contract is with, before signing'
          using errcode = '42501';
      end if;
    end if;
    -- Signatures: each side signs only for itself, and never un-signs.
    if (new.initiator_signed_at, new.initiator_signature)
       is distinct from (old.initiator_signed_at, old.initiator_signature) then
      if not is_init or old.initiator_signed_at is not null or new.initiator_signed_at is null
         or nullif(trim(new.initiator_signature), '') is null then
        raise exception 'Not allowed to change the sender''s signature' using errcode = '42501';
      end if;
      new.initiator_signed_at := now();
    end if;
    if (new.counterparty_signed_at, new.counterparty_signature)
       is distinct from (old.counterparty_signed_at, old.counterparty_signature) then
      if not (is_cp or via_link) or old.counterparty_signed_at is not null
         or new.counterparty_signed_at is null or nullif(trim(new.counterparty_signature), '') is null then
        raise exception 'Not allowed to change the other party''s signature' using errcode = '42501';
      end if;
      new.counterparty_signed_at := now();
    end if;
    if (new.initiator_signed_at is not null or new.counterparty_signed_at is not null)
       and old.status = 'draft' then
      raise exception 'Send the contract before signing it' using errcode = '42501';
    end if;
    if old.status = 'signed' and new.status is distinct from old.status then
      raise exception 'A fully signed contract can''t change status' using errcode = '42501';
    end if;
    if old.status = 'cancelled' and new.status is distinct from old.status then
      raise exception 'A cancelled contract can''t be reopened' using errcode = '42501';
    end if;
  end if;

  -- Status follows the signatures (unless the contract is being cancelled).
  if new.status is distinct from 'cancelled' then
    if new.initiator_signed_at is not null and new.counterparty_signed_at is not null then
      new.status := 'signed';
      new.executed_at := coalesce(new.executed_at, now());
    elsif new.initiator_signed_at is not null or new.counterparty_signed_at is not null then
      new.status := 'partially_signed';
      new.executed_at := null;
    elsif new.status = 'signed' or new.status = 'partially_signed' then
      raise exception 'Status can''t be set to signed without signatures' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists contracts_guard_update on public.contracts;
create trigger contracts_guard_update
  before update on public.contracts
  for each row execute function public.guard_contract_update();

-- Artworks on a contract are part of the terms.
create or replace function public.guard_contract_artworks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid := coalesce(new.contract_id, old.contract_id);
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and exists (
    select 1 from public.contracts c
    where c.id = cid and (c.initiator_signed_at is not null or c.counterparty_signed_at is not null)
  ) then
    raise exception 'Artworks are locked once the contract is signed' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists contract_artworks_guard on public.contract_artworks;
create trigger contract_artworks_guard
  before insert or update or delete on public.contract_artworks
  for each row execute function public.guard_contract_artworks();

-- ─── 3. Record signatures; act on full execution ────────────────────────────
create or replace function public.record_contract_signature()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  headers json := nullif(current_setting('request.headers', true), '')::json;
  v_ip    text := coalesce(headers->>'cf-connecting-ip',
                           nullif(trim(split_part(coalesce(headers->>'x-forwarded-for', ''), ',', 1)), ''),
                           headers->>'x-real-ip');
  v_ua    text := left(headers->>'user-agent', 300);
  v_hash  text := public.contract_terms_hash(new.id);
  v_email text := (select email from auth.users where id = auth.uid());
begin
  if old.initiator_signed_at is null and new.initiator_signed_at is not null then
    insert into public.contract_signatures
      (contract_id, party, signer_user_id, signer_name, signer_email, signed_via, terms_hash, ip_address, user_agent, signed_at)
    values
      (new.id, 'initiator', auth.uid(), new.initiator_signature, coalesce(v_email, new.initiator_email),
       'account', v_hash, v_ip, v_ua, new.initiator_signed_at)
    on conflict (contract_id, party) do nothing;
  end if;

  if old.counterparty_signed_at is null and new.counterparty_signed_at is not null then
    insert into public.contract_signatures
      (contract_id, party, signer_user_id, signer_name, signer_email, signed_via, terms_hash, ip_address, user_agent, signed_at)
    values
      (new.id, 'counterparty', auth.uid(), new.counterparty_signature,
       case when auth.uid() is not null then coalesce(v_email, new.counterparty_email) else new.counterparty_email end,
       case when auth.uid() is not null and auth.uid() = new.counterparty_id then 'account' else 'link' end,
       v_hash, v_ip, v_ua, new.counterparty_signed_at)
    on conflict (contract_id, party) do nothing;
  end if;

  if old.status is distinct from 'signed' and new.status = 'signed' then
    insert into public.provenance_entries (artwork_id, event_type, date, notes)
    select ca.artwork_id,
           case when new.contract_type = 'exhibition' then 'exhibited' else 'transferred' end,
           new.executed_at::date,
           'Part of signed contract: ' || new.title || ' (' || coalesce(new.reference_number, left(new.id::text, 8)) || ')'
    from public.contract_artworks ca
    where ca.contract_id = new.id;

    insert into public.contract_calendar_events (contract_id, user_id, event_type, title, date)
    select new.id, p.uid, d.kind, d.label, d.day
    from (select new.initiator_id as uid union select new.counterparty_id) p
    cross join (values
      ('start',       '🚀 ' || new.title || ' — Starts',        new.start_date),
      ('end',         '🏁 ' || new.title || ' — Ends',          new.end_date),
      ('opening',     '🎉 Opening: ' || new.title,             new.opening_event_date),
      ('deadline',    '🔧 Installation: ' || new.title,        new.installation_date),
      ('deadline',    '📦 Deinstall: ' || new.title,           new.deinstallation_date),
      ('deposit_due', '💰 Deposit Due: ' || new.title,         new.deposit_due_date),
      ('delivery',    '💳 Final Payment: ' || new.title,       new.final_payment_date)
    ) as d(kind, label, day)
    where p.uid is not null and d.day is not null;
  end if;

  return new;
end;
$$;

drop trigger if exists contracts_record_signature on public.contracts;
create trigger contracts_record_signature
  after update on public.contracts
  for each row execute function public.record_contract_signature();

-- External signing now only sets the signature; the triggers do the rest.
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

  perform set_config('artomango.signing_contract', c.id::text, true);
  update public.contracts
     set counterparty_signed_at = now(), counterparty_signature = sig
   where id = c.id;
  perform set_config('artomango.signing_contract', '', true);

  return public.get_contract_for_signing(c.id, p_token);
end;
$$;

-- The signing page also gets the fingerprint and the signing record.
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
    ), '[]'::jsonb),
    'terms_hash', public.contract_terms_hash(c.id),
    'signatures',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'party', s.party, 'signer_name', s.signer_name, 'signed_via', s.signed_via,
        'signed_at', s.signed_at, 'terms_hash', s.terms_hash) order by s.signed_at)
      from public.contract_signatures s
      where s.contract_id = c.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_contract_for_signing(uuid, text) from public;
revoke all on function public.sign_contract_as_counterparty(uuid, text, text) from public;
grant execute on function public.get_contract_for_signing(uuid, text) to anon, authenticated;
grant execute on function public.sign_contract_as_counterparty(uuid, text, text) to anon, authenticated;

-- ─── 4. Storage ─────────────────────────────────────────────────────────────
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
 where id in ('artworks', 'artwork-images', 'post-images', 'avatars', 'campaign');

-- campaign: admin only
drop policy if exists "authenticated upload" on storage.objects;
drop policy if exists "authenticated delete" on storage.objects;
drop policy if exists "campaign admin write" on storage.objects;
create policy "campaign admin write" on storage.objects
  for all to authenticated
  using (bucket_id = 'campaign' and public.is_admin())
  with check (bucket_id = 'campaign' and public.is_admin());

-- avatars: paths are <folder>/<user id>[.ext | /file]
drop policy if exists "avatars authenticated upload" on storage.objects;
drop policy if exists "avatars owner update" on storage.objects;
drop policy if exists "avatars owner insert" on storage.objects;
drop policy if exists "avatars owner modify" on storage.objects;
create policy "avatars owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(split_part(name, '/', 2), '.', 1) = auth.uid()::text
  );
create policy "avatars owner modify" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and split_part(split_part(name, '/', 2), '.', 1) = auth.uid()::text)
  with check (bucket_id = 'avatars' and split_part(split_part(name, '/', 2), '.', 1) = auth.uid()::text);

-- artwork-images and post-images: paths start with the user id
drop policy if exists "artwork-images authenticated upload" on storage.objects;
drop policy if exists "artwork-images owner insert" on storage.objects;
create policy "artwork-images owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'artwork-images' and (string_to_array(name, '/'))[1] = auth.uid()::text);

drop policy if exists "post-images authenticated upload" on storage.objects;
drop policy if exists "post-images owner insert" on storage.objects;
create policy "post-images owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images' and (string_to_array(name, '/'))[1] = auth.uid()::text);

-- ─── 5. Calendar → The Scene sync ───────────────────────────────────────────
create or replace function public.sync_calendar_event_to_scene()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mapped_type text := case when new.type = 'exhibition' then 'exhibition' else 'event' end;
begin
  if new.is_public is not true then
    update public.scene_posts
       set status = 'closed', updated_at = now()
     where calendar_event_id = new.id;
    return new;
  end if;

  update public.scene_posts set
    post_type   = mapped_type,
    title       = new.title,
    description = new.description,
    location    = new.location,
    start_date  = new.start_date,
    end_date    = new.end_date,
    cover_image = coalesce(new.cover_url, cover_image),
    status      = 'active',
    updated_at  = now()
  where calendar_event_id = new.id;

  if not found then
    insert into public.scene_posts (
      user_id, post_type, title, description, location, is_online,
      start_date, end_date, cover_image, from_calendar, calendar_event_id, is_public, status
    ) values (
      new.user_id, mapped_type, new.title, new.description, new.location, false,
      new.start_date, new.end_date, new.cover_url, true, new.id, true, 'active'
    )
    on conflict (calendar_event_id) do nothing;
  end if;

  return new;
end;
$$;

-- ─── Function hardening for the new trigger functions ───────────────────────
revoke execute on function public.guard_contract_update() from public, anon, authenticated;
revoke execute on function public.guard_contract_artworks() from public, anon, authenticated;
revoke execute on function public.record_contract_signature() from public, anon, authenticated;
revoke execute on function public.sync_calendar_event_to_scene() from public, anon, authenticated;

-- ─── 6. Duplicate index ─────────────────────────────────────────────────────
drop index if exists public.followers_unique_pair;

commit;
