import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/lib/services/monitoringService';

export async function GET(req: NextRequest) {
  // Verify Vercel Cron header
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const report = await monitoringService.getFullSystemReport();
    const criticalIssues = report.filter(r => r.status === 'critical' || r.status === 'warning');

    if (criticalIssues.length > 0) {
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598'; // Default admin ID

      if (TELEGRAM_BOT_TOKEN && ADMIN_CHAT_ID) {
        const alertText = criticalIssues.map(r => 
          `${r.status === 'critical' ? '🚨' : '⚠️'} *${r.provider} LOW BALANCE*\n` +
          `Only ${typeof r.remaining === 'number' ? r.remaining.toLocaleString() : r.remaining} ${r.unit} left!`
        ).join('\n\n');

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text: `📉 *Viral Engine: Resource Alert*\n\n${alertText}`,
            parse_mode: 'Markdown'
          })
        });
      }
    }

    return NextResponse.json({ ok: true, report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
