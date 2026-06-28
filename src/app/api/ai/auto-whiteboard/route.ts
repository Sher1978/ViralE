import { NextRequest, NextResponse } from 'next/server';
import { getModel } from '@/lib/ai/gemini';
import { getAuthenticatedUser } from '@/lib/auth';

export const runtime = 'nodejs';

// Normalize text helper: strip punctuation and lowercase
function cleanText(text: string): string {
  if (!text) return '';
  return text.replace(/[^\w\sа-яА-ЯёЁ]/g, '').toLowerCase().trim();
}

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

interface SceneConcept {
  scene_id: number;
  spoken_trigger: string;
  metaphor_prompt: string;
}

export async function POST(req: NextRequest) {
  try {
    const { subtitles } = await req.json();
    if (!subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json({ error: 'Subtitles array is required' }, { status: 400 });
    }

    const totalDuration = subtitles.reduce((max: number, s: any) => {
      const end = s.endTime ?? s.end ?? 0;
      return Math.max(max, end);
    }, 0);

    const fullScriptText = subtitles.map((s: any) => s.text).join(' ');

    // Max whiteboard clips: about one scene per 7-9 seconds, capped between 2 and 5
    const maxClips = Math.max(2, Math.min(5, Math.floor(totalDuration / 8)));

    const systemPrompt = `
You are an expert Storyboard Director for whiteboard explainer animations.
Analyze the provided subtitles script and output a visual storyboard JSON mapping out up to ${maxClips} scenes.

For each scene, output:
1. scene_id: A sequential integer starting from 1.
2. spoken_trigger: A exact quote of 3-5 consecutive words from the subtitles where this scene's visual MUST appear.
3. metaphor_prompt: A highly detailed Flux prompt describing a conceptual illustration of this moment.

STRICT VISUAL STYLE FORMULA:
"A professional whiteboard doodle illustration of [SUBJECT]. Clean bold black outlines, modern explainer video style, expressive character and objects. Include helpful whiteboard elements around the subject like conceptual arrows, swirls, abstract thinking icons, lightbulbs or exclamation marks. Completely flat solid white background. Strictly NO shading, NO gradients, NO watercolor, NO photographic elements, NO text, NO words, NO letters. Clean sharp vector-like line art, portrait orientation 9:16."

Rules for metaphor_prompt:
- Translate any visual concepts to English.
- Strictly keep the background pure white.
- Strictly forbid any text, letters, words or writing inside the image.
- Suggest a creative visual metaphor (e.g., rocket for growth, scale for balance, key for solution, magnifying glass for research).

Output strictly valid JSON conforming to this schema:
{
  "scenes": [
    {
      "scene_id": 1,
      "spoken_trigger": "exact trigger phrase here",
      "metaphor_prompt": "Flux prompt following the formula"
    }
  ]
}
`;

    const userPrompt = `SUBTITLES SCRIPT:\n${subtitles.map((s: any) => s.text).join(' ')}`;

    const model = getModel('fast', 'en', 'json');
    const result = await model.generateContent([systemPrompt, userPrompt]);
    let text = result.response.text().trim();

    // Parse JSON safely
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      text = text.substring(jsonStart, jsonEnd + 1);
    }

    let scenesData: { scenes: SceneConcept[] };
    try {
      scenesData = JSON.parse(text);
      if (!scenesData || !Array.isArray(scenesData.scenes)) {
        throw new Error('Invalid JSON structure');
      }
    } catch (parseErr) {
      console.error('[Auto-Whiteboard] JSON parse failed:', text);
      return NextResponse.json({ error: 'AI returned invalid JSON structure' }, { status: 500 });
    }

    // =========================================================================
    // SMART TIMELINE BUILDER (Whisper Timestamp Aligner)
    // =========================================================================

    // 1. Build word-level timing database from phrase subtitles
    const wordTimeline: WordTimestamp[] = [];
    subtitles.forEach((s: any) => {
      const phraseText = s.text || '';
      const start = s.startTime ?? s.start ?? 0;
      const end = s.endTime ?? s.end ?? 0;
      const duration = end - start;

      const words = phraseText.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) return;

      const totalChars = words.join('').length;
      let currentStart = start;

      words.forEach((word: string) => {
        const wordLen = word.length;
        const wordDur = totalChars > 0 ? (wordLen / totalChars) * duration : duration / words.length;
        wordTimeline.push({
          word,
          start: currentStart,
          end: currentStart + wordDur
        });
        currentStart += wordDur;
      });
    });

    const normWords = wordTimeline.map(w => cleanText(w.word));
    const cleanFullText = cleanText(fullScriptText);

    // 2. Timeline matching algorithm
    const rawTimeline = [];
    const scenes = scenesData.scenes.slice(0, 5); // strict cap of 5 scenes

    for (let idx = 0; idx < scenes.length; idx++) {
      const scene = scenes[idx];
      let startTime = 0.0;

      if (idx > 0) {
        // Find exact trigger location using sliding window
        const triggerTokens = cleanText(scene.spoken_trigger).split(/\s+/).filter(Boolean);
        let foundIdx = -1;

        if (triggerTokens.length > 0) {
          const wLen = triggerTokens.length;
          for (let i = 0; i <= normWords.length - wLen; i++) {
            let match = true;
            for (let j = 0; j < wLen; j++) {
              if (normWords[i + j] !== triggerTokens[j]) {
                match = false;
                break;
              }
            }
            if (match) {
              foundIdx = i;
              break;
            }
          }
        }

        if (foundIdx !== -1) {
          startTime = wordTimeline[foundIdx].start;
          console.log(`[Smart Align] Matched scene ${scene.scene_id} trigger "${scene.spoken_trigger}" exactly at ${startTime.toFixed(2)}s`);
        } else {
          // Fallback: Proportional character position lookup
          console.warn(`[Smart Align] Trigger phrase "${scene.spoken_trigger}" not found. Running fallback.`);
          const triggerClean = cleanText(scene.spoken_trigger);
          const charPos = cleanFullText.indexOf(triggerClean);
          if (charPos !== -1 && cleanFullText.length > 0) {
            startTime = (charPos / cleanFullText.length) * totalDuration;
            console.log(`[Smart Align] Fallback matched trigger at proportional time: ${startTime.toFixed(2)}s`);
          } else {
            // Fallback 2: Equidistant distribution
            startTime = (idx / scenes.length) * totalDuration;
            console.log(`[Smart Align] Fallback 2 matched trigger at equidistant time: ${startTime.toFixed(2)}s`);
          }
        }
      }

      rawTimeline.push({
        id: `wb_${idx}_${Date.now()}`,
        type: 'whiteboard',
        prompt: scene.metaphor_prompt,
        startTime: Math.round(startTime * 100) / 100,
        endTime: Math.round(totalDuration * 100) / 100, // Temporarily end at total length
        status: 'pending',
        userPromptAddition: '',
        speed: 1.0
      });
    }

    // 3. Interval Stitching (N.end = N+1.start)
    for (let i = 0; i < rawTimeline.length - 1; i++) {
      rawTimeline[i].endTime = rawTimeline[i + 1].startTime;
    }

    // Return in the exact timeline manifest format required by useStudioState
    return NextResponse.json({ clips: rawTimeline });

  } catch (error: any) {
    console.error('[Auto-Whiteboard] API failure:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
