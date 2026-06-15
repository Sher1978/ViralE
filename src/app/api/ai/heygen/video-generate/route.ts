import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const HEYGEN_API_URL = 'https://api.heygen.com';

/**
 * POST /api/ai/heygen/video-generate
 * Launches HeyGen video generation using text + voice + avatar selection.
 * Supports: talking_photo (Avatar 4) and instant avatar (video-based).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { avatarId, avatarType, scriptText, voiceId, language, projectId } = body;

    if (!avatarId || !scriptText || !voiceId) {
      return NextResponse.json(
        { error: 'Missing required fields: avatarId, scriptText, voiceId' },
        { status: 400 }
      );
    }

    let apiKey = process.env.HEYGEN_API_KEY;

    try {
      const user = await getAuthenticatedUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('heygen_api_key')
          .eq('id', user.id)
          .single();
        if (profile?.heygen_api_key && profile.heygen_api_key.trim() !== '') {
          apiKey = profile.heygen_api_key.trim();
          console.log('[HeyGen Video] Using BYOK key');
        }
      }
    } catch (e) {
      console.warn('[HeyGen Video] Failed to resolve BYOK key:', e);
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API-ключ HeyGen не найден. Перейдите в Профиль → BYOK и добавьте ваш ключ HeyGen.' },
        { status: 400 }
      );
    }

    // Build character object based on avatar type
    const isInstantAvatar = avatarType === 'avatar'; // video-based instant avatar
    const character = isInstantAvatar
      ? { type: 'avatar', avatar_id: avatarId }
      : { type: 'talking_photo', talking_photo_id: avatarId };

    // Build voice object
    const voice = {
      type: 'text',
      input_text: scriptText.trim(),
      voice_id: voiceId,
      speed: 1.0,
      ...(language && language !== 'en' ? { language } : {}),
    };

    const payload = {
      video_inputs: [
        {
          character,
          voice,
          background: {
            type: 'color',
            value: '#FAFAFA',
          },
        },
      ],
      dimension: { width: 720, height: 1280 },
      aspect_ratio: '9:16',
      test: false,
    };

    console.log(`[HeyGen Video] Launching generation: avatarType=${avatarType}, voiceId=${voiceId}, lang=${language}`);
    console.log('[HeyGen Video] Payload:', JSON.stringify(payload).substring(0, 300));

    const response = await fetch(`${HEYGEN_API_URL}/v2/video/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log(`[HeyGen Video] Response (${response.status}): ${responseText.substring(0, 200)}`);

    if (!response.ok) {
      throw new Error(`HeyGen Error ${response.status}: ${responseText.substring(0, 300)}`);
    }

    const data = JSON.parse(responseText);
    const videoId = data.data?.video_id;

    if (!videoId) {
      throw new Error(`No video_id in response: ${responseText.substring(0, 200)}`);
    }

    console.log(`[HeyGen Video] Success. video_id=${videoId}`);
    return NextResponse.json({ videoId, status: 'processing' });
  } catch (e: any) {
    console.error('[HeyGen Video] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
