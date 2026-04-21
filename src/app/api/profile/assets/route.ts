import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * API Route for User Media Assets Library.
 * Handles fetching, creating, and deleting photo/video assets.
 */

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    
    const { data: assets, error } = await supabase
      .from('media_assets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ assets });
  } catch (error: any) {
    console.error('Fetch assets failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { url, type = 'photo', metadata = {} } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'Missing asset URL' }, { status: 400 });
    }

    const { data: asset, error } = await supabase
      .from('media_assets')
      .insert({
        user_id: user.id,
        url,
        type,
        metadata
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ asset });
  } catch (error: any) {
    console.error('Create asset failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing asset ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('media_assets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete asset failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
