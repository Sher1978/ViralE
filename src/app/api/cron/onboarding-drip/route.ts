import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase'; // need admin client to bypass RLS

export async function GET(req: NextRequest) {
  // Verify Vercel Cron header
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'No Telegram token' }, { status: 500 });
  }

  try {
    // 1. Fetch free tier profiles with linked telegram accounts
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, telegram_id, created_at, synthetic_training_data, preferred_language, full_name, tier')
      .not('telegram_id', 'is', null)
      .eq('tier', 'free'); // Only push drips to Free users to convert them

    if (error) {
      throw error;
    }

    let sentCount = 0;
    const now = Date.now();

    for (const profile of profiles) {
      if (!profile.telegram_id) continue;

      const createdDate = new Date(profile.created_at).getTime();
      const daysSince = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
      
      const syncData = (profile.synthetic_training_data as Record<string, any>) || {};
      const lastDripDay = syncData.drip_sent_day || 0;

      let messageToSend = null;
      let currentDripDay = lastDripDay;
      const isRu = profile.preferred_language === 'ru';
      const name = profile.full_name?.split(' ')[0] || (isRu ? 'Творец' : 'Creator');

      // Day 1: Teleprompter & DNA
      if (daysSince >= 1 && lastDripDay < 1) {
        currentDripDay = 1;
        messageToSend = isRu 
          ? `Привет, ${name}! 👋\n\nЗнаешь, в чем главная ценность Viral Studio? Мы даем бесконечные идеи для контента на основе твоего опыта.\n\nПросто ответь на 7 вопросов (Digital DNA), и ИИ сгенерирует тебе сценарии, которые залетят в реки!\n\n🎥 *Телесуфлер — Абсолютно Бесплатно!*\nСнимай видео прямо в приложении. Суфлер и скачивание сырого видео всегда бесплатны. Токены списываются только за ИИ-Монтаж.\n\nПопробуй прямо сейчас!`
          : `Hi ${name}! 👋\n\nDo you know the core value of Viral Studio? We provide endless content ideas based on your expertise.\n\nAnswer 7 questions (Digital DNA), and AI will generate viral scripts for you!\n\n🎥 *Teleprompter is Absolutely FREE!*\nShoot your videos directly in the app. The prompter and raw video downloads are always free. Tokens are only charged for AI Editing.\n\nTry it now!`;
      } 
      // Day 2: 5-minute Edit, Avatars, Face Swap
      else if (daysSince >= 2 && lastDripDay < 2) {
        currentDripDay = 2;
        messageToSend = isRu
          ? `🎬 Готов создать шедевр за 5 минут, ${name}?\n\nВ Viral Studio ты можешь снять, смонтировать и залить Reels/Shorts на все платформы всего за пару кликов.\n\n✨ *А еще у нас есть магия:*\n• Генерация собственных цифровых Аватаров\n• Face Swap (замена лиц)\n• Создание Instagram Галерей (каруселей) прямо из текста!\n\nЗаходи и протестируй ИИ-монтаж (на это уйдет всего 2 токена)!`
          : `🎬 Ready to create a masterpiece in 5 mins, ${name}?\n\nIn Viral Studio, you can shoot, edit, and post Reels/Shorts to all platforms in just a few clicks.\n\n✨ *We also have magic:*\n• Generate your own digital Avatars\n• Face Swap\n• Create Instagram Galleries (carousels) directly from text!\n\nCome in and test the AI editing (it only costs 2 tokens)!`;
      }
      // Day 3: Scale Value & Upgrade
      else if (daysSince >= 3 && lastDripDay < 3) {
        currentDripDay = 3;
        messageToSend = isRu
          ? `🚀 Твои бесплатные лимиты тают, ${name}...\n\nЕсли ты хочешь сэкономить часы рутины, переходи на тариф *SCALE*.\n\n*Что дает SCALE?*\n🤖 Авто-постинг во все соцсети (YouTube, Reels, TikTok, Telegram) одновременно!\n♾️ Бесконечная генерация идей и монтаж без ограничений.\n\nПополни баланс прямо здесь, в Telegram (за Stars ⭐) или выбери пакет в приложении. Начинай расти!`
          : `🚀 Your free limits are melting, ${name}...\n\nIf you want to save hours of routine, upgrade to the *SCALE* plan.\n\n*What does SCALE give you?*\n🤖 Auto-posting to all socials (YouTube, Reels, TikTok, Telegram) simultaneously!\n♾️ Endless ideas generation and unlimited editing.\n\nTop up your balance right here in Telegram (with Stars ⭐) or choose a plan in the app. Start growing!`;
      }

      if (messageToSend && currentDripDay > lastDripDay) {
        // Send message
        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: profile.telegram_id,
              text: messageToSend,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: isRu ? '🚀 Открыть Студию' : '🚀 Open Studio',
                      url: 'https://www.virale.uno/app/ideas'
                    }
                  ]
                ]
              }
            })
          });

          // Update DB
          syncData.drip_sent_day = currentDripDay;
          await supabaseAdmin
            .from('profiles')
            .update({ synthetic_training_data: syncData })
            .eq('id', profile.id);
            
          sentCount++;
          // Wait a bit to avoid hitting Telegram rate limits (30 messages per second)
          await new Promise(r => setTimeout(r, 50));
        } catch (sendErr) {
          console.error(`[Drip Campaign] Failed to send day ${currentDripDay} to user ${profile.id}:`, sendErr);
        }
      }
    }

    return NextResponse.json({ ok: true, sentCount });
  } catch (error: any) {
    console.error('[Drip Campaign] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
