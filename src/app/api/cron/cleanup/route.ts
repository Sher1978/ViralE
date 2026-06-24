import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { storageService } from '@/lib/services/storageService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1. Basic security: Check for Cron header
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const isAuthorized = !cronSecret || authHeader === `Bearer ${cronSecret}` || isVercelCron;

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    // 2. Fetch render jobs that completed or failed between 3 days ago and 30 minutes ago
    const { data: jobs, error } = await supabaseAdmin
      .from('render_jobs')
      .select('id, project_id, config_json, updated_at')
      .in('status', ['completed', 'failed'])
      .lt('updated_at', thirtyMinutesAgo.toISOString())
      .gt('updated_at', threeDaysAgo.toISOString())
      .order('updated_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('[CronCleanup] Error fetching jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Filter jobs that haven't been cleaned up yet
    const jobsToClean = (jobs || []).filter((job: any) => {
      const config = job.config_json || {};
      return !config.storage_cleaned;
    });

    console.log(`[CronCleanup] Found ${jobsToClean.length} jobs to clean up.`);
    const results = [];

    for (const job of jobsToClean) {
      try {
        console.log(`[CronCleanup] Cleaning storage for project: ${job.project_id} (Job: ${job.id})`);
        
        // Delete project files from media bucket
        const cleanupRes = await storageService.deleteProjectFiles(job.project_id);

        // Update job config_json with storage_cleaned flag
        const updatedConfig = {
          ...(job.config_json || {}),
          storage_cleaned: true,
          storage_cleaned_at: new Date().toISOString(),
          storage_cleaned_count: cleanupRes.deletedCount
        };

        const { error: updateError } = await supabaseAdmin
          .from('render_jobs')
          .update({ config_json: updatedConfig })
          .eq('id', job.id);

        if (updateError) {
          console.error(`[CronCleanup] Failed to update job ${job.id} config:`, updateError);
          results.push({ id: job.id, projectId: job.project_id, success: false, error: updateError.message });
        } else {
          console.log(`[CronCleanup] Job ${job.id} marked as cleaned.`);
          results.push({ id: job.id, projectId: job.project_id, success: true, deletedCount: cleanupRes.deletedCount });
        }
      } catch (jobErr: any) {
        console.error(`[CronCleanup] Error cleaning job ${job.id}:`, jobErr);
        results.push({ id: job.id, projectId: job.project_id, success: false, error: jobErr.message || String(jobErr) });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      details: results
    });

  } catch (error: any) {
    console.error('[CronCleanup] Cleanup process failed:', error);
    return NextResponse.json({ error: 'Cleanup process failed', details: error.message }, { status: 500 });
  }
}
