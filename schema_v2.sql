-- VIRAL ENGINE COMPREHENSIVE SCHEMA MIGRATION
-- Execute this script in your Supabase SQL Editor

-- 1. Create Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'ideation' CHECK (status IN ('ideation', 'scripting', 'storyboard', 'rendering', 'completed', 'error')),
    input_source TEXT,
    final_video_url TEXT,
    parent_id UUID REFERENCES public.projects(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    config_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Project Versions Table
CREATE TABLE IF NOT EXISTS public.project_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    script_data JSONB DEFAULT '{}'::jsonb,
    storyboard_data JSONB DEFAULT '{}'::jsonb,
    version_label TEXT,
    preview_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Studio Manifests Table
CREATE TABLE IF NOT EXISTS public.studio_manifests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT,
    manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Media Assets Table
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    asset_type TEXT NOT NULL, -- 'video', 'audio', 'image'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Render Jobs Table
CREATE TABLE IF NOT EXISTS public.render_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    version_id UUID REFERENCES public.project_versions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'processing', 'assembling', 'completed', 'failed')),
    render_type TEXT DEFAULT 'pro',
    progress INTEGER DEFAULT 0,
    output_url TEXT,
    error_log TEXT,
    config_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Enable RLS and Create Policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;

-- Dynamic Policies (User Restricted)
DO $$ 
BEGIN
    -- Projects
    DROP POLICY IF EXISTS "Users can only see their own projects" ON public.projects;
    CREATE POLICY "Users can only see their own projects" ON public.projects 
    FOR ALL USING (auth.uid() = user_id);

    -- Versions
    DROP POLICY IF EXISTS "Users can only see versions of their projects" ON public.project_versions;
    CREATE POLICY "Users can only see versions of their projects" ON public.project_versions 
    FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

    -- Manifests
    DROP POLICY IF EXISTS "Users can manage their own manifests" ON public.studio_manifests;
    CREATE POLICY "Users can manage their own manifests" ON public.studio_manifests 
    FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

    -- Assets
    DROP POLICY IF EXISTS "Users can manage their own assets" ON public.media_assets;
    CREATE POLICY "Users can manage their own assets" ON public.media_assets 
    FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

    -- Render Jobs
    DROP POLICY IF EXISTS "Users can see their own render jobs" ON public.render_jobs;
    CREATE POLICY "Users can see their own render jobs" ON public.render_jobs 
    FOR ALL USING (user_id = auth.uid());
END $$;
