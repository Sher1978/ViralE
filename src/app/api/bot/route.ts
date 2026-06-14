import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { monitoringService } from '@/lib/services/monitoringService';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req: NextRequest) {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();

    // 1. Handle pre_checkout_query (Telegram Stars Pre-checkout Check)
    if (body.pre_checkout_query) {
      const queryId = body.pre_checkout_query.id;
      const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: queryId,
          ok: true,
        }),
      });
      const data = await tgRes.json();
      console.log('[Telegram Stars Webhook] answerPreCheckoutQuery response:', data);
      return NextResponse.json({ ok: true });
    }

    const { message } = body;

    // 2. Handle successful_payment (Telegram Stars payment successful)
    if (message && message.successful_payment) {
      const payment = message.successful_payment;
      const payload = payment.invoice_payload;
      console.log('[Telegram Stars Webhook] Successful payment received:', payment);

      try {
        const parts = payload.split(':');
        if (parts.length >= 4) {
          const [userId, creditsStr, itemId, type] = parts;
          const credits = parseInt(creditsStr, 10) || 0;

          if (userId && credits > 0) {
            const { supabaseAdmin } = await import('@/lib/supabase');
            const { addCredits } = await import('@/lib/credits');

            // Credit balance
            await addCredits(supabaseAdmin, userId, credits, 'top_up');

            // If it is a plan subscription, also update the tier
            if (type === 'plan') {
              await supabaseAdmin
                .from('profiles')
                .update({
                  tier: itemId, // 'starter', 'pro', 'scale'
                  subscription_status: 'active'
                })
                .eq('id', userId);
            }

            // Notify the user in the Telegram chat
            const locale = (message.from?.language_code === 'ru') ? 'ru' : 'en';
            const successText = locale === 'ru'
              ? `⭐️ *Оплата успешно получена!*\n\nНа ваш баланс в Студии зачислено *${credits}* кредитов. Спасибо за поддержку! 🚀`
              : `⭐️ *Payment successfully received!*\n\nYour Studio balance has been credited with *${credits}* credits. Thank you for your support! 🚀`;

            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: message.chat.id,
                text: successText,
                parse_mode: 'Markdown',
              }),
            });
            console.log(`[Telegram Stars Webhook] Successfully credited User ${userId} with ${credits} credits.`);
          }
        }
      } catch (err) {
        console.error('[Telegram Stars Webhook] Failed to process successful payment:', err);
      }

      return NextResponse.json({ ok: true });
    }

    if (!message || !message.text || !message.from) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const user = message.from;
    const text = message.text;

    // Handle /start
    if (text.startsWith('/start')) {
      const payload = text.split(' ')[1];
      
      if (payload === 'auth') {
        // Frictionless Auth Flow
        // Generate a signed message for the web app to verify
        const authData = {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          auth_date: Math.floor(Date.now() / 1000)
        };

        // Create check hash
        const dataCheckArr = Object.entries(authData)
          .filter(([key]) => key !== 'hash')
          .sort()
          .map(([key, value]) => `${key}=${value}`);
        
        const dataCheckString = dataCheckArr.join('\n');
        
        const secretKey = crypto.createHash('sha256')
          .update(TELEGRAM_BOT_TOKEN)
          .digest();
        
        const hash = crypto.createHmac('sha256', secretKey)
          .update(dataCheckString)
          .digest('hex');

        const params = new URLSearchParams({
          ...Object.fromEntries(Object.entries(authData).map(([k, v]) => [k, String(v)])),
          hash
        });

        const locale = user.language_code === 'ru' ? 'ru' : 'en';
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://viral-engine.uno';
        const authUrl = `${baseUrl}/${locale}/auth/telegram/callback?${params.toString()}`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: locale === 'ru' 
              ? `Добро пожаловать в Viral Studio! 🚀\n\nНажмите кнопку ниже, чтобы войти и начать создавать потрясающие видео.`
              : `Welcome to Viral Studio! 🚀\n\nClick the button below to sign in and start creating amazing videos.`,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: locale === 'ru' ? '🚀 Войти в Студию' : '🚀 Sign In to Studio',
                    url: authUrl
                  }
                ]
              ]
            }
          })
        });
      } else {
        // Regular welcome
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `Welcome! I'm the Viral Studio Bot. 🤖\n\nI'll help you create viral videos and deliver them directly to your Telegram.\n\nUse /help to see what I can do.`
          })
        });
      }
    } else if (text.startsWith('/balance')) {
      const ADMIN_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';
      if (String(user.id) !== String(ADMIN_ID)) {
        return NextResponse.json({ ok: true });
      }

      const report = await monitoringService.getFullSystemReport();
      const statusEmoji = (s: string) => s === 'critical' ? '🔴' : s === 'warning' ? '🟡' : '🟢';
      
      const reportText = report.map(r => 
        `${statusEmoji(r.status)} *${r.provider}*\n` +
        `Remaining: ${typeof r.remaining === 'number' ? r.remaining.toLocaleString() : r.remaining} ${r.unit}` +
        (r.limit ? ` / ${typeof r.limit === 'number' ? r.limit.toLocaleString() : r.limit}` : '')
      ).join('\n\n');

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `📊 *System API Balance Report*\n\n${reportText}`,
          parse_mode: 'Markdown'
        })
      });
    } else if (text.startsWith('/help')) {
      const locale = user.language_code === 'ru' ? 'ru' : 'en';
      const helpText = locale === 'ru'
        ? `🤖 *Помощник Viral Studio*\n\n` +
          `• /start — Войти в личный кабинет\n` +
          `• /balance — Проверить ресурсы (только для админов)\n` +
          `• Отправляйте видео и идеи боту, чтобы начать работу.`
        : `🤖 *Viral Studio Assistant*\n\n` +
          `• /start — Sign in to your dashboard\n` +
          `• /balance — Check API limits (Admin only)\n` +
          `• Send videos or ideas to get started.`;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: helpText,
          parse_mode: 'Markdown'
        })
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Bot webhook error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}
