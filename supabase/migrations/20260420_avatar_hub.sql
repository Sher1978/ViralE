-- Migration: Avatar Hub & Multi-Tier Animation
-- Created: 2026-04-20

-- 1. Create Media Assets table for User Photo Library
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    type TEXT DEFAULT 'photo' CHECK (type IN ('photo', 'video', 'voice')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for media_assets
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for media_assets
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own assets') THEN
        CREATE POLICY "Users can view their own assets" ON public.media_assets FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own assets') THEN
        CREATE POLICY "Users can create their own assets" ON public.media_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own assets') THEN
        CREATE POLICY "Users can delete their own assets" ON public.media_assets FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 3. Update Profiles to allow HeyGen BYOK
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heygen_api_key TEXT;

-- 4. Update Projects to store animation/asset choice
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS avatar_mode TEXT DEFAULT 'stock' CHECK (avatar_mode IN ('stock', 'byok', 'photo'));
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS animation_tier TEXT DEFAULT 'lite' CHECK (animation_tier IN ('lite', 'standard', 'premium'));
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS selected_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ai_look_polish BOOLEAN DEFAULT FALSE;
