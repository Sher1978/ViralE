-- VIRAL ENGINE FULL FREE SCHEMA (PUBLIC SCHEMA)
-- Run this script in the SQL Editor of your NEW free Supabase project

-- 1. Create Profiles Table (links to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    credits_balance INTEGER DEFAULT 100,
    tier TEXT DEFAULT 'free',
    digital_shadow_prompt TEXT,
    industry_context TEXT,
    knowledge_base_json JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    subscription_expires_at TIMESTAMPTZ,
    anthropic_api_key TEXT,
    groq_api_key TEXT,
    telegram_chat_id TEXT,
    synthetic_training_data JSONB DEFAULT '{}'::jsonb,
    preferred_language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Projects Table
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
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Project Versions Table
CREATE TABLE IF NOT EXISTS public.project_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    script_data JSONB DEFAULT '{}'::jsonb,
    storyboard_data JSONB DEFAULT '{}'::jsonb,
    version_label TEXT,
    preview_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Studio Manifests Table
CREATE TABLE IF NOT EXISTS public.studio_manifests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT,
    manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Media Assets Table
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    asset_type TEXT NOT NULL, -- 'video', 'audio', 'image'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create Render Jobs Table
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

-- 7. Create Feature Access Table
CREATE TABLE IF NOT EXISTS public.feature_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, feature_name)
);

-- 8. Create Ideas Table
CREATE TABLE IF NOT EXISTS public.ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_title TEXT NOT NULL,
    rationale TEXT,
    viral_potential_score INTEGER DEFAULT 85,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'archived', 'used')),
    category TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8.1 Create Ideation Feed Table
CREATE TABLE IF NOT EXISTS public.ideation_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_title TEXT NOT NULL,
    rationale TEXT,
    viral_potential_score INTEGER DEFAULT 85,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'used', 'dismissed', 'archived')),
    category TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Create Credits Transactions Table
CREATE TABLE IF NOT EXISTS public.credits_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    description TEXT,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9.1 Create Promo Codes Table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    tier TEXT NOT NULL DEFAULT 'scale',
    credits_bonus INTEGER NOT NULL DEFAULT 50000,
    is_used BOOLEAN DEFAULT false,
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideation_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_transactions ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS Policies & Security Hardening
DO $$ 
BEGIN
    -- Profiles (Strict SELECT & UPDATE split)
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    
    CREATE POLICY "Users can view own profile" ON public.profiles 
      FOR SELECT USING (auth.uid() = id);

    CREATE POLICY "Users can update own profile" ON public.profiles 
      FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

    -- Projects
    DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
    CREATE POLICY "Users can manage own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);

    -- Versions
    DROP POLICY IF EXISTS "Users can manage own project versions" ON public.project_versions;
    CREATE POLICY "Users can manage own project versions" ON public.project_versions 
    FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

    -- Manifests
    DROP POLICY IF EXISTS "Users can manage own manifests" ON public.studio_manifests;
    CREATE POLICY "Users can manage own manifests" ON public.studio_manifests 
    FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

    -- Assets
    DROP POLICY IF EXISTS "Users can manage own assets" ON public.media_assets;
    CREATE POLICY "Users can manage own assets" ON public.media_assets 
    FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

    -- Render Jobs
    DROP POLICY IF EXISTS "Users can manage own render jobs" ON public.render_jobs;
    CREATE POLICY "Users can manage own render jobs" ON public.render_jobs 
    FOR ALL USING (user_id = auth.uid());

    -- Feature Access
    DROP POLICY IF EXISTS "Users can view own feature access" ON public.feature_access;
    CREATE POLICY "Users can view own feature access" ON public.feature_access 
    FOR ALL USING (user_id = auth.uid());

    -- Ideas
    DROP POLICY IF EXISTS "Users can manage own ideas" ON public.ideas;
    CREATE POLICY "Users can manage own ideas" ON public.ideas 
    FOR ALL USING (user_id = auth.uid());

    -- Ideation Feed
    DROP POLICY IF EXISTS "Users can manage own ideation feed" ON public.ideation_feed;
    CREATE POLICY "Users can manage own ideation feed" ON public.ideation_feed 
    FOR ALL USING (user_id = auth.uid());

    -- Credits Transactions
    DROP POLICY IF EXISTS "Users can view own transactions" ON public.credits_transactions;
    CREATE POLICY "Users can view own transactions" ON public.credits_transactions 
    FOR ALL USING (user_id = auth.uid());
END $$;

-- 12. HARDENED SECURITY TRIGGER: PREVENT CLIENT CREDITS TAMPERING
CREATE OR REPLACE FUNCTION public.prevent_client_credits_tampering()
RETURNS TRIGGER AS $$
BEGIN
  -- If request originates from normal user (not backend service_role)
  IF (auth.role() = 'authenticated') THEN
    NEW.credits_balance := OLD.credits_balance;
    NEW.tier := OLD.tier;
    NEW.subscription_status := OLD.subscription_status;
    NEW.subscription_expires_at := OLD.subscription_expires_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_client_credits_tampering ON public.profiles;
CREATE TRIGGER tr_prevent_client_credits_tampering
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_client_credits_tampering();

-- 13. Automatically Create Profile on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, credits_balance, tier)
  VALUES (new.id, 100, 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
