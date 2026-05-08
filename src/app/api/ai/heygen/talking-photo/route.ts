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
      console.log(`[HeyGen V2] --- STARTING SMART SCANNER PHASE ---`);
      
      const tryFetch = async (url: string) => {
        console.log(`[HeyGen V2] SCANNING URL: ${url}`);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 
            'X-Api-Key': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          body: JSON.stringify({ file_type: 'jpg' })
        });
        const text = await res.text();
        console.log(`[HeyGen V2] ${url} -> Status ${res.status} | Body: ${text.substring(0, 100)}`);
        return { res, text };
      };

      try {
        const endpoints = [
          `${HEYGEN_API_URL}/v2/talking_photo/upload`,
          `${HEYGEN_API_URL}/v2/upload/photo`,
          `https://api.us.heygen.com/v2/upload/photo`, // US Region
          `https://api.us.heygen.com/v2/talking_photo/upload`, // US Region specialized
          `${HEYGEN_API_URL}/v2/video/upload/photo`,
          `${HEYGEN_API_URL}/v2/asset/upload/photo`,
          `${HEYGEN_API_URL}/v1/talking_photo/upload_url`
        ];

        let finalRes: Response | null = null;
        let finalText = '';

        for (const url of endpoints) {
          const { res, text } = await tryFetch(url);
          // If we get 200 or anything that isn't 404/405/401, it's a candidate
          if (res.status === 200 || res.status === 201) {
            finalRes = res;
            finalText = text;
            break;
          }
        }

        if (!finalRes) throw new Error('All scanning endpoints failed (404/405/401). Please check if your API key has upload permissions.');
        
        const json = JSON.parse(finalText);
        const upload_url = json.data?.upload_url || json.data?.url;
        const talking_photo_id = json.data?.talking_photo_id || json.data?.id;
        
        if (!upload_url || !talking_photo_id) {
           throw new Error(`Invalid response structure: ${finalText.substring(0, 100)}`);
        }
        
        finalTalkingPhotoId = talking_photo_id;

        // Step 2: Download from our Supabase
        console.log('[HeyGen V2] Step 2: Downloading source image from Supabase...');
        const imageRes = await fetch(photoUrl);
        if (!imageRes.ok) throw new Error(`Failed to download image from ${photoUrl}`);
        const imageBuffer = await imageRes.arrayBuffer();

        // Step 3: Binary PUT to HeyGen S3
        console.log('[HeyGen V2] Step 3: PUT binary to HeyGen S3 bucket...');
        const putRes = await fetch(upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/jpeg' },
          body: imageBuffer
        });

        if (!putRes.ok) throw new Error(`Step 3 (S3 PUT) failed: ${putRes.status}`);
        console.log(`[HeyGen V2] Upload complete. ID: ${finalTalkingPhotoId}`);

      } catch (uploadErr: any) {
        console.error('[HeyGen V2] Fatal Upload Error:', uploadErr);
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
        'X-Api-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`
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

    const statusRes = await fetch(`${HEYGEN_API_URL}/v1/video_status.get?video_id=${taskId}`, {
      method: 'GET',
      headers: { 'X-Api-Key': apiKey || '' }
    });

    const data = await statusRes.json();
    
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
    console.error('[HeyGen Status] GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
