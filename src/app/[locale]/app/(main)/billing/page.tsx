'use client';

import { useState } from 'react';
import { Check, CreditCard } from 'lucide-react';
import { CreditBadge } from '@/components/ui/CreditBadge';
import { useTranslations } from 'next-intl';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '990',
    credits: 200,
    packs: 4,
    icon: '🌱',
    color: '#4D9EFF',
    features: [
      'credits',
      'packs',
      'scriptLab',
      'storyboard',
      'delivery',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '2 490',
    credits: 840,
    packs: 16,
    icon: '⚡',
    color: '#00FFCC',
    popular: true,
    features: [
      'credits',
      'packs',
      'scriptLabAi',
      'storyboardRegen',
      'platforms',
      'carousel',
      'priority',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '6 990',
    credits: 3000,
    packs: 60,
    icon: '🚀',
    color: '#9B5FFF',
    features: [
      'everythingPro',
      'credits',
      'packs',
      'byok',
      'autoposting',
      'team',
      'onboarding',
      'support',
    ],
  },
];

const TOP_UP_OPTIONS = [
  { credits: 50, price: '290', packKey: 'pack1Label' },
  { credits: 200, price: '990', packKey: 'pack4Label' },
  { credits: 500, price: '2 190', packKey: 'pack10Label' },
];

export default function BillingPage() {
  const t = useTranslations('billing');
  const tc = useTranslations('common');
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [selectedTopUp, setSelectedTopUp] = useState<number | null>(null);

  // Helper for rendering localized price symbols or currency
  const isEn = tc('credits') === 'cr.';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25 mb-1">{t('supertitle')}</p>
          <h1
            className="text-2xl font-black tracking-tighter uppercase gradient-text-gold"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {t('title')}
          </h1>
        </div>
        <CreditBadge credits={840} packs={8} />
      </div>

      {/* Current balance card */}
      <div
        className="rounded-3xl p-5 space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(155,95,255,0.05) 100%)',
          border: '1px solid rgba(212,175,55,0.2)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] text-white/30 uppercase tracking-widest">{t('currentBalance')}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black text-white">840</span>
              <span className="text-sm text-white/40">{t('creditsLabel')}</span>
            </div>
            <p className="text-[10px] text-white/30 mt-1">{t('packsApprox', { n: 8 })}</p>
          </div>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{
              background: 'rgba(212,175,55,0.15)',
              border: '1px solid rgba(212,175,55,0.3)',
            }}
          >
            ⚡
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-[9px] text-white/30 mb-1.5">
            <span>{t('usedThisMonth', { used: 160 })}</span>
            <span>{t('proLimit', { limit: 1000 })}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '16%' }} />
          </div>
        </div>
      </div>

      {/* Quick top-up */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
          {t('topUpTitle')}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {TOP_UP_OPTIONS.map((opt, i) => (
            <button
              key={opt.credits}
              className="rounded-2xl p-3 text-center transition-all hover:scale-105 active:scale-95"
              style={{
                background: selectedTopUp === i ? 'rgba(0,255,204,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${selectedTopUp === i ? 'rgba(0,255,204,0.3)' : 'rgba(255,255,255,0.07)'}`,
              }}
              onClick={() => setSelectedTopUp(i === selectedTopUp ? null : i)}
            >
              <div className="font-black text-sm text-white">{opt.credits} {tc('credits')}</div>
              <div className="text-[9px] text-white/30">{t(opt.packKey as any)}</div>
              <div
                className="text-[11px] font-bold mt-1"
                style={{ color: selectedTopUp === i ? '#00FFCC' : 'rgba(255,255,255,0.5)' }}
              >
                {isEn ? '$' : ''}{opt.price}{!isEn ? ' ₽' : ''}
              </div>
            </button>
          ))}
        </div>
        {selectedTopUp !== null && (
          <button className="btn-primary w-full rounded-2xl py-4 animate-slide-up" style={{ opacity: 1 }}>
            <CreditCard className="w-4 h-4" />
            {t('payBtn', { credits: TOP_UP_OPTIONS[selectedTopUp].credits, price: TOP_UP_OPTIONS[selectedTopUp].price })}
          </button>
        )}
      </div>

      {/* Plans */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
          {t('plansTitle')}
        </p>
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <div
              key={plan.id}
              className="rounded-2xl p-4 space-y-3 cursor-pointer transition-all hover:scale-[1.01]"
              style={{
                background: isSelected ? `${plan.color}08` : 'rgba(11,18,41,0.5)',
                border: `1.5px solid ${isSelected ? plan.color + '35' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: isSelected ? `0 0 30px ${plan.color}12` : undefined,
              }}
              onClick={() => setSelectedPlan(plan.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                    style={{
                      background: `${plan.color}15`,
                      border: `1px solid ${plan.color}25`,
                    }}
                  >
                    {plan.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-white">{plan.name}</span>
                      {plan.popular && (
                        <span
                          className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                          style={{ background: `${plan.color}20`, color: plan.color }}
                        >
                          {t('popular')}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/30">{plan.credits} {tc('credits')} · {plan.packs} {tc('packs')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-sm text-white">{isEn ? '$' : ''}{plan.price}{!isEn ? ' ₽' : ''}</div>
                  <div className="text-[9px] text-white/20">{t('perMonth')}</div>
                </div>
              </div>

              {isSelected && (
                <div className="space-y-1.5 animate-slide-up" style={{ opacity: 1 }}>
                  {plan.features.map((featKey) => (
                    <div key={featKey} className="flex items-center gap-2">
                      <Check className="w-3 h-3 shrink-0" style={{ color: plan.color }} />
                      <span className="text-[11px] text-white/50">
                        {t(`features.${featKey}` as any, { n: featKey === 'credits' ? plan.credits : plan.packs })}
                      </span>
                    </div>
                  ))}
                  <button
                    className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest mt-3 transition-all hover:scale-[1.02]"
                    style={{
                      background: `linear-gradient(135deg, ${plan.color}CC, ${plan.color})`,
                      color: '#020408',
                      boxShadow: `0 0 25px ${plan.color}35`,
                    }}
                  >
                    {t('subscribeTo', { plan: plan.name })}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
