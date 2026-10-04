import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { monitoringService } from '@/lib/services/monitoringService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verify Cron authorization secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (process.env.NODE_ENV === 'production' && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron execution' }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';

  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN is not set' }, { status: 500 });
  }

  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const todayDateStr = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    // 1. Users metrics
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    const { count: newUsers24h } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo);

    // 2. Subscriptions & Tier counts
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('tier, subscription_status, credits_balance');

    let activeSubs = 0;
    let totalCreditsInCirculation = 0;
    const tierBreakdown = { free: 0, creator: 0, pro: 0, scale: 0 };

    (profiles || []).forEach((p: any) => {
      const tier = (p.tier || 'free').toLowerCase();
      if (tier in tierBreakdown) (tierBreakdown as any)[tier]++;
      if (tier !== 'free' && p.subscription_status === 'active') activeSubs++;
      totalCreditsInCirculation += (p.credits_balance || 0);
    });

    // 3. Transactions & Revenue in last 24h
    const { data: txs24h } = await supabaseAdmin
      .from('credits_transactions')
      .select('*, profiles(full_name, email)')
      .gte('created_at', twentyFourHoursAgo);

    const paidTxs24h = (txs24h || []).filter((t: any) => t.transaction_type === 'top_up' || t.transaction_type === 'tribute_subscription');
    const revenue24hCredits = paidTxs24h.reduce((acc: number, t: any) => acc + (t.amount || 0), 0);

    // 4. Content Generation Metrics (Last 24h & Total)
    const { count: scripts24h } = await supabaseAdmin
      .from('credits_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('transaction_type', 'SCRIPT_GEN')
      .gte('created_at', twentyFourHoursAgo);

    const { count: renders24h } = await supabaseAdmin
      .from('render_jobs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo);

    const { count: avatars24h } = await supabaseAdmin
      .from('credits_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('transaction_type', 'HEYGEN_GENERATE')
      .gte('created_at', twentyFourHoursAgo);

    // 5. System API Balances
    let systemBalancesText = '🟢 Все API провайдеры в норме';
    try {
      const balances = await monitoringService.getFullSystemReport();
      systemBalancesText = balances.map(b => {
        const emoji = b.status === 'critical' ? '🔴' : b.status === 'warning' ? '🟡' : '🟢';
        return `${emoji} <b>${b.provider}:</b> ${typeof b.remaining === 'number' ? b.remaining.toLocaleString() : b.remaining} ${b.unit}`;
      }).join('\n');
    } catch (e) {
      console.warn('[Daily Digest] Failed to fetch system balances:', e);
    }

    // Format Digest Message
    const text =
      `📊 <b>ЕЖЕДНЕВНЫЙ ДАЙДЖЕСТ VIRAL ENGINE</b> 📊\n` +
      `📅 <b>Отчет за ${todayDateStr}</b>\n\n` +
      
      `👥 <b>ПОЛЬЗОВАТЕЛИ И РОСТ:</b>\n` +
      `• Новых за 24 часа: <b>+${newUsers24h || 0} чел.</b>\n` +
      `• Всего зарегистрировано: <b>${totalUsers || 0} чел.</b>\n` +
      `• Активных платных подписок: <b>${activeSubs}</b>\n` +
      `└ Free: ${tierBreakdown.free} | Creator: ${tierBreakdown.creator} | Pro: ${tierBreakdown.pro} | Scale: ${tierBreakdown.scale}\n\n` +

      `💳 <b>ФИНАНСЫ И ОПЛАТЫ (24ч):</b>\n` +
      `• Новых транзакций оплат: <b>${paidTxs24h.length}</b>\n` +
      `• Зачислено по оплатам: <b>+${revenue24hCredits.toLocaleString()} CR</b>\n` +
      `• Кредитов в обороте: <b>${totalCreditsInCirculation.toLocaleString()} CR</b>\n\n` +

      `🚀 <b>ГЕНЕРАЦИЯ И КРАФТ (24ч):</b>\n` +
      `• ИИ-сценариев создано: <b>+${scripts24h || 0}</b>\n` +
      `• Рендеров видео: <b>+${renders24h || 0}</b>\n` +
      `• Аватаров HeyGen: <b>+${avatars24h || 0}</b>\n\n` +

      `🛠 <b>СОСТОЯНИЕ API ПРОВАЙДЕРОВ:</b>\n` +
      `${systemBalancesText}\n\n` +

      `⏰ <i>Автоматически сгенерировано Vercel Cron Engine</i>`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📊 Открыть Веб-Дашборд', url: 'https://www.virale.uno/ru/app/admin' }
            ]
          ]
        }
      })
    });

    const data = await res.json();
    return NextResponse.json({ ok: true, sent: data.ok, recipient: adminChatId });

  } catch (error: any) {
    console.error('[Daily Digest Cron Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
