import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '@/lib/ai/anthropic';
import { RemotionArchitectCutSheet, CameraCut, BRollElement, SoundCue, UserBrandDnaConfig } from '@/lib/types/remotionArchitect';
import { STYLE_PRESETS, resolveUserBrandStyle } from '@/lib/remotion/stylePresets';

export interface ToolDirectorParams {
  transcriptData: Array<{ start?: number; end?: number; text?: string; scriptText?: string }>;
  userBrandDna?: UserBrandDnaConfig;
  presetKey?: string;
  userIntent?: string;
  fps?: number;
  apiKey?: string;
}

export const ANTHROPIC_TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'trigger_camera_cut',
    description: 'Trigger a dynamic Z-axis live camera cut or zoom transformation based on script hook, punch words, or side panel overlays.',
    input_schema: {
      type: 'object',
      properties: {
        startTimeSec: { type: 'number', description: 'Start time in seconds' },
        durationSec: { type: 'number', description: 'Duration of the cut action in seconds' },
        action: {
          type: 'string',
          enum: ['micro_zoom', 'punch_zoom', 'scale_to_circle', 'move_left', 'pip_right'],
          description: 'Camera action. Use punch_zoom on hooks/punch words; micro_zoom during steady speech; scale_to_circle when side overlays are visible.'
        },
        targetScale: { type: 'number', description: 'Target camera scale multiplier (e.g. 1.03 for micro_zoom, 1.12 for punch_zoom, 0.45 for scale_to_circle)' }
      },
      required: ['startTimeSec', 'durationSec', 'action']
    }
  },
  {
    name: 'render_kinetic_quote',
    description: 'Render a high-impact Kinetic Quote overlay with word-by-word spring entrance and blur emphasis.',
    input_schema: {
      type: 'object',
      properties: {
        startTimeSec: { type: 'number', description: 'Start time in seconds' },
        endTimeSec: { type: 'number', description: 'End time in seconds' },
        quoteText: { type: 'string', description: 'The exact quote text or main key takeaway to display' },
        author: { type: 'string', description: 'Optional author or speaker title' },
        highlightKeywords: {
          type: 'array',
          items: { type: 'string' },
          description: '1-3 key words within the quote to highlight with accent gradient'
        }
      },
      required: ['startTimeSec', 'endTimeSec', 'quoteText']
    }
  },
  {
    name: 'render_chart',
    description: 'Render a glassmorphic animated chart overlay representing growth, statistics, or numerical comparisons.',
    input_schema: {
      type: 'object',
      properties: {
        startTimeSec: { type: 'number', description: 'Start time in seconds' },
        endTimeSec: { type: 'number', description: 'End time in seconds' },
        title: { type: 'string', description: 'Title of the chart' },
        values: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of percentage or comparative numerical values (e.g. [35, 60, 85, 98])'
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels for each bar (e.g. ["Q1", "Q2", "Q3", "Q4"])'
        },
        statValue: { type: 'string', description: 'Callout badge stat text (e.g. "+350%" or "$120k")' }
      },
      required: ['startTimeSec', 'endTimeSec', 'title', 'values']
    }
  }
];

export async function generateVideoTimelineViaTools({
  transcriptData,
  userBrandDna,
  presetKey = 'minimal_expert',
  userIntent = 'High Retention cinematic edit',
  fps = 30,
  apiKey
}: ToolDirectorParams): Promise<RemotionArchitectCutSheet> {
  const anthropic = getAnthropicClient(apiKey);
  const selectedStyle = resolveUserBrandStyle(presetKey, userBrandDna);

  const fullScript = transcriptData.map((t) => t.text || t.scriptText || '').join(' ');

  const manifestoSystemPrompt = `
Ты — Senior Motion Engineer и Режиссер Монтажа в Remotion, управляющий визуальной режиссурой вертикального видео (9:16) Virali AI.

### МАНИФЕСТ АРТ-ДИРЕКШЕНА И РЕЖИССУРЫ НАВЫКОВ (TOOL CALLING)
1. Камера никогда не остается статичной:
   - В период спокойного монолога вызывай \`trigger_camera_cut\` с \`action: "micro_zoom"\` (\`targetScale: 1.03\`).
   - На ключевых хуках, цифрах и эмоциональных фразах вызывай \`trigger_camera_cut\` с \`action: "punch_zoom"\` (\`targetScale: 1.12\`).
   - При активных оверлеях (\`render_chart\`) СПИШИ спикера влево через \`trigger_camera_cut\` с \`action: "scale_to_circle"\` (\`targetScale: 0.45\`).
2. Оверлеи и оратор (Safe Zones):
   - Вызывай \`render_kinetic_quote\` для ключевых инсайтов и тезисов (верхняя зона экрана).
   - Вызывай \`render_chart\` при наличии статистических данных, процентов или метрик (боковая зона экрана).
3. Тайминги:
   - Применяй точные отметки времени из транскрипта.

Позови все нужные инструменты для формирования полной композиции роликов!
`;

  const modelName = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

  // Anthropic prompt caching integration via system prompt block and custom headers
  const response = await anthropic.messages.create(
    {
      model: modelName,
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: manifestoSystemPrompt,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [
        {
          role: 'user',
          content: `Проанализируй данный транскрипт и вызови инструменты режиссуры (\`trigger_camera_cut\`, \`render_kinetic_quote\`, \`render_chart\`):\n\nТранскрипт: ${JSON.stringify(transcriptData.slice(0, 100))}\n\nЦель: ${userIntent}`
        }
      ],
      tools: ANTHROPIC_TOOL_DEFINITIONS,
      tool_choice: { type: 'auto' }
    },
    {
      headers: {
        'anthropic-beta': 'prompt-caching-2024-07-31'
      }
    }
  );

  const cameraCuts: CameraCut[] = [];
  const bRollElements: BRollElement[] = [];
  const soundCues: SoundCue[] = [];

  let elemCounter = 0;

  // Process tool calls into deterministic timeline JSON
  for (const block of response.content) {
    if (block.type === 'tool_use') {
      const { name, input } = block;
      const args: any = input || {};

      if (name === 'trigger_camera_cut') {
        const startSec = Number(args.startTimeSec) || 0;
        const duration = Number(args.durationSec) || 3.0;
        const startFrame = Math.round(startSec * fps);
        const durationFrames = Math.round(duration * fps);

        cameraCuts.push({
          startTime: `${startSec.toFixed(2)}s`,
          startFrame,
          duration,
          durationFrames,
          action: args.action || 'micro_zoom',
          targetScale: args.targetScale || (args.action === 'punch_zoom' ? 1.12 : (args.action === 'scale_to_circle' ? 0.45 : 1.03))
        });
      } else if (name === 'render_kinetic_quote') {
        elemCounter++;
        const rawStartSec = Number(args.startTimeSec) || 0;
        const rawEndSec = Number(args.endTimeSec) || (rawStartSec + 4.5);

        // Anticipation offset -150ms (-4 frames at 30 FPS)
        const startSecWithAnticipation = Math.max(0, rawStartSec - 0.15);
        const startFrame = Math.round(startSecWithAnticipation * fps);
        const endFrame = Math.round(rawEndSec * fps);

        bRollElements.push({
          id: `elem_quote_${elemCounter}`,
          type: 'kinetic_quote',
          startTime: `${startSecWithAnticipation.toFixed(2)}s`,
          endTime: `${rawEndSec.toFixed(2)}s`,
          startFrame,
          endFrame,
          visualSeed: Math.floor(Math.random() * 100),
          props: {
            quoteText: args.quoteText,
            author: args.author,
            highlightKeywords: args.highlightKeywords || []
          }
        });

        // Sound cue at startFrame + 1
        soundCues.push({
          timeSec: startSecWithAnticipation,
          frame: startFrame + 1,
          type: 'whoosh'
        });
      } else if (name === 'render_chart') {
        elemCounter++;
        const rawStartSec = Number(args.startTimeSec) || 0;
        const rawEndSec = Number(args.endTimeSec) || (rawStartSec + 5.0);

        const startSecWithAnticipation = Math.max(0, rawStartSec - 0.15);
        const startFrame = Math.round(startSecWithAnticipation * fps);
        const endFrame = Math.round(rawEndSec * fps);

        bRollElements.push({
          id: `elem_chart_${elemCounter}`,
          type: 'glassmorphic_chart',
          startTime: `${startSecWithAnticipation.toFixed(2)}s`,
          endTime: `${rawEndSec.toFixed(2)}s`,
          startFrame,
          endFrame,
          visualSeed: Math.floor(Math.random() * 100),
          props: {
            title: args.title,
            values: args.values,
            labels: args.labels,
            statValue: args.statValue
          }
        });

        soundCues.push({
          timeSec: startSecWithAnticipation,
          frame: startFrame + 1,
          type: 'pop'
        });

        // Side panel coupling: auto-inject scale_to_circle camera cut
        cameraCuts.push({
          startTime: `${startSecWithAnticipation.toFixed(2)}s`,
          startFrame,
          duration: rawEndSec - startSecWithAnticipation,
          durationFrames: endFrame - startFrame,
          action: 'scale_to_circle',
          targetScale: 0.45
        });
      }
    }
  }

  // Sort camera cuts by start frame
  cameraCuts.sort((a, b) => a.startFrame - b.startFrame);

  return {
    cameraCuts,
    bRollElements,
    soundCues,
    renderSettings: {
      presetKey: selectedStyle.key,
      stylePreset: selectedStyle.name,
      globalJitter: selectedStyle.jitterRangeDeg / 10,
      fps,
      anticipationOffsetFrames: -4
    }
  };
}
