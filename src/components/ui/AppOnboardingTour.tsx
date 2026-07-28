'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  Zap, 
  HelpCircle,
  Clapperboard,
  Bot
} from 'lucide-react';
import { useLocale } from 'next-intl';

interface AppOnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectTelegram?: () => void;
}

export function AppOnboardingTour({ isOpen, onClose, onConnectTelegram }: AppOnboardingTourProps) {
  const locale = useLocale();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: Lightbulb,
      accent: '#a855f7',
      badge: locale === 'ru' ? 'ШАГ 1 ИЗ 4' : 'STEP 1 OF 4',
      title: locale === 'ru' ? '💡 Сценарий — 3-Ступенчатый Синтез' : '💡 Script — 3-Stage Synthesis',
      subtitle: locale === 'ru' ? 'Идея → Концепт → Вирусный сценарий' : 'Idea → Concept → Viral Script',
      description: locale === 'ru'
        ? 'На основе вашей Цифровой ДНК — бренд-профиля эксперта — ИИ генерирует бесконечную матрицу тем по принципу «Лестницы Ханта». Вы выбираете одну идею и она превращается в полноценный сценарий через матрицу ТРИЗ. Затем создаётся 6 уникальных вариантов вирусного сценария — выбирайте лучший и переходите к съёмке.'
        : 'Based on your Digital DNA — your expert brand profile — AI generates an infinite idea matrix using Hunt\'s Awareness Ladder. Pick one idea, and it transforms into a full script via the TRIZ matrix. Then 6 unique viral script versions are generated — pick the best and move to production.',
      highlightText: locale === 'ru' ? '⚡ ДНК → Идея → ТРИЗ → 6 Вариантов Сценария' : '⚡ DNA → Idea → TRIZ → 6 Script Variants'
    },
    {
      icon: Clapperboard,
      accent: '#ec4899',
      badge: locale === 'ru' ? 'ШАГ 2 ИЗ 4' : 'STEP 2 OF 4',
      title: locale === 'ru' ? '🎬 Продакшн — 4 Режима Съёмки' : '🎬 Production — 4 Filming Modes',
      subtitle: locale === 'ru' ? 'Запись ролика до 1 минуты удобным способом' : 'Record your video in up to 1 minute your way',
      description: locale === 'ru'
        ? 'Выбирайте удобный формат производства:\n• 📱 Телесуфлёр — Эксперт читает текст с экрана, записывает видео до 1 мин.\n• 🔄 Фейс Своп — Наложение вашего лица на готовый ролик.\n• 🤖 Аватар Студия — Персональный HeyGen ИИ-спикер без камеры.\n• 🎬 Фейслесс — Генерация видео без спикера (B-roll + закадровый голос).'
        : 'Choose your preferred production format:\n• 📱 Teleprompter — Expert reads the script on screen, records video up to 1 min.\n• 🔄 Face Swap — Your face seamlessly overlaid onto a pre-recorded clip.\n• 🤖 Avatar Studio — Personal HeyGen AI speaker, no camera needed.\n• 🎬 Faceless — Video generation without a speaker (B-roll + voiceover).',
      highlightText: locale === 'ru' ? '🚀 Телесуфлёр • Фейс Своп • Аватар • Фейслесс' : '🚀 Teleprompter • Face Swap • Avatar • Faceless'
    },
    {
      icon: Zap,
      accent: '#06b6d4',
      badge: locale === 'ru' ? 'ШАГ 3 ИЗ 4' : 'STEP 3 OF 4',
      title: locale === 'ru' ? '✂️ Монтаж — ИИ на Автопилоте' : '✂️ Editing — AI on Autopilot',
      subtitle: locale === 'ru' ? 'Субтитры, B-Roll и спецэффекты за секунды' : 'Subtitles, B-Roll & effects in seconds',
      description: locale === 'ru'
        ? 'На этапе монтажа ИИ автоматически накладывает субтитры. Вы можете добавить B-roll из бесплатных видеоплатформ, подобрать визуальные сцены-переходы и применить спецэффекты — всё в одном окне без сторонних программ.'
        : 'At the editing stage, AI automatically generates subtitles. You can add B-roll footage from free video platforms, select visual transition scenes, and apply special effects — all within one interface without third-party software.',
      highlightText: locale === 'ru' ? '✨ Авто-субтитры • B-Roll • Эффекты в 1 клик' : '✨ Auto-subtitles • B-Roll • Effects in 1 click'
    },
    {
      icon: Send,
      accent: '#10b981',
      badge: locale === 'ru' ? 'ШАГ 4 ИЗ 4' : 'STEP 4 OF 4',
      title: locale === 'ru' ? '🚀 Экспорт — Контент для 5 Платформ' : '🚀 Export — Content for 5 Platforms',
      subtitle: locale === 'ru' ? 'Видео + тексты + обложки за 5 минут' : 'Video + captions + thumbnails in 5 minutes',
      description: locale === 'ru'
        ? 'Готовый ролик экспортируется вместе с полным пакетом: вирусное текстовое описание, графическая обложка и длинные авторские посты для Instagram, TikTok, YouTube, Facebook, LinkedIn и Threads. Один флоу — контент сразу для пяти соцсетей!'
        : 'The final video exports with a full content package: viral caption, custom thumbnail, and long-form posts for Instagram, TikTok, YouTube, Facebook, LinkedIn, and Threads. One flow — content for five platforms at once!',
      highlightText: locale === 'ru' ? '🌐 Instagram • TikTok • YouTube • LinkedIn • Threads' : '🌐 Instagram • TikTok • YouTube • LinkedIn • Threads'
    }
  ];

  const markTourCompleted = () => {
    const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
    if (globalObj && globalObj.window?.localStorage) {
      globalObj.window.localStorage.setItem('hasCompletedAppTour_v1', 'true');
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      markTourCompleted();
      onClose();
      if (onConnectTelegram) {
        onConnectTelegram();
      }
    }
  };

  if (!isOpen) return null;

  const stepData = steps[currentStep];
  const StepIcon = stepData.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-[#101124] via-[#090a14] to-black border border-white/15 p-6 sm:p-8 shadow-[0_0_60px_rgba(168,85,247,0.25)] z-10"
        >
          {/* Top Header & Skip */}
          <div className="flex items-center justify-between mb-6">
            <span 
              className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border"
              style={{
                borderColor: `${stepData.accent}40`,
                backgroundColor: `${stepData.accent}15`,
                color: stepData.accent
              }}
            >
              {stepData.badge}
            </span>

            <button
              onClick={() => {
                markTourCompleted();
                onClose();
              }}
              className="p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Icon Badge */}
          <div className="flex items-center justify-center mb-6">
            <div 
              className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl relative transition-all duration-300"
              style={{
                background: `radial-gradient(circle, ${stepData.accent}30 0%, rgba(0,0,0,0.8) 100%)`,
                border: `1px solid ${stepData.accent}50`,
                color: stepData.accent
              }}
            >
              <StepIcon size={40} strokeWidth={2} />
              <div 
                className="absolute inset-0 rounded-3xl blur-md opacity-40 -z-10"
                style={{ backgroundColor: stepData.accent }}
              />
            </div>
          </div>

          {/* Step Info */}
          <div className="text-center space-y-3 mb-8">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {stepData.title}
            </h3>
            <p className="text-xs font-bold uppercase tracking-wider text-white/50">
              {stepData.subtitle}
            </p>
            <p className="text-xs text-white/70 leading-relaxed font-medium max-w-md mx-auto pt-1">
              {stepData.description}
            </p>

            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-amber-400 uppercase tracking-wider">
                {stepData.highlightText}
              </span>
            </div>
          </div>

          {/* Step Progress Dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-8 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]'
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs font-black uppercase tracking-wider active:scale-95 transition-all"
              >
                {locale === 'ru' ? 'Назад' : 'Back'}
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-purple-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>
                {currentStep === steps.length - 1 
                  ? (locale === 'ru' ? '🚀 Запустить Viral Engine' : '🚀 Launch Viral Engine')
                  : (locale === 'ru' ? 'Дальше →' : 'Next →')}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
