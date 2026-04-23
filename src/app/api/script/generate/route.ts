import { NextResponse } from 'next/server';
import { generateScript } from '@/lib/ai/gemini';
import { deductCredits, CREDIT_COSTS } from '@/lib/credits';
import { getAuthContext } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    let { projectId, coreIdea, locale = 'en', mode = 'initial', instruction, currentScript, versionId: targetVersionId } = await req.json();

    console.log(`[ScriptGen] Mode: ${mode}, Locale: ${locale}, ProjectID: ${projectId || 'NEW'}`);

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

    // 2. Get Digital Shadow (Allow fallback if profile is missing or field is empty)
    const { data: profile, error: profileError } = await authorizedSupabase
      .from('profiles')
      .select('digital_shadow_prompt')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('[ScriptGen] Profile fetch warning:', profileError);
    }

    const digitalShadow = profile?.digital_shadow_prompt || '';
    const onboardingIncomplete = !digitalShadow;

    // 3. Transact Credits
    try {
      const cost = mode === 'refine' ? CREDIT_COSTS.REGENERATE_BLOCK : CREDIT_COSTS.GENERATE_SCRIPT;
      console.log(`[ScriptGen] Deducting ${cost} credits...`);
      await deductCredits(authorizedSupabase, userId, cost, mode === 'refine' ? 'SCRIPT_REFINEMENT' : 'SCRIPT_GEN', projectId);
    } catch (e: any) {
      if (e.message === 'INSUFFICIENT_CREDITS') {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
      }
      throw e;
    }

    // 4. Generate or Refine Script (with mock fallback)
    let scriptJson;
    try {
      const activeApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
      if (!activeApiKey || activeApiKey === 'your_gemini_api_key') {
        console.warn('[ScriptGen] Gemini API Key is missing or dummy. Using mock fallback.');
        throw new Error('MOCK_MODE');
      }

      if (mode === 'refine') {
        console.log(`[ScriptGen] Refining script with instruction: ${instruction}`);
        const { refineScript } = await import('@/lib/ai/gemini');
        scriptJson = await refineScript(currentScript, instruction, digitalShadow, locale);
      } else {
        console.log(`[ScriptGen] Generating initial script for idea: ${coreIdea}`);
        scriptJson = await generateScript(coreIdea, digitalShadow, locale);
      }
    } catch (error: any) {
      console.warn('[ScriptGen] Generation failed or bypassed. Using mock fallback:', error.message);
      
      // Structured fallback content
      if (locale === 'ru') {
        scriptJson = {
          hook: "Секрет раскрыт",
          intro: `Сегодня мы поговорим про ${coreIdea || 'этот тренд'}. Почему это важно прямо сейчас?`,
          body: `Вот 3 причины, почему ${coreIdea || 'это'} работает. Во-первых, это системность. Во-вторых, это внимание к деталям. И в-третьих, это Viral Engine.`,
          cta: "Подпишись, чтобы качать свой Digital DNA!"
        };
      } else {
        scriptJson = {
          hook: "Secret Unlocked",
          intro: `Today we dive into ${coreIdea || 'this topic'}. Why does it matter right now?`,
          body: `Here are 3 reasons why ${coreIdea || 'it'} works. First, consistency. Second, attention to detail. And third, Viral Engine.`,
          cta: "Follow to upgrade your Digital DNA!"
        };
      }
    }

    // 5. Save Version
    let version;
    if (mode === 'refine' && targetVersionId) {
      console.log(`[ScriptGen] Updating version: ${targetVersionId}`);
      const { data: updatedVersion, error: updateError } = await authorizedSupabase
        .from('project_versions')
        .update({
          script_data: scriptJson,
          updated_at: new Date().toISOString()
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
        status: 'scripting',
        updated_at: new Date().toISOString()
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
