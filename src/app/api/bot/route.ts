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

    // 0. Handle chat_member (channel membership updates for VIP channel tracking)
    if (body.chat_member) {
      const update = body.chat_member;
      const chat = update.chat;
      const user = update.new_chat_member.user;
      const newStatus = update.new_chat_member.status;
      const oldStatus = update.old_chat_member.status;

      console.log(`[Telegram Bot Webhook] Member update in Chat ${chat.id}: User ${user.id} status changed from ${oldStatus} to ${newStatus}`);

      // Check if this chat is one of our VIP channels
      const starterChanId = process.env.TELEGRAM_STARTER_CHANNEL_ID;
      const proChanId = process.env.TELEGRAM_PRO_CHANNEL_ID;
      const scaleChanId = process.env.TELEGRAM_SCALE_CHANNEL_ID;
      
      const chatIdStr = String(chat.id);
      
      // Determine if a single shared channel is used for all tiers
      const isSharedChannel = !!starterChanId && 
        (!proChanId || starterChanId === proChanId) && 
        (!scaleChanId || starterChanId === scaleChanId);
      
      let eventTier: 'starter' | 'pro' | 'scale' | null = null;
      
      if (starterChanId && chatIdStr === starterChanId) {
        eventTier = 'starter';
      } else if (proChanId && chatIdStr === proChanId) {
        eventTier = 'pro';
      } else if (scaleChanId && chatIdStr === scaleChanId) {
        eventTier = 'scale';
      }

      if (eventTier) {
        const isLeft = newStatus === 'left' || newStatus === 'kicked';
        
        if (isLeft) {
          const { supabaseAdmin } = await import('@/lib/supabase');
          
          // Find profile by telegram_id
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('telegram_id', user.id)
            .single();
            
          // For shared channel, suspend subscription regardless of active tier. Otherwise match eventTier.
          const tierMatches = isSharedChannel
            ? (profile && (profile.tier === 'starter' || profile.tier === 'pro' || profile.tier === 'scale'))
            : (profile && profile.tier === eventTier);
            
          if (profile && tierMatches && profile.subscription_status === 'active') {
            const userTier = profile.tier || 'starter';
            
            // Update subscription_status to expired
            await supabaseAdmin
              .from('profiles')
              .update({ subscription_status: 'expired' })
              .eq('id', profile.id);
              
            console.log(`[Telegram Bot Webhook] Subscription suspended for User ${profile.id} (left channel ${userTier})`);
            
            // Send warning direct message from bot to user
            const locale = profile.preferred_language === 'ru' ? 'ru' : 'en';
            
            const subUrl = userTier === 'starter' 
              ? process.env.NEXT_PUBLIC_TRIBUTE_SUB_URL_STARTER 
              : userTier === 'pro'
                ? process.env.NEXT_PUBLIC_TRIBUTE_SUB_URL_PRO
                : process.env.NEXT_PUBLIC_TRIBUTE_SUB_URL_SCALE;
                
            const warningText = locale === 'ru'
              ? `⚠️ *Ваша подписка на канал была отменена или завершена!*\n\nДоступ к функциям тарифа *${userTier.toUpperCase()}* в Студии приостановлен.\n\nДля возобновления доступа продлите подписку в Tribute.`
              : `⚠️ *Your channel subscription has expired or was cancelled!*\n\nAccess to the *${userTier.toUpperCase()}* features in the Studio has been suspended.\n\nTo restore access, please renew your subscription in Tribute.`;
              
            try {
              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: user.id,
                  text: warningText,
                  parse_mode: 'Markdown',
                  reply_markup: subUrl ? {
                    inline_keyboard: [
                      [
                        {
                          text: locale === 'ru' ? '💳 Продлить подписку' : '💳 Renew Subscription',
                          url: subUrl
                        }
                      ]
                    ]
                  } : undefined
                }),
              });
            } catch (tgErr) {
              console.error('[Telegram Bot Webhook] Failed to send cancellation warning DM:', tgErr);
            }
          }
        } else if (newStatus === 'member' || newStatus === 'administrator' || newStatus === 'creator') {
          // Auto-activate subscription on channel join fallback
          const { supabaseAdmin } = await import('@/lib/supabase');
          
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('telegram_id', user.id)
            .single();
            
          if (profile) {
            // For shared channel, activate keeping their existing tier. Otherwise use eventTier.
            const targetTier = isSharedChannel ? (profile.tier || 'starter') : eventTier;
            
            if (profile.subscription_status !== 'active' || profile.tier !== targetTier) {
              await supabaseAdmin
                .from('profiles')
                .update({ 
                  tier: targetTier,
                  subscription_status: 'active' 
                })
                .eq('id', profile.id);
                
              console.log(`[Telegram Bot Webhook] Subscription auto-activated/updated for User ${profile.id} (joined channel ${targetTier})`);
              
              const locale = profile.preferred_language === 'ru' ? 'ru' : 'en';
              const welcomeText = locale === 'ru'
                ? `🎉 *Доступ активирован!*\n\nВы вступили в канал подписки. Ваш тариф *${targetTier.toUpperCase()}* успешно активирован в Студии!`
                : `🎉 *Access Activated!*\n\nYou have joined the subscription channel. Your *${targetTier.toUpperCase()}* plan is now active in the Studio!`;
                
              try {
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: user.id,
                    text: welcomeText,
                    parse_mode: 'Markdown',
                  }),
                });
              } catch (tgErr) {
                console.error('[Telegram Bot Webhook] Failed to send welcome channel join message:', tgErr);
              }
            }
          }
        }
      }
      return NextResponse.json({ ok: true });
    }

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

    // 1.1. Handle callback_query (Inline Buttons)
    if (body.callback_query) {
      const cb = body.callback_query;
      const fromId = String(cb.from.id);
      const data = cb.data;
      const callbackQueryId = cb.id;

      // Answer callback query right away
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId }),
      });

      // Handle language selection callbacks
      if (data === 'set_lang_ru' || data === 'set_lang_en') {
        const targetLang = data === 'set_lang_ru' ? 'ru' : 'en';
        const { supabaseAdmin } = await import('@/lib/supabase');
        
        await supabaseAdmin
          .from('profiles')
          .update({ preferred_language: targetLang })
          .eq('telegram_id', fromId);

        const langMsg = targetLang === 'ru'
          ? `🇷🇺 *Язык успешно изменен на Русский!*\n\nТеперь все уведомления, сценарии и дайджесты будут приходить на русском языке.`
          : `🇬🇧 *Language successfully set to English!*\n\nAll notifications, scripts, and digests will now be sent in English.`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cb.message.chat.id,
            text: langMsg,
            parse_mode: 'Markdown'
          })
        });
        return NextResponse.json({ ok: true });
      }

      const ADMIN_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';
      if (fromId === String(ADMIN_ID) && data.startsWith('admin_')) {
        const { getAdminOverviewStats, getAdminUsersList, getAdminPaymentsLog } = await import('@/lib/admin');
        const { monitoringService } = await import('@/lib/services/monitoringService');

        let text = '';
        const inlineKeyboard = [
          [
            { text: '📊 Статистика', callback_data: 'admin_stats' },
            { text: '👥 Юзеры', callback_data: 'admin_users' }
          ],
          [
            { text: '💳 Оплаты', callback_data: 'admin_payments' },
            { text: '🛠 API Балансы', callback_data: 'admin_balances' }
          ],
          [
            { text: '🌐 Открыть Веб-Панель', url: 'https://www.virale.uno/ru/app/admin' }
          ]
        ];

        if (data === 'admin_menu') {
          text = `👑 *Панель Суперадминистратора*\n\nВыберите нужный раздел или перейдите в полную веб-версию:`;
        } else if (data === 'admin_stats') {
          const stats = await getAdminOverviewStats();
          text = `📊 *Статистика Платформы*\n\n` +
            `• Всего пользователей: *${stats.totalUsers}*\n` +
            `• Новых сегодня: *+${stats.newUsersToday}*\n` +
            `• Новых за неделю: *+${stats.newUsersThisWeek}*\n` +
            `• Активных подписок: *${stats.activeSubscriptions}*\n\n` +
            `*Разбивка по тарифам:*\n` +
            `└ Free: ${stats.tierCounts.free} | Creator: ${stats.tierCounts.creator} | Pro: ${stats.tierCounts.pro} | Scale: ${stats.tierCounts.scale}\n\n` +
            `• Кредитов в обороте: *${stats.totalCreditsInCirculation.toLocaleString()} CR*\n` +
            `• Рендеров выполнено: *${stats.totalRenders}* из *${stats.totalProjects}* проектов`;
        } else if (data === 'admin_users') {
          const res = await getAdminUsersList({ limit: 5 });
          const userLines = res.users.map((u, i) =>
            `${i + 1}. *${u.full_name || 'Творец'}* (\`${u.email}\`)\n` +
            `   └ Тариф: *${(u.tier || 'free').toUpperCase()}* | Баланс: *${u.credits_balance} CR* | Рег: ${new Date(u.created_at).toLocaleDateString()}`
          ).join('\n\n');
          text = `👥 *Последние зарегистрированные юзеры* (всего ${res.total}):\n\n${userLines}`;
        } else if (data === 'admin_payments') {
          const payments = await getAdminPaymentsLog(5);
          const payLines = payments.map((p: any, i: number) =>
            `${i + 1}. *${p.profiles?.full_name || p.profiles?.email || 'Пользователь'}*\n` +
            `   └ +*${p.amount} CR* (${p.transaction_type}) | ${new Date(p.created_at).toLocaleString()}`
          ).join('\n\n');
          text = `💳 *Последние пополнения и оплаты*:\n\n${payLines || 'Записей нет'}`;
        } else if (data === 'admin_balances') {
          const report = await monitoringService.getFullSystemReport();
          const statusEmoji = (s: string) => s === 'critical' ? '🔴' : s === 'warning' ? '🟡' : '🟢';
          const reportText = report.map(r =>
            `${statusEmoji(r.status)} *${r.provider}*\n` +
            `Remaining: ${typeof r.remaining === 'number' ? r.remaining.toLocaleString() : r.remaining} ${r.unit}`
          ).join('\n\n');
          text = `🛠 *Состояние API ресурсов:*\n\n${reportText}`;
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cb.message.chat.id,
            text,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inlineKeyboard }
          })
        });
      }

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
                  subscription_status: 'active',
                  subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
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

            // Send admin notification about successful payment
            try {
              const { data: updatedProf } = await supabaseAdmin
                .from('profiles')
                .select('email, full_name, credits_balance')
                .eq('id', userId)
                .single();

              const { notifyPaymentSuccess } = await import('@/lib/telegram');
              await notifyPaymentSuccess({
                userId,
                userEmail: updatedProf?.email,
                fullName: updatedProf?.full_name,
                credits,
                totalBalance: updatedProf?.credits_balance,
                planOrPackage: type === 'plan' ? `Тариф ${itemId.toUpperCase()}` : `Пакет ${credits} CR`
              });
            } catch (notifyErr) {
              console.error('[Telegram Webhook] Failed to notify admin of successful payment:', notifyErr);
            }

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
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.virale.uno';
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
      } else if (payload && payload.startsWith('link_')) {
        const targetUserId = payload.replace('link_', '');
        const { supabaseAdmin } = await import('@/lib/supabase');
        const { addCredits } = await import('@/lib/credits');

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, telegram_id, credits_balance')
          .eq('id', targetUserId)
          .single();

        if (profile) {
          const alreadyLinked = Boolean(profile.telegram_id);
          await supabaseAdmin
            .from('profiles')
            .update({
              telegram_id: user.id,
              username: user.username || null
            })
            .eq('id', targetUserId);

          let bonusText = '';
          const locale = user.language_code === 'ru' ? 'ru' : 'en';
          if (!alreadyLinked) {
            await addCredits(supabaseAdmin, targetUserId, 50, 'telegram_connect_bonus');
            bonusText = locale === 'ru' 
              ? `\n\n🎁 *Вам зачислено +50 CR бонуса!* Наслаждайтесь созданием вирального контента.`
              : `\n\n🎁 *+50 CR Bonus credited to your account!* Enjoy creating viral content.`;
          }

          const linkSuccessMsg = locale === 'ru'
            ? `🎉 *Аккаунт успешно подключен к Telegram!*${bonusText}\n\nТеперь вы будете получать автоматические трендовые сценарии и уведомления прямо сюда.`
            : `🎉 *Account successfully linked to Telegram!*${bonusText}\n\nYou will now receive automated trend digests and notifications here.`;

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: linkSuccessMsg,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: locale === 'ru' ? '🚀 Открыть Студию' : '🚀 Open Studio',
                      url: 'https://www.virale.uno/app/ideas'
                    }
                  ]
                ]
              }
            })
          });
        }
      } else if (payload && payload.startsWith('payout_')) {
        const payoutId = payload.replace('payout_', '');
        const { supabaseAdmin } = await import('@/lib/supabase');

        const { data: payoutReq } = await supabaseAdmin
          .from('payout_requests')
          .select('*, user:profiles(id, full_name, email, tier, partner_balance_usd, telegram_id)')
          .eq('id', payoutId)
          .single();

        const targetUserId = payoutReq?.user_id || payoutReq?.user?.id;
        if (targetUserId) {
          await supabaseAdmin
            .from('profiles')
            .update({
              telegram_id: user.id,
              username: user.username || null
            })
            .eq('id', targetUserId);
        }

        const locale = user.language_code === 'ru' ? 'ru' : 'en';
        const amountUsd = payoutReq ? Number(payoutReq.amount_usd).toFixed(2) : '100.00';

        const payoutAckText = locale === 'ru'
          ? `💳 *Ваша заявка на вывод средств ($${amountUsd} USD) принята!*\n\nГлавный администратор проверяет реквизиты. Вы можете писать любые уточнения прямым сообщением в этот бот — они моментально доставляются админу.`
          : `💳 *Your payout request ($${amountUsd} USD) has been received!*\n\nThe SuperAdmin is verifying your details. You can reply directly in this chat to reach the admin.`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: payoutAckText,
            parse_mode: 'Markdown',
          }),
        });

        // Send alert to Superadmin
        const ADMIN_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';
        const userNameStr = `${user.first_name || ''} ${user.last_name || ''}`.trim() || payoutReq?.user?.full_name || 'Творец';
        const userUsername = user.username ? `@${user.username}` : 'без_юзернейма';

        const adminAlertText = 
          `💸 <b>НОВАЯ ЗАЯВКА НА ВЫВОД ПАРТНЁРСКИХ СРЕДСТВ</b>\n\n` +
          `<b>👤 Пользователь:</b> ${userNameStr} (${userUsername})\n` +
          `<b>📧 Email:</b> <code>${payoutReq?.user?.email || 'N/A'}</code>\n` +
          `<b>🆔 User ID:</b> <code>${targetUserId || 'N/A'}</code>\n` +
          `<b>💰 Сумма к выводу:</b> <b>$${amountUsd} USD</b>\n` +
          `<b>👑 Тариф:</b> <b>${(payoutReq?.user?.tier || 'free').toUpperCase()}</b>\n` +
          `<b>💳 Метод:</b> <code>${payoutReq?.payout_method || 'USDT TRC-20 / Card'}</code>\n` +
          `<b>📌 Реквизиты:</b> <code>${payoutReq?.payout_details || 'Не указаны (запросить в чате)'}</code>\n\n` +
          `👇 <i>Ответьте на это сообщение или перейдите в диалог с пользователем:</i>`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_ID,
            text: adminAlertText,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '💬 Ответить пользователю',
                    url: `tg://user?id=${user.id}`
                  }
                ]
              ]
            }
          })
        });
      } else {
        // Regular welcome with language buttons
        const locale = user.language_code === 'ru' ? 'ru' : 'en';
        const welcomeMsg = locale === 'ru'
          ? `Привет! Я официальный бот *Viral Studio* 🤖\n\nЯ помогаю генерировать сценарии, отслеживать тренды и доставлять контент прямо в Telegram!\n\nИспользуйте меню или выберите ваш язык ниже:`
          : `Hello! I'm the official *Viral Studio Bot* 🤖\n\nI help you generate viral scripts, track trends, and deliver content directly to Telegram!\n\nUse the menu or choose your language below:`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeMsg,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🇷🇺 Русский', callback_data: 'set_lang_ru' },
                  { text: '🇬🇧 English', callback_data: 'set_lang_en' }
                ],
                [
                  { text: '🌐 Открыть Студию', url: 'https://www.virale.uno/app/ideas' }
                ]
              ]
            }
          })
        });
      }
    } else if (text.startsWith('/language') || text.startsWith('/lang')) {
      const locale = user.language_code === 'ru' ? 'ru' : 'en';
      const promptText = locale === 'ru'
        ? `🌐 *Выберите язык интерфейса и уведомлений:*`
        : `🌐 *Select interface and notification language:*`;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: promptText,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🇷🇺 Русский', callback_data: 'set_lang_ru' },
                { text: '🇬🇧 English', callback_data: 'set_lang_en' }
              ]
            ]
          }
        })
      });
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
    } else if (text.startsWith('/admin')) {
      const ADMIN_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';
      if (String(user.id) !== String(ADMIN_ID)) {
        return NextResponse.json({ ok: true });
      }

      const inlineKeyboard = [
        [
          { text: '📊 Статистика', callback_data: 'admin_stats' },
          { text: '👥 Юзеры', callback_data: 'admin_users' }
        ],
        [
          { text: '💳 Оплаты', callback_data: 'admin_payments' },
          { text: '🛠 API Балансы', callback_data: 'admin_balances' }
        ],
        [
          { text: '🌐 Открыть Веб-Панель', url: 'https://www.virale.uno/ru/app/admin' }
        ]
      ];

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `👑 *Панель Суперадминистратора*\n\nДобро пожаловать, Главный Администратор! Выберите действие ниже или перейдите в веб-версию:`,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        })
      });
    } else if (text.startsWith('/grant')) {
      const ADMIN_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';
      if (String(user.id) !== String(ADMIN_ID)) {
        return NextResponse.json({ ok: true });
      }

      // Format: /grant <email_or_user_id> <amount>
      const parts = text.split(' ').filter(Boolean);
      if (parts.length < 3) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `⚠️ *Формат команды:* \`/grant <email_или_uuid> <количество>\`\n\nПример: \`/grant user@example.com 500\``,
            parse_mode: 'Markdown'
          })
        });
        return NextResponse.json({ ok: true });
      }

      const target = parts[1];
      const amount = parseInt(parts[2], 10);

      if (isNaN(amount) || amount === 0) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `⚠️ *Укажите корректное число кредитов.*`,
            parse_mode: 'Markdown'
          })
        });
        return NextResponse.json({ ok: true });
      }

      try {
        const { supabaseAdmin } = await import('@/lib/supabase');
        const { adminGrantCredits } = await import('@/lib/admin');

        // Find user by email or ID
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, email, full_name, credits_balance')
          .or(`email.eq.${target},id.eq.${target}`)
          .maybeSingle();

        if (!profile) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `❌ *Пользователь "${target}" не найден в базе данных.*`,
              parse_mode: 'Markdown'
            })
          });
          return NextResponse.json({ ok: true });
        }

        await adminGrantCredits(profile.id, amount, 'tg_bot_admin_grant');
        const newBal = (profile.credits_balance || 0) + amount;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `✅ *Кредиты успешно начислены!*\n\n• Пользователь: *${profile.full_name || 'Творец'}* (\`${profile.email}\`)\n• Сумма: *+${amount} CR*\n• Новый баланс: *${newBal} CR*`,
            parse_mode: 'Markdown'
          })
        });
      } catch (err: any) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `💥 *Ошибка исполнения:* ${err.message || err}`,
            parse_mode: 'Markdown'
          })
        });
      }
    } else if (text.startsWith('/support') || (text.startsWith('/start') && text.includes('support'))) {
      const locale = user.language_code === 'ru' ? 'ru' : 'en';
      const supportPrompt = locale === 'ru'
        ? `💬 *Служба Поддержки Viral Studio*\n\nНапишите ваш вопрос, сообщение или отзыв прямо в этот чат!\nОно будет немедленно доставлено суперадминистратору.`
        : `💬 *Viral Studio Support*\n\nSend your question or feedback directly in this chat!\nIt will be delivered immediately to the SuperAdmin.`;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: supportPrompt,
          parse_mode: 'Markdown'
        })
      });
    } else if (text.startsWith('/help')) {
      const locale = user.language_code === 'ru' ? 'ru' : 'en';
      const helpText = locale === 'ru'
        ? `🤖 *Помощник Viral Studio*\n\n` +
          `• /start — Войти в личный кабинет\n` +
          `• /support — Написать в поддержку суперадмину\n` +
          `• /admin — Панель администратора\n` +
          `• /grant <email> <amount> — Начислить кредиты\n` +
          `• /balance — Проверить ресурсы (только для админов)\n` +
          `• Отправляйте любые вопросы и сообщения боту — они передаются админу.`
        : `🤖 *Viral Studio Assistant*\n\n` +
          `• /start — Sign in to your dashboard\n` +
          `• /support — Contact support / admin\n` +
          `• /admin — SuperAdmin Control Menu\n` +
          `• /grant <email> <amount> — Grant user credits\n` +
          `• /balance — Check API limits (Admin only)\n` +
          `• Send any text message to reach support directly.`;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: helpText,
          parse_mode: 'Markdown'
        })
      });
    } else if (!text.startsWith('/')) {
      // Regular user text message -> Forward to SuperAdmin if sender is not the SuperAdmin
      const ADMIN_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';
      
      if (String(user.id) !== String(ADMIN_ID)) {
        const userNameStr = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Пользователь';
        const userUsername = user.username ? `@${user.username}` : 'без_юзернейма';

        const forwardHeader = `🆘 <b>ОБРАЩЕНИЕ В ПОДДЕРЖКУ</b>\n\n` +
          `<b>👤 От:</b> ${userNameStr} (${userUsername})\n` +
          `<b>🆔 Telegram ID:</b> <code>${user.id}</code>\n\n` +
          `💬 <b>Сообщение:</b>\n` +
          `${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}`;

        // Forward to SuperAdmin
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_ID,
            text: forwardHeader,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '✉️ Ответить в Telegram',
                    url: `tg://user?id=${user.id}`
                  }
                ]
              ]
            }
          })
        });

        // Reply confirmation to the user
        const locale = user.language_code === 'ru' ? 'ru' : 'en';
        const ackText = locale === 'ru'
          ? `✅ *Ваше сообщение доставлено суперадминистратору!*\n\nМы свяжемся с вами в ближайшее время.`
          : `✅ *Your message has been delivered to the SuperAdmin!*\n\nWe will get back to you shortly.`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: ackText,
            parse_mode: 'Markdown'
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
