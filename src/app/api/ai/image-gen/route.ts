import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const maxDuration = 60;

const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: Request) {
  try {
    const { prompt, style_prefix = '', aspect_ratio = '9:16' } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const fullPrompt = style_prefix ? `${style_prefix}, ${prompt}` : prompt;

    // --- OPTION 1: RUNWARE (if key exists) ---
    if (RUNWARE_API_KEY) {
      try {
        console.log('[Image Gen] Trying Runware...');
        const payload = [
          { taskType: 'authentication', apiKey: RUNWARE_API_KEY },
          {
            taskType: 'imageInference',
            taskUUID: uuidv4(),
            positivePrompt: fullPrompt,
            width: 768,
            height: 1344,
            model: 'runware:100@1', 
            numberResults: 1,
            outputFormat: 'webp'
          }
        ];

        const response = await fetch('https://api.runware.ai/v1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          const inferenceResult = data.data?.find((d: any) => d.taskType === 'imageInference');
          if (inferenceResult && inferenceResult.imageURL) {
            return NextResponse.json({ url: inferenceResult.imageURL, id: inferenceResult.taskUUID });
          }
        }
      } catch (e) {
        console.warn('[Image Gen] Runware failed:', e);
      }
    }

    // --- OPTION 2: OPENAI DALL-E 3 (Fallback) ---
    if (OPENAI_API_KEY) {
      try {
        console.log('[Image Gen] Falling back to DALL-E 3...');
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: `Cinematic 9:16 portrait: ${fullPrompt}`,
            n: 1,
            size: "1024x1792",
            quality: "hd"
          })
        });

        const data = await response.json();
        if (response.ok && data.data?.[0]?.url) {
          return NextResponse.json({ url: data.data[0].url });
        }
      } catch (e) {
        console.error('[Image Gen] OpenAI failed:', e);
      }
    }

    return NextResponse.json({ error: 'No providers available' }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

