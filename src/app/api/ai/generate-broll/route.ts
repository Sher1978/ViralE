import { NextRequest, NextResponse } from 'next/server';

const HIGGSFIELD_API_BASE = 'https://api.higgsfield.ai/v1';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    const keyId = process.env.HIGGSFIELD_API_KEY_ID;
    const keySecret = process.env.HIGGSFIELD_API_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Higgsfield keys not configured' }, { status: 500 });
    }

    // 1. Submit job
    const response = await fetch(`${HIGGSFIELD_API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Higgs-Key-ID': keyId,
        'X-Higgs-Key-Secret': keySecret,
      },
      body: JSON.stringify({
        model: 'kling-3.0',
        prompt,
        options: {
          motion_bucket: 127,
          frames: 120,
          aspect_ratio: '9:16'
        }
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Higgsfield Error: ${err}`);
    }

    const data = await response.json();
    return NextResponse.json({ jobId: data.id });
  } catch (error: any) {
    console.error('B-Roll Generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'No jobId' }, { status: 400 });

  try {
    const response = await fetch(`${HIGGSFIELD_API_BASE}/jobs/${jobId}`, {
      headers: {
        'X-Higgs-Key-ID': process.env.HIGGSFIELD_API_KEY_ID || '',
        'X-Higgs-Key-Secret': process.env.HIGGSFIELD_API_KEY_SECRET || '',
      },
    });

    const data = await response.json();
    // Map Higgsfield status to our frontend status
    let status: 'processing' | 'completed' | 'failed' = 'processing';
    if (data.status === 'succeeded') status = 'completed';
    if (data.status === 'failed') status = 'failed';

    return NextResponse.json({ status, url: data.output_url });
  } catch (error: any) {
    return NextResponse.json({ status: 'failed', error: error.message });
  }
}
