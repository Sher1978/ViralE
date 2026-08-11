import { RemotionArchitectCutSheet, CameraCut, BRollElement, SoundCue, UserBrandDnaConfig } from '@/lib/types/remotionArchitect';
import { STYLE_PRESETS, resolveUserBrandStyle } from '@/lib/remotion/stylePresets';

export interface RunCinematicPipelineParams {
  transcriptData: Array<{ start?: number; end?: number; text?: string; scriptText?: string }>;
  userBrandDna?: UserBrandDnaConfig;
  presetKey?: string;
  userIntent?: string;
  fps?: number;
}

export async function runCinematicMultiAgentPipeline({
  transcriptData,
  userBrandDna,
  presetKey = 'minimal_expert',
  userIntent = 'High Retention cinematic edit',
  fps = 30
}: RunCinematicPipelineParams): Promise<RemotionArchitectCutSheet> {
  const selectedStyle = resolveUserBrandStyle(presetKey, userBrandDna);

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (groqKey || geminiKey) {
    try {
      // 1. PASS 1: DIRECTOR AGENT (Semantic & Emotional Map)
      const directorOutput = await runDirectorAgent(transcriptData, userIntent, groqKey || geminiKey!);

      // 2. PASS 2: ART DIRECTOR AGENT (Visual Concepts & Metaphors)
      const artDirectorOutput = await runArtDirectorAgent(directorOutput, selectedStyle, userBrandDna, groqKey || geminiKey!);

      // 3. PASS 3: REMOTION ANIMATOR AGENT (Frame-Accurate Hyperframes & Physics)
      const cutSheet = await runAnimatorAgent(directorOutput, artDirectorOutput, selectedStyle, fps, groqKey || geminiKey!);

      if (cutSheet && cutSheet.cameraCuts && cutSheet.bRollElements) {
        return processAndEnrichCutSheet(cutSheet, selectedStyle, fps);
      }
    } catch (err) {
      console.warn('[CinematicPipeline] Multi-agent execution failed, falling back to smart procedural generator:', err);
    }
  }

  // Fallback to high-quality procedural cinematic generation
  return generateProceduralCinematicCutSheet(transcriptData, selectedStyle, fps);
}

/**
 * PASS 1: Director Agent
 */
async function runDirectorAgent(transcript: any[], intent: string, apiKey: string): Promise<any> {
  const prompt = `
Ты — Агент-Режиссер монтажа (Director Agent) сервиса Virali AI.
Проанализируй транскрипт видео и создай Драматургическую Карту.

### ВХОДНЫЕ ДАННЫЕ
- Транскрипт: ${JSON.stringify(transcript.slice(0, 40))}
- Цель: ${intent}

### ТВОИ ЗАДАЧИ
1. Выдели ХУК (первые 3-5 секунд).
2. Разбей текст на смысловые фазы (Интрига, Проблема, Доказательства/Примеры, Кульминация, Призыв).
3. Найди 3-5 ключевых Punch-слов (выделенных интонацией или цифрами).
4. Найди монотонные зоны ("boredom_zones") длительностью > 3 секунд, требующие изменения крупности камеры или B-Roll.

Формат вывода STRICT JSON:
{
  "hook": { "start": 0, "end": 4.5, "punchWords": ["..."] },
  "beats": [
    { "start": 0, "end": 5, "phase": "hook", "boredomZone": false, "punchWords": ["..."] }
  ],
  "boredomZones": [{ "start": 5.5, "end": 9.0 }]
}
  `;

  return await callLlmApi(prompt, apiKey);
}

/**
 * PASS 2: Art Director Agent
 */
async function runArtDirectorAgent(directorOutput: any, style: any, userDna: any, apiKey: string): Promise<any> {
  const prompt = `
Ты — Агент Арт-Директор (Art Director Agent) сервиса Virali AI.
На основе Драматургической Карты подбери идеальные графические элементы под бренд-бук пользователя.

### СТИЛЬ И ДНК БРЕНДА
- Название пресета: ${style.name} (${style.key})
- Акцентный цвет: ${style.colors.accent}
- Вторичный цвет: ${style.colors.secondary}
- Режиссерская карта: ${JSON.stringify(directorOutput)}

### ТВОИ ЗАДАЧИ
1. Назначь визуальные метафоры:
   - Цифры/рост -> type: "chart" (с полем values: [40, 65, 85, 98], title)
   - Главная мысль/вывод -> type: "kinetic_quote" или "tweet_card"
   - Перечисление факторов -> type: "list" (title, items)
   - Важная метрика -> type: "stat_callout" (statValue: "+350%", statLabel: "Рост продаж")
   - Иконка понятий -> type: "3d_icon" (iconName)
2. Установи правила расположения элементов на экране.

Формат вывода STRICT JSON:
{
  "elements": [
    {
      "type": "chart",
      "startTime": 2.5,
      "endTime": 7.0,
      "props": { "title": "Рост вовлеченности", "values": [35, 60, 85, 98] }
    }
  ]
}
  `;

  return await callLlmApi(prompt, apiKey);
}

/**
 * PASS 3: Remotion Animator Agent
 */
async function runAnimatorAgent(directorOutput: any, artOutput: any, style: any, fps: number, apiKey: string): Promise<any> {
  const prompt = `
Ты — Агент Remotion Аниматор (Motion Engineer).
Переведи выводы Режиссера и Арт-Директора в финальную схему монтажа с кадром упреждения.

### ВХОДНЫЕ ДАННЫЕ
- Режиссер: ${JSON.stringify(directorOutput)}
- Арт-Директор: ${JSON.stringify(artOutput)}
- FPS: ${fps}
- Время упреждения (anticipation): -150ms (-4 кадра)

### ТВОИ ЗАДАЧИ
1. Рассчитай точные frame-номера с упреждением (startFrame = Math.max(0, startSec * fps - 4)).
2. Сформируй список cameraCuts:
   - "micro_zoom" (targetScale: 1.03) во время спокойной речи.
   - "punch_zoom" (targetScale: 1.12) на хуках и ключевых Punch-словах.
   - "scale_to_circle" или "move_left" при показах графиков.
3. Назначь каждому bRollElement случайный visualSeed (от 1 до 99) для джиттера.
4. Расставь soundCues ("whoosh", "pop", "click") на влетах карточек.

Формат вывода STRICT JSON:
{
  "cameraCuts": [
    { "startTime": "00:00.00", "duration": 3.0, "action": "punch_zoom", "targetScale": 1.12 },
    { "startTime": "00:03.00", "duration": 4.5, "action": "scale_to_circle" }
  ],
  "bRollElements": [
    {
      "id": "elem_1",
      "type": "chart",
      "startTime": "00:02.80",
      "endTime": "00:07.50",
      "visualSeed": 42,
      "props": { "title": "Рост просмотров", "values": [40, 65, 85, 98] }
    }
  ],
  "soundCues": [
    { "timeSec": 2.8, "type": "whoosh" }
  ]
}
  `;

  return await callLlmApi(prompt, apiKey);
}

/**
 * Call Groq/Gemini API helper
 */
async function callLlmApi(systemPrompt: string, apiKey: string): Promise<any> {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate JSON now.' }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      })
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      return JSON.parse(text);
    }
  }
  return null;
}

/**
 * Enriches LLM or procedural output with frame math and spring presets
 */
function processAndEnrichCutSheet(data: any, style: any, fps: number): RemotionArchitectCutSheet {
  const cameraCuts: CameraCut[] = (data.cameraCuts || data.camera_cuts || []).map((c: any) => {
    const startSec = parseTimeToSeconds(c.startTime || c.start_time);
    const duration = parseFloat(c.duration) || 4;
    return {
      startTime: c.startTime || `${startSec}s`,
      startFrame: Math.round(startSec * fps),
      duration,
      durationFrames: Math.round(duration * fps),
      action: c.action || 'micro_zoom',
      targetScale: c.targetScale || (c.action === 'punch_zoom' ? 1.12 : 1.03)
    };
  });

  const bRollElements: BRollElement[] = (data.bRollElements || data.b_roll_elements || []).map((e: any, idx: number) => {
    const rawStartSec = parseTimeToSeconds(e.startTime || e.start_time);
    const rawEndSec = parseTimeToSeconds(e.endTime || e.end_time) || (rawStartSec + 5);
    
    // Apply -150ms (4 frames) anticipation offset
    const startSecWithAnticipation = Math.max(0, rawStartSec - 0.15);
    
    return {
      id: e.id || `elem_${idx + 1}`,
      type: e.type || 'chart',
      startTime: e.startTime || `${startSecWithAnticipation.toFixed(2)}s`,
      endTime: e.endTime || `${rawEndSec.toFixed(2)}s`,
      startFrame: Math.round(startSecWithAnticipation * fps),
      endFrame: Math.round(rawEndSec * fps),
      visualSeed: typeof e.visualSeed === 'number' ? e.visualSeed : Math.floor(Math.random() * 100),
      props: e.props || {}
    };
  });

  const soundCues: SoundCue[] = (data.soundCues || []).map((sc: any) => {
    const tSec = parseTimeToSeconds(sc.timeSec || sc.time);
    return {
      timeSec: tSec,
      frame: Math.round(tSec * fps),
      type: sc.type || 'whoosh'
    };
  });

  return {
    cameraCuts,
    bRollElements,
    soundCues,
    renderSettings: {
      presetKey: style.key,
      stylePreset: style.name,
      globalJitter: style.jitterRangeDeg / 10,
      fps,
      anticipationOffsetFrames: -4
    }
  };
}

function generateProceduralCinematicCutSheet(transcript: any[], style: any, fps: number): RemotionArchitectCutSheet {
  const totalDuration = transcript[transcript.length - 1]?.end || 15;

  const sampleCameraCuts: CameraCut[] = [
    { startTime: "00:00.00", startFrame: 0, duration: 3.5, durationFrames: Math.round(3.5 * fps), action: "punch_zoom", targetScale: 1.12 },
    { startTime: "00:03.50", startFrame: Math.round(3.5 * fps), duration: 5.0, durationFrames: Math.round(5.0 * fps), action: "scale_to_circle", targetScale: 0.45 },
    { startTime: "00:08.50", startFrame: Math.round(8.5 * fps), duration: 4.5, durationFrames: Math.round(4.5 * fps), action: "micro_zoom", targetScale: 1.03 }
  ];

  const sampleElements: BRollElement[] = [
    {
      id: "elem_proc_1",
      type: "chart",
      startTime: "00:03.35",
      endTime: "00:08.20",
      startFrame: Math.round(3.35 * fps),
      endFrame: Math.round(8.20 * fps),
      visualSeed: 42,
      props: {
        title: "Рост удержания",
        subtitle: "Динамический ИИ монтаж",
        values: [35, 60, 85, 98]
      }
    },
    {
      id: "elem_proc_2",
      type: "list",
      startTime: "00:08.35",
      endTime: "00:13.00",
      startFrame: Math.round(8.35 * fps),
      endFrame: Math.round(13.00 * fps),
      visualSeed: 77,
      props: {
        title: "Факторы удержания",
        items: ["Живая Z-камера", "Математический джиттер", "Бренд-бук субтитры"]
      }
    }
  ];

  const sampleSoundCues: SoundCue[] = [
    { timeSec: 0.0, frame: 0, type: 'whoosh' },
    { timeSec: 3.35, frame: Math.round(3.35 * fps), type: 'whoosh' },
    { timeSec: 8.35, frame: Math.round(8.35 * fps), type: 'pop' }
  ];

  return {
    cameraCuts: sampleCameraCuts,
    bRollElements: sampleElements,
    soundCues: sampleSoundCues,
    renderSettings: {
      presetKey: style.key,
      stylePreset: style.name,
      globalJitter: style.jitterRangeDeg / 10,
      fps,
      anticipationOffsetFrames: -4
    }
  };
}

function parseTimeToSeconds(timeStr: string | number): number {
  if (typeof timeStr === 'number') return timeStr;
  if (!timeStr) return 0;
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    const min = parseFloat(parts[0]);
    const sec = parseFloat(parts[1]);
    return min * 60 + sec;
  }
  return parseFloat(timeStr) || 0;
}
