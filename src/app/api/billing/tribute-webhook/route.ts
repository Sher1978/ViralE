import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const TRIBUTE_API_KEY = process.env.TRIBUTE_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Map plans to credits
const PLAN_CREDITS = {
  starter: 400,
  pro: 1000,
  scale: 3000,
};

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'Tribute Webhook' });
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('trbt-signature');
    const rawBody = await req.text();

    console.log('[Tribute Webhook] Received webhook payload.');

    // 1. Signature Verification
    if (TRIBUTE_API_KEY && TRIBUTE_API_KEY !== 'test_tribute_api_key_placeholder') {
      if (!signature) {
        console.error('[Tribute Webhook] Missing trbt-signature header.');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      const computedSignature = crypto
        .createHmac('sha256', TRIBUTE_API_KEY)
        .update(rawBody)
        .digest('hex');

      if (signature !== computedSignature) {
        console.error('[Tribute Webhook] Signature verification failed.');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.warn('[Tribute Webhook] Tribute API Key is not set or using placeholder. Signature verification bypassed.');
    }

    let body;
    try {
      body = rawBody ? JSON.parse(rawBody) : null;
    } catch (e) {
      console.warn('[Tribute Webhook] Could not parse body as JSON:', rawBody);
      return NextResponse.json({ ok: true, message: 'Ping/Non-JSON payload received' });
    }

    if (!body || !body.name) {
      return NextResponse.json({ ok: true, message: 'Verification ping received' });
    }

    const { name: eventName, payload } = body;

    if (!payload) {
      return NextResponse.json({ ok: true, message: 'Event received without payload' });
    }

    console.log(`[Tribute Webhook] Processing event: ${eventName}`);

    // 2. Process subscription activation and renewal
    if (eventName === 'new_subscription' || eventName === 'renewed_subscription') {
      const telegramId = payload.telegram_user_id;
      const username = payload.telegram_username;
      const subscriptionId = String(payload.subscription_id);
      const subscriptionName = payload.subscription_name || '';

      if (!telegramId) {
        console.warn('[Tribute Webhook] Webhook payload missing telegram_user_id.', payload);
        return NextResponse.json({ ok: true, message: 'Missing telegram_user_id in payload' });
      }

      // Determine tier based on subscription ID or Name mapping
      let tier: 'starter' | 'pro' | 'scale' | null = null;

      const envStarterId = process.env.TRIBUTE_STARTER_SUB_ID;
      const envProId = process.env.TRIBUTE_PRO_SUB_ID;
      const envScaleId = process.env.TRIBUTE_SCALE_SUB_ID;

      if (envStarterId && subscriptionId === envStarterId) {
        tier = 'starter';
      } else if (envProId && subscriptionId === envProId) {
        tier = 'pro';
      } else if (envScaleId && subscriptionId === envScaleId) {
        tier = 'scale';
      } else {
        // Fallback to name matching
        const nameLower = subscriptionName.toLowerCase();
        if (nameLower.includes('starter')) {
          tier = 'starter';
        } else if (nameLower.includes('pro')) {
          tier = 'pro';
        } else if (nameLower.includes('scale')) {
          tier = 'scale';
        }
      }

      if (!tier) {
        console.warn(`[Tribute Webhook] Could not map subscription ID "${subscriptionId}" or Name "${subscriptionName}" to any plan.`);
        return NextResponse.json({ ok: true, message: 'Unmapped subscription' });
      }

      const credits = PLAN_CREDITS[tier];

      // 3. Database operations
      const { supabaseAdmin } = await import('@/lib/supabase');
      const { addCredits } = await import('@/lib/credits');

      // Find user profile by telegram_id
      let { data: profile, error: findError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      // Fallback: search auth users list by metadata or email if profile not found by telegram_id
      if (findError || !profile) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }).catch(() => ({ data: { users: [] } }));
        const matchedUser = users?.find((u: any) => String(u.user_metadata?.telegram_id) === String(telegramId) || u.user_metadata?.username === username);
        if (matchedUser) {
          const { data: p } = await supabaseAdmin.from('profiles').select('*').eq('id', matchedUser.id).maybeSingle();
          profile = p;
        }
      }

      if (!profile) {
        console.error(`[Tribute Webhook] User with telegram_id ${telegramId} or username "${username}" not found in database.`);
        return NextResponse.json({ ok: true, message: 'User not found in local DB' });
      }

      // Add credits and update subscription status/tier
      await addCredits(supabaseAdmin, profile.id, credits, 'top_up');
      
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          tier,
          subscription_status: 'active',
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error('[Tribute Webhook] Failed to update user profile tier/status:', updateError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`[Tribute Webhook] Successfully activated tier "${tier}" and added ${credits} credits for User ${profile.id}`);

      // Handle 30% Referral Commission Accrual
      if (profile.referred_by_id) {
        try {
          const tributePricesUsd: Record<string, number> = { starter: 29, pro: 79, scale: 199 };
          const paymentAmountUsd = tributePricesUsd[tier] || 29;
          const earnedUsd = Math.round(paymentAmountUsd * 0.30 * 100) / 100;

          if (earnedUsd > 0) {
            const inviterId = profile.referred_by_id;
            const { data: inviter } = await supabaseAdmin
              .from('profiles')
              .select('partner_balance_usd, telegram_id, preferred_language')
              .eq('id', inviterId)
              .single();

            if (inviter) {
              const currentPartnerBal = Number(inviter.partner_balance_usd || 0);
              const newPartnerBal = Math.round((currentPartnerBal + earnedUsd) * 100) / 100;

              await supabaseAdmin
                .from('profiles')
                .update({ partner_balance_usd: newPartnerBal })
                .eq('id', inviterId);

              await supabaseAdmin
                .from('referral_earnings')
                .insert({
                  inviter_id: inviterId,
                  referred_user_id: profile.id,
                  payment_amount_usd: paymentAmountUsd,
                  earned_amount_usd: earnedUsd,
                  payment_provider: 'tribute',
                  metadata: { tier }
                });

              console.log(`[Tribute Webhook] Accrued +$${earnedUsd} USD (30%) for Inviter ${inviterId} from User ${profile.id}`);

              if (inviter.telegram_id && TELEGRAM_BOT_TOKEN) {
                const isRu = inviter.preferred_language === 'ru';
                const msg = isRu
                  ? `🎉 *Новое реферальное вознаграждение +$${earnedUsd.toFixed(2)} USD!*\n\nВаш реферал оплатил тариф *${tier.toUpperCase()}*. 30% комиссии зачислено на ваш баланс!\n\n💳 Текущий партнерский баланс: *$${newPartnerBal.toFixed(2)} USD*`
                  : `🎉 *New Referral Reward +$${earnedUsd.toFixed(2)} USD!*\n\nYour referral purchased *${tier.toUpperCase()}* plan. 30% commission added to your balance!\n\n💳 Current Partner Balance: *$${newPartnerBal.toFixed(2)} USD*`;

                fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: inviter.telegram_id, text: msg, parse_mode: 'Markdown' })
                }).catch(() => {});
              }
            }
          }
        } catch (refErr) {
          console.error('[Tribute Webhook] Failed to process referral earnings:', refErr);
        }
      }

      // 4. Send Telegram Notification
      if (TELEGRAM_BOT_TOKEN) {
        const locale = (profile.preferred_language === 'ru') ? 'ru' : 'en';
        
        const successText = locale === 'ru'
          ? `💳 *Подписка Tribute успешно активирована!*\n\nВаш тариф повышен до *${tier.toUpperCase()}*.\nНа ваш баланс начислено *${credits}* кредитов. Спасибо за доверие! 🚀`
          : `💳 *Tribute Subscription successfully activated!*\n\nYour plan has been upgraded to *${tier.toUpperCase()}*.\nYour balance has been credited with *${credits}* credits. Thank you for your support! 🚀`;

        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramId,
              text: successText,
              parse_mode: 'Markdown',
            }),
          });
        } catch (tgErr) {
          console.error('[Tribute Webhook] Failed to send Telegram notification:', tgErr);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Tribute Webhook] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
