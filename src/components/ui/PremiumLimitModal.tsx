'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, Sparkles, X, ArrowRight, Zap, CheckCircle, Info, 
  AlertCircle, BrainCircuit, CreditCard, Check, Loader2 
} from 'lucide-react';
import { useRouter } from '@/navigation';
import { profileService } from '@/lib/services/profileService';

interface PremiumLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  advice?: string;
  type?: 'trial' | 'credits' | 'tier' | 'success' | 'info' | 'error' | 'warning' | 'confirm';
  locale?: string;
  balance?: number;
  onConfirm?: () => void;
}

const TOP_UP_OPTIONS = [
  { credits: 50, price: '290', packKeyEn: 'Starter Refill', packKeyRu: 'Стартовый пакет' },
  { credits: 200, price: '990', packKeyEn: 'Popular Refill', packKeyRu: 'Популярный пакет' },
  { credits: 500, price: '2190', packKeyEn: 'Max Refill', packKeyRu: 'Максимальный пакет' },
];

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '990',
    credits: 200,
    icon: '🌱',
    color: '#4D9EFF',
    featuresEn: ['200 Credits included', 'ScriptLab standard access', 'Basic Storyboarding'],
    featuresRu: ['Включено 200 кредитов', 'Базовый доступ к монтажу', 'Стандартная раскадровка'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '2490',
    credits: 840,
    icon: '⚡',
    color: '#00FFCC',
    popular: true,
    featuresEn: ['840 Credits included', 'Full AI script editing', 'Smart Storyboard regeneration'],
    featuresRu: ['Включено 840 кредитов', 'Полный ИИ монтаж сценариев', 'Умная регенерация кадров'],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '6990',
    credits: 3000,
    icon: '🚀',
    color: '#9B5FFF',
    featuresEn: ['3000 Credits included', 'Bring Your Own Key support', 'Automated cross-posting'],
    featuresRu: ['Включено 3000 кредитов', 'Поддержка своих API ключей', 'Автоматический постинг'],
  },
];

export function PremiumLimitModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  advice,
  type = 'trial',
  locale = 'en',
  balance
}: PremiumLimitModalProps) {
  const router = useRouter();
  
  // Local checkout state variables
  const [showCheckout, setShowCheckout] = React.useState(false);
  const [billingTab, setBillingTab] = React.useState<'topup' | 'plans'>('topup');
  const [selectedTopUp, setSelectedTopUp] = React.useState<number>(1); // Default to popular package
  const [selectedPlan, setSelectedPlan] = React.useState<string>('pro');
  const [paymentStatus, setPaymentStatus] = React.useState<'idle' | 'processing' | 'success'>('idle');
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [liveBalance, setLiveBalance] = React.useState<number | undefined>(balance);

  // Fetch current live profile on mount to handle updates correctly
  React.useEffect(() => {
    async function fetchUser() {
      try {
        const u = await profileService.getOrCreateProfile();
        setUserProfile(u);
        if (u) {
          setLiveBalance(u.credits_balance);
        }
      } catch (err) {
        console.error('Failed to load profile in limit modal:', err);
      }
    }
    if (isOpen) {
      fetchUser();
      // Reset state when opening modal
      setShowCheckout(false);
      setPaymentStatus('idle');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getTheme = () => {
    switch (type) {
      case 'success': return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', accent: 'border-green-500/20' };
      case 'credits': return { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/20', accent: 'border-amber-500/20' };
      case 'info': return { icon: Info, color: 'text-cyan-400', bg: 'bg-cyan-500/20', accent: 'border-cyan-500/20' };
      case 'tier': return { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/20', accent: 'border-purple-500/20' };
      case 'error': return { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20', accent: 'border-red-500/30' };
      case 'warning': return { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/20', accent: 'border-orange-500/20' };
      default: return { icon: Lock, color: 'text-purple-400', bg: 'bg-purple-500/20', accent: 'border-purple-500/20' };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  // Handle Mock Payment & Balance Top Up
  const handlePayment = async () => {
    setPaymentStatus('processing');
    
    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const currentProf = userProfile || await profileService.getOrCreateProfile();
      if (!currentProf) throw new Error('No user profile found');

      let updatedCredits = currentProf.credits_balance || 0;
      let updatedTier = currentProf.tier || 'free';

      if (billingTab === 'topup') {
        const addedCredits = TOP_UP_OPTIONS[selectedTopUp].credits;
        updatedCredits += addedCredits;
      } else {
        const plan = PLANS.find(p => p.id === selectedPlan);
        if (plan) {
          updatedCredits += plan.credits;
          updatedTier = plan.id as any;
        }
      }

      // Update in Supabase public.profiles database using client service role / public profile update
      const success = await profileService.updateProfile(currentProf.id, {
        credits_balance: updatedCredits,
        tier: updatedTier as any
      });

      if (success) {
        setLiveBalance(updatedCredits);
        // Refresh local memory profile
        setUserProfile({ ...currentProf, credits_balance: updatedCredits, tier: updatedTier });
        setPaymentStatus('success');
      } else {
        throw new Error('Database profile update failed');
      }
    } catch (err) {
      console.error('Payment handler failed:', err);
      setPaymentStatus('idle');
      if (typeof (globalThis as any).window !== 'undefined') {
        (globalThis as any).window.alert(locale === 'ru' ? 'Сбой транзакции. Попробуйте еще раз.' : 'Transaction failed. Please try again.');
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        {/* Backdrop - Deep Glass Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-lg"
        />

        {/* Modal Content - Premium Monolith */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className={`relative w-full max-w-sm overflow-hidden border ${
            showCheckout ? 'border-cyan-500/25 shadow-[0_0_60px_rgba(0,255,204,0.15)]' : theme.accent
          } bg-black/40 p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300`}
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 95%, 95% 100%, 0 100%)'
          }}
        >
          {/* Subtle Scanline Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-6 top-6 rounded-full p-2 text-white/10 hover:bg-white/5 hover:text-white transition-all z-20"
          >
            <X size={18} />
          </button>

          {/* --- INTERACTIVE INLINE CHECKOUT SCREEN --- */}
          {showCheckout ? (
            <div className="space-y-6">
              {paymentStatus === 'processing' ? (
                /* Processing State Spinner */
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center animate-pulse">
                  <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white">
                    {locale === 'ru' ? 'БЕЗОПАСНАЯ ОПЛАТА...' : 'SECURE PAYMENT PROCESSING...'}
                  </p>
                  <p className="text-[10px] text-white/40 leading-relaxed max-w-[200px]">
                    {locale === 'ru' ? 'Связь с банком-эквайером и начисление...' : 'Establishing bank connection & crediting account...'}
                  </p>
                </div>
              ) : paymentStatus === 'success' ? (
                /* Payment Success View */
                <div className="text-center py-6 space-y-6 animate-fade-in">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                      <Check className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-white">
                      {locale === 'ru' ? 'Оплата одобрена!' : 'Payment Approved!'}
                    </h3>
                    <p className="text-[11px] leading-relaxed text-white/60 px-2">
                      {locale === 'ru' 
                        ? `На ваш баланс успешно начислено кредитов. Теперь вы можете продолжить работу на текущем экране!`
                        : `Successfully refilled your account credits! You can now continue your work directly on this screen!`}
                    </p>
                  </div>
                  
                  {/* Current Balance Counter */}
                  <div className="py-2.5 bg-green-500/5 border border-green-500/10 rounded-full inline-flex items-center gap-1.5 px-4 mx-auto">
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-400">
                      {locale === 'ru' ? 'Ваш Баланс:' : 'Your Balance:'} <span className="text-white font-mono">{liveBalance}</span>
                    </span>
                  </div>

                  <button
                    onClick={onClose}
                    className="w-full py-4 rounded-xl bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(255,255,255,0.15)] mt-4"
                  >
                    {locale === 'ru' ? 'Продолжить работу' : 'Resume Work'}
                  </button>
                </div>
              ) : (
                /* Checkout Form & Product Selection */
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-white">
                      {locale === 'ru' ? 'Быстрое пополнение' : 'Quick Refill'}
                    </h3>
                    <p className="text-[10px] text-white/40">
                      {locale === 'ru' ? 'Оставайтесь на экране без потери прогресса' : 'Complete checkout instantly without reloading'}
                    </p>
                  </div>

                  {/* Tab Switcher */}
                  <div className="flex bg-white/5 border border-white/5 p-1 rounded-xl">
                    <button
                      onClick={() => setBillingTab('topup')}
                      className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                        billingTab === 'topup' ? 'bg-white text-black font-black' : 'text-white/40 hover:text-white'
                      }`}
                    >
                      {locale === 'ru' ? 'Пополнение' : 'Top Up'}
                    </button>
                    <button
                      onClick={() => setBillingTab('plans')}
                      className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                        billingTab === 'plans' ? 'bg-white text-black font-black' : 'text-white/40 hover:text-white'
                      }`}
                    >
                      {locale === 'ru' ? 'Тарифы' : 'Plans'}
                    </button>
                  </div>

                  {/* Top Up Options Content */}
                  {billingTab === 'topup' ? (
                    <div className="space-y-2">
                      {TOP_UP_OPTIONS.map((opt, i) => (
                        <div
                          key={opt.credits}
                          onClick={() => setSelectedTopUp(i)}
                          className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer border transition-all ${
                            selectedTopUp === i 
                              ? 'bg-cyan-500/10 border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.05)]' 
                              : 'bg-white/5 border-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                              <Zap className={`w-4 h-4 ${selectedTopUp === i ? 'text-cyan-400' : 'text-white/30'}`} />
                            </div>
                            <div>
                              <p className="text-xs font-black text-white">+{opt.credits} CC</p>
                              <p className="text-[9px] text-white/30">{locale === 'ru' ? opt.packKeyRu : opt.packKeyEn}</p>
                            </div>
                          </div>
                          <p className="text-xs font-black text-cyan-400">{opt.price} ₽</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Plans Subscription Options Content */
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {PLANS.map((plan) => (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan.id)}
                          className={`flex flex-col p-3 rounded-xl cursor-pointer border transition-all ${
                            selectedPlan === plan.id 
                              ? 'bg-purple-500/10 border-purple-400/40 shadow-[0_0_20px_rgba(168,85,247,0.05)]' 
                              : 'bg-white/5 border-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{plan.icon}</span>
                              <div>
                                <span className="text-xs font-black text-white">{plan.name}</span>
                                {plan.popular && (
                                  <span className="text-[6px] font-black uppercase px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 ml-1.5">
                                    POP
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-black text-purple-400">{plan.price} ₽</span>
                          </div>
                          {selectedPlan === plan.id && (
                            <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-1 animate-slide-up">
                              {(locale === 'ru' ? plan.featuresRu : plan.featuresEn).map((feat, fIdx) => (
                                <div key={fIdx} className="flex items-center gap-1.5">
                                  <Check className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                                  <span className="text-[9px] text-white/50">{feat}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Checkout Action Button */}
                  <div className="pt-2">
                    <button
                      onClick={handlePayment}
                      className="group relative w-full overflow-hidden bg-white p-4.5 text-black hover:bg-cyan-400 hover:text-white transition-all active:scale-95 shadow-[0_10px_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-tighter italic">
                        {locale === 'ru' 
                          ? `Оплатить ${billingTab === 'topup' ? TOP_UP_OPTIONS[selectedTopUp].price : PLANS.find(p => p.id === selectedPlan)?.price} ₽`
                          : `Pay ${billingTab === 'topup' ? TOP_UP_OPTIONS[selectedTopUp].price : PLANS.find(p => p.id === selectedPlan)?.price} RUB`}
                      </span>
                    </button>
                    
                    <button
                      onClick={() => setShowCheckout(false)}
                      className="w-full text-center py-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white/40 mt-2 transition-all"
                    >
                      {locale === 'ru' ? 'Назад к предупреждению' : 'Back to Alert'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* --- REGULAR INFORMATION / UPGRADE MODAL --- */
            <div>
              {/* Header Icon */}
              <div className="mb-6 flex flex-col items-center">
                <div className="relative">
                  <div className={`absolute -inset-4 rounded-full ${theme.bg} blur-2xl opacity-50`} />
                  <div className="relative flex h-16 w-16 items-center justify-center border border-white/5 bg-white/5 shadow-inner">
                    <Icon className={`h-8 w-8 ${theme.color}`} />
                  </div>
                </div>
                
                {/* Live Balance Indicator */}
                {typeof liveBalance === 'number' && (
                  <div className="mt-4 px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                      {locale === 'ru' ? 'Баланс:' : 'Balance:'} <span className="text-white font-mono">{liveBalance}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Text Content */}
              <div className="mb-8 text-center space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white leading-none">
                  {title}
                </h2>
                <p className="text-xs font-medium leading-relaxed text-white/50 px-4">
                  {description}
                </p>
              </div>

              {/* Strategy Advice Block */}
              {advice && (
                <div className="mb-8 p-4 bg-white/5 border border-white/5 relative group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 opacity-50" />
                  <div className="flex gap-3">
                    <BrainCircuit className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-purple-400/60">Strategist Advice</p>
                      <p className="text-[11px] text-white/60 leading-relaxed italic">{advice}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Area */}
              <div className="space-y-3">
                {type === 'confirm' ? (
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all font-mono"
                    >
                      {locale === 'ru' ? 'Отмена' : 'Cancel'}
                    </button>
                    <button
                      onClick={() => {
                        if (onConfirm) onConfirm();
                        onClose();
                      }}
                      className="flex-1 py-4 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(255,255,255,0.2)]"
                    >
                      {locale === 'ru' ? 'Дальше' : 'Proceed'}
                    </button>
                  </div>
                ) : (type === 'trial' || type === 'credits' || type === 'tier') ? (
                  <button
                    onClick={() => {
                      // Switch inline Checkout state to true instead of redirecting the user!
                      setShowCheckout(true);
                    }}
                    className="group relative w-full overflow-hidden bg-white p-5 text-black transition-all hover:bg-purple-500 hover:text-white active:scale-95 shadow-[0_10px_30px_rgba(255,255,255,0.1)] font-mono"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-3">
                      <span className="text-sm font-black uppercase tracking-tighter italic">
                        {locale === 'ru' ? 'Пополнить баланс' : 'Refill Balance'}
                      </span>
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="group relative w-full overflow-hidden bg-white/5 border border-white/10 p-5 text-white transition-all hover:bg-white/10 active:scale-95"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-3">
                      <span className="text-sm font-black uppercase tracking-tighter italic">
                        {locale === 'ru' ? 'Понял' : 'Understood'}
                      </span>
                    </div>
                  </button>
                )}
                
                {(type === 'trial' || type === 'credits' || type === 'tier') && (
                  <button
                    onClick={onClose}
                    className="w-full flex items-center justify-center py-2 text-[8px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white/40 transition-all font-mono"
                  >
                    {locale === 'ru' ? 'Вернуться позже' : 'Maybe Later'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Footer Copyright */}
          <div className="mt-10 flex flex-col items-center justify-center space-y-1">
            <div className="h-[1px] w-12 bg-white/10" />
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/10 mt-2">
               SHER DIGITAL CORE © 2026
            </p>
            <p className="text-[7px] font-bold text-white/5 uppercase tracking-widest leading-none">
               Automated Creative Intelligence
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
