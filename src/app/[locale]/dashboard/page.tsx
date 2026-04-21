'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Sparkles, TrendingUp, ArrowRight, Search, Link2, Mic } from 'lucide-react';
import { CreditBadge } from '@/components/ui/CreditBadge';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const common = useTranslations('common');
  const mocks = useTranslations('mocks');
  const locale = useLocale();

  const IDEAS = [
    {
      id: 1,
      topic: mocks('idea1Topic'),
      viral: 91,
      reason: mocks('idea1Reason'),
      tag: t('tagTrend'),
      tagColor: '#00FFCC',
    },
    {
      id: 2,
      topic: mocks('idea2Topic'),
      viral: 84,
      reason: mocks('idea2Reason'),
      tag: t('tagViral'),
      tagColor: '#D4AF37',
    },
    {
      id: 3,
      topic: mocks('idea3Topic'),
      viral: 78,
      reason: mocks('idea3Reason'),
      tag: t('tagEver'),
      tagColor: '#9B5FFF',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-1">{t('supertitle')}</p>
          <h1
            className="text-2xl font-black tracking-tighter uppercase"
            style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
          >
            {t('title')}
            <br />
            <span className="gradient-text-gold">{t('titleAccent')}</span>
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <CreditBadge credits={840} packs={8} />
          <Link href={`/${locale}/billing`}>
            <span className="text-[9px] text-white/20 hover:text-white/40 transition-colors uppercase tracking-widest">
              {common('topUp')} →
            </span>
          </Link>
        </div>
      </div>

      {/* Main Input */}
      <div
        className="rounded-3xl p-5 space-y-4"
        style={{
          background: 'rgba(11, 18, 41, 0.6)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">
          {t('inputTitle')}
        </label>

        {/* Input modes */}
        <div className="flex gap-2">
          {[
            { icon: Mic, label: t('modeTopic') },
            { icon: Link2, label: t('modeLink') },
            { icon: Search, label: t('modeSearch') },
          ].map(({ icon: Icon, label }, i) => (
            <button
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-200"
              style={{
                background: i === 0 ? 'rgba(0,255,204,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${i === 0 ? 'rgba(0,255,204,0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: i === 0 ? '#00FFCC' : 'rgba(255,255,255,0.3)',
              }}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Text input */}
        <div className="relative">
          <textarea
            className="input-core resize-none"
            rows={3}
            placeholder={t('placeholder')}
          />
        </div>

        {/* Generate button */}
        <Link href={`/${locale}/projects/new`}>
          <button className="btn-primary w-full rounded-2xl py-4 text-sm">
            <Sparkles className="w-4 h-4" />
            {t('generateBtn')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">
          {t('aiSection')}
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {/* Ideas */}
      <div className="space-y-3">
        {IDEAS.map((idea, i) => (
          <div
            key={idea.id}
            className="animate-slide-up opacity-0 card-idea p-4 space-y-3"
            style={{
              animationFillMode: 'forwards',
              animationDelay: `${0.1 + i * 0.08}s`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                {/* Tag */}
                <div className="flex items-center gap-2">
                  <span
                    className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{
                      background: `${idea.tagColor}15`,
                      border: `1px solid ${idea.tagColor}30`,
                      color: idea.tagColor,
                    }}
                  >
                    {idea.tag}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white/85 leading-snug">
                  &ldquo;{idea.topic}&rdquo;
                </p>
              </div>

              {/* Viral score */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base"
                  style={{
                    background: `linear-gradient(135deg, ${idea.tagColor}18, ${idea.tagColor}08)`,
                    border: `1.5px solid ${idea.tagColor}30`,
                    color: idea.tagColor,
                  }}
                >
                  {idea.viral}%
                </div>
                <span className="text-[7px] text-white/20 uppercase tracking-widest mt-1">{t('viralLabel')}</span>
              </div>
            </div>

            <p className="text-[11px] text-white/35 leading-relaxed">{idea.reason}</p>

            {/* Action */}
            <button
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-200 hover:text-white/70"
              style={{ color: idea.tagColor }}
            >
              <TrendingUp className="w-3 h-3" />
              {t('expandBtn')}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Link to Ideas */}
      <Link href={`/${locale}/ideas`}>
        <div
          className="flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all hover:scale-[1.02]"
          style={{
            border: '1px dashed rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          {mocks('viewAllIdeas')}
        </div>
      </Link>
    </div>
  );
}
