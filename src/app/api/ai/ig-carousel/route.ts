import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAuthContext } from '@/lib/auth';
import { withRetry } from '@/lib/ai/retry';
import { IgCarouselSchema } from '@/lib/schemas/ig-carousel';
import { extractSignaturePhrases } from '@/lib/ai/dna-extractor';
import { polishCriticalSlides } from '@/lib/ai/slide-polisher';
import { preprocessSubtitles } from '@/lib/utils/subtitle-preprocessor';
import { hashText } from '@/lib/utils/hash';

export const maxDuration = 60;
export const runtime = 'nodejs';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

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

    const userDNA = profile?.digital_shadow_prompt || 'Niche: General Content Creator. Tone: Professional but engaging.';
    const visualStyleKey = profile?.visual_style || 'startup_valley';
    
    // Resolve visual stylePrefix prioritizing user custom Visual DNA configuration
    const customConfig = customVisualDna || profile?.visual_dna_config as any;
    const stylePrefix = customConfig?.image_generation_dna?.master_prefix 
      || STYLE_PREFIXES[visualStyleKey] 
      || STYLE_PREFIXES.startup_valley;

    // 2. Fetch Project Metadata Context
    let projectTitle = '';
    let projectTopic = '';
    let projectNiche = '';
    
    if (projectId) {
      const { data: project } = await authorizedSupabase
        .from('projects')
        .select('title, input_source, metadata')
        .eq('id', projectId)
        .single();
      
      if (project) {
        projectTitle = project.title || '';
        // Map from input_source or metadata dynamically
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
      
      // Update DB DNA Cache if supported
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
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const activeLanguage = locale === 'ru' ? 'Russian' : 'English';

    const systemPrompt = `
      Роль: Ты — ведущий ИИ-дизайнер Instagram-галерей в приложении ViralE.
      Твоя задача — превратить субтитры видео в структурированную 6-слайдовую карусель (AR 4:5), отражающую "Цифровую ДНК" автора.

      TONE_STYLE_MODE: ${resolvedTone} (Генерируй тексты слайдов строго в соответствии с этой моделью вещания)
      - expert: упор на данные, тезисы, профессиональный авторитет, лаконичные формулировки.
      - mentor: доверительный, эмпатичный, разделяющий переживания, опирающийся на личный путь автора.
      - provocateur: интригующий, подвергающий сомнению шаблоны, бросающий вызов стереотипам.

      USER_DNA_CONTEXT:
      - Niche/Style: ${userDNA}
      - Характерные речевые фразы для интеграции: ${JSON.stringify(distilledDna.signature_phrases)}
      - Описания болей аудитории: ${JSON.stringify(distilledDna.audience_pain_words)}
      - Запрещенные клише: ${JSON.stringify(distilledDna.forbidden_words)}

      PROJECT_CONTEXT:
      - Title: "${projectTitle}"
      - Topic: "${projectTopic}"
      - Niche: "${projectNiche}"

      ${userBrief ? `ОСОБЫЕ ПОЖЕЛАНИЯ КЛИЕНТА (Учти их, адаптировав под DNA и сохранив 6-слайдовую структуру):\n"${userBrief}"\n` : ''}

      RAW_SUBTITLES_SEGMENTED:
      - Введение (Хук видео): "${processedSubs.intro}"
      - Основная часть (Ключевая польза): "${processedSubs.body}"
      - Заключение (Выводы): "${processedSubs.conclusion}"
      - Главные предложения: ${JSON.stringify(processedSubs.key_sentences)}

      ИНСТРУКЦИИ ДЛЯ СЛАЙДОВ (Ровно 6 слайдов, AR 4:5):
      1. Выбери ОДНУ центральную смысловую метафору для визуализации ("central_metaphor", например: "развилка дорог", "строительство здания", "шахматный эндшпиль"). Она должна объединить всю серию фонов.
      2. Сформируй промпты для фонов. Каждый промпт должен начинаться со стиля: "${stylePrefix}" и содержать элемент выбранной метафоры. Промпты должны быть без текста!
      3. Напиши лаконичный текст оверлея на слайдах ("text_on_slide") строго на языке: ${activeLanguage} (макс. 10-15 слов на слайд для моментального считывания). Интегрируй signature_phrases там, где уместно.

      ИНСТРУКЦИИ ДЛЯ КАПШЕНА (post_description):
      1. Описание поста ("post_description") должно быть ярким, эмоциональным, вовлекающим и динамичным.
      2. Обязательно используй множество релевантных эмодзи по всему тексту, особенно в начале абзацев и списков, чтобы привлечь внимание.
      3. Сформируй четкие, структурированные списки с буллет-поинтами (используй эмодзи в качестве маркеров списка, например: 🔥, 📌, 👉, ✅).
      4. Раздели текст на легко читаемые короткие абзацы (не пиши сплошной простыней).
      5. Включи мощный призыв написать кодовое слово "${ctaWord || 'тематическое слово'}" в комментариях, чтобы получить материалы!

      СЛАЙД-АРХИТЕКТУРА:
      - Slide 1: Роль "hook". Сверх-хлесткий заголовок, останавливающий скроллинг.
      - Slide 2: Роль "problem". Эмпатия к боли целевой аудитории.
      - Slide 3: Роль "pivot". Разворот интриги / разрушение популярного мифа.
      - Slide 4: Роль "takeaway1". Практический первый шаг или секрет.
      - Slide 5: Роль "takeaway2". Второй шаг или ключевой инсайт.
      - Slide 6: Роль "cta". Мощный призыв написать кодовое слово в комментарии: "${ctaWord || 'тематическое слово'}" для получения лид-магнита.

      ВЫДАЙ СТРОГИЙ JSON (БЕЗ РАЗМЕТКИ MARKDOWN, ТОЛЬКО ЧИСТЫЙ JSON):
      {
        "cta_word": "кодовое слово для автоматизации",
        "central_metaphor": "название центральной метафоры",
        "visual_style_prefix": "${stylePrefix}",
        "post_description": "Яркое, эмоциональное описание поста в Instagram с кучей эмодзи, разбитое на абзацы, с ключевыми мыслями в виде буллет-поинтов (маркеры-эмодзи) и четким CTA написать кодовое слово...",
        "slides": [
          {
            "slide_number": 1,
            "role": "hook",
            "text_on_slide": "Заголовок-хук для Слайда 1",
            "image_prompt": "Background image prompt representing the start of the metaphor...",
            "metaphor_tag": "визуальный элемент метафоры"
          },
          {
            "slide_number": 2,
            "role": "problem",
            "text_on_slide": "Текст Слайда 2 про боли",
            "image_prompt": "Background image prompt representing frustration / struggle...",
            "metaphor_tag": "визуальный элемент метафоры"
          },
          {
            "slide_number": 3,
            "role": "pivot",
            "text_on_slide": "Текст Слайда 3 с разворотом",
            "image_prompt": "Background image prompt representing contrast / twist...",
            "metaphor_tag": "визуальный элемент метафоры"
          },
          {
            "slide_number": 4,
            "role": "takeaway1",
            "text_on_slide": "Текст Слайда 4 с решением 1",
            "image_prompt": "Background image prompt representing step 1...",
            "metaphor_tag": "визуальный элемент метафоры"
          },
          {
            "slide_number": 5,
            "role": "takeaway2",
            "text_on_slide": "Текст Слайда 5 с решением 2",
            "image_prompt": "Background image prompt representing step 2...",
            "metaphor_tag": "визуальный элемент метафоры"
          },
          {
            "slide_number": 6,
            "role": "cta",
            "text_on_slide": "Текст Слайда 6 с кодовым словом и призывом",
            "image_prompt": "Background image prompt representing final visual destination...",
            "metaphor_tag": "визуальный элемент метафоры"
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
      parsedCarousel = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn('[ig-carousel API] Standard JSON parse failed, attempting regex fallback...');
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI returned non-JSON structured format');
      parsedCarousel = JSON.parse(match[0]);
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
          imgPrompt = `${stylePrefix}, conceptual visualization of slide ${i + 1}, highly detailed digital art, 8k`;
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
