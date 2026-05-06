import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_URL = 'https://api.heygen.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioUrl, photoUrl, projectId } = body;

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) throw new Error('System HeyGen API Key missing');

    console.log(`[HeyGen TP] Starting generation for project ${projectId} with audio ${audioUrl}`);

    // 1. Fetch audio from Supabase and upload to HeyGen (Proxy method)
    const audioDownloadRes = await fetch(audioUrl);
    if (!audioDownloadRes.ok) throw new Error(`Failed to download audio from storage: ${audioDownloadRes.status}`);
    const audioBlob = await audioDownloadRes.blob();

    const audioFormData = new FormData();
    audioFormData.append('file', audioBlob, 'recording.webm');
    
    console.log('[HeyGen TP] Uploading audio to HeyGen...');
    const audioUploadRes = await fetch(`${HEYGEN_API_URL}/v1/talking_photo.upload_audio`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: audioFormData
    });

    if (!audioUploadRes.ok) {
      const errText = await audioUploadRes.text();
      throw new Error(`HeyGen Audio Upload Error: ${audioUploadRes.status}. ${errText.substring(0, 100)}`);
    }

    const audioData = await audioUploadRes.json();
    if (!audioData.data?.audio_url) {
      console.error('[HeyGen TP] Audio proxy upload failed:', audioData);
      throw new Error(`HeyGen audio upload failed: ${JSON.stringify(audioData)}`);
    }
    const internalAudioUrl = audioData.data.audio_url;

    // 2. Start Talking Photo Task
    console.log('[HeyGen TP] Starting task with internal audio URL:', internalAudioUrl);
    const generateRes = await fetch(`${HEYGEN_API_URL}/v2/talking_photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        talking_photo_url: photoUrl,
        audio_url: internalAudioUrl,
        video_settings: {
          ratio: '9:16'
        }
      })
    });

    if (!generateRes.ok) {
       const errorText = await generateRes.text();
       console.error('[HeyGen TP] Generation failed with status:', generateRes.status, errorText);
       throw new Error(`HeyGen API Task Error: ${generateRes.status}. ${errorText.substring(0, 100)}`);
    }

    const generateData = await generateRes.json();
    if (!generateData.data?.video_id) {
       console.error('[HeyGen TP] video_id missing in response:', generateData);
       throw new Error('HeyGen response missing video_id');
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
