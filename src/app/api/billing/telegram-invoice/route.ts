import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Local pricing/package configuration mapped to Telegram Stars (XTR)
const TOP_UP_OPTIONS = [
  { credits: 50, stars: 200, titleEn: 'Refill: 50 Credits', titleRu: 'Пополнение: 50 Кредитов', descEn: 'Purchase 50 credits for editing and AI generation in Viral Studio', descRu: 'Покупка 50 кредитов для монтажа и ИИ-генерации в Viral Studio' },
  { credits: 200, stars: 600, titleEn: 'Refill: 200 Credits', titleRu: 'Пополнение: 200 Кредитов', descEn: 'Purchase 200 credits for editing and AI generation in Viral Studio', descRu: 'Покупка 200 кредитов для монтажа и ИИ-генерации в Viral Studio' },
  { credits: 505, stars: 1450, titleEn: 'Refill: 500 Credits', titleRu: 'Пополнение: 500 Кредитов', descEn: 'Purchase 500 credits for editing and AI generation in Viral Studio', descRu: 'Покупка 500 кредитов для монтажа и ИИ-генерации в Viral Studio' },
];

const PLANS = {
  starter: { credits: 400, stars: 1000, titleEn: 'Starter Subscription', titleRu: 'Подписка Starter', descEn: 'Activate Starter Plan (includes 400 monthly credits)', descRu: 'Активация тарифа Starter (400 кредитов в месяц)' },
  pro: { credits: 1000, stars: 2000, titleEn: 'Pro Subscription', titleRu: 'Подписка Pro', descEn: 'Activate Pro Plan (includes 1000 monthly credits)', descRu: 'Активация тарифа Pro (1000 кредитов в месяц)' },
  scale: { credits: 3000, stars: 4000, titleEn: 'Scale Subscription', titleRu: 'Подписка Scale', descEn: 'Activate Scale Plan (includes 3000 monthly credits)', descRu: 'Активация тарифа Scale (3000 кредитов в месяц)' },
};

export async function POST(req: Request) {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'Telegram bot token is not configured on the server' }, { status: 500 });
  }

  try {
    const user = await getAuthenticatedUser();
    const userId = user.id;

    const { type, id, locale } = await req.json();
    const isRu = locale === 'ru';

    let title = '';
    let description = '';
    let credits = 0;
    let starsCount = 0;
    let itemId = String(id);

    if (type === 'topup') {
      const idx = parseInt(itemId, 10);
      const pkg = TOP_UP_OPTIONS[idx];
      if (!pkg) {
        return NextResponse.json({ error: 'Invalid top-up package index' }, { status: 400 });
      }
      title = isRu ? pkg.titleRu : pkg.titleEn;
      description = isRu ? pkg.descRu : pkg.descEn;
      credits = pkg.credits;
      starsCount = pkg.stars;
    } else if (type === 'plan') {
      const plan = PLANS[itemId as keyof typeof PLANS];
      if (!plan) {
        return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
      }
      title = isRu ? plan.titleRu : plan.titleEn;
      description = isRu ? plan.descRu : plan.descEn;
      credits = plan.credits;
      starsCount = plan.stars;
    } else {
      return NextResponse.json({ error: 'Invalid checkout type' }, { status: 400 });
    }

    // Format: userId:creditsAmount:packageOrPlanId:checkoutType
    // Must be under 128 bytes (UUID + credits + id + type is ~65 chars)
    const payload = `${userId}:${credits}:${itemId}:${type}`;

    console.log(`[Telegram Stars] Generating invoice link for User: ${userId}, Amount: ${starsCount} XTR, Payload: ${payload}`);

    const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        payload,
        provider_token: '', // Must be empty string for Telegram Stars (XTR)
        currency: 'XTR',
        prices: [
          {
            label: isRu ? 'Звезды Telegram' : 'Telegram Stars',
            amount: starsCount,
          },
        ],
      }),
    });

    const data = await tgResponse.json();

    if (!data.ok) {
      console.error('[Telegram Stars] Invoice link creation failed:', data);
      return NextResponse.json({ error: data.description || 'Failed to generate invoice link' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      invoiceLink: data.result,
    });

  } catch (error: any) {
    console.error('[Telegram Stars] Invoice generation exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
