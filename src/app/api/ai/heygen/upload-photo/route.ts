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

    // Step 1: Download from Supabase
    console.log(`[HeyGen Upload] Downloading image from ${photoUrl}`);
    const imageRes = await fetch(photoUrl);
    if (!imageRes.ok) throw new Error(`Failed to download image from ${photoUrl}`);
    const imageBuffer = await imageRes.arrayBuffer();

    // Step 2: Upload to HeyGen Assets API
    console.log(`[HeyGen Upload] Uploading to HeyGen Assets API`);
    const uploadRes = await fetch('https://upload.heygen.com/v1/asset', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'image/jpeg'
      },
      body: imageBuffer
    });
    
    const uploadText = await uploadRes.text();
    if (!uploadRes.ok) {
       throw new Error(`HeyGen Upload Failed (${uploadRes.status}): ${uploadText}`);
    }
    
    const json = JSON.parse(uploadText);
    const talking_photo_id = json.data?.id;
    
    if (!talking_photo_id) {
       throw new Error(`Invalid response from HeyGen Assets API: ${uploadText.substring(0, 100)}`);
    }
    
    console.log(`[HeyGen Upload] Success! Asset ID / Talking Photo ID: ${talking_photo_id}`);
    return NextResponse.json({ talking_photo_id, success: true });

  } catch (e: any) {
    console.error('[HeyGen Upload] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
