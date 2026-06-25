'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Zap, 
  Sparkles, 
  Rocket, 
  CheckCircle2, 
  Plus, 
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Lock,
  X,
  Loader2,
  Coins,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { profileService, Profile } from '@/lib/services/profileService';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/navigation';

export default function SubscriptionPage() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const router = useRouter();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);
  
  // Payment modal state
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stars' | 'tribute' | 'paybio' | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  
  const pollingRef = useRef<any>(null);

  useEffect(() => {
    fetchProfile();
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const fetchProfile = async () => {
    const p = await profileService.getOrCreateProfile();
    setProfile(p);
    setIsLoading(false);
  };

  const handleAddCredits = async (amount: number) => {
    if (!profile) return;
    setUpdateLoading(`credits-${amount}`);
    try {
      const success = await profileService.updateProfile(profile.id, { 
        credits_balance: (profile.credits_balance || 0) + amount 
      });
      if (success) {
        await fetchProfile();
      }
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleOpenPaymentModal = (tierId: string) => {
    setSelectedTier(tierId);
    setIsPaymentModalOpen(true);
    setPaymentStatus('idle');
    setPaymentMethod(null);
  };

  const startStarsPayment = async () => {
    if (!selectedTier || !profile) return;
    setPaymentStatus('processing');
    
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    try {
      const res = await fetch('/api/billing/telegram-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'plan',
          id: selectedTier,
          locale,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate payment link');
      }

      const invoiceLink = data.invoiceLink;
      const tg = (globalThis as any).window?.Telegram?.WebApp;
      
      if (tg && typeof tg.openInvoice === 'function') {
        tg.openInvoice(invoiceLink, async (status: string) => {
          if (status === 'paid') {
            setPaymentStatus('processing');
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await fetchProfile();
            setPaymentStatus('success');
          } else {
            setPaymentStatus('idle');
          }
        });
      } else {
        const payWindow = (globalThis as any).window?.open(invoiceLink, '_blank');
        if (!payWindow) {
          if ((globalThis as any).window) {
            (globalThis as any).window.location.href = invoiceLink;
          }
          return;
        }

        const initialBalance = profile.credits_balance || 0;
        let attempts = 0;
        const maxAttempts = 60; 

        pollingRef.current = setInterval(async () => {
          attempts++;
          if (attempts > maxAttempts) {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setPaymentStatus('idle');
            return;
          }

          try {
            const u = await profileService.getOrCreateProfile();
            if (u && (u.credits_balance > initialBalance || u.tier === selectedTier)) {
              setProfile(u);
              setPaymentStatus('success');
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
            }
          } catch (pollErr) {
            console.error('[Telegram Stars Polling] Fetch profile error:', pollErr);
          }
        }, 3000);
      }
    } catch (err: any) {
      console.error('[Telegram Stars Payment] Initiation failed:', err);
      setPaymentStatus('idle');
      (globalThis as any).alert?.(locale === 'ru' ? 'Ошибка генерации счета' : 'Error generating invoice');
    }
  };

  const handleTributePayment = () => {
    if (!selectedTier) return;
    
    // Get corresponding Tribute link from client config/env variables
    let tributeUrl = '';
    if (selectedTier === 'starter') {
      tributeUrl = process.env.NEXT_PUBLIC_TRIBUTE_SUB_URL_STARTER || '';
    } else if (selectedTier === 'pro') {
      tributeUrl = process.env.NEXT_PUBLIC_TRIBUTE_SUB_URL_PRO || '';
    } else if (selectedTier === 'scale') {
      tributeUrl = process.env.NEXT_PUBLIC_TRIBUTE_SUB_URL_SCALE || '';
    }

    if (!tributeUrl) {
      (globalThis as any).alert?.(locale === 'ru' ? 'Ссылка на подписку Tribute не настроена' : 'Tribute link not configured');
      return;
    }

    const tg = (globalThis as any).window?.Telegram?.WebApp;
    if (tg && typeof tg.openTelegramLink === 'function') {
      tg.openTelegramLink(tributeUrl);
    } else {
      (globalThis as any).window?.open(tributeUrl, '_blank');
    }

    // Set status to processing and wait for webhook or user confirmation
    setPaymentStatus('processing');
    
    // Check balance / tier updates in background
    const initialTier = profile?.tier;
    let attempts = 0;
    
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 40) { // 2 minutes
        clearInterval(pollingRef.current);
        setPaymentStatus('idle');
        return;
      }
      const u = await profileService.getOrCreateProfile();
      if (u && u.tier === selectedTier && u.subscription_status === 'active') {
        setProfile(u);
        setPaymentStatus('success');
        clearInterval(pollingRef.current);
      }
    }, 4000);
  };

  const PLANS_CONFIG = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$12',
      stars: '600 Stars',
      icon: Zap,
      color: 'from-slate-400 to-slate-600',
      features: {
        ru: ['200 кредитов /мес', 'Доступ к монтажу', 'Стандартная раскадровка', 'Telegram-оповещения'],
        en: ['200 credits /mo', 'Studio editing access', 'Standard Storyboard', 'Telegram Alerts']
      },
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$29',
      stars: '1450 Stars',
      icon: Sparkles,
      color: 'from-purple-500 to-indigo-600',
      features: {
        ru: ['840 кредитов /мес', 'Полный ИИ монтаж сценариев', 'Регенерация кадров', 'Приоритетный рендер'],
        en: ['840 credits /mo', 'Full AI script editing', 'Smart Storyboard regeneration', 'Priority Rendering']
      },
      popular: true
    },
    {
      id: 'scale',
      name: 'Scale',
      price: '$79',
      stars: '3950 Stars',
      icon: Rocket,
      color: 'from-amber-400 to-orange-600',
      features: {
        ru: ['3000 кредитов /мес', 'Поддержка своих API ключей', 'Кросспостинг в соцсети', 'Выделенный ИИ-стратег'],
        en: ['3000 credits /mo', 'Bring Your Own Key support', 'Automated cross-posting', 'Dedicated Pilot Strategist']
      },
      popular: false
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-32">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Secure Billing Lab</span>
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic">
           Power up your <span className="gradient-text-purple">Engine</span>
        </h1>
        <p className="text-white/40 text-xs max-w-xs mx-auto uppercase tracking-widest font-bold">
           {locale === 'ru' ? 'Выберите подходящий тариф для создания контента' : 'Switch plans or top up your virtual resources'}
        </p>
      </div>

      {/* Credit Status Card */}
      <div className="glass-premium rounded-[2.5rem] p-8 border border-white/10 relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-1000">
            <CreditCard size={120} />
         </div>
         
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
            <div>
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Available Resources</p>
               <div className="text-5xl font-black tabular-nums tracking-tighter flex items-end gap-2">
                  {profile?.credits_balance || 0}
                  <span className="text-lg text-purple-400 mb-1">CR</span>
               </div>
               <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <span className="text-[9px] font-black uppercase tracking-wider opacity-60">System Tier: </span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-purple-400">{profile?.tier?.toUpperCase() || 'FREE'}</span>
                  {profile?.subscription_status === 'active' && (
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase">Active</span>
                  )}
                  {profile?.subscription_status === 'expired' && (
                    <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-black uppercase">Expired</span>
                  )}
               </div>
            </div>

            <div className="flex gap-3">
               <button 
                  onClick={() => handleAddCredits(100)}
                  disabled={!!updateLoading}
                  className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all text-[11px] font-black uppercase tracking-widest"
               >
                  {updateLoading === 'credits-100' ? 'Updating...' : '+100 CC'}
               </button>
               <button 
                  onClick={() => handleAddCredits(500)}
                  disabled={!!updateLoading}
                  className="px-8 py-4 rounded-2xl bg-purple-600 text-white shadow-xl shadow-purple-600/20 hover:bg-purple-500 active:scale-95 transition-all text-[11px] font-black uppercase tracking-widest flex items-center gap-2"
               >
                  <Plus size={14} strokeWidth={3} />
                  {updateLoading === 'credits-500' ? 'Updating...' : 'Add 500'}
               </button>
            </div>
         </div>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS_CONFIG.map((tier) => {
          const isCurrent = profile?.tier === tier.id && profile?.subscription_status === 'active';
          const Icon = tier.icon;
          
          return (
            <div 
              key={tier.id}
              className={`relative rounded-[2.5rem] p-8 border transition-all duration-500 flex flex-col ${
                isCurrent 
                  ? 'bg-white/5 border-purple-500/50 shadow-2xl shadow-purple-500/10' 
                  : 'bg-black/20 border-white/5 hover:border-white/20'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 px-6 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">
                   Recommended
                </div>
              )}

              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center shadow-lg mb-6`}>
                 <Icon className="text-white w-7 h-7" />
              </div>

              <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">{tier.name}</h2>
              <div className="flex items-baseline gap-1 mb-8">
                 <span className="text-3xl font-black">{tier.price}</span>
                 <span className="text-[10px] uppercase font-bold text-white/20">/ month</span>
              </div>

              <div className="flex-1 space-y-4 mb-10">
                 {tier.features[locale === 'ru' ? 'ru' : 'en'].map(f => (
                   <div key={f} className="flex items-center gap-3">
                      <CheckCircle2 size={16} className={isCurrent ? 'text-purple-400' : 'text-white/20'} />
                      <span className="text-xs font-bold text-white/60">{f}</span>
                   </div>
                 ))}
              </div>

              <button
                onClick={() => handleOpenPaymentModal(tier.id)}
                disabled={isCurrent}
                className={`w-full py-5 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  isCurrent 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                    : 'bg-white text-black hover:scale-105 active:scale-95'
                }`}
              >
                {isCurrent ? (locale === 'ru' ? 'Активный тариф' : 'Active Plan') : (locale === 'ru' ? 'Выбрать тариф' : 'Select Plan')}
              </button>
            </div>
          );
        })}
      </div>

      {/* Industrial Footer Info */}
      <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 text-center">
         <div className="flex items-center justify-center gap-3 opacity-20 mb-3">
            <Lock size={12} />
            <span className="text-[9px] font-black uppercase tracking-[0.4em]">Secure Checkout Node</span>
         </div>
         <p className="text-[10px] text-white/30 font-bold uppercase leading-relaxed max-w-sm mx-auto">
            {locale === 'ru' 
              ? 'Все платежи проводятся через безопасные шлюзы Telegram. Подписки автоматически продлеваются.' 
              : 'Payments are processed securely via Telegram-native endpoints. Subscriptions recur monthly.'}
         </p>
      </div>

      {/* --- PAYMENT METHOD MODAL --- */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (paymentStatus !== 'processing') setIsPaymentModalOpen(false);
              }}
              className="absolute inset-0 bg-black/85 backdrop-blur-lg"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-sm overflow-hidden border border-white/10 bg-black/80 p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300 rounded-[2.5rem]"
            >
              {/* Close Button */}
              {paymentStatus !== 'processing' && (
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="absolute right-6 top-6 rounded-full p-2 text-white/20 hover:bg-white/5 hover:text-white transition-all z-20"
                >
                  <X size={18} />
                </button>
              )}

              {paymentStatus === 'processing' ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center animate-pulse">
                  <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white">
                    {locale === 'ru' ? 'ОЖИДАНИЕ ОПЛАТЫ...' : 'WAITING FOR PAYMENT...'}
                  </p>
                  <p className="text-[10px] text-white/40 leading-relaxed max-w-[200px]">
                    {locale === 'ru' 
                      ? 'Пожалуйста, завершите платеж в открывшемся окне Telegram.' 
                      : 'Please complete the payment in the opened Telegram window.'}
                  </p>
                </div>
              ) : paymentStatus === 'success' ? (
                <div className="text-center py-6 space-y-6">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-white">
                      {locale === 'ru' ? 'Доступ активирован!' : 'Access Activated!'}
                    </h3>
                    <p className="text-[11px] leading-relaxed text-white/60 px-2">
                      {locale === 'ru' 
                        ? `Ваш тариф успешно повышен до ${selectedTier?.toUpperCase()}. Настройки обновлены.`
                        : `Successfully upgraded to ${selectedTier?.toUpperCase()} plan. Settings synced.`}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="w-full py-4 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {locale === 'ru' ? 'Отлично' : 'Perfect'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-1">
                       {locale === 'ru' ? 'Выберите способ оплаты' : 'Choose payment method'}
                     </p>
                     <h3 className="text-2xl font-black uppercase tracking-tighter italic">
                       {selectedTier?.toUpperCase()} PLAN
                     </h3>
                  </div>

                  <div className="space-y-3">
                    {/* Stars Method */}
                    <button
                      onClick={() => {
                        setPaymentMethod('stars');
                        startStarsPayment();
                      }}
                      className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 hover:bg-white/10 rounded-2xl transition-all group active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                          <Coins className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black text-white">{locale === 'ru' ? 'Звёзды Telegram' : 'Telegram Stars'}</p>
                          <p className="text-[9px] text-white/40">{locale === 'ru' ? 'Быстрая оплата в Mini App' : 'Instant in-app checkout'}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-amber-400">
                        {PLANS_CONFIG.find(p => p.id === selectedTier)?.stars}
                      </span>
                    </button>

                    {/* Tribute Method */}
                    <button
                      onClick={() => {
                        setPaymentMethod('tribute');
                        handleTributePayment();
                      }}
                      className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 hover:bg-white/10 rounded-2xl transition-all group active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                          <QrCode className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black text-white">{locale === 'ru' ? 'Подписка Tribute' : 'Tribute Subscription'}</p>
                          <p className="text-[9px] text-white/40">{locale === 'ru' ? 'Через бота @subscribeappbot' : 'Via Tribute platform bot'}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-purple-400">
                        {PLANS_CONFIG.find(p => p.id === selectedTier)?.price} / mo
                      </span>
                    </button>

                    {/* Paybio Method (Soon) */}
                    <div
                      className="w-full flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl opacity-50 relative group cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-400">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black text-white">{locale === 'ru' ? 'Оплата картой (Paybio)' : 'Card Checkout (Paybio)'}</p>
                          <p className="text-[9px] text-white/40">{locale === 'ru' ? 'Карты РФ и СНГ (скоро)' : 'P2P Russian / CIS Cards (Soon)'}</p>
                        </div>
                      </div>
                      <span className="text-[8px] bg-white/5 text-white/40 px-2 py-1 rounded font-black uppercase">Soon</span>
                    </div>
                  </div>

                  <div className="pt-2 text-center">
                    <p className="text-[9px] text-white/30 leading-normal uppercase">
                      {locale === 'ru' 
                        ? 'При подписке на Tribute доступ активируется после вашего вступления в приватный канал.' 
                        : 'For Tribute, access will be granted immediately upon joining the private VIP channel.'}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
