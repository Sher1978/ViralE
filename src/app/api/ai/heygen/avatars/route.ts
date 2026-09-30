import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAuthContext } from '@/lib/auth';

const HEYGEN_API_URL = 'https://api.heygen.com';
const SYSTEM_FALLBACK_KEY = process.env.HEYGEN_API_KEY || 'sk_V2_hgu_kkrSAMu1z7l_NrLNtautKaPtuhcH4ABbn6TZnNbmN8FJ';

let cachedAvatars: any[] | null = null;
let lastFetch = 0;
const CACHE_TTL = 3600000; // 1 hour

const FALLBACK_PUBLIC_AVATARS = [
  {
    id: 'Abigail_expressive_2024112501',
    url: 'https://files2.heygen.ai/avatar/v3/1ad51ab9fee24ae88af067206e14a1d8_44250/preview_target.webp',
    label: 'Abigail (Upper Body)',
    type: 'avatar',
    gender: 'female'
  },
  {
    id: 'Abigail_standing_office_front',
    url: 'https://files2.heygen.ai/avatar/v3/463208b6cad140d2b263535826838e3a_39240/preview_target.webp',
    label: 'Abigail (Office)',
    type: 'avatar',
    gender: 'female'
  },
  {
    id: 'Monica_expressive_2024112501',
    url: 'https://files2.heygen.ai/avatar/v3/2b0ffaa2a59e4b78807d4b4a6ca72aef_44260/preview_target.webp',
    label: 'Monica (Upper Body)',
    type: 'avatar',
    gender: 'female'
  },
  {
    id: 'Tyler_expressive_2024112501',
    url: 'https://files2.heygen.ai/avatar/v3/9fbf79a957bd474088a8f15ee9d8e7e1_44270/preview_target.webp',
    label: 'Tyler (Upper Body)',
    type: 'avatar',
    gender: 'male'
  },
  {
    id: 'Ethan_expressive_2024112501',
    url: 'https://files2.heygen.ai/avatar/v3/931c81ee08dd44439c25091c78e99990_44280/preview_target.webp',
    label: 'Ethan (Upper Body)',
    type: 'avatar',
    gender: 'male'
  },
  {
    id: '6013fc758b5446a2ba17d8c459538bb4',
    url: 'https://files2.heygen.ai/talking_photo/6013fc758b5446a2ba17d8c459538bb4/c53b0cfe0d134f99a83f79917ccfbb1c.WEBP',
    label: 'Veronica',
    type: 'talking_photo',
    gender: 'female'
  }
];

async function fetchFromHeyGenKey(apiKey: string) {
  try {
    const res = await fetch(`${HEYGEN_API_URL}/v2/avatars`, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) return [];

    const data = await res.json();
    const avatarsList = (data.data?.avatars || []).slice(0, 500);
    const talkingPhotosList = (data.data?.talking_photos || []).slice(0, 500);
    const all = [...avatarsList, ...talkingPhotosList];

    const result: any[] = [];
    const seen = new Set<string>();

    for (const item of all) {
      const id = item.avatar_id || item.talking_photo_id || item.id;
      if (id && !seen.has(id)) {
        seen.add(id);
        result.push({
          id,
          url: item.preview_image_url || item.preview_video_url,
          label: item.avatar_name || item.talking_photo_name || 'Avatar',
          type: item.talking_photo_id ? 'talking_photo' : 'avatar',
          gender: item.gender
        });
      }
    }
    return result;
  } catch (e) {
    console.warn('[HeyGen Avatars] Fetch error for key:', e);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    let userKey: string | null = null;

    try {
      const { user, supabase: authSupabase } = await getAuthContext();
      if (user) {
        const { data: profile } = await authSupabase
          .from('profiles')
          .select('heygen_api_key')
          .eq('id', user.id)
          .single();
        if (profile?.heygen_api_key && profile.heygen_api_key.trim() !== '') {
          userKey = profile.heygen_api_key.trim();
        }
      }
    } catch (e) {
      console.warn('[HeyGen Avatars] Failed to resolve auth context:', e);
    }

    const now = Date.now();

    // 1. Fetch user's custom BYOK avatars if available
    let customAvatars: any[] = [];
    if (userKey) {
      customAvatars = await fetchFromHeyGenKey(userKey);
    }

    // 2. Fetch system public avatars if custom avatars list is short, or if cached system list is stale
    let systemAvatars: any[] = [];
    if (!cachedAvatars || now - lastFetch > CACHE_TTL) {
      systemAvatars = await fetchFromHeyGenKey(SYSTEM_FALLBACK_KEY);
      if (systemAvatars.length > 0) {
        cachedAvatars = systemAvatars;
        lastFetch = now;
      }
    } else {
      systemAvatars = cachedAvatars;
    }

    // 3. Merge custom BYOK avatars first, then system public avatars
    const seen = new Set<string>();
    const finalAvatars: any[] = [];

    for (const a of customAvatars) {
      if (a.id && !seen.has(a.id)) {
        seen.add(a.id);
        finalAvatars.push({ ...a, isCustom: true });
      }
    }

    for (const a of systemAvatars) {
      if (a.id && !seen.has(a.id)) {
        seen.add(a.id);
        finalAvatars.push(a);
      }
    }

    // 4. Ultimate fallback if empty
    const resultAvatars = finalAvatars.length > 0 ? finalAvatars : FALLBACK_PUBLIC_AVATARS;

    return NextResponse.json({ avatars: resultAvatars });
  } catch (e: any) {
    console.error('[HeyGen Avatars] Unhandled error:', e);
    return NextResponse.json({ avatars: cachedAvatars || FALLBACK_PUBLIC_AVATARS });
  }
}
