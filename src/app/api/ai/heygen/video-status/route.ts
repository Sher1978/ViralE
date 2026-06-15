import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { deductCredits, addCredits } from '@/lib/credits';

const HEYGEN_API_URL = 'https://api.heygen.com';

/**
 * GET /api/ai/heygen/video-status?videoId=...
 * Polls HeyGen video generation status.
 * Returns: { status: 'processing' | 'completed' | 'failed', videoUrl?, error? }
 */
export async function GET(req: NextRequest) {
  let user = null;
  let isByok = false;

  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    let apiKey = process.env.HEYGEN_API_KEY;

    try {
      user = await getAuthenticatedUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('heygen_api_key')
          .eq('id', user.id)
          .single();
        if (profile?.heygen_api_key && profile.heygen_api_key.trim() !== '') {
          apiKey = profile.heygen_api_key.trim();
          isByok = true;
        }
      }
    } catch (e) {
      // Silently fallback
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'HeyGen API key missing' }, { status: 400 });
    }

    const res = await fetch(`${HEYGEN_API_URL}/v1/video_status.get?video_id=${videoId}`, {
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json',
      },
    });

    const data = await res.json();

    // HeyGen returns code=100 for success
    if (data.code !== 100 && data.code !== undefined) {
      // Refund credits on failure if not BYOK
      if (!isByok && user) {
        try {
          const { data: txs } = await supabase
            .from('credits_transactions')
            .select('id, metadata, amount')
            .eq('user_id', user.id)
            .eq('transaction_type', 'HEYGEN_GENERATE')
            .order('created_at', { ascending: false });

          const targetTx = txs?.find((t: any) => {
            const meta = t.metadata as any;
            return meta?.videoId === videoId && meta?.status === 'processing';
          });

          if (targetTx) {
            const meta = targetTx.metadata as any;
            const estCost = meta.estimatedCost || Math.abs(targetTx.amount);
            console.log(`[HeyGen Status] Video ${videoId} failed with API error. Refunding ${estCost} credits...`);

            await addCredits(supabase, user.id, estCost, 'HEYGEN_REFUND', {
              videoId,
              reason: data.message || `API error code ${data.code}`
            });

            await supabase
              .from('credits_transactions')
              .update({
                metadata: {
                  ...meta,
                  status: 'failed',
                  error: data.message || `API error code ${data.code}`
                }
              })
              .eq('id', targetTx.id);
          }
        } catch (refundErr) {
          console.error('[HeyGen Status] Failed to process failure refund:', refundErr);
        }
      }

      return NextResponse.json({
        status: 'failed',
        error: data.message || `API error code ${data.code}`,
      });
    }

    const videoStatus: string = data.data?.status || 'processing';
    const videoUrl: string | null = data.data?.video_url || null;
    const thumbnailUrl: string | null = data.data?.thumbnail_url || null;
    const errorMsg: string | null = data.data?.error?.message || null;

    if (videoStatus === 'completed' && videoUrl) {
      // Handle adjustment on completion if not BYOK
      if (!isByok && user) {
        try {
          const { data: txs } = await supabase
            .from('credits_transactions')
            .select('id, metadata, amount')
            .eq('user_id', user.id)
            .eq('transaction_type', 'HEYGEN_GENERATE')
            .order('created_at', { ascending: false });

          const targetTx = txs?.find((t: any) => {
            const meta = t.metadata as any;
            return meta?.videoId === videoId && meta?.status === 'processing';
          });

          if (targetTx) {
            const meta = targetTx.metadata as any;
            const estCost = meta.estimatedCost || Math.abs(targetTx.amount);
            const avatarType = meta.avatarType || 'talking_photo';
            const actualDuration = data.data?.duration || 0;

            const costRate = avatarType === 'avatar' ? (20 / 60) : (50 / 60);
            const actualCost = Math.round(actualDuration * costRate);
            const diff = actualCost - estCost;

            console.log(`[HeyGen Status] Video ${videoId} completed. Duration: ${actualDuration}s. Est: ${estCost}, Actual: ${actualCost}. Diff: ${diff}`);

            if (diff < 0) {
              await addCredits(supabase, user.id, Math.abs(diff), 'HEYGEN_ADJUSTMENT', {
                videoId,
                type: 'refund',
                diff: Math.abs(diff)
              });
            } else if (diff > 0) {
              await deductCredits(supabase, user.id, diff, 'HEYGEN_ADJUSTMENT', undefined, true, {
                videoId,
                type: 'charge',
                diff
              });
            }

            await supabase
              .from('credits_transactions')
              .update({
                metadata: {
                  ...meta,
                  status: 'completed',
                  actualDuration,
                  actualCost
                }
              })
              .eq('id', targetTx.id);
          }
        } catch (adjErr) {
          console.error('[HeyGen Status] Failed to process completion adjustment:', adjErr);
        }
      }

      return NextResponse.json({ status: 'completed', videoUrl, thumbnailUrl, duration: data.data?.duration });
    } else if (videoStatus === 'failed') {
      // Handle refund on completion failure if not BYOK
      if (!isByok && user) {
        try {
          const { data: txs } = await supabase
            .from('credits_transactions')
            .select('id, metadata, amount')
            .eq('user_id', user.id)
            .eq('transaction_type', 'HEYGEN_GENERATE')
            .order('created_at', { ascending: false });

          const targetTx = txs?.find((t: any) => {
            const meta = t.metadata as any;
            return meta?.videoId === videoId && meta?.status === 'processing';
          });

          if (targetTx) {
            const meta = targetTx.metadata as any;
            const estCost = meta.estimatedCost || Math.abs(targetTx.amount);
            console.log(`[HeyGen Status] Video ${videoId} failed. Refunding ${estCost} credits...`);

            await addCredits(supabase, user.id, estCost, 'HEYGEN_REFUND', {
              videoId,
              reason: errorMsg || 'generation_failed'
            });

            await supabase
              .from('credits_transactions')
              .update({
                metadata: {
                  ...meta,
                  status: 'failed',
                  error: errorMsg || 'generation_failed'
                }
              })
              .eq('id', targetTx.id);
          }
        } catch (refundErr) {
          console.error('[HeyGen Status] Failed to process failure refund:', refundErr);
        }
      }

      return NextResponse.json({ status: 'failed', error: errorMsg || 'Generation failed' });
    } else {
      // pending, processing, waiting
      return NextResponse.json({ status: 'processing', progress: data.data?.progress || null });
    }
  } catch (e: any) {
    console.error('[HeyGen Status] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
