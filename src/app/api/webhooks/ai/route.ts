import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * AI GENERATION WEBHOOK ENDPOINT (Fal.ai / Gemini Omni Callback)
 * Receives the generated AI avatar talking head or asset.
 * Triggers the final Shotstack video render once all assets are ready.
 */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      console.error('[AI Webhook] Missing Job ID in query params');
      return NextResponse.json({ error: 'Missing Job ID' }, { status: 400 });
    }

    const body = await req.json();
    console.log(`[AI Webhook] Received generation result for Job: ${jobId}`, body);

    // AI engines return video URLs in different fields (e.g. video_url, url, or output[0])
    const generatedUrl = body.video_url || body.url || (body.output && body.output[0]);

    if (!generatedUrl) {
      console.warn('[AI Webhook] No valid asset URL found in payload, marking as failed');
      
      await supabaseAdmin
        .from('render_jobs')
        .update({
          status: 'failed',
          error_log: JSON.stringify(body),
          config_json: {
            status_message: 'AI asset generation failed'
          }
        })
        .eq('id', jobId);

      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 1. Fetch current Job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error(`[AI Webhook] Job ${jobId} not found in DB:`, jobError);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const config = job.config_json || {};
    const script = config.script || {};

    // 2. Inject the newly generated AI avatar talking head as the main A-Roll source
    const updatedScript = {
      ...script,
      aRollUrl: generatedUrl // The AI avatar video is now the timeline base A-Roll
    };

    const updatedConfig = {
      ...config,
      script: updatedScript,
      ai_avatar_ready: true,
      ai_avatar_url: generatedUrl
    };

    // Update job progress and config in DB
    await supabaseAdmin
      .from('render_jobs')
      .update({
        progress: 50,
        config_json: {
          ...updatedConfig,
          status_message: 'AI avatar compiled! Initializing cloud video render...'
        }
      })
      .eq('id', jobId);

    // 3. Chain to Shotstack: Trigger final cloud compositing
    console.log(`[AI Webhook] Chaining Job ${jobId} to Shotstack Cloud render...`);
    const { submitVideoJob } = await import('@/lib/video');
    
    // Now trigger the standard Shotstack submission
    // We temporally override the engine in config to render in Shotstack with our new A-Roll url
    const renderConfig = {
      ...updatedConfig,
      engine: 'shotstack' // force Shotstack to compose avatar, brolls, and subtitles
    };

    await supabaseAdmin
      .from('render_jobs')
      .update({ config_json: renderConfig })
      .eq('id', jobId);

    // Submit the job to Shotstack (it will construct the timeline using the signed URL of our new AI video)
    await submitVideoJob(jobId);

    return NextResponse.json({ success: true, message: 'Chained to Shotstack' });

  } catch (error: any) {
    console.error('[AI Webhook] Chain processing failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
