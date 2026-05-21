import { NextRequest, NextResponse } from 'next/server';
import { getModel } from '@/lib/ai/gemini';
import { getAuthenticatedUser } from '@/lib/auth';
import { profileService } from '@/lib/services/profileService';

export const runtime = 'nodejs';

const STYLES: Record<string, string> = {
  dubai_platinum:  'Cinematic Dark Luxury, deep shadows with gold and amber accents, neon night-city reflections, matte finish',
  tech_catalyst:   'High-tech minimalism, soft neon blue accents, architectural glass surfaces, cinematic soft diffusion',
  turbo_dynamics:  'Automotive cinematic, carbon fiber detail, city street lights at night, long exposure streaks, low-angle drama',
  human_os:        'Warm organic aesthetic, natural soft daylight, authentic human moments, shallow depth of field',
  shadow_audit:    'Architectural minimalism, harsh dramatic shadows, high-contrast structural geometry, monochrome with red accents',
  startup_valley:  'Modern loft aesthetics, brainstorming energy, bright open daylight, wide-angle dynamic shots',
};

export async function POST(req: NextRequest) {
  try {
    const { subtitles, visualStyle } = await req.json();
    if (!subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json({ error: 'Subtitles array is required' }, { status: 400 });
    }

    let selectedStyle = 'startup_valley';
    try {
      await getAuthenticatedUser();
      const profile = await profileService.getOrCreateProfile();
      if (profile?.visual_style) selectedStyle = profile.visual_style;
    } catch { /* use default */ }

    const styleKey   = visualStyle || selectedStyle;
    const styleDesc  = STYLES[styleKey] || STYLES['startup_valley'];

    const subtitleContext = subtitles
      .map((s: any) => {
        const start = s.startTime ?? s.start ?? 0;
        const end   = s.endTime   ?? s.end   ?? 0;
        return `[${start.toFixed(3)}s – ${end.toFixed(3)}s]: ${s.text}`;
      })
      .join('\n');

    const totalDuration = subtitles.reduce((max: number, s: any) =>
      Math.max(max, s.endTime ?? s.end ?? 0), 0);
    const maxBroll = Math.floor((totalDuration * 0.40) / 4); // ~40% coverage at ~4s avg

    const systemPrompt = `
### ROLE & OBJECTIVE
Ты — Senior Video Editor и Оператор-постановщик премиального контента (уровня Netflix, Top Gear и топовых бизнес-блогов). Твоя задача — провести глубокий семантический и эмоциональный анализ текста субтитров (A-Roll) и составить поминутную монтажную карту B-roll (перебивок).

Ты должен определить, ГДЕ визуальный образ усилит удержание внимания, ЧТО именно должно быть в кадре, и СФОРМУЛИРОВАТЬ идеальные промпты для видеогенераторов (Google Veo, Sora, Runway Gen-3).

---

### I. АЛГОРИТМ АНАЛИЗА ТЕКСТА — ГДЕ НУЖЕН B-ROLL («Триггеры»)
Ставь перебивки ТОЛЬКО в следующих точках:
1. **Literal Anchors:** Спикер называет конкретный объект — бренд, машину, локацию, артефакт («Rolls-Royce», «Дубай», «блокчейн»).
2. **Conceptual Anchors:** Спикер говорит об абстрактном — «выгорание», «взрывной рост», «уперлись в стену». Переводи в глубокие визуальные метафоры.
3. **Emotional Spikes:** Кульминация мысли, эмоциональный перелом, инсайт, жёсткий вывод — смена тона речи.
4. **Data Anchors:** Цифры, проценты, масштабы («25 лет опыта», «миллионы просмотров») — фон для будущей инфографики.

---

### II. РЕЖИССЕРСКИЕ ПРАВИЛА МОНТАЖА
* **Duration:** строго от 3.0 до 5.0 секунд включительно.
* **Pacing:** B-roll занимает не более 40% общей длительности ролика. Оставляй «говорящую голову» на ключевых личных откровениях.
* **Match Cut Logic:** Если два B-roll идут подряд — их свет, темп движения камеры и цветовая температура должны плавно продолжать друг друга.
* **Максимум клипов:** не более ${maxBroll} клипов для этого ролика.

---

### III. ИНЖЕНЕРИЯ ВИДЕО-ПРОМПТА (формула для visual_prompt)
Каждый visual_prompt строго следует формуле:
[Shot Type & Camera Movement] + [Core Subject & Action] + [Environment & Location] + [Lighting & Color Grading] + [Atmosphere & Mood] + [Cinematic Tags]

**ЗАПРЕЩЕНЫ слова:** photorealistic, hyperrealistic, 4K, 8K, unreal engine, beautiful, amazing.

**Используй профессиональный киноязык:**
- Планы: Extreme close-up, Cinematic close-up, Medium shot, Low-angle shot, Drone establishing shot
- Движение: Slow cinematic pan, Smooth dynamic tracking shot, Subtle push-in, Steadicam orbit motion
- Освещение: Golden hour, Volumetric moody lighting, Cyberpunk neon rim light, Cinematic soft diffusion, Harsh dramatic shadows
- Оптика: Shot on 35mm lens, Anamorphic format, Deep bokeh, Shallow depth of field, F/1.2 glare

---

### IV. КЛЮЧЕВОЙ ВИЗУАЛЬНЫЙ СТИЛЬ ПРОЕКТА
${styleDesc}
Общий стиль: Cinematic Dark Luxury / High-End Business Core.
Цветовая палитра: глубокие тёмные тона, контрастные тёплые акценты (золото, янтарь, неоновые блики ночного города). Matte finish.
Атмосфера: дороговизна, премиальность, статус, абсолютный контроль и уверенность.

---

### V. СТРОГИЙ ВЫХОДНОЙ ФОРМАТ
Верни ТОЛЬКО валидный JSON-массив. Никакого текста снаружи, никаких markdown-блоков. Только чистый JSON.

[
  {
    "id": 1,
    "time_start": "MM:SS.mmm",
    "time_end": "MM:SS.mmm",
    "duration": 3.5,
    "trigger_phrase": "Точная фраза из субтитров",
    "anchor_type": "Literal | Conceptual | Emotional | Data",
    "scene_concept": "Краткое описание идеи кадра на русском",
    "search_query": "1-3 English keywords for Pexels stock search",
    "visual_prompt": "COMPLETE_ENGLISH_PROMPT_FOLLOWING_THE_FORMULA"
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
      const brolls = JSON.parse(text);
      return NextResponse.json({ brolls });
    } catch {
      console.error('[Auto-Broll] JSON parse failure. Raw:', text.slice(0, 300));
      return NextResponse.json({ error: 'AI returned invalid JSON', raw: text }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Auto-Broll] API failure:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
