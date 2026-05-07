import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_URL = 'https://api.heygen.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioUrl, photoUrl, projectId } = body;

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) throw new Error('System HeyGen API Key missing');

    console.log(`[HeyGen V3] Creating one-shot video for project ${projectId}`);
    
    // Official V3 One-Shot API: Directly generate video from photo URL and audio URL
    // This bypasses the need for avatar_id and avoids "avatar look not found" errors.
    const response = await fetch(`${HEYGEN_API_URL}/v3/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        video_setting: {
          type: 'image',
          image: {
            type: 'url',
            url: photoUrl
          },
          dimension: {
            width: 720,
            height: 1280
          }
        },
        script: {
          type: 'audio',
          audio_url: audioUrl
        },
        title: `Project ${projectId} - ViralEngine`
      })
    });

    if (!response.ok) {
       const errorData = await response.json();
       const errMsg = errorData.message || errorData.error?.message || JSON.stringify(errorData);
       console.error('[HeyGen V3] Create failed:', response.status, errMsg);
       throw new Error(`HeyGen V3 API Error: ${response.status}. ${errMsg.substring(0, 250)}`);
    }

    const data = await response.json();
    const taskId = data.data?.video_id;
    
    if (!taskId) {
       throw new Error(`HeyGen V3 missing video_id: ${JSON.stringify(data)}`);
    }

    console.log(`[HeyGen V3] Success. Task ID: ${taskId}`);
    return NextResponse.json({ taskId });

  } catch (e: any) {
    console.error('[HeyGen V3] Route error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    const apiKey = process.env.HEYGEN_API_KEY;

    if (!taskId) return NextResponse.json({ error: 'Task ID missing' }, { status: 400 });

    // V3 status endpoint: GET /v3/videos/{id}
    const statusRes = await fetch(`${HEYGEN_API_URL}/v3/videos/${taskId}`, {
      method: 'GET',
      headers: { 'x-api-key': apiKey || '' }
    });

    const data = await statusRes.json();
    if (!statusRes.ok) {
       return NextResponse.json({ status: 'failed', error: data.message || 'Status check failed' });
    }

    // HeyGen V3 status mapping: pending, processing, completed, failed
    const status = data.data?.status;
    const videoUrl = data.data?.video_url;

    if (status === 'completed') {
      return NextResponse.json({ status: 'completed', videoUrl });
    } else if (status === 'failed') {
      return NextResponse.json({ status: 'failed', error: data.data?.error?.message || 'Generation failed' });
    } else {
      return NextResponse.json({ status: 'processing' });
    }

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
