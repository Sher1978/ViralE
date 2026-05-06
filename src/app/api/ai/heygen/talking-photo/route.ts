import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_URL = 'https://api.heygen.com';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as Blob;
    const photoUrl = formData.get('photoUrl') as string;
    const projectId = formData.get('projectId') as string;

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) throw new Error('System HeyGen API Key missing');

    console.log(`[HeyGen TP] Starting generation for project ${projectId}`);

    // 1. Upload audio to HeyGen
    const audioFormData = new FormData();
    audioFormData.append('file', audio, 'recording.webm');
    
    const audioRes = await fetch(`${HEYGEN_API_URL}/v1/talking_photo.upload_audio`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: audioFormData
    });

    const audioData = await audioRes.json();
    if (!audioData.data?.audio_url) {
      console.error('[HeyGen TP] Audio upload failed:', audioData);
      throw new Error('Audio upload to HeyGen failed');
    }
    const audioUrl = audioData.data.audio_url;

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
