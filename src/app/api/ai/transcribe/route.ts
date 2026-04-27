import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const mode = formData.get('mode') as string || 'karaoke'; // 'karaoke' | 'segments'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Use Gemini 2.5 Flash for fast, accurate transcription
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');

    // Karaoke mode: word-level timestamps
    const karaokePrompt = `
      Transcribe this audio/video file. Output ONLY a raw JSON array of word-level timestamps.
      EVERY single word must have its own entry with precise timing.
      
      Format:
      [
        { "text": "Hello", "start": 0.12, "end": 0.45 },
        { "text": "world", "start": 0.51, "end": 0.90 }
      ]
      
      Rules:
      - Include every spoken word, including filler words (um, uh, etc.)
      - Timestamps must be in seconds with 2 decimal places
      - Do NOT include punctuation inside the word string
      - Do NOT add any explanation, markdown, or extra text
      - Output ONLY raw JSON array
    `;

    // Segments mode: phrase-level timestamps (legacy)
    const segmentsPrompt = `
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

    const prompt = mode === 'karaoke' ? karaokePrompt : segmentsPrompt;

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
    // Clean JSON markers
    const cleanedJson = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanedJson);

    if (mode === 'karaoke') {
      // Return as wordTimings
      return NextResponse.json({ wordTimings: parsed, transcript: parsed });
    } else {
      // Legacy: return as transcript segments
      return NextResponse.json({ transcript: parsed });
    }

  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
