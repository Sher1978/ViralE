import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const jobId = '2c36a3f9-9b48-497c-a3d8-5b2a8a2d4422';
    const projectId = '438e68fa-024d-4f26-9f60-7d3d190379d2';

    const { searchParams } = new URL(request.url);
    const forceComplete = searchParams.get('forceComplete') === 'true';
    const forceUrl = searchParams.get('url');

    console.log('[DEBUG-DB] Fetching current database state for job:', jobId);
    
    // 1. Fetch current job state using admin bypass
    const { data: jobData, error: fetchErr } = await supabaseAdmin
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchErr) {
      console.error('[DEBUG-DB] Fetch error:', fetchErr);
      return NextResponse.json({ error: 'Failed to fetch job', details: fetchErr }, { status: 500 });
    }

    // 2. Manual override if requested
    if (forceComplete && forceUrl) {
      console.log('[DEBUG-DB] Force complete requested. Target URL:', forceUrl);
      
      const { error: jobErr } = await supabaseAdmin
        .from('render_jobs')
        .update({
          status: 'completed',
          progress: 100,
          output_url: forceUrl,
          config_json: {
            status_message: 'Completed via Admin Tool'
          }
        })
        .eq('id', jobId);

      if (jobErr) throw jobErr;

      const { error: projErr } = await supabaseAdmin
        .from('projects')
        .update({
          status: 'completed',
          final_video_url: forceUrl
        })
        .eq('id', projectId);

      if (projErr) throw projErr;

      return NextResponse.json({
        success: true,
        message: 'Successfully forced job and project status to completed!',
        jobId,
        projectId,
        output_url: forceUrl
      });
    }

    // 3. Return current status
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched current render job state from Supabase',
      job: {
        id: jobData.id,
        status: jobData.status,
        progress: jobData.progress,
        output_url: jobData.output_url,
        error_log: jobData.error_log,
        created_at: jobData.created_at,
        updated_at: jobData.updated_at
      }
    });

  } catch (error: any) {
    console.error('[DEBUG-DB] Global error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
