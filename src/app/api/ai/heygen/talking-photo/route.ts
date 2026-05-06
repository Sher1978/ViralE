import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_URL = 'https://api.heygen.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioUrl, photoUrl, projectId } = body;

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) throw new Error('System HeyGen API Key missing');

    console.log(`[HeyGen TP] Starting generation for project ${projectId} with audio ${audioUrl}`);

    // Skip internal upload if we already have a public URL (HeyGen v2 supports external URLs)
    // However, some versions of HeyGen TP prefer their own hosted URLs. 
    // We'll try passing the external URL directly.

    // 2. Start Talking Photo Task
    const generateRes = await fetch(`${HEYGEN_API_URL}/v2/talking_photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

    const generateData = await generateRes.json();
    if (!generateData.data?.video_id) {
       console.error('[HeyGen TP] Generation start failed:', generateData);
       throw new Error('HeyGen generation failed to start');
    }

    return NextResponse.json({ taskId: generateData.data.video_id });

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
