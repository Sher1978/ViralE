import { NextResponse } from 'next/server';
import { processVideoJob } from '@/lib/video';
import { supabase } from '@/lib/supabase';

// This endpoint triggers the actual "Rendering" process
// In a production environment, this would be secured and called by a Webhook or a Queue
export async function POST(req: Request) {
  try {
    const { jobId } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Check if job exists and is pending
    const { data: job, error: jobError } = await supabase
      .from('render_jobs')
      .select('status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== 'pending' && job.status !== 'failed') {
      return NextResponse.json({ error: 'Job is already being processed' }, { status: 400 });
    }

    // Start background processing
    // NOTE: In Next.js App Router on Vercel, this might time out if the generator takes too long.
    // For the skeleton mock (8s delay), it will work fine.
    // In production, we would use a Background Task (e.g., Vercel KV + Cron or Upstash).
    await processVideoJob(jobId);

    return NextResponse.json({ success: true, message: 'Processing started' });

  } catch (error: any) {
    console.error('Processing trigger failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
