import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const FALLBACK_VOICES = [
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', labels: { accent: 'American', gender: 'Female' } },
  { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', labels: { accent: 'American', gender: 'Male' } },
  { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', labels: { accent: 'English', gender: 'Female' } },
  { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', labels: { accent: 'British', gender: 'Male' } },
  { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', labels: { accent: 'American', gender: 'Female' } },
];

async function getElevenLabsKey(authHeader: string | null): Promise<string | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (key) return key;
  // Try to get from user profile
  if (authHeader) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('elevenlabs_api_key').eq('id', user.id).single();
        return profile?.elevenlabs_api_key || null;
      }
    } catch { /* ignore */ }
  }
  return null;
}

// GET — list available voices
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const apiKey = await getElevenLabsKey(authHeader);
  if (!apiKey) return NextResponse.json({ voices: FALLBACK_VOICES });

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });
    if (!res.ok) return NextResponse.json({ voices: FALLBACK_VOICES });
    const data = await res.json();
    return NextResponse.json({ voices: data.voices?.slice(0, 20) || FALLBACK_VOICES });
  } catch {
    return NextResponse.json({ voices: FALLBACK_VOICES });
  }
}

// POST — generate TTS audio
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const apiKey = await getElevenLabsKey(authHeader);

  try {
    const { text, voice_id = 'EXAVITQu4vr4xnSDxMaL', model_id = 'eleven_multilingual_v2' } = await req.json();
    if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 });

    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 400 });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs TTS error:', err);
      let errorMessage = 'TTS generation failed';
      try {
          const errData = JSON.parse(err);
          if (errData.detail?.status === 'quota_exceeded') errorMessage = 'ElevenLabs quota exceeded: На счету недостаточно минут.';
          else if (errData.detail?.message) errorMessage = errData.detail.message;
      } catch { }
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(audioBuffer.byteLength) },
    });
  } catch (error: any) {
    console.error('[TTS API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

