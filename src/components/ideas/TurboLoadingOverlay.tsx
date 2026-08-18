'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Sparkles, Cpu, Layers } from 'lucide-react';

interface TurboLoadingOverlayProps {
  isOpen: boolean;
  topicTitle?: string;
  locale?: string;
}

export default function TurboLoadingOverlay({ 
  isOpen, 
  topicTitle = '', 
  locale = 'ru' 
}: TurboLoadingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(10);

  const stepsRu = [
    "🧬 ИНГЕСТИЯ: Анализ Бренд-ДНК и аудитории...",
    "🎯 МАТРИЦА: Выбор идеального Хука и Micro-Payoff...",
    "⚡ СИНТЕЗ: Формулирование ТРИЗ-инверсии и дикторского текста...",
    "🚀 СТУДИЯ: Сохранение сценария и генерация медиа-промптов..."
  ];

  const stepsEn = [
    "🧬 INGESTION: Analyzing Brand DNA & Audience...",
    "🎯 MATRIX: Selecting Optimal Hook & Micro-Payoff...",
    "⚡ SYNTHESIS: Formulating TRIZ Inversion & Dictation Text...",
    "🚀 STUDIO: Saving Script & Generating Media Prompts..."
  ];

  const steps = locale === 'ru' ? stepsRu : stepsEn;

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      setProgress(10);
      return;
    }

    // Progress bar animation
    const progressTimer = setInterval(() => {
      setProgress(prev => (prev < 92 ? prev + Math.floor(Math.random() * 8) + 3 : 95));
    }, 300);

    // Step text cycler
    const stepTimer = setInterval(() => {
      setStepIndex(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);

    return () => {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
    };
  }, [isOpen, steps.length]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 select-none overflow-hidden"
        >
          {/* Ambient Glowing Background Stars & Gradients */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/20 via-purple-600/20 to-blue-600/10 rounded-full blur-[140px] animate-pulse" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
          </div>

          {/* Core Content Container */}
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -10 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center text-center max-w-lg w-full"
          >
            {/* Top Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-[0.25em] shadow-[0_0_20px_rgba(245,158,11,0.2)] mb-8"
            >
              <Cpu className="w-3.5 h-3.5 animate-spin" />
              <span>VIRAL ENGINE TURBO BUILDER</span>
            </motion.div>

            {/* Central Animated Reactor (Double Rings + Pulsing Zap) */}
            <div className="relative w-36 h-36 mb-8 flex items-center justify-center">
              {/* Outer Rotating Glowing Ring */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.3)]"
              />

              {/* Inner Reverse Rotating Ring */}
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full border-2 border-purple-500/40 border-t-purple-400 border-b-transparent shadow-[0_0_40px_rgba(168,85,247,0.4)]"
              />

              {/* Central Glowing Shield */}
              <motion.div 
                animate={{ scale: [1, 1.1, 1], boxShadow: ["0 0 30px rgba(245,158,11,0.5)", "0 0 60px rgba(245,158,11,0.9)", "0 0 30px rgba(245,158,11,0.5)"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center text-black shadow-2xl relative z-10"
              >
                <Zap className="w-10 h-10 fill-black stroke-black drop-shadow-md" />
              </motion.div>

              {/* Floating Orbiting Sparkles */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 pointer-events-none"
              >
                <Sparkles className="w-5 h-5 text-amber-300 absolute -top-1 left-1/2 -translate-x-1/2 fill-current" />
              </motion.div>
            </div>

            {/* Topic Title Spoken Preview */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-2 mb-8 px-4"
            >
              <h3 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-tight leading-tight drop-shadow-xl line-clamp-2">
                {topicTitle}
              </h3>
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>{locale === 'ru' ? 'Автоматическая сборка в 1 клик' : '1-Click Automated Script Synthesis'}</span>
              </div>
            </motion.div>

            {/* Step Progress Display */}
            <div className="w-full space-y-4 px-2">
              {/* Progress Bar Container */}
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative border border-white/10 p-[1px]">
                <motion.div 
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-purple-500 to-cyan-400 shadow-[0_0_15px_rgba(245,158,11,0.8)]"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>

              {/* Animated Step Label */}
              <div className="flex items-center justify-between text-[11px] font-mono tracking-wider font-bold">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={stepIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="text-amber-400 drop-shadow-sm text-left truncate pr-2"
                  >
                    {steps[stepIndex]}
                  </motion.span>
                </AnimatePresence>
                <span className="text-white/50 shrink-0">{progress}%</span>
              </div>
            </div>

            {/* Footer Tip */}
            <p className="text-[9px] font-medium text-white/20 uppercase tracking-[0.2em] mt-10">
              {locale === 'ru' ? 'Не закрывайте вкладку • Создаем сценарий и медкадры...' : 'Do not close tab • Creating script & media prompts...'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
