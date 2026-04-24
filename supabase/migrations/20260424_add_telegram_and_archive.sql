-- Migration: Add Telegram and Archiving support
-- Date: 2026-04-24

-- 1. Add telegram_id to profiles if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'telegram_id') THEN
        ALTER TABLE public.profiles ADD COLUMN telegram_id BIGINT UNIQUE;
    END IF;
END $$;

-- 2. Add archive support to projects
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'archived_at') THEN
        ALTER TABLE public.projects ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'archived_location') THEN
        ALTER TABLE public.projects ADD COLUMN archived_location TEXT; -- 'telegram', 'google_drive'
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'final_telegram_file_id') THEN
        ALTER TABLE public.projects ADD COLUMN final_telegram_file_id TEXT;
    END IF;
END $$;

-- Update status check if needed
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check CHECK (status IN ('ideation', 'scripting', 'storyboard', 'rendering', 'completed', 'error', 'archived'));

COMMENT ON COLUMN public.profiles.telegram_id IS 'Unique Telegram User ID for frictionless login and delivery';
COMMENT ON COLUMN public.projects.archived_at IS 'Timestamp when the project was moved to external storage';
COMMENT ON COLUMN public.projects.archived_location IS 'Where the project data was archived (telegram or google_drive)';
