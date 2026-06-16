-- ============================================================
-- White Door — Migration v2
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add review_type to reviews
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS review_type TEXT DEFAULT 'TEXT_ONLY'
  CHECK (review_type IN ('TEXT_ONLY', 'SINGLE_IMAGE', 'MULTI_IMAGE'));

-- 2. Add status to images (single-use tracking)
ALTER TABLE images
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available'
  CHECK (status IN ('available', 'reserved', 'used', 'archived'));

-- 3. Review-image mapping table
--    Each image belongs to exactly one review (UNIQUE on image_id)
CREATE TABLE IF NOT EXISTS review_images (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id      UUID REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  image_id       UUID REFERENCES images(id) ON DELETE CASCADE NOT NULL,
  display_order  INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(image_id)
);

CREATE INDEX IF NOT EXISTS idx_review_images_review_id ON review_images(review_id);
CREATE INDEX IF NOT EXISTS idx_review_images_image_id  ON review_images(image_id);
CREATE INDEX IF NOT EXISTS idx_images_status            ON images(status);
CREATE INDEX IF NOT EXISTS idx_reviews_event_status     ON reviews(event_id, status);

-- 4. Extend activity_logs with event_id, session_id, and skipped action
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS event_id   UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS session_id TEXT;

ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_check;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_action_check
  CHECK (action IN ('viewed', 'copied', 'used', 'photo_downloaded', 'skipped'));

-- 5. RLS for review_images (public read, admin write)
ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read review_images" ON review_images;
CREATE POLICY "Public can read review_images" ON review_images
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can manage review_images" ON review_images;
CREATE POLICY "Authenticated can manage review_images" ON review_images
  FOR ALL USING (auth.role() = 'authenticated');
