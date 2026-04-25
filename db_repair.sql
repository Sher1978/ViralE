-- VIRAL ENGINE DATABASE REPAIR SCRIPT
-- This script adds missing columns to existing tables and ensures correct schema state.

-- 1. Ensure 'projects' table has all required columns
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS input_source TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS final_video_url TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.projects(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS config_json JSONB DEFAULT '{}'::jsonb;

-- 2. Ensure 'project_versions' table has all required columns
ALTER TABLE public.project_versions ADD COLUMN IF NOT EXISTS storyboard_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.project_versions ADD COLUMN IF NOT EXISTS version_label TEXT;
ALTER TABLE public.project_versions ADD COLUMN IF NOT EXISTS preview_url TEXT;

-- Add missing updated_at columns
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.project_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.studio_manifests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Ensure 'profiles' table has all required columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS groq_api_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS synthetic_training_data JSONB DEFAULT '{}'::jsonb;

-- 4. Create secondary tables if they still don't exist
CREATE TABLE IF NOT EXISTS public.studio_manifests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT,
    manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, feature_name)
);

-- 5. Refresh RLS Policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_access ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can only see their own projects" ON public.projects;
    CREATE POLICY "Users can only see their own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can only see versions of their projects" ON public.project_versions;
    CREATE POLICY "Users can only see versions of their projects" ON public.project_versions 
    FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

    DROP POLICY IF EXISTS "Users can manage their own feature access" ON public.feature_access;
    CREATE POLICY "Users can manage their own feature access" ON public.feature_access 
    FOR ALL USING (user_id = auth.uid());
END $$;
