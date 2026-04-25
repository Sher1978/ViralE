'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles, X, ArrowRight, Zap, CheckCircle, Info } from 'lucide-react';
import { useRouter } from '@/navigation';

interface PremiumLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  type?: 'trial' | 'credits' | 'tier' | 'success' | 'info';
  locale?: string;
}

export function PremiumLimitModal({
  isOpen,
  onClose,
  title,
  description,
  type = 'trial',
  locale = 'en'
}: PremiumLimitModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const getTheme = () => {
    switch (type) {
      case 'success': return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' };
      case 'credits': return { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/20' };
      case 'info': return { icon: Info, color: 'text-cyan-400', bg: 'bg-cyan-500/20' };
      case 'tier': return { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/20' };
      default: return { icon: Lock, color: 'text-red-400', bg: 'bg-red-500/20' };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950/40 p-8 shadow-2xl backdrop-blur-2xl"
        >
          {/* Decorative Background Elements */}
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-purple-600/20 blur-[80px]" />
          <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-cyan-600/20 blur-[80px]" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-6 top-6 rounded-full p-2 text-white/20 hover:bg-white/5 hover:text-white transition-all"
          >
            <X size={20} />
          </button>

          {/* Icon Header */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className={`absolute -inset-4 rounded-full ${theme.bg} blur-xl animate-pulse`} />
              <div className={`relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent shadow-inner`}>
                <Icon className={`h-10 w-10 ${theme.color}`} />
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="mb-8 text-center space-y-3">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">
              {title}
            </h2>
            <p className="text-sm font-medium leading-relaxed text-white/40">
              {description}
            </p>
          </div>

          {/* Action Area */}
          <div className="space-y-4">
            <button
              onClick={() => {
                router.push('/app/profile/subscription');
                onClose();
              }}
              className="group relative w-full overflow-hidden rounded-2xl bg-white p-5 text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                <span className="text-sm font-black uppercase tracking-widest">
                  {locale === 'ru' ? 'Снять ограничения' : 'Remove Limits'}
                </span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
            
            <button
              onClick={onClose}
              className="w-full rounded-2xl border border-white/10 py-4 text-[10px] font-black uppercase tracking-widest text-white/20 transition-all hover:bg-white/5 hover:text-white"
            >
              {locale === 'ru' ? 'Позже' : 'Maybe Later'}
            </button>
          </div>

          {/* Trust Badge / Info */}
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="h-[1px] w-8 bg-white/5" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/10">
               Premium Content Factory
            </span>
            <div className="h-[1px] w-8 bg-white/5" />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
