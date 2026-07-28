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

  const isLimitEvent = 
    errorMessage.includes('INSUFFICIENT_CREDITS') ||
    errorMessage.includes('TRIAL_EXPIRED') ||
    errorMessage.includes('LIMIT_EXCEEDED') ||
    errorMessage.includes('BALANCE_TOO_LOW') ||
    errorMessage.includes('Free trial limit');

  const stack = typeof details.error === 'object' && details.error?.stack 
    ? details.error.stack.split('\n').slice(0, 4).join('\n') 
    : '';

  const resolvedEmail = await resolveUserEmail(details.userId, details.userEmail);
  const displayEmail = resolvedEmail || 'Не указан / Unauthenticated';

  // Deduplicate identical error notifications within 60s
  const signature = `${details.source}:${errorMessage}:${details.url || ''}:${resolvedEmail || ''}`;
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
      `<b>📧 Email:</b> <code>${escapeHtml(displayEmail)}</code>\n` +
      (details.url ? `<b>🌐 URL:</b> <code>${escapeHtml(details.url)}</code>\n` : '') +
      (details.userId ? `<b>👤 User ID:</b> <code>${escapeHtml(details.userId)}</code>\n` : '') +
      `<b>🔒 Лимит/Событие:</b> <code>${escapeHtml(errorMessage.slice(0, 400))}</code>\n` +
      `<b>⏰ Время:</b> ${new Date().toISOString()}`;
  } else {
    text = `🚨 <b>VIRAL ENGINE USER ERROR ALERT</b> 🚨\n\n` +
      `<b>📍 Source:</b> <code>${escapeHtml(details.source)}</code>\n` +
      `<b>📧 Email:</b> <code>${escapeHtml(displayEmail)}</code>\n` +
      (details.url ? `<b>🌐 URL:</b> <code>${escapeHtml(details.url)}</code>\n` : '') +
      (details.userId ? `<b>👤 User ID:</b> <code>${escapeHtml(details.userId)}</code>\n` : '') +
      `<b>💥 Error:</b> <code>${escapeHtml(errorMessage.slice(0, 500))}</code>\n` +
      (stack ? `<b>📜 Stack:</b>\n<pre>${escapeHtml(stack.slice(0, 400))}</pre>\n` : '') +
      (details.extra ? `<b>ℹ️ Context:</b>\n<pre>${escapeHtml(JSON.stringify(details.extra, null, 2).slice(0, 300))}</pre>\n` : '') +
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

export async function notifyNewUserRegistration(profile: {
  id: string;
  email?: string;
  full_name?: string | null;
  tier?: string;
  avatar_url?: string | null;
  created_at?: string;
  raw_onboarding_data?: any;
}): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '260669598';
  if (!token || !adminChatId) return false;

  // Ensure notification is sent exactly ONCE per user session/lifetime
  if (notifiedUsers.has(profile.id)) {
    return false;
  }
  notifiedUsers.add(profile.id);

  const raw = profile.raw_onboarding_data || {};
  const traffic = raw.traffic_data || {};
  const discovery = raw.discovery_source || raw.discoverySource || 'Не указан';

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

  const text = `🎉 <b>НОВАЯ РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ</b> 🎉\n\n` +
    `<b>👤 Имя:</b> <code>${escapeHtml(profile.full_name || 'Не указано')}</code>\n` +
    `<b>📧 Email:</b> <code>${escapeHtml(profile.email || 'Не указан')}</code>\n` +
    `<b>🆔 User ID:</b> <code>${escapeHtml(profile.id)}</code>\n` +
    `<b>🏷️ Тариф:</b> <code>${escapeHtml((profile.tier || 'free').toUpperCase())}</code>\n` +
    `<b>🌐 Источник:</b> <code>${escapeHtml(srcFormatted)}</code>\n` +
    `<b>🎯 Из ответа:</b> <code>${escapeHtml(discovery)}</code>\n` +
    `<b>⏰ Время:</b> ${profile.created_at || new Date().toISOString()}`;

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
    console.error('[Telegram New User Alert] Failed to send notification:', err);
    return false;
  }
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


