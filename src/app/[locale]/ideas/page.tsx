'use client';

import { useRouter } from 'next/navigation';
import { TrendingUp, Zap, ArrowRight } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

export default function IdeasPage() {
  const t = useTranslations('ideas');
  const common = useTranslations('common');
  const mocks = useTranslations('mocks');
  const locale = useLocale();
  const router = useRouter();

  const handleToScript = (topic: string) => {
    router.push(`/${locale}/projects/new/script?topic=${encodeURIComponent(topic)}`);
  };

  const IDEAS = [
    {
      id: 1,
      topic: mocks('idea1Topic'),
      viral: 91,
      reason: mocks('idea1Reason'),
      tag: t('tagTrend'),
      tagColor: '#00FFCC',
      category: t('catAuto'),
      timeText: t('timeLabel', { n: 2 }),
    },
    {
      id: 2,
      topic: mocks('idea2Topic'),
      viral: 84,
      reason: mocks('idea2Reason'),
      tag: t('tagViral'),
      tagColor: '#D4AF37',
      category: t('catAuto'),
      timeText: t('timeSecLabel', { n: 90 }),
    },
    {
      id: 3,
      topic: mocks('idea3Topic'),
      viral: 78,
      reason: mocks('idea3Reason'),
      tag: t('tagEver'),
      tagColor: '#9B5FFF',
      category: t('catFinance'),
      timeText: t('timeLabel', { n: 3 }),
    },
    {
      id: 4,
      topic: mocks('idea4Topic'),
      viral: 72,
      reason: mocks('idea4Reason'),
      tag: t('tagSeasonal'),
      tagColor: '#4D9EFF',
      category: t('catAuto'),
      timeText: t('timeLabel', { n: 2 }),
    },
    {
      id: 5,
      topic: mocks('idea5Topic'),
      viral: 88,
      reason: mocks('idea5Reason'),
      tag: t('tagViral'),
      tagColor: '#D4AF37',
      category: t('catAuto'),
      timeText: t('timeLabel', { n: 2 }),
    },
  ];

  const categories = [
    t('filterAll'),
    t('filterTrend'),
    t('filterViral'),
    t('filterEver')
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25">
          {t('supertitle')}
        </p>
        <h1
          className="text-2xl font-black tracking-tighter uppercase"
          style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
        >
          <span className="gradient-text-gold">{t('title')}</span>{' '}
          <span className="text-white/50">{t('titleAccent')}</span>
        </h1>
        <p className="text-[11px] text-white/30">
          {t('subtitle')}
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
        {categories.map((filter, i) => (
          <button
            key={filter}
            className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
            style={{
              background: i === 0 ? 'rgba(0,255,204,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${i === 0 ? 'rgba(0,255,204,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: i === 0 ? '#00FFCC' : 'rgba(255,255,255,0.35)',
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Ideas list */}
      <div className="space-y-3">
        {IDEAS.map((idea, i) => (
          <div
            key={idea.id}
            className="card-idea p-4 space-y-3 animate-slide-up opacity-0"
            style={{
              animationFillMode: 'forwards',
              animationDelay: `${0.05 + i * 0.07}s`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                {/* Tags row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{
                      background: `${idea.tagColor}12`,
                      border: `1px solid ${idea.tagColor}28`,
                      color: idea.tagColor,
                    }}
                  >
                    {idea.tag}
                  </span>
                  <span
                    className="text-[8px] text-white/25 px-2 py-0.5 rounded-full"
                    style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    {idea.category}
                  </span>
                  <span className="text-[8px] text-white/20">{idea.timeText}</span>
                </div>

                <p className="text-sm font-semibold text-white/85 leading-snug">
                  &ldquo;{idea.topic}&rdquo;
                </p>
              </div>

              {/* Viral score */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm"
                  style={{
                    background: `linear-gradient(135deg, ${idea.tagColor}18, ${idea.tagColor}06)`,
                    border: `1.5px solid ${idea.tagColor}28`,
                    color: idea.tagColor,
                  }}
                >
                  {idea.viral}%
                </div>
                <span className="text-[7px] text-white/20 uppercase tracking-widest mt-1">{t('viralLabel')}</span>
              </div>
            </div>

            <p className="text-[11px] text-white/35 leading-relaxed">{idea.reason}</p>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => handleToScript(idea.topic)}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-transform hover:scale-105 active:scale-95"
                style={{ color: idea.tagColor }}
              >
                <TrendingUp className="w-3 h-3" />
                {common('toScript')}
              </button>
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-bold transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.3)',
                  }}
                >
                  {common('later')}
                </button>
                <button
                  onClick={() => handleToScript(idea.topic)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/10"
                  style={{
                    background: 'rgba(0,255,204,0.08)',
                    border: '1px solid rgba(0,255,204,0.2)',
                    color: '#00FFCC',
                  }}
                >
                  <Zap className="w-2.5 h-2.5 fill-current" />
                  {common('quickLaunch')}
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
