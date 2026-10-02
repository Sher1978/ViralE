-- Add content_language and subtitle_language to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS content_language text DEFAULT 'ru',
ADD COLUMN IF NOT EXISTS subtitle_language text DEFAULT 'ru';

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.content_language IS 'Language used for AI generation of ideas, scripts, and descriptions.';
COMMENT ON COLUMN public.profiles.subtitle_language IS 'Language used for video subtitle generation.';
