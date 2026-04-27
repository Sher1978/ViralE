import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { context } = await req.json();

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      You are a professional video producer and prompt engineer.
      Given the following scene context from a short-form video (TikTok/Reels), 
      create a highly effective visual prompt for searching stock footage (Pexels) or generating AI video.
      
      Scene Context: "${context}"
      
      Requirements:
      - Descriptive and visual
      - Focus on lighting, mood, and movement
      - Max 15 words
      - Return ONLY the prompt text, no explanations.
      - Use English for the prompt even if the context is in another language.
    `;

    const result = await model.generateContent(prompt);
    const optimized = result.response.text().trim().replace(/^"|"$/g, '');

    return NextResponse.json({ optimized });
  } catch (error: any) {
    console.error('Prompt optimization failed:', error);
    return NextResponse.json({ error: 'Optimization failed' }, { status: 500 });
  }
}
