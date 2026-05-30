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
    prompt: ', ultra-realistic, luxury aesthetic, sleek and modern, warm golden hour lighting mixed with high-end studio illumination, opulent atmosphere, rich gold and black tones, shot on Hasselblad, 8k resolution, masterpiece.',
    negative: 'fantasy, noir, cheap, plastic, blurry, anime, illustration, saturated colors.'
  },
  tech_catalyst: {
    label: 'Tech Catalyst',
    prompt: ', ultra-realistic, futuristic high-tech environment, clean aesthetic, cinematic cyberpunk lighting, subtle neon blue and cyan accents, shallow depth of field, photorealistic, 8k resolution.',
    negative: 'dirty, dark, noir, vintage, rustic, chaotic, low-res.'
  },
  turbo_dynamics: {
    label: 'Turbo Dynamics',
    prompt: ', ultra-realistic, high-speed motion aesthetic, dramatic cinematic lighting, aggressive angles, automotive commercial photography style, motion blur background, sharp focus on subject, 8k resolution.',
    negative: 'static, boring, fantasy, landscape, soft, pastel, cartoon.'
  },
  human_os: {
    label: 'Human OS',
    prompt: ', ultra-realistic, calm and serene aesthetic, natural soft ambient lighting, zen-like atmosphere, organic textures, muted earthy tones, shot on 35mm lens, f/1.8, photorealistic, 8k resolution.',
    negative: 'artificial, neon, plastic, cyber, intense, dramatic shadows, futuristic.'
  },
  shadow_audit: {
    label: 'Shadow Audit',
    prompt: ', ultra-realistic, dramatic film noir aesthetic, high contrast chiaroscuro lighting, deep shadows, professional and intense atmosphere, cinematic color grading, moody, 8k resolution.',
    negative: 'cluttered, messy, colorful, fantasy, soft, blurred, emotional.'
  },
  startup_valley: {
    label: 'Startup Valley',
    prompt: ', ultra-realistic, vibrant and energetic aesthetic, modern creative loft environment, bright dynamic lighting, colorful accents, contemporary lifestyle photography, 8k resolution.',
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
    Разбить текст на смысловые сегменты (по 3–5 секунд) и для каждого сегмента создать визуальную метафору (действие и объект, смысловую пулю) на английском языке.

    Алгоритм "Сверхпроводник":
    Картинка должна быть визуальным мостом между сложной мыслью эксперта и простым, понятным образом. 
    Запрещено генерировать картинку буквально по словам. Используй семантический анализ.
    Пример: Если речь об 'упущенной выгоде' — покажи песочные часы, в которых вместо песка золотые монеты.

    Шаг 1: Семантический анализ фразы (Semantic Metaphor).
    Логика: [Контекст ДНК] + [Смысл фразы] = [Визуальная метафора].

    Шаг 2: Генерация смысловой пули (Action and Object in English).
    Сформулируй лаконичное, но выразительное описание действия и объекта метафоры на английском языке.
    ВНИМАНИЕ: Описание должно содержать ТОЛЬКО смысловую часть (действие, объект, окружение, эмоция), БЕЗ каких-либо технических деталей стиля, упоминаний камер, разрешения или качественных прилагательных вроде 'ultra-realistic'. Это чистая смысловая пуля.
    Пример: 'A close up of a focused businessman analyzing complex laser light patterns.' or 'An hourglass with golden coins falling through instead of sand.'

    Технические требования к выводу:
    - Выдавай результат СТРОГО в формате JSON.
    - ai_prompt: ДОЛЖЕН БЫТЬ ТОЛЬКО НА АНГЛИЙСКОМ (это техническое задание для генератора картинок).
    - pexels_query: ДОЛЖЕН БЫТЬ ТОЛЬКО НА АНГЛИЙСКОМ.
    - text и visual_metaphor: На языке сценария (${locale === 'ru' ? 'русский' : 'английский'}).
    
    JSON Format:
    {
      "selected_style": "key_from_styles",
      "segments": [
        {
          "text": "Фраза из сценария",
          "visual_metaphor": "Обоснование метафоры",
          "ai_prompt": "Clean action and object representing the metaphor (STRICTLY ENGLISH, e.g. 'A person sitting on the floor of an empty room, looking at a dying plant')",
          "pexels_query": "3-5 keywords for Pexels search (STRICTLY ENGLISH)"
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
