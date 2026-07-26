'use client';

import React, { useState, useEffect } from 'react';
import { useAppData } from '@/components/providers/AppDataProvider';
import { useRouter } from '@/navigation';
import { useLocale } from 'next-intl';
import { AlertTriangle, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SubscriptionWarning() {
  const { profile } = useAppData();
  const router = useRouter();
  const locale = useLocale();
  
  const [showCreditsWarning, setShowCreditsWarning] = useState(false);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) return;

    const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : {} as any;

    // 1. Check credits balance (less than or equal to 100)
    // We only show it if the balance is above 0, as 0 will be handled by block-level limit triggers
    if (profile.credits_balance <= 100 && profile.credits_balance > 0) {
      // Check if dismissed in this session
      const isDismissed = globalObj.sessionStorage?.getItem('dismiss_credits_warning') === 'true';
      if (!isDismissed) {
        setShowCreditsWarning(true);
      }
    } else {
      setShowCreditsWarning(false);
    }

    // 2. Check subscription expiration (expires in <= 3 days)
    if (profile.subscription_expires_at) {
      const expiresAt = new Date(profile.subscription_expires_at);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > 0 && diffDays <= 3 && profile.subscription_status === 'active') {
        setDaysRemaining(diffDays);
        const isDismissed = globalObj.sessionStorage?.getItem(`dismiss_expiry_warning_${expiresAt.toDateString()}`) === 'true';
        if (!isDismissed) {
          setShowExpiryWarning(true);
        }
      } else {
        setShowExpiryWarning(false);
      }
    }
  }, [profile]);

  const handleDismissCredits = () => {
    const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : {} as any;
    try {
      globalObj.sessionStorage?.setItem('dismiss_credits_warning', 'true');
    } catch (e) {}
    setShowCreditsWarning(false);
  };

  const handleDismissExpiry = () => {
    if (profile?.subscription_expires_at) {
      const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : {} as any;
      const dateStr = new Date(profile.subscription_expires_at).toDateString();
      try {
        globalObj.sessionStorage?.setItem(`dismiss_expiry_warning_${dateStr}`, 'true');
      } catch (e) {}
    }
    setShowExpiryWarning(false);
  };

  const handleAction = () => {
    router.push('/app/profile/subscription');
  };

  if (!profile) return null;

  return (
    <div className="fixed top-[max(3.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))] sm:top-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] z-[100] space-y-2 pointer-events-none">
      <AnimatePresence>
        {showExpiryWarning && daysRemaining !== null && (
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.8, bottom: 0.05 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y < -25 || info.velocity.y < -200) {
                handleDismissExpiry();
              }
            }}
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="p-4 pr-14 rounded-3xl bg-red-950/90 border border-red-500/30 backdrop-blur-md shadow-2xl flex flex-col pointer-events-auto touch-pan-y cursor-grab active:cursor-grabbing select-none relative"
          >
            {/* Swipe Handle Indicator */}
            <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mb-2 shrink-0" />

            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-red-300">
                    {locale === 'ru' ? 'Срок пакета заканчивается' : 'Package Expiry Warning'}
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismissExpiry();
                    }}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-red-300 transition-colors shrink-0 active:scale-90"
                    title={locale === 'ru' ? 'Закрыть' : 'Close'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-red-200/70 font-medium leading-relaxed pr-2">
                  {locale === 'ru'
                    ? `Доступ к вашему тарифу истекает через ${daysRemaining} ${daysRemaining === 1 ? 'день' : 'дня'}. Продлите подписку заранее!`
                    : `Your subscription expires in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}. Renew now to avoid service interruption!`}
                </p>
                <button
                  onClick={handleAction}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-red-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-red-400 active:scale-95 transition-all"
                >
                  {locale === 'ru' ? 'Продлить доступ' : 'Renew Access'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {showCreditsWarning && (
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.8, bottom: 0.05 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y < -25 || info.velocity.y < -200) {
                handleDismissCredits();
              }
            }}
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="p-4 pr-14 rounded-3xl bg-yellow-950/90 border border-yellow-500/30 backdrop-blur-md shadow-2xl flex flex-col pointer-events-auto touch-pan-y cursor-grab active:cursor-grabbing select-none relative"
          >
            {/* Swipe Handle Indicator */}
            <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mb-2 shrink-0" />

            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-yellow-300">
                    {locale === 'ru' ? 'Кредиты заканчиваются' : 'Low Credits Warning'}
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismissCredits();
                    }}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-yellow-300 transition-colors shrink-0 active:scale-90"
                    title={locale === 'ru' ? 'Закрыть' : 'Close'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-yellow-200/70 font-medium leading-relaxed pr-2">
                  {locale === 'ru'
                    ? `У вас осталось всего ${profile.credits_balance} кр. Пополните баланс, чтобы продолжить генерацию сценариев и видео.`
                    : `You only have ${profile.credits_balance} credits remaining. Top up to continue creating scripts and videos.`}
                </p>
                <button
                  onClick={handleAction}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-yellow-500 text-black text-[9px] font-black uppercase tracking-widest hover:bg-yellow-400 active:scale-95 transition-all"
                >
                  {locale === 'ru' ? 'Пополнить баланс' : 'Top Up Balance'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
