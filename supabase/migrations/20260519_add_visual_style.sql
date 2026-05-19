-- Migration: Add visual_style column to public.profiles table
-- Created At: 2026-05-19

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS visual_style TEXT DEFAULT 'startup_valley';

-- Add descriptive comments for schema documentation
COMMENT ON COLUMN public.profiles.visual_style IS 'Preferred theme style prefix key for image generation tasks';
