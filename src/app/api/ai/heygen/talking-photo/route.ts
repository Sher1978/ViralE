import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_URL = 'https://api.heygen.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioUrl, photoUrl, avatarId, avatarType, projectId } = body;

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) throw new Error('System HeyGen API Key missing');

    console.log(`[HeyGen V2] Starting production pipeline. Type: ${avatarType || 'talking_photo'}`);
    
    let finalTalkingPhotoId = avatarId;

    // Phase 1: Custom Photo Upload (Binary Flow)
    if (!finalTalkingPhotoId && photoUrl) {
      console.log(`[HeyGen V2] Step 1: Requesting Upload URL (Key: ${apiKey.substring(0, 4)}***)`);
      try {
        // Use the specialized Talking Photo upload endpoint
        const getUrlRes = await fetch(`${HEYGEN_API_URL}/v2/talking_photo/upload`, {
          method: 'POST',
          headers: { 
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          body: JSON.stringify({})
        });

        const getUrlRaw = await getUrlRes.text();
        console.log(`[HeyGen V2] Step 1 Response (${getUrlRes.status}): ${getUrlRaw.substring(0, 200)}`);
        
        if (!getUrlRes.ok) {
           throw new Error(`Step 1 failed (${getUrlRes.status}): ${getUrlRaw.substring(0, 200)}`);
        }
        
        const json = JSON.parse(getUrlRaw);
        const { upload_url, talking_photo_id } = json.data;
        finalTalkingPhotoId = talking_photo_id;

        // 2. Download from our Supabase
        console.log('[HeyGen V2] Step 2: Downloading source image...');
        const imageRes = await fetch(photoUrl);
        const imageBuffer = await imageRes.arrayBuffer();

        // 3. Binary PUT to HeyGen S3
        console.log('[HeyGen V2] Step 3: PUT binary to S3...');
        const putRes = await fetch(upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/jpeg' },
          body: imageBuffer
        });

        if (!putRes.ok) throw new Error(`Step 3 (S3 PUT) failed: ${putRes.status}`);
        console.log(`[HeyGen V2] Upload complete. ID: ${finalTalkingPhotoId}`);

      } catch (uploadErr: any) {
        console.error('[HeyGen V2] Upload pipeline failed:', uploadErr);
        return NextResponse.json({ error: `HeyGen Upload Error: ${uploadErr.message}` }, { status: 500 });
      }
    }

    // Phase 2: Synchronization Delay
    console.log('[HeyGen V2] Step 4: Waiting 2s for sync...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Phase 3: Video Generation
    const payload = {
      video_inputs: [
        {
          character: {
            type: avatarType === 'avatar' ? 'avatar' : 'talking_photo',
            ...(avatarType === 'avatar' 
               ? { avatar_id: finalTalkingPhotoId } 
               : { talking_photo_id: finalTalkingPhotoId }
            )
          },
          voice: {
            type: 'audio',
            audio_url: audioUrl
          }
        }
      ],
      dimension: { width: 720, height: 1280 },
      aspect_ratio: '9:16',
      test: false
    };

    console.log('[HeyGen V2] Step 5: Sending generation request...');
    const response = await fetch(`${HEYGEN_API_URL}/v2/video/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log(`[HeyGen V2] Final Response (${response.status}): ${responseText.substring(0, 150)}`);

    if (!response.ok) {
       throw new Error(`HeyGen V2 Error: ${response.status}. ${responseText.substring(0, 200)}`);
    }

    const data = JSON.parse(responseText);
    const taskId = data.data?.video_id;
    
    if (!taskId) throw new Error(`Missing video_id: ${responseText}`);

    return NextResponse.json({ taskId });

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
