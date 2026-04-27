import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const mode = formData.get('mode') as string || 'karaoke'; // 'karaoke' | 'segments' | 'text'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Use Gemini 1.5 Flash (renamed for clarity in my tool, but using the correct version from SDK)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');

    const karaokePrompt = `
      Transcribe this audio/video file. Output ONLY a raw JSON array of word-level timestamps.
      EVERY single word must have its own entry with precise timing.
      Format: [ { "text": "Hello", "start": 0.12, "end": 0.45 } ]
      Rules:
      - Timestamps in seconds
      - No punctuation in word string
      - Output ONLY raw JSON array
    `;

    const segmentsPrompt = `
      Transcribe into a clean JSON array of subtitle segments.
      Each segment: "text", "start", "end".
    `;

    const textPrompt = `Transcribe this audio file into clean, accurate text. Fix any minor stuttering or filler words. Output ONLY the raw transcript text.`;

    let prompt = karaokePrompt;
    if (mode === 'segments') prompt = segmentsPrompt;
    if (mode === 'text') prompt = textPrompt;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type || 'audio/webm'
        }
      },
      prompt
    ]);

    const responseText = result.response.text();

    if (mode === 'text') {
      return NextResponse.json({ text: responseText.trim() });
    }

    // Clean JSON markers for structural modes
    const cleanedJson = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanedJson);

    if (mode === 'karaoke') {
      return NextResponse.json({ wordTimings: parsed, transcript: parsed });
    } else {
      return NextResponse.json({ transcript: parsed });
    }

  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
