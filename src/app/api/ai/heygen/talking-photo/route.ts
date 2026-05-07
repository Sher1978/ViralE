import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_URL = 'https://api.heygen.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioUrl, photoUrl, projectId } = body;

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) throw new Error('System HeyGen API Key missing');

    console.log(`[HeyGen TP] Starting generation for project ${projectId} with audio ${audioUrl}`);

    // 1. Start Talking Photo Task via v2 API (Modern standard)
    console.log('[HeyGen TP] Creating task v2 with photo:', photoUrl.substring(0, 50), 'and audio:', audioUrl.substring(0, 50));
    
    const generateRes = await fetch(`${HEYGEN_API_URL}/v2/talking_photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        talking_photo_url: photoUrl,
        audio_url: audioUrl,
        video_settings: {
          ratio: '9:16'
        }
      })
    });

    if (!generateRes.ok) {
       const errorText = await generateRes.text();
       console.error('[HeyGen TP] v2 Generation failed status:', generateRes.status, errorText);
       // Handle common errors gracefully
       if (generateRes.status === 401) throw new Error('HeyGen API Key is invalid or expired');
       if (generateRes.status === 404) throw new Error('HeyGen v2 endpoint not found. Check API version.');
       throw new Error(`HeyGen v2 API Error: ${generateRes.status}. ${errorText.substring(0, 150)}`);
    }

    const generateData = await generateRes.json();
    console.log('[HeyGen TP] v2 Response data:', JSON.stringify(generateData));

    // v2 returns video_id
    const taskId = generateData.data?.video_id || generateData.data?.task_id;
    
    if (!taskId) {
       console.error('[HeyGen TP] taskId/video_id missing in v2 response:', generateData);
       throw new Error(`HeyGen v2 response missing ID: ${JSON.stringify(generateData)}`);
    }

    return NextResponse.json({ taskId });

  } catch (e: any) {
    console.error('[HeyGen TP] Route error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    const apiKey = process.env.HEYGEN_API_KEY;

    if (!taskId) return NextResponse.json({ error: 'Task ID missing' }, { status: 400 });

    const statusRes = await fetch(`${HEYGEN_API_URL}/v1/talking_photo.get_video_status?task_id=${taskId}`, {
      method: 'GET',
      headers: { 'X-Api-Key': apiKey || '' }
    });

    const data = await statusRes.json();
    
    // HeyGen status mapping
    const status = data.data?.status;
    const videoUrl = data.data?.video_url;

    if (status === 'completed') {
      return NextResponse.json({ status: 'completed', videoUrl });
    } else if (status === 'failed') {
      return NextResponse.json({ status: 'failed', error: data.data?.error?.message });
    } else {
      return NextResponse.json({ status: 'processing' });
    }

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
