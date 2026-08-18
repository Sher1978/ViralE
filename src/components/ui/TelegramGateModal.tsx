'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAppData } from '@/components/providers/AppDataProvider';
import { useLocale } from 'next-intl';
import { Send, CheckCircle2, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export function TelegramGateModal() {
  const { profile, updateProfile } = useAppData();
  const locale = useLocale();
  const [checking, setChecking] = useState(false);

  const checkTelegramStatus = useCallback(async () => {
    if (!profile?.id) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/profile/link-telegram?userId=${profile.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.telegram_id) {
          updateProfile({ telegram_id: data.telegram_id });
        }
      }
    } catch (err) {
      console.error('[TelegramGate] Status check failed:', err);
    } finally {
      setChecking(false);
    }
  }, [profile?.id, updateProfile]);

  // Polling every 3.5 seconds to auto-close modal as soon as user links bot in Telegram
  useEffect(() => {
    if (!profile || profile.telegram_id) return;

    const interval = setInterval(() => {
      checkTelegramStatus();
    }, 3500);

    return () => clearInterval(interval);
  }, [profile, checkTelegramStatus]);

  // If profile is not loaded or user already has telegram_id linked, do not show modal
  if (!profile || profile.telegram_id) {
    return null;
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'Viralengin_bot';
  const telegramLinkUrl = `https://t.me/${botUsername}?start=link_${profile.id}`;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-lg bg-gradient-to-b from-neutral-900/95 via-neutral-900/90 to-black border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(6,182,212,0.15)] flex flex-col items-center text-center relative overflow-hidden"
      >
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/25 mb-5 flex items-center justify-center shrink-0">
          <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
            <Send className="w-8 h-8 text-cyan-400 animate-pulse ml-0.5" />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-black uppercase tracking-wider mb-3">
          <ShieldAlert className="w-3.5 h-3.5" />
          {locale === 'ru' ? 'Обязательное подключение' : 'Mandatory Connection'}
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-3">
          {locale === 'ru' ? 'Подключите Telegram Бот' : 'Connect Telegram Bot'}
        </h2>

        {/* Description */}
        <p className="text-xs sm:text-sm text-neutral-300 font-normal leading-relaxed mb-6 max-w-md">
          {locale === 'ru'
            ? 'Для продолжения работы в Студии привяжите ваш аккаунт к официальному Telegram-боту. Это необходимо для получения готовых видео, рендеров и управления проектами.'
            : 'To continue using the Studio, link your account to our official Telegram bot. Required for receiving rendered videos, scripts, and updates.'}
        </p>

        {/* Bonus Callout */}
        <div className="w-full bg-cyan-950/40 border border-cyan-500/30 rounded-2xl p-3.5 mb-6 flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="text-xs font-bold text-cyan-200">
              {locale === 'ru' ? '🎁 Бонус за подключение: +50 CR' : '🎁 Linking Bonus: +50 CR'}
            </div>
            <div className="text-[11px] text-cyan-300/70 font-medium">
              {locale === 'ru' ? 'Кредиты зачислятся автоматически после привязки.' : 'Credits will be automatically added upon linking.'}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <a
          href={telegramLinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-3 cursor-pointer"
        >
          <Send className="w-5 h-5" />
          {locale === 'ru' ? 'Подключить Telegram Бот' : 'Connect Telegram Bot'}
        </a>

        {/* Manual Refresh / Auto Status Indicator */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <button
            onClick={checkTelegramStatus}
            disabled={checking}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-neutral-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-cyan-400' : ''}`} />
            {locale === 'ru' ? 'Проверить статус подключения' : 'Check connection status'}
          </button>
        </div>

        {/* Status footnote */}
        <p className="text-[10px] text-neutral-500 mt-4">
          {locale === 'ru'
            ? 'Окно закроется автоматически сразу после нажатия кнопки START в боте.'
            : 'This modal will close automatically once you press START in the bot.'}
        </p>
      </motion.div>
    </div>
  );
}
