import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getAuthenticatedUser } from '@/lib/auth';
import { profileService } from '@/lib/services/profileService';


const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const context = body.context;
    const mode = body.mode || 'generation';

    // 1. Get user DNA & Style
    let dna = 'Generic expert content creator';
    let style = 'startup_valley'; // Default

    try {
      await getAuthenticatedUser();
      const profile = await profileService.getOrCreateProfile();
      if (profile) {
        const { brandContext } = await profileService.getActiveBrandContext(profile.id);
        dna = brandContext || profile.digital_shadow_prompt || dna;
        if (profile.visual_style) style = profile.visual_style;
      }
    } catch (e) {
      console.warn('Unauthorized or profile error in optimize-prompt:', e);
    }

    const systemPrompt = mode === 'search' 
      ? `
        Задача: Создать ОПТИМИЗИРОВАННЫЙ поисковый запрос для стокового видео (Pexels/Pixabay) на АНГЛИЙСКОМ языке.
        
        Входные данные: "${context}"
        
        Инструкция:
        1. Переведи на английский.
        2. Убери лишние прилагательные, оставь только визуальные действия и объекты.
        3. Добавь технические теги: "cinematic", "4k", "high quality".
        4. Если в запросе есть эмоция, опиши её через визуальное действие (например, вместо "грусть" -> "lonely person looking out window").
        
        Верни ТОЛЬКО финальный поисковый запрос (2-5 слов).
      `
      : `
        Задание: Разработать визуальный промпт на основе модуля Visual_Script_Generator v2.0.
        Входные данные:
        1. Контекст сцены: "${context}"
        2. Цифровая ДНК пользователя: "${dna}"
        3. Выбранный стиль: "${style}"
        Задача:
        Создать визуальный промпт для генератора (Runware/Runway), используя концепцию "Сверхпроводник".
        Верни ТОЛЬКО финальный промпт на английском языке.
      `;

    // [TEMPORARY OVERRIDE] Using Groq instead of Gemini
    const groqKey = process.env.GROQ_API_KEY || '';
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "user", content: systemPrompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('Groq optimization failed');
    }

    const data = await response.json();
    const optimized = data.choices[0].message.content.trim().replace(/^"|"$/g, '');

    /* Original Gemini Implementation (Commented for Revert)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent(systemPrompt);
    const optimized = result.response.text().trim().replace(/^"|"$/g, '');
    */


    return NextResponse.json({ optimized });
  } catch (error: any) {
    console.error('Prompt optimization failed:', error);
    return NextResponse.json({ error: 'Optimization failed' }, { status: 500 });
  }
}
