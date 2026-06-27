import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, Mic, Bot, ArrowLeft } from 'lucide-react';

interface ProductionBranchProps {
  onSelect: (type: 'record' | 'faceless' | 'voice-master' | 'heygen-avatar') => void;
  onBack: () => void;
}

export const ProductionBranch: React.FC<ProductionBranchProps> = ({ onSelect, onBack }) => {
  const [subMode, setSubMode] = useState<'main' | 'ai'>('main');

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 text-center overflow-y-auto py-8">
      
      {/* Keyframe styles for scrolling prompter text */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scrollText {
          0% { transform: translateY(80px); }
          100% { transform: translateY(-100px); }
        }
        .animate-scroll {
          animation: scrollText 14s linear infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        .animate-spin-reverse {
          animation: spin-slow 15s linear infinite reverse;
        }
      ` }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full space-y-10"
      >
        <div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white mb-3">
            Выберите путь <span className="text-purple-400">Продакшна</span>
          </h2>
          <p className="text-[12px] text-white/30 uppercase tracking-[0.2em] font-bold">
            {subMode === 'main' ? 'Сценарий готов. Выберите способ создания ролика' : 'Выберите тип искусственной генерации'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {subMode === 'main' ? (
            <motion.div
              key="main-options"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Option 1: Record Yourself */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect('record')}
                className="group relative h-96 rounded-[3rem] bg-white/[0.02] border border-white/5 overflow-hidden flex flex-col p-8 justify-between text-left transition-all hover:bg-white/[0.04] hover:border-cyan-500/30"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Header info */}
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_40px_rgba(6,182,212,0.3)] transition-all">
                    <Camera size={22} className="text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-white leading-none">Записать Себя</h3>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">
                    Съемка живого видео со встроенным умным телесуфлером
                  </p>
                </div>

                {/* Teleprompter Preview Mockup */}
                <div className="w-full h-40 relative flex items-center justify-center overflow-hidden rounded-2xl bg-black/45 border border-white/5 shadow-inner">
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 bg-black/60 px-2 py-0.5 rounded-full border border-red-500/25">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 absolute" />
                    <span className="text-[7px] font-black text-red-500 uppercase tracking-widest leading-none">REC</span>
                  </div>
                  <div className="w-28 h-36 border-2 border-white/10 rounded-2xl bg-[#09090e] p-3 flex flex-col justify-end gap-1 relative overflow-hidden shadow-2xl mt-4">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-white/10 rounded-full" />
                    
                    {/* Scrolling text simulator */}
                    <div className="absolute inset-x-3 top-5 bottom-3 flex flex-col gap-1.5 select-none pointer-events-none animate-scroll">
                      <span className="text-[5.5px] font-black text-cyan-400/20">Смотрите прямо в объектив...</span>
                      <span className="text-[5.5px] font-black text-cyan-400/40">Тут фишка в чём...</span>
                      <span className="text-[5.5px] font-black text-cyan-400">Ученые доказали, что...</span>
                      <span className="text-[5.5px] font-black text-cyan-400/60">Однако выяснилось...</span>
                      <span className="text-[5.5px] font-black text-cyan-400/30">Но это также означает...</span>
                      <span className="text-[5.5px] font-black text-cyan-400/10">Оставляй коммент под этим видео...</span>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#09090e] to-transparent pointer-events-none" />
                  </div>
                </div>
              </motion.button>

              {/* Option 2: AI Generation */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSubMode('ai')}
                className="group relative h-96 rounded-[3rem] bg-white/[0.02] border border-white/5 overflow-hidden flex flex-col p-8 justify-between text-left transition-all hover:bg-white/[0.04] hover:border-purple-500/30"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Header info */}
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.15)] group-hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] transition-all">
                    <Sparkles size={22} className="text-purple-400" />
                  </div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-white leading-none">Сгенерировать контент</h3>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">
                    Использовать нейронные модели для создания видеоряда
                  </p>
                </div>

                {/* AI Preview Graphics */}
                <div className="w-full h-40 relative flex items-center justify-center overflow-hidden rounded-2xl bg-black/45 border border-white/5 shadow-inner">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.06)_0%,transparent_70%)]" />
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    {/* Animated circular rings */}
                    <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-spin-slow" />
                    <div className="absolute w-20 h-20 rounded-full border border-dashed border-blue-500/30 animate-spin-reverse" />
                    
                    <Bot size={32} className="text-purple-400 animate-pulse relative z-10" />
                    
                    {/* Floating waveform indicators */}
                    <div className="absolute bottom-2 flex gap-1 items-center justify-center z-10">
                      <span className="w-0.5 h-2 bg-purple-500/50 rounded-full" />
                      <span className="w-0.5 h-4 bg-purple-400/80 rounded-full animate-pulse" />
                      <span className="w-0.5 h-6 bg-blue-400/90 rounded-full" />
                      <span className="w-0.5 h-3 bg-purple-400/80 rounded-full animate-pulse" />
                      <span className="w-0.5 h-1 bg-purple-500/50 rounded-full" />
                    </div>
                  </div>
                </div>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="ai-options"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              <div className="flex justify-start mb-2">
                <button
                  onClick={() => setSubMode('main')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-wider"
                >
                  <ArrowLeft size={12} />
                  Назад к выбору
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Sub-option 1: Voice Master */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect('voice-master')}
                  className="group relative h-48 rounded-[2.5rem] bg-white/[0.02] border border-white/5 overflow-hidden flex flex-col items-center justify-center p-6 text-center transition-all hover:bg-white/[0.04] hover:border-purple-500/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(168,85,247,0.1)] group-hover:shadow-[0_0_40px_rgba(168,85,247,0.2)] transition-all">
                    <Mic size={22} className="text-purple-400" />
                  </div>
                  <h3 className="text-sm font-black italic uppercase tracking-tighter text-white mb-1 leading-none">Voice Master</h3>
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-relaxed max-w-[150px]">
                    Голос + фото → AI генерирует видео
                  </p>
                </motion.button>

                {/* Sub-option 2: AI Faceless */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect('faceless')}
                  className="group relative h-48 rounded-[2.5rem] bg-white/[0.02] border border-white/5 overflow-hidden flex flex-col items-center justify-center p-6 text-center transition-all hover:bg-white/[0.04] hover:border-emerald-500/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(16,185,129,0.1)] group-hover:shadow-[0_0_40px_rgba(16,185,129,0.2)] transition-all">
                    <Sparkles size={22} className="text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-black italic uppercase tracking-tighter text-white mb-1 leading-none">AI Faceless</h3>
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-relaxed max-w-[150px]">
                    Авто-генерация сцен и озвучки
                  </p>
                </motion.button>

                {/* Sub-option 3: HeyGen Avatar */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect('heygen-avatar')}
                  className="group relative h-48 rounded-[2.5rem] overflow-hidden flex flex-col items-center justify-center p-6 text-center transition-all border"
                  style={{
                    background: 'linear-gradient(135deg, rgba(168,85,247,0.04) 0%, rgba(59,130,246,0.04) 100%)',
                    borderColor: 'rgba(168,85,247,0.15)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(168,85,247,0.15)] group-hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] transition-all">
                    <Bot size={22} className="text-purple-400" />
                  </div>
                  <h3 className="text-sm font-black italic uppercase tracking-tighter text-white mb-1 leading-none">HeyGen Avatar</h3>
                  <p className="text-[9px] font-bold text-purple-300/40 uppercase tracking-widest leading-relaxed max-w-[150px]">
                    AI-аватар по вашему сценарию
                  </p>

                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30">
                    <span className="text-[6px] font-black uppercase tracking-widest text-purple-400">BYOK</span>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={onBack}
          className="py-4 px-8 rounded-2xl text-white/20 text-[10px] font-black uppercase tracking-[0.3em] hover:text-white/40 transition-colors"
        >
          Вернуться к Сценарию
        </button>
      </motion.div>
    </div>
  );
};
