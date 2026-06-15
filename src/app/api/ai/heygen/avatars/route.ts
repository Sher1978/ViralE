import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const HEYGEN_API_URL = 'https://api.heygen.com';

let cachedAvatars: any[] | null = null;
let lastFetch = 0;
const CACHE_TTL = 3600000; // 1 hour

export async function GET(req: NextRequest) {
  try {
    let apiKey = process.env.HEYGEN_API_KEY;
    let isByok = false;

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
          isByok = true;
        }
      }
    } catch (e) {
      console.warn('[HeyGen Avatars] Failed to fetch user BYOK key, falling back to system key:', e);
    }

    if (!apiKey) throw new Error('HEYGEN_API_KEY missing');

    const now = Date.now();
    if (!isByok && cachedAvatars && (now - lastFetch < CACHE_TTL)) {
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
    
    // Deduplicate by avatar_id and transform to a clean format for the UI
    const seenIds = new Set<string>();
    const avatars: any[] = [];
    
    for (const tp of allAvatars) {
      const id = tp.avatar_id || tp.talking_photo_id || tp.id;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        avatars.push({
          id,
          url: tp.preview_image_url || tp.preview_video_url,
          label: tp.avatar_name || 'Avatar',
          type: tp.avatar_type // 'talking_photo' or 'avatar' (for instant avatars)
        });
      }
    }

    if (!isByok) {
      cachedAvatars = avatars;
      lastFetch = now;
    }

    return NextResponse.json({ avatars });
  } catch (e: any) {
    console.error('[HeyGen Avatars] Failed to fetch:', e);
    // If we have cached data, return it even if expired rather than 500
    if (cachedAvatars) return NextResponse.json({ avatars: cachedAvatars });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

