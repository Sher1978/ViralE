import { SupabaseClient } from '@supabase/supabase-js';
import { getModel } from './ai/gemini';
import { safeJsonParse } from './utils';
import fs from 'fs';
import path from 'path';

export interface IdeaSuggestion {
  id?: string;
  topic_title: string;
  rationale: string;
  viral_potential_score: number;
  category?: string;
  created_at?: string;
}

function formatDNA(answers: any): string {
  if (!answers) return "Missing DNA.";
  
  // Map developer keys (from DNABlock.tsx) to methodology terms (from Bible_SOT)
  return `
    🧬 BRAND IDENTITY:
    - NICHE (Super-niша): ${answers.sphere || answers.niche || 'N/A'}
    - TARGET AUDIENCE (Avatar/Who): ${answers.audience || answers.target_audience || 'N/A'}
    - DEEP FEARS/PAINS (Pain Point): ${answers.painPoint || answers.pain_points || 'N/A'}
    - UNIQUE METHOD (Secret Sauce): ${answers.approach || answers.expertise || 'N/A'}
    - CONTENT GOAL: ${answers.goal || 'N/A'}
    - TONE OF VOICE: ${answers.tone || 'N/A'}
    - FINAL OFFER: ${answers.advantage || answers.final_offer || 'N/A'}
  `;
}

export async function generateDailyIdeas(
  supabase: SupabaseClient,
  userId: string,
  locale: string = 'en',
  category?: string
): Promise<IdeaSuggestion[]> {
  const targetCategory = category || "General";
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  let profile: any = null;
  try {
    // 0. Check total idea count for user
    const { count: totalIdeas } = await supabase
      .from('ideation_feed')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (totalIdeas && totalIdeas >= 200) {
      console.log(`User ${userId} reached 200 idea limit. Generation paused.`);
      return [];
    }
    
    // 1. Fetch user persona DNA, answers, storybrand content and tier
    const { data: fetchedProfile } = await supabase
      .from('profiles')
      .select('digital_shadow_prompt, storybrand_raw_content, industry_context, dna_answers, synthetic_training_data, tier')
      .eq('id', userId)
      .single();

    profile = fetchedProfile;

    const userFilePath = path.join(process.cwd(), 'Bible_SOT', 'users', userId, 'Brand_DNA.md');
    const hasFileStrategy = fs.existsSync(userFilePath);
    
    let dnaContext = "";
    let isDnaComplete = false;

    // PRIORITY 1: StoryBrand Document (Explicitly uploaded text strategy document)
    if (profile?.storybrand_raw_content && profile.storybrand_raw_content.trim().length > 20) {
      dnaContext = `🧬 STORYBRAND STRATEGY DOCUMENT:\n${profile.storybrand_raw_content}`;
      if (profile.digital_shadow_prompt && profile.digital_shadow_prompt.trim().length > 10) {
        dnaContext += `\n\n🧬 DIGITAL SHADOW PERSONA:\n${profile.digital_shadow_prompt}`;
      }
      isDnaComplete = true;
      console.log(`Using uploaded StoryBrand Document DNA for user ${userId}.`);
    }

    // PRIORITY 2: Digital Shadow Persona (Master prompt synthesized from onboarding or AI training)
    if (!isDnaComplete && profile?.digital_shadow_prompt && profile.digital_shadow_prompt.trim().length > 10) {
      dnaContext = `🧬 DIGITAL SHADOW DNA:\n${profile.digital_shadow_prompt}`;
      isDnaComplete = true;
      console.log(`Using Digital Shadow Prompt as DNA for user ${userId}.`);
    }

    // PRIORITY 3: Brand_DNA.md file from disk
    if (!isDnaComplete && hasFileStrategy) {
      try {
        dnaContext = fs.readFileSync(userFilePath, 'utf-8');
        isDnaComplete = true;
        console.log(`Using Brand_DNA.md file for user ${userId}.`);
      } catch (e) {
        console.error('Failed to read DNA file in ideation:', e);
      }
    }

    // PRIORITY 4: Database structured DNA form answers
    if (!isDnaComplete && profile?.dna_answers) {
      const dnaAnswers = profile.dna_answers || {};
      const validAnswersCount = Object.values(dnaAnswers).filter((v: any) => v && v.toString().length > 2).length;
      if (validAnswersCount > 0) {
        dnaContext = formatDNA(dnaAnswers);
        isDnaComplete = true;
        console.log(`Using Database DNA answers for user ${userId}.`);
      }
    }

    if (!isDnaComplete) {
      console.log(`User ${userId} has no custom Brand DNA. Using universal expert DNA context for idea generation.`);
      dnaContext = locale === 'ru'
        ? `🧬 BRAND IDENTITY (Универсальный эксперт):\n- Ниша: Экспертный бизнес, маркетинг, виральный контент и продажи.\n- ЦА: Предприниматели, фрилансеры и авторы контента, желающие вырасти в просмотрах и доходе.\n- Тон: Авторитетный, убедительный, с фокусом на глубокое удержание.`
        : `🧬 BRAND IDENTITY (Universal Expert):\n- Niche: Expert business, digital marketing, viral content, and conversion sales.\n- Target Audience: Entrepreneurs, creators, and professionals aiming to scale views and revenue.\n- Tone: Authoritative, persuasive, high-retention.`;
      isDnaComplete = true;
    }

    // Load Content Lego and General Script for ideation constraints
    let contentLego = "";
    let generalScript = "";
    try {
      const legoPath = path.join(process.cwd(), 'Bible_SOT', 'AI_prompts', 'Content_lego.md');
      contentLego = fs.readFileSync(legoPath, 'utf-8');
      const scriptPath = path.join(process.cwd(), 'Bible_SOT', 'AI_prompts', 'General_script.md');
      generalScript = fs.readFileSync(scriptPath, 'utf-8');
    } catch (e) {
      console.warn('AI prompt files not found for ideation');
    }

    const digitalShadow = profile?.digital_shadow_prompt || 'Expert Content Strategist.';

    // Pre-format context blocks to avoid complex template literal nesting
    const brandContextBlock = `--- ФАЙЛ: Brand_DNA.md (УНИКАЛЬНЫЙ ДОКУМЕНТ ПОЛЬЗОВАТЕЛЯ) ---\n${dnaContext}`;
    const strategicContextBlock = `STRATEGIC CONTEXT: ${digitalShadow}`;

    const randomSeed = Math.floor(Math.random() * 1000000);
    const prompt = `
      You are the "Viral Engine" Strategic Consultant.
      
      ${generalScript}
      
      --- ФАЙЛ: Content_lego.md ---
      ${contentLego}

      ${brandContextBlock}
      
      ${strategicContextBlock}

      RANDOM SEED (Force Unique Angles): ${randomSeed}
      TIMESTAMP: ${new Date().toISOString()}

      TASK: Generate 5 high-retention video topic ideas for the category: "${targetCategory}".
      IMPORTANT: Ensure these ideas are completely fresh, unique, creative, and different from any previous generations. Avoid repeating standard hooks or titles. Change the angles, perspectives, and examples dynamically!
      
      CONTENT STRATEGY (Ben Hunt's Ladder):
      Each category matches a stage in the awareness ladder. 
      Focus this specific generation on: "${targetCategory}".
      
      CRITICAL: All generated text content MUST BE STRICTLY IN ${languageName}! The user has chosen this interface language for their content. Even if the brand DNA or strategic context is in a different language (e.g. Russian), you MUST translate the context on the fly and generate the topic titles, rationales, and categories strictly in ${languageName}.
   
      FOR CATEGORY "${targetCategory}":
      - If "Hooks": Generate ONLY the first 5 seconds of a script. These should be viral eye-catchers. 
      - If "Roles": Generate ONLY "Personas" or "Stances" (e.g. "The Cynic", "The Enthusiast", "The Investigative Journalist").
      - If "Awareness": Focus on hooks for people who don't know they need the product yet.
      - If "Problem": Focus on direct pain points and struggles.
      - If "Solution": Focus on how the methodology or product solves specific issues.
      - If "Loyalty": Focus on social proof, brand values, or community.
      - If "Fast Sales": Sharp CTAs and urgent value.
      - If "Trends": Hook onto current viral formats suited to the brand DNA niche (do NOT mention cars or Dubai unless explicitly in user DNA).

      OUTPUT FORMAT: JSON array of 5 objects
      [
        {
          "topic_title": "Short, punchy title",
          "rationale": "Strategic reason why this works for this category",
          "viral_potential_score": 85-99,
          "category": "${targetCategory}"
        }
      ]
    `;

    const syntheticData = (profile?.synthetic_training_data as Record<string, any>) || {};
    const geminiApiKey = syntheticData.gemini_api_key || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || undefined;

    const fastModel = getModel('fast', locale, 'json', geminiApiKey);
    let text = '';
    let ideasArray: any[] = [];

    // Try up to 2 attempts to generate valid JSON array
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await fastModel.generateContent(
          attempt === 1 
            ? prompt 
            : `${prompt}\n\nCRITICAL RETRY: Output ONLY raw valid JSON array. Do not wrap in markdown or explanatory text.`
        );
        const response = await result.response;
        text = response.text().trim();

        const parsed = safeJsonParse<any>(text);
        if (Array.isArray(parsed)) {
          ideasArray = parsed;
        } else if (parsed && typeof parsed === 'object') {
          const candidateArray = parsed.ideas || parsed.topics || parsed.data || parsed.results || Object.values(parsed).find((val: any) => Array.isArray(val));
          if (Array.isArray(candidateArray)) {
            ideasArray = candidateArray;
          }
        }

        if (ideasArray.length > 0) {
          console.log(`[generateDailyIdeas:${targetCategory}] Successfully generated ${ideasArray.length} ideas on attempt ${attempt}.`);
          break;
        } else {
          console.warn(`[generateDailyIdeas:${targetCategory}] Attempt ${attempt} returned no ideas. Raw text snippet:`, text.slice(0, 250));
        }
      } catch (parseError: any) {
        console.warn(`[generateDailyIdeas:${targetCategory}] Attempt ${attempt} exception: ${parseError?.message || parseError}. Raw text snippet: "${text.slice(0, 250)}"`);
      }
    }

    if (ideasArray.length === 0) {
      // Fallback to Groq if configured
      const groqApiKey = profile?.groq_api_key || process.env.GROQ_API_KEY || undefined;
      if (groqApiKey) {
        try {
          const { generateDailyIdeas: generateGroqIdeas } = await import('./ai/groq');
          const groqIdeas = await generateGroqIdeas(prompt, locale, groqApiKey);
          if (Array.isArray(groqIdeas) && groqIdeas.length > 0) {
            ideasArray = groqIdeas;
            console.log(`[generateDailyIdeas:${targetCategory}] Groq fallback successfully generated ${ideasArray.length} ideas.`);
          }
        } catch (groqErr) {
          console.warn(`[generateDailyIdeas:${targetCategory}] Groq fallback failed:`, groqErr);
        }
      }
    }

    if (ideasArray.length === 0) {
      // Notify Telegram Bot of AI Ideation Failure only if ALL providers failed
      try {
        const { notifyAdminError } = await import('@/lib/telegram');
        notifyAdminError({
          source: 'AI Ideation Generator',
          error: new Error(`Ideation returned no items for category ${targetCategory}`),
          userId,
          extra: {
            location: 'ideation.ts:generateDailyIdeas',
            category: targetCategory,
            locale,
            botTarget: '@Viralengin_bot'
          }
        }).catch(() => {});
      } catch (e) {}
    }

    if (ideasArray.length > 0) {
      return ideasArray.map((i: any) => ({ 
        topic_title: i.topic_title || (locale === 'ru' ? 'Виральная идея' : 'Viral Topic Idea'),
        rationale: i.rationale || '',
        viral_potential_score: typeof i.viral_potential_score === 'number' ? i.viral_potential_score : 88,
        category: targetCategory 
      }));
    }
  } catch (outerErr: any) {
    console.warn(`[generateDailyIdeas:${targetCategory}] Caught outer exception during generation for user ${userId}:`, {
      message: outerErr?.message || String(outerErr),
      stack: outerErr?.stack,
      category: targetCategory,
      locale
    });
  }

  // Smart Dynamic Fallback: Construct persona-specific, non-repeating ideas directly from user's StoryBrand / Brand DNA
  const dnaAnswers = profile?.dna_answers || {};
  let sphere = (dnaAnswers.sphere || dnaAnswers.niche || profile?.industry_context || 'жизни и бизнесе в ЮВА').split(',')[0].split('.')[0].trim();
  if (sphere.length > 45) sphere = sphere.slice(0, 42) + '...';
  
  let pain = (dnaAnswers.painPoint || dnaAnswers.pain_points || 'безопасности и риска скама').split(',')[0].split('.')[0].trim();
  if (pain.length > 45) pain = pain.slice(0, 42) + '...';

  let advantage = (dnaAnswers.advantage || dnaAnswers.approach || 'экосистеме безопасности').split(',')[0].split('.')[0].trim();
  if (advantage.length > 45) advantage = advantage.slice(0, 42) + '...';

  console.warn(`[generateDailyIdeas:${targetCategory}] Returning dynamic DNA-tailored fallback ideas for user ${userId}.`);
  
  if (targetCategory === "Problem" || targetCategory === "Зеркало болей") {
    return [
      {
        topic_title: locale === 'ru' ? `Главные риски в сфере «${sphere}»: Как не потерять ресурсы` : `Top risks in "${sphere}": How to protect your assets`,
        rationale: locale === 'ru' ? `Закрывает ключевую боль аудитории: ${pain}` : `Addresses primary audience struggle: ${pain}`,
        viral_potential_score: 94,
        category: targetCategory
      },
      {
        topic_title: locale === 'ru' ? `3 скрытые схемы обмана, о которых молчат в «${sphere}»` : `3 hidden scam schemes nobody talks about in "${sphere}"`,
        rationale: locale === 'ru' ? 'Остросоциальный разоблачительный триггер высокой кликабельности' : 'Highly viral investigative provocative hook',
        viral_potential_score: 96,
        category: targetCategory
      }
    ];
  }

  if (targetCategory === "Solution" || targetCategory === "Решения") {
    return [
      {
        topic_title: locale === 'ru' ? `Как гарантированно решить проблему: ${pain}` : `How to solve "${pain}" with certainty`,
        rationale: locale === 'ru' ? `Пошаговый разбор метода: ${advantage}` : `Step-by-step breakdown of proprietary framework`,
        viral_potential_score: 93,
        category: targetCategory
      },
      {
        topic_title: locale === 'ru' ? `Пошаговый алгоритм безопасности в «${sphere}»` : `Step-by-step security framework in "${sphere}"`,
        rationale: locale === 'ru' ? 'Структурированное экспертное решение для аудитории' : 'High value structured authority offer',
        viral_potential_score: 91,
        category: targetCategory
      }
    ];
  }

  return [
    {
      topic_title: locale === 'ru' ? `Главная ошибка в «${sphere}» в 2026 году` : `The #1 critical mistake in "${sphere}" in 2026`,
      rationale: locale === 'ru' ? `Основано на нише бренда: ${sphere}` : `Tailored to user's specific niche: ${sphere}`,
      viral_potential_score: 92,
      category: targetCategory
    },
    {
      topic_title: locale === 'ru' ? `Как построить надежную систему в «${sphere}»` : `How to establish systemic safety in "${sphere}"`,
      rationale: locale === 'ru' ? `Основано на преимуществе: ${advantage}` : `Based on brand advantage: ${advantage}`,
      viral_potential_score: 95,
      category: targetCategory
    }
  ];
}

export async function saveIdeasToFeed(supabase: SupabaseClient, userId: string, ideas: IdeaSuggestion[]) {
  try {
    const { error } = await supabase
      .from('ideation_feed')
      .insert(
        ideas.map(idea => ({
          user_id: userId,
          topic_title: idea.topic_title,
          rationale: idea.rationale,
          viral_potential_score: idea.viral_potential_score,
          category: idea.category,
          metadata: { 
            created_at: new Date().toISOString()
          },
          status: 'new'
        }))
      );
    if (error) {
      console.error('[saveIdeasToFeed] Database insertion error for user', userId, ':', error);
    } else {
      console.log(`[saveIdeasToFeed] Saved ${ideas.length} ideas for user ${userId}.`);
    }
  } catch (e: any) {
    console.error('[saveIdeasToFeed] Exception saving ideas to database:', { userId, message: e?.message, stack: e?.stack });
  }
}
