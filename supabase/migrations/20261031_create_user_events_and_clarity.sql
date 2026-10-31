-- ==============================================================================
-- VIRAL ENGINE: USER EVENTS & PRODUCT ANALYTICS TABLE
-- Migration: 20261031_create_user_events_and_clarity.sql
-- Supports Supabase event tracking, Microsoft Clarity session replays, and PostHog funnels
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    clarity_session_id TEXT,
    clarity_replay_url TEXT,
    posthog_session_id TEXT,
    posthog_replay_url TEXT,
    page_url TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments for documentation
COMMENT ON TABLE public.user_events IS 'Stores granular user actions, product funnel steps, and session replay links (Clarity & PostHog).';
COMMENT ON COLUMN public.user_events.clarity_replay_url IS 'Direct URL to view session recording on Microsoft Clarity dashboard.';
COMMENT ON COLUMN public.user_events.posthog_replay_url IS 'Direct URL to view session recording on PostHog dashboard.';

-- Fast indexes for dashboard metrics, funnel queries, and user auditing
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event_name ON public.user_events(event_name);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON public.user_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_event_time ON public.user_events(event_name, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Allow users and guests to insert events" ON public.user_events;
DROP POLICY IF EXISTS "Allow users to view own events" ON public.user_events;
DROP POLICY IF EXISTS "Allow service role full access to events" ON public.user_events;

-- Policy: Allow users and guests to log events
CREATE POLICY "Allow users and guests to insert events"
ON public.user_events FOR INSERT
WITH CHECK (true);

-- Policy: Users can view their own event history
CREATE POLICY "Allow users to view own events"
ON public.user_events FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Service role has full access (bypasses RLS)
CREATE POLICY "Allow service role full access to events"
ON public.user_events FOR ALL
USING (true)
WITH CHECK (true);
