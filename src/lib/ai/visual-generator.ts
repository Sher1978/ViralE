import { model } from './gemini';

export type GlobalStyleAnchor = 
  | 'dubai_platinum' 
  | 'tech_catalyst' 
  | 'turbo_dynamics' 
  | 'human_os' 
  | 'shadow_audit' 
  | 'startup_valley';

export const VISUAL_STYLES: Record<GlobalStyleAnchor, { label: string, prompt: string, negative: string }> = {
  dubai_platinum: {
    label: 'Dubai Platinum',
    prompt: 'High-end commercial photography, luxury penthouse interior, sunset lighting, blurred Burj Khalifa in background, sharp focus on premium textures, shot on Sony A7R IV, 8k resolution, cinematic lighting.',
    negative: 'fantasy, noir, cheap, plastic, blurry, anime, illustration, saturated colors.'
  },
  tech_catalyst: {
    label: 'Tech Catalyst',
    prompt: 'Minimalist tech aesthetic, clean white laboratory, soft neon blue accents, macro shot of futuristic interface, depth of field, Apple-style design, hyper-realistic, volumetric lighting.',
    negative: 'dirty, dark, noir, vintage, rustic, chaotic, low-res.'
  },
  turbo_dynamics: {
    label: 'Turbo Dynamics',
    prompt: 'High-speed automotive photography, metallic car reflections, city street lights at night, long exposure streaks, carbon fiber textures, low angle shot, gritty but polished, shot on RED camera.',
    negative: 'static, boring, fantasy, landscape, soft, pastel, cartoon.'
  },
  human_os: {
    label: 'Human OS / Mindfulness',
    prompt: 'Natural organic aesthetic, soft sunlight through leaves, cozy modern studio, authentic human emotions, linen textures, bokeh background, warm earthy tones, shot on Leica, 35mm lens.',
    negative: 'artificial, neon, plastic, cyber, intense, dramatic shadows, futuristic.'
  },
  shadow_audit: {
    label: 'Shadow Audit',
    prompt: 'Architectural minimalism, dramatic light and shadow, high contrast, structural geometry, professional business environment, sharp edges, monochrome aesthetic with red accents, 8k, photorealistic.',
    negative: 'cluttered, messy, colorful, fantasy, soft, blurred, emotional.'
  },
  startup_valley: {
    label: 'Silicon Valley Startup',
    prompt: 'Vibrant modern office loft, brainstorming boards, creative chaos, bright daylight, wide angle shot, energetic atmosphere, GoPro style, high saturation but realistic, 4k.',
    negative: 'dark, moody, formal, luxury, boring, dull, gray.'
  }
};

/**
 * Module Visual_Script_Generator
 * Generates semantic visual prompts for images and B-rolls based on Brand DNA.
 */
export async function generateVisualScript(
  scriptText: string, 
  brandDna: string, 
  visualStyle?: GlobalStyleAnchor,
  locale: string = 'ru'
) {
  const styleContext = visualStyle ? `
    ИСПОЛЬЗУЙ СТРОГО ЭТОТ СТИЛЬ (Visual Style Anchor):
    Style Name: ${VISUAL_STYLES[visualStyle].label}
    Technical Prompt: ${VISUAL_STYLES[visualStyle].prompt}
    Negative Prompt: ${VISUAL_STYLES[visualStyle].negative}
  ` : `
    Выбери наиболее подходящий стиль из списка ниже на основе ДНК пользователя:
    ${Object.entries(VISUAL_STYLES).map(([key, val]) => `- ${key}: ${val.label} (${val.prompt})`).join('\n')}
  `;

  const systemPrompt = `
    Задание: Модуль Visual_Script_Generator v2.0 (Концепция "Сверхпроводник").

    Входные данные:
    1. Полный текст сценария видео.
    2. Цифровая ДНК пользователя (тема, ниша, роль).
    3. Выбранный Визуальный Стиль (Global Style Anchor).

    Задача модуля:
    Разбить текст на смысловые сегменты (по 3–5 секунд) и для каждого сегмента создать визуальную метафору и промпт.

    Алгоритм "Сверхпроводник":
    Картинка должна быть визуальным мостом между сложной мыслью эксперта и простым, понятным образом. 
    Запрещено генерировать картинку буквально по словам. Используй семантический анализ.
    Пример: Если речь об 'упущенной выгоде' — покажи песочные часы, в которых вместо песка золотые монеты.

    Шаг 1: Применение Глобального стиля (Global Style Anchor).
    ${styleContext}

    Шаг 2: Семантический анализ фразы (Semantic Metaphor).
    Логика: [Контекст ДНК] + [Смысл фразы] = [Визуальная метафора].

    Шаг 3: Сборка финального промпта.
    Структура: (Global Style Anchor Technical Prompt), (Action/Object representing the metaphor), (Environment context), (Mood/Emotion), --no (Style Negative Prompt).

    Технические требования к выводу:
    Выдавай результат в формате JSON:
    {
      "selected_style": "key_from_styles",
      "segments": [
        {
          "text": "Фраза из сценария",
          "visual_metaphor": "Обоснование метафоры",
          "ai_prompt": "Финальный промпт для Flux (детальный, на английском)",
          "pexels_query": "3-5 ключевых слов для поиска видео на Pexels (на английском)"
        }
      ]
    }
  `;

  const userPrompt = `
    SCRIPT TEXT:
    ${scriptText}

    USER BRAND DNA:
    ${brandDna}
    
    Locale: ${locale}
  `;

  const result = await model.generateContent([systemPrompt, userPrompt]);
  const response = await result.response;
  let text = response.text().trim();

  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      text = text.substring(jsonStart, jsonEnd + 1);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error('[VisualScriptGenerator] JSON Parse Error:', text);
    throw new Error('Failed to generate visual script.');
  }
}
