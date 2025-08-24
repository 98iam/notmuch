-- Supabase RLS Fix for Photo Upload Issue
-- Run these commands in your Supabase SQL editor to fix the RLS policy error

-- 1. Check if uploaded_photos table exists
SELECT * FROM information_schema.tables WHERE table_name = 'uploaded_photos';

-- 2. Create the uploaded_photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.uploaded_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    content_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE public.uploaded_photos ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for uploaded_photos table
-- Allow anyone to insert (for your current setup)
DROP POLICY IF EXISTS "Allow insert for everyone" ON public.uploaded_photos;
CREATE POLICY "Allow insert for everyone" ON public.uploaded_photos
    FOR INSERT WITH CHECK (true);

-- Allow anyone to read
DROP POLICY IF EXISTS "Allow read for everyone" ON public.uploaded_photos;
CREATE POLICY "Allow read for everyone" ON public.uploaded_photos
    FOR SELECT USING (true);

-- Allow users to update their own records
DROP POLICY IF EXISTS "Allow update for own records" ON public.uploaded_photos;
CREATE POLICY "Allow update for own records" ON public.uploaded_photos
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own records
DROP POLICY IF EXISTS "Allow delete for own records" ON public.uploaded_photos;
CREATE POLICY "Allow delete for own records" ON public.uploaded_photos
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Check if 'photos' bucket exists
SELECT * FROM storage.buckets WHERE id = 'photos';

-- 6. Create 'photos' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('photos', 'photos', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 7. Create storage policies for the photos bucket
-- Allow anyone to upload
DROP POLICY IF EXISTS "Allow upload for everyone" ON storage.objects;
CREATE POLICY "Allow upload for everyone" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'photos');

-- Allow anyone to read
DROP POLICY IF EXISTS "Allow read for everyone" ON storage.objects;
CREATE POLICY "Allow read for everyone" ON storage.objects
    FOR SELECT USING (bucket_id = 'photos');

-- Allow users to update their own files
DROP POLICY IF EXISTS "Allow update for own files" ON storage.objects;
CREATE POLICY "Allow update for own files" ON storage.objects
    FOR UPDATE USING (auth.uid() = owner);

-- Allow users to delete their own files
DROP POLICY IF EXISTS "Allow delete for own files" ON storage.objects;
CREATE POLICY "Allow delete for own files" ON storage.objects
    FOR DELETE USING (auth.uid() = owner);

-- 8. Quick verification queries
SELECT * FROM public.uploaded_photos LIMIT 5;
SELECT * FROM storage.buckets WHERE id = 'photos';
SELECT * FROM storage.objects WHERE bucket_id = 'photos' LIMIT 5;
