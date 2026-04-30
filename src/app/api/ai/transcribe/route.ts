import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60; // Max allowed for Vercel Hobby

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('[Transcribe] GEMINI_API_KEY is missing');
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing on server' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log('[Transcribe] Starting... File size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

    // ── ATTEMPT 1: GEMINI 2.5 FLASH ──────────────────────────────────────────
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' }); // Using current stable version string

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64Audio = buffer.toString('base64');

      const prompt = `
        Transcribe the following audio precisely. 
        Return a JSON object with a "transcript" array.
        Each element in the array must be an object with:
        "text": string (the word or short phrase),
        "start": number (start time in seconds),
        "end": number (end time in seconds)
        Format example: {"transcript": [{"text": "Hello", "start": 0.5, "end": 0.8}]}
      `;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: file.type || 'audio/wav',
            data: base64Audio,
          },
        },
      ]);

      const responseText = result.response.text();
      console.log('[Transcribe] Gemini response preview:', responseText.slice(0, 100));

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.transcript && Array.isArray(data.transcript)) {
          return NextResponse.json(data);
        }
      }
      
      throw new Error('Gemini failed to return valid JSON transcript');
    } catch (geminiError: any) {
      console.error('[Transcribe] Gemini failed, falling back to Whisper:', geminiError.message);
      
      // ── FALLBACK TO WHISPER ────────────────────────────────────────────────
      if (!openaiKey) {
        return NextResponse.json({ error: 'Gemini failed and OPENAI_API_KEY is missing' }, { status: 500 });
      }

      const whisperFormData = new FormData();
      whisperFormData.append('file', file, 'audio.wav');
      whisperFormData.append('model', 'whisper-1');
      whisperFormData.append('response_format', 'verbose_json');

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: whisperFormData,
      });

      if (!whisperRes.ok) {
        const errText = await whisperRes.text();
        console.error('[Transcribe] Whisper API Error:', errText);
        throw new Error(`Whisper failed: ${whisperRes.statusText}`);
      }

      const whisperData = await whisperRes.json();
      
      // Convert Whisper segments to our format
      const transcript = (whisperData.segments || []).map((s: any) => ({
        text: s.text.trim(),
        start: s.start,
        end: s.end,
      }));

      return NextResponse.json({ transcript });
    }
  } catch (error: any) {
    console.error('[Transcribe] Global Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
