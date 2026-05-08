import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_URL = 'https://api.heygen.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioUrl, photoUrl, avatarId, avatarType, projectId } = body;

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) throw new Error('System HeyGen API Key missing');

    console.log(`[HeyGen V2] Generating studio video. Type: ${avatarType || 'talking_photo'}`);
    console.log(`[HeyGen V2] Input - ID: ${avatarId}, URL: ${photoUrl?.substring(0, 50)}...`);

    // Add a small delay to prevent race conditions (404 avatar look not found)
    console.log('[HeyGen V2] Waiting 2s for resource sync...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Construct the payload strictly according to Talking Photo vs Instant Avatar
    const payload = {
      video_inputs: [
        {
          character: {
            type: avatarType === 'avatar' ? 'avatar' : 'talking_photo',
            ...(avatarType === 'avatar' 
               ? { avatar_id: avatarId || photoUrl } 
               : { talking_photo_id: avatarId || photoUrl }
            )
          },
          voice: {
            type: 'audio',
            audio_url: audioUrl
          }
        }
      ],
      dimension: {
        width: 720,
        height: 1280
      },
      aspect_ratio: '9:16',
      test: false
    };

    const response = await fetch(`${HEYGEN_API_URL}/v2/video/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
       const errorData = await response.json();
       const errMsg = errorData.message || errorData.error?.message || JSON.stringify(errorData);
       console.error('[HeyGen V2] Create failed:', response.status, errMsg);
       throw new Error(`HeyGen V2 API Error: ${response.status}. ${errMsg.substring(0, 250)}`);
    }

    const data = await response.json();
    // V2 return data.video_id
    const taskId = data.data?.video_id;
    
    if (!taskId) {
       throw new Error(`HeyGen V2 missing video_id: ${JSON.stringify(data)}`);
    }

    console.log(`[HeyGen V2] Success. Task ID: ${taskId}`);
    return NextResponse.json({ taskId });

  } catch (e: any) {
    console.error('[HeyGen V2] Route error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    const apiKey = process.env.HEYGEN_API_KEY;

    if (!taskId) return NextResponse.json({ error: 'Task ID missing' }, { status: 400 });

    // V1 status endpoint for V2 generation requests
    const statusRes = await fetch(`${HEYGEN_API_URL}/v1/video_status.get?video_id=${taskId}`, {
      method: 'GET',
      headers: { 'x-api-key': apiKey || '' }
    });

    const data = await statusRes.json();
    
    // V1 status check uses "code" (100 = success)
    if (data.code !== 100) {
       return NextResponse.json({ status: 'failed', error: data.message || 'Status check failed' });
    }

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
