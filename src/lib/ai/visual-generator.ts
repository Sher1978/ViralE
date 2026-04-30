import { model } from './gemini';

/**
 * Module Visual_Script_Generator
 * Generates semantic visual prompts for images and B-rolls based on Brand DNA.
 */
export async function generateVisualScript(scriptText: string, brandDna: string, locale: string = 'ru') {
  const systemPrompt = `
    Задание: Разработать модуль Visual_Script_Generator.

    Входные данные:
    1. Полный текст сценария видео.
    2. Цифровая ДНК пользователя (тема: автоблогер, бизнес-коуч и т.д.).

    Задача модуля:
    Разбить текст на смысловые сегменты (по 3–5 секунд) и для каждого сегмента создать визуальный промпт для генератора изображений (Runware/Runway).

    Алгоритм генерации промпта:

    Шаг 1: Определение Глобального стиля (Global Style Anchor).
    На основе ДНК и темы видео агент должен выбрать один из стилей:
    - Premium Business: "Cinematic photography, high-end commercial aesthetic, professional lighting, Sony A7R IV, 35mm lens."
    - Expert Minimalist: "Clean background, soft studio lighting, minimalist composition, 8k resolution, photorealistic."
    - Lifestyle & Travel: "Natural sunlight, vibrant colors, GoPro-style or drone-shot aesthetic."

    Шаг 2: Семантический анализ фразы (Semantic Context).
    Запрещено генерировать картинку буквально по словам. Нужно использовать логику: [Контекст ДНК] + [Смысл фразы] = [Визуальная метафора].
    Пример:
    - ДНК: Автоблогер.
    - Фраза: "Это сплошной обман".
    - Логика: Обман в авто -> Скрученный пробег, дым из-под капота, разочарованный покупатель у блестящей, но сломанной машины.

    Шаг 3: Сборка финального промпта.
    Структура промпта для API:
    (Global Style Anchor), (Action/Object representing the metaphor), (Environment context), (Mood/Emotion), --no fantasy, noir, cartoon, anime, illustration.

    Технические требования к выводу:
    Выдавай результат в формате JSON:
    {
      "segments": [
        {
          "text": "Фраза из сценария",
          "visual_metaphor": "Краткое обоснование, почему выбрана эта картинка",
          "ai_prompt": "Финальный промпт на английском для генератора"
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
