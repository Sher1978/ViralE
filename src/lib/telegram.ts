/**
 * Telegram Bot API Utility
 * Used for sending production results and notifications to users.
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

export const telegramService = {
  /**
   * Sends a simple text message
   */
  async sendMessage(chatId: string | number, text: string): Promise<TelegramResponse> {
    if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

    const response = await fetch(`${API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    });

    return await response.json();
  },

  /**
   * Sends a video file via URL
   */
  async sendVideo(chatId: string | number, videoUrl: string, caption?: string): Promise<TelegramResponse> {
    if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

    const response = await fetch(`${API_URL}/sendVideo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        video: videoUrl,
        caption: caption,
        supports_streaming: true,
      }),
    });

    return await response.json();
  },

  /**
   * Sends a document (e.g., manifest or log file)
   */
  async sendDocument(chatId: string | number, documentUrl: string, caption?: string): Promise<TelegramResponse> {
    if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

    const response = await fetch(`${API_URL}/sendDocument`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        document: documentUrl,
        caption: caption,
      }),
    });

    return await response.json();
  }
};

const recentErrorSignatures = new Map<string, number>();

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function resolveUserEmail(userId?: string, userEmail?: string): Promise<string | undefined> {
  if (userEmail) return userEmail;
  if (!userId) return undefined;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && serviceKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle();
      if (profile?.email) {
        return profile.email;
      }
    }
  } catch (e) {
    // Ignore resolution errors
  }
  return undefined;
}

export async function notifyAdminError(details: {
  source: string;
  error: string | Error;
  userId?: string;
  userEmail?: string;
  url?: string;
  extra?: Record<string, any>;
}): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';
  if (!token || !adminChatId) return false;

  const errorMessage = typeof details.error === 'string' 
    ? details.error 
    : details.error?.message || String(details.error);

  const isNetworkDrop = 
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('Load failed') ||
    errorMessage.includes('Failed to fetch dynamically imported module') ||
    errorMessage.includes('ChunkLoadError') ||
    errorMessage.includes('Failed to load chunk') ||
    errorMessage.includes('Loading chunk') ||
    errorMessage.includes('The user aborted a request') ||
    errorMessage.includes('AbortError');

  if (isNetworkDrop) {
    return false;
  }

  const isLimitEvent = 
    errorMessage.includes('INSUFFICIENT_CREDITS') ||
    errorMessage.includes('TRIAL_EXPIRED') ||
    errorMessage.includes('LIMIT_EXCEEDED') ||
    errorMessage.includes('BALANCE_TOO_LOW') ||
    errorMessage.includes('Free trial limit');

  const stack = typeof details.error === 'object' && details.error?.stack 
    ? details.error.stack.split('\n').slice(0, 6).join('\n') 
    : (details.extra?.stack || '');

  const resolvedEmail = await resolveUserEmail(details.userId, details.userEmail);
  const displayEmail = resolvedEmail || 'Не указан / Unauthenticated';

  // Extract explicit diagnostic fields from extra context if available
  const extra = details.extra || {};
  const location = extra.location || extra.functionName || '';
  const engine = extra.engine || extra.model || '';
  const category = extra.category || extra.mode || '';
  const locale = extra.locale || '';
  const rawPreview = extra.rawOutputPreview || extra.rawTextSnippet || '';

  // Deduplicate identical error notifications within 60s
  const signature = `${details.source}:${location}:${errorMessage}:${details.url || ''}:${resolvedEmail || ''}`;
  const now = Date.now();
  const lastSent = recentErrorSignatures.get(signature);
  if (lastSent && now - lastSent < 60000) {
    return false;
  }
  recentErrorSignatures.set(signature, now);

  if (recentErrorSignatures.size > 100) {
    for (const [key, timestamp] of recentErrorSignatures.entries()) {
      if (now - timestamp > 60000) recentErrorSignatures.delete(key);
    }
  }

  let text = '';

  if (isLimitEvent) {
    text = `💳 <b>ДОСТИГНУТ ЛИМИТ ТАРИФА / ПЭЙВОЛЛ</b> 💳\n\n` +
      `<b>📍 Сценарий:</b> <code>${escapeHtml(details.source)}</code>\n` +
      (location ? `<b>🎯 Вызов/Локация:</b> <code>${escapeHtml(location)}</code>\n` : '') +
      `<b>📧 Email:</b> <code>${escapeHtml(displayEmail)}</code>\n` +
      (details.url ? `<b>🌐 URL:</b> <code>${escapeHtml(details.url)}</code>\n` : '') +
      (details.userId ? `<b>👤 User ID:</b> <code>${escapeHtml(details.userId)}</code>\n` : '') +
      `<b>🔒 Лимит/Событие:</b> <code>${escapeHtml(errorMessage.slice(0, 400))}</code>\n` +
      `<b>⏰ Время:</b> ${new Date().toISOString()}`;
  } else {
    text = `🚨 <b>VIRAL ENGINE USER ERROR ALERT</b> 🚨\n\n` +
      `<b>📍 Source:</b> <code>${escapeHtml(details.source)}</code>\n` +
      (location ? `<b>🎯 Location:</b> <code>${escapeHtml(location)}</code>\n` : '') +
      (engine ? `<b>🤖 Engine/Model:</b> <code>${escapeHtml(engine)}</code>\n` : '') +
      (category ? `<b>🏷️ Category/Mode:</b> <code>${escapeHtml(category)}</code>\n` : '') +
      (locale ? `<b>🌐 Locale:</b> <code>${escapeHtml(locale)}</code>\n` : '') +
      `<b>📧 Email:</b> <code>${escapeHtml(displayEmail)}</code>\n` +
      (details.url ? `<b>🌐 URL:</b> <code>${escapeHtml(details.url)}</code>\n` : '') +
      (details.userId ? `<b>👤 User ID:</b> <code>${escapeHtml(details.userId)}</code>\n` : '') +
      `<b>💥 Error:</b> <code>${escapeHtml(errorMessage.slice(0, 500))}</code>\n` +
      (rawPreview ? `<b>📝 Raw Output Preview:</b>\n<pre>${escapeHtml(rawPreview.slice(0, 350))}</pre>\n` : '') +
      (stack ? `<b>📜 Stack:</b>\n<pre>${escapeHtml(stack.slice(0, 500))}</pre>\n` : '') +
      (Object.keys(extra).length > 0 ? `<b>ℹ️ Diagnostic Context:</b>\n<pre>${escapeHtml(JSON.stringify(extra, null, 2).slice(0, 400))}</pre>\n` : '') +
      `<b>⏰ Time:</b> ${new Date().toISOString()}`;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Telegram Admin Alert] Failed to send notification:', err);
    return false;
  }
}

const notifiedUsers = new Set<string>();

export interface NewUserRegistrationData {
  id: string;
  email?: string | null;
  full_name?: string | null;
  tier?: string | null;
  credits_balance?: number | null;
  avatar_url?: string | null;
  telegram_id?: string | number | null;
  telegram_username?: string | null;
  auth_provider?: string | null;
  preferred_language?: string | null;
  referral_code?: string | null;
  referred_by_id?: string | null;
  created_at?: string | null;
  raw_onboarding_data?: any;
}

function formatMskDate(dateStr?: string | null): string {
  try {
    const date = dateStr ? new Date(dateStr) : new Date();
    return (
      new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date) + ' (МСК)'
    );
  } catch {
    return dateStr || new Date().toISOString();
  }
}

const inFlightRegistrations = new Set<string>();

export async function notifyNewUserRegistration(profile: NewUserRegistrationData): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';
  if (!token || !adminChatId || !profile?.id) return false;

  // 1. Fast in-memory deduplication & in-flight lock
  if (notifiedUsers.has(profile.id) || inFlightRegistrations.has(profile.id)) {
    return false;
  }
  inFlightRegistrations.add(profile.id);

  // 2. Database-backed ATOMIC deduplication and data enrichment
  let dbProfile: any = null;
  let inviterName: string | null = null;

  try {
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, avatar_url, telegram_id, tier, credits_balance, preferred_language, referral_code, referred_by_id, created_at, raw_onboarding_data')
      .eq('id', profile.id)
      .maybeSingle();

    dbProfile = data;

    // Check if already notified in database
    if (dbProfile?.raw_onboarding_data?.registration_notified) {
      notifiedUsers.add(profile.id);
      inFlightRegistrations.delete(profile.id);
      return false;
    }

    // Guard: Prevent spam from existing legacy users created >2 hours ago
    const createdAtStr = profile.created_at || dbProfile?.created_at;
    if (createdAtStr) {
      const ageMs = Date.now() - new Date(createdAtStr).getTime();
      if (ageMs > 2 * 60 * 60 * 1000) {
        notifiedUsers.add(profile.id);
        inFlightRegistrations.delete(profile.id);
        await supabaseAdmin
          .from('profiles')
          .update({
            raw_onboarding_data: {
              ...(dbProfile?.raw_onboarding_data || {}),
              ...(profile.raw_onboarding_data || {}),
              registration_notified: true,
              registration_notified_at: new Date().toISOString(),
            },
          })
          .eq('id', profile.id);
        return false;
      }
    }

    // ATOMIC CLAIM: Exactly ONE worker across all serverless instances can claim this notification
    const { data: claimed } = await supabaseAdmin
      .from('profiles')
      .update({
        raw_onboarding_data: {
          ...(dbProfile?.raw_onboarding_data || {}),
          ...(profile.raw_onboarding_data || {}),
          registration_notified: true,
          registration_notified_at: new Date().toISOString(),
        },
      })
      .eq('id', profile.id)
      .or('raw_onboarding_data->>registration_notified.is.null,raw_onboarding_data->>registration_notified.neq.true')
      .select('id');

    if (!claimed || claimed.length === 0) {
      // Another concurrent worker claimed the lock a millisecond ago
      notifiedUsers.add(profile.id);
      inFlightRegistrations.delete(profile.id);
      return false;
    }

    // Enrich referral information if invited
    const inviterId = profile.referred_by_id || dbProfile?.referred_by_id;
    if (inviterId) {
      const { data: inviter } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', inviterId)
        .maybeSingle();
      if (inviter) {
        inviterName = inviter.full_name || inviter.email || null;
      }
    }
  } catch (dbErr) {
    console.warn('[Telegram User Card] Failed to fetch DB profile context:', dbErr);
  }

  // 3. Assemble complete profile details
  const raw = profile.raw_onboarding_data || dbProfile?.raw_onboarding_data || {};
  const traffic = raw.traffic_data || {};
  const discovery = raw.discovery_source || raw.discoverySource;

  const fullName = profile.full_name || dbProfile?.full_name || 'Не указано';
  const email = profile.email || dbProfile?.email || 'Не указан';
  const tier = (profile.tier || dbProfile?.tier || 'free').toUpperCase();
  const credits = profile.credits_balance ?? dbProfile?.credits_balance ?? 0;
  const avatarUrl = profile.avatar_url || dbProfile?.avatar_url || null;
  const telegramId = profile.telegram_id || dbProfile?.telegram_id || null;
  const telegramUsername = profile.telegram_username || null;
  const authProvider = profile.auth_provider || (telegramId ? 'Telegram Login' : (email.includes('@') && !email.includes('@telegram.local') ? 'Google / Web OAuth' : 'Прямая регистрация'));
  const createdAt = profile.created_at || dbProfile?.created_at || new Date().toISOString();

  const langCode = profile.preferred_language || dbProfile?.preferred_language || 'ru';
  const langLabel = langCode === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English';

  let srcFormatted = 'Прямой заход (Direct)';
  if (traffic.is_ai_traffic) {
    srcFormatted = `🤖 ИИ-Переход: ${traffic.ai_provider || 'AI Assistant'}`;
  } else if (traffic.is_dark_traffic) {
    srcFormatted = `🕵️ Dark Traffic (Прямой глубокий URL)`;
  } else if (traffic.utm_source && traffic.utm_source !== 'none') {
    srcFormatted = `🏷️ UTM: ${traffic.utm_source}${traffic.utm_medium ? ` / ${traffic.utm_medium}` : ''}`;
  } else if (traffic.referrer && traffic.referrer !== 'Direct / Bookmark') {
    srcFormatted = `🌐 ${traffic.referrer.slice(0, 50)}`;
  }

  let telegramLine = '';
  if (telegramUsername) {
    telegramLine = `@${telegramUsername.replace('@', '')}${telegramId ? ` (ID: <code>${telegramId}</code>)` : ''}`;
  } else if (telegramId) {
    telegramLine = `ID: <code>${telegramId}</code>`;
  }

  // 4. Construct Rich User Card Text
  const cardLines = [
    `🎉 <b>НОВАЯ РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ</b> 🎉`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 <b>Имя:</b> <b>${escapeHtml(fullName)}</b>`,
    `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>`,
    `🆔 <b>User ID:</b> <code>${escapeHtml(profile.id)}</code>`,
    `🔑 <b>Метод входа:</b> <b>${escapeHtml(authProvider)}</b>`,
    ...(telegramLine ? [`✈️ <b>Telegram:</b> ${telegramLine}`] : []),
    `🌐 <b>Язык интерфейса:</b> <code>${escapeHtml(langLabel)}</code>`,
    `🏷️ <b>Тариф:</b> <code>${escapeHtml(tier)}</code> | <b>Баланс:</b> <code>${credits} CR</code>`,
    ...(inviterName ? [`👥 <b>Пригласил:</b> <code>${escapeHtml(inviterName)}</code>`] : []),
    `📍 <b>Источник:</b> <code>${escapeHtml(srcFormatted)}</code>`,
    ...(discovery ? [`🎯 <b>Откуда узнал:</b> <code>${escapeHtml(discovery)}</code>`] : []),
    `⏰ <b>Время регистрации:</b> <code>${formatMskDate(createdAt)}</code>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
  ];

  const cardText = cardLines.join('\n');

  // 5. Build Action Buttons
  const inlineKeyboard: any[][] = [];
  const actionRow: any[] = [];

  if (telegramUsername) {
    actionRow.push({ text: '💬 Открыть в TG', url: `https://t.me/${telegramUsername.replace('@', '')}` });
  } else if (telegramId) {
    actionRow.push({ text: '💬 Открыть в TG', url: `tg://user?id=${telegramId}` });
  }

  actionRow.push({ text: '👑 Админ-панель', url: 'https://www.virale.uno/ru/app/admin' });
  inlineKeyboard.push(actionRow);

  const replyMarkup = { inline_keyboard: inlineKeyboard };

  let sendSuccess = false;

  // 6. Attempt Photo Card if avatar_url is provided and caption <= 1024 chars
  if (avatarUrl && avatarUrl.startsWith('http') && cardText.length <= 1024) {
    try {
      const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          photo: avatarUrl,
          caption: cardText,
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        }),
      });
      const photoData = await photoRes.json();
      if (photoData.ok) {
        sendSuccess = true;
      } else {
        console.warn('[Telegram User Card] sendPhoto rejected, falling back to sendMessage:', photoData.description);
      }
    } catch (photoErr) {
      console.warn('[Telegram User Card] sendPhoto exception, falling back to sendMessage:', photoErr);
    }
  }

  // 7. Fallback to standard Text Message Card
  if (!sendSuccess) {
    try {
      const msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: cardText,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: replyMarkup,
        }),
      });
      const msgData = await msgRes.json();
      sendSuccess = Boolean(msgData.ok);
    } catch (msgErr) {
      console.error('[Telegram User Card] Failed to send registration message:', msgErr);
      return false;
    }
  }

  // 8. Clean in-flight lock and return result
  inFlightRegistrations.delete(profile.id);
  if (sendSuccess) {
    notifiedUsers.add(profile.id);
    return true;
  }

  return false;
}

export interface SubscriptionChangeData {
  userId: string;
  userEmail?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  telegramId?: string | number | null;
  telegramUsername?: string | null;
  oldTier?: string | null;
  newTier: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  expiresAt?: string | null;
  reason?: string | null;
  creditsAdded?: number | null;
  newCreditsBalance?: number | null;
}

export async function notifySubscriptionChanged(details: SubscriptionChangeData): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';
  if (!token || !adminChatId || !details?.userId) return false;

  let dbProfile: any = null;
  try {
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, avatar_url, telegram_id, tier, subscription_status, subscription_expires_at, credits_balance')
      .eq('id', details.userId)
      .maybeSingle();
    dbProfile = data;
  } catch (err) {
    console.warn('[Telegram Sub Change] Could not fetch DB profile:', err);
  }

  const fullName = details.fullName || dbProfile?.full_name || 'Не указано';
  const email = details.userEmail || dbProfile?.email || 'Не указан';
  const avatarUrl = details.avatarUrl || dbProfile?.avatar_url || null;
  const telegramId = details.telegramId || dbProfile?.telegram_id || null;
  const telegramUsername = details.telegramUsername || null;

  const oldTier = (details.oldTier || dbProfile?.tier || 'free').toUpperCase();
  const newTier = (details.newTier || 'free').toUpperCase();
  const oldStatus = (details.oldStatus || dbProfile?.subscription_status || 'active').toUpperCase();
  const newStatus = (details.newStatus || 'active').toUpperCase();
  const expiresAt = details.expiresAt || dbProfile?.subscription_expires_at;

  const currentBal = details.newCreditsBalance ?? dbProfile?.credits_balance;
  const addedCreds = details.creditsAdded ? `(+${details.creditsAdded.toLocaleString()} CR)` : '';
  const creditsStr = currentBal !== undefined ? `${currentBal.toLocaleString()} CR ${addedCreds}`.trim() : (addedCreds || null);

  const reason = details.reason || 'Обновление в системе';

  let telegramLine = '';
  if (telegramUsername) {
    telegramLine = `@${telegramUsername.replace('@', '')}${telegramId ? ` (ID: <code>${telegramId}</code>)` : ''}`;
  } else if (telegramId) {
    telegramLine = `ID: <code>${telegramId}</code>`;
  }

  let formattedExpires = 'Бессрочно';
  if (expiresAt) {
    if (expiresAt.startsWith('2099') || expiresAt.startsWith('2098')) {
      formattedExpires = 'Бессрочно (Навсегда)';
    } else {
      formattedExpires = formatMskDate(expiresAt);
    }
  }

  const cardLines = [
    `💎 <b>ИЗМЕНЕНИЕ ПОДПИСКИ ПОЛЬЗОВАТЕЛЯ</b> 💎`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 <b>Пользователь:</b> <b>${escapeHtml(fullName)}</b>`,
    `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>`,
    `🆔 <b>User ID:</b> <code>${escapeHtml(details.userId)}</code>`,
    ...(telegramLine ? [`✈️ <b>Telegram:</b> ${telegramLine}`] : []),
    `🔄 <b>Тариф:</b> <code>${escapeHtml(oldTier)}</code> ➔ <b>${escapeHtml(newTier)}</b>`,
    `📊 <b>Статус:</b> <code>${escapeHtml(oldStatus)}</code> ➔ <b>${escapeHtml(newStatus)}</b>`,
    `⏰ <b>Срок действия:</b> <code>${escapeHtml(formattedExpires)}</code>`,
    ...(creditsStr ? [`⚡ <b>Баланс кредитов:</b> <code>${escapeHtml(creditsStr)}</code>`] : []),
    `📌 <b>Основание:</b> <b>${escapeHtml(reason)}</b>`,
    `⏰ <b>Время события:</b> <code>${formatMskDate(new Date().toISOString())}</code>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
  ];

  const cardText = cardLines.join('\n');

  const inlineKeyboard: any[][] = [];
  const actionRow: any[] = [];
  if (telegramUsername) {
    actionRow.push({ text: '💬 Открыть в TG', url: `https://t.me/${telegramUsername.replace('@', '')}` });
  } else if (telegramId) {
    actionRow.push({ text: '💬 Открыть в TG', url: `tg://user?id=${telegramId}` });
  }
  actionRow.push({ text: '👑 Админ-панель', url: 'https://www.virale.uno/ru/app/admin' });
  inlineKeyboard.push(actionRow);

  const replyMarkup = { inline_keyboard: inlineKeyboard };

  let sendSuccess = false;

  // Attempt photo card if avatar is present
  if (avatarUrl && avatarUrl.startsWith('http') && cardText.length <= 1024) {
    try {
      const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          photo: avatarUrl,
          caption: cardText,
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        }),
      });
      const photoData = await photoRes.json();
      if (photoData.ok) {
        sendSuccess = true;
      } else {
        console.warn('[Telegram Sub Change] sendPhoto rejected, falling back to sendMessage:', photoData.description);
      }
    } catch (photoErr) {
      console.warn('[Telegram Sub Change] sendPhoto exception:', photoErr);
    }
  }

  if (!sendSuccess) {
    try {
      const msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: cardText,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: replyMarkup,
        }),
      });
      const msgData = await msgRes.json();
      sendSuccess = Boolean(msgData.ok);
    } catch (msgErr) {
      console.error('[Telegram Sub Change] Failed to send subscription message:', msgErr);
      return false;
    }
  }

  return sendSuccess;
}

export async function notifyDnaCompleted(details: {
  userId: string;
  userEmail?: string;
  fullName?: string;
  dnaSnippet?: string;
  trafficData?: any;
  discoverySource?: string;
}): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';
  if (!token || !adminChatId) return false;

  const resolvedEmail = await resolveUserEmail(details.userId, details.userEmail);
  const traffic = details.trafficData || {};
  const discovery = details.discoverySource || 'Не указан';

  let srcFormatted = 'Direct / Bookmark';
  if (traffic.is_ai_traffic) {
    srcFormatted = `🤖 ИИ-Переход: ${traffic.ai_provider || 'AI Assistant'}`;
  } else if (traffic.is_dark_traffic) {
    srcFormatted = `🕵️ Dark Traffic (Глубокий URL)`;
  } else if (traffic.referrer && traffic.referrer !== 'Direct / Bookmark') {
    srcFormatted = `🌐 ${traffic.referrer.slice(0, 40)}`;
  } else if (traffic.utm_source && traffic.utm_source !== 'none') {
    srcFormatted = `🏷️ UTM Source: ${traffic.utm_source}`;
  }

  const text = `🧬 <b>ПОЛЬЗОВАТЕЛЬ СФОРМИРОВАЛ ДНК БРЕНДА</b> 🧬\n\n` +
    `<b>👤 Имя:</b> <code>${escapeHtml(details.fullName || 'Не указано')}</code>\n` +
    `<b>📧 Email:</b> <code>${escapeHtml(resolvedEmail || 'Не указан')}</code>\n` +
    `<b>🆔 User ID:</b> <code>${escapeHtml(details.userId)}</code>\n` +
    `<b>🌐 Источник:</b> <code>${escapeHtml(srcFormatted)}</code>\n` +
    `<b>🎯 Откуда узнал:</b> <code>${escapeHtml(discovery)}</code>\n` +
    (details.dnaSnippet ? `<b>📝 ДНК / Сфокусированная Ниша:</b>\n<pre>${escapeHtml(details.dnaSnippet.slice(0, 350))}</pre>\n` : '') +
    `<b>⏰ Время:</b> ${new Date().toISOString()}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Telegram DNA Completed Alert] Failed to send notification:', err);
    return false;
  }
}

export async function notifyPaymentAttempt(details: {
  userId: string;
  userEmail?: string;
  fullName?: string;
  title: string;
  credits: number;
  starsCount: number;
  type: string;
}): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';
  if (!token || !adminChatId) return false;

  const resolvedEmail = await resolveUserEmail(details.userId, details.userEmail);

  const text = `⚡ <b>ПОПЫТКА ОПЛАТЫ / КЛИК НА ОПЛАТУ</b> ⚡\n\n` +
    `<b>👤 Пользователь:</b> <code>${escapeHtml(details.fullName || 'Творец')}</code>\n` +
    `<b>📧 Email:</b> <code>${escapeHtml(resolvedEmail || 'Не указан')}</code>\n` +
    `<b>🆔 User ID:</b> <code>${escapeHtml(details.userId)}</code>\n` +
    `<b>📦 Товар:</b> <code>${escapeHtml(details.title)}</code> (${details.credits} CR)\n` +
    `<b>⭐ Сумма:</b> <code>${details.starsCount} XTR</code> (Telegram Stars)\n` +
    `<b>🏷️ Тип:</b> <code>${escapeHtml(details.type.toUpperCase())}</code>\n` +
    `<b>⏰ Время:</b> ${new Date().toISOString()}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Telegram Payment Attempt Alert] Failed to send notification:', err);
    return false;
  }
}

export async function notifyPaymentSuccess(details: {
  userId: string;
  userEmail?: string;
  fullName?: string;
  credits: number;
  totalBalance?: number;
  planOrPackage?: string;
}): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';
  if (!token || !adminChatId) return false;

  const resolvedEmail = await resolveUserEmail(details.userId, details.userEmail);

  const text = `💰 <b>УСПЕШНАЯ ОПЛАТА И НАЧИСЛЕНИЕ!</b> 💰\n\n` +
    `<b>👤 Пользователь:</b> <code>${escapeHtml(details.fullName || 'Творец')}</code>\n` +
    `<b>📧 Email:</b> <code>${escapeHtml(resolvedEmail || 'Не указан')}</code>\n` +
    `<b>🆔 User ID:</b> <code>${escapeHtml(details.userId)}</code>\n` +
    `<b>➕ Начислено:</b> <code>+${details.credits} CR</code>\n` +
    (details.totalBalance !== undefined ? `<b>🔋 Новый баланс:</b> <code>${details.totalBalance} CR</code>\n` : '') +
    (details.planOrPackage ? `<b>📦 Тариф/Пакет:</b> <code>${escapeHtml(details.planOrPackage)}</code>\n` : '') +
    `<b>⏰ Время:</b> ${new Date().toISOString()}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Telegram Payment Success Alert] Failed to send notification:', err);
    return false;
  }
}


