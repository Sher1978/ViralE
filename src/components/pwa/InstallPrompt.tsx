'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, Download, X } from 'lucide-react';

export function InstallPrompt() {
  const t = useTranslations('common');
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Check if it's already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // 2. Check platform
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // 3. Listen for Android/Chrome install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Show iOS prompt automatically after a delay if not standalone
    if (isIOSDevice && !window.matchMedia('(display-mode: standalone)').matches) {
      const timer = setTimeout(() => {
        const hasSeenPrompt = localStorage.getItem('pwa_prompt_seen');
        if (!hasSeenPrompt) {
          setShow(true);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShow(false);
    }
  };

  const handleClose = () => {
    setShow(false);
    localStorage.setItem('pwa_prompt_seen', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-6 right-6 z-[100] md:left-auto md:right-6 md:w-96"
        >
          <div className="bg-[#0f1115]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full" />
            
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-black uppercase tracking-tighter text-white">
                  {t('installApp')}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  {t('installDescription')}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {isIOS ? (
                <div className="flex items-center gap-2 p-3 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-white/60 text-xs text-center w-full">
                    Tap <Share className="w-4 h-4 inline mx-1" /> and <b>'Add to Home Screen'</b>
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3 bg-white text-black rounded-2xl font-black uppercase text-sm tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
                >
                  {t('installButton')}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
