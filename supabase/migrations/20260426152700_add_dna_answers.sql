-- Migration: Add dna_answers to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS dna_answers JSONB DEFAULT '{}'::jsonb;

-- Update RLS if needed (usually profiles are handled)
