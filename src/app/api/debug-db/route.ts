import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const jobId = '2c36a3f9-9b48-497c-a3d8-5b2a8a2d4422';
    const projectId = '438e68fa-024d-4f26-9f60-7d3d190379d2';

    const shotstackApiKey = process.env.SHOTSTACK_API_KEY || '';
    if (!shotstackApiKey) {
      throw new Error('SHOTSTACK_API_KEY is not defined in environment');
    }

    console.log('[DEBUG-DB] Fetching job status from Shotstack for ID:', jobId);
    
    // 1. Try stage endpoint first since media is rendering on stage
    let endpoint = `https://api.shotstack.io/stage/render/${jobId}`;
    let res = await fetch(endpoint, {
      headers: { 'x-api-key': shotstackApiKey }
    });

    let shotstackData: any = null;
    if (res.ok) {
      shotstackData = await res.json();
    } else {
      console.warn('[DEBUG-DB] Stage endpoint failed, trying Production...');
      // 2. Try production endpoint fallback
      endpoint = `https://api.shotstack.io/v1/render/${jobId}`;
      res = await fetch(endpoint, {
        headers: { 'x-api-key': shotstackApiKey }
      });
      if (res.ok) {
        shotstackData = await res.json();
      } else {
        throw new Error(`Both Shotstack Stage and Production APIs failed with status: ${res.status}`);
      }
    }

    const status = shotstackData.response?.status;
    const url = shotstackData.response?.url;

    console.log('[DEBUG-DB] Shotstack final response status:', status, 'url:', url);

    if (status === 'done' && url) {
      console.log('[DEBUG-DB] Job is completed in Shotstack! Syncing to Supabase...');
      
      const { error: jobErr } = await supabaseAdmin
        .from('render_jobs')
        .update({
          status: 'completed',
          progress: 100,
          output_url: url,
          config_json: {
            status_message: 'Ready to share!'
          }
        })
        .eq('id', jobId);

      if (jobErr) throw jobErr;

      const { error: projErr } = await supabaseAdmin
        .from('projects')
        .update({
          status: 'completed',
          final_video_url: url
        })
        .eq('id', projectId);

      if (projErr) throw projErr;

      return NextResponse.json({ 
        success: true, 
        source: 'shotstack_api',
        status: 'completed', 
        videoUrl: url,
        message: 'Successfully synced completed render job from Shotstack to Supabase!' 
      });
    }

    return NextResponse.json({ 
      success: true, 
      source: 'shotstack_api',
      status: status || 'unknown',
      data: shotstackData,
      message: `Shotstack job state is currently "${status}". Not completed yet.` 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
