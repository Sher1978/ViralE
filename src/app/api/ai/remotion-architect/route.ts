import { NextRequest, NextResponse } from 'next/server';
import { RemotionArchitectCutSheet } from '@/lib/types/remotionArchitect';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcriptData, nicheProfile, userIntent, fps = 30 } = body;

    if (!transcriptData || !Array.isArray(transcriptData)) {
      return NextResponse.json({ error: 'transcriptData must be a valid array' }, { status: 400 });
    }

    const systemPrompt = `
Ты — AI-Архитектор визуального продакшена приложения Virali (Remotion B-Roll Architect). 
Твоя задача — трансформировать исходный транскрипт видео спикера в премиальный динамический контент (High Retention Video Edit).

### ВХОДНЫЕ ДАННЫЕ
- transcript_data: ${JSON.stringify(transcriptData)}
- niche_profile: ${JSON.stringify(nicheProfile || { type: 'business' })}
- user_intent: ${userIntent || 'High Retention dynamic motion edit'}

### ТВОИ ЗАДАЧИ
1. АНАЛИЗ СМЫСЛА: Разбей транскрипт на ключевые смысловые блоки.
2. ПЛАНИРОВАНИЕ ТРАНСФОРМАЦИЙ КАМЕРЫ (camera_cuts):
   - Определи моменты, когда видео спикера должно уменьшиться или сдвинуться, чтобы освободить место для инфографики.
   - Используй действия: "scale_to_circle", "move_left", "full_screen", "pip_right".
3. ГЕНЕРАЦИЯ ВИЗУАЛЬНОГО КОНТЕНТА (b_roll_elements):
   - Если примеры, цифры или динамика -> type: "chart" (с полем values: [40, 65, 80, 95], title).
   - Если ключевая мысль/цитата -> type: "tweet_card" (author, text, handle).
   - Если перечисление тезисов -> type: "list" (title, items: ["...", "..."]).
   - Если абстрактное понятие -> type: "3d_icon" (iconName).
4. УНИКАЛЬНОСТЬ: Присвой каждому b_roll_element уникальное случайное число visual_seed (от 0 до 100).

### ВЫХОДНОЙ ФОРМАТ (СТРОГИЙ JSON БЕЗ МАРКДАУН):
{
  "cameraCuts": [
    {
      "startTime": "00:02.50",
      "action": "scale_to_circle",
      "duration": 4.5
    }
  ],
  "bRollElements": [
    {
      "id": "elem_1",
      "type": "chart",
      "startTime": "00:02.50",
      "endTime": "00:07.00",
      "visualSeed": 42,
      "props": {
        "title": "Рост вовлеченности",
        "values": [35, 60, 85, 98]
      }
    }
  ],
  "renderSettings": {
    "preset": "high_retention",
    "globalJitter": 0.25
  }
}
    `;

    // Вызываем Groq / Gemini / OpenAI
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    let rawJsonText = '';

    if (groqKey) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Generate the Remotion Architect JSON cut sheet for this video transcript now.' }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.4
        })
      });

      if (groqRes.ok) {
        const data = await groqRes.json();
        rawJsonText = data.choices?.[0]?.message?.content || '';
      }
    }

    // Fallback Mock data if LLM key is absent or failed
    let cutSheet: RemotionArchitectCutSheet;
    if (rawJsonText) {
      try {
        const parsed = JSON.parse(rawJsonText);
        cutSheet = processAndCalculateFrames(parsed, fps);
      } catch (err) {
        console.warn('[RemotionArchitect] Failed to parse JSON response, using fallback cutSheet');
        cutSheet = getFallbackCutSheet(transcriptData, fps);
      }
    } else {
      cutSheet = getFallbackCutSheet(transcriptData, fps);
    }

    return NextResponse.json({ success: true, cutSheet });
  } catch (error: any) {
    console.error('[RemotionArchitect] Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}

// Convert MM:SS.SS time strings into exact frames
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

function processAndCalculateFrames(data: any, fps: number): RemotionArchitectCutSheet {
  const cameraCuts = (data.cameraCuts || data.camera_cuts || []).map((c: any) => {
    const startSec = parseTimeToSeconds(c.startTime || c.start_time);
    const duration = parseFloat(c.duration) || 4;
    return {
      startTime: c.startTime || `${startSec}s`,
      startFrame: Math.round(startSec * fps),
      duration,
      durationFrames: Math.round(duration * fps),
      action: c.action || 'scale_to_circle'
    };
  });

  const bRollElements = (data.bRollElements || data.b_roll_elements || []).map((e: any, idx: number) => {
    const startSec = parseTimeToSeconds(e.startTime || e.start_time);
    const endSec = parseTimeToSeconds(e.endTime || e.end_time) || (startSec + 5);
    return {
      id: e.id || `elem_${idx + 1}`,
      type: e.type || 'chart',
      startTime: e.startTime || `${startSec}s`,
      endTime: e.endTime || `${endSec}s`,
      startFrame: Math.round(startSec * fps),
      endFrame: Math.round(endSec * fps),
      visualSeed: typeof e.visualSeed === 'number' ? e.visualSeed : Math.floor(Math.random() * 100),
      props: e.props || {}
    };
  });

  return {
    cameraCuts,
    bRollElements,
    renderSettings: {
      preset: data.renderSettings?.preset || 'high_retention',
      globalJitter: data.renderSettings?.globalJitter || 0.25,
      fps
    }
  };
}

function getFallbackCutSheet(transcriptData: any[], fps: number): RemotionArchitectCutSheet {
  const totalDuration = transcriptData[transcriptData.length - 1]?.end || 15;

  return processAndCalculateFrames({
    cameraCuts: [
      {
        startTime: "00:02.00",
        action: "scale_to_circle",
        duration: 5.0
      }
    ],
    bRollElements: [
      {
        id: "elem_demo_1",
        type: "chart",
        startTime: "00:02.00",
        endTime: "00:07.00",
        visualSeed: 42,
        props: {
          title: "Рост просмотров",
          values: [40, 65, 80, 98]
        }
      },
      {
        id: "elem_demo_2",
        type: "list",
        startTime: "00:08.00",
        endTime: "00:13.00",
        visualSeed: 77,
        props: {
          title: "Ключевые факторы",
          items: ["Высокая динамика", "Сжатие спикера", "3D Инфографика"]
        }
      }
    ],
    renderSettings: {
      preset: "high_retention",
      globalJitter: 0.2
    }
  }, fps);
}
