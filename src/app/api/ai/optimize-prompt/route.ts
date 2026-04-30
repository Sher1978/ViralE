import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAuthenticatedUser } from '@/lib/auth';
import { profileService } from '@/lib/services/profileService';


const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { context } = await req.json();

    // 1. Get user DNA
    let dna = 'Generic expert content creator';
    try {
      await getAuthenticatedUser();
      const profile = await profileService.getOrCreateProfile();
      if (profile.dna) dna = profile.dna;
    } catch (e) {
      console.warn('Unauthorized or profile error in optimize-prompt:', e);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      Задание: Разработать визуальный промпт для видео-сегмента на основе модуля Visual_Script_Generator.

      Входные данные:
      1. Контекст сцены/фраза: "${context}"
      2. Цифровая ДНК пользователя: "${dna}"

      Задача:
      Создать визуальный промпт для генератора изображений/видео (Runware/Runway).

      Алгоритм:
      Шаг 1: Определение Глобального стиля (Global Style Anchor) на основе ДНК.
      Выбери один: Premium Business, Expert Minimalist, или Lifestyle & Travel.
      
      Шаг 2: Семантический анализ фразы.
      Используй логику: [Контекст ДНК] + [Смысл фразы] = [Визуальная метафора].
      Запрещено генерировать буквально по словам.

      Шаг 3: Сборка промпта.
      Структура: (Global Style Anchor), (Action/Object representing metaphor), (Environment), (Mood), --no fantasy, noir, cartoon.

      Верни ТОЛЬКО финальный промпт на английском языке. Без пояснений.
    `;

    const result = await model.generateContent(prompt);
    const optimized = result.response.text().trim().replace(/^"|"$/g, '');


    return NextResponse.json({ optimized });
  } catch (error: any) {
    console.error('Prompt optimization failed:', error);
    return NextResponse.json({ error: 'Optimization failed' }, { status: 500 });
  }
}
