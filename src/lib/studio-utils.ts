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

export function createInitialManifest(projectId: string, versionId: string, scriptData: any): ProductionManifest {
  const segments: SceneSegment[] = [];

  const extractText = (block: any) => {
    if (!block) return '';
    return typeof block === 'string' ? block : block.words || '';
  };

  const hookText = extractText(scriptData.hook);
  const contextText = extractText(scriptData.context);
  const meatText = extractText(scriptData.meat);
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

  // 2. Context (Visual Scene)
  if (contextText) {
    segments.push({
      id: uuidv4(),
      type: 'animated_still',
      scriptText: contextText,
      prompt: `Cinematic visualization of the context: ${contextText.substring(0, 80)}`,
      status: 'pending',
      animationStyle: 'zoom-in',
      duration: 6
    });
  }

  // 3. Meat (Value Scene)
  if (meatText) {
    segments.push({
      id: uuidv4(),
      type: 'broll',
      scriptText: meatText,
      prompt: `High-value cinematic B-Roll: ${meatText.substring(0, 80)}`,
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
