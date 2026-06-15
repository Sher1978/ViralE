import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { deductCredits, addCredits } from '@/lib/credits';

const HEYGEN_API_URL = 'https://api.heygen.com';

/**
 * POST /api/ai/heygen/video-generate
 * Launches HeyGen video generation using text + voice + avatar selection.
 * Supports: talking_photo (Avatar 4) and instant avatar (video-based).
 */
export async function POST(req: NextRequest) {
  let user = null;
  let estCost = 0;
  let estDuration = 0;
  let chargeDeducted = false;
  let isByok = false;

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
      user = await getAuthenticatedUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('heygen_api_key, credits_balance')
          .eq('id', user.id)
          .single();

        if (profile?.heygen_api_key && profile.heygen_api_key.trim() !== '') {
          apiKey = profile.heygen_api_key.trim();
          isByok = true;
          console.log('[HeyGen Video] Using BYOK key');
        }

        // Calculate and pre-deduct credits if using system key
        if (!isByok) {
          const wordCount = scriptText.trim().split(/\s+/).filter(Boolean).length;
          estDuration = Math.max(5, Math.ceil(wordCount / 2.3)); // Estimate duration: ~138 WPM
          const costRate = avatarType === 'avatar' ? (20 / 60) : (50 / 60); // 20 cred/min or 50 cred/min
          estCost = Math.round(estDuration * costRate);

          const balance = profile?.credits_balance || 0;
          if (balance < estCost) {
            return NextResponse.json(
              { error: 'INSUFFICIENT_CREDITS', requiredCredits: estCost, currentCredits: balance },
              { status: 402 }
            );
          }

          console.log(`[HeyGen Video] Pre-deducting ${estCost} credits for estimated ${estDuration}s video...`);
          await deductCredits(supabase, user.id, estCost, 'HEYGEN_GENERATE', projectId, true, {
            estimatedDuration: estDuration,
            avatarType,
            status: 'pending',
            estimatedCost: estCost
          });
          chargeDeducted = true;
        }
      }
    } catch (e: any) {
      console.warn('[HeyGen Video] Failed to resolve user or deduct credits:', e);
      if (e.message === 'INSUFFICIENT_CREDITS') {
        return NextResponse.json({ error: 'INSUFFICIENT_CREDITS' }, { status: 402 });
      }
    }

    if (!apiKey) {
      // Refund if key is missing but we deducted credits
      if (chargeDeducted && user) {
        await addCredits(supabase, user.id, estCost, 'HEYGEN_REFUND', { reason: 'api_key_missing' });
      }
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

    // Update pending transaction with videoId if we deducted credits
    if (chargeDeducted && user) {
      const { data: latestTx } = await supabase
        .from('credits_transactions')
        .select('id, metadata')
        .eq('user_id', user.id)
        .eq('transaction_type', 'HEYGEN_GENERATE')
        .order('created_at', { ascending: false })
        .limit(1);

      if (latestTx && latestTx.length > 0) {
        await supabase
          .from('credits_transactions')
          .update({
            metadata: {
              ...(latestTx[0].metadata as any),
              videoId,
              status: 'processing'
            }
          })
          .eq('id', latestTx[0].id);
      }
    }

    return NextResponse.json({ videoId, status: 'processing' });
  } catch (e: any) {
    console.error('[HeyGen Video] Error:', e);

    // Refund credits on failure
    if (chargeDeducted && user) {
      try {
        await addCredits(supabase, user.id, estCost, 'HEYGEN_REFUND', { reason: e.message || 'generation_failed' });
        
        const { data: latestTx } = await supabase
          .from('credits_transactions')
          .select('id, metadata')
          .eq('user_id', user.id)
          .eq('transaction_type', 'HEYGEN_GENERATE')
          .order('created_at', { ascending: false })
          .limit(1);

        if (latestTx && latestTx.length > 0) {
          await supabase
            .from('credits_transactions')
            .update({
              metadata: {
                ...(latestTx[0].metadata as any),
                status: 'failed',
                error: e.message
              }
            })
            .eq('id', latestTx[0].id);
        }
      } catch (refundErr) {
        console.error('[HeyGen Video] Critical: Failed to refund credits after failure:', refundErr);
      }
    }

    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
