-- Скрипт создания таблиц в схеме staging для Viral Engine

-- 1. Таблица профилей (staging.profiles)
CREATE TABLE IF NOT EXISTS staging.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    credits_balance INTEGER DEFAULT 100,
    tier TEXT DEFAULT 'free',
    updated_at TIMESTAMPTZ DEFAULT now(),
    anthropic_api_key TEXT,
    groq_api_key TEXT,
    telegram_chat_id TEXT,
    synthetic_training_data JSONB DEFAULT '{}'::jsonb,
    preferred_language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Таблица проектов (staging.projects)
CREATE TABLE IF NOT EXISTS staging.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'ideation' CHECK (status IN ('ideation', 'scripting', 'storyboard', 'rendering', 'completed', 'error')),
    input_source TEXT,
    final_video_url TEXT,
    parent_id UUID REFERENCES staging.projects(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    config_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Версии проектов (staging.project_versions)
CREATE TABLE IF NOT EXISTS staging.project_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES staging.projects(id) ON DELETE CASCADE,
    script_data JSONB DEFAULT '{}'::jsonb,
    storyboard_data JSONB DEFAULT '{}'::jsonb,
    version_label TEXT,
    preview_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Манифесты студии (staging.studio_manifests)
CREATE TABLE IF NOT EXISTS staging.studio_manifests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES staging.projects(id) ON DELETE CASCADE,
    name TEXT,
    manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Медиа-ассеты (staging.media_assets)
CREATE TABLE IF NOT EXISTS staging.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES staging.projects(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    asset_type TEXT NOT NULL, -- 'video', 'audio', 'image'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Задания на рендеринг (staging.render_jobs)
CREATE TABLE IF NOT EXISTS staging.render_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES staging.projects(id) ON DELETE CASCADE,
    version_id UUID REFERENCES staging.project_versions(id) ON DELETE CASCADE,
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

-- 7. Доступы к фичам (staging.feature_access)
CREATE TABLE IF NOT EXISTS staging.feature_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, feature_name)
);

-- Включаем RLS (Row Level Security) на все новые таблицы схемы staging
ALTER TABLE staging.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.studio_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.feature_access ENABLE ROW LEVEL SECURITY;

-- Настраиваем политики безопасности для изоляции данных пользователей
DO $$ 
BEGIN
    -- Profiles
    DROP POLICY IF EXISTS "Users can only see their own profiles" ON staging.profiles;
    CREATE POLICY "Users can only see their own profiles" ON staging.profiles 
    FOR ALL USING (auth.uid() = id);

    -- Projects
    DROP POLICY IF EXISTS "Users can only see their own projects" ON staging.projects;
    CREATE POLICY "Users can only see their own projects" ON staging.projects 
    FOR ALL USING (auth.uid() = user_id);

    -- Versions
    DROP POLICY IF EXISTS "Users can only see versions of their projects" ON staging.project_versions;
    CREATE POLICY "Users can only see versions of their projects" ON staging.project_versions 
    FOR ALL USING (project_id IN (SELECT id FROM staging.projects WHERE user_id = auth.uid()));

    -- Manifests
    DROP POLICY IF EXISTS "Users can manage their own manifests" ON staging.studio_manifests;
    CREATE POLICY "Users can manage their own manifests" ON staging.studio_manifests 
    FOR ALL USING (project_id IN (SELECT id FROM staging.projects WHERE user_id = auth.uid()));

    -- Assets
    DROP POLICY IF EXISTS "Users can manage their own assets" ON staging.media_assets;
    CREATE POLICY "Users can manage their own assets" ON staging.media_assets 
    FOR ALL USING (project_id IN (SELECT id FROM staging.projects WHERE user_id = auth.uid()));

    -- Render Jobs
    DROP POLICY IF EXISTS "Users can see their own render jobs" ON staging.render_jobs;
    CREATE POLICY "Users can see their own render jobs" ON staging.render_jobs 
    FOR ALL USING (user_id = auth.uid());

    -- Feature Access
    DROP POLICY IF EXISTS "Users can manage their own feature access" ON staging.feature_access;
    CREATE POLICY "Users can manage their own feature access" ON staging.feature_access 
    FOR ALL USING (user_id = auth.uid());
END $$;
