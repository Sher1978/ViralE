import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_URL = 'https://api.heygen.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioUrl, photoUrl, projectId } = body;

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) throw new Error('System HeyGen API Key missing');

    console.log(`[HeyGen TP] Starting generation for project ${projectId} with audio ${audioUrl}`);

    // Brute-force attempt at different HeyGen v2 structures to find the one that works for this account
    const structures = [
      { 
        name: 'v2_null_id',
        body: {
          video_inputs: [{
            character: { type: 'talking_photo', talking_photo_url: photoUrl, talking_photo_id: null },
            voice: { type: 'audio', audio_url: audioUrl }
          }]
        }
      },
      { 
        name: 'v2_empty_id',
        body: {
          video_inputs: [{
            character: { type: 'talking_photo', talking_photo_url: photoUrl, talking_photo_id: "" },
            voice: { type: 'audio', audio_url: audioUrl }
          }]
        }
      },
      { 
        name: 'v2_id_bypass',
        body: {
          video_inputs: [{
            character: { type: 'talking_photo', talking_photo_id: photoUrl },
            voice: { type: 'audio', audio_url: audioUrl }
          }]
        }
      }
    ];

    let lastError = '';
    let taskId = null;

    for (const struct of structures) {
      console.log(`[HeyGen TP] Probing structure: ${struct.name}`);
      try {
        const res = await fetch(`${HEYGEN_API_URL}/v2/video/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify(struct.body)
        });

        const data = await res.json();
        if (res.ok && data.data?.video_id) {
          console.log(`[HeyGen TP] SUCCESS with structure: ${struct.name}`);
          taskId = data.data.video_id;
          break;
        } else {
          const err = data.message || data.error?.message || JSON.stringify(data);
          console.warn(`[HeyGen TP] Structure ${struct.name} failed:`, err);
          lastError = err;
        }
      } catch (e: any) {
        console.warn(`[HeyGen TP] Exception in ${struct.name}:`, e.message);
        lastError = e.message;
      }
    }

    if (!taskId) {
      throw new Error(`All HeyGen probes failed. Last error: ${lastError.substring(0, 200)}`);
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
