import { SceneSegment, ProductionManifest } from './types/studio';
import { v4 as uuidv4 } from 'uuid';

/**
 * Splits a long text into meaningful chunks for visual scenes (2-3 sentences each)
 */
function splitStoryIntoSegments(text: string): string[] {
  // Simple split by punctuation followed by space
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  
  for (let i = 0; i < sentences.length; i += 2) {
    chunks.push(sentences.slice(i, i + 2).join(' ').trim());
  }
  
  return chunks;
}

export interface ScriptPayload {
  hook: string;
  body: string;
  triz_inversion: string;
  cta: string;
}

/**
 * Parses raw text containing script blocks into structured segments.
 * Supports both Russian and English headers.
 */
function cleanBlockText(text: string): string {
  if (!text) return '';

  // Extract speech/words text if specified inside the block (ignoring visual and screen text guidelines)
  const speechMatch = text.match(/(?:слова|speech|words|текст|голос):\s*([\s\S]+?)(?=\n\s*(?:визуал|visual|кадр|текст на экране|screen text|титры|на экране):|$)/i);
  if (speechMatch) {
    return speechMatch[1].replace(/\[[\s\S]*?\]/g, '').replace(/\s+/g, ' ').trim();
  }

  return text
    .replace(/\[[\s\S]*?\]/g, '') // remove square brackets with contents
    .replace(/^(?:hook|intro|хук|интро|зацепка|введение|body|context|тело|основная часть|контекст|triz[- ]?inversion|inversion|triz|триз[- ]?перевертыш|перевертыш|триз|cta|outro|call to action|призыв|аутро):\s*/i, '') // remove leading block label if any
    .replace(/\s+/g, ' ') // collapse whitespaces
    .trim();
}

export function parseScriptTextToPayload(text: string): ScriptPayload {
  const result: ScriptPayload = {
    hook: '',
    body: '',
    triz_inversion: '',
    cta: ''
  };

  if (!text) return result;

  const normalizedText = text.replace(/\r\n/g, '\n').trim();

  // Regex patterns to capture block contents up to the next block keyword or end of text.
  // Case-insensitive, supporting multiple variations in English/Russian.
  const hookRegex = /(?:hook|intro|хук|интро|зацепка|введение):\s*([\s\S]*?)(?=\n\s*(?:body|context|тело|основная часть|контекст|triz|inversion|триз|перевертыш|cta|outro|призыв|аутро):|$)/i;
  const bodyRegex = /(?:body|context|тело|основная часть|контекст):\s*([\s\S]*?)(?=\n\s*(?:triz|inversion|триз|перевертыш|cta|outro|призыв|аутро):|$)/i;
  const trizRegex = /(?:triz[- ]?inversion|inversion|triz|триз[- ]?перевертыш|перевертыш|триз):\s*([\s\S]*?)(?=\n\s*(?:cta|outro|призыв|аутро):|$)/i;
  const ctaRegex = /(?:cta|outro|call to action|призыв|аутро):\s*([\s\S]*?)$/i;

  const hookMatch = normalizedText.match(hookRegex);
  const bodyMatch = normalizedText.match(bodyRegex);
  const trizMatch = normalizedText.match(trizRegex);
  const ctaMatch = normalizedText.match(ctaRegex);

  if (hookMatch) result.hook = cleanBlockText(hookMatch[1]);
  if (bodyMatch) result.body = cleanBlockText(bodyMatch[1]);
  if (trizMatch) result.triz_inversion = cleanBlockText(trizMatch[1]);
  if (ctaMatch) result.cta = cleanBlockText(ctaMatch[1]);

  // Fallback: If no blocks were extracted, treat the entire text as the hook
  if (!result.hook && !result.body && !result.triz_inversion && !result.cta) {
    result.hook = cleanBlockText(normalizedText);
  }

  return result;
}

export function createInitialManifest(projectId: string, versionId: string, scriptData: any): ProductionManifest {
  const segments: SceneSegment[] = [];

  const extractText = (block: any) => {
    if (!block) return '';
    return typeof block === 'string' ? block : block.words || '';
  };

  const hookText = extractText(scriptData.hook);
  const contextText = extractText(scriptData.context || scriptData.body);
  const meatText = extractText(scriptData.meat || scriptData.triz_inversion);
  const ctaText = extractText(scriptData.cta);

  // 1. Hook (Intro Avatar)
  segments.push({
    id: uuidv4(),
    type: 'intro_avatar',
    scriptText: hookText,
    prompt: `Professional cinematic avatar: ${hookText.substring(0, 80)}`,
    status: 'pending',
    animationStyle: 'none',
    duration: 5
  });

  // 2. Context (Whiteboard Visual — body block)
  if (contextText) {
    const subjectSnippet = contextText.substring(0, 60);
    segments.push({
      id: uuidv4(),
      type: 'animated_still',
      scriptText: contextText,
      prompt: `A charming naive children's book doodle illustration of ${subjectSnippet}, simple expressive black felt-tip marker drawing, whimsical hand-drawn style, minimalist kindergarten sketch aesthetic, funny, cute simplicity, isolated on a solid pure white canvas. Strictly no complex shading, no gradients, vector lines. The bottom-right quadrant of the canvas is completely empty, pure solid white blank space, strictly zero objects, lines or text in the bottom right corner.`,
      status: 'pending',
      animationStyle: 'zoom-in',
      duration: 6
    });
  }

  // 3. Meat/TRIZ (Whiteboard Visual — triz/meat block)
  if (meatText) {
    const subjectSnippet = meatText.substring(0, 60);
    segments.push({
      id: uuidv4(),
      type: 'animated_still',
      scriptText: meatText,
      prompt: `A charming naive children's book doodle illustration of ${subjectSnippet}, simple expressive black felt-tip marker drawing, whimsical hand-drawn style, minimalist kindergarten sketch aesthetic, funny, cute simplicity, isolated on a solid pure white canvas. Strictly no complex shading, no gradients, vector lines. The bottom-right quadrant of the canvas is completely empty, pure solid white blank space, strictly zero objects, lines or text in the bottom right corner.`,
      status: 'pending',
      animationStyle: 'glitch',
      duration: 8
    });
  }

  // 4. CTA (Outro Avatar)
  segments.push({
    id: uuidv4(),
    type: 'outro_avatar',
    scriptText: ctaText,
    prompt: `Portrait avatar, direct address, CTA: ${ctaText.substring(0, 80)}`,
    status: 'pending',
    animationStyle: 'none',
    duration: 5
  });

  const totalDuration = segments.reduce((acc, s) => acc + (s.duration || 5), 0);

  return {
    version: '1.2',
    projectId,
    versionId,
    segments,
    totalDuration,
    config: {
      resolution: '1080x1920',
      fps: 30,
      musicVolume: 0.15
    }
  };
}
