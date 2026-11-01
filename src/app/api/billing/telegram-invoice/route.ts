import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { notifyPaymentAttempt } from '@/lib/telegram';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Local pricing/package configuration mapped to Telegram Stars (XTR)
const TOP_UP_OPTIONS = [
  { credits: 250, stars: 200, titleEn: 'Refill: 250 Credits (5 Videos)', titleRu: 'Пополнение: 250 Кредитов (5 Видео)', descEn: 'Purchase 250 credits (= 5 full videos with subtitles & B-Roll)', descRu: 'Покупка 250 кредитов (= 5 готовых видео со сценарием, субтитрами и B-Roll)' },
  { credits: 750, stars: 500, titleEn: 'Refill: 750 Credits (15 Videos)', titleRu: 'Пополнение: 750 Кредитов (15 Видео)', descEn: 'Purchase 750 credits (= 15 full videos with subtitles & B-Roll)', descRu: 'Покупка 750 кредитов (= 15 готовых видео со сценарием, субтитрами и B-Roll)' },
  { credits: 2000, stars: 1200, titleEn: 'Refill: 2000 Credits (40 Videos)', titleRu: 'Пополнение: 2000 Кредитов (40 Видео)', descEn: 'Purchase 2000 credits (= 40 full videos with subtitles & B-Roll)', descRu: 'Покупка 2000 кредитов (= 40 готовых видео со сценарием, субтитрами и B-Roll)' },
];

const PLANS = {
  starter: { credits: 1000, stars: 500, titleEn: 'Starter Subscription (20 Videos)', titleRu: 'Подписка Starter (20 Видео)', descEn: 'Activate Starter Plan (1,000 monthly credits = 20 full videos)', descRu: 'Активация тарифа Starter (1 000 кредитов в месяц = 20 готовых видео)' },
  pro: { credits: 2500, stars: 1000, titleEn: 'Pro Subscription (50 Videos)', titleRu: 'Подписка Pro (50 Видео)', descEn: 'Activate Pro Plan (2,500 monthly credits = 50 full videos)', descRu: 'Активация тарифа Pro (2 500 кредитов в месяц = 50 готовых видео)' },
  scale: { credits: 6000, stars: 2000, titleEn: 'Scale + AI Lab Subscription (120 Videos)', titleRu: 'Подписка Scale + AI Lab (120 Видео)', descEn: 'Activate Scale + AI Lab Plan (6,000 monthly credits = 120 full videos + Beta Lab)', descRu: 'Активация тарифа Scale + AI Lab (6 000 кредитов = 120 видео + доступ в AI Lab)' },
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
    } else if (type === 'plans' || type === 'plan') {
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

    notifyPaymentAttempt({
      userId,
      userEmail: user.email,
      fullName: user.user_metadata?.full_name,
      title,
      credits,
      starsCount,
      type
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      invoiceLink: data.result,
    });

  } catch (error: any) {
    console.error('[Telegram Stars] Invoice generation exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
