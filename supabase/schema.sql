-- Viral Engine Supabase Schema

-- 1. Profiles: Store user metadata, credits, and the "Digital Shadow"
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    credits_balance INTEGER DEFAULT 100 NOT NULL,
    digital_shadow_prompt TEXT, -- DNA Voice / Master Prompt
    industry_context TEXT,
    synthetic_training_data TEXT, -- Raw text from NotebookLM/Gemini
    knowledge_base_json JSONB DEFAULT '{}'::jsonb, -- Structured knowledge excerpts
    avatar_config_json JSONB DEFAULT '{}'::jsonb,
    raw_onboarding_data JSONB DEFAULT '{}'::jsonb,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Projects: Main project state and results
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'ideation' CHECK (status IN ('ideation', 'scripting', 'storyboard', 'rendering', 'completed', 'error', 'archived')),
    input_source TEXT, -- Topic or URL
    final_video_url TEXT,
    final_telegram_file_id TEXT,
    parent_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Script Blocks: Granular storage for the Script Lab
CREATE TABLE IF NOT EXISTS public.project_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    script_data JSONB NOT NULL, -- { "hook": "...", "body": [...], "cta": "..." }
    storyboard_data JSONB, -- { "frames": [...] }
    version_label TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Ideation Feed: AI-generated daily content suggestions
CREATE TABLE IF NOT EXISTS public.ideation_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    topic_title TEXT NOT NULL,
    rationale TEXT,
    viral_potential_score INTEGER,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'used', 'dismissed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Credits Transactions: Audit log for credits usage
CREATE TABLE IF NOT EXISTS public.credits_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL, -- Negative for usage, positive for top-up
    transaction_type TEXT NOT NULL, -- 'script_gen', 'storyboard_gen', 'render', 'top_up'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Render Jobs: Queue for the external FFmpeg worker
CREATE TABLE IF NOT EXISTS public.render_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    version_id UUID REFERENCES public.project_versions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    render_type TEXT DEFAULT 'preview' CHECK (render_type IN ('preview', 'pro')),
    progress INTEGER DEFAULT 0,
    output_url TEXT,
    error_log TEXT,
    config_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideation_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- NOTE: credits_balance should only be updated by server-side service role via API routes.

-- 2. Projects Policies
CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- 3. Project Versions Policies
CREATE POLICY "Users can view their own project versions" ON public.project_versions FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid()));
CREATE POLICY "Users can create their own project versions" ON public.project_versions FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid()));

-- 4. Ideation Feed Policies
CREATE POLICY "Users can view their own ideas" ON public.ideation_feed FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ideas" ON public.ideation_feed FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ideas" ON public.ideation_feed FOR UPDATE USING (auth.uid() = user_id);

-- 5. Credits Transactions Policies
CREATE POLICY "Users can view their own transactions" ON public.credits_transactions FOR SELECT USING (auth.uid() = user_id);
-- INSERTS/UPDATES are prohibited via RLS (Server-side only)

-- 6. Render Jobs Policies
CREATE POLICY "Users can view their own render jobs" ON public.render_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own render jobs" ON public.render_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
-- NOTE: Workers will use service role to update status/progress.
