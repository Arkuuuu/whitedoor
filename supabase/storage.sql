-- White Door Storage Setup
-- Run this in your Supabase SQL Editor after schema.sql

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-banners', 'event-banners', true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true);

-- Public read policies for storage
CREATE POLICY "Anyone can view event banners" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-banners');

CREATE POLICY "Anyone can view event images" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-images');

-- Admin upload/delete policies
CREATE POLICY "Admins can upload event banners" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-banners' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can delete event banners" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'event-banners' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can upload event images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-images' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can delete event images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'event-images' AND auth.role() = 'authenticated'
  );
