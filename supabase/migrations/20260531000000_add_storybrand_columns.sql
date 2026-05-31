-- Migration: Add StoryBrand columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS storybrand_raw_content TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS storybrand_filename TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS storybrand_file_size INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS storybrand_updated_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.profiles.storybrand_raw_content IS 'Raw parsed text of the uploaded StoryBrand document';
COMMENT ON COLUMN public.profiles.storybrand_filename IS 'Original name of the uploaded StoryBrand file';
COMMENT ON COLUMN public.profiles.storybrand_file_size IS 'Size of the uploaded StoryBrand file in bytes';
COMMENT ON COLUMN public.profiles.storybrand_updated_at IS 'Timestamp of the last StoryBrand file upload/update';
