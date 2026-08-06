import { NextResponse } from 'next/server';
import { getModel } from '@/lib/ai/gemini';
import { getAuthContext } from '@/lib/auth';
import { withRetry } from '@/lib/ai/retry';
import { IgCarouselSchema } from '@/lib/schemas/ig-carousel';
import { safeJsonParse } from '@/lib/utils';
import { extractSignaturePhrases } from '@/lib/ai/dna-extractor';
import { polishCriticalSlides } from '@/lib/ai/slide-polisher';
import { preprocessSubtitles } from '@/lib/utils/subtitle-preprocessor';
import { hashText } from '@/lib/utils/hash';
import { profileService } from '@/lib/services/profileService';

import { parseScriptTextToPayload } from '@/lib/studio-utils';

export const maxDuration = 60;
export const runtime = 'nodejs';


const STYLE_PREFIXES: Record<string, string> = {
  dubai_platinum: 'Ultra-luxury high-end photography, gold and white ambient tones, clean minimal elite background, architectural depth, studio lighting',
  tech_catalyst:  'Sleek minimal technology layout, deep dark canvas, electric neon cyan and violet highlights, blurred graphical UI matrices',
  turbo_dynamics: 'Dynamic high-energy cinematography, sharp metal texture overlays, dark industrial aesthetic with hot orange accent lighting',
  human_os:       'Warm gentle natural sunlight, soft focus bokeh, organic beige and sage tones, peaceful rustic film grain, Kodak Portra aesthetic',
  shadow_audit:   'High-contrast monochrome geometric lines, brutalist architecture, bold volumetric play of deep shadows and light',
  startup_valley: 'Vibrant modern creative agency vibe, colorful dynamic gradients, glowing workspace background, energetic professional aesthetic',
};

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = auth.user.id;
    const authorizedSupabase = auth.supabase;

    const { 
      scriptText, 
      projectId, 
      ideaTitle = '',
      locale = 'ru', 
      ctaWord = '', 
      toneMode = 'mentor', 
      styleSeed = 42, 
      userBrief = '',
      customVisualDna = null
    } = await req.json();

    if (!scriptText) {
      return NextResponse.json({ error: 'Script text is required' }, { status: 400 });
    }

    const VALID_TONES = ['expert', 'mentor', 'provocateur'] as const;
    const resolvedTone = (VALID_TONES.includes(toneMode as any) ? toneMode : 'mentor') as typeof VALID_TONES[number];

    // 1. Fetch User DNA & DB Profile (Core Fields) - Wrapped in fallback to be resilient
    let profile: any = null;
    try {
      const { data, error: profileErr } = await authorizedSupabase
        .from('profiles')
        .select('digital_shadow_prompt, visual_style, knowledge_base_json, visual_dna_config')
        .eq('id', userId)
        .single();
      
      if (!profileErr && data) {
        profile = data;
      } else {
        console.warn('[ig-carousel API] Core Profile fetch warning (using defaults):', profileErr);
      }
    } catch (e) {
      console.warn('[ig-carousel API] Core Profile query failed (using defaults):', e);
    }

    const { brandContext } = await profileService.getActiveBrandContext(userId, authorizedSupabase);
    const userDNA = brandContext || profile?.digital_shadow_prompt || 'Niche: General Content Creator. Tone: Professional but engaging.';
    const visualStyleKey = profile?.visual_style || 'startup_valley';
    
    // Resolve visual stylePrefix prioritizing user custom Visual DNA configuration
    const customConfig = customVisualDna || profile?.visual_dna_config as any;
    const stylePrefix = customConfig?.image_generation_dna?.master_prefix 
      || STYLE_PREFIXES[visualStyleKey] 
      || STYLE_PREFIXES.startup_valley;

    // 2. Fetch Project Metadata Context
    let projectTitle = ideaTitle || '';
    let projectTopic = '';
    let projectNiche = '';
    
    if (projectId) {
      const { data: project } = await authorizedSupabase
        .from('projects')
        .select('title, input_source, metadata')
        .eq('id', projectId)
        .single();
      
      if (project) {
        if (!projectTitle) projectTitle = project.title || '';
        const meta = (project.metadata || {}) as Record<string, any>;
        projectTopic = project.input_source || meta.topic || meta.concept || '';
        projectNiche = meta.niche || meta.industry || '';
      }
    }

    // 3. Optional DNA Cache Verification (Resilient to missing schema columns)
    let distilledDna = null;
    let cacheUpdatedAt = null;
    let supportsDnaCache = true;

    try {
      const { data: cacheData, error: cacheErr } = await authorizedSupabase
        .from('profiles')
        .select('carousel_dna_cache, carousel_dna_cache_updated_at')
        .eq('id', userId)
        .single();

      if (!cacheErr && cacheData) {
        const potentialDna = cacheData.carousel_dna_cache;
        const isValidDna = potentialDna && 
          typeof potentialDna === 'object' && 
          Array.isArray(potentialDna.signature_phrases) && 
          Array.isArray(potentialDna.audience_pain_words) && 
          Array.isArray(potentialDna.forbidden_words);

        if (isValidDna) {
          distilledDna = potentialDna;
          cacheUpdatedAt = cacheData.carousel_dna_cache_updated_at;
        } else {
          console.warn('[ig-carousel API] Cached DNA profile exists but has invalid schema shape. Forcing fresh distillation.');
        }
      } else if (cacheErr && (cacheErr.code === '42703' || cacheErr.message?.includes('does not exist'))) {
        console.log('[ig-carousel API] carousel_dna_cache columns do not exist. Running in transient DNA mode.');
        supportsDnaCache = false;
      }
    } catch (cacheFetchErr) {
      console.log('[ig-carousel API] Cache retrieval exception, running in transient DNA mode.');
      supportsDnaCache = false;
    }

    const isCacheFresh = cacheUpdatedAt && (Date.now() - new Date(cacheUpdatedAt).getTime() < 7 * 24 * 60 * 60 * 1000);

    if (!distilledDna || !isCacheFresh) {
      console.log('[ig-carousel API] Distilling fresh persona features...');
      distilledDna = await extractSignaturePhrases(userDNA, profile?.knowledge_base_json || {}, locale);
      
      if (supportsDnaCache) {
        try {
          await authorizedSupabase
            .from('profiles')
            .update({
              carousel_dna_cache: distilledDna,
              carousel_dna_cache_updated_at: new Date().toISOString()
            })
            .eq('id', userId);
          console.log('[ig-carousel API] DNA Cache updated successfully.');
        } catch (updateErr) {
          console.warn('[ig-carousel API] DNA Cache save skipped:', updateErr);
        }
      }
    } else {
      console.log('[ig-carousel API] DNA Cache hit!');
    }

    // 4. Preprocess Subtitles (Phase 3.1)
    const processedSubs = preprocessSubtitles(scriptText);

    // 5. Generate Text & Image Prompts via Gemini Flash
    const model = getModel('fast', locale, 'json');

    const activeLanguage = locale === 'ru' ? 'Russian' : 'English';

    const systemPrompt = `
      Роль: Ты — ведущий ИИ-дизайнер Instagram-галерей в приложении ViralE.
      Твоя задача — превратить субтитры видео и тему в структурированную 6-слайдовую карусель (AR 4:5).

      TONE_STYLE_MODE: ${resolvedTone} (Генерируй тексты слайдов строго в соответствии с этой моделью вещания)
      - expert: упор на данные, тезисы, профессиональный авторитет, лаконичные формулировки.
      - mentor: доверительный, эмпатичный, разделяющий переживания, опирающийся на личный путь автора.
      - provocateur: интригующий, подвергающий сомнению шаблоны, бросающий вызов стереотипам.

      USER_DNA_CONTEXT:
      - Niche/Style: ${userDNA}
      - Характерные речевые фразы: ${JSON.stringify(distilledDna.signature_phrases)}
      - Описания болей аудитории: ${JSON.stringify(distilledDna.audience_pain_words)}

      PROJECT_CONTEXT:
      - Title / Matrix Idea: "${projectTitle}"
      - Topic: "${projectTopic}"
      - Niche: "${projectNiche}"

      ${userBrief ? `ОСОБЫЕ ПОЖЕЛАНИЯ КЛИЕНТА:\n"${userBrief}"\n` : ''}

      RAW_SUBTITLES_TRANSCRIPTION (Субтитры из монтажки):
      - Введение: "${processedSubs.intro}"
      - Основная часть: "${processedSubs.body}"
      - Заключение: "${processedSubs.conclusion}"
      - Главные фразы: ${JSON.stringify(processedSubs.key_sentences)}

      ИНСТРУКЦИИ ДЛЯ СЛАЙДОВ (Ровно 6 слайдов, AR 4:5):
      1. СЛАЙД 1 (ОБЛОЖКА):
         - text_on_slide: Главный сочный заголовок темы из текста/скрипта ("${projectTitle || 'Хук вашей видео-идеи'}"). Сделай его ярким, интригующим и капсом. Ключевые слова выдели заглавными буквами или кавычками.
         - image_prompt: Создай высококачественный, кинематографичный промпт на английском языке для генерации ФОТООБЛОЖКИ в контексте темы (например: "Cinematic portrait of a male professor in a lush pine forest touching a ancient tree trunk, natural sunlight filtering through green leaves, highly detailed 8k photography, bokeh background --no text").
      2. СЛАЙДЫ 2-6 (ОСНОВНЫЕ СЛАЙДЫ — ДВУХЭТАЖНЫЙ ТЕКСТ: ТЕЗИС + ПОЯСНЕНИЕ):
         - text_on_slide: СТРОГО ЛИМИТИРУЙ ДЛИНУ ТЕКСТА: 12-18 слов на слайд (не более 140 символов всего!). Форматируй текст в ДВА ЭТАЖА через перенос строки '\n':
           Строка 1 (Тезис): Емкий, громкий заголовок (3-5 слов, ЗАГЛАВНЫМИ БУКВАМИ).
           Символ переноса строки '\n'
           Строка 2 (Пояснение): 1 четкая емкая мысль (8-12 слов).
           Пример: "ГЛАВНАЯ ОШИБКА ЭКСПЕРТОВ\n90% авторов сливают трафик, потому что не делают понятный призыв к действию в первых 3 секундах."
         - image_prompt: ОСТАВЬ ПУСТОЙ СТРОКОЙ ("").
      3. ОПИСАНИЕ ПОСТА (post_description):
         - Создай вирусный текст поста для Instagram/TikTok: цепляющий хук в первой строчке, 3-4 ключевых тезиса с эмодзи, понятный призыв к действию (написать кодовое слово или сохранить пост) и 5-8 целевых хэштегов.

      ВЫДАЙ СТРОГИЙ JSON (БЕЗ MARKDOWN, ТОЛЬКО JSON):
      {
        "cta_word": "кодовое слово",
        "central_metaphor": "метафора обложки",
        "visual_style_prefix": "${stylePrefix}",
        "post_description": "Яркий пост для Instagram/TikTok...",
        "slides": [
          {
            "slide_number": 1,
            "role": "hook",
            "text_on_slide": "Заголовок для Слайда 1",
            "image_prompt": "Cinematic visual prompt for Slide 1 cover...",
            "metaphor_tag": "cover_concept"
          },
          {
            "slide_number": 2,
            "role": "problem",
            "text_on_slide": "ГЛАВНАЯ ПРОБЛЕМА СИСТЕМЫ\nПодробное объяснение проблемы и причин её возникновения...",
            "image_prompt": "",
            "metaphor_tag": ""
          },
          {
            "slide_number": 3,
            "role": "pivot",
            "text_on_slide": "ПОЧЕМУ СТАРЫЕ МЕТОДЫ НЕ РАБОТАЮТ\nРаскрытие ошибки и демонстрация нового взгляда на решение...",
            "image_prompt": "",
            "metaphor_tag": ""
          },
          {
            "slide_number": 4,
            "role": "takeaway1",
            "text_on_slide": "КЛЮЧЕВОЙ РЕЗУЛЬТАТ И РЕШЕНИЕ\nПрактический алгоритм действий, приводящий к быстрому результату...",
            "image_prompt": "",
            "metaphor_tag": ""
          },
          {
            "slide_number": 5,
            "role": "takeaway2",
            "text_on_slide": "СЕКРЕТНЫЙ РЕЧАГ УСКОРЕНИЯ\nКак масштабировать эффект и сэкономить десятки часов работы...",
            "image_prompt": "",
            "metaphor_tag": ""
          },
          {
            "slide_number": 6,
            "role": "cta",
            "text_on_slide": "ЗАБЕРИТЕ ПОЛНОЕ РУКОВОДСТВО\nПишите кодовое слово в комментариях, чтобы получить материалы...",
            "image_prompt": "",
            "metaphor_tag": ""
          }
        ]
      }

    `;

    // 6. Execute Flash AI request withRetry
    const responseText = await withRetry(async () => {
      const result = await model.generateContent(systemPrompt);
      return result.response.text();
    }, 2);

    let cleanJson = responseText.trim();
    // Strip markdown formatting if AI outputs it despite the strict constraint
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*|```$/g, '').trim();
    }

    let parsedCarousel: any;
    try {
      parsedCarousel = safeJsonParse(cleanJson);
    } catch (parseErr: any) {
      console.error('[ig-carousel API JSON Parse Error]:', parseErr.message);
      throw parseErr;
    }

    // 7. Enforce Schema via Zod with automatic repair/fallback
    let validatedCarousel: any;
    const parseResult = IgCarouselSchema.safeParse(parsedCarousel);
    if (parseResult.success) {
      validatedCarousel = parseResult.data;
    } else {
      console.warn('[ig-carousel API] Zod validation failed. Repairing parsed payload...', parseResult.error.format());
      
      const raw = parsedCarousel || {};
      const slides = Array.isArray(raw.slides) ? raw.slides : [];
      const repairedSlides = [];
      const roles = ['hook', 'problem', 'pivot', 'takeaway1', 'takeaway2', 'cta'] as const;
      
      for (let i = 0; i < 6; i++) {
        const rawSlide = slides[i] || {};
        const role = roles[i];
        
        let slideText = rawSlide.text_on_slide || rawSlide.text || '';
        if (typeof slideText !== 'string' || slideText.length < 3) {
          slideText = `Слайд ${i + 1}: ${scriptText.slice(0, 50)}...`;
        }
        if (slideText.length > 180) {
          slideText = slideText.slice(0, 177) + '...';
        }
        
        let imgPrompt = rawSlide.image_prompt || rawSlide.prompt || '';
        if (typeof imgPrompt !== 'string' || imgPrompt.length < 20) {
          imgPrompt = `conceptual visualization of scene representing ${role}`;
        }
        
        repairedSlides.push({
          slide_number: i + 1,
          role: role,
          text_on_slide: slideText,
          image_prompt: imgPrompt,
          metaphor_tag: String(rawSlide.metaphor_tag || raw.central_metaphor || 'metaphor')
        });
      }
      
      validatedCarousel = {
        cta_word: String(raw.cta_word || ctaWord || 'DETAILS'),
        central_metaphor: String(raw.central_metaphor || 'success metaphor'),
        visual_style_prefix: String(raw.visual_style_prefix || stylePrefix),
        post_description: typeof raw.post_description === 'string' && raw.post_description.length >= 50
          ? raw.post_description 
          : `${raw.post_description || ''}\n\nСмотрите карусель полностью, чтобы узнать все секреты! Пишите кодовое слово ${ctaWord || 'ПОЛУЧИТЬ'} в комментариях под этим постом!`,
        slides: repairedSlides
      };
    }

    // 8. Copywriting Polish for Slide 1 & 6 (Phase 3.4)
    const resolvedCtaWord = validatedCarousel.cta_word || ctaWord || 'DETAILS';
    const slide1 = validatedCarousel.slides.find((s: any) => s.slide_number === 1);
    const slide6 = validatedCarousel.slides.find((s: any) => s.slide_number === 6);
    
    if (slide1 && slide6) {
      console.log('[ig-carousel API] Triggering Gemini Pro copywriting polish for Slides 1 & 6 with 8s timeout...');
      let timerId: any = null;
      try {
        const polishPromise = polishCriticalSlides(
          slide1.text_on_slide,
          slide6.text_on_slide,
          resolvedTone,
          resolvedCtaWord,
          locale
        );

        const timeoutPromise = new Promise<any>((resolve) => {
          timerId = setTimeout(() => {
            console.warn('[ig-carousel API] Copywriting polish timed out. Falling back to original slides.');
            resolve({
              polished_hook: slide1.text_on_slide,
              polished_cta: slide6.text_on_slide
            });
          }, 8000);
        });

        const polished = await Promise.race([polishPromise, timeoutPromise]);
        
        slide1.text_on_slide = polished.polished_hook;
        slide6.text_on_slide = polished.polished_cta;
      } catch (polishErr) {
        console.error('[ig-carousel API] Copywriting polish failed, using transient defaults:', polishErr);
      } finally {
        if (timerId) {
          clearTimeout(timerId);
        }
      }
    }

    // 9. Attach Source Hash for Memoization (Phase 4.1)
    const sourceHash = hashText(scriptText + resolvedTone + resolvedCtaWord + userBrief);
    const finalPayload = {
      ...validatedCarousel,
      cta_word: resolvedCtaWord,
      _sourceHash: sourceHash,
      styleSeed: styleSeed
    };

    return NextResponse.json(finalPayload);

  } catch (err: any) {
    console.error('[Instagram Carousel API Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error occurred' }, { status: 500 });
  }
}
