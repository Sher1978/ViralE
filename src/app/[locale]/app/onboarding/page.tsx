'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight, ChevronLeft, ChevronRight, Fingerprint, Sparkles, Check, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DnaAnswers {
  sphere: string;
  audience: string;
  painPoint: string;
  approach: string;
  goal: string;
  tone: string;
  advantage: string;
}

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const common = useTranslations('common');
  const locale = useLocale();

  const [step, setStep] = useState(0); // 0-6: Questions, 7: Summary Review
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<DnaAnswers>({
    sphere: '',
    audience: '',
    painPoint: '',
    approach: '',
    goal: '',
    tone: '',
    advantage: '',
  });

  const questions: { id: keyof DnaAnswers; label: string; placeholder: string; hint: string }[] = [
    { 
       id: 'sphere', 
       label: locale === 'ru' ? '1. Ниша и Сфера' : '1. Niche & Sphere', 
       placeholder: locale === 'ru' ? 'Напр: Технологии, Лайфстайл, Автомобили, Психология, Финансы...' : 'e.g. Tech, Lifestyle, Cars, Psychology, Finance...',
       hint: locale === 'ru' ? 'О чем ваш контент в двух словах?' : 'What is your content about in a few words?'
    },
    { 
       id: 'audience', 
       label: locale === 'ru' ? '2. Ваша Аудитория' : '2. Your Audience', 
       placeholder: locale === 'ru' ? 'Кто ваши идеальные зрители? Напр: начинающие предприниматели, автолюбители...' : 'Who are your ideal viewers? e.g. beginner entrepreneurs, car enthusiasts...',
       hint: locale === 'ru' ? 'Опишите их боли, желания и возраст.' : 'Describe their pains, desires, and age.'
    },
    { 
       id: 'painPoint', 
       label: locale === 'ru' ? '3. Главная Проблема' : '3. Main Problem', 
       placeholder: locale === 'ru' ? 'Какую проблему решает ваш контент? Почему зрители должны вас смотреть?' : 'What problem does your content solve? Why should they watch you?',
       hint: locale === 'ru' ? 'С какими ключевыми трудностями сталкивается ваша аудитория?' : 'What key difficulties does your audience face?'
    },
    { 
       id: 'approach', 
       label: locale === 'ru' ? '4. Секретный Соус' : '4. Secret Sauce', 
       placeholder: locale === 'ru' ? 'В чем ваша уникальность? Ваш авторский стиль, авторский метод или харизма.' : 'What makes you unique? Your author style, author method, or charisma.',
       hint: locale === 'ru' ? 'Почему зритель выберет именно вас, а не конкурентов?' : 'Why will the viewer choose you over competitors?'
    },
    { 
       id: 'goal', 
       label: locale === 'ru' ? '5. Цель Контента' : '5. Content Goal', 
       placeholder: locale === 'ru' ? 'Продажи услуг, рост лояльности, узнаваемость бренда или большие охваты?' : 'Sales, loyalty, brand awareness, or high reach?',
       hint: locale === 'ru' ? 'Какой бизнес-результат вы хотите получить от ваших видео?' : 'What business result do you want from your videos?'
    },
    { 
       id: 'tone', 
       label: locale === 'ru' ? '6. Тон Голоса' : '6. Tone of Voice', 
       placeholder: locale === 'ru' ? 'Ирония, твердая экспертность, драйв, дружеская беседа?' : 'Irony, expert authority, high drive, friendly talk?',
       hint: locale === 'ru' ? 'Как вы общаетесь со своим зрителем?' : 'How do you communicate with your audience?'
    },
    { 
       id: 'advantage', 
       label: locale === 'ru' ? '7. Финальный Оффер' : '7. Final Offer', 
       placeholder: locale === 'ru' ? 'Какое ваше главное предложение для клиентов? Почему они купят именно у вас?' : 'What is your main offer? Why will they buy from you?',
       hint: locale === 'ru' ? 'Ваше ключевое конкурентное преимущество.' : 'Your main competitive advantage.'
    },
  ];

  const currentQuestion = questions[step];

  const handleTextChange = (value: string) => {
    if (step <= 6) {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: value
      }));
    }
  };

  const goNext = () => {
    if (step < 7) {
      setStep(s => s + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setStep(s => s - 1);
    }
  };

  const handleSkip = () => {
    const glob = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
    const skipWarningText = locale === 'ru'
      ? 'Без ДНК стиль ваших видео и текстов будет стандартным. Мы рекомендуем заполнить её позже в профиле. Пропустить?'
      : 'Without brand DNA, your scripts and videos will use default settings. We recommend calibrating it later. Skip?';

    if (glob && glob.confirm && glob.confirm(skipWarningText)) {
      setIsSubmitting(true);
      fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale })
      }).then(res => {
        if (res.ok) (globalThis as any).window.location.href = `/${locale}/app/ideas`;
        else (globalThis as any).alert?.('Error skipping DNA');
      }).finally(() => setIsSubmitting(false));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Submit answers to profiles to complete onboarding & generate shadow
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          locale
        })
      });
      
      if (response.ok) {
        (globalThis as any).window.location.href = `/${locale}/app/ideas`;
      } else {
        const errorData = await response.json();
        (globalThis as any).alert?.(`Error: ${errorData.error || 'Failed to finalize onboarding'}`);
      }
    } catch (err: any) {
      console.error('Finalize onboarding failed:', err);
      (globalThis as any).alert?.(`System Error: ${err.message || 'Check your connection'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const percent = step === 7 ? 100 : Math.round(((step + 1) / 7) * 100);

  return (
    <div className="flex flex-col min-h-screen py-6 px-4 md:px-8 space-y-6 animate-fade-in justify-center max-w-2xl mx-auto">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.15)]">
            <Fingerprint className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">
              {locale === 'ru' ? 'Калибровка ДНК' : 'DNA Calibration'}
            </h1>
            <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest leading-none mt-1 animate-pulse">
              {step === 7 
                ? (locale === 'ru' ? 'Финальный обзор' : 'Final Review')
                : (locale === 'ru' ? `Вопрос ${step + 1} из 7` : `Question ${step + 1} of 7`)}
            </p>
          </div>
        </div>

        {step < 7 && (
          <button
            onClick={handleSkip}
            className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors"
          >
            {locale === 'ru' ? 'Пропустить пока' : 'Skip for now'}
          </button>
        )}
      </div>

      {/* Sleek Progress Bar */}
      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative shrink-0">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
        />
      </div>

      {/* Main wizard cards container */}
      <div className="flex-1 flex flex-col justify-center min-h-[360px]">
        <AnimatePresence mode="wait">
          {step <= 6 ? (
            <motion.div
              key={`question-${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-black italic uppercase text-white tracking-tight flex items-center gap-2">
                  <Sparkles size={18} className="text-purple-400 animate-pulse" />
                  {currentQuestion.label}
                </h2>
                <p className="text-[11px] text-white/40 font-bold uppercase tracking-wider pl-6">
                  {currentQuestion.hint}
                </p>
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 rounded-[2rem] bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-30 blur-lg group-focus-within:opacity-100 transition-opacity" />
                <textarea
                  autoFocus
                  value={answers[currentQuestion.id]}
                  onChange={e => handleTextChange((e.target as any).value)}
                  placeholder={currentQuestion.placeholder}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      goNext();
                    }
                  }}
                  className="w-full min-h-[180px] bg-black/40 border border-white/10 rounded-[2rem] p-5 text-sm leading-relaxed text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none font-medium backdrop-blur-xl relative z-10 transition-all"
                />
              </div>

              <p className="text-[8px] text-white/20 font-black uppercase tracking-widest text-right pl-1">
                {locale === 'ru' ? 'Ctrl + Enter для перехода' : 'Ctrl + Enter to proceed'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="summary-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2 py-2">
                <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">
                  {locale === 'ru' ? 'КАЛИБРОВКА ЗАВЕРШЕНА' : 'CALIBRATION COMPLETE'}
                </h2>
                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">
                  {locale === 'ru' 
                    ? 'Проверьте ваши ответы перед синтезом ДНК бренда' 
                    : 'Verify your answers before synthesizing brand DNA'}
                </p>
              </div>

              <div className="grid gap-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setStep(idx)}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-500/30 hover:bg-white/[0.04] text-left transition-all group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-purple-400/60 leading-none mb-2">
                      {q.label}
                    </p>
                    <p className="text-xs text-white/80 line-clamp-2 leading-relaxed font-medium">
                      {answers[q.id] || (locale === 'ru' ? 'Не заполнено (будут использованы настройки по умолчанию)' : 'Not filled (default settings will be used)')}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 shrink-0 pt-4 border-t border-white/5">
        {step > 0 && (
          <button
            onClick={goBack}
            className="flex items-center justify-center gap-1.5 px-6 py-4 rounded-[1.5rem] bg-white/5 border border-white/10 text-white/60 hover:text-white font-black uppercase tracking-widest text-[10px] transition-all"
          >
            <ChevronLeft size={14} />
            {common('back')}
          </button>
        )}

        {step < 7 ? (
          <button
            onClick={goNext}
            className="flex-1 flex items-center justify-center gap-1.5 py-4 rounded-[1.5rem] bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-purple-500/10 transition-all hover:scale-[1.01] active:scale-95"
          >
            {common('next')}
            <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.5rem] bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-40"
          >
            {isSubmitting ? (
              <span className="animate-pulse">{locale === 'ru' ? 'СИНТЕЗ ДНК...' : 'SYNTHESIZING DNA...'}</span>
            ) : (
              <>
                <Sparkles size={14} />
                <span>{locale === 'ru' ? 'ЗАПУСТИТЬ VIRAL ENGINE' : 'LAUNCH VIRAL ENGINE'}</span>
              </>
            )}
          </button>
        )}
      </div>

      {step === 0 && (
        <div className="text-center pt-2 shrink-0">
          <p className="text-[9px] text-white/20 font-bold uppercase tracking-wider">
            {t('alreadyHaveAccount')}? {' '}
            <Link href={`/${locale}/auth`} className="text-purple-400 hover:text-purple-300 transition-colors underline">
              {t('signInHere')}
            </Link>
          </p>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.01);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.2);
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
