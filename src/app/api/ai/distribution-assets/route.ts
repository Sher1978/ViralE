import { NextResponse } from 'next/server';
import { getModel } from '@/lib/ai/gemini';
import { getAuthContext } from '@/lib/auth';
import { safeJsonParse } from '@/lib/utils';

import { profileService } from '@/lib/services/profileService';

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;

    const { scriptText, projectId, ideaTitle, locale = 'ru' } = await req.json();

    if (!scriptText) {
      return NextResponse.json({ error: 'Script text is required' }, { status: 400 });
    }

    let projectTitle = ideaTitle || '';
    if (projectId && !projectTitle) {
      try {
        const { data: proj } = await authorizedSupabase
          .from('projects')
          .select('title')
          .eq('id', projectId)
          .single();
        if (proj?.title) projectTitle = proj.title;
      } catch (e) {}
    }

    // 1. Fetch Active User DNA (Digital DNA or StoryBrand depending on project count)
    const { brandContext } = await profileService.getActiveBrandContext(userId, authorizedSupabase);
    const userDNA = brandContext || "Niche: General Content Creator. Tone: Professional but engaging. Philosophy: Value-first.";

    const model = getModel('fast', locale, 'json');

    const systemPrompt = `
      Роль: Ты — ведущий ИИ-стратег по мультиканальному контенту в приложении ViralE.
      Твоя задача — трансформировать сырую транскрибацию аудио пользователя в пакет контента, строго соблюдая его "Цифровую ДНК".

      User_DNA_Profile: ${userDNA}
      Project_Topic_Title: "${projectTitle}"
      Raw_Transcription: ${scriptText}

      ИНСТРУКЦИИ ПО ГЕНЕРАЦИИ (6 ЭТАПОВ):
      ВАЖНО: Выдавай сразу готовый, чистый текст описания для каждой платформы БЕЗ каких-либо префиксов, служебных меток или заголовков вроде "Для TikTok/Reels:".

      1. Текст-описание для SFV (Shorts, Reels, TikTok)
      Стиль: Энергичный, адаптированный под Tone_of_Voice. Взрывной хук -> 3-4 буллет-поинта -> CTA. (До 500 симв).
      ВАЖНО: Начинай СРАЗУ с готового текста описания, БЕЗ слов "Для TikTok/Reels:".

      2. Лонгрид для Threads & Facebook
      Стиль: Нарративный, формула "Но/Поэтому". (1000–1500 симв).
      Начни с: "Для Threads/Facebook:"

      3. Аналитический пост для LinkedIn
      Стиль: Executive-level, сухой, деловой. ROI, факты, тезис -> обоснование -> вывод.
      Начни с: "Для LinkedIn:"

      4. Полноценный лонгрид/статья (Longread Article)
      Стиль: Глубокий анализ, структурированный заголовок, введение, 3-4 смысловых блока с подзаголовками, заключение и мощный финальный вывод. (3000+ симв).
      Начни с: "Статья для блога:"

      5. Описание смыслового кадра и заголовок обложки видео (Shorts/Reels Banner)
      ВНИМАНИЕ: Для поля text_on_banner ОБЯЗАТЕЛЬНО используй название выбранной темы идеи: "${projectTitle || 'Хук вашего видео'}" (или лаконичный кликабельный вариант из 3-6 слов для максимального CTR).
      Описание (image_prompt) должно быть на английском языке и содержать ТОЛЬКО смысловую часть (действие, объект, окружение, эмоция), БЕЗ каких-либо технических деталей стиля, упоминаний разрешения, фотореалистичности или качественных прилагательных вроде 'ultra-realistic'. Это чистая смысловая пуля.
      Пример: 'A close-up of a determined young woman looking at a large glowing map in a dark room.'

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
      const assets = safeJsonParse(text);
      return NextResponse.json(assets);
    } catch (parseErr: any) {
      console.error('[Distribution Assets API JSON Parse Error]:', parseErr.message);
      throw parseErr;
    }

  } catch (err: any) {
    console.error('[Distribution Assets API Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
