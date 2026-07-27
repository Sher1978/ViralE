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
      accent: '#10b981',
      badge: locale === 'ru' ? 'ШАГ 1 ИЗ 4' : 'STEP 1 OF 4',
      title: locale === 'ru' ? '💡 Матрица Идей & AI-Тренды' : '💡 Ideas Matrix & AI Trends',
      subtitle: locale === 'ru' ? 'Генерация виральных тем под вашу ДНК' : 'Generating viral topics based on your DNA',
      description: locale === 'ru' 
        ? 'ИИ непрерывно анализирует вашу экспертную «Цифровую ДНК» и генерирует уникальные концепты роликов для Reels, Shorts и TikTok. Просто нажмите на любую идею — и ИИ моментально напишет готовый сценарий!'
        : 'AI continuously analyzes your expert Digital DNA to generate unique video concepts for Reels, Shorts, and TikTok. Just click any idea and the AI will craft a complete script instantly!',
      highlightText: locale === 'ru' ? '⚡ Создание сценария за 1 клик' : '⚡ 1-Click Script Generation'
    },
    {
      icon: Clapperboard,
      accent: '#ec4899',
      badge: locale === 'ru' ? 'ШАГ 2 ИЗ 4' : 'STEP 2 OF 4',
      title: locale === 'ru' ? '🎬 4 Варианта Пайплайна Производства' : '🎬 4 Content Production Pipelines',
      subtitle: locale === 'ru' ? 'Выберите подходящий формат создания ролика' : 'Select your preferred video creation format',
      description: locale === 'ru'
        ? 'Студия предлагает 4 готовых пути съемки и генерации:\n• 📱 Телесуфлер — Живая съемка с бегущим текстом на экране.\n• ✨ Фейс Свап — Наложение вашего лица на записанный ролик.\n• 🎬 Фейслесс — Авто-генерация нейро-сцен и кино-футажей.\n• 👤 Аватар Студия — Персональный HeyGen ИИ-диктор.'
        : 'The Studio offers 4 production pathways:\n• 📱 Teleprompter — Live filming with smooth text on camera.\n• ✨ Face Swap — Seamless face replacement on your videos.\n• 🎬 AI Faceless — Auto-generated cinematic B-roll scenes.\n• 👤 Avatar Studio — Custom HeyGen AI digital speaker.',
      highlightText: locale === 'ru' ? '🚀 Телесуфлер • Фейс Свап • Фейслесс • Аватар Студия' : '🚀 Teleprompter • Face Swap • Faceless • Avatar'
    },
    {
      icon: Zap,
      accent: '#a855f7',
      badge: locale === 'ru' ? 'ШАГ 3 ИЗ 4' : 'STEP 3 OF 4',
      title: locale === 'ru' ? '✂️ ИИ-Студия & Автоматический Монтаж' : '✂️ AI Studio & Auto Editing',
      subtitle: locale === 'ru' ? 'Создание видео от раскадровки до рендера' : 'Full production from storyboard to final render',
      description: locale === 'ru'
        ? 'Студия превращает текст в готовый контент: создает пошаговые сцены, подбирает фоны, генерирует обложки и накладывает озвучку. Вам больше не нужна съемочная команда или монтажер!'
        : 'The Studio turns text into complete video: builds scene-by-scene storyboards, generates AI banners, arranges b-roll, and adds voiceovers without needing a filming crew!',
      highlightText: locale === 'ru' ? '✨ Полный цикл производства в одном окне' : '✨ End-to-end AI production'
    },
    {
      icon: Bot,
      accent: '#06b6d4',
      badge: locale === 'ru' ? 'ФИНАЛЬНЫЙ ШАГ' : 'FINAL STEP',
      title: locale === 'ru' ? '📱 Telegram-Бот & Бонус +50 CR' : '📱 Telegram Bot & +50 CR Bonus',
      subtitle: locale === 'ru' ? 'Автоматические дайджесты и генерации' : 'Automated digests & instant notifications',
      description: locale === 'ru'
        ? 'Подключите Telegram-бота за 1 клик! Бот будет присылать вам трендовые сценарии прямо в мессенджер, а вы мгновенно получите +50 CR бонуса на свой аккаунт!'
        : 'Connect our Telegram Bot in 1 click! The bot sends trending ideas directly to your messenger, and you instantly receive +50 CR bonus on your balance!',
      highlightText: locale === 'ru' ? '🎁 +50 CR за привязку бота' : '🎁 +50 CR for connecting Telegram Bot'
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
                  ? (locale === 'ru' ? 'Подключить Telegram (+50 CR)' : 'Connect Telegram (+50 CR)')
                  : (locale === 'ru' ? 'Дальше →' : 'Next →')}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
