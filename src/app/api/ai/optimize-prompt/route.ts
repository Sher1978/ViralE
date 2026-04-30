import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAuthenticatedUser } from '@/lib/auth';
import { profileService } from '@/lib/services/profileService';


const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { context } = await req.json();

    // 1. Get user DNA & Style
    let dna = 'Generic expert content creator';
    let style = 'startup_valley'; // Default

    try {
      await getAuthenticatedUser();
      const profile = await profileService.getOrCreateProfile();
      if (profile?.digital_shadow_prompt) dna = profile.digital_shadow_prompt;
      if (profile?.visual_style) style = profile.visual_style;
    } catch (e) {
      console.warn('Unauthorized or profile error in optimize-prompt:', e);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      Задание: Разработать визуальный промпт на основе модуля Visual_Script_Generator v2.0.

      Входные данные:
      1. Контекст сцены: "${context}"
      2. Цифровая ДНК пользователя: "${dna}"
      3. Выбранный стиль: "${style}"

      Задача:
      Создать визуальный промпт для генератора (Runware/Runway), используя концепцию "Сверхпроводник".
      Картинка должна быть визуальным мостом между сложной мыслью эксперта и простым образом.
      
      Алгоритм:
      Шаг 1: Примени визуальный код стиля "${style}".
      Шаг 2: Семантическая метафора: [Контекст ДНК] + [Смысл фразы] = [Визуальный образ].
      Запрещено генерировать буквально по словам.

      Верни ТОЛЬКО финальный промпт на английском языке.
    `;


    const result = await model.generateContent(prompt);
    const optimized = result.response.text().trim().replace(/^"|"$/g, '');


    return NextResponse.json({ optimized });
  } catch (error: any) {
    console.error('Prompt optimization failed:', error);
    return NextResponse.json({ error: 'Optimization failed' }, { status: 500 });
  }
}
