'use client';

import React, { useState, useEffect } from 'react';
import { X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function PwaInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [locale, setLocale] = useState<'ru' | 'en'>('ru');

  useEffect(() => {
    const globalObj = globalThis as any;
    if (typeof globalObj.window === 'undefined') return;

    const win = globalObj.window;
    
    // 1. Detect if we are on iOS device
    const userAgent = win.navigator?.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !win.MSStream;

    // 2. Detect if app is already running in PWA (standalone) mode
    const isStandalone = 
      win.navigator?.standalone === true || 
      (win.matchMedia && win.matchMedia('(display-mode: standalone)').matches);

    // 3. Check if user dismissed the prompt in this session/localStorage
    const storage = globalObj.localStorage;
    const isDismissed = storage ? storage.getItem('pwa_prompt_dismissed') === 'true' : false;

    // Set locale based on URL pathname
    const path = win.location?.pathname || '';
    if (path.startsWith('/ru')) {
      setLocale('ru');
    } else {
      // Default to English if not explicitly Russian
      setLocale('en');
    }

    // Show prompt only if on iOS, not installed (not standalone), and not previously dismissed
    if (isIOS && !isStandalone && !isDismissed) {
      // Debounce slightly to show after the main page loading animation
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    const globalObj = globalThis as any;
    if (globalObj.localStorage) {
      globalObj.localStorage.setItem('pwa_prompt_dismissed', 'true');
    }
  };

  const t = {
    ru: {
      title: 'Установите как приложение',
      subtitle: 'Запустите Viral Studio на весь экран для максимального удобства записи видео.',
      step1: 'Нажмите кнопку «Поделиться»',
      step1Desc: 'на нижней панели браузера Safari.',
      step2: 'Выберите «На экран «Домой»»',
      step2Desc: 'в открывшемся системном списке функций.',
      step3: 'Нажмите «Добавить»',
      step3Desc: 'в верхнем правом углу экрана.',
      close: 'Понятно',
    },
    en: {
      title: 'Install as an App',
      subtitle: 'Run Viral Studio in full screen for the best video recording experience.',
      step1: 'Tap the "Share" button',
      step1Desc: 'on the bottom toolbar of Safari browser.',
      step2: 'Select "Add to Home Screen"',
      step2Desc: 'from the scrolling system menu list.',
      step3: 'Tap "Add"',
      step3Desc: 'in the top right corner of the screen.',
      close: 'Got it',
    }
  }[locale];

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-6 inset-x-4 z-[9999] mx-auto max-w-[460px] overflow-hidden rounded-[24px] border border-white/10 bg-black/80 p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
        >
          {/* Decorative Top Glow */}
          <div className="absolute -top-10 left-1/2 h-14 w-[160px] -translate-x-1/2 rounded-full bg-purple-500/20 blur-xl" />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 transition-colors hover:text-white active:bg-white/10"
          >
            <X size={14} />
          </button>

          {/* Content Head */}
          <div className="flex items-start gap-3.5 mb-4 pr-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/25">
              <Smartphone size={20} className="text-purple-400 animate-pulse" />
            </div>
            <div>
              <h4 className="text-[14px] font-black uppercase tracking-wider text-white">
                {t.title}
              </h4>
              <p className="text-[11px] font-medium text-white/55 mt-0.5 leading-relaxed">
                {t.subtitle}
              </p>
            </div>
          </div>

          {/* Instruction steps */}
          <div className="space-y-3.5 border-t border-white/5 pt-3.5 mb-4">
            {/* Step 1 */}
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40">
                <Share size={12} className="text-purple-400" />
              </div>
              <div className="text-[11px] leading-relaxed">
                <span className="font-extrabold text-white">{t.step1} </span>
                <span className="text-white/40">{t.step1Desc}</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40">
                <PlusSquare size={12} className="text-purple-400" />
              </div>
              <div className="text-[11px] leading-relaxed">
                <span className="font-extrabold text-white">{t.step2} </span>
                <span className="text-white/40">{t.step2Desc}</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40">
                <span className="text-[10px] font-black text-purple-400">ADD</span>
              </div>
              <div className="text-[11px] leading-relaxed">
                <span className="font-extrabold text-white">{t.step3} </span>
                <span className="text-white/40">{t.step3Desc}</span>
              </div>
            </div>
          </div>

          {/* Accept Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-500/20 text-white text-[11px] font-black uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg shadow-purple-500/10"
          >
            {t.close}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
