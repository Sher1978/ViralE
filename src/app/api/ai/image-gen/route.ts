import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const maxDuration = 60;

const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY;

export async function POST(req: Request) {
  try {
    const { prompt, style_prefix = '', aspect_ratio = '9:16' } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!RUNWARE_API_KEY) {
      return NextResponse.json({ error: 'Runware API key not configured' }, { status: 500 });
    }

    const fullPrompt = style_prefix
      ? `${style_prefix}, ${prompt}`
      : prompt;

    console.log('[Runware Image Gen] Generating with prompt:', fullPrompt);

    // Calculate aspect ratio dimensions for 9:16
    // 768 x 1344 is an excellent native portrait resolution for Flux.1 Schnell
    const width = 768;
    const height = 1344;

    const payload = [
      {
        taskType: 'authentication',
        apiKey: RUNWARE_API_KEY
      },
      {
        taskType: 'imageInference',
        taskUUID: uuidv4(),
        positivePrompt: fullPrompt,
        width: width,
        height: height,
        model: 'runware:100@1', // Flux.1 Schnell
        numberResults: 1,
        outputFormat: 'webp'
      }
    ];

    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Runware Image Gen] HTTP Error:', errorText);
      return NextResponse.json({ error: 'Image generation failed', detail: errorText }, { status: 500 });
    }

    const data = await response.json();
    
    if (data.errors) {
      console.error('[Runware Image Gen] API Errors:', data.errors);
      return NextResponse.json({ error: 'Generation failed in API', detail: data.errors }, { status: 500 });
    }

    const inferenceResult = data.data?.find((d: any) => d.taskType === 'imageInference');
    
    if (!inferenceResult || !inferenceResult.imageURL) {
      console.error('[Runware Image Gen] No image URL in result:', data);
      return NextResponse.json({ error: 'No image returned from Runware' }, { status: 500 });
    }

    return NextResponse.json({ 
      url: inferenceResult.imageURL, 
      id: inferenceResult.taskUUID 
    });

  } catch (err: any) {
    console.error('[Runware Image Gen] Catch Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

