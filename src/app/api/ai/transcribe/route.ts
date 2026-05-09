import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 120; // Large iOS videos need more time

const TRANSCRIPTION_PROMPT = `Transcribe the spoken audio in this video precisely.
Return ONLY a raw JSON object in this exact format:
{"transcript": [{"text": "WORD", "start": 0.5, "end": 0.8, "accent": true}]}
CRITICAL: 
1. Every single word MUST be its own separate entry.
2. Set "accent": true for words that carry semantic weight, emphasis, or emotional impact.
Return nothing but the JSON object.`;

// Detect the correct MIME type for Gemini
function detectGeminiMime(fileType: string): string {
  const t = fileType || '';
  if (t === 'audio/mpeg' || t === 'audio/mp3') return 'audio/mp3';
  if (t === 'audio/webm') return 'audio/webm';
  if (t === 'audio/mp4' || t === 'audio/aac') return 'audio/mp4';
  if (t.startsWith('audio/')) return t;
  if (t.includes('quicktime') || t.includes('mov')) return 'video/quicktime';
  if (t.includes('mp4')) return 'video/mp4';
  if (t.includes('webm')) return 'video/webm';
  return 'video/mp4';
}

// Parse transcript from Gemini response text
function parseTranscript(text: string): { text: string; start: number; end: number; accent?: boolean }[] | null {
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const data = JSON.parse(jsonMatch[0]);
    if (data.transcript && Array.isArray(data.transcript) && data.transcript.length > 0) {
      return data.transcript;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is missing on server' }, { status: 500 });
    }

    const formData = await req.formData();
    const fileUrl = formData.get('fileUrl') as string;
    let file = formData.get('file') as Blob;

    if (fileUrl && !file) {
      const res = await fetch(fileUrl);
      if (res.ok) file = await res.blob();
    }

    if (!file) {
      return NextResponse.json({ error: 'No file or URL provided' }, { status: 400 });
    }

    const fileSizeMB = file.size / 1024 / 1024;
    const geminiMime = detectGeminiMime(file.type);
    console.log(`[Transcribe] Processing ${fileSizeMB.toFixed(1)}MB, type: ${file.type}`);

    // ── PRIMARY PATH: OpenAI Whisper (Fast & Stable, 5-10s) ─────────────────
    if (openaiKey && fileSizeMB <= 25) {
      console.log('[Transcribe] Using Whisper as primary path...');
      try {
        const whisperForm = new FormData();
        const whisperMime = file.type || geminiMime;
        const fileName = whisperMime.includes('quicktime') ? 'audio.mov' : 
                         whisperMime.includes('webm') ? 'audio.webm' : 'audio.mp4';
        
        whisperForm.append('file', new File([file], fileName, { type: whisperMime }));
        whisperForm.append('model', 'whisper-1');
        whisperForm.append('response_format', 'verbose_json');

        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openaiKey}` },
          body: whisperForm,
        });

        if (whisperRes.ok) {
          const whisperData = await whisperRes.json();
          const transcript = (whisperData.segments || []).map((s: any) => ({
            text: s.text.trim(), start: s.start, end: s.end, accent: true
          }));
          if (transcript.length > 0) {
            console.log(`[Transcribe] Whisper success, words: ${transcript.length}`);
            return NextResponse.json({ transcript });
          }
        } else {
          const errText = await whisperRes.text();
          console.warn('[Transcribe] Whisper failed, falling back to Gemini:', errText);
        }
      } catch (e: any) {
        console.warn('[Transcribe] Whisper exception:', e.message);
      }
    }

    // ── FALLBACK PATH: Gemini (For large files or if Whisper fails) ─────────
    console.log('[Transcribe] Falling back to Gemini...');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Inline path for small-ish files
    if (fileSizeMB <= 15) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString('base64');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent([
          { text: TRANSCRIPTION_PROMPT },
          { inlineData: { mimeType: geminiMime, data: base64 } },
        ]);
        const transcript = parseTranscript(result.response.text());
        if (transcript) return NextResponse.json({ transcript });
      } catch (e: any) {
        console.warn('[Transcribe] Gemini Inline exception:', e.message);
      }
    }

    // File API path for large files
    let fileUri: string | null = null;
    try {
      const boundary = `----FormBoundary${Date.now()}`;
      const metaPart = JSON.stringify({ file: { mimeType: geminiMime, displayName: 'video_upload' } });
      const nodeBuffer = Buffer.from(await file.arrayBuffer());
      const metaBytes = Buffer.from(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${metaPart}\r\n--${boundary}\r\nContent-Type: ${geminiMime}\r\n\r\n`);
      const endBytes = Buffer.from(`\r\n--${boundary}--`);
      const body = Buffer.concat([metaBytes, nodeBuffer, endBytes]);

      const uploadRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'X-Goog-Upload-Protocol': 'multipart',
        },
        body,
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        fileUri = uploadData.file?.uri;
        if (fileUri) {
          const fileName = fileUri.split('/files/')[1];
          let attempts = 0;
          while (attempts < 10) {
            await new Promise(r => setTimeout(r, 2000));
            const stateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${apiKey}`);
            const stateData = await stateRes.json();
            if (stateData.state === 'ACTIVE') break;
            attempts++;
          }
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const result = await model.generateContent([{ text: TRANSCRIPTION_PROMPT }, { fileData: { mimeType: geminiMime, fileUri } }]);
          const transcript = parseTranscript(result.response.text());
          if (transcript) return NextResponse.json({ transcript });
        }
      }
    } catch (e: any) {
      console.error('[Transcribe] Gemini File API exception:', e.message);
    }

    return NextResponse.json({
      error: 'Не удалось расшифровать аудио. OpenAI и Google вернули ошибку. Попробуйте записать более короткое видео или проверьте лимиты API.'
    }, { status: 500 });

  } catch (error: any) {
    console.error('[Transcribe] Global failure:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
