import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId') || '2c36a3f9-9b48-497c-a3d8-5b2a8a2d4422';
    const projectId = searchParams.get('projectId') || '438e68fa-024d-4f26-9f60-7d3d190379d2';
    const forceComplete = searchParams.get('forceComplete') === 'true';
    const forceUrl = searchParams.get('url');

    console.log('[DEBUG-DB] Diagnostic query for jobId:', jobId, 'projectId:', projectId);
    
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
            ...jobData.config_json,
            status_message: 'Completed via Admin Force Tool'
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

    // 3. Automated real-time Shotstack polling if we have a render ID
    const configJson = jobData.config_json || {};
    const shotstackRenderId = configJson.shotstack_render_id || jobData.id; 
    const shotstackEnv = configJson.shotstack_environment || 'stage';
    const shotstackApiKey = process.env.SHOTSTACK_API_KEY || '';

    let shotstackStatus = 'not_queried';
    let shotstackVideoUrl = null;
    let shotstackResponse: any = null;

    if (shotstackApiKey && shotstackRenderId) {
      console.log('[DEBUG-DB] Actively querying Shotstack API using server credentials...');
      const baseUrl = shotstackEnv === 'production' ? 'https://api.shotstack.io/v1/render' : 'https://api.shotstack.io/stage/render';
      
      try {
        const res = await fetch(`${baseUrl}/${shotstackRenderId}`, {
          headers: { 'x-api-key': shotstackApiKey }
        });

        if (res.ok) {
          shotstackResponse = await res.json();
          shotstackStatus = shotstackResponse.response?.status || 'unknown';
          shotstackVideoUrl = shotstackResponse.response?.url || null;

          console.log('[DEBUG-DB] Shotstack active check status:', shotstackStatus, 'URL:', shotstackVideoUrl);

          // If completed, automatically update database and close project!
          if (shotstackStatus === 'done' && shotstackVideoUrl) {
            console.log('[DEBUG-DB] Shotstack job is completed! Running auto-sync...');
            
            const { error: jobErr } = await supabaseAdmin
              .from('render_jobs')
              .update({
                status: 'completed',
                progress: 100,
                output_url: shotstackVideoUrl,
                config_json: {
                  ...configJson,
                  status_message: 'Ready to share!'
                }
              })
              .eq('id', jobId);

            if (jobErr) throw jobErr;

            const { error: projErr } = await supabaseAdmin
              .from('projects')
              .update({
                status: 'completed',
                final_video_url: shotstackVideoUrl
              })
              .eq('id', projectId);

            if (projErr) throw projErr;
            
            console.log('[DEBUG-DB] Database successfully auto-synced to completed.');
          }
        } else {
          console.warn('[DEBUG-DB] Shotstack API call returned status:', res.status);
          shotstackStatus = `failed_with_${res.status}`;
        }
      } catch (err: any) {
        console.error('[DEBUG-DB] Shotstack query error:', err);
        shotstackStatus = `error: ${err.message}`;
      }
    }

    // 4. Return current database and Shotstack status
    return NextResponse.json({
      success: true,
      message: 'Successfully analyzed job status',
      job: {
        id: jobData.id,
        status: jobData.status,
        progress: jobData.progress,
        output_url: jobData.output_url,
        config_json: jobData.config_json,
        error_log: jobData.error_log,
        created_at: jobData.created_at,
        updated_at: jobData.updated_at
      },
      shotstack: {
        renderId: shotstackRenderId,
        environment: shotstackEnv,
        status: shotstackStatus,
        videoUrl: shotstackVideoUrl,
        rawResponse: shotstackResponse
      }
    });

  } catch (error: any) {
    console.error('[DEBUG-DB] Global error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
