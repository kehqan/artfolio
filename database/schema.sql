-- Artomango database schema (public schema), exported from the live Supabase
-- project on 2026-11-24, after 20261123_phase0_security.sql and
-- 20261123_phase0b_security_followups.sql were applied.
--
-- This is a reference snapshot: it describes what exists, so a new
-- environment can be built from it. Changes still go in
-- database/migrations/ (newer migrations apply on top of this file).
-- Storage buckets/policies and the auth.users trigger are listed at the end.
--
-- Legacy tables kept from an earlier version and not used by the app:
-- artists, venues, venue_artworks, viewer_profiles, follows, wishlists,
-- discovery_requests, discovery_offers, hero_settings, featured_posts,
-- admin_settings, posts. The app uses profiles (people), followers (follows)
-- and scene_posts (feed).

create sequence if not exists public.sales_sale_number_seq;

-- ─── Tables ─────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid not null,
  email text,
  full_name text,
  username text,
  role text default 'artist'::text,
  bio text,
  website text,
  location text,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  location_name text,
  lat double precision,
  lng double precision,
  mediums text[],
  style_tags text[],
  years_active text,
  instagram text,
  venue_type text,
  venue_name text,
  art_styles_sought text[],
  onboarding_done boolean default false,
  behance text,
  linkedin text,
  referred_by uuid,
  focus_mode_default boolean default true,
  constraint profiles_username_key UNIQUE (username),
  constraint profiles_pkey PRIMARY KEY (id),
  constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint profiles_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES auth.users(id)
);

create table if not exists public.artists (
  id uuid default gen_random_uuid() not null,
  name text not null,
  username text not null,
  city text not null,
  country text default 'Iran'::text not null,
  bio text,
  medium text,
  style_tags text[],
  avatar_url text,
  cover_image_url text,
  website text,
  instagram text,
  contact_email text,
  created_at timestamp with time zone default now() not null,
  constraint artists_username_key UNIQUE (username),
  constraint artists_pkey PRIMARY KEY (id)
);

create table if not exists public.venues (
  id uuid default gen_random_uuid() not null,
  name text not null,
  type text default 'gallery'::text not null,
  city text not null,
  country text default 'Iran'::text not null,
  address text,
  description text,
  website text,
  instagram text,
  contact_email text,
  cover_image_url text,
  logo_url text,
  owner_name text,
  created_at timestamp with time zone default now() not null,
  lat double precision,
  lng double precision,
  constraint venues_pkey PRIMARY KEY (id)
);

create table if not exists public.viewer_profiles (
  id uuid default gen_random_uuid() not null,
  username text not null,
  display_name text not null,
  city text,
  country text,
  bio text,
  avatar_url text,
  website text,
  instagram text,
  created_at timestamp with time zone default now() not null,
  constraint viewer_profiles_username_key UNIQUE (username),
  constraint viewer_profiles_pkey PRIMARY KEY (id)
);

create table if not exists public.collections (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text not null,
  description text,
  cover_image text,
  is_public boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  name text,
  constraint collections_pkey PRIMARY KEY (id),
  constraint collections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create table if not exists public.artworks (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  title text not null,
  description text,
  year integer,
  medium text,
  width_cm numeric,
  height_cm numeric,
  depth_cm numeric,
  price numeric,
  currency text default 'USD'::text,
  status text default 'available'::text,
  location text,
  notes text,
  images text[] default '{}'::text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  type text,
  dimensions text,
  collection_id uuid,
  is_one_of_a_kind boolean default false not null,
  availability_status text default 'available'::text not null,
  venue_location text,
  artist_id uuid,
  sale_method text,
  framed boolean default false,
  editions integer default 1,
  materials_cost numeric,
  time_spent numeric,
  visibility_venues text,
  visibility_online text,
  location_lat double precision,
  location_lng double precision,
  location_name text,
  certificate_id text,
  authentication_status text default 'pending'::text,
  authenticated_by text,
  authentication_date date,
  authentication_notes text,
  art_type text default 'physical'::text,
  file_format text,
  resolution text,
  digital_file_url text,
  edition_total integer,
  edition_number integer,
  edition_code text,
  linked_moodboard_ids uuid[],
  constraint artworks_certificate_id_key UNIQUE (certificate_id),
  constraint artworks_pkey PRIMARY KEY (id),
  constraint artworks_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL,
  constraint artworks_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL,
  constraint artworks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint artworks_authentication_status_check CHECK ((authentication_status = ANY (ARRAY['pending'::text, 'original'::text, 'limited_edition'::text, 'reproduction'::text]))),
  constraint chk_availability CHECK ((availability_status = ANY (ARRAY['available'::text, 'reserved'::text, 'sold'::text])))
);

create table if not exists public.admin_settings (
  id uuid default gen_random_uuid() not null,
  key text not null,
  value jsonb default '{}'::jsonb not null,
  updated_at timestamp with time zone default now(),
  constraint admin_settings_key_key UNIQUE (key),
  constraint admin_settings_pkey PRIMARY KEY (id)
);

create table if not exists public.authentication_log (
  id uuid default gen_random_uuid() not null,
  artwork_id uuid not null,
  action text not null,
  old_status text,
  new_status text,
  performed_by uuid,
  performer_name text,
  notes text,
  created_at timestamp with time zone default now(),
  constraint authentication_log_pkey PRIMARY KEY (id),
  constraint authentication_log_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  constraint authentication_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES auth.users(id)
);

create table if not exists public.tasks (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text not null,
  description text,
  status text default 'pending'::text,
  priority text default 'medium'::text,
  type text default 'personal'::text,
  due_date date,
  progress integer default 0,
  checklist jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint tasks_pkey PRIMARY KEY (id),
  constraint tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
  constraint tasks_progress_check CHECK (((progress >= 0) AND (progress <= 100))),
  constraint tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'done'::text, 'cancelled'::text]))),
  constraint tasks_type_check CHECK ((type = ANY (ARRAY['personal'::text, 'exhibition'::text, 'artwork'::text, 'sale'::text, 'collab'::text, 'event'::text])))
);

create table if not exists public.exhibitions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text not null,
  description text,
  venue text,
  start_date date,
  end_date date,
  cover_image text,
  is_public boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  status text default 'planning'::text,
  location_name text,
  lat double precision,
  lng double precision,
  event_type text default 'exhibition'::text,
  is_online boolean default false,
  online_url text,
  gallery_name text,
  constraint exhibitions_pkey PRIMARY KEY (id),
  constraint exhibitions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create table if not exists public.calendar_events (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text not null,
  description text,
  type text default 'personal'::text,
  start_date date not null,
  end_date date,
  start_time time without time zone,
  end_time time without time zone,
  all_day boolean default true,
  color text default '#FFD400'::text,
  linked_task_id uuid,
  linked_exhibition_id uuid,
  created_at timestamp with time zone default now(),
  location text,
  cover_url text,
  is_public boolean default false not null,
  rsvp_enabled boolean default false not null,
  capacity integer,
  share_slug text,
  source text default 'private'::text not null,
  origin_id uuid,
  scene_post_type text,
  constraint calendar_events_pkey PRIMARY KEY (id),
  constraint calendar_events_linked_exhibition_id_fkey FOREIGN KEY (linked_exhibition_id) REFERENCES exhibitions(id) ON DELETE SET NULL,
  constraint calendar_events_linked_task_id_fkey FOREIGN KEY (linked_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  constraint calendar_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint calendar_events_type_check CHECK ((type = ANY (ARRAY['personal'::text, 'exhibition'::text, 'artwork'::text, 'sale'::text, 'collab'::text, 'meeting'::text, 'deadline'::text])))
);

create table if not exists public.campaign_slides (
  id uuid default gen_random_uuid() not null,
  image_url text not null,
  "order" integer default 0 not null,
  active boolean default true not null,
  created_at timestamp with time zone default now(),
  text_x double precision default 5,
  text_y double precision default 52,
  quote_open_x double precision default 42,
  quote_open_y double precision default 28,
  quote_close_x double precision default 65,
  quote_close_y double precision default 28,
  text_content text default 'Art while you'::text,
  text_color text default '#ffffff'::text,
  text_size integer default 72,
  quote_color text default '#FFD400'::text,
  quote_size integer default 120,
  constraint campaign_slides_pkey PRIMARY KEY (id)
);

create table if not exists public.clients (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  name text not null,
  email text,
  phone text,
  total_spent numeric default 0,
  purchases integer default 0,
  last_purchase date,
  status text default 'active'::text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint clients_pkey PRIMARY KEY (id),
  constraint clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  constraint clients_status_check CHECK ((status = ANY (ARRAY['active'::text, 'vip'::text, 'inactive'::text])))
);

create table if not exists public.collaborations (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text not null,
  description text,
  type text default 'Co-creation'::text,
  partner_name text,
  partner_email text,
  deadline date,
  status text default 'Open'::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  location_name text,
  lat double precision,
  lng double precision,
  constraint collaborations_pkey PRIMARY KEY (id),
  constraint collaborations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create table if not exists public.collection_artworks (
  id uuid default gen_random_uuid() not null,
  collection_id uuid not null,
  artwork_id uuid not null,
  sort_order integer default 0,
  added_at timestamp with time zone default now(),
  constraint collection_artworks_collection_id_artwork_id_key UNIQUE (collection_id, artwork_id),
  constraint collection_artworks_pkey PRIMARY KEY (id),
  constraint collection_artworks_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  constraint collection_artworks_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

create table if not exists public.contracts (
  id uuid default gen_random_uuid() not null,
  contract_type text not null,
  status text default 'draft'::text not null,
  title text not null,
  reference_number text,
  initiator_id uuid not null,
  initiator_role text default 'artist'::text not null,
  initiator_name text not null,
  initiator_email text,
  counterparty_id uuid,
  counterparty_role text default 'venue'::text not null,
  counterparty_name text not null,
  counterparty_email text,
  counterparty_token text,
  pool_request_id uuid,
  venue_name text,
  venue_address text,
  start_date date,
  end_date date,
  description text,
  special_conditions text,
  commission_pct numeric(5,2),
  artwork_insurance boolean default false,
  insurance_value numeric(12,2),
  installation_date date,
  deinstallation_date date,
  opening_event_date date,
  transport_by text,
  unsold_return_by date,
  ip_split text,
  credit_line text,
  revenue_split text,
  deliverables text,
  commission_fee numeric(12,2),
  deposit_pct numeric(5,2),
  deposit_due_date date,
  final_payment_date date,
  artwork_specs text,
  revision_rounds integer default 2,
  delivery_method text,
  agreed_terms text,
  initiator_signed_at timestamp with time zone,
  initiator_signature text,
  counterparty_signed_at timestamp with time zone,
  counterparty_signature text,
  executed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint contracts_counterparty_token_key UNIQUE (counterparty_token),
  constraint contracts_reference_number_key UNIQUE (reference_number),
  constraint contracts_pkey PRIMARY KEY (id),
  constraint contracts_counterparty_id_fkey FOREIGN KEY (counterparty_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  constraint contracts_initiator_id_fkey FOREIGN KEY (initiator_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create table if not exists public.contract_artworks (
  id uuid default gen_random_uuid() not null,
  contract_id uuid not null,
  artwork_id uuid not null,
  notes text,
  created_at timestamp with time zone default now(),
  constraint contract_artworks_contract_id_artwork_id_key UNIQUE (contract_id, artwork_id),
  constraint contract_artworks_pkey PRIMARY KEY (id),
  constraint contract_artworks_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  constraint contract_artworks_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

create table if not exists public.contract_calendar_events (
  id uuid default gen_random_uuid() not null,
  contract_id uuid not null,
  user_id uuid not null,
  event_type text not null,
  title text not null,
  date date not null,
  notes text,
  created_at timestamp with time zone default now(),
  constraint contract_calendar_events_pkey PRIMARY KEY (id),
  constraint contract_calendar_events_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  constraint contract_calendar_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create table if not exists public.conversations (
  id uuid default gen_random_uuid() not null,
  participant_a uuid,
  participant_b uuid,
  context_type text default 'direct'::text,
  context_id text,
  context_title text,
  guest_name text,
  guest_email text,
  last_message_at timestamp with time zone default now(),
  last_message_preview text,
  created_at timestamp with time zone default now(),
  archived_by_a boolean default false,
  archived_by_b boolean default false,
  context_meta jsonb,
  constraint conversations_pkey PRIMARY KEY (id),
  constraint conversations_participant_a_fkey FOREIGN KEY (participant_a) REFERENCES auth.users(id) ON DELETE SET NULL,
  constraint conversations_participant_b_fkey FOREIGN KEY (participant_b) REFERENCES auth.users(id) ON DELETE SET NULL
);

create table if not exists public.messages (
  id uuid default gen_random_uuid() not null,
  conversation_id uuid not null,
  sender_id uuid,
  guest_name text,
  guest_email text,
  body text not null,
  template_key text,
  read_by_a boolean default false,
  read_by_b boolean default false,
  created_at timestamp with time zone default now(),
  constraint messages_pkey PRIMARY KEY (id),
  constraint messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  constraint messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

create table if not exists public.discovery_requests (
  id uuid default gen_random_uuid() not null,
  venue_id uuid not null,
  title text not null,
  description text,
  style_tags text[],
  min_width_cm numeric,
  max_width_cm numeric,
  min_height_cm numeric,
  max_height_cm numeric,
  budget_min numeric,
  budget_max numeric,
  currency text default 'USD'::text not null,
  deadline date,
  status text default 'open'::text not null,
  created_at timestamp with time zone default now() not null,
  constraint discovery_requests_pkey PRIMARY KEY (id),
  constraint discovery_requests_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE
);

create table if not exists public.discovery_offers (
  id uuid default gen_random_uuid() not null,
  artwork_id uuid not null,
  venue_id uuid,
  request_id uuid,
  message text,
  asking_price numeric,
  currency text default 'USD'::text not null,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now() not null,
  constraint discovery_offers_pkey PRIMARY KEY (id),
  constraint discovery_offers_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  constraint discovery_offers_request_id_fkey FOREIGN KEY (request_id) REFERENCES discovery_requests(id) ON DELETE SET NULL,
  constraint discovery_offers_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL
);

create table if not exists public.editor_picks (
  id uuid default gen_random_uuid() not null,
  type text default 'announcement'::text not null,
  tag_label text not null,
  title text not null,
  body text,
  emoji text default '📣'::text,
  bg_color text default '#FFFBEA'::text,
  visual_bg text default 'linear-gradient(135deg, #FFD400, #FF8C00)'::text,
  linked_post_id uuid,
  linked_post_type text,
  poster_initials text,
  poster_name text,
  poster_role text,
  meta_label text,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint editor_picks_pkey PRIMARY KEY (id)
);

create table if not exists public.education_resources (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  type text not null,
  title text not null,
  url text,
  description text,
  created_at timestamp with time zone default now(),
  constraint education_resources_pkey PRIMARY KEY (id),
  constraint education_resources_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create table if not exists public.exhibition_artworks (
  id uuid default gen_random_uuid() not null,
  exhibition_id uuid not null,
  artwork_id uuid not null,
  sort_order integer default 0,
  added_at timestamp with time zone default now(),
  constraint exhibition_artworks_exhibition_id_artwork_id_key UNIQUE (exhibition_id, artwork_id),
  constraint exhibition_artworks_pkey PRIMARY KEY (id),
  constraint exhibition_artworks_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  constraint exhibition_artworks_exhibition_id_fkey FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE
);

create table if not exists public.posts (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  content text,
  images text[] default '{}'::text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint posts_pkey PRIMARY KEY (id),
  constraint posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create table if not exists public.featured_posts (
  id uuid default gen_random_uuid() not null,
  post_id uuid,
  custom_text text,
  custom_author text,
  custom_avatar text,
  is_review boolean default false,
  rating integer default 5,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  constraint featured_posts_pkey PRIMARY KEY (id),
  constraint featured_posts_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
  constraint featured_posts_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

create table if not exists public.followers (
  id uuid default gen_random_uuid() not null,
  follower_id uuid not null,
  following_id uuid not null,
  created_at timestamp with time zone default now(),
  constraint followers_follower_id_following_id_key UNIQUE (follower_id, following_id),
  constraint followers_pkey PRIMARY KEY (id),
  constraint followers_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE,
  constraint followers_following_id_fkey FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE
);

create table if not exists public.follows (
  id uuid default gen_random_uuid() not null,
  viewer_id uuid not null,
  target_type text not null,
  target_id uuid not null,
  created_at timestamp with time zone default now() not null,
  constraint follows_viewer_id_target_type_target_id_key UNIQUE (viewer_id, target_type, target_id),
  constraint follows_pkey PRIMARY KEY (id),
  constraint follows_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES viewer_profiles(id) ON DELETE CASCADE,
  constraint follows_target_type_check CHECK ((target_type = ANY (ARRAY['artist'::text, 'venue'::text])))
);

create table if not exists public.hero_config (
  id uuid default gen_random_uuid() not null,
  headline_line1 text,
  headline_line2 text,
  headline_line3 text,
  subtext text,
  cta_label text,
  cta_href text,
  image_url text,
  image_credit_name text,
  image_credit_artwork text,
  updated_at timestamp with time zone default now(),
  constraint hero_config_pkey PRIMARY KEY (id)
);

create table if not exists public.hero_settings (
  id integer default 1 not null,
  headline text default 'artist venue'::text,
  subheadline text default 'Where local artists meet venues. Showcase work. Fill walls. Build community.'::text,
  cta_primary text default 'Join free'::text,
  cta_secondary text default 'Sign in'::text,
  artwork_url text default ''::text,
  artwork_caption text default ''::text,
  updated_at timestamp with time zone default now(),
  constraint hero_settings_pkey PRIMARY KEY (id)
);

create table if not exists public.moodboards (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  provider text default 'other'::text not null,
  url text not null,
  title text default 'Untitled Board'::text not null,
  description text,
  thumbnail_url text,
  og_image text,
  tags text[] default '{}'::text[] not null,
  is_public boolean default true not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint moodboards_pkey PRIMARY KEY (id),
  constraint moodboards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create table if not exists public.notifications (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  type text default 'system'::text not null,
  title text not null,
  body text,
  read boolean default false,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  constraint notifications_pkey PRIMARY KEY (id),
  constraint notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create table if not exists public.passport_views (
  id uuid default gen_random_uuid() not null,
  artwork_id uuid not null,
  viewer_ip text,
  viewed_at timestamp with time zone default now(),
  constraint passport_views_pkey PRIMARY KEY (id),
  constraint passport_views_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE
);

create table if not exists public.pool_requests (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text not null,
  description text,
  art_styles text[] default '{}'::text[],
  budget_min numeric,
  budget_max numeric,
  currency text default 'USD'::text,
  venue_city text,
  artwork_images text[] default '{}'::text[],
  contact_email text,
  contact_note text,
  deadline date,
  status text default 'open'::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  location_name text,
  lat double precision,
  lng double precision,
  cover_image text,
  location text,
  poster_role text,
  request_type text,
  poster_type text,
  images text[] default '{}'::text[],
  constraint pool_requests_pkey PRIMARY KEY (id),
  constraint pool_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint pool_requests_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text, 'matched'::text])))
);

create table if not exists public.pool_responses (
  id uuid default gen_random_uuid() not null,
  request_id uuid not null,
  user_id uuid not null,
  message text,
  created_at timestamp with time zone default now(),
  constraint pool_responses_request_id_user_id_key UNIQUE (request_id, user_id),
  constraint pool_responses_pkey PRIMARY KEY (id),
  constraint pool_responses_request_id_fkey FOREIGN KEY (request_id) REFERENCES pool_requests(id) ON DELETE CASCADE,
  constraint pool_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create table if not exists public.promotion_content (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  artwork_id uuid,
  title text not null,
  platform text not null,
  content_type text not null,
  status text default 'idea'::text not null,
  caption text,
  publish_date date,
  publish_time time without time zone,
  media_urls text[] default '{}'::text[],
  link text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint promotion_content_pkey PRIMARY KEY (id),
  constraint promotion_content_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE SET NULL,
  constraint promotion_content_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint promotion_content_content_type_check CHECK ((content_type = ANY (ARRAY['post'::text, 'reel'::text, 'story'::text, 'blog'::text, 'email'::text, 'ad'::text, 'other'::text]))),
  constraint promotion_content_platform_check CHECK ((platform = ANY (ARRAY['instagram'::text, 'tiktok'::text, 'website'::text, 'email'::text, 'newsletter'::text, 'other'::text]))),
  constraint promotion_content_status_check CHECK ((status = ANY (ARRAY['idea'::text, 'creating'::text, 'scheduled'::text, 'published'::text])))
);

create table if not exists public.provenance_entries (
  id uuid default gen_random_uuid() not null,
  artwork_id uuid not null,
  event_type text not null,
  owner_name text,
  is_anonymous boolean default false,
  date date,
  location text,
  notes text,
  added_by uuid,
  created_at timestamp with time zone default now(),
  constraint provenance_entries_pkey PRIMARY KEY (id),
  constraint provenance_entries_added_by_fkey FOREIGN KEY (added_by) REFERENCES auth.users(id),
  constraint provenance_entries_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  constraint provenance_entries_event_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'sold'::text, 'transferred'::text, 'exhibited'::text, 'restored'::text, 'appraised'::text, 'donated'::text, 'loaned'::text])))
);

create table if not exists public.public_events (
  id uuid default gen_random_uuid() not null,
  title text not null,
  type text default 'opening'::text not null,
  start_date date not null,
  end_date date,
  start_time time without time zone,
  end_time time without time zone,
  venue text,
  city text,
  description text,
  cover_url text,
  cover_gradient text,
  distance_km numeric,
  closes_at date,
  external_url text,
  source_org text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint public_events_pkey PRIMARY KEY (id)
);

create table if not exists public.sales (
  id uuid default gen_random_uuid() not null,
  artwork_id uuid,
  seller_id uuid,
  buyer_name text,
  buyer_email text,
  sale_price numeric,
  currency text default 'USD'::text,
  commission_percent numeric,
  sale_date date,
  notes text,
  created_at timestamp with time zone default now(),
  status text default 'completed'::text,
  payment_method text,
  invoice_number text,
  buyer_id uuid,
  sale_number integer default nextval('sales_sale_number_seq'::regclass) not null,
  user_id uuid,
  commission_percentage numeric default 0,
  constraint sales_pkey PRIMARY KEY (id),
  constraint sales_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE SET NULL,
  constraint sales_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES clients(id) ON DELETE SET NULL,
  constraint sales_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE,
  constraint sales_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create table if not exists public.scene_posts (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  post_type text not null,
  title text not null,
  description text,
  cover_image text,
  images text[] default '{}'::text[],
  location text,
  is_online boolean default false,
  start_date date,
  end_date date,
  deadline date,
  price_from text,
  commission_scope text,
  num_artists integer,
  submission_link text,
  from_calendar boolean default false,
  calendar_event_id uuid,
  is_public boolean default true,
  status text default 'active'::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint scene_posts_calendar_event_id_unique UNIQUE (calendar_event_id),
  constraint scene_posts_pkey PRIMARY KEY (id),
  constraint scene_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create table if not exists public.site_settings (
  id uuid default gen_random_uuid() not null,
  site_name text,
  site_tagline text,
  footer_text text,
  join_enabled boolean default true,
  maintenance_mode boolean default false,
  og_title text,
  og_description text,
  updated_at timestamp with time zone default now(),
  constraint site_settings_pkey PRIMARY KEY (id)
);

create table if not exists public.store_artworks (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  artwork_id uuid not null,
  sort_order integer default 0,
  featured boolean default false,
  created_at timestamp with time zone default now(),
  constraint store_artworks_user_id_artwork_id_key UNIQUE (user_id, artwork_id),
  constraint store_artworks_pkey PRIMARY KEY (id),
  constraint store_artworks_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  constraint store_artworks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create table if not exists public.store_settings (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  store_name text,
  tagline text,
  accent_color text default '#FFD400'::text,
  banner_url text,
  show_bio boolean default true,
  show_collabs boolean default true,
  show_events boolean default true,
  show_location boolean default true,
  is_active boolean default false,
  layout text default 'grid'::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint store_settings_user_id_key UNIQUE (user_id),
  constraint store_settings_pkey PRIMARY KEY (id),
  constraint store_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create table if not exists public.venue_artworks (
  id uuid default gen_random_uuid() not null,
  venue_id uuid not null,
  artwork_id uuid not null,
  displayed_since date,
  notes text,
  created_at timestamp with time zone default now() not null,
  constraint venue_artworks_venue_id_artwork_id_key UNIQUE (venue_id, artwork_id),
  constraint venue_artworks_pkey PRIMARY KEY (id),
  constraint venue_artworks_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  constraint venue_artworks_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE
);

create table if not exists public.wishlists (
  id uuid default gen_random_uuid() not null,
  viewer_id uuid not null,
  artwork_id uuid not null,
  created_at timestamp with time zone default now() not null,
  constraint wishlists_viewer_id_artwork_id_key UNIQUE (viewer_id, artwork_id),
  constraint wishlists_pkey PRIMARY KEY (id),
  constraint wishlists_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  constraint wishlists_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES viewer_profiles(id) ON DELETE CASCADE
);

-- Row level security is on for every table.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ─── Indexes (besides primary keys and unique constraints) ──────────────────

CREATE INDEX IF NOT EXISTS artworks_art_type_idx ON public.artworks USING btree (art_type);
CREATE INDEX IF NOT EXISTS cal_events_user_idx ON public.contract_calendar_events USING btree (user_id, date);
CREATE INDEX IF NOT EXISTS calendar_events_origin_id_idx ON public.calendar_events USING btree (origin_id) WHERE (origin_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS calendar_events_share_slug_idx ON public.calendar_events USING btree (share_slug) WHERE (share_slug IS NOT NULL);
CREATE INDEX IF NOT EXISTS contract_artworks_artwork_idx ON public.contract_artworks USING btree (artwork_id);
CREATE INDEX IF NOT EXISTS contract_artworks_contract_idx ON public.contract_artworks USING btree (contract_id);
CREATE INDEX IF NOT EXISTS contracts_counterparty_idx ON public.contracts USING btree (counterparty_id);
CREATE INDEX IF NOT EXISTS contracts_initiator_idx ON public.contracts USING btree (initiator_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts USING btree (status);
CREATE INDEX IF NOT EXISTS contracts_token_idx ON public.contracts USING btree (counterparty_token);
CREATE INDEX IF NOT EXISTS contracts_type_idx ON public.contracts USING btree (contract_type);
CREATE INDEX IF NOT EXISTS idx_artworks_geo ON public.artworks USING btree (location_lat, location_lng) WHERE (location_lat IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_artworks_status ON public.artworks USING btree (status);
CREATE INDEX IF NOT EXISTS idx_artworks_user_id ON public.artworks USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_log_artwork ON public.authentication_log USING btree (artwork_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events USING btree (user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_collabs_geo ON public.collaborations USING btree (lat, lng) WHERE (lat IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_collection_artworks_artwork ON public.collection_artworks USING btree (artwork_id);
CREATE INDEX IF NOT EXISTS idx_collection_artworks_collection ON public.collection_artworks USING btree (collection_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON public.conversations USING btree (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_a ON public.conversations USING btree (participant_a);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_b ON public.conversations USING btree (participant_b);
CREATE INDEX IF NOT EXISTS idx_exhibition_artworks_artwork ON public.exhibition_artworks USING btree (artwork_id);
CREATE INDEX IF NOT EXISTS idx_exhibition_artworks_exhibition ON public.exhibition_artworks USING btree (exhibition_id);
CREATE INDEX IF NOT EXISTS idx_exhibitions_geo ON public.exhibitions USING btree (lat, lng) WHERE (lat IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.followers USING btree (follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.followers USING btree (following_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages USING btree (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications USING btree (user_id, read) WHERE (read = false);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_passport_views_artwork ON public.passport_views USING btree (artwork_id);
CREATE INDEX IF NOT EXISTS idx_pool_geo ON public.pool_requests USING btree (lat, lng) WHERE (lat IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles USING btree (username);
CREATE INDEX IF NOT EXISTS idx_promotion_artwork ON public.promotion_content USING btree (artwork_id);
CREATE INDEX IF NOT EXISTS idx_promotion_date ON public.promotion_content USING btree (user_id, publish_date);
CREATE INDEX IF NOT EXISTS idx_promotion_status ON public.promotion_content USING btree (user_id, status);
CREATE INDEX IF NOT EXISTS idx_provenance_artwork ON public.provenance_entries USING btree (artwork_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_store_artworks_user ON public.store_artworks USING btree (user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_store_settings_user ON public.store_settings USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks USING btree (user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_venues_geo ON public.venues USING btree (lat, lng) WHERE (lat IS NOT NULL);
CREATE INDEX IF NOT EXISTS moodboards_created_at_idx ON public.moodboards USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS moodboards_is_public_idx ON public.moodboards USING btree (is_public);
CREATE INDEX IF NOT EXISTS moodboards_provider_idx ON public.moodboards USING btree (provider);
CREATE INDEX IF NOT EXISTS moodboards_user_id_idx ON public.moodboards USING btree (user_id);
CREATE INDEX IF NOT EXISTS public_events_start_date_idx ON public.public_events USING btree (start_date);
CREATE INDEX IF NOT EXISTS public_events_type_idx ON public.public_events USING btree (type);
CREATE INDEX IF NOT EXISTS scene_posts_created_at_idx ON public.scene_posts USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS scene_posts_post_type_idx ON public.scene_posts USING btree (post_type);
CREATE INDEX IF NOT EXISTS scene_posts_public_idx ON public.scene_posts USING btree (is_public, status);
CREATE INDEX IF NOT EXISTS scene_posts_user_id_idx ON public.scene_posts USING btree (user_id);

-- ─── Functions ──────────────────────────────────────────────────────────────
-- Defined in migrations (see database/migrations/): is_admin, guard_profile_role,
-- handle_new_user, get_contract_for_signing, sign_contract_as_counterparty,
-- start_guest_conversation, notify_new_follower. The others:

CREATE OR REPLACE FUNCTION public.generate_certificate_id()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.certificate_id IS NULL THEN
    NEW.certificate_id := 'AM-' ||
      TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
      UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FROM 1 FOR 5));
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_contract_reference()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  max_num  INTEGER;
  next_ref TEXT;
BEGIN
  IF NEW.reference_number IS NULL AND NEW.status <> 'draft' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO max_num
    FROM contracts
    WHERE reference_number LIKE 'AM-CON-%';
    next_ref := 'AM-CON-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(max_num::TEXT, 3, '0');
    NEW.reference_number := next_ref;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_sale_insert()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE
  v_artwork record;
BEGIN
  SELECT * INTO v_artwork FROM artworks WHERE id = NEW.artwork_id;
  -- If one-of-a-kind, mark artwork as sold
  IF v_artwork.is_one_of_a_kind THEN
    UPDATE artworks SET availability_status = 'sold' WHERE id = NEW.artwork_id;
  END IF;
  -- Auto-upsert buyer into clients if buyer_name provided
  IF NEW.buyer_name IS NOT NULL AND NEW.buyer_name != '' THEN
    INSERT INTO clients (user_id, name, email, status, notes, total_spent, purchases, last_purchase)
    VALUES (
      NEW.user_id, NEW.buyer_name, COALESCE(NEW.buyer_email, ''), 'active',
      'Auto-added from sale of: ' || COALESCE(v_artwork.title, 'an artwork'),
      COALESCE(NEW.sale_price, 0), 1, COALESCE(NEW.sale_date, CURRENT_DATE)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_sale()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  art_title TEXT;
BEGIN
  SELECT title INTO art_title FROM artworks WHERE id = NEW.artwork_id;
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    NEW.user_id, 'sale', 'Artwork sold!',
    COALESCE(art_title, 'An artwork') || ' sold for $' || NEW.sale_price,
    jsonb_build_object('sale_id', NEW.id, 'artwork_id', NEW.artwork_id, 'amount', NEW.sale_price)
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_pool_response()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  req_title TEXT;
  req_owner UUID;
BEGIN
  SELECT title, user_id INTO req_title, req_owner FROM pool_requests WHERE id = NEW.request_id;
  IF req_owner IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      req_owner, 'collab', 'New interest in your request',
      'Someone responded to "' || COALESCE(req_title, 'your request') || '"',
      jsonb_build_object('request_id', NEW.request_id, 'responder_id', NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- sync_calendar_event_to_scene: replaced in 20261124_phase1_contracts_storage.sql
-- (the version live at export time referenced columns calendar_events doesn't have).

CREATE OR REPLACE FUNCTION public.sync_collection_name_title()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.name IS NOT NULL AND (NEW.title IS NULL OR NEW.title = '') THEN
    NEW.title := NEW.name;
  END IF;
  IF NEW.title IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN
    NEW.name := NEW.title;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_sales_fields()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.seller_id IS NULL THEN
    NEW.seller_id := NEW.user_id;
  END IF;
  IF NEW.seller_id IS NOT NULL AND NEW.user_id IS NULL THEN
    NEW.user_id := NEW.seller_id;
  END IF;
  IF NEW.commission_percentage IS NOT NULL AND NEW.commission_percent IS NULL THEN
    NEW.commission_percent := NEW.commission_percentage;
  ELSIF NEW.commission_percent IS NOT NULL AND NEW.commission_percentage IS NULL THEN
    NEW.commission_percentage := NEW.commission_percent;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_contracts_updated_at()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.update_moodboards_updated_at()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.update_ui_strings_timestamp()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ begin new.updated_at = now(); return new; end; $function$;

-- ─── Triggers ───────────────────────────────────────────────────────────────

CREATE TRIGGER trg_certificate_id BEFORE INSERT ON public.artworks FOR EACH ROW EXECUTE FUNCTION generate_certificate_id();
CREATE TRIGGER trg_sync_calendar_to_scene AFTER INSERT OR UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION sync_calendar_event_to_scene();
CREATE TRIGGER sync_collection_name_title_trigger BEFORE INSERT OR UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION sync_collection_name_title();
CREATE TRIGGER contracts_reference_number BEFORE INSERT OR UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION generate_contract_reference();
CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION update_contracts_updated_at();
CREATE TRIGGER on_new_follow AFTER INSERT ON public.followers FOR EACH ROW EXECUTE FUNCTION notify_new_follower();
CREATE TRIGGER moodboards_updated_at BEFORE UPDATE ON public.moodboards FOR EACH ROW EXECUTE FUNCTION update_moodboards_updated_at();
CREATE TRIGGER on_pool_response AFTER INSERT ON public.pool_responses FOR EACH ROW EXECUTE FUNCTION notify_pool_response();
CREATE TRIGGER profiles_guard_role BEFORE INSERT OR UPDATE OF role ON public.profiles FOR EACH ROW EXECUTE FUNCTION guard_profile_role();
CREATE TRIGGER on_new_sale AFTER INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION notify_new_sale();
CREATE TRIGGER on_sale_insert AFTER INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION handle_sale_insert();
CREATE TRIGGER sync_sales_fields_trigger BEFORE INSERT OR UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION sync_sales_fields();
-- On auth.users: on_auth_user_created AFTER INSERT → handle_new_user()

-- ─── Row level security policies ────────────────────────────────────────────

create policy "Admin settings readable by authenticated" on public.admin_settings for select using ((auth.uid() IS NOT NULL));
create policy "Admins manage admin settings" on public.admin_settings for all using (is_admin()) with check (is_admin());
create policy "Admins manage artists" on public.artists for all using (is_admin()) with check (is_admin());
create policy artists_select on public.artists for select using (true);
create policy "Admins can delete any artwork" on public.artworks for delete using (is_admin());
create policy "Admins can update any artwork" on public.artworks for update using (is_admin()) with check (is_admin());
create policy artworks_delete on public.artworks for delete using ((auth.uid() = user_id));
create policy artworks_insert on public.artworks for insert with check ((auth.uid() = user_id));
create policy artworks_select on public.artworks for select using (true);
create policy artworks_update on public.artworks for update using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "Auth log public read" on public.authentication_log for select using (true);
create policy "Auth log viewable by artwork owner" on public.authentication_log for select using ((EXISTS ( SELECT 1 FROM artworks WHERE ((artworks.id = authentication_log.artwork_id) AND (artworks.user_id = auth.uid())))));
create policy "Owner or admin writes auth log" on public.authentication_log for insert with check (((performed_by = auth.uid()) AND (is_admin() OR (EXISTS ( SELECT 1 FROM artworks a WHERE ((a.id = authentication_log.artwork_id) AND (a.user_id = auth.uid())))))));
create policy "Anyone can read shared public events" on public.calendar_events for select using (((is_public = true) AND (share_slug IS NOT NULL)));
create policy "Owner can manage their calendar events" on public.calendar_events for all using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "Users manage own events" on public.calendar_events for all using ((auth.uid() = user_id));
create policy "Admins manage campaign slides" on public.campaign_slides for all using (is_admin()) with check (is_admin());
create policy "public read" on public.campaign_slides for select using (true);
create policy "Users can manage own clients" on public.clients for all using ((auth.uid() = user_id));
create policy collaborations_delete on public.collaborations for delete using ((auth.uid() = user_id));
create policy collaborations_insert on public.collaborations for insert with check ((auth.uid() = user_id));
create policy collaborations_select on public.collaborations for select using ((auth.role() = 'authenticated'::text));
create policy collaborations_update on public.collaborations for update using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "Public collection artworks are readable" on public.collection_artworks for select using ((EXISTS ( SELECT 1 FROM collections WHERE ((collections.id = collection_artworks.collection_id) AND (collections.is_public = true)))));
create policy "Users can manage own collection artworks" on public.collection_artworks for all using ((EXISTS ( SELECT 1 FROM collections WHERE ((collections.id = collection_artworks.collection_id) AND (collections.user_id = auth.uid())))));
create policy collections_delete on public.collections for delete using ((auth.uid() = user_id));
create policy collections_insert on public.collections for insert with check ((auth.uid() = user_id));
create policy collections_select on public.collections for select using (((auth.uid() = user_id) OR (is_public = true)));
create policy collections_update on public.collections for update using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "Initiator manages contract artworks" on public.contract_artworks for all using ((EXISTS ( SELECT 1 FROM contracts c WHERE ((c.id = contract_artworks.contract_id) AND (c.initiator_id = auth.uid())))));
create policy "Parties see contract artworks" on public.contract_artworks for select using ((EXISTS ( SELECT 1 FROM contracts c WHERE ((c.id = contract_artworks.contract_id) AND ((c.initiator_id = auth.uid()) OR (c.counterparty_id = auth.uid()))))));
create policy "Users see own calendar events" on public.contract_calendar_events for all using ((auth.uid() = user_id));
create policy "Initiator can create contracts" on public.contracts for insert with check ((auth.uid() = initiator_id));
create policy "Initiator can delete draft contracts" on public.contracts for delete using (((auth.uid() = initiator_id) AND (status = 'draft'::text)));
create policy "Parties can see their contracts" on public.contracts for select using (((auth.uid() = initiator_id) OR (auth.uid() = counterparty_id)));
create policy "Parties can update their contracts" on public.contracts for update using (((auth.uid() = initiator_id) OR (auth.uid() = counterparty_id))) with check (((auth.uid() = initiator_id) OR (auth.uid() = counterparty_id)));
create policy "Authenticated users can create conversations" on public.conversations for insert with check (((auth.uid() = participant_a) OR (auth.uid() = participant_b)));
create policy "Participants can update conversations" on public.conversations for update using (((auth.uid() = participant_a) OR (auth.uid() = participant_b)));
create policy "Users can read their conversations" on public.conversations for select using (((auth.uid() = participant_a) OR (auth.uid() = participant_b)));
create policy discovery_offers_insert on public.discovery_offers for insert with check ((auth.role() = 'authenticated'::text));
create policy discovery_offers_select on public.discovery_offers for select using (true);
create policy discovery_requests_select on public.discovery_requests for select using (true);
create policy "Admins manage editor picks" on public.editor_picks for all using (is_admin()) with check (is_admin());
create policy "Public can view active editor picks" on public.editor_picks for select using ((is_active = true));
create policy "Users manage own resources" on public.education_resources for all using ((auth.uid() = user_id));
create policy "Public exhibition artworks readable" on public.exhibition_artworks for select using ((EXISTS ( SELECT 1 FROM exhibitions WHERE ((exhibitions.id = exhibition_artworks.exhibition_id) AND (exhibitions.is_public = true)))));
create policy "Users can manage own exhibition artworks" on public.exhibition_artworks for all using ((EXISTS ( SELECT 1 FROM exhibitions WHERE ((exhibitions.id = exhibition_artworks.exhibition_id) AND (exhibitions.user_id = auth.uid())))));
create policy "Admins can delete any exhibition" on public.exhibitions for delete using (is_admin());
create policy "Admins can read all exhibitions" on public.exhibitions for select using (is_admin());
create policy "Admins can update any exhibition" on public.exhibitions for update using (is_admin()) with check (is_admin());
create policy exhibitions_delete on public.exhibitions for delete using ((auth.uid() = user_id));
create policy exhibitions_insert on public.exhibitions for insert with check ((auth.uid() = user_id));
create policy exhibitions_select on public.exhibitions for select using (((is_public = true) OR (auth.uid() = user_id)));
create policy exhibitions_update on public.exhibitions for update using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "Admins manage featured posts" on public.featured_posts for all using (is_admin()) with check (is_admin());
create policy "Public can read featured posts" on public.featured_posts for select using (true);
create policy "Followers are publicly readable" on public.followers for select using (true);
create policy "Users can follow" on public.followers for insert with check ((auth.uid() = follower_id));
create policy "Users can unfollow" on public.followers for delete using ((auth.uid() = follower_id));
create policy follows_new_delete on public.follows for delete using ((auth.uid() = viewer_id));
create policy follows_new_insert on public.follows for insert with check ((auth.uid() = viewer_id));
create policy follows_new_select on public.follows for select using (true);
create policy "Admins manage hero config" on public.hero_config for all using (is_admin()) with check (is_admin());
create policy "Public can read hero config" on public.hero_config for select using (true);
create policy "Admins manage hero settings" on public.hero_settings for all using (is_admin()) with check (is_admin());
create policy "Public can read hero settings" on public.hero_settings for select using (true);
create policy "Participants can read messages" on public.messages for select using ((EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = messages.conversation_id) AND ((c.participant_a = auth.uid()) OR (c.participant_b = auth.uid()))))));
create policy "Participants can send messages" on public.messages for insert with check (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = messages.conversation_id) AND ((c.participant_a = auth.uid()) OR (c.participant_b = auth.uid())))))));
create policy "Participants can update messages" on public.messages for update using ((EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = messages.conversation_id) AND ((c.participant_a = auth.uid()) OR (c.participant_b = auth.uid()))))));
create policy "Public moodboards visible to all" on public.moodboards for select using (((is_public = true) OR (auth.uid() = user_id)));
create policy "Users manage own moodboards" on public.moodboards for all using ((auth.uid() = user_id));
create policy "Authenticated insert notifications" on public.notifications for insert with check ((auth.uid() = user_id));
create policy "Notify conversation partner" on public.notifications for insert with check (((type = 'message'::text) AND (EXISTS ( SELECT 1 FROM conversations c WHERE (((c.participant_a = auth.uid()) AND (c.participant_b = notifications.user_id)) OR ((c.participant_b = auth.uid()) AND (c.participant_a = notifications.user_id)))))));
create policy "Users delete own notifications" on public.notifications for delete using ((auth.uid() = user_id));
create policy "Users read own notifications" on public.notifications for select using ((auth.uid() = user_id));
create policy "Users update own notifications" on public.notifications for update using ((auth.uid() = user_id));
create policy "Anyone can insert passport views" on public.passport_views for insert with check (true);
create policy "Owner can view passport analytics" on public.passport_views for select using ((EXISTS ( SELECT 1 FROM artworks WHERE ((artworks.id = passport_views.artwork_id) AND (artworks.user_id = auth.uid())))));
create policy "Anyone can view open requests" on public.pool_requests for select using (true);
create policy "Users manage own requests" on public.pool_requests for all using ((auth.uid() = user_id));
create policy pool_requests_delete on public.pool_requests for delete using ((auth.uid() = user_id));
create policy pool_requests_insert on public.pool_requests for insert with check ((auth.uid() = user_id));
create policy pool_requests_select on public.pool_requests for select using (true);
create policy pool_requests_update on public.pool_requests for update using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy pool_responses_delete on public.pool_responses for delete using ((auth.uid() = user_id));
create policy pool_responses_insert on public.pool_responses for insert with check ((auth.uid() = user_id));
create policy pool_responses_select on public.pool_responses for select using ((auth.role() = 'authenticated'::text));
create policy posts_delete on public.posts for delete using ((auth.uid() = user_id));
create policy posts_insert on public.posts for insert with check ((auth.uid() = user_id));
create policy posts_select on public.posts for select using (true);
create policy posts_update on public.posts for update using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "Admins can delete profiles" on public.profiles for delete using (is_admin());
create policy "Admins can update any profile" on public.profiles for update using (is_admin()) with check (is_admin());
create policy profiles_insert on public.profiles for insert with check ((auth.uid() = id));
create policy profiles_select on public.profiles for select using (true);
create policy profiles_update on public.profiles for update using ((auth.uid() = id)) with check ((auth.uid() = id));
create policy "Users manage own promotion content" on public.promotion_content for all using ((auth.uid() = user_id));
create policy "Admins manage provenance" on public.provenance_entries for all using (is_admin()) with check (is_admin());
create policy "Artists manage own provenance" on public.provenance_entries for all using ((EXISTS ( SELECT 1 FROM artworks WHERE ((artworks.id = provenance_entries.artwork_id) AND (artworks.user_id = auth.uid())))));
create policy "Public can view provenance" on public.provenance_entries for select using (true);
create policy "Anyone can read public events" on public.public_events for select using (true);
create policy "Only service role writes public events" on public.public_events for all using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy sales_all on public.sales for all using (((auth.uid() = user_id) OR (auth.uid() = seller_id))) with check (((auth.uid() = user_id) OR (auth.uid() = seller_id)));
create policy scene_posts_delete on public.scene_posts for delete using ((auth.uid() = user_id));
create policy scene_posts_insert on public.scene_posts for insert with check ((auth.uid() = user_id));
create policy scene_posts_select on public.scene_posts for select using ((((is_public = true) AND (status = 'active'::text)) OR (auth.uid() = user_id)));
create policy scene_posts_update on public.scene_posts for update using ((auth.uid() = user_id));
create policy "Admins manage site settings" on public.site_settings for all using (is_admin()) with check (is_admin());
create policy "Public can read site settings" on public.site_settings for select using (true);
create policy "Owner manages store artworks" on public.store_artworks for all using ((auth.uid() = user_id));
create policy "Public reads store artworks" on public.store_artworks for select using (true);
create policy "Owner manages store settings" on public.store_settings for all using ((auth.uid() = user_id));
create policy "Public reads active stores" on public.store_settings for select using ((is_active = true));
create policy "Users manage own tasks" on public.tasks for all using ((auth.uid() = user_id));
create policy venue_artworks_select on public.venue_artworks for select using (true);
create policy "Admins manage venues" on public.venues for all using (is_admin()) with check (is_admin());
create policy venues_select on public.venues for select using (true);
create policy viewer_profiles_insert on public.viewer_profiles for insert with check ((auth.role() = 'authenticated'::text));
create policy viewer_profiles_select on public.viewer_profiles for select using (true);
create policy wishlists_delete on public.wishlists for delete using ((auth.uid() = viewer_id));
create policy wishlists_insert on public.wishlists for insert with check ((auth.uid() = viewer_id));
create policy wishlists_select on public.wishlists for select using ((auth.uid() = viewer_id));

-- ─── Storage (at export time; see 20261124_phase1_contracts_storage.sql) ────
-- Public buckets: artworks, artwork-images, post-images, avatars, campaign.
-- Path conventions: artworks / artwork-images / post-images = <user id>/...;
-- avatars = <folder>/<user id>[.ext or /...]; campaign = slide-<time>.<ext> (admin).
