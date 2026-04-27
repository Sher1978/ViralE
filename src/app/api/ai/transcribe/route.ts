import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const mode = formData.get('mode') as string || 'karaoke'; // 'karaoke' | 'segments' | 'text'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Prepare Whisper formData
    const whisperFormData = new FormData();
    whisperFormData.append('file', file, 'audio.wav');
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
      console.error('Whisper error:', errText);
      try {
        const errJson = JSON.parse(errText);
        return NextResponse.json({ error: errJson.error?.message || 'Whisper API failed' }, { status: response.status });
      } catch {
        return NextResponse.json({ error: 'Whisper API failed' }, { status: response.status });
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

    if (mode === 'karaoke') {
      // Prioritize words for karaoke
      const transcript = mappedWords.length > 0 ? mappedWords : mappedSegments;
      return NextResponse.json({ wordTimings: transcript, transcript: transcript });
    } else {
      // Prioritize segments natively
      const transcript = mappedSegments.length > 0 ? mappedSegments : mappedWords;
      return NextResponse.json({ transcript });
    }

  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
