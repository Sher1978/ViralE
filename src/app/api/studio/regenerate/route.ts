import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { deductCredits, CREDIT_COSTS } from '@/lib/credits';

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const { projectId, segmentId, segmentType, segmentData } = await req.json();

    if (!projectId || !segmentId || !segmentType) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Deduct Credits for partial generation (reduced cost)
    const cost = segmentType === 'avatar' ? CREDIT_COSTS.AVATAR_HEYGEN : CREDIT_COSTS.RENDER_PREVIEW;
    await deductCredits(authorizedSupabase, user.id, cost, 'PARTIAL_GEN', projectId);

    // 2. Create a "Segment Job" in render_jobs via authorized client
    const { data: job, error: jobError } = await authorizedSupabase
      .from('render_jobs')
      .insert({
        user_id: user.id,
        project_id: projectId,
        version_id: segmentData.versionId || null, // Optional if it's a floating segment
        render_type: 'preview',
        status: 'pending',
        config_json: {
          segment_id: segmentId,
          segment_type: segmentType,
          segment_data: segmentData,
          is_partial: true
        }
      })
      .select()
      .single();

    if (jobError) throw jobError;

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: 'rendering'
    });

  } catch (error: any) {
    console.error('Regeneration failed:', error);
    if (error.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
