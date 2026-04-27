import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// FLUX 1.1 Pro — best quality/speed balance for portrait (9:16) images
const FLUX_MODEL = 'black-forest-labs/flux-1.1-pro';

export async function POST(req: Request) {
  try {
    const { prompt, style_prefix = '', aspect_ratio = '9:16', seed } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: 'Replicate API token not configured' }, { status: 500 });
    }

    const fullPrompt = style_prefix
      ? `${style_prefix}, ${prompt}`
      : prompt;

    // Create prediction
    const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait', // Wait for result synchronously (up to 60s)
      },
      body: JSON.stringify({
        input: {
          prompt: fullPrompt,
          aspect_ratio,
          output_format: 'webp',
          output_quality: 85,
          safety_tolerance: 2,
          prompt_upsampling: false,
          ...(seed ? { seed } : {}),
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error('[image-gen] Replicate error:', err);
      return NextResponse.json({ error: 'Image generation failed', detail: err }, { status: 500 });
    }

    const prediction = await createRes.json();

    // If not done yet, poll
    let result = prediction;
    let attempts = 0;
    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 30) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
      });
      result = await pollRes.json();
      attempts++;
    }

    if (result.status === 'failed' || !result.output) {
      return NextResponse.json({ error: 'Generation failed', detail: result.error }, { status: 500 });
    }

    const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    return NextResponse.json({ url: imageUrl, id: result.id });

  } catch (err: any) {
    console.error('[image-gen] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
