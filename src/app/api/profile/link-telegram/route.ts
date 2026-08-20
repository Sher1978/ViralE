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

    let telegramId = profile?.telegram_id || null;

    // Fallback: check auth user metadata if telegram_id is not in profile yet
    if (!telegramId) {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId).catch(() => ({ data: { user: null } }));
      if (user?.user_metadata?.telegram_id) {
        telegramId = String(user.user_metadata.telegram_id);
        await supabaseAdmin.from('profiles').update({ telegram_id: telegramId }).eq('id', userId).catch(() => {});
      }
    }

    return NextResponse.json({ telegram_id: telegramId });
  } catch (err: any) {
    console.error('[Link Telegram GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
