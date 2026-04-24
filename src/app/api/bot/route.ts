import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req: NextRequest) {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { message } = body;

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
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Bot webhook error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}
