import { model } from '@/lib/ai/gemini';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { text, style, locale } = await req.json();

    if (!text || !style) {
      return NextResponse.json({ error: 'Text and style are required' }, { status: 400 });
    }

    // 1. Authenticate user (optional but recommended)
    try {
      await getAuthenticatedUser();
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Build prompt based on style
    let instruction = "";
    switch (style) {
      case 'shorter':
        instruction = "Make this script shorter and more punchy. Keep the core message but remove fluff. Max 30% reduction.";
        break;
      case 'specific':
        instruction = "Make this script more concrete and specific. Use facts or more vivid imagery if possible. Keep the length similar.";
        break;
      case 'warmer':
        instruction = "Make this script feel warmer, more personal, and friendly. Use a conversational tone as if talking to a friend.";
        break;
      case 'humor':
        instruction = "Add a touch of humor or lightheartedness to this script. Keep it professional but engaging and fun.";
        break;
      default:
        instruction = "Rewrite this script to be more engaging and professional.";
    }

    const systemPrompt = `You are an expert scriptwriter for short-form viral videos (Reels/TikTok). 
Current locale: ${locale || 'ru'}.
Your task: ${instruction}
Return ONLY the rewritten text. No introduction, no quotes, no explanations.`;

    const result = await model.generateContent([
      systemPrompt,
      `ORIGINAL SCRIPT:\n${text}`
    ]);

    const rewrittenText = result.response.text().trim().replace(/^"|"$/g, '');

    return NextResponse.json({ text: rewrittenText });

  } catch (error: any) {
    console.error('Script Editor API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
