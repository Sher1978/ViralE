-- Migration: Add DNA caching columns to public.profiles table
-- Created At: 2026-05-19

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS carousel_dna_cache JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS carousel_dna_cache_updated_at TIMESTAMPTZ DEFAULT NULL;

-- Add descriptive comments for schema documentation
COMMENT ON COLUMN public.profiles.carousel_dna_cache IS 'Cached distilled DNA profile for IG carousel generation (7-day TTL)';
COMMENT ON COLUMN public.profiles.carousel_dna_cache_updated_at IS 'Timestamp of last DNA cache update';
