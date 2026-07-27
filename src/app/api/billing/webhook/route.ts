import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * LEMON SQUEEZY BILLING WEBHOOK LISTENER
 * Verifies signatures securely and processes successful order/subscription payments.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature') || '';

    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[LemonSqueezy Webhook] LEMONSQUEEZY_WEBHOOK_SECRET is not configured.');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // 1. Verify incoming webhook signature (timing-safe HMAC comparison)
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(rawBody).digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const digestBuffer = Buffer.from(digest, 'utf8');

    if (signatureBuffer.length !== digestBuffer.length || !crypto.timingSafeEqual(signatureBuffer, digestBuffer)) {
      console.warn('[LemonSqueezy Webhook] Signature verification failed. Unauthorized request.');
      return NextResponse.json({ error: 'Unauthorized signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;
    const customData = payload.meta?.custom_data || {};

    console.log(`[LemonSqueezy Webhook] Verified event signature: "${eventName}"`, customData);

    const userId = customData.user_id || customData.userId;
    if (!userId) {
      console.warn('[LemonSqueezy Webhook] Received payment event without user_id in custom_data. Ignoring.');
      // Respond 200 to prevent retries for non-attributable webhooks (e.g. standard store testing)
      return NextResponse.json({ success: true, warning: 'No user_id in metadata' });
    }

    // 2. Handle successful orders and active subscriptions
    if (eventName === 'order_created' || eventName === 'subscription_created') {
      let creditsToAdd = 0;
      let newTier: 'free' | 'creator' | 'pro' = 'free';

      // Read credits/tier overrides directly from custom checkout data if available
      if (customData.credits) {
        creditsToAdd = parseInt(customData.credits, 10) || 0;
      }
      if (customData.tier === 'creator' || customData.tier === 'pro') {
        newTier = customData.tier;
      }

      // Check variant info from order attributes if metadata credits are blank
      const attributes = payload.data?.attributes || {};
      const variantName = String(attributes.variant_name || attributes.first_order_item?.variant_name || '');
      
      if (creditsToAdd === 0) {
        const lowerName = variantName.toLowerCase();
        if (lowerName.includes('pro')) {
          creditsToAdd = 1000;
          newTier = 'pro';
        } else if (lowerName.includes('creator')) {
          creditsToAdd = 500;
          newTier = 'creator';
        } else {
          creditsToAdd = 250; // default standard topup package
        }
      }

      // 3. Query current user profile (respects active schema dynamically!)
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('credits_balance, tier, subscription_status, referred_by_id, full_name, email')
        .eq('id', userId)
        .single();

      if (profileErr || !profile) {
        console.error(`[LemonSqueezy Webhook] Profile not found in database for User: ${userId}`, profileErr);
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
      }

      const newBalance = (profile.credits_balance || 0) + creditsToAdd;
      const updatedTier = newTier !== 'free' ? newTier : (profile.tier || 'free');

      // 4. Perform atomic update inside active Supabase schema
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({
          credits_balance: newBalance,
          tier: updatedTier,
          subscription_status: 'active'
        })
        .eq('id', userId);

      if (updateErr) {
        console.error(`[LemonSqueezy Webhook] Failed to update profile for User: ${userId}`, updateErr);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`[LemonSqueezy Webhook] Successfully credited User ${userId} with +${creditsToAdd} credits. Balance: ${newBalance}. Tier: ${updatedTier}`);

      // 5. Handle 30% Referral Commission Accrual
      if (profile.referred_by_id) {
        try {
          const totalCents = attributes.total || (attributes.first_order_item?.price || 0);
          const paymentAmountUsd = totalCents > 0 ? (totalCents / 100) : (updatedTier === 'pro' ? 79 : updatedTier === 'creator' ? 29 : 19);
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
                  referred_user_id: userId,
                  payment_amount_usd: paymentAmountUsd,
                  earned_amount_usd: earnedUsd,
                  payment_provider: 'lemonsqueezy',
                  metadata: { variant_name: variantName }
                });

              console.log(`[Referral System] Accrued +$${earnedUsd} USD (30%) for Inviter ${inviterId} from User ${userId} payment of $${paymentAmountUsd} USD`);

              if (inviter.telegram_id && process.env.TELEGRAM_BOT_TOKEN) {
                const isRu = inviter.preferred_language === 'ru';
                const msg = isRu
                  ? `🎉 *Новое реферальное вознаграждение +$${earnedUsd.toFixed(2)} USD!*\n\nВаш реферал совершил оплату. 30% комиссии зачислено на ваш партнерский баланс!\n\n💳 Текущий партнерский баланс: *$${newPartnerBal.toFixed(2)} USD*`
                  : `🎉 *New Referral Reward +$${earnedUsd.toFixed(2)} USD!*\n\nYour referral completed a payment. 30% commission added to your partner balance!\n\n💳 Current Partner Balance: *$${newPartnerBal.toFixed(2)} USD*`;

                fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: inviter.telegram_id, text: msg, parse_mode: 'Markdown' })
                }).catch(() => {});
              }
            }
          }
        } catch (refErr) {
          console.error('[LemonSqueezy Webhook] Failed to process referral earnings:', refErr);
        }
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[LemonSqueezy Webhook] Process exception:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
