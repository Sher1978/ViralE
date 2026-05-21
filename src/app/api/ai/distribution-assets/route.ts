import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAuthContext } from '@/lib/auth';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;

    const { scriptText, projectId, locale = 'ru' } = await req.json();

    if (!scriptText) {
      return NextResponse.json({ error: 'Script text is required' }, { status: 400 });
    }

    // 1. Fetch User DNA
    const { data: profile } = await authorizedSupabase
      .from('profiles')
      .select('digital_shadow_prompt, visual_style')
      .eq('id', userId)
      .single();

    const userDNA = profile?.digital_shadow_prompt || "Niche: General Content Creator. Tone: Professional but engaging. Philosophy: Value-first.";

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      Роль: Ты — ведущий ИИ-стратег по мультиканальному контенту в приложении ViralE.
      Твоя задача — трансформировать сырую транскрибацию аудио пользователя в пакет контента, строго соблюдая его "Цифровую ДНК".

      User_DNA_Profile: ${userDNA}
      Raw_Transcription: ${scriptText}

      ИНСТРУКЦИИ ПО ГЕНЕРАЦИИ (6 ЭТАПОВ):
      ВАЖНО: В начале каждого сгенерированного текста (внутри полей JSON) ОБЯЗАТЕЛЬНО добавь строку с названием платформы, например: "Для TikTok/Reels:", "Для Threads/Facebook:", "Для LinkedIn:", "Статья для блога:".

      1. Текст-описание для SFV (Shorts, Reels, TikTok)
      Стиль: Энергичный, адаптированный под Tone_of_Voice. Взрывной хук -> 3-4 буллет-поинта -> CTA. (До 500 симв). 
      Начни с: "Для TikTok/Reels:"

      2. Лонгрид для Threads & Facebook
      Стиль: Нарративный, формула "Но/Поэтому". (1000–1500 симв).
      Начни с: "Для Threads/Facebook:"

      3. Аналитический пост для LinkedIn
      Стиль: Executive-level, сухой, деловой. ROI, факты, тезис -> обоснование -> вывод.
      Начни с: "Для LinkedIn:"

      4. Полноценный лонгрид/статья (Longread Article)
      Стиль: Глубокий анализ, структурированный заголовок, введение, 3-4 смысловых блока с подзаголовками, заключение и мощный финальный вывод. (3000+ симв).
      Начни с: "Статья для блога:"

      5. Промпт обложки видео (Shorts/Reels Banner)
      AR 9:16. Sharp focus. Реалистичный герой в контексте мысли.
      Текст (Overlay): Выдели самую хлесткую фразу-смысл для наложения.

      Locale: ${locale}

      ВЫДАЙ СТРОГИЙ JSON:
      {
        "user_context_applied": "Краткое описание ToV и стиля",
        "sfv_description": {
          "text": "...",
          "platform_notes": "YouTube/IG/TikTok optimization done"
        },
        "deep_content": {
          "threads_fb_text": "..."
        },
        "linkedin_executive": {
          "text": "..."
        },
        "longread_article": {
          "title": "Заголовок статьи",
          "text": "Полный текст статьи с разметкой..."
        },
        "video_banner": {
          "image_prompt": "Detailed AI prompt for banner with AR 9:16...",
          "text_on_banner": "ГЛАВНАЯ ФРАЗА СМЫСЛА"
        }
      }
    `;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const assets = JSON.parse(text);
      return NextResponse.json(assets);
    } catch (parseErr) {
       // Fallback for markdown-wrapped JSON
       const jsonMatch = text.match(/\{[\s\S]*\}/);
       if (!jsonMatch) throw new Error('Failed to generate structured assets');
       return NextResponse.json(JSON.parse(jsonMatch[0]));
    }

  } catch (err: any) {
    console.error('[Distribution Assets API Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
