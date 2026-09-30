import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAuthContext } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const HEYGEN_API_URL = 'https://api.heygen.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { photoUrl } = body;

    let apiKey = process.env.HEYGEN_API_KEY;

    try {
      const { user, supabase: authSupabase } = await getAuthContext();
      if (user) {
        const { data: profile } = await authSupabase
          .from('profiles')
          .select('heygen_api_key')
          .eq('id', user.id)
          .single();
        if (profile?.heygen_api_key && profile.heygen_api_key.trim() !== '') {
          apiKey = profile.heygen_api_key.trim();
        }
      }
    } catch (e) {
      console.warn('[HeyGen Upload] Failed to resolve user BYOK key, falling back to system key:', e);
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API-ключ HeyGen не найден.' }, { status: 400 });
    }

    if (!photoUrl) {
      return NextResponse.json({ error: 'Missing photoUrl' }, { status: 400 });
    }

    console.log(`[HeyGen Upload] Starting Smart Scanner for photoUrl: ${photoUrl}`);
    
    const tryFetch = async (url: string) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'X-Api-Key': apiKey!,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        body: JSON.stringify({ file_type: 'jpg' })
      });
      const text = await res.text();
      return { res, text };
    };

    const endpoints = [
      `${HEYGEN_API_URL}/v2/talking_photo/upload`,
      `${HEYGEN_API_URL}/v2/upload/photo`,
      `https://api.us.heygen.com/v2/upload/photo`,
      `https://api.us.heygen.com/v2/talking_photo/upload`,
      `${HEYGEN_API_URL}/v2/video/upload/photo`,
      `${HEYGEN_API_URL}/v1/talking_photo/upload_url`
    ];

    let finalRes: Response | null = null;
    let finalText = '';

    for (const url of endpoints) {
      const { res, text } = await tryFetch(url);
      if (res.status === 200 || res.status === 201) {
        finalRes = res;
        finalText = text;
        break;
      }
    }

    if (!finalRes) {
      throw new Error('All endpoints failed. Check if API key has upload permissions.');
    }
    
    const json = JSON.parse(finalText);
    const upload_url = json.data?.upload_url || json.data?.url;
    const talking_photo_id = json.data?.talking_photo_id || json.data?.id;
    
    if (!upload_url || !talking_photo_id) {
       throw new Error(`Invalid response structure: ${finalText.substring(0, 100)}`);
    }
    
    // Step 2: Download from Supabase
    const imageRes = await fetch(photoUrl);
    if (!imageRes.ok) throw new Error(`Failed to download image from ${photoUrl}`);
    const imageBuffer = await imageRes.arrayBuffer();

    // Step 3: Binary PUT to HeyGen S3
    const putRes = await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: imageBuffer
    });

    if (!putRes.ok) {
       throw new Error(`Step 3 (S3 PUT) failed: ${putRes.status}`);
    }

    return NextResponse.json({ talking_photo_id, success: true });

  } catch (e: any) {
    console.error('[HeyGen Upload] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
