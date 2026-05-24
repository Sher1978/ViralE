import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const jobId = '1fac7e33-431c-45b7-a674-e84ad6c380ec';
    const projectId = 'cedec15f-c0c1-4b13-90d5-21d154dfcb6b';
    const videoUrl = 'https://shotstack-api-stage-output.s3-ap-southeast-2.amazonaws.com/oksaw3ffve/76edd6a3-b658-404f-8957-754da06c7c34.mp4';

    console.log('[DEBUG-DB] Updating render_jobs for jobId:', jobId);
    const { error: jobErr } = await supabaseAdmin
      .from('render_jobs')
      .update({
        status: 'completed',
        progress: 100,
        output_url: videoUrl,
        config_json: {
          status_message: 'Ready to share!'
        }
      })
      .eq('id', jobId);

    if (jobErr) throw jobErr;

    console.log('[DEBUG-DB] Updating projects for projectId:', projectId);
    const { error: projErr } = await supabaseAdmin
      .from('projects')
      .update({
        status: 'completed',
        final_video_url: videoUrl
      })
      .eq('id', projectId);

    if (projErr) throw projErr;

    return NextResponse.json({ success: true, message: 'Job completed successfully via admin debug client!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
