'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight, Mic, Link2, MessageSquare, Check, Dna } from 'lucide-react';

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const common = useTranslations('common');
  const locale = useLocale();
  
  const [step, setStep] = useState(0);
  const [dnaMode, setDnaMode] = useState<'links' | 'chat' | 'import'>('links');
  const [dnaText, setDnaText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const STEPS_META = [
    { id: 'dna', icon: '🧬' },
    { id: 'avatar', icon: '🎬' },
    { id: 'telegram', icon: '✈️' },
  ];

  const goNext = () => {
    if (step < STEPS_META.length - 1) setStep(s => s + 1);
  };

  return (
    <div className="flex flex-col min-h-screen py-12 space-y-8 animate-fade-in">
      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {STEPS_META.map((s, i) => (
          <div
            key={s.id}
            className="transition-all duration-300"
            style={{
              width: i === step ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: i < step
                ? 'rgba(0,255,204,0.4)'
                : i === step
                  ? '#00FFCC'
                  : 'rgba(255,255,255,0.12)',
              boxShadow: i === step ? '0 0 10px rgba(0,255,204,0.5)' : undefined,
            }}
          />
        ))}
      </div>

      {/* Step content */}
      {step === 0 && (
        <div className="space-y-6 animate-slide-up" style={{ opacity: 1 }}>
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full animate-pulse" />
              <Dna className="w-16 h-16 text-cyan-400 relative z-10 mx-auto" />
            </div>
            <h2
              className="text-4xl font-black tracking-tighter uppercase gradient-text-cosmic"
              style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
            >
              {t('step1Title')}
            </h2>
            <p className="text-sm text-white/40 max-w-xs mx-auto">
              {t('step1Sub')}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              { id: 'links', icon: Link2, label: t('step1ModeLinks') },
              { id: 'chat', icon: MessageSquare, label: t('step1ModeChat') },
              { id: 'import', icon: ArrowRight, label: t('step1ModeImport') },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold transition-all"
                style={{
                  background: dnaMode === id ? 'rgba(212,175,55,0.15)' : 'transparent',
                  border: `1px solid ${dnaMode === id ? 'rgba(212,175,55,0.3)' : 'transparent'}`,
                  color: dnaMode === id ? '#D4AF37' : 'rgba(255,255,255,0.3)',
                }}
                onClick={() => setDnaMode(id as 'links' | 'chat' | 'import')}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {dnaMode === 'links' && (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="relative">
                  <div
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black"
                    style={{ color: 'rgba(212,175,55,0.5)' }}
                  >
                    {n}
                  </div>
                  <input
                    className="input-core pl-8 text-sm"
                    placeholder={t('step1LinkPlaceholder', { n })}
                  />
                </div>
              ))}
            </div>
          )}

          {dnaMode === 'chat' && (
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{ background: 'rgba(11,18,41,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="space-y-2">
                <div className="flex justify-start">
                  <div
                    className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm text-white/70 max-w-[85%]"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    {t('step1AiGreeting')}
                  </div>
                </div>
                <div className="flex justify-end">
                  <div
                    className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm max-w-[85%]"
                    style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)', color: 'rgba(255,255,255,0.85)' }}
                  >
                    {t('step1AiAnswer')}
                  </div>
                </div>
              </div>
              <input
                className="input-core text-sm py-3"
                placeholder={t('step1ChatPlaceholder')}
              />
            </div>
          )}

          {dnaMode === 'import' && (
            <div className="space-y-4">
              <div 
                className="p-4 rounded-2xl space-y-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(212,175,55,0.3)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-gold/60 tracking-wider">
                    {t('step1MagicScriptLabel')}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(t('step1MagicPrompt'));
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    className="text-[10px] font-bold text-gold flex items-center gap-1 hover:brightness-125 transition-all"
                  >
                    {isCopied ? <Check className="w-3 h-3" /> : null}
                    {isCopied ? 'Copied!' : t('step1MagicScriptCta')}
                  </button>
                </div>
                <p className="text-[10px] text-white/30 italic line-clamp-2">
                  {t('step1MagicPrompt')}
                </p>
              </div>

              <textarea
                className="input-core text-sm py-4 min-h-[160px] resize-none"
                placeholder={t('step1ImportPlaceholder')}
                value={dnaText}
                onChange={(e) => setDnaText(e.target.value)}
              />
            </div>
          )}

          {/* Skip DNA Option */}
          <div className="pt-4 border-t border-white/5 space-y-4">
            <button
              onClick={() => {
                if (confirm(t('skipWarning'))) {
                  setIsSubmitting(true);
                  fetch('/api/onboarding', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ locale })
                  }).then(res => {
                    if (res.ok) window.location.href = `/${locale}/app/dashboard`;
                    else alert('Error skipping DNA');
                  }).finally(() => setIsSubmitting(false));
                }
              }}
              className="w-full py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white/60 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-3 h-3 opacity-30" />
              {t('skipDna')}
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6 animate-slide-up" style={{ opacity: 1 }}>
          <div className="text-center space-y-2">
            <span className="text-5xl">🎬</span>
            <h2
              className="text-2xl font-black tracking-tighter uppercase gradient-text-mint"
              style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
            >
              {t('step2Title')}
            </h2>
            <p className="text-sm text-white/40 max-w-xs mx-auto">
              {t('step2Sub')}
            </p>
          </div>

          <div
            className="rounded-3xl overflow-hidden relative"
            style={{ aspectRatio: '9/16', maxHeight: '300px', background: 'rgba(11,18,41,0.8)', border: '2px dashed rgba(0,255,204,0.2)' }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse-glow"
                style={{ background: 'rgba(0,255,204,0.1)', border: '2px solid rgba(0,255,204,0.3)' }}
              >
                <Mic className="w-8 h-8" style={{ color: '#00FFCC' }} />
              </div>
              <p className="text-sm text-white/40">{t('step2Hint')}</p>
              <p className="text-[10px] text-white/20">{t('step2Tip')}</p>
            </div>
          </div>

          <div
            className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}
          >
            <span className="text-lg shrink-0">💡</span>
            <p className="text-[10px] text-white/40 leading-relaxed">
              {t('step2TipText')}
            </p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-slide-up" style={{ opacity: 1 }}>
          <div className="text-center space-y-2">
            <span className="text-5xl">✈️</span>
            <h2
              className="text-2xl font-black tracking-tighter uppercase"
              style={{
                fontFamily: 'var(--font-space-grotesk), sans-serif',
                background: 'linear-gradient(135deg, #4D9EFF, #00FFCC)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {t('step3Title')}
            </h2>
            <p className="text-sm text-white/40 max-w-xs mx-auto">
              {t('step3Sub')}
            </p>
          </div>

          <div
            className="rounded-3xl p-6 space-y-5 text-center"
            style={{ background: 'rgba(11,18,41,0.6)', border: '1px solid rgba(77,158,255,0.2)' }}
          >
            <div
              className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center text-4xl"
              style={{ background: 'rgba(77,158,255,0.12)', border: '1px solid rgba(77,158,255,0.2)' }}
            >
              🤖
            </div>
            <div>
              <p className="text-sm font-bold text-white/70">{t('step3BotName')}</p>
              <p className="text-[11px] text-white/30 mt-1">{t('step3BotLabel')}</p>
            </div>
            <button
              onClick={() => window.open('https://t.me/viral_engine_bot', '_blank')}
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #4D9EFF, #0099CC)',
                color: 'white',
                boxShadow: '0 0 30px rgba(77,158,255,0.3)',
              }}
            >
              {t('step3Cta')}
            </button>
            <p className="text-[10px] text-white/20">{t('step3Hint')}</p>
          </div>

          {/* Done state */}
          <div
            className="flex items-center gap-2 p-3 rounded-2xl animate-slide-up"
            style={{
              background: 'rgba(0,255,204,0.06)',
              border: '1px solid rgba(0,255,204,0.15)',
              opacity: 1,
            }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(0,255,204,0.2)' }}
            >
              <Check className="w-3 h-3 text-green-400" />
            </div>
            <span className="text-[11px] text-white/40">{t('step3Done')}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button
            className="btn-ghost flex-1 rounded-2xl py-4"
            onClick={() => setStep(s => s - 1)}
          >
            {common('back')}
          </button>
        )}

        {step < STEPS_META.length - 1 ? (
          <button
            className="btn-primary flex-1 rounded-2xl py-4"
            disabled={dnaMode === 'import' && !dnaText}
            onClick={goNext}
          >
            {common('next')}
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button 
            className="btn-gold flex-1 rounded-2xl py-4 text-sm disabled:opacity-50"
            disabled={isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              try {
                const response = await fetch('/api/onboarding', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    dnaPrompt: dnaMode === 'import' ? dnaText : undefined,
                    answers: dnaMode !== 'import' ? { mode: dnaMode } : undefined,
                    locale
                  })
                });
                
                if (response.ok) {
                  window.location.href = `/${locale}/app/dashboard`;
                } else {
                  const errorData = await response.json();
                  alert(`Error: ${errorData.error || 'Failed to finalize onboarding'}`);
                }
              } catch (err: any) {
                console.error('Finalize onboarding failed:', err);
                alert(`System Error: ${err.message || 'Check your connection'}`);
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? common('loading') : t('launch')}
          </button>
        )}
      </div>

      {step === 0 && (
        <div className="text-center pt-4">
          <p className="text-[10px] text-white/20">
            {t('alreadyHaveAccount')}? {' '}
            <Link href={`/${locale}/auth`} className="text-gold/40 hover:text-gold transition-colors underline">
              {t('signInHere')}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
