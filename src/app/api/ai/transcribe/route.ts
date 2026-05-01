import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60; 

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('[Transcribe] Gemini API key is missing');
      return NextResponse.json({ error: 'Gemini API key is missing on server' }, { status: 500 });
    }

    const formData = await req.formData();
    const fileUrl = formData.get('fileUrl') as string;
    let file = formData.get('file') as Blob;

    // ── FALLBACK: Download from URL if provided ──
    if (fileUrl && !file) {
      console.log('[Transcribe] Downloading file from URL:', fileUrl);
      const downloadRes = await fetch(fileUrl);
      if (!downloadRes.ok) throw new Error('Failed to download file from cloud storage');
      file = await downloadRes.blob();
    }

    if (!file) {
      return NextResponse.json({ error: 'No file or URL provided' }, { status: 400 });
    }

    console.log('[Transcribe] Starting... File size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Audio = buffer.toString('base64');

    // ── ATTEMPT 1: GEMINI 2.0 FLASH ──────────────────────────────────────────
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp',
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `
        Transcribe the following audio precisely. 
        Return a JSON object with a "transcript" array.
        Each element in the array must be an object with:
        "text": string (the word or short phrase),
        "start": number (start time in seconds),
        "end": number (end time in seconds)
        Format: {"transcript": [{"text": "Hello", "start": 0.5, "end": 0.8}]}
      `;

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: file.type.startsWith('audio') ? 'audio/wav' : (file.type || 'video/mp4'),
            data: base64Audio,
          },
        },
      ]);

      const responseText = result.response.text();
      console.log('[Transcribe] Gemini 2.0 response:', responseText.slice(0, 500));

      const data = JSON.parse(responseText);
      if (data.transcript && Array.isArray(data.transcript)) {
        return NextResponse.json(data);
      }
      
      throw new Error('Gemini 2.0 returned invalid structure');
    } catch (gemini2Error: any) {
      console.error('[Transcribe] Gemini 2.0 failed:', gemini2Error.message);

      // ── ATTEMPT 2: GEMINI 1.5 FLASH (Stable Fallback) ──────────────────────
      try {
        console.log('[Transcribe] Falling back to Gemini 1.5 Flash...');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `Transcribe this audio. Return ONLY JSON: {"transcript": [{"text": "word", "start": 0.0, "end": 0.5}]}`;
        
        const result = await model.generateContent([
          prompt,
          { inlineData: { mimeType: file.type.startsWith('audio') ? 'audio/wav' : (file.type || 'video/mp4'), data: base64Audio } }
        ]);

        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          if (data.transcript) return NextResponse.json(data);
        }
        throw new Error('Gemini 1.5 failed');
      } catch (gemini1Error: any) {
        console.error('[Transcribe] Gemini 1.5 failed:', gemini1Error.message);

        // ── ATTEMPT 3: OPENAI WHISPER (Final Fallback) ───────────────────────
        if (!openaiKey) {
          throw new Error('All Gemini attempts failed and Whisper not configured');
        }

        console.log('[Transcribe] Falling back to OpenAI Whisper...');
        const whisperFormData = new FormData();
        whisperFormData.append('file', file, file.type.startsWith('audio') ? 'audio.wav' : 'video.mp4');
        whisperFormData.append('model', 'whisper-1');
        whisperFormData.append('response_format', 'verbose_json');

        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiKey}` },
          body: whisperFormData,
        });

        if (!whisperRes.ok) throw new Error(`Whisper failed: ${whisperRes.statusText}`);

        const whisperData = await whisperRes.json();
        const transcript = (whisperData.segments || []).map((s: any) => ({
          text: s.text.trim(),
          start: s.start,
          end: s.end,
        }));

        return NextResponse.json({ transcript });
      }
    }
  } catch (error: any) {
    console.error('[Transcribe] Global failure:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
