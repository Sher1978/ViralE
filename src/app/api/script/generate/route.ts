import { NextResponse } from 'next/server';
import * as factory from '@/lib/ai/factory';
import { deductCredits, CREDIT_COSTS } from '@/lib/credits';
import { getAuthContext } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    let { projectId, coreIdea, locale = 'en', mode = 'initial', instruction, currentScript, versionId: targetVersionId, engine = 'gemini', hook, role } = await req.json();

    console.log(`[ScriptGen] Mode: ${mode}, Locale: ${locale}, Engine: ${engine}, ProjectID: ${projectId || 'NEW'}`);

    const userId = user.id;

    // 0. Auto-create project if missing in initial mode
    if (!projectId && mode === 'initial') {
      console.log(`[ScriptGen] Auto-creating project for user: ${userId}`);
      const { data: newProject, error: createError } = await authorizedSupabase
        .from('projects')
        .insert({
          title: coreIdea?.substring(0, 50) || (locale === 'ru' ? 'Новое видео' : 'New Video'),
          user_id: userId,
          status: 'ideation',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('[ScriptGen] Project creation failed:', createError);
        throw createError;
      }
      projectId = newProject.id;
      console.log(`[ScriptGen] New project created: ${projectId}`);
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    // 1. Verify Project Ownership
    const { data: project, error: projectError } = await authorizedSupabase
      .from('projects')
      .select('user_id, status')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('[ScriptGen] Project fetch failed:', projectError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project?.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Get Digital Shadow and Brand DNA
    const { data: profile, error: profileError } = await authorizedSupabase
      .from('profiles')
      .select('digital_shadow_prompt, knowledge_base_json, industry_context, anthropic_api_key, groq_api_key, credits_balance, tier')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('[ScriptGen] Profile fetch warning:', profileError);
    }

    const digitalShadow = profile?.digital_shadow_prompt || '';
    const anthropicApiKey = profile?.anthropic_api_key || undefined;
    const groqApiKey = profile?.groq_api_key || undefined;
    const geminiApiKey = undefined; // Not stored in DB yet, use system key
    const tier = profile?.tier || 'free';
    const onboardingIncomplete = !digitalShadow;

    // 2.5 Tier-based Enforcement (Backend)
    if (mode === 'initial') {
      if (tier === 'creator') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count, error: countError } = await authorizedSupabase
          .from('credits_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('transaction_type', 'SCRIPT_GEN')
          .gte('created_at', startOfMonth.toISOString());

        if (countError) {
          console.error('[ScriptGen] Limit check failed:', countError);
        } else if ((count || 0) >= 20) {
          return NextResponse.json({ 
            error: 'Monthly generation limit (20) reached for Creator tier. Plan your content wisely or upgrade to PRO.',
            code: 'LIMIT_EXCEEDED'
          }, { status: 403 });
        }
      } else if (tier === 'free') {
        // Hard limit for free tier: 3 total generations
        const { count, error: countError } = await authorizedSupabase
          .from('credits_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('transaction_type', 'SCRIPT_GEN');
        
        if (countError) {
          console.error('[ScriptGen] Free limit check failed:', countError);
        } else if ((count || 0) >= 3) {
          return NextResponse.json({ 
            error: 'Free trial limit (3) reached. Upgrade to CREATOR to continue generating scripts.',
            code: 'LIMIT_EXCEEDED'
          }, { status: 403 });
        }
      }
    }

    // 3. Transact Credits
    try {
      const balance = profile?.credits_balance || 0;
      const cost = mode === 'refine' ? CREDIT_COSTS.REGENERATE_BLOCK : CREDIT_COSTS.GENERATE_SCRIPT;
      
      // Threshold check for refinement
      if (mode === 'refine' && balance < 50) {
        return NextResponse.json({ 
          error: 'Balance threshold (50 credits) required for script adjustment. Please top up to ensure you have enough for video generation.',
          code: 'BALANCE_TOO_LOW'
        }, { status: 402 });
      }

      console.log(`[ScriptGen] Deducting ${cost} credits...`);
      await deductCredits(authorizedSupabase, userId, cost, mode === 'refine' ? 'SCRIPT_REFINEMENT' : 'SCRIPT_GEN', projectId);
    } catch (e: any) {
      if (e.message === 'INSUFFICIENT_CREDITS') {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
      }
      throw e;
    }

    const brandDna = {
      knowledgeBase: profile?.knowledge_base_json,
      industry: profile?.industry_context
    };

    // 4. Generate or Refine Script
    let scriptJson;
    try {
      if (mode === 'refine') {
        console.log(`[ScriptGen] Refining script [Engine: ${engine}] with instruction: ${instruction}`);
        scriptJson = await factory.refineScript(currentScript, instruction, digitalShadow, {
          engine,
          locale,
          anthropicApiKey,
          groqApiKey,
          geminiApiKey,
          brandDna
        });
      } else {
        console.log(`[ScriptGen] Generating initial script [Engine: ${engine}] for idea: ${coreIdea}`);
        scriptJson = await factory.generateScript(coreIdea, digitalShadow, {
          engine,
          locale,
          anthropicApiKey,
          groqApiKey,
          geminiApiKey,
          brandDna
        });
      }
    } catch (error: any) {
      console.error('[ScriptGen] AI Generation failed:', error);
      throw new Error(locale === 'ru' ? `Ошибка ИИ: ${error.message}` : `AI Error: ${error.message}`);
    }

    // 5. Save Version
    let version;
    if (mode === 'refine' && targetVersionId) {
      console.log(`[ScriptGen] Updating version: ${targetVersionId}`);
      const { data: updatedVersion, error: updateError } = await authorizedSupabase
        .from('project_versions')
        .update({
          script_data: scriptJson
        })
        .eq('id', targetVersionId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      version = updatedVersion;
    } else {
      // Get max version count for this project to create a label
      const { count } = await authorizedSupabase
        .from('project_versions')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      console.log(`[ScriptGen] Creating new version for project: ${projectId}`);
      const { data: newVersion, error: versionError } = await authorizedSupabase
        .from('project_versions')
        .insert({
          project_id: projectId,
          script_data: scriptJson,
          version_label: `v${(count || 0) + 1}`,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (versionError) {
        console.error('[ScriptGen] Version save failed:', versionError);
        throw versionError;
      }
      version = newVersion;
    }

    // 6. Update Project Status
    await authorizedSupabase
      .from('projects')
      .update({ 
        status: 'scripting'
      })
      .eq('id', projectId);

    // 7. Mark idea as used if applicable
      const ideaTitle = coreIdea;
      if (ideaTitle) {
        await authorizedSupabase
          .from('ideation_feed')
          .update({ status: 'used' })
          .eq('user_id', userId)
          .eq('topic_title', ideaTitle)
          .eq('status', 'new');
      }

    console.log(`[ScriptGen] Success: ${projectId}, Version: ${version.id}`);
    return NextResponse.json({
      success: true,
      script: scriptJson,
      projectId,
      versionId: version.id,
      onboardingIncomplete
    });

  } catch (error: any) {
    console.error('[ScriptGen] CRITICAL ERROR:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}
