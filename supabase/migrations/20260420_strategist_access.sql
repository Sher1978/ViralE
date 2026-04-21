-- Viral Strategist Access Tracking
CREATE TABLE IF NOT EXISTS public.feature_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    feature_id TEXT NOT NULL, -- e.g., 'strategist_pilot'
    trial_started_at TIMESTAMP WITH TIME ZONE,
    is_subscribed BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, feature_id)
);

-- Enable RLS
ALTER TABLE public.feature_access ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own feature access" 
    ON public.feature_access FOR SELECT 
    USING (auth.uid() = user_id);

-- NOTE: Updates and Inserts should be handled by a service role or a secure RPC/API.
