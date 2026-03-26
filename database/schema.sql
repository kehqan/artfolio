-- ============================================================
-- ARTFOLIO DATABASE SCHEMA
-- Run this in your Supabase SQL Editor (supabase.com > project > SQL Editor)
-- ============================================================

-- ─────────────────── PROFILES TABLE ───────────────────
-- Stores user profile information (linked to Supabase Auth)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  username TEXT UNIQUE,
  role TEXT CHECK (role IN ('artist', 'gallery')) DEFAULT 'artist',
  bio TEXT,
  website TEXT,
  location TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────── ARTWORKS TABLE ───────────────────
-- The core inventory system (Phase 4)
CREATE TABLE public.artworks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  year INTEGER,
  medium TEXT,
  width_cm NUMERIC,
  height_cm NUMERIC,
  depth_cm NUMERIC,
  price NUMERIC,
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK (status IN ('available', 'sold', 'not_for_sale', 'reserved')) DEFAULT 'available',
  location TEXT,
  notes TEXT,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────── COLLECTIONS TABLE ────────────────
-- Grouping artworks (Phase 5)
CREATE TABLE public.collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────── COLLECTION-ARTWORK LINK ───────────────
-- Many-to-many: artworks can be in multiple collections
CREATE TABLE public.collection_artworks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  artwork_id UUID REFERENCES public.artworks(id) ON DELETE CASCADE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collection_id, artwork_id)
);

-- ─────────────────── EXHIBITIONS TABLE ────────────────
-- Exhibition management (later phase)
CREATE TABLE public.exhibitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  venue TEXT,
  start_date DATE,
  end_date DATE,
  cover_image TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────── POSTS TABLE ──────────────────────
-- Social feed (Phase 7)
CREATE TABLE public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────── FOLLOWERS TABLE ──────────────────
-- Follow system (later phase)
CREATE TABLE public.followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- ─────────────────── SALES TABLE ──────────────────────
-- Sales tracking (later phase)
CREATE TABLE public.sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artwork_id UUID REFERENCES public.artworks(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  buyer_name TEXT,
  buyer_email TEXT,
  sale_price NUMERIC,
  currency TEXT DEFAULT 'USD',
  commission_percent NUMERIC,
  sale_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- INDEXES (for faster queries)
-- ============================================================
CREATE INDEX idx_artworks_user_id ON public.artworks(user_id);
CREATE INDEX idx_artworks_status ON public.artworks(status);
CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collection_artworks_collection ON public.collection_artworks(collection_id);
CREATE INDEX idx_collection_artworks_artwork ON public.collection_artworks(artwork_id);
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_followers_follower ON public.followers(follower_id);
CREATE INDEX idx_followers_following ON public.followers(following_id);
CREATE INDEX idx_profiles_username ON public.profiles(username);


-- ============================================================
-- ROW LEVEL SECURITY (RLS) — WHO CAN READ/WRITE WHAT
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- ── PROFILES ──
-- Anyone can read profiles (they're public)
CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can only edit their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── ARTWORKS ──
-- Users can read their own artworks
CREATE POLICY "Users can read own artworks"
  ON public.artworks FOR SELECT
  USING (auth.uid() = user_id);

-- Public artworks are readable by everyone (for portfolios)
CREATE POLICY "Public artworks are readable"
  ON public.artworks FOR SELECT
  USING (true);

-- Users can insert their own artworks
CREATE POLICY "Users can insert own artworks"
  ON public.artworks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own artworks
CREATE POLICY "Users can update own artworks"
  ON public.artworks FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own artworks
CREATE POLICY "Users can delete own artworks"
  ON public.artworks FOR DELETE
  USING (auth.uid() = user_id);

-- ── COLLECTIONS ──
CREATE POLICY "Users can read own collections"
  ON public.collections FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- ── COLLECTION_ARTWORKS ──
CREATE POLICY "Users can manage own collection artworks"
  ON public.collection_artworks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_artworks.collection_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Public collection artworks are readable"
  ON public.collection_artworks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_artworks.collection_id
      AND is_public = true
    )
  );

-- ── EXHIBITIONS ──
CREATE POLICY "Users can manage own exhibitions"
  ON public.exhibitions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Public exhibitions are readable"
  ON public.exhibitions FOR SELECT
  USING (is_public = true);

-- ── POSTS ──
CREATE POLICY "Posts are publicly readable"
  ON public.posts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- ── FOLLOWERS ──
CREATE POLICY "Followers are publicly readable"
  ON public.followers FOR SELECT
  USING (true);

CREATE POLICY "Users can follow"
  ON public.followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.followers FOR DELETE
  USING (auth.uid() = follower_id);

-- ── SALES ──
CREATE POLICY "Users can manage own sales"
  ON public.sales FOR ALL
  USING (auth.uid() = seller_id);


-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'artist'),
    LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)), ' ', '')) || FLOOR(RANDOM() * 10000)::TEXT
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: runs after a new user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- STORAGE BUCKET FOR ARTWORK IMAGES
-- ============================================================
-- Run this separately in SQL Editor after the main schema

-- Create the artworks storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('artworks', 'artworks', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload artwork images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'artworks' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Allow anyone to view artwork images (public portfolio)
CREATE POLICY "Artwork images are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'artworks');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own artwork images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'artworks' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );
