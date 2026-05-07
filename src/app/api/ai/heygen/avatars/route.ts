import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_URL = 'https://api.heygen.com';

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) throw new Error('HEYGEN_API_KEY missing');

    const res = await fetch(`${HEYGEN_API_URL}/v2/avatars`, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`HeyGen API Error: ${res.status}`);
    }

    const data = await res.json();
    
    // V2 API returns data.data.avatars
    const allAvatars = data.data?.avatars || [];
    
    // Transform to a clean format for the UI, focusing on talking photos
    const avatars = allAvatars
      .map((tp: any) => ({
        id: tp.avatar_id,
        url: tp.preview_image_url,
        label: tp.avatar_name || 'Talking Photo'
      }))
      .slice(0, 50); // Limit to first 50 to prevent UI lag

    console.log(`[HeyGen Avatars] Successfully fetched ${avatars.length} avatars`);
    return NextResponse.json({ avatars });
  } catch (e: any) {
    console.error('[HeyGen Avatars] Failed to fetch:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
