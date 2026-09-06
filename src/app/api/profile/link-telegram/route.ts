import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isTelegramIdBlocked } from '@/lib/blockedUsers';

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

    // Check if telegram_id is blocked
    if (telegramId && isTelegramIdBlocked(telegramId)) {
      await supabaseAdmin.from('profiles').update({ telegram_id: null }).eq('id', userId);
      return NextResponse.json({ error: 'This Telegram account is blocked.' }, { status: 403 });
    }

    // Fallback: check auth user metadata if telegram_id is not in profile yet
    if (!telegramId) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (user?.user_metadata?.telegram_id) {
          const metaTgId = String(user.user_metadata.telegram_id);
          if (isTelegramIdBlocked(metaTgId)) {
            return NextResponse.json({ error: 'This Telegram account is blocked.' }, { status: 403 });
          }
          telegramId = metaTgId;
          await supabaseAdmin.from('profiles').update({ telegram_id: telegramId }).eq('id', userId);
        }
      } catch (fallbackErr) {
        console.warn('[Link Telegram API] Fallback metadata check failed:', fallbackErr);
      }
    }

    return NextResponse.json({ telegram_id: telegramId });
  } catch (err: any) {
    console.error('[Link Telegram GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
