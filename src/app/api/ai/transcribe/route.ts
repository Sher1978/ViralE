import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');

    const prompt = `
      Transcribe the following video/audio into a clean JSON array of subtitle segments.
      Each segment must have "text", "start" (seconds), and "end" (seconds).
      Group words into natural phrases (3-7 words per segment).
      Output ONLY raw JSON.

      Example format:
      [
        {"text": "Hello world", "start": 0.5, "end": 2.1},
        {"text": "Welcome to the show", "start": 2.2, "end": 4.5}
      ]
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type || 'video/mp4'
        }
      },
      prompt
    ]);

    const responseText = result.response.text();
    // Clean JSON if it contains markdown markers
    const cleanedJson = responseText.replace(/```json|```/g, '').trim();
    const transcript = JSON.parse(cleanedJson);

    return NextResponse.json({ transcript });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
