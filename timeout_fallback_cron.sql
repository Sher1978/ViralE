-- SQL MIGRATION: TIMEOUT FALLBACK & CREDIT RECOVERY (pg_cron)
-- Execute this script in your Supabase SQL Editor to enable automatic
-- timeout protection for stuck render jobs.

-- 1. Enable the pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule a cron job to run every 15 minutes
-- Sweeps for jobs in progress/pending for more than 30 minutes,
-- marks them as failed, and restores credits to the affected users.
SELECT cron.schedule(
  'timeout_fallback_sweeper', -- unique job name
  '*/15 * * * *',             -- cron syntax: every 15 minutes
  $$
    WITH timed_out_jobs AS (
      UPDATE staging.render_jobs
      SET 
          status = 'failed', 
          status_message = 'Timeout: External cloud service did not respond within 30 minutes',
          error_log = 'Dead Letter Queue: Auto-terminated due to lack of callback response after 30m',
          updated_at = NOW()
      WHERE 
          (status LIKE 'pending%' OR status IN ('queued', 'processing', 'assembling'))
          AND created_at < NOW() - INTERVAL '30 minutes'
      RETURNING user_id, render_type
    ),
    recovered_credits AS (
      -- Calculate cost based on job render_type (pro = 5 credits, preview = 1 credit)
      SELECT 
        user_id, 
        SUM(CASE WHEN render_type = 'pro' THEN 5 ELSE 1 END) as total_recovered_credits
      FROM timed_out_jobs
      GROUP BY user_id
    )
    -- Restore credits balance back to users
    UPDATE staging.profiles p
    SET credits_balance = p.credits_balance + r.total_recovered_credits
    FROM recovered_credits r
    WHERE p.id = r.user_id;
  $$
);
