import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '@/lib/ai/anthropic';
import { RemotionArchitectCutSheet, CameraCut, BRollElement, SoundCue, UserBrandDnaConfig, DynamicThemeConfig, BRollLayoutMode, ChartVariant } from '@/lib/types/remotionArchitect';
import { STYLE_PRESETS, resolveUserBrandStyle, buildDynamicThemeFromPrompt } from '@/lib/remotion/stylePresets';

export interface ToolDirectorParams {
  transcriptData: Array<{ start?: number; end?: number; text?: string; scriptText?: string }>;
  userBrandDna?: UserBrandDnaConfig;
  presetKey?: string;
  userIntent?: string;
  fps?: number;
  apiKey?: string;
  includeSubtitles?: boolean;
  dynamicTheme?: DynamicThemeConfig;
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
        layoutMode: {
          type: 'string',
          enum: ['floating_hud', 'split_screen', 'pip_side_card', 'full_slide'],
          description: 'Framing layout for speaker and quote'
        },
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
    description: 'Render an animated chart overlay representing growth, statistics, or numerical comparisons.',
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
        chartVariant: {
          type: 'string',
          enum: ['vertical_bars', 'horizontal_progress', 'radial_gauge'],
          description: 'Chart presentation format'
        },
        layoutMode: {
          type: 'string',
          enum: ['floating_hud', 'split_screen', 'pip_side_card', 'full_slide'],
          description: 'Framing layout for speaker and chart'
        },
        statValue: { type: 'string', description: 'Callout badge stat text (e.g. "+350%" or "$120k")' }
      },
      required: ['startTimeSec', 'endTimeSec', 'title', 'values']
    }
  },
  {
    name: 'render_list_overlay',
    description: 'Render a bulleted list of key benefits, roadmap steps, or principles from the speaker speech.',
    input_schema: {
      type: 'object',
      properties: {
        startTimeSec: { type: 'number', description: 'Start time in seconds' },
        endTimeSec: { type: 'number', description: 'End time in seconds' },
        title: { type: 'string', description: 'Header of the list' },
        items: {
          type: 'array',
          items: { type: 'string' },
          description: '2 to 4 bullet points'
        },
        layoutMode: {
          type: 'string',
          enum: ['floating_hud', 'split_screen', 'pip_side_card', 'full_slide'],
          description: 'Framing layout'
        }
      },
      required: ['startTimeSec', 'endTimeSec', 'items']
    }
  },
  {
    name: 'render_stat_callout',
    description: 'Render a huge punch statistic or KPI callout badge (e.g. 10x, +300%, $50,000).',
    input_schema: {
      type: 'object',
      properties: {
        startTimeSec: { type: 'number', description: 'Start time in seconds' },
        endTimeSec: { type: 'number', description: 'End time in seconds' },
        statValue: { type: 'string', description: 'Number or percentage badge (e.g. "+350%")' },
        statLabel: { type: 'string', description: 'Short subtitle under the number' },
        layoutMode: {
          type: 'string',
          enum: ['floating_hud', 'split_screen', 'pip_side_card', 'full_slide'],
          description: 'Framing layout'
        }
      },
      required: ['startTimeSec', 'endTimeSec', 'statValue']
    }
  },
  {
    name: 'render_comparison_card',
    description: 'Render a Before vs After / Problem vs Solution side-by-side comparison card.',
    input_schema: {
      type: 'object',
      properties: {
        startTimeSec: { type: 'number', description: 'Start time in seconds' },
        endTimeSec: { type: 'number', description: 'End time in seconds' },
        beforeTitle: { type: 'string', description: 'Left title (e.g. Было)' },
        beforeValue: { type: 'string', description: 'Left description/number' },
        afterTitle: { type: 'string', description: 'Right title (e.g. Стало)' },
        afterValue: { type: 'string', description: 'Right description/number' },
        layoutMode: {
          type: 'string',
          enum: ['floating_hud', 'split_screen', 'pip_side_card', 'full_slide'],
          description: 'Framing layout'
        }
      },
      required: ['startTimeSec', 'endTimeSec', 'beforeValue', 'afterValue']
    }
  }
];

export async function generateVideoTimelineViaTools({
  transcriptData,
  userBrandDna,
  presetKey = 'minimal_expert',
  userIntent = 'High Retention cinematic edit',
  fps = 30,
  apiKey,
  includeSubtitles = false,
  dynamicTheme
}: ToolDirectorParams): Promise<RemotionArchitectCutSheet> {
  const anthropic = getAnthropicClient(apiKey);
  const selectedStyle = resolveUserBrandStyle(presetKey, userBrandDna);
  const resolvedTheme = dynamicTheme || buildDynamicThemeFromPrompt(userIntent, presetKey, 42, userBrandDna);

  const fullScript = transcriptData.map((t) => t.text || t.scriptText || '').join(' ');

  const manifestoSystemPrompt = `
Ты — Senior Motion Engineer и Режиссер Монтажа в Remotion, управляющий визуальной режиссурой вертикального видео (9:16) Virali AI.

### МАНИФЕСТ АРТ-ДИРЕКШЕНА И РЕЖИССУРЫ НАВЫКОВ (TOOL CALLING)
1. Камера никогда не остается статичной:
   - В период спокойного монолога вызывай \`trigger_camera_cut\` с \`action: "micro_zoom"\` (\`targetScale: 1.03\`).
   - На ключевых хуках, цифрах и эмоциональных фразах вызывай \`trigger_camera_cut\` с \`action: "punch_zoom"\` (\`targetScale: 1.12\`).
   - При активных оверлеях (\`render_chart\`, \`render_list_overlay\`) сдвигай спикера влево или делай Split-Screen.
2. Оверлеи и компоновка (Safe Zones):
   - \`render_kinetic_quote\` — для ключевых инсайтов и хуков (layoutMode: "floating_hud" или "split_screen").
   - \`render_chart\` — при наличии цифр, статистики или процентов (chartVariant: "vertical_bars" | "horizontal_progress" | "radial_gauge").
   - \`render_list_overlay\` — при перечислении шагов, правил или советов спикера.
   - \`render_stat_callout\` — при громких метриках (10x, +300%, $100k).
   - \`render_comparison_card\` — при сравнении "Было / Стало" или "Проблема / Решение".

Позови все нужные инструменты для формирования полной композиции роликов!
`;

  const modelName = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

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
          content: `Проанализируй данный транскрипт и вызови инструменты режиссуры:\n\nТранскрипт: ${JSON.stringify(transcriptData.slice(0, 100))}\n\nЦель и бриф: ${userIntent}`
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

        const startSecWithAnticipation = Math.max(0, rawStartSec - 0.15);
        const startFrame = Math.round(startSecWithAnticipation * fps);
        const endFrame = Math.round(rawEndSec * fps);

        bRollElements.push({
          id: `elem_quote_${elemCounter}`,
          type: 'kinetic_quote',
          layoutMode: args.layoutMode || 'floating_hud',
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
          type: 'chart',
          layoutMode: args.layoutMode || 'split_screen',
          chartVariant: args.chartVariant || 'vertical_bars',
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

        if (args.layoutMode === 'pip_side_card') {
          cameraCuts.push({
            startTime: `${startSecWithAnticipation.toFixed(2)}s`,
            startFrame,
            duration: rawEndSec - startSecWithAnticipation,
            durationFrames: endFrame - startFrame,
            action: 'scale_to_circle',
            targetScale: 0.45
          });
        }
      } else if (name === 'render_list_overlay') {
        elemCounter++;
        const rawStartSec = Number(args.startTimeSec) || 0;
        const rawEndSec = Number(args.endTimeSec) || (rawStartSec + 5.0);
        const startSecWithAnticipation = Math.max(0, rawStartSec - 0.15);
        const startFrame = Math.round(startSecWithAnticipation * fps);
        const endFrame = Math.round(rawEndSec * fps);

        bRollElements.push({
          id: `elem_list_${elemCounter}`,
          type: 'list',
          layoutMode: args.layoutMode || 'floating_hud',
          startTime: `${startSecWithAnticipation.toFixed(2)}s`,
          endTime: `${rawEndSec.toFixed(2)}s`,
          startFrame,
          endFrame,
          visualSeed: Math.floor(Math.random() * 100),
          props: {
            title: args.title || 'КЛЮЧЕВЫЕ ТЕЗИСЫ',
            items: args.items || []
          }
        });

        soundCues.push({
          timeSec: startSecWithAnticipation,
          frame: startFrame + 1,
          type: 'whoosh'
        });
      } else if (name === 'render_stat_callout') {
        elemCounter++;
        const rawStartSec = Number(args.startTimeSec) || 0;
        const rawEndSec = Number(args.endTimeSec) || (rawStartSec + 4.0);
        const startSecWithAnticipation = Math.max(0, rawStartSec - 0.15);
        const startFrame = Math.round(startSecWithAnticipation * fps);
        const endFrame = Math.round(rawEndSec * fps);

        bRollElements.push({
          id: `elem_stat_${elemCounter}`,
          type: 'stat_callout',
          layoutMode: args.layoutMode || 'floating_hud',
          startTime: `${startSecWithAnticipation.toFixed(2)}s`,
          endTime: `${rawEndSec.toFixed(2)}s`,
          startFrame,
          endFrame,
          visualSeed: Math.floor(Math.random() * 100),
          props: {
            statValue: args.statValue,
            statLabel: args.statLabel || 'Главный показатель'
          }
        });

        soundCues.push({
          timeSec: startSecWithAnticipation,
          frame: startFrame + 1,
          type: 'pop'
        });
      } else if (name === 'render_comparison_card') {
        elemCounter++;
        const rawStartSec = Number(args.startTimeSec) || 0;
        const rawEndSec = Number(args.endTimeSec) || (rawStartSec + 5.0);
        const startSecWithAnticipation = Math.max(0, rawStartSec - 0.15);
        const startFrame = Math.round(startSecWithAnticipation * fps);
        const endFrame = Math.round(rawEndSec * fps);

        bRollElements.push({
          id: `elem_compare_${elemCounter}`,
          type: 'comparison_card',
          layoutMode: args.layoutMode || 'split_screen',
          startTime: `${startSecWithAnticipation.toFixed(2)}s`,
          endTime: `${rawEndSec.toFixed(2)}s`,
          startFrame,
          endFrame,
          visualSeed: Math.floor(Math.random() * 100),
          props: {
            beforeTitle: args.beforeTitle || 'Было',
            beforeValue: args.beforeValue,
            afterTitle: args.afterTitle || 'Стало',
            afterValue: args.afterValue
          }
        });

        soundCues.push({
          timeSec: startSecWithAnticipation,
          frame: startFrame + 1,
          type: 'whoosh'
        });
      }
    }
  }

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
      anticipationOffsetFrames: -4,
      includeSubtitles: Boolean(includeSubtitles),
      userPrompt: userIntent,
      dynamicTheme: resolvedTheme
    }
  };
}
