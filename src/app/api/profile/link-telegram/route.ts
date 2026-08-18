import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('telegram_id')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[Link Telegram API Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ telegram_id: profile?.telegram_id || null });
  } catch (err: any) {
    console.error('[Link Telegram GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
