-- White Door — Post Review on Google migrations
-- Run this once in your Supabase SQL Editor (Dashboard → SQL Editor)

-- 1. Add Google Review URL to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS google_review_url TEXT;

-- 2. Allow 'reserved' status on reviews (temporarily holds a review while user is on Google)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_status_check;
ALTER TABLE reviews ADD CONSTRAINT reviews_status_check
  CHECK (status IN ('active', 'reserved', 'archived'));

-- 3. Allow 'photo_downloaded' action in activity logs
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_check;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_action_check
  CHECK (action IN ('viewed', 'copied', 'used', 'photo_downloaded'));

-- 4. Review reservations — tracks which reviews are "in use" with a 30-min expiry
CREATE TABLE IF NOT EXISTS review_reservations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id   UUID REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  session_id  TEXT NOT NULL,
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 minutes'
);

ALTER TABLE review_reservations ENABLE ROW LEVEL SECURITY;

-- Public can insert reservations (unauthenticated visitors)
DO $$ BEGIN
  CREATE POLICY "Public can insert reservations" ON review_reservations
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Public can read reservations (needed for expiry cleanup)
DO $$ BEGIN
  CREATE POLICY "Public can read reservations" ON review_reservations
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admins full access
DO $$ BEGIN
  CREATE POLICY "Admins can do everything on reservations" ON review_reservations
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
