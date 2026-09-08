import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Coins, CreditCard, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TokenConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cost: number;
  balance: number;
  title?: string;
  description?: string;
}

export function TokenConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  cost,
  balance,
  title = 'Подтверждение генерации',
  description = 'Вы собираетесь запустить генерацию платного контента.'
}: TokenConfirmModalProps) {
  const common = useTranslations('common');
  const hasEnoughBalance = balance >= cost;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-[#0a0a14] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all z-10"
            >
              <X size={16} />
            </button>

            <div className="p-8 space-y-6">
              <div className="flex justify-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 shadow-[0_0_50px_rgba(0,0,0,0.5)] ${
                  hasEnoughBalance ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-purple-500/20' : 'bg-red-500/10 border-red-500/30 text-red-400 shadow-red-500/20'
                }`}>
                  {hasEnoughBalance ? <Coins size={36} /> : <AlertCircle size={36} />}
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black italic uppercase tracking-tight text-white">
                  {title}
                </h3>
                <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                  {description}
                </p>
              </div>

              <div className="bg-black/40 rounded-2xl p-5 border border-white/5 space-y-4">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-white/40 uppercase tracking-wider text-[10px]">Стоимость операции</span>
                  <span className="text-white flex items-center gap-1.5 font-mono">
                    <span className="text-red-400">- {cost}</span> <Coins size={14} className="text-purple-400" />
                  </span>
                </div>
                
                <div className="h-px w-full bg-white/5" />
                
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-white/40 uppercase tracking-wider text-[10px]">Ваш баланс</span>
                  <span className={`flex items-center gap-1.5 font-mono ${hasEnoughBalance ? 'text-white' : 'text-red-400'}`}>
                    {balance} <Coins size={14} className={hasEnoughBalance ? "text-purple-400" : "text-red-400"} />
                  </span>
                </div>
              </div>

              {!hasEnoughBalance && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest text-center">
                  Недостаточно токенов для выполнения операции
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 rounded-[1.5rem] bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  Отмена
                </button>
                {hasEnoughBalance ? (
                  <button
                    onClick={() => {
                      onConfirm();
                      onClose();
                    }}
                    className="flex-[2] py-4 rounded-[1.5rem] bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-purple-500/20"
                  >
                    Списать {cost} токенов
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const win = (globalThis as any).window;
                      if (win) {
                        const currentLocale = win.location.pathname.split('/')[1] || 'ru';
                        win.location.href = `/${currentLocale}/app/profile/subscription`;
                      }
                    }}
                    className="flex-[2] py-4 rounded-[1.5rem] bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-yellow-500/20 flex items-center justify-center gap-2"
                  >
                    <CreditCard size={14} /> Пополнить баланс
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
