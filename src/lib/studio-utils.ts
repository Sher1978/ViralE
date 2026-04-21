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

  // 1. Intro Avatar (Hook beginning)
  segments.push({
    id: uuidv4(),
    type: 'intro_avatar',
    scriptText: scriptData.hook || '',
    prompt: `Professional high-quality portrait of a talking avatar, cinematic lighting, studio background, expressing: ${scriptData.hook?.substring(0, 60)}`,
    status: 'pending',
    animationStyle: 'none',
    duration: 5
  });

  // 2. Split Story into multiple visual scenes
  const storyChunks = splitStoryIntoSegments(scriptData.story || '');
  
  storyChunks.forEach((chunk, index) => {
    segments.push({
      id: uuidv4(),
      type: index % 2 === 0 ? 'animated_still' : 'broll', // Alternating or logic
      scriptText: chunk,
      prompt: `Cinematic visualization, hyper-realistic, 8k: ${chunk.substring(0, 100)}`,
      status: 'pending',
      animationStyle: index % 2 === 0 ? 'zoom-in' : 'glitch',
      duration: 6
    });
  });

  // 3. Outro Avatar (CTA)
  segments.push({
    id: uuidv4(),
    type: 'outro_avatar',
    scriptText: scriptData.cta || '',
    prompt: `Talking avatar, friendly gesture, call to action: ${scriptData.cta?.substring(0, 60)}`,
    status: 'pending',
    animationStyle: 'none',
    duration: 5
  });

  const totalDuration = segments.reduce((acc, s) => acc + (s.duration || 5), 0);

  return {
    version: '1.1',
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
