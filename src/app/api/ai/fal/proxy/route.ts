import { NextRequest, NextResponse } from 'next/server';
import { fal } from "@fal-ai/client";

export const maxDuration = 300; 

export async function POST(req: NextRequest) {
  try {
    if (!process.env.FAL_KEY) {
      console.error('[FalProxy] Missing FAL_KEY environment variable');
      return NextResponse.json({ error: 'Server configuration error (Missing API Key)' }, { status: 500 });
    }

    const { model, input } = await req.json();
    
    if (!model || !input) {
      return NextResponse.json({ error: 'Missing model or input' }, { status: 400 });
    }

    console.log(`[FalProxy] Processing ${model}...`);
    
    // We call Fal using the server-side key
    const result = await fal.subscribe(model, {
      input,
      logs: true,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[FalProxy] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
