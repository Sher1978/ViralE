import { NextResponse } from 'next/server';
import { generateStoryboardAI, refineSceneAI } from '@/lib/storyboard';
import { deductCredits, CREDIT_COSTS } from '@/lib/credits';
import { getAuthContext } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const { projectId, versionId, locale = 'en' } = await req.json();

    if (!projectId || !versionId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const userId = user.id;

    // --- ONBOARDING CHECK ---
    const { data: profile } = await authorizedSupabase
      .from('profiles')
      .select('digital_shadow_prompt')
      .eq('id', userId)
      .single();

    // Note: We used to block here with 403. Now we allow expert fallback.
    // ------------------------

    // 0. Verify Project & Version Ownership (using authorized client respects RLS)
    const { data: project, error: projectError } = await authorizedSupabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();

    if (projectError || project?.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify version belongs to project
    const { data: versionCheck, error: versionCheckError } = await authorizedSupabase
      .from('project_versions')
      .select('project_id')
      .eq('id', versionId)
      .single();

    if (versionCheckError || versionCheck?.project_id !== projectId) {
      return NextResponse.json({ error: 'Invalid version reference' }, { status: 400 });
    }

    // 1. Fetch current Script
    const { data: version, error: fetchError } = await authorizedSupabase
      .from('project_versions')
      .select('script_data, storyboard_data')
      .eq('id', versionId)
      .single();
 
    if (fetchError || !version?.script_data) {
      throw new Error('Script version not found');
    }

    const { mode = 'generate_all', sceneIndex, instruction = 'Regenerate for better virality' } = await req.json();
 
    // 2. Deduct Credits
    try {
      const cost = mode === 'refine_scene' ? CREDIT_COSTS.REGENERATE_BLOCK : CREDIT_COSTS.GENERATE_STORYBOARD;
      await deductCredits(authorizedSupabase, userId, cost, 'STORYBOARD_GEN', projectId);
    } catch (e: any) {
      if (e.message === 'INSUFFICIENT_CREDITS') {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
      }
      throw e;
    }
 
    // 3. Orchestrate AI Visual Director
    let storyboardJson;
    if (mode === 'refine_scene' && typeof sceneIndex === 'number') {
      const currentStoryboard = (version.storyboard_data as any) || { scenes: [] };
      const refinedScene = await refineSceneAI(
        version.script_data, 
        sceneIndex, 
        currentStoryboard.scenes || [], 
        instruction, 
        locale
      );
      
      const newScenes = [...(currentStoryboard.scenes || [])];
      newScenes[sceneIndex] = refinedScene;
      storyboardJson = { ...currentStoryboard, scenes: newScenes };
    } else {
      const frames = await generateStoryboardAI(version.script_data, locale);
      storyboardJson = { scenes: frames };
    }
 
    // 4. Update the Version row with storyboard data
    const { error: updateError } = await authorizedSupabase
      .from('project_versions')
      .update({
        storyboard_data: storyboardJson
      })
      .eq('id', versionId);
 
    if (updateError) throw updateError;
 
    // 5. Update overall project status
    await authorizedSupabase
      .from('projects')
      .update({ status: 'storyboard' })
      .eq('id', projectId);
 
    return NextResponse.json({
      success: true,
      storyboard: storyboardJson
    });
 
  } catch (error: any) {
    console.error('Storyboard generation failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
