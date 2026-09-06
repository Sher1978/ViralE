'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Cookie, X, Check } from 'lucide-react';
import { Link } from '@/navigation';

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('virale_cookie_consent');
      if (!consent) {
        setShowBanner(true);
      }
    } catch (e) {
      // Ignore localStorage restrictions
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('virale_cookie_consent', 'accepted_' + Date.now());
    } catch (e) {}
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-5 left-5 right-5 md:left-auto md:right-5 md:max-w-md z-[9999] bg-[#0c0c14]/95 border border-purple-500/30 rounded-2xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl text-left space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Cookie className="w-5 h-5 text-purple-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <span>Cookie & Privacy Consent</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">GDPR</span>
              </h4>
              <p className="text-xs text-white/60 font-medium leading-relaxed">
                We use essential cookies to keep you securely signed in and optimize your AI content creation workflow under our{' '}
                <Link href="/privacy" className="text-purple-400 underline font-bold hover:text-purple-300 transition-colors">
                  Privacy Policy
                </Link>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleAccept}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-600/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check size={14} /> Accept & Continue
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
