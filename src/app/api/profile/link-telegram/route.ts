import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, telegram_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[LinkTelegram API] Fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      telegram_id: profile?.telegram_id || null
    });
  } catch (err: any) {
    console.error('[LinkTelegram API] Exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
