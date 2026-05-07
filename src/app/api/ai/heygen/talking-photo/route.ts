import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_URL = 'https://api.heygen.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioUrl, photoUrl, projectId } = body;

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) throw new Error('System HeyGen API Key missing');

    console.log(`[HeyGen TP] Starting generation for project ${projectId} with audio ${audioUrl}`);

    // 1. Start Video Generation via universal v2 API
    // Specialized talking_photo endpoints (v1/v2) are returning 404, 
    // so we use the robust video/generate pipeline.
    console.log('[HeyGen TP] Creating video via v2/video/generate');
    
    const generateRes = await fetch(`${HEYGEN_API_URL}/v2/video/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: 'talking_photo',
              talking_photo_url: photoUrl
            },
            voice: {
              type: 'audio',
              audio_url: audioUrl
            }
          }
        ],
        test: false
      })
    });

    if (!generateRes.ok) {
       const errorText = await generateRes.text();
       console.error('[HeyGen TP] v2/video/generate failed status:', generateRes.status, errorText);
       
       let detailedError = errorText;
       try {
         const parsed = JSON.parse(errorText);
         detailedError = parsed.message || parsed.error?.message || JSON.stringify(parsed);
       } catch (e) {}

       throw new Error(`HeyGen API Error: ${generateRes.status}. ${detailedError.substring(0, 200)}`);
    }

    const generateData = await generateRes.json();
    console.log('[HeyGen TP] v2/video/generate response:', JSON.stringify(generateData));

    // v2 returns video_id
    const taskId = generateData.data?.video_id;
    
    if (!taskId) {
       console.error('[HeyGen TP] video_id missing in v2 response:', generateData);
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
