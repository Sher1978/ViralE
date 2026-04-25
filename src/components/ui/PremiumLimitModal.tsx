'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles, X, ArrowRight, Zap, CheckCircle, Info, AlertCircle, BrainCircuit } from 'lucide-react';
import { useRouter } from '@/navigation';

interface PremiumLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  advice?: string;
  type?: 'trial' | 'credits' | 'tier' | 'success' | 'info' | 'error' | 'warning' | 'confirm';
  locale?: string;
  balance?: number;
  onConfirm?: () => void;
}

export function PremiumLimitModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  advice,
  type = 'trial',
  locale = 'en',
  balance
}: PremiumLimitModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const getTheme = () => {
    switch (type) {
      case 'success': return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', accent: 'border-green-500/20' };
      case 'credits': return { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/20', accent: 'border-amber-500/20' };
      case 'info': return { icon: Info, color: 'text-cyan-400', bg: 'bg-cyan-500/20', accent: 'border-cyan-500/20' };
      case 'tier': return { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/20', accent: 'border-purple-500/20' };
      case 'error': return { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20', accent: 'border-red-500/30' };
      case 'warning': return { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/20', accent: 'border-orange-500/20' };
      default: return { icon: Lock, color: 'text-purple-400', bg: 'bg-purple-500/20', accent: 'border-purple-500/20' };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        {/* Backdrop - Deep Glass Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Content - Premium Monolith */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className={`relative w-full max-w-sm overflow-hidden border ${theme.accent} bg-black/40 p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl`}
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 95%, 95% 100%, 0 100%)'
          }}
        >
          {/* Subtle Scanline Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-6 top-6 rounded-full p-2 text-white/10 hover:bg-white/5 hover:text-white transition-all z-20"
          >
            <X size={18} />
          </button>

          {/* Header Icon */}
          <div className="mb-6 flex flex-col items-center">
            <div className="relative">
              <div className={`absolute -inset-4 rounded-full ${theme.bg} blur-2xl opacity-50`} />
              <div className="relative flex h-16 w-16 items-center justify-center border border-white/5 bg-white/5 shadow-inner">
                <Icon className={`h-8 w-8 ${theme.color}`} />
              </div>
            </div>
            
            {/* Live Balance Indicator */}
            {typeof balance === 'number' && (
              <div className="mt-4 px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                  {locale === 'ru' ? 'Баланс:' : 'Balance:'} <span className="text-white">{balance}</span>
                </span>
              </div>
            )}
          </div>

          {/* Text Content */}
          <div className="mb-8 text-center space-y-4">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white leading-none">
              {title}
            </h2>
            <p className="text-xs font-medium leading-relaxed text-white/50 px-4">
              {description}
            </p>
          </div>

          {/* Strategy Advice Block */}
          {advice && (
            <div className="mb-8 p-4 bg-white/5 border border-white/5 relative group">
              <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 opacity-50" />
              <div className="flex gap-3">
                 <BrainCircuit className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                 <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-purple-400/60">Strategist Advice</p>
                    <p className="text-[11px] text-white/60 leading-relaxed italic">{advice}</p>
                 </div>
              </div>
            </div>
          )}

          {/* Action Area */}
          <div className="space-y-3">
            {type === 'confirm' ? (
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all font-mono"
                >
                  {locale === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    if (onConfirm) onConfirm();
                    onClose();
                  }}
                  className="flex-1 py-4 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(255,255,255,0.2)]"
                >
                  {locale === 'ru' ? 'Дальше' : 'Proceed'}
                </button>
              </div>
            ) : (type === 'trial' || type === 'credits' || type === 'tier') ? (
              <button
                onClick={() => {
                  router.push('/app/profile/subscription');
                  onClose();
                }}
                className="group relative w-full overflow-hidden bg-white p-5 text-black transition-all hover:bg-purple-500 hover:text-white active:scale-95 shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  <span className="text-sm font-black uppercase tracking-tighter italic">
                    {locale === 'ru' ? 'Меню Тарифов' : 'Upgrade Plan'}
                  </span>
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="group relative w-full overflow-hidden bg-white/5 border border-white/10 p-5 text-white transition-all hover:bg-white/10 active:scale-95"
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  <span className="text-sm font-black uppercase tracking-tighter italic">
                    {locale === 'ru' ? 'Понял' : 'Understood'}
                  </span>
                </div>
              </button>
            )}
            
            {(type === 'trial' || type === 'credits' || type === 'tier') && (
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center py-2 text-[8px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white/40 transition-all font-mono"
              >
                {locale === 'ru' ? 'Вернуться позже' : 'Maybe Later'}
              </button>
            )}
          </div>

          {/* Footer Copyright */}
          <div className="mt-10 flex flex-col items-center justify-center space-y-1">
            <div className="h-[1px] w-12 bg-white/10" />
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/10 mt-2">
               SHER DIGITAL CORE © 2026
            </p>
            <p className="text-[7px] font-bold text-white/5 uppercase tracking-widest leading-none">
               Automated Creative Intelligence
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
