-- Artomango: make the database answer faster (2026-11-26)
-- Paste all of this into the Supabase SQL editor and press Run. Safe to run twice.
-- It changes no data and no permissions: it only adds indexes, and rewrites
-- the security rules so Postgres checks "who is signed in" once per query
-- instead of once per row (same rules, same result, much less work).

-- ─────────────────────────────────────────────────────────────────────
-- 1. Indexes for the searches the app makes most often
-- ─────────────────────────────────────────────────────────────────────

-- An artist's works, newest first (Studio, their public site, Explore counts)
create index if not exists artworks_user_created_idx   on public.artworks (user_id, created_at desc);
-- Explore: available works, newest first
create index if not exists artworks_created_idx         on public.artworks (created_at desc);
-- Explore and Discover filter people by role
create index if not exists profiles_role_idx            on public.profiles (role);
-- A chat's messages in order, and the unread counts in the shell
create index if not exists messages_convo_created_idx   on public.messages (conversation_id, created_at);
create index if not exists messages_unread_a_idx        on public.messages (conversation_id) where read_by_a = false;
create index if not exists messages_unread_b_idx        on public.messages (conversation_id) where read_by_b = false;
-- Home: sales by person
create index if not exists sales_user_idx               on public.sales (user_id);
create index if not exists sales_seller_idx             on public.sales (seller_id);
-- Public sites and Explore: someone's public shows, by date
create index if not exists exhibitions_user_idx         on public.exhibitions (user_id);
create index if not exists exhibitions_public_start_idx on public.exhibitions (start_date) where is_public = true;
-- Walls looking for art (Scene, "Where can my work go?", venue sites)
create index if not exists pool_requests_user_idx       on public.pool_requests (user_id);
create index if not exists pool_requests_status_idx     on public.pool_requests (status, created_at desc);
-- Learn
create index if not exists education_created_idx        on public.education_resources (created_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- 2. Every link between tables gets an index (Supabase's advisor listed 37
--    without one). Deleting or joining no longer scans a whole table.
-- ─────────────────────────────────────────────────────────────────────
create index if not exists artwork_private_user_idx          on public.artwork_private (user_id);
create index if not exists artworks_artist_idx               on public.artworks (artist_id);
create index if not exists artworks_collection_idx           on public.artworks (collection_id);
create index if not exists authentication_log_by_idx         on public.authentication_log (performed_by);
create index if not exists calendar_events_exhibition_idx    on public.calendar_events (linked_exhibition_id);
create index if not exists calendar_events_task_idx          on public.calendar_events (linked_task_id);
create index if not exists collaborations_user_idx           on public.collaborations (user_id);
create index if not exists contract_calendar_contract_idx    on public.contract_calendar_events (contract_id);
create index if not exists contract_signatures_signer_idx    on public.contract_signatures (signer_user_id);
create index if not exists deals_contract_idx                on public.deals (contract_id);
create index if not exists deals_conversation_idx            on public.deals (conversation_id);
create index if not exists deals_started_by_idx              on public.deals (started_by);
create index if not exists discovery_offers_artwork_idx      on public.discovery_offers (artwork_id);
create index if not exists discovery_offers_request_idx      on public.discovery_offers (request_id);
create index if not exists discovery_offers_venue_idx        on public.discovery_offers (venue_id);
create index if not exists discovery_requests_venue_idx      on public.discovery_requests (venue_id);
create index if not exists education_resources_user_idx      on public.education_resources (user_id);
create index if not exists featured_posts_post_idx           on public.featured_posts (post_id);
create index if not exists label_scans_person_idx            on public.label_scans (person_id);
create index if not exists messages_sender_idx               on public.messages (sender_id);
create index if not exists pool_responses_user_idx           on public.pool_responses (user_id);
create index if not exists profiles_referred_by_idx          on public.profiles (referred_by);
create index if not exists project_invites_accepted_idx      on public.project_invites (accepted_by);
create index if not exists provenance_added_by_idx           on public.provenance_entries (added_by);
create index if not exists sales_artwork_idx                 on public.sales (artwork_id);
create index if not exists sales_buyer_idx                   on public.sales (buyer_id);
create index if not exists sales_deal_idx                    on public.sales (deal_id);
create index if not exists store_artworks_artwork_idx        on public.store_artworks (artwork_id);
create index if not exists venue_artworks_artwork_idx        on public.venue_artworks (artwork_id);
create index if not exists venue_suggestions_by_idx          on public.venue_suggestions (suggested_by);
create index if not exists wall_labels_created_by_idx        on public.wall_labels (created_by);
create index if not exists wall_labels_project_idx           on public.wall_labels (project_id);
create index if not exists wishlists_artwork_idx             on public.wishlists (artwork_id);

-- ─────────────────────────────────────────────────────────────────────
-- 3. Security rules: ask "who is signed in?" once per query, not per row.
--    87 rules wrote auth.uid(); Postgres then runs it for every row it
--    looks at. Written as (select auth.uid()) it runs once. Same rule,
--    same answer (Supabase's recommended form). Rules already in that
--    form are left alone, so running this twice changes nothing.
-- ─────────────────────────────────────────────────────────────────────
do $$
declare
  p record;
  pat constant text := '(?<!SELECT )auth\.(uid|jwt|role|email)\(\)';
  rep constant text := '(select auth.\1())';
  sql text;
  n int := 0;
begin
  for p in
    select schemaname, tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ pat or coalesce(with_check, '') ~ pat)
  loop
    sql := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if p.qual is not null and p.cmd <> 'INSERT' then
      sql := sql || format(' using (%s)', regexp_replace(p.qual, pat, rep, 'g'));
    end if;
    if p.with_check is not null and p.cmd in ('INSERT', 'UPDATE', 'ALL') then
      sql := sql || format(' with check (%s)', regexp_replace(p.with_check, pat, rep, 'g'));
    end if;
    execute sql;
    n := n + 1;
  end loop;
  raise notice 'Security rules rewritten: %', n;
end $$;

-- Fresh statistics so Postgres starts using the new indexes right away.
analyze;

-- Check (optional): this should say 0.
select count(*) as rules_still_per_row
from pg_policies
where schemaname = 'public'
  and coalesce(qual, '') || coalesce(with_check, '') ~ '(?<!SELECT )auth\.(uid|jwt|role|email)\(\)';
