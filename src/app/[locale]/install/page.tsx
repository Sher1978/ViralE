'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Smartphone, Laptop, Apple, Monitor, ChevronRight, Share, PlusSquare, Download, Check, HelpCircle } from 'lucide-react';
import { useRouter } from '@/navigation';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

type Platform = 'ios' | 'android' | 'desktop';

export default function InstallPage() {
  const router = useRouter();
  const locale = useLocale();
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [installed, setInstalled] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

  useEffect(() => {
    const win = globalThis as any;
    if (typeof win.window === 'undefined') return;

    // Detect standalone mode
    if (win.matchMedia?.('(display-mode: standalone)').matches || win.navigator?.standalone) {
      setInstalled(true);
    }

    // Sniff user agent
    const ua = win.navigator?.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua) && !win.MSStream) {
      setPlatform('ios');
    } else if (/android/i.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);

  const handleTriggerInstall = () => {
    if (platform === 'ios') {
      setTriggerMessage(locale === 'ru' ? 'Используйте меню Safari для установки' : 'Please use Safari share menu to install');
    } else {
      // Trigger global PWA event
      const win = globalThis as any;
      if (win.window) {
        win.window.dispatchEvent(new win.CustomEvent('trigger-pwa-install'));
        setTriggerMessage(locale === 'ru' ? 'Вызов системного окна установки...' : 'Triggering system installation window...');
      }
    }
    setTimeout(() => setTriggerMessage(null), 4000);
  };

  const t = {
    ru: {
      back: 'Назад',
      title: 'Установка PWA Приложения',
      subtitle: 'Запустите Viral Studio на весь экран без рамок браузера для максимального удобства съемки, написания сценариев и AI-генерации.',
      installedTitle: 'Приложение уже установлено! ★',
      installedDesc: 'Вы используете полноэкранную PWA версию Viral Studio. Камера и кэширование оптимизированы на 100%.',
      detected: 'Рекомендуется для вашего устройства',
      installBtn: 'Установить на это устройство',
      tabs: {
        ios: 'Apple iOS',
        android: 'Android OS',
        desktop: 'Desktop ПК',
      },
      benefits: [
        { title: 'Фуллскрин Режим', desc: 'Никаких адресных строк Safari или Chrome. Приложение работает на весь экран как нативное.' },
        { title: 'Оптимизация Камеры', desc: 'Улучшенная стабилизация изображения и запись голоса для видео-суфлера.' },
        { title: 'Мгновенный Запуск', desc: 'Интеллектуальное кэширование ресурсов для быстрой загрузки даже при слабом интернете.' }
      ],
      iosSteps: [
        { icon: Share, title: 'Шаг 1: Кнопка «Поделиться»', desc: 'Нажмите на значок «Поделиться» на нижней или верхней панели браузера Safari.' },
        { icon: PlusSquare, title: 'Шаг 2: «На экран «Домой»»', desc: 'Прокрутите меню вниз и выберите опцию «На экран Домой» (или «Add to Home Screen»).' },
        { icon: Check, title: 'Шаг 3: «Добавить»', desc: 'Подтвердите установку в правом верхнем углу. Иконка появится на вашем рабочем столе!' }
      ],
      androidSteps: [
        { icon: Download, title: 'Шаг 1: Автоматический запрос', desc: 'Нажмите кнопку «Установить на это устройство» выше или примите всплывающее уведомление браузера.' },
        { icon: HelpCircle, title: 'Если окно не появилось', desc: 'Нажмите на три точки в верхнем правом углу Chrome и выберите пункт «Установить приложение».' },
        { icon: Check, title: 'Шаг 2: Готово к работе', desc: 'Иконка добавится на рабочий стол. Запустите приложение для полноэкранного режима.' }
      ],
      desktopSteps: [
        { icon: Download, title: 'Шаг 1: Адресная строка Chrome/Edge', desc: 'Обратите внимание на правый край адресной строки вашего браузера — там появится значок монитора со стрелочкой.' },
        { icon: Check, title: 'Шаг 2: Установить в один клик', desc: 'Нажмите на этот значок и подтвердите установку. Приложение мгновенно откроется в отдельном premium-окне.' }
      ]
    },
    en: {
      back: 'Back',
      title: 'Install PWA App',
      subtitle: 'Run Viral Studio in full screen without browser bars for the ultimate video recording, script writing, and AI rendering experience.',
      installedTitle: 'App Already Installed! ★',
      installedDesc: 'You are currently running the standalone PWA version of Viral Studio. Camera and caching are 100% optimized.',
      detected: 'Recommended for your device',
      installBtn: 'Install on this device',
      tabs: {
        ios: 'Apple iOS',
        android: 'Android OS',
        desktop: 'Desktop PC',
      },
      benefits: [
        { title: 'True Fullscreen', desc: 'No Safari or Chrome navigation bars. Immersive native-like standalone window.' },
        { title: 'Camera Optimization', desc: 'Enhanced lens stabilization and speech clarity for our studio teleprompter.' },
        { title: 'Ultra-fast Startup', desc: 'Pre-caches vital assets to load instantly, even on weak cellular networks.' }
      ],
      iosSteps: [
        { icon: Share, title: 'Step 1: Tap "Share"', desc: 'Tap the "Share" button in Safari on your bottom or top toolbar.' },
        { icon: PlusSquare, title: 'Step 2: "Add to Home Screen"', desc: 'Scroll down the menu list and select "Add to Home Screen" option.' },
        { icon: Check, title: 'Step 3: Tap "Add"', desc: 'Tap "Add" in the top right corner. The icon will appear on your desktop!' }
      ],
      androidSteps: [
        { icon: Download, title: 'Step 1: Automatic Prompt', desc: 'Tap "Install on this device" above or accept the automatic browser installation prompt.' },
        { icon: HelpCircle, title: 'If prompt did not appear', desc: 'Tap Chrome menu (3 dots) in top-right and select "Install app".' },
        { icon: Check, title: 'Step 2: Launch App', desc: 'The icon is now on your home screen. Open it for a premium full screen experience.' }
      ],
      desktopSteps: [
        { icon: Download, title: 'Step 1: Address Bar Indicator', desc: 'Look at the right side of your Chrome/Edge address bar — tap the monitor with a download arrow icon.' },
        { icon: Check, title: 'Step 2: Install instantly', desc: 'Click the icon and hit "Install". The application will launch in its own premium window.' }
      ]
    }
  }[locale as 'ru' | 'en'] || {
    ru: {
      back: 'Назад',
      title: 'Установка PWA Приложения',
      subtitle: 'Запустите Viral Studio на весь экран без рамок браузера для максимального удобства съемки, написания сценариев и AI-генерации.',
      installedTitle: 'Приложение уже установлено! ★',
      installedDesc: 'Вы используете полноэкранную PWA версию Viral Studio. Камера и кэширование оптимизированы на 100%.',
      detected: 'Рекомендуется для вашего устройства',
      installBtn: 'Установить на это устройство',
      tabs: {
        ios: 'Apple iOS',
        android: 'Android OS',
        desktop: 'Desktop ПК',
      },
      benefits: [
        { title: 'Фуллскрин Режим', desc: 'Никаких адресных строк Safari или Chrome. Приложение работает на весь экран как нативное.' },
        { title: 'Оптимизация Камеры', desc: 'Улучшенная стабилизация изображения и запись голоса для видео-суфлера.' },
        { title: 'Мгновенный Запуск', desc: 'Интеллектуальное кэширование ресурсов для быстрой загрузки даже при слабом интернете.' }
      ],
      iosSteps: [
        { icon: Share, title: 'Шаг 1: Кнопка «Поделиться»', desc: 'Нажмите на значок «Поделиться» на нижней или верхней панели браузера Safari.' },
        { icon: PlusSquare, title: 'Шаг 2: «На экран «Домой»»', desc: 'Прокрутите меню вниз и выберите опцию «На экран Домой» (или «Add to Home Screen»).' },
        { icon: Check, title: 'Шаг 3: «Добавить»', desc: 'Подтвердите установку в правом верхнем углу. Иконка появится на вашем рабочем столе!' }
      ],
      androidSteps: [
        { icon: Download, title: 'Шаг 1: Автоматический запрос', desc: 'Нажмите кнопку «Установить на это устройство» выше или примите всплывающее уведомление браузера.' },
        { icon: HelpCircle, title: 'Если окно не появилось', desc: 'Нажмите на три точки в верхнем правом углу Chrome и выберите пункт «Установить приложение».' },
        { icon: Check, title: 'Шаг 2: Готово к работе', desc: 'Иконка добавится на рабочий стол. Запустите приложение для полноэкранного режима.' }
      ],
      desktopSteps: [
        { icon: Download, title: 'Шаг 1: Адресная строка Chrome/Edge', desc: 'Обратите внимание на правый край адресной строки вашего браузера — там появится значок монитора со стрелочкой.' },
        { icon: Check, title: 'Шаг 2: Установить в один клик', desc: 'Нажмите на этот значок и подтвердите установку. Приложение мгновенно откроется в отдельном premium-окне.' }
      ]
    },
    en: {
      back: 'Back',
      title: 'Install PWA App',
      subtitle: 'Run Viral Studio in full screen without browser bars for the ultimate video recording, script writing, and AI rendering experience.',
      installedTitle: 'App Already Installed! ★',
      installedDesc: 'You are currently running the standalone PWA version of Viral Studio. Camera and caching are 100% optimized.',
      detected: 'Recommended for your device',
      installBtn: 'Install on this device',
      tabs: {
        ios: 'Apple iOS',
        android: 'Android OS',
        desktop: 'Desktop PC',
      },
      benefits: [
        { title: 'True Fullscreen', desc: 'No Safari or Chrome navigation bars. Immersive native-like standalone window.' },
        { title: 'Camera Optimization', desc: 'Enhanced lens stabilization and speech clarity for our studio teleprompter.' },
        { title: 'Ultra-fast Startup', desc: 'Pre-caches vital assets to load instantly, even on weak cellular networks.' }
      ],
      iosSteps: [
        { icon: Share, title: 'Step 1: Tap "Share"', desc: 'Tap the "Share" button in Safari on your bottom or top toolbar.' },
        { icon: PlusSquare, title: 'Step 2: "Add to Home Screen"', desc: 'Scroll down the menu list and select "Add to Home Screen" option.' },
        { icon: Check, title: 'Step 3: Tap "Add"', desc: 'Tap "Add" in the top right corner. The icon will appear on your desktop!' }
      ],
      androidSteps: [
        { icon: Download, title: 'Step 1: Automatic Prompt', desc: 'Tap "Install on this device" above or accept the automatic browser installation prompt.' },
        { icon: HelpCircle, title: 'If prompt did not appear', desc: 'Tap Chrome menu (3 dots) in top-right and select "Install app".' },
        { icon: Check, title: 'Step 2: Launch App', desc: 'The icon is now on your home screen. Open it for a premium full screen experience.' }
      ],
      desktopSteps: [
        { icon: Download, title: 'Step 1: Address Bar Indicator', desc: 'Look at the right side of your Chrome/Edge address bar — tap the monitor with a download arrow icon.' },
        { icon: Check, title: 'Step 2: Install instantly', desc: 'Click the icon and hit "Install". The application will launch in its own premium window.' }
      ]
    }
  }.en;

  const currentSteps = platform === 'ios' ? t.iosSteps : platform === 'android' ? t.androidSteps : t.desktopSteps;

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F0E8] font-sans selection:bg-purple-500/30 py-20 px-5 md:px-10 relative overflow-hidden">
      {/* Dynamic Laser Gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-500/5 filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-cyan-500/5 filter blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-yellow-500/5 filter blur-[150px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-12 relative z-10">
        
        {/* Navigation & Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/40 hover:text-white text-xs font-black uppercase tracking-widest transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {t.back}
          </button>

          <span className="font-jetbrains text-[9px] text-virale-gold uppercase tracking-[0.3em] bg-virale-gold/5 border border-virale-gold/25 px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.05)]">
            STANDALONE WEBAPP
          </span>
        </div>

        {/* Hero Header */}
        <div className="text-center md:text-left space-y-4 border-b border-white/5 pb-10">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none bg-gradient-to-r from-white via-white to-white/45 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-sm md:text-lg text-white/55 font-medium max-w-2xl leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        {/* Installed State Banner */}
        {installed && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-6 rounded-[2rem] bg-green-500/5 border border-green-500/20 flex gap-4 items-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
              <Check size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">{t.installedTitle}</h3>
              <p className="text-xs text-white/50 font-medium mt-0.5">{t.installedDesc}</p>
            </div>
          </motion.div>
        )}

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {t.benefits.map((b, i) => (
            <div key={i} className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-md relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="w-8 h-8 rounded-lg bg-white/5 text-virale-gold text-xs font-black flex items-center justify-center mb-4">
                0{i + 1}
              </div>
              <h4 className="text-sm font-black uppercase tracking-wider text-white mb-2">{b.title}</h4>
              <p className="text-xs text-white/40 leading-relaxed font-medium">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Platforms Segment Tabs */}
        <div className="space-y-6">
          <div className="flex gap-2 p-1.5 bg-white/[0.03] border border-white/5 rounded-3xl backdrop-blur-xl">
            {(['ios', 'android', 'desktop'] as Platform[]).map((p) => {
              const Icon = p === 'ios' ? Apple : p === 'android' ? Smartphone : Monitor;
              const isActive = platform === p;
              return (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`flex-1 py-3 px-4 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-2 ${
                    isActive 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-500/20 text-white shadow-lg shadow-purple-500/20' 
                      : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} />
                  <span>{t.tabs[p]}</span>
                </button>
              );
            })}
          </div>

          {/* Prompt/Install Actions Button */}
          <div className="p-8 rounded-[2.5rem] bg-radial-card border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <style jsx>{`
              .bg-radial-card {
                background: radial-gradient(circle at top left, rgba(155, 95, 255, 0.04) 0%, rgba(2, 4, 8, 0.6) 100%);
              }
            `}</style>
            
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-virale-gold bg-virale-gold/10 border border-virale-gold/20 px-3 py-1 rounded-full">
                {t.detected}
              </span>
              <h3 className="text-xl font-black text-white tracking-tight pt-1">
                {platform === 'ios' ? 'Apple iOS Safari PWA' : platform === 'android' ? 'Android Chrome PWA' : 'Google Chrome / Edge App'}
              </h3>
            </div>

            <div className="relative group shrink-0 w-full md:w-auto">
              <button
                onClick={handleTriggerInstall}
                className="w-full md:w-auto px-8 py-4 rounded-2xl bg-white text-black hover:scale-[1.02] active:scale-[0.98] transition-all font-black uppercase text-xs tracking-widest shadow-xl shadow-white/10 flex items-center justify-center gap-3"
              >
                <Download size={16} />
                <span>{t.installBtn}</span>
              </button>

              <AnimatePresence>
                {triggerMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-virale-gold text-black text-[9px] font-black uppercase tracking-widest rounded-full shadow-2xl whitespace-nowrap z-30"
                  >
                    {triggerMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Detailed Instructions Cards */}
          <div className="space-y-4">
            {currentSteps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div key={index} className="flex gap-5 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-md items-start group hover:border-white/10 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <StepIcon size={20} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">{step.title}</h4>
                    <p className="text-xs text-white/50 leading-relaxed font-medium">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
}
