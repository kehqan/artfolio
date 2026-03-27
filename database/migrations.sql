-- Run this in your Supabase SQL Editor

-- Collaborations table (NEW - required for the Collaborations feature)
CREATE TABLE IF NOT EXISTS collaborations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'Co-creation',
  partner_name TEXT,
  partner_email TEXT,
  deadline DATE,
  status TEXT DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own collaborations" ON collaborations
  FOR ALL USING (auth.uid() = user_id);

-- Allow all authenticated users to view collaborations (for discovery)
CREATE POLICY "Users can view all collaborations" ON collaborations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Make sure exhibitions table exists
CREATE TABLE IF NOT EXISTS exhibitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  venue TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'Planning',
  is_public BOOLEAN DEFAULT true,
  cover_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE exhibitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own exhibitions" ON exhibitions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public exhibitions visible to all" ON exhibitions
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

-- Exhibition artworks junction
CREATE TABLE IF NOT EXISTS exhibition_artworks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exhibition_id UUID REFERENCES exhibitions(id) ON DELETE CASCADE,
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  UNIQUE(exhibition_id, artwork_id)
);

ALTER TABLE exhibition_artworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exhibition artworks accessible to auth users" ON exhibition_artworks
  FOR ALL USING (auth.role() = 'authenticated');

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,
  buyer_name TEXT,
  buyer_email TEXT,
  sale_price NUMERIC NOT NULL,
  commission_percentage NUMERIC DEFAULT 0,
  sale_date DATE,
  payment_method TEXT DEFAULT 'Bank Transfer',
  status TEXT DEFAULT 'Completed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sales" ON sales
  FOR ALL USING (auth.uid() = user_id);

-- Follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows visible to authenticated users" ON follows
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage own follows" ON follows
  FOR ALL USING (auth.uid() = follower_id);
