import { NextRequest, NextResponse } from 'next/server';
import { buildDynamicThemeFromPrompt } from '@/lib/remotion/stylePresets';
import { BRollElement } from '@/lib/types/remotionArchitect';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode = 'enrich_brief', rawPrompt = '', transcriptData = [], brandDna, currentElement, command } = body;

    const fullScript = Array.isArray(transcriptData)
      ? transcriptData.map((t: any) => t.text || t.scriptText || '').filter(Boolean).join(' ')
      : '';

    // 1. SURGICAL SCENE EDIT MODE (Direct targeted adjustment of a single scene)
    if (mode === 'surgical_scene_edit' && currentElement) {
      const updated = await runSurgicalElementEdit(currentElement, command || rawPrompt, fullScript);
      return NextResponse.json({ success: true, updatedElement: updated });
    }

    // 2. ENRICH BRIEF MODE (Claude Motion Structured Brief generator)
    const visualSeed = Math.floor(Math.random() * 100);
    const suggestedTheme = buildDynamicThemeFromPrompt(rawPrompt, brandDna?.stylePreset, visualSeed, brandDna);

    const enrichedPrompt = await generateMotionBrief(rawPrompt, fullScript, suggestedTheme);

    return NextResponse.json({
      success: true,
      enrichedPrompt,
      suggestedTheme,
      visualSeed
    });
  } catch (error: any) {
    console.error('[remotion-enrich-prompt] Route error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Prompt enrichment failed' },
      { status: 500 }
    );
  }
}

async function generateMotionBrief(userPrompt: string, scriptText: string, theme: any): Promise<string> {
  const systemPrompt = `
Ты — Senior Motion Director в стиле Claude Motion и Remotion.
Твоя задача — взять короткую мысль пользователя и текст сценария ролика, и развернуть её в структурированный РЕЖИССЕРСКИЙ MOTION BRIEF на русском языке.

### ФОРМАТ ВЫВОДА (3-4 абзаца, строго по структуре):
1. ВИЗУАЛЬНЫЙ КОД И ТЕМА: Стиль, палитра (напр. ${theme.themeMode === 'light' ? 'светлый Apple-минимализм' : 'темный премиум'}), геометрия карточек (${theme.cardGeometry}), фоновый паттерн (${theme.backgroundPattern}).
2. КАМЕРА И СПИКЕР: Как двигается камера (микро-зумы на спокойной речи, панч-зум на хуке) и куда смещается спикер во время инфографики (напр. Split-Screen 50/50, кружок слева или плавающий HUD).
3. ПОСЕКУНДНЫЙ ПЛАН СЦЕН: Выдели 2-4 конкретные цифры, тезиса или цитаты из речи спикера с точным указанием секунд и типа анимации (напр. 00:03-00:07 График +300%, 00:08-00:12 Список из 3 пунктов).

Не пиши вводных слов вроде "Конечно, вот бриф". Начни сразу со структуры. Текст должен быть удобен для чтения и редактирования пользователем.
`;

  const userContent = `
Пожелание пользователя: "${userPrompt || 'Сделай динамичный, современный моушн-монтаж с акцентом на ключевые цифры и смыслы'}"
Транскрипт видео (первые 400 симв): "${scriptText.slice(0, 400)}"
  `.trim();

  const responseText = await callLlmWithFallback(systemPrompt, userContent);
  if (responseText) {
    return responseText.trim();
  }

  // Fallback template if all LLM keys fail
  return `ВИЗУАЛЬНЫЙ КОД: Современный экспертный стиль (${theme.palette.accentPrimary}), скругленные карточки с легким свечением.\nКАМЕРА: Динамичный панч-зум на стартовом хуке, плавный сдвиг спикера в кружок слева при показе инфографики.\nПОСЕКУНДНЫЙ ПЛАН: На 3-й секунде вывод анимированного графика роста, на 8-й секунде — плашка с главным тезисом и звуковым акцентом Whoosh.`;
}

async function runSurgicalElementEdit(elem: BRollElement, command: string, scriptText: string): Promise<BRollElement> {
  const systemPrompt = `
Ты — Режиссер монтажа. Пользователь хочет точечно изменить ОДИН элемент моушн-графики:
Текущий элемент: ${JSON.stringify(elem)}
Команда пользователя: "${command}"
Контекст речи: "${scriptText.slice(0, 300)}"

Верни ТОЛЬКО обновленный JSON объекта элемента в формате:
{
  "id": "${elem.id}",
  "type": "chart" | "list" | "stat_callout" | "kinetic_quote" | "comparison_card",
  "layoutMode": "floating_hud" | "split_screen" | "pip_side_card" | "full_slide",
  "chartVariant": "vertical_bars" | "horizontal_progress" | "radial_gauge",
  "startTime": "${elem.startTime}",
  "endTime": "${elem.endTime}",
  "startFrame": ${elem.startFrame},
  "endFrame": ${elem.endFrame},
  "visualSeed": ${elem.visualSeed},
  "props": {
    "title": "...",
    "statValue": "...",
    "items": ["..."],
    "values": [40, 80],
    "labels": ["Q1", "Q2"]
  }
}
  `.trim();

  const rawJson = await callLlmWithFallback(systemPrompt, 'Выполни обновление элемента и верни валидный JSON.', true);
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed && parsed.type) {
        return {
          ...elem,
          ...parsed,
          id: elem.id,
          startTime: elem.startTime,
          endTime: elem.endTime,
          startFrame: elem.startFrame,
          endFrame: elem.endFrame
        };
      }
    } catch (e) {}
  }

  // Fallback if parsing fails: apply basic heuristic
  const updatedProps = { ...elem.props };
  const cmd = command.toLowerCase();
  if (cmd.includes('круг') || cmd.includes('radial')) {
    return { ...elem, type: 'chart', chartVariant: 'radial_gauge', props: updatedProps };
  }
  if (cmd.includes('пополам') || cmd.includes('split') || cmd.includes('50/50')) {
    return { ...elem, layoutMode: 'split_screen' };
  }
  if (cmd.includes('кружок') || cmd.includes('pip') || cmd.includes('слева')) {
    return { ...elem, layoutMode: 'pip_side_card' };
  }

  return elem;
}

async function callLlmWithFallback(systemPrompt: string, userPrompt: string, jsonMode: boolean = false): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: jsonMode ? { type: 'json_object' } : undefined,
          temperature: 0.6
        })
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.warn('[remotion-enrich-prompt] Groq fallback error:', e);
    }
  }

  if (anthropicKey) {
    try {
      const { getAnthropicClient } = await import('@/lib/ai/anthropic');
      const client = getAnthropicClient(anthropicKey);
      const msg = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      });
      const firstBlock: any = msg.content[0];
      if (firstBlock && firstBlock.text) return firstBlock.text;
    } catch (e) {
      console.warn('[remotion-enrich-prompt] Anthropic fallback error:', e);
    }
  }

  if (geminiKey) {
    try {
      const { getModel } = await import('@/lib/ai/gemini');
      const model = getModel('fast', 'ru', jsonMode ? 'json' : 'text', geminiKey);
      const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
      const text = (await result.response).text();
      if (text) return text;
    } catch (e) {
      console.warn('[remotion-enrich-prompt] Gemini fallback error:', e);
    }
  }

  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: jsonMode ? { type: 'json_object' } : undefined,
          temperature: 0.6
        })
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {}
  }

  return null;
}
