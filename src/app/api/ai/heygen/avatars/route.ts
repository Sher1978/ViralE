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
    
    // Extract talking photos specifically
    const talkingPhotos = data.data?.talking_photos || [];
    
    // Transform to a clean format for the UI
    const avatars = talkingPhotos.map((tp: any) => ({
      id: tp.talking_photo_id,
      url: tp.preview_image_url,
      label: tp.talking_photo_name || 'Talking Photo'
    }));

    return NextResponse.json({ avatars });
  } catch (e: any) {
    console.error('[HeyGen Avatars] Failed to fetch:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
