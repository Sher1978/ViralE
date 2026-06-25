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

      // Fallback: search by username
      if ((findError || !profile) && username) {
        const { data: profileByUsername } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();
        profile = profileByUsername;
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
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error('[Tribute Webhook] Failed to update user profile tier/status:', updateError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`[Tribute Webhook] Successfully activated tier "${tier}" and added ${credits} credits for User ${profile.id}`);

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
