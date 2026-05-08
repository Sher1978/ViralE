import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_URL = 'https://api.heygen.com';

let cachedAvatars: any[] | null = null;
let lastFetch = 0;
const CACHE_TTL = 3600000; // 1 hour

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) throw new Error('HEYGEN_API_KEY missing');

    const now = Date.now();
    if (cachedAvatars && (now - lastFetch < CACHE_TTL)) {
      console.log('[HeyGen Avatars] Returning cached list');
      return NextResponse.json({ avatars: cachedAvatars });
    }

    console.log('[HeyGen Avatars] Fetching fresh list from HeyGen...');
    const res = await fetch(`${HEYGEN_API_URL}/v2/avatars`, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) throw new Error(`HeyGen API Error: ${res.status}`);

    const data = await res.json();
    const allAvatars = data.data?.avatars || [];
    
    // Transform to a clean format for the UI, including avatar_type
    const avatars = allAvatars.map((tp: any) => ({
      id: tp.avatar_id,
      url: tp.preview_image_url || tp.preview_video_url,
      label: tp.avatar_name || 'Avatar',
      type: tp.avatar_type // 'talking_photo' or 'avatar' (for instant avatars)
    }));

    cachedAvatars = avatars;
    lastFetch = now;

    return NextResponse.json({ avatars });
  } catch (e: any) {
    console.error('[HeyGen Avatars] Failed to fetch:', e);
    // If we have cached data, return it even if expired rather than 500
    if (cachedAvatars) return NextResponse.json({ avatars: cachedAvatars });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
