import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * API Route for HeyGen API Key management (BYOK).
 */

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('heygen_api_key')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    // Return partial key for masking if needed
    const key = profile?.heygen_api_key;
    const maskedKey = key ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : null;

    return NextResponse.json({ hasKey: !!key, maskedKey });
  } catch (error: any) {
    console.error('Fetch HeyGen key failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API Key' }, { status: 400 });
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        heygen_api_key: apiKey,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save HeyGen key failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getAuthenticatedUser();

    const { error } = await supabase
      .from('profiles')
      .update({
        heygen_api_key: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Remove HeyGen key failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
