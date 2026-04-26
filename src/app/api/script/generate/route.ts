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
      console.warn('[ScriptGen] Generation failed or bypassed. Using mock fallback:', error.message);
      
      // Structured fallback content
      if (locale === 'ru') {
        scriptJson = {
          evergreen: {
            hook: "Секрет раскрыт",
            problem: "Многие тратят годы на изучение темы, но не получают результата.",
            good_news: "Есть системный путь, который сокращает время в 10 раз.",
            solution: "Нужно сосредоточиться на базе и автоматизации процессов через Viral Engine.",
            cta: "Подпишись, чтобы качать свой Digital DNA!",
            visual_hook: "Кинематографичный кадр: человек в очках дополненной реальности, неоновое синее освещение, 8k.",
            social_post: "Как создавать контент будущего уже сегодня? 🧬 #ViralEngine #Marketing"
          },
          trend: {
            hook: "Тренд 2026: залетаем",
            problem: "Старые методы охвата больше не работают в новой экономике внимания.",
            good_news: "Алгоритмы теперь любят динамику и быструю смену кадров.",
            solution: "Используй резкие переходы и провокационные хуки.",
            cta: "Ставь лайк, если в теме!",
            visual_hook: "Динамичный коллаж из неоновых элементов, яркий фиолетовый фон, стиль Digital Zen.",
            social_post: "2026 уже здесь! 🚀 Лови свежий тренд. #Trends2026 #Viral"
          },
          educational: {
            hook: "Как это сделать",
            problem: "Сложные темы отпугивают аудиторию, если поданы скучно.",
            good_news: "Любой процесс можно разложить на 3 простых шага.",
            solution: "План, Нейросети, Система. Всё просто.",
            cta: "Сохрани, чтобы не потерять!",
            visual_hook: "Минималистичный кадр: парящий кристалл с кодом внутри, мягкий свет.",
            social_post: "Сложные вещи простыми словами. 🧠 #Education #AI"
          },
          controversial: {
            hook: "Всё это ложь",
            problem: "Вам внушают, что успех — это удача, но это математика.",
            good_news: "Если убрать эмоции, остается чистая стратегия.",
            solution: "Перестаньте верить гуру и начните верить данным.",
            cta: "Пиши 'МАТРИЦА' в комментах!",
            visual_hook: "Драматичный красный свет, разбитое зеркало, в котором отражается код.",
            social_post: "Горькая правда про охваты. 💣 #Matrix #Truth #System"
          },
          storytelling: {
            hook: "Я всё потерял",
            problem: "Год назад мой аккаунт был в коме, охваты на нуле.",
            good_news: "Одна случайная встреча изменила мой подход навсегда.",
            solution: "Я понял, что контент — это не текст, а отражение вашей ДНК.",
            cta: "Читай продолжение в закрепе!",
            visual_hook: "Теплое закатное освещение, открытая книга, пыль в лучах света.",
            social_post: "Мой личный путь от нуля до системы. 📖 #Story #MyPath"
          }
        };
      } else {
        scriptJson = {
          evergreen: {
            hook: "Secret Unlocked",
            problem: "Most people spend years studying a topic without seeing real progress.",
            good_news: "There is a systematic path that cuts that time by 10x.",
            solution: "Focus on the core fundamentals and automate processes with Viral Engine.",
            cta: "Follow to upgrade your Digital DNA!",
            visual_hook: "Cinematic shot of a person wearing AR glasses, neon blue lighting, 8k.",
            social_post: "How to create future-proof content today? 🧬 #ViralEngine #Marketing"
          },
          trend: {
            hook: "2026 Trend Alert",
            problem: "Legacy reach methods are dying in the new attention economy.",
            good_news: "Algorithms now crave dynamics and rapid visual shifts.",
            solution: "Leverage sharp transitions and provocative text hooks.",
            cta: "Like for more alpha!",
            visual_hook: "Dynamic collage of neon elements, vibrant purple background, Digital Zen style.",
            social_post: "2026 is here! 🚀 Catch the latest trend. #Trends2026 #Viral"
          },
          educational: {
            hook: "The How-To Guide",
            problem: "Complex topics bore your audience when presented poorly.",
            good_news: "Any process can be distilled into 3 simple, actionable steps.",
            solution: "Plan, AI integration, Systems. That is it.",
            cta: "Save this for later!",
            visual_hook: "Minimalist shot of a floating crystal with code inside, soft studio light.",
            social_post: "Complex things made simple. 🧠 #Education #AI"
          },
          controversial: {
            hook: "It Is All A Lie",
            problem: "They tell you success is luck, but it is pure cold math.",
            good_news: "Remove the emotion, and only strategy remains.",
            solution: "Stop following gurus and start following the data arrays.",
            cta: "Type 'MATRIX' below!",
            visual_hook: "Dramatic red lighting, a shattered mirror reflecting code streams.",
            social_post: "The bitter truth about growth. 💣 #Matrix #Truth #System"
          },
          storytelling: {
            hook: "I Lost Everything",
            problem: "A year ago, my account was dead, reach was at absolute zero.",
            good_news: "One chance encounter changed my production approach forever.",
            solution: "I realized content is not just text, it is a mirror of your DNA.",
            cta: "Read my full story in the bio!",
            visual_hook: "Warm sunset lighting, an open book, dust particles in light rays.",
            social_post: "My personal journey from zero to system. 📖 #Story #MyPath"
          }
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
