import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const mode = formData.get('mode') as string || 'karaoke';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Vercel/Next.js body limit is usually 4.5MB. 
    // We check here even though the proxy might have already rejected it.
    if (file.size > 10 * 1024 * 1024) { // 10MB limit (internal check)
      return NextResponse.json({ error: 'File too large for analysis. Please upload a smaller clip or just audio.' }, { status: 413 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Prepare Whisper formData
    const whisperFormData = new FormData();
    // Use a generic name if the original one is missing or too long
    const fileName = file.name || 'audio.wav';
    whisperFormData.append('file', file, fileName);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('response_format', 'verbose_json');
    whisperFormData.append('timestamp_granularities[]', 'word');
    whisperFormData.append('timestamp_granularities[]', 'segment');

    // Send to OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: whisperFormData
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Whisper API Error Status:', response.status);
      console.error('Whisper API Error Body:', errText);
      
      try {
        const errJson = JSON.parse(errText);
        return NextResponse.json(
          { error: errJson.error?.message || `Whisper API failed with status ${response.status}` }, 
          { status: response.status }
        );
      } catch {
        return NextResponse.json(
          { error: `OpenAI returned an error (${response.status}) and it could not be parsed.` }, 
          { status: response.status }
        );
      }
    }

    // Process verbose_json response
    const data = await response.json();

    if (mode === 'text') {
      return NextResponse.json({ text: data.text });
    }

    // Map OpenAI words to our internal format: [{text, start, end}]
    const mappedWords = (data.words || []).map((w: any) => ({
      text: w.word.trim(),
      start: w.start,
      end: w.end
    }));

    // Map OpenAI segments to our internal format: [{text, start, end}]
    const mappedSegments = (data.segments || []).map((s: any) => ({
      text: s.text.trim(),
      start: s.start,
      end: s.end
    }));

    let transcript = [];
    if (mode === 'karaoke') {
      transcript = mappedWords.length > 0 ? mappedWords : mappedSegments;
      return NextResponse.json({ wordTimings: transcript, transcript: transcript });
    } else {
      transcript = mappedSegments.length > 0 ? mappedSegments : mappedWords;
      return NextResponse.json({ transcript });
    }

  } catch (error: any) {
    console.error('Transcription route error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error during transcription' }, { status: 500 });
  }
}
