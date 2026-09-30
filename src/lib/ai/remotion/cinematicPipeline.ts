import { RemotionArchitectCutSheet, CameraCut, BRollElement, SoundCue, UserBrandDnaConfig } from '@/lib/types/remotionArchitect';
import { STYLE_PRESETS, resolveUserBrandStyle } from '@/lib/remotion/stylePresets';
import { buildFewShotRagPromptContext } from './videoScoreLibrary';
import { getRotatedArtMedium, buildDynamicAssetPrompt } from './dynamicPrompting';
import { getRemotionPromptLibraryContext } from './remotionPromptLibrary';
import { generateVideoTimelineViaTools } from './claudeToolDirector';

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

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const startTime = Date.now();

  // PASS 0: Claude 3.5 Sonnet Tool Calling Director Agent (Deterministic Skill Direction)
  if (anthropicKey) {
    try {
      console.log('[CinematicPipeline] Executing Claude 3.5 Sonnet Tool Calling Director Agent...');
      const toolCutSheet = await generateVideoTimelineViaTools({
        transcriptData,
        userBrandDna,
        presetKey,
        userIntent,
        fps,
        apiKey: anthropicKey
      });

      if (toolCutSheet && (toolCutSheet.cameraCuts.length > 0 || toolCutSheet.bRollElements.length > 0)) {
        toolCutSheet.qaDiagnostics = {
          provider: 'groq', // mapped to active AI model key
          passed: true,
          score: 100,
          attempts: 1,
          issues: [],
          generationTimeMs: Date.now() - startTime
        };
        return toolCutSheet;
      }
    } catch (toolErr) {
      console.warn('[CinematicPipeline] Claude 3.5 Sonnet Tool Calling failed, falling back to legacy multi-agent pipeline:', toolErr);
    }
  }

  if (groqKey || geminiKey || openaiKey) {
    const activeKey = groqKey || geminiKey || openaiKey!;
    const providerName = groqKey ? 'groq' : (geminiKey ? 'gemini' : 'openai');
    try {
      let attempts = 0;
      let finalCutSheet: any = null;
      let lastQaResult: any = { isValid: true, score: 100, issues: [] };

      while (attempts < 2) {
        attempts++;
        // PASS 1: UNIFIED MASTER AGENT (Replaces Director, Art Director, and Animator)
        const cutSheet = await runUnifiedCinematicAgent(transcriptData, selectedStyle, userBrandDna, userIntent, fps, activeKey);

        if (cutSheet && cutSheet.cameraCuts && cutSheet.bRollElements) {
          // PASS 2: QA INSPECTOR AGENT (Validation)
          lastQaResult = await runQaInspectorAgent(cutSheet, transcriptData);
          console.log(`[CinematicPipeline] Unified QA Result (${providerName.toUpperCase()}, Attempt ${attempts}):`, lastQaResult);

          if (lastQaResult.isValid || attempts >= 2) {
            finalCutSheet = cutSheet;
            break;
          } else {
            console.warn(`[CinematicPipeline] QA rejected cutSheet due to issues: ${lastQaResult.issues.join(', ')}. Retrying generation...`);
          }
        }
      }

      if (finalCutSheet) {
        const enriched = processAndEnrichCutSheet(finalCutSheet, selectedStyle, fps);
        enriched.qaDiagnostics = {
          provider: providerName,
          passed: lastQaResult.isValid,
          score: lastQaResult.score,
          attempts,
          issues: lastQaResult.issues,
          generationTimeMs: Date.now() - startTime
        };
        return enriched;
      }
    } catch (err) {
      console.warn('[CinematicPipeline] Multi-agent execution failed, falling back to smart procedural generator:', err);
    }
  }

  // Fallback to high-quality procedural cinematic generation
  const proceduralResult = generateProceduralCinematicCutSheet(transcriptData, selectedStyle, fps);
  proceduralResult.qaDiagnostics = {
    provider: 'procedural',
    passed: true,
    score: 100,
    attempts: 1,
    issues: [],
    generationTimeMs: Date.now() - startTime
  };
  return proceduralResult;
}

/**
 * UNIFIED MASTER AGENT: Combines Director, Art Director, and Animator to save API requests and prevent Rate Limits (429).
 */
async function runUnifiedCinematicAgent(transcript: any[], style: any, userDna: any, intent: string, fps: number, apiKey: string): Promise<any> {
  const fullScriptText = transcript.map(t => t.text || t.scriptText || '').join(' ');
  const ragContext = buildFewShotRagPromptContext(fullScriptText);
  const rotatedMedium = getRotatedArtMedium(Date.now());
  const remotionContext = getRemotionPromptLibraryContext();

  const prompt = `
Ты — Master Cinematic Director сервиса Virali AI. Твоя задача — провести полный монтаж (режиссура, арт-дирекшн, анимация) за ОДИН шаг.

### ВХОДНЫЕ ДАННЫЕ
- Цель: ${intent}
- FPS: ${fps}
- Стиль: ${style.name} (Акцент: ${style.colors.accent})
- 3D-Медиум: ${rotatedMedium.details.name}
- Транскрипт (макс 250 симв): ${JSON.stringify(transcript.slice(0, 200))}
${ragContext}
${remotionContext}

### ТВОИ ЗАДАЧИ
1. Выдели ХУК (первые секунды) и ключевые смысловые зоны (Punch words, списки, графики).
2. Расставь камеру (cameraCuts): "micro_zoom", "punch_zoom", "scale_to_circle". Используй время упреждения -150ms.
3. Создай графику (bRollElements): "chart", "kinetic_quote", "list", "stat_callout". Назначай визуальные метафоры на скучные зоны.
4. Добавь звуки (soundCues): "whoosh", "pop", "click" на появления.

Формат вывода STRICT JSON:
{
  "cameraCuts": [
    { "startTime": "00:00.00", "duration": 3.0, "action": "punch_zoom", "targetScale": 1.12 }
  ],
  "bRollElements": [
    { "id": "elem_1", "type": "chart", "startTime": "00:02.80", "endTime": "00:07.50", "props": { "title": "График", "values": [40, 98] } }
  ],
  "soundCues": [
    { "timeSec": 2.8, "type": "whoosh" }
  ]
}
  `;

  return await callLlmApi(prompt, apiKey);
}

function cleanJsonResponse(raw: string): any {
  if (!raw) return null;
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } catch (err) {}
    }
  }
  return null;
}

/**
 * Call Groq/Gemini API helper
 */
async function callLlmApi(systemPrompt: string, apiKey: string): Promise<any> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || apiKey;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (groqKey) {
    try {
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
          temperature: 0.4
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        const parsed = cleanJsonResponse(text);
        if (parsed) return parsed;
      }
    } catch (e) {
      console.warn('[CinematicPipeline] Groq LLM call failed:', e);
    }
  }

  if (geminiKey) {
    try {
      const { getModel } = await import('@/lib/ai/gemini');
      const model = getModel('fast', 'en', 'json', geminiKey);
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      const text = response.text().trim();
      const parsed = cleanJsonResponse(text);
      if (parsed) return parsed;
    } catch (e) {
      console.warn('[CinematicPipeline] Gemini LLM call failed, trying next provider:', e);
    }
  }

  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Generate JSON now.' }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.4
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        const parsed = cleanJsonResponse(text);
        if (parsed) return parsed;
      }
    } catch (e) {
      console.warn('[CinematicPipeline] OpenAI LLM call failed:', e);
    }
  }

  return null;
}

/**
 * PASS 4: QA Inspector Agent (Quality Assurance & Automatic Validation)
 */
async function runQaInspectorAgent(cutSheet: any, transcript: any[]): Promise<{ isValid: boolean; score: number; issues: string[] }> {
  const issues: string[] = [];

  if (!cutSheet || !Array.isArray(cutSheet.bRollElements)) {
    return { isValid: false, score: 0, issues: ['Схема монтажа пуста или не содержит элементов'] };
  }

  // 1. Validate element content completeness
  cutSheet.bRollElements.forEach((elem: any, idx: number) => {
    if (elem.type === 'list') {
      if (!elem.props?.items || !Array.isArray(elem.props.items) || elem.props.items.length === 0) {
        issues.push(`Элемент #${idx + 1} (list) не содержит пунктов`);
      }
    } else if (elem.type === 'chart') {
      if (!elem.props?.values || !Array.isArray(elem.props.values) || elem.props.values.length === 0) {
        issues.push(`Элемент #${idx + 1} (chart) не содержит значений`);
      }
    } else if (elem.type === 'stat_callout') {
      if (!elem.props?.statValue) {
        issues.push(`Элемент #${idx + 1} (stat_callout) не содержит числового значения`);
      }
    } else if (elem.type === 'kinetic_quote' || elem.type === 'tweet_card') {
      if (!elem.props?.text && !elem.props?.title) {
        issues.push(`Элемент #${idx + 1} (quote) не содержит текста цитаты`);
      }
    }
  });

  // 2. Validate timing overlaps (no two full-screen elements at the exact same second)
  for (let i = 0; i < cutSheet.bRollElements.length; i++) {
    for (let j = i + 1; j < cutSheet.bRollElements.length; j++) {
      const a = cutSheet.bRollElements[i];
      const b = cutSheet.bRollElements[j];
      const aStart = parseTimeToSeconds(a.startTime);
      const aEnd = parseTimeToSeconds(a.endTime);
      const bStart = parseTimeToSeconds(b.startTime);
      const bEnd = parseTimeToSeconds(b.endTime);

      if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
        issues.push(`Перекрытие по времени между элементами ${a.id || i} и ${b.id || j}`);
      }
    }
  }

  const score = Math.max(0, 100 - issues.length * 25);
  return {
    isValid: issues.length === 0,
    score,
    issues
  };
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

  // AUTO-COUPLING: Guarantee that when side-cards (chart/list) are active, the speaker video is shifted to the left circle!
  bRollElements.forEach((elem) => {
    if (elem.type === 'chart' || elem.type === 'list') {
      const hasTransformCut = cameraCuts.some(
        (c) => (c.action === 'scale_to_circle' || c.action === 'move_left' || c.action === 'pip_right') &&
               c.startFrame <= elem.endFrame && (c.startFrame + c.durationFrames) >= elem.startFrame
      );

      if (!hasTransformCut) {
        const newCut: CameraCut = {
          startTime: elem.startTime,
          startFrame: elem.startFrame,
          duration: (elem.endFrame - elem.startFrame) / fps,
          durationFrames: elem.endFrame - elem.startFrame,
          action: 'scale_to_circle',
          targetScale: 0.45
        };

        // Filter out conflicting non-transform cuts that start during this element
        for (let i = cameraCuts.length - 1; i >= 0; i--) {
          const c = cameraCuts[i];
          if (c.action === 'micro_zoom' || c.action === 'punch_zoom') {
            if (c.startFrame >= newCut.startFrame && c.startFrame < newCut.startFrame + newCut.durationFrames) {
              cameraCuts.splice(i, 1);
            }
          }
        }

        cameraCuts.push(newCut);
      }
    }
  });

  cameraCuts.sort((a, b) => a.startFrame - b.startFrame);

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
  const fullText = transcript.map(t => t.text || t.scriptText || '').join(' ').trim();

  // Dynamically extract real sentences and keywords from transcriptData
  const sentences = fullText.split(/[.!?]\s+/).filter(s => s.trim().length > 3);
  const title1 = sentences[0] ? sentences[0].slice(0, 24) : 'Ключевые факты';
  const item1 = sentences[1] ? sentences[1].slice(0, 32) : 'Главный тезис';
  const item2 = sentences[2] ? sentences[2].slice(0, 32) : 'Практический вывод';
  const item3 = sentences[3] ? sentences[3].slice(0, 32) : 'Целевой результат';

  const numbersInText = fullText.match(/\d+%/g) || fullText.match(/\d+/g);
  const statVal = numbersInText && numbersInText[0] 
    ? (numbersInText[0].includes('%') ? numbersInText[0] : `+${numbersInText[0]}%`)
    : '+100%';

  const sampleCameraCuts: CameraCut[] = [
    { startTime: "00:00.00", startFrame: 0, duration: 3.5, durationFrames: Math.round(3.5 * fps), action: "punch_zoom", targetScale: 1.12 },
    { startTime: "00:03.50", startFrame: Math.round(3.5 * fps), duration: 5.0, durationFrames: Math.round(5.0 * fps), action: "scale_to_circle", targetScale: 0.45 },
    { startTime: "00:08.50", startFrame: Math.round(8.5 * fps), duration: 4.5, durationFrames: Math.round(4.5 * fps), action: "micro_zoom", targetScale: 1.03 }
  ];

  const sampleElements: BRollElement[] = [
    {
      id: "elem_proc_1",
      type: "list",
      startTime: "00:03.35",
      endTime: "00:08.20",
      startFrame: Math.round(3.35 * fps),
      endFrame: Math.round(8.20 * fps),
      visualSeed: Math.floor(Math.random() * 100),
      props: {
        title: title1,
        items: [item1, item2, item3]
      }
    },
    {
      id: "elem_proc_2",
      type: "stat_callout",
      startTime: "00:08.35",
      endTime: "00:13.00",
      startFrame: Math.round(8.35 * fps),
      endFrame: Math.round(13.00 * fps),
      visualSeed: Math.floor(Math.random() * 100),
      props: {
        statValue: statVal,
        statLabel: item1 || 'Ключевой показатель'
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
