import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const HEYGEN_API_URL = 'https://api.heygen.com';

/**
 * GET /api/ai/heygen/video-status?videoId=...
 * Polls HeyGen video generation status.
 * Returns: { status: 'processing' | 'completed' | 'failed', videoUrl?, error? }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
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
      return NextResponse.json({ status: 'completed', videoUrl, thumbnailUrl });
    } else if (videoStatus === 'failed') {
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
