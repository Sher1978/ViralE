'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, ExternalLink, Check, Sparkles, RefreshCw, Send, ShieldCheck, HelpCircle } from 'lucide-react';

interface LateDevInstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavedSuccess?: () => void;
  initialKey?: string;
}

export const LateDevInstructionModal: React.FC<LateDevInstructionModalProps> = ({
  isOpen,
  onClose,
  onSavedSuccess,
  initialKey = ''
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(initialKey);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!apiKeyInput.trim()) {
      setError('Введите валидный API Ключ Late.dev (начинается с sk_)');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/byok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latedevKey: apiKeyInput.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка сохранения');

      setSuccess(true);
      if (onSavedSuccess) onSavedSuccess();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Сбой при сохранении ключа');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-[#121026] via-[#0b0c16] to-black border border-purple-500/30 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-lg shadow-purple-500/20 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-black/80 flex items-center justify-center text-purple-400">
                <Send size={26} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[8px] font-black uppercase tracking-widest">
                  1-CLICK AUTO-POSTING ENGINES
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
                Подключение Late.dev / Zernio
              </h2>
              <p className="text-[10px] text-white/40 font-medium">
                Инструкция по получению личного API Ключа для публикаций
              </p>
            </div>
          </div>

          {/* Step by step guide */}
          <div className="space-y-3 mb-6">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-white flex items-center gap-1.5">
                  Зарегистрируйтесь на Late.dev
                  <a
                    href="https://late.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:underline flex items-center gap-1 text-[10px]"
                  >
                    <span>late.dev</span>
                    <ExternalLink size={10} />
                  </a>
                </p>
                <p className="text-white/40 text-[10px]">
                  Перейдите на официальный сервис публикации и создайте личный кабинет.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-white">Прикрепите ваши соцсети</p>
                <p className="text-white/40 text-[10px]">
                  В разделе <b>Connected Accounts</b> привяжите свой YouTube Shorts, Instagram Reels, TikTok или Telegram канал.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-white">Скопируйте ваш API Key</p>
                <p className="text-white/40 text-[10px]">
                  Перейдите в <b>Settings → API Keys</b> и нажмите <i>«Create API Key»</i>. Скопируйте ключ формата <code className="text-purple-300 font-mono">sk_...</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Form Input */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-purple-300 tracking-wider flex items-center justify-between">
              <span>Ваш Персональный Late.dev API Key</span>
              <span className="text-white/30 font-normal lowercase">(хранится в защищенном профиле)</span>
            </label>

            <div className="relative">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk_778b433174e40f81e28ccc7231..."
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-white placeholder:text-white/20 font-mono tracking-wider outline-none focus:border-purple-500 transition-all"
              />
            </div>

            {error && (
              <p className="text-[10px] text-red-400 font-bold text-center animate-shake">
                ⚠️ {error}
              </p>
            )}

            {success && (
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black text-center flex items-center justify-center gap-2">
                <Check size={16} />
                <span>API Ключ Late.dev успешно привязан!</span>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Сохранить и Привязать Аккаунт</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
