import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { scriptText, projectId, locale = 'en' } = await req.json();

    if (!scriptText) {
      return NextResponse.json({ error: 'Script text is required' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are a world-class Social Media Manager and Content Strategist. 
      Based on the provided video script, generate a full "Distribution Package".
      
      Script: "${scriptText}"
      Locale: "${locale}"
      
      Return a JSON object with the following structure:
      {
        "instagram": {
          "caption": "Formatted text with line breaks, tabs (use multiple spaces), emojis, and hashtags",
          "carouselPrompts": ["Image prompt 1 (1:1)", "Image prompt 2 (1:1)", "Image prompt 3 (1:1)", "Image prompt 4 (1:1)", "Image prompt 5 (1:1)"]
        },
        "facebook": {
          "caption": "Formatted text for Facebook with hashtags"
        },
        "youtube": {
          "description": "Long-form description with timestamps (estimate them), links placeholder, and hashtags",
          "thumbnailPrompt": "Cinematic high-impact thumbnail prompt (16:9)"
        }
      }
      
      CRITICAL RULES:
      1. Formatting: Use proper line breaks and spaces to create a clean, readable look.
      2. Emojis: Use them moderately but effectively to highlight key points.
      3. Hashtags: Include 5-10 highly relevant and trending hashtags.
      4. Image Prompts: Make them visually stunning, matching the mood of the script.
      5. Return ONLY the JSON object.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean JSON from markdown if needed
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to generate structured assets');
    
    const assets = JSON.parse(jsonMatch[0]);

    return NextResponse.json(assets);

  } catch (err: any) {
    console.error('[Distribution Assets API Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
