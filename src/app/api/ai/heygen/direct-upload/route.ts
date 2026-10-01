import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';

const HEYGEN_API_URL = 'https://api.heygen.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, filename, content_type, size_bytes, asset_id } = body;

    const { user, supabase } = await getAuthContext();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('heygen_api_key')
      .eq('id', user.id)
      .single();

    const apiKey = profile?.heygen_api_key?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'BYOK API Key not found' }, { status: 400 });
    }

    if (action === 'init') {
      const initRes = await fetch(`${HEYGEN_API_URL}/v3/assets/direct-uploads`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          content_type,
          size_bytes,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        throw new Error(initData.error?.message || 'Failed to init direct upload');
      }

      return NextResponse.json(initData);
    } 
    
    if (action === 'complete') {
      const completeRes = await fetch(`${HEYGEN_API_URL}/v3/assets/${asset_id}/complete`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeData.error?.message || 'Failed to complete direct upload');
      }

      return NextResponse.json(completeData);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    console.error('[HeyGen Direct Upload Error]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
