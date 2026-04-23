-- Migration: Add Anthropic API Key to Profile
-- Created: 2026-04-23

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT;
