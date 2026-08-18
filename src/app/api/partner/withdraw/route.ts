import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { user } = await getAuthContext();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const payoutMethod = body.payoutMethod || 'usdt_trc20';
    const payoutDetails = (body.payoutDetails || '').trim();

    // 1. Fetch user profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, partner_balance_usd, tier, telegram_id, preferred_language')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const balanceUsd = Number(profile.partner_balance_usd || 0);
    const hasPaidPackage = profile.tier === 'creator' || profile.tier === 'pro' || profile.tier === 'starter' || profile.tier === 'scale';

    // 2. Validate withdrawal rules
    if (balanceUsd < 100) {
      return NextResponse.json({
        error: profile.preferred_language === 'ru'
          ? `Минимальная сумма для вывода составляет $100 USD. Ваш текущий партнерский баланс: $${balanceUsd.toFixed(2)} USD.`
          : `Minimum withdrawal amount is $100 USD. Your current balance is $${balanceUsd.toFixed(2)} USD.`
      }, { status: 400 });
    }

    if (!hasPaidPackage) {
      return NextResponse.json({
        error: profile.preferred_language === 'ru'
          ? 'Для запроса вывода средств необходим активный платный тариф (Creator или Pro).'
          : 'An active paid subscription (Creator or Pro) is required to request payouts.'
      }, { status: 400 });
    }

    // 3. Create payout request record
    const { data: newPayout, error: payoutErr } = await supabaseAdmin
      .from('payout_requests')
      .insert({
        user_id: user.id,
        amount_usd: balanceUsd,
        payout_method: payoutMethod,
        payout_details: payoutDetails || 'Telegram Direct Verification',
        status: 'pending'
      })
      .select()
      .single();

    if (payoutErr || !newPayout) {
      console.error('[Partner Withdraw API] Failed to insert payout request:', payoutErr);
      return NextResponse.json({ error: 'Failed to record payout request' }, { status: 500 });
    }

    // 4. Send Telegram Admin Alert to Superadmin
    const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'ViralE_bot';

    if (botToken) {
      const adminMessage = 
        `💸 *НОВАЯ ЗАЯВКА НА ВЫВОД ПАРТНЁРСКИХ СРЕДСТВ!*\n\n` +
        `👤 *Пользователь:* ${profile.full_name || 'Творец'} (\`${profile.email}\`)\n` +
        `🆔 *User ID:* \`${user.id}\`\n` +
        `💰 *Сумма к выплате:* *$${balanceUsd.toFixed(2)} USD*\n` +
        `👑 *Тариф:* *${(profile.tier || 'free').toUpperCase()}*\n` +
        `💳 *Метод:* \`${payoutMethod.toUpperCase()}\`\n` +
        `📌 *Реквизиты:* \`${payoutDetails || 'Не указаны (запросить в боте)'}\` \n\n` +
        `🆔 *ID Заявки:* \`${newPayout.id}\``;

      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: adminMessage,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '💬 Ответить пользователю', url: `https://t.me/${botUsername}?start=payout_${newPayout.id}` }
              ]
            ]
          }
        })
      }).catch((err) => console.error('[Partner Withdraw API] Failed to notify admin:', err));
    }

    const telegramDeepLink = `https://t.me/${botUsername}?start=payout_${newPayout.id}`;

    return NextResponse.json({
      success: true,
      payoutId: newPayout.id,
      amountUsd: balanceUsd,
      telegramDeepLink,
      message: profile.preferred_language === 'ru'
        ? 'Заявка на вывод успешно сформирована! Перейдите в Telegram-бот для подтверждения и переписки с суперадмином.'
        : 'Payout request generated! Proceed to Telegram bot to confirm and chat with superadmin.'
    });

  } catch (error: any) {
    console.error('[Partner Withdraw API] Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
