import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { sceneText, currentPrompt, targetType } = await req.json();

    if (!sceneText) {
      return NextResponse.json({ error: 'Missing sceneText' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = `You are an expert AI Video Director. 
    Your task is to take a scene description and current prompt, and refine it into a highly detailed, cinematic visual prompt for image/video generation (like Midjourney or Stable Diffusion).
    Focus on: lighting, camera angle, textures, artistic style, and specific objects.
    Keep the output concise (max 75 words).
    Target: ${targetType || 'cinematic visualization'}`;

    const prompt = `Refine this scene description into a visual prompt:
    Description: "${sceneText}"
    Current Prompt: "${currentPrompt || ''}"
    
    Output ONLY the refined visual prompt text.`;

    const result = await model.generateContent([systemPrompt, prompt]);
    const response = await result.response;
    const refinedText = response.text().trim();

    return NextResponse.json({
      success: true,
      refinedPrompt: refinedText
    });

  } catch (error: any) {
    console.error('Prompt refinement failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
