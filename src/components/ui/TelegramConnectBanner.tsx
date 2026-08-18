'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Gift, Check, ArrowRight, X } from 'lucide-react';
import { useLocale } from 'next-intl';

interface TelegramConnectBannerProps {
  userId?: string;
  telegramLinked?: boolean;
  onDismiss?: () => void;
}

export function TelegramConnectBanner({ userId, telegramLinked, onDismiss }: TelegramConnectBannerProps) {
  const locale = useLocale();
  const [dismissed, setDismissed] = useState(false);

  if (telegramLinked || dismissed) return null;

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'Viralengin_bot';
  const connectUrl = `https://t.me/${botUsername}?start=link_${userId || ''}`;

  const handleConnect = () => {
    const win = typeof globalThis !== 'undefined' ? (globalThis as any).window : null;
    if (win) {
      win.open(connectUrl, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative overflow-hidden rounded-[2rem] p-5 sm:p-6 bg-gradient-to-r from-blue-950/80 via-indigo-950/80 to-purple-950/80 border border-blue-500/30 shadow-2xl backdrop-blur-xl mb-6"
    >
      {/* Glow highlight */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/30 shrink-0">
            <div className="w-full h-full rounded-[14px] bg-black/80 flex items-center justify-center text-cyan-400">
              <Send size={22} className="translate-x-0.5 -translate-y-0.5" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                <Gift size={10} className="text-yellow-400" />
                {locale === 'ru' ? 'БОНУС +50 КРЕДИТОВ' : 'BONUS +50 CREDITS'}
              </span>
            </div>

            <h4 className="text-sm sm:text-base font-black text-white tracking-tight">
              {locale === 'ru' ? 'Подключите Telegram-бота за 1 клик' : 'Connect Telegram Bot in 1 Click'}
            </h4>

            <p className="text-[11px] text-white/60 font-medium leading-relaxed max-w-lg">
              {locale === 'ru' 
                ? 'Получайте новые виральные сценарии прямо в Telegram + мгновенно получите +50 CR бонуса на ваш счет.' 
                : 'Receive viral script digests directly in Telegram + instantly claim +50 CR welcome bonus.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleConnect}
            className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span>{locale === 'ru' ? 'Подключить (+50 CR)' : 'Connect (+50 CR)'}</span>
            <ArrowRight size={14} />
          </button>

          <button
            onClick={() => {
              setDismissed(true);
              if (onDismiss) onDismiss();
            }}
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
            title={locale === 'ru' ? 'Закрыть' : 'Dismiss'}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
