import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { deductCredits, CREDIT_COSTS } from '@/lib/credits';
import { createRenderJob } from '@/lib/render';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const { id: projectId } = await params;
    const { mode, tier, assetId, aiPolish, versionId, recordedAssetId } = await req.json();

    if (!projectId || !versionId) {
      return NextResponse.json({ error: 'Project ID and Version ID required' }, { status: 400 });
    }

    const userId = user.id;

    // 1. Verify Project Ownership
    const { data: project, error: projectError } = await authorizedSupabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();

    if (projectError || project?.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Calculate Animation Cost
    let animationCost = 0;
    if (tier === 'standard') animationCost = CREDIT_COSTS.ANIMATION_STANDARD;
    else if (tier === 'premium') animationCost = CREDIT_COSTS.ANIMATION_PREMIUM;
    else animationCost = CREDIT_COSTS.ANIMATION_LITE;

    if (aiPolish) animationCost += CREDIT_COSTS.AI_LOOK_POLISH;

    // 3. Deduct Animation & Polish Credits (Render cost is deducted inside createRenderJob)
    if (animationCost > 0) {
      await deductCredits(supabaseAdmin, userId, animationCost, 'ANIMATION_SETUP', projectId);
    }

    // 4. Update Project Config
    const { error: updateError } = await authorizedSupabase
      .from('projects')
      .update({
        avatar_mode: mode,
        animation_tier: tier,
        selected_asset_id: assetId,
        ai_look_polish: aiPolish,
        status: 'rendering'
      })
      .eq('id', projectId);

    if (updateError) throw updateError;

    // 5. Create Render Job (Deducts CREDIT_COSTS.PRO_RENDER and stores metadata)
    const job = await createRenderJob(supabaseAdmin, userId, projectId, versionId, 'pro', {
      mode,
      tier,
      assetId,
      aiPolish,
      recordedAssetId
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status
    });

  } catch (error: any) {
    console.error('Project launch failed:', error);
    if (error.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
