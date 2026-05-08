import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_URL = 'https://api.heygen.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioUrl, photoUrl, avatarId, avatarType, projectId } = body;

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) throw new Error('System HeyGen API Key missing');

    console.log(`[HeyGen V3] Creating video. Type: ${avatarType || 'custom_image'}`);
    
    // Construct V3 payload based on input type
    let video_setting: any = {
      aspect_ratio: '9:16',
      resolution: '1080p'
    };

    if (avatarId) {
      video_setting.type = 'avatar';
      if (avatarType === 'avatar') {
        // Instant Avatar (Video-based)
        video_setting.avatar = {
          type: 'instant_avatar',
          avatar_id: avatarId,
          avatar_style: 'normal'
        };
      } else {
        // Talking Photo (Image-based ID)
        video_setting.avatar = {
          type: 'talking_photo',
          talking_photo_id: avatarId
        };
      }
    } else {
      // Use external image URL
      video_setting.type = 'image';
      video_setting.image = {
        type: 'url',
        url: photoUrl
      };
    }

    const response = await fetch(`${HEYGEN_API_URL}/v3/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        video_setting,
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
