import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { addCredits } from '@/lib/credits';

export async function POST(req: Request) {
  try {
    const { user } = await getAuthContext();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { telegramId, username } = await req.json();
    if (!telegramId) {
      return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 });
    }

    // Fetch existing profile
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id, telegram_id, credits_balance')
      .eq('id', user.id)
      .single();

    if (profErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // If telegram_id was already linked, don't re-grant bonus
    const alreadyLinked = Boolean(profile.telegram_id);

    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({
        telegram_id: parseInt(String(telegramId), 10),
        username: username || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateErr) {
      throw updateErr;
    }

    let creditsAdded = 0;
    if (!alreadyLinked) {
      // Award +50 CR bonus for connecting Telegram
      await addCredits(supabaseAdmin, user.id, 50, 'telegram_connect_bonus', {
        reason: 'Bonus for linking Telegram bot',
        linked_at: new Date().toISOString()
      });
      creditsAdded = 50;
    }

    const { data: updatedProfile } = await supabaseAdmin
      .from('profiles')
      .select('credits_balance')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      telegramLinked: true,
      creditsAdded,
      newBalance: updatedProfile?.credits_balance || (profile.credits_balance + creditsAdded)
    });
  } catch (error: any) {
    console.error('[LinkTelegram API Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
