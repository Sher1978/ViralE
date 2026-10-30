import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { supportService } from '@/lib/supportService';

function escapeHtml(str: string) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guestId');

    let userId: string | null = null;
    try {
      const auth = await getAuthContext({ skipProfileCheck: true });
      userId = auth?.user?.id || null;
    } catch (e) {
      // Unauthenticated visitor
    }

    if (userId) {
      const messages = await supportService.getUserMessages(userId);
      return NextResponse.json({ ok: true, messages, userId, isGuest: false });
    }

    if (guestId) {
      const messages = supportService.getGuestMessages(guestId);
      return NextResponse.json({ ok: true, messages, userId: guestId, isGuest: true });
    }

    return NextResponse.json({ ok: true, messages: [], userId: null, isGuest: true });
  } catch (error: any) {
    console.error('[Support API GET] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, guestId, guestName } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ ok: false, error: 'Text is required' }, { status: 400 });
    }

    let authUser: any = null;
    let authProfile: any = null;
    try {
      const auth = await getAuthContext({ skipProfileCheck: true });
      authUser = auth?.user || null;
      if (authUser?.id) {
        const { data: prof } = await auth.supabase
          .from('profiles')
          .select('id, full_name, email, telegram_id')
          .eq('id', authUser.id)
          .maybeSingle();
        authProfile = prof;
      }
    } catch (e) {
      // Unauthenticated
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const ADMIN_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';

    if (authUser) {
      const savedMsg = await supportService.saveUserMessage(
        authUser.id,
        text,
        authProfile?.full_name || authUser.email
      );

      // Send alert to SuperAdmin in Telegram
      if (TELEGRAM_BOT_TOKEN) {
        const userName = authProfile?.full_name || authUser.user_metadata?.full_name || 'Пользователь';
        const userEmail = authProfile?.email || authUser.email || 'Не указан';
        const tgId = authProfile?.telegram_id || '';

        const tgReport =
          `🆘 <b>ОБРАЩЕНИЕ В ПОДДЕРЖКУ (ИЗ ПРИЛОЖЕНИЯ)</b>\n\n` +
          `👤 <b>Пользователь:</b> ${escapeHtml(userName)}\n` +
          `📧 <b>Email:</b> <code>${escapeHtml(userEmail)}</code>\n` +
          `🆔 <b>User ID:</b> <code>${authUser.id}</code>\n` +
          (tgId ? `📱 <b>Telegram ID:</b> <code>${tgId}</code>\n` : '') +
          `\n💬 <b>Сообщение:</b>\n` +
          `${escapeHtml(text.trim())}\n\n` +
          `👉 <i>Ответьте (Reply) на это сообщение в Telegram, чтобы отправить ответ пользователю анонимно прямо в приложение!</i>`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_ID,
            text: tgReport,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        }).catch(err => console.error('[Support API] Failed to alert admin:', err));
      }

      return NextResponse.json({ ok: true, message: savedMsg });
    }

    // Guest Flow
    const effectiveGuestId = guestId || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const savedMsg = supportService.saveGuestMessage(effectiveGuestId, text, guestName);

    if (TELEGRAM_BOT_TOKEN) {
      const tgReport =
        `🆘 <b>ОБРАЩЕНИЕ В ПОДДЕРЖКУ (ГОСТЬ С САЙТА)</b>\n\n` +
        `👤 <b>Имя:</b> ${escapeHtml(guestName || 'Посетитель сайта')}\n` +
        `🆔 <b>User ID:</b> <code>${effectiveGuestId}</code>\n\n` +
        `💬 <b>Сообщение:</b>\n` +
        `${escapeHtml(text.trim())}\n\n` +
        `👉 <i>Ответьте (Reply) на это сообщение в Telegram, чтобы отправить ответ пользователю анонимно прямо в приложение!</i>`;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_ID,
          text: tgReport,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      }).catch(err => console.error('[Support API] Failed to alert admin:', err));
    }

    return NextResponse.json({ ok: true, message: savedMsg, guestId: effectiveGuestId });
  } catch (error: any) {
    console.error('[Support API POST] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
