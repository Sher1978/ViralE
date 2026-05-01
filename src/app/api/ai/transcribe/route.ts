import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

export const maxDuration = 120; // Large iOS videos need more time

const TRANSCRIPTION_PROMPT = `Transcribe the spoken audio in this video/audio file precisely.
Return ONLY a raw JSON object (no markdown, no code block) in this exact format:
{"transcript": [{"text": "word or phrase", "start": 0.5, "end": 1.2}]}
Include ALL spoken words with accurate timestamps in seconds.`;

// Detect the correct MIME type for Gemini
function detectGeminiMime(fileType: string): string {
  const t = fileType || '';
  if (t === 'audio/mpeg' || t === 'audio/mp3') return 'audio/mp3';
  if (t.startsWith('audio/')) return t;
  if (t.includes('quicktime') || t.includes('mov')) return 'video/quicktime';
  if (t.includes('mp4')) return 'video/mp4';
  if (t.includes('webm')) return 'video/webm';
  return 'video/mp4';
}

// Parse transcript from Gemini response text
function parseTranscript(text: string): { text: string; start: number; end: number }[] | null {
  try {
    // Strip markdown code blocks if present
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

    // Download from URL if no direct file
    if (fileUrl && !file) {
      console.log('[Transcribe] Downloading from URL:', fileUrl);
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error('Failed to download file from URL');
      file = await res.blob();
    }

    if (!file) {
      return NextResponse.json({ error: 'No file or URL provided' }, { status: 400 });
    }

    const fileSizeMB = file.size / 1024 / 1024;
    const geminiMime = detectGeminiMime(file.type);
    console.log(`[Transcribe] File: ${fileSizeMB.toFixed(1)}MB, type: ${file.type} → mime: ${geminiMime}`);

    const genAI = new GoogleGenerativeAI(apiKey);

    // ── PATH A: Small files (<8MB) → inline base64 (fast, no upload needed) ──
    const INLINE_LIMIT_MB = 8;
    if (fileSizeMB <= INLINE_LIMIT_MB) {
      console.log('[Transcribe] Using inline path (small file)');
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');

      for (const modelName of ['gemini-2.0-flash-exp', 'gemini-1.5-flash']) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent([
            { text: TRANSCRIPTION_PROMPT },
            { inlineData: { mimeType: geminiMime, data: base64 } },
          ]);
          const transcript = parseTranscript(result.response.text());
          if (transcript) {
            console.log(`[Transcribe] Inline success via ${modelName}, words: ${transcript.length}`);
            return NextResponse.json({ transcript });
          }
        } catch (e: any) {
          console.warn(`[Transcribe] Inline ${modelName} failed:`, e.message);
        }
      }
    }

    // ── PATH B: Large files (iOS HEVC, >8MB) → Gemini File API ──────────────
    console.log('[Transcribe] Using File API path (large file or inline failed)');
    let fileUri: string | null = null;

    try {
      const fileManager = new GoogleAIFileManager(apiKey);

      // Convert Blob to Buffer for upload
      const arrayBuffer = await file.arrayBuffer();
      const nodeBuffer = Buffer.from(arrayBuffer);

      // GoogleAIFileManager.uploadFile expects a path — use uploadBytes workaround via temp stream
      // We use the REST API directly since SDK requires a file path on disk
      const boundary = `----FormBoundary${Date.now()}`;
      const metaPart = JSON.stringify({ file: { mimeType: geminiMime, displayName: 'video_upload' } });
      
      const metaBytes = Buffer.from(
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metaPart}\r\n--${boundary}\r\nContent-Type: ${geminiMime}\r\n\r\n`
      );
      const endBytes = Buffer.from(`\r\n--${boundary}--`);
      const body = Buffer.concat([metaBytes, nodeBuffer, endBytes]);

      const uploadRes = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/related; boundary=${boundary}`,
            'Content-Length': body.length.toString(),
            'X-Goog-Upload-Protocol': 'multipart',
          },
          body,
        }
      );

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`File API upload failed: ${uploadRes.status} ${errText.slice(0, 200)}`);
      }

      const uploadData = await uploadRes.json();
      fileUri = uploadData.file?.uri;
      console.log('[Transcribe] File API upload success, URI:', fileUri);

      // Wait for file to be ACTIVE (processing)
      if (fileUri) {
        const fileName = fileUri.split('/files/')[1];
        let attempts = 0;
        while (attempts < 12) {
          await new Promise(r => setTimeout(r, 3000));
          const stateRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${apiKey}`
          );
          const stateData = await stateRes.json();
          console.log(`[Transcribe] File state: ${stateData.state}`);
          if (stateData.state === 'ACTIVE') break;
          if (stateData.state === 'FAILED') throw new Error('File API processing failed');
          attempts++;
        }
      }

    } catch (uploadErr: any) {
      console.error('[Transcribe] File API upload failed:', uploadErr.message);
      // Fall through to Whisper if available
    }

    // Use File API URI with Gemini
    if (fileUri) {
      for (const modelName of ['gemini-2.0-flash-exp', 'gemini-1.5-flash']) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent([
            { text: TRANSCRIPTION_PROMPT },
            { fileData: { mimeType: geminiMime, fileUri } },
          ]);
          const transcript = parseTranscript(result.response.text());
          if (transcript) {
            console.log(`[Transcribe] File API success via ${modelName}, words: ${transcript.length}`);
            // Clean up uploaded file (fire & forget)
            const fileName = fileUri.split('/files/')[1];
            fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${apiKey}`, {
              method: 'DELETE'
            }).catch(() => {});
            return NextResponse.json({ transcript });
          }
        } catch (e: any) {
          console.warn(`[Transcribe] File API ${modelName} failed:`, e.message);
        }
      }
    }

    // ── PATH C: OpenAI Whisper (Final fallback) ───────────────────────────────
    if (openaiKey) {
      console.log('[Transcribe] Falling back to Whisper...');
      // Whisper limit is 25MB — if file is larger, we can't use it
      if (fileSizeMB > 25) {
        return NextResponse.json({
          error: `Файл ${fileSizeMB.toFixed(0)}MB слишком большой. Пожалуйста, обрежьте видео до 1 минуты или используйте "Наиболее совместимый" формат в настройках камеры iPhone.`
        }, { status: 413 });
      }

      const whisperForm = new FormData();
      const fileName = geminiMime.includes('quicktime') ? 'audio.mov' : 'audio.mp4';
      whisperForm.append('file', new File([file], fileName, { type: geminiMime }));
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
          text: s.text.trim(), start: s.start, end: s.end,
        }));
        if (transcript.length > 0) return NextResponse.json({ transcript });
      }
    }

    return NextResponse.json({
      error: 'Не удалось расшифровать аудио. Попробуйте снять видео в настройках "Наиболее совместимый" (Settings → Camera → Formats).'
    }, { status: 500 });

  } catch (error: any) {
    console.error('[Transcribe] Global failure:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
