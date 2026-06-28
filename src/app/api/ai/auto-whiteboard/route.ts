import { NextRequest, NextResponse } from 'next/server';
import { getModel } from '@/lib/ai/gemini';
import { getAuthenticatedUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { subtitles } = await req.json();
    if (!subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json({ error: 'Subtitles array is required' }, { status: 400 });
    }

    const subtitleContext = subtitles
      .map((s: any) => {
        const start = s.startTime ?? s.start ?? 0;
        const end   = s.endTime   ?? s.end   ?? 0;
        return `[${start.toFixed(3)}s – ${end.toFixed(3)}s]: ${s.text}`;
      })
      .join('\n');

    const totalDuration = subtitles.reduce((max: number, s: any) =>
      Math.max(max, s.endTime ?? s.end ?? 0), 0);
      
    // Max whiteboard clips: about one scene per 5-8 seconds
    const maxClips = Math.max(2, Math.floor(totalDuration / 6));

    const systemPrompt = `
### ROLE & OBJECTIVE
Ты — Режиссер-визуализатор и Художник скетчей (Whiteboard Animation). Твоя задача — проанализировать текст субтитров и составить монтажную карту для рисованной анимации (Whiteboard).
Ты должен разбить видео на логические сегменты и придумать простые, понятные рисунки-скетчи, которые рука прорисует на экране для визуализации слов спикера.

---

### I. ПРАВИЛА РАЗМЕТКИ СЦЕН
1. **Каждый скетч длится от 3.0 до 6.0 секунд** (чтобы рука успела его прорисовать).
2. **Сегментация должна покрывать ключевые смысловые блоки.** Не перегружай видео скетчами. Максимум для этого видео: ${maxClips} сцен.
3. Каждая сцена должна иллюстрировать понятный объект, абстрактный концепт или схему (например, ракета = взрывной рост, весы = сравнение, человечек с лампочкой = идея).

---

### II. ИНЖЕНЕРИЯ ПРОМПТА ДЛЯ СБОРОЧНЫХ СКЕТЧЕЙ (FLUX)
Каждый рисунок будет генерироваться ИИ Flux. Чтобы скетчи выглядели профессионально и однородно, промпт должен строиться строго по следующей формуле:
"A charming naive children's book doodle illustration of [CORE_SUBJECT], simple expressive black felt-tip marker drawing, whimsical hand-drawn style, minimalist kindergarten sketch aesthetic, funny, cute simplicity, isolated on a solid pure white canvas. Strictly no complex shading, no gradients, vector lines. The bottom-right quadrant of the canvas is completely empty, pure solid white blank space, strictly zero objects, lines or text in the bottom right corner."

**СТРОГИЕ ПРАВИЛА ДЛЯ ПРОМПТОВ:**
- Рисунок должен быть в стиле детского скетча маркером на белом листе. Никакого серого или цветного фона! Никаких теней или 3D объемов!
- Описывай простые контурные рисунки (Outline sketch).
- Избегай фотореализма, градиентов или сложных детализаций.
- Обязательно оставляй правый нижний угол пустым для overlay видео говорящей головы спикера.
- Пример: "A charming naive children's book doodle illustration of a human head with gearwheels inside, simple expressive black felt-tip marker drawing, whimsical hand-drawn style, minimalist kindergarten sketch aesthetic, funny, cute simplicity, isolated on a solid pure white canvas. Strictly no complex shading, no gradients, vector lines. The bottom-right quadrant of the canvas is completely empty, pure solid white blank space, strictly zero objects, lines or text in the bottom right corner."

---

### III. СТРОГИЙ ВЫХОДНОЙ ФОРМАТ
Верни ТОЛЬКО валидный JSON-массив. Никакого текста снаружи, никаких markdown-блоков. Только чистый JSON.

[
  {
    "time_start": "MM:SS.mmm",
    "time_end": "MM:SS.mmm",
    "trigger_phrase": "Краткая фраза-триггер из текста",
    "label": "Краткое название рисунка (на английском, например: Gear Brain)",
    "prompt": "COMPLETE_FLUX_PROMPT_FOLLOWING_THE_FORMULA"
  }
]
`;

    const userPrompt = `СУБТИТРЫ С ТАЙМКОДАМИ:\n${subtitleContext}`;

    const model = getModel('fast');
    const result = await model.generateContent([systemPrompt, userPrompt]);
    let text = result.response.text().trim();

    // Strip markdown wrappers if present
    const jsonStart = text.indexOf('[');
    const jsonEnd   = text.lastIndexOf(']');
    if (jsonStart !== -1 && jsonEnd !== -1) text = text.substring(jsonStart, jsonEnd + 1);

    try {
      const clips = JSON.parse(text);
      return NextResponse.json({ clips });
    } catch {
      console.error('[Auto-Whiteboard] JSON parse failure. Raw:', text.slice(0, 300));
      return NextResponse.json({ error: 'AI returned invalid JSON', raw: text }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Auto-Whiteboard] API failure:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
