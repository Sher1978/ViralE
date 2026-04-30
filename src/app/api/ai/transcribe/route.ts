import { NextRequest, NextResponse } from 'next/server';
import { getModel } from '@/lib/ai/gemini';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const mode = formData.get('mode') as string || 'karaoke';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64Audio = Buffer.from(buffer).toString('base64');
    const mimeType = file.type || 'audio/mp3';

    // ── TRY GEMINI 2.5 FLASH FIRST ──────────────────────────────────────────
    try {
      console.log('[Transcribe] Attempting Gemini 2.5 Flash transcription...');
      const geminiModel = getModel('fast');
      
      const prompt = `
        Transcribe the provided audio precisely. 
        IMPORTANT: Return ONLY a valid JSON object. 
        The output must be a list of words with their exact start and end timestamps in seconds.
        
        Format:
        {
          "words": [
            { "word": "Hello", "start": 0.0, "end": 0.5 },
            ...
          ]
        }
        
        Rules:
        - Include EVERY word spoken.
        - Timestamps must be float numbers (e.g. 1.25).
        - Do not add any markdown formatting or extra text.
      `;

      const result = await geminiModel.generateContent([
        {
          inlineData: {
            data: base64Audio,
            mimeType: mimeType
          }
        },
        prompt
      ]);

      const response = await result.response;
      let text = response.text().trim();
      
      // Clean JSON if needed
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        text = text.substring(jsonStart, jsonEnd + 1);
      }

      const data = JSON.parse(text);

      if (data.words && data.words.length > 0) {
        console.log('[Transcribe] Gemini success. Words count:', data.words.length);
        const transcript = data.words.map((w: any) => ({
          text: w.word,
          start: w.start,
          end: w.end
        }));

        if (mode === 'karaoke') {
          return NextResponse.json({ wordTimings: transcript, transcript: transcript });
        } else {
          return NextResponse.json({ transcript });
        }
      }
      
      throw new Error('Gemini returned empty or invalid words list');

    } catch (geminiError: any) {
      console.warn('[Transcribe] Gemini failed, falling back to Whisper:', geminiError.message);
      
      // ── FALLBACK TO WHISPER ────────────────────────────────────────────────
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('Transcription failed and OpenAI API key not configured');
      }

      const whisperFormData = new FormData();
      whisperFormData.append('file', file, file.name || 'audio.mp3');
      whisperFormData.append('model', 'whisper-1');
      whisperFormData.append('response_format', 'verbose_json');
      whisperFormData.append('timestamp_granularities[]', 'word');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: whisperFormData
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Whisper fallback failed: ${response.status} ${errText}`);
      }

      const data = await response.json();
      const mappedWords = (data.words || []).map((w: any) => ({
        text: w.word.trim(),
        start: w.start,
        end: w.end
      }));

      if (mode === 'karaoke') {
        return NextResponse.json({ wordTimings: mappedWords, transcript: mappedWords });
      } else {
        return NextResponse.json({ transcript: mappedWords });
      }
    }

  } catch (error: any) {
    console.error('Transcription ultimate error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error during transcription' }, { status: 500 });
  }
}
