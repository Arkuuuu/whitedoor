-- White Door MVP Database Schema
-- Run this in your Supabase SQL Editor

CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  event_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  review_text TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  times_shown INTEGER DEFAULT 0,
  times_copied INTEGER DEFAULT 0,
  times_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  downloads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('viewed', 'copied', 'used')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for visitors
CREATE POLICY "Public can view active events" ON events
  FOR SELECT USING (status = 'active');

CREATE POLICY "Public can view active reviews" ON reviews
  FOR SELECT USING (status = 'active');

CREATE POLICY "Public can view images" ON images
  FOR SELECT USING (true);

CREATE POLICY "Public can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (true);

-- Admin full access (authenticated users)
CREATE POLICY "Admins can do everything on events" ON events
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can do everything on reviews" ON reviews
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can do everything on images" ON images
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can view activity logs" ON activity_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow public to update download/copy/used counts
CREATE POLICY "Public can update review counts" ON reviews
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public can update image downloads" ON images
  FOR UPDATE USING (true) WITH CHECK (true);
