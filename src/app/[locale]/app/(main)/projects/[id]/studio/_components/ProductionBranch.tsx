import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, Mic, Bot, ArrowLeft, LayoutGrid, Image as ImageIcon } from 'lucide-react';

interface ProductionBranchProps {
  onSelect: (type: 'record' | 'faceless' | 'voice-master' | 'heygen-avatar' | 'insta-gallery') => void;
  onBack: () => void;
}

export const ProductionBranch: React.FC<ProductionBranchProps> = ({ onSelect, onBack }) => {
  const [subMode, setSubMode] = useState<'main' | 'ai'>('main');

  return (
    <div className="h-full w-full flex flex-col justify-between items-center p-4 sm:p-6 overflow-hidden max-w-6xl mx-auto pt-[max(1.5rem,calc(env(safe-area-inset-top,0px)+0.5rem))] pb-4">
      
      {/* Keyframe styles for scrolling prompter text */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scrollText {
          0% { transform: translateY(60px); }
          100% { transform: translateY(-80px); }
        }
        .animate-scroll {
          animation: scrollText 12s linear infinite;
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
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full h-full flex flex-col justify-between space-y-3 max-h-full"
      >
        {/* Compact Header */}
        <div className="text-center space-y-1 shrink-0">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white">
            Выберите путь <span className="text-purple-400">Продакшна</span>
          </h2>
          <p className="text-[9px] sm:text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">
            {subMode === 'main' ? 'Сценарий готов. Выберите способ создания контента' : 'Выберите тип искусственной генерации'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {subMode === 'main' ? (
            <motion.div
              key="main-options"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-5 min-h-0 items-stretch my-auto"
            >
              {/* Option 1: Record Yourself (Teleprompter) */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect('record')}
                className="group relative h-full min-h-[160px] max-h-[360px] rounded-[2.2rem] bg-white/[0.02] border border-white/5 overflow-hidden flex flex-col p-4 sm:p-5 md:p-6 justify-between text-left transition-all hover:bg-white/[0.04] hover:border-cyan-500/30 shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Header info */}
                <div className="space-y-1.5 z-10">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all">
                    <Camera size={18} className="text-cyan-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter text-white leading-none">Телесуфлёр</h3>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-normal line-clamp-2">
                    Съемка живого видео со встроенным умным телесуфлером
                  </p>
                </div>

                {/* Teleprompter Preview Mockup */}
                <div className="w-full flex-1 min-h-[90px] max-h-[160px] relative flex items-center justify-center overflow-hidden rounded-xl bg-black/60 border border-white/5 shadow-inner mt-2">
                  <div className="absolute top-2 left-2 flex items-center gap-1 z-20 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-full border border-red-500/40">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-[6px] font-black text-red-500 uppercase tracking-widest leading-none">REC • 4K</span>
                  </div>

                  <div className="w-28 h-32 border border-white/20 rounded-xl bg-[#09090e] p-2 flex flex-col justify-end relative overflow-hidden shadow-2xl mt-2">
                    <img 
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80" 
                      alt="Presenter Camera View" 
                      className="absolute inset-0 w-full h-full object-cover opacity-65 filter brightness-90 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/90 pointer-events-none" />
                    
                    <div className="absolute inset-x-2 top-4 bottom-2 flex flex-col gap-1 select-none pointer-events-none animate-scroll z-10">
                      <span className="text-[5px] font-black text-cyan-300 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">Смотрите в объектив...</span>
                      <span className="text-[5px] font-black text-cyan-200 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">Тут фишка в чём...</span>
                      <span className="text-[5px] font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">Ученые доказали...</span>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-15" />
                  </div>
                </div>
              </motion.button>

              {/* Option 2: AI Generation Section */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSubMode('ai')}
                className="group relative h-full min-h-[160px] max-h-[360px] rounded-[2.2rem] bg-white/[0.02] border border-white/5 overflow-hidden flex flex-col p-4 sm:p-5 md:p-6 justify-between text-left transition-all hover:bg-white/[0.04] hover:border-purple-500/30 shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Header info */}
                <div className="space-y-1.5 z-10">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.15)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all">
                    <Sparkles size={18} className="text-purple-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter text-white leading-none">ИИ Раздел</h3>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-normal line-clamp-2">
                    Фейслесс, Аватары и Фейс Свап нейро-генерации
                  </p>
                </div>

                {/* AI Preview Graphics */}
                <div className="w-full flex-1 min-h-[90px] max-h-[160px] relative flex items-center justify-center overflow-hidden rounded-xl bg-black/45 border border-white/5 shadow-inner mt-2">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.06)_0%,transparent_70%)]" />
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-spin-slow" />
                    <div className="absolute w-14 h-14 rounded-full border border-dashed border-blue-500/30 animate-spin-reverse" />
                    
                    <Bot size={26} className="text-purple-400 animate-pulse relative z-10" />
                    
                    <div className="absolute bottom-1 flex gap-1 items-center justify-center z-10">
                      <span className="w-0.5 h-1.5 bg-purple-500/50 rounded-full" />
                      <span className="w-0.5 h-3 bg-purple-400/80 rounded-full animate-pulse" />
                      <span className="w-0.5 h-4 bg-blue-400/90 rounded-full" />
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* Option 3: Insta Gallery Section */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect('insta-gallery')}
                className="group relative h-full min-h-[160px] max-h-[360px] rounded-[2.2rem] bg-white/[0.02] border border-white/5 overflow-hidden flex flex-col p-4 sm:p-5 md:p-6 justify-between text-left transition-all hover:bg-white/[0.04] hover:border-pink-500/30 shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 via-fuchsia-500/5 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Header info */}
                <div className="space-y-1.5 z-10">
                  <div className="w-10 h-10 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.15)] group-hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] transition-all">
                    <LayoutGrid size={18} className="text-pink-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter text-white leading-none">Инста Галерея</h3>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-normal line-clamp-2">
                    Дизайн 6-слайдовых каруселей и постов для Instagram
                  </p>
                </div>

                {/* Insta Gallery Preview Graphic */}
                <div className="w-full flex-1 min-h-[90px] max-h-[160px] relative flex items-center justify-center overflow-hidden rounded-xl bg-black/60 border border-white/5 shadow-inner mt-2">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.1)_0%,transparent_70%)]" />
                  
                  {/* Carousel Cards Stack Effect */}
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <div className="absolute w-18 h-24 rounded-lg bg-purple-950/80 border border-purple-500/20 translate-x-4 rotate-12 scale-90 opacity-60 shadow-lg" />
                    <div className="absolute w-18 h-24 rounded-lg bg-fuchsia-950/80 border border-fuchsia-500/30 translate-x-2 rotate-6 scale-95 opacity-80 shadow-xl" />
                    <div className="relative w-20 h-26 rounded-xl bg-[#0e0717] border border-pink-500/40 p-2 flex flex-col justify-between shadow-2xl group-hover:scale-105 transition-transform duration-500">
                      <div className="flex justify-between items-center text-[5px] font-black text-pink-400 uppercase tracking-widest">
                        <span>@viral_engine</span>
                        <span>01/06</span>
                      </div>
                      <div className="w-full h-10 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                        <ImageIcon size={14} className="text-pink-400 animate-pulse" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="h-1 w-full bg-white/20 rounded-full" />
                        <div className="h-1 w-2/3 bg-pink-400/40 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="ai-options"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col gap-3 min-h-0 justify-center my-auto"
            >
              <div className="flex justify-start">
                <button
                  onClick={() => setSubMode('main')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-[9px] font-black uppercase tracking-wider"
                >
                  <ArrowLeft size={12} />
                  Назад к выбору
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Sub-option 1: Face Swap */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    try {
                      const { supabase } = await import('@/lib/supabase');
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single();
                        if (profile?.tier !== 'pro') {
                          (globalThis as any).alert?.("🔒 Опция Фейс Свап (Face Swap) доступна ТОЛЬКО в премиум-пакете SCALE ($79.90/мес).\nПожалуйста, перейдите в профиль и обновите подписку до тарифа Scale для доступа к нейро-замене лиц.");
                          return;
                        }
                      }
                    } catch (e) {}
                    onSelect('voice-master');
                  }}
                  className="group relative h-48 sm:h-52 rounded-[2rem] bg-white/[0.02] border border-amber-500/20 overflow-hidden flex flex-col justify-between p-5 text-left transition-all hover:bg-white/[0.04] hover:border-amber-500/50 shadow-xl"
                >
                  <img 
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80" 
                    alt="Face Swap" 
                    className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-45 group-hover:scale-105 transition-all duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090a14] via-[#090a14]/70 to-transparent" />

                  <div className="relative z-10 flex justify-between items-start">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 backdrop-blur-md flex items-center justify-center shadow-lg">
                      <Mic size={16} className="text-amber-400" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[7px] font-black uppercase tracking-widest text-amber-300 backdrop-blur-md">
                      👑 SCALE
                    </span>
                  </div>

                  <div className="relative z-10 space-y-1">
                    <h3 className="text-base font-black italic uppercase tracking-tighter text-white leading-none">Фейс Свап</h3>
                    <p className="text-[9px] font-bold text-amber-200/60 uppercase tracking-widest leading-tight">
                      Голос диктора + Замена лица
                    </p>
                  </div>
                </motion.button>

                {/* Sub-option 2: AI Faceless */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect('faceless')}
                  className="group relative h-48 sm:h-52 rounded-[2rem] bg-white/[0.02] border border-white/10 overflow-hidden flex flex-col justify-between p-5 text-left transition-all hover:bg-white/[0.04] hover:border-emerald-500/40 shadow-xl"
                >
                  <img 
                    src="https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=600&q=80" 
                    alt="AI Faceless B-Roll" 
                    className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-45 group-hover:scale-105 transition-all duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090a14] via-[#090a14]/70 to-transparent" />

                  <div className="relative z-10 flex justify-between items-start">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-md flex items-center justify-center shadow-lg">
                      <Sparkles size={16} className="text-emerald-400" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[7px] font-black uppercase tracking-widest text-emerald-300 backdrop-blur-md">
                      🎬 Faceless
                    </span>
                  </div>

                  <div className="relative z-10 space-y-1">
                    <h3 className="text-base font-black italic uppercase tracking-tighter text-white leading-none">Фейслесс Студия</h3>
                    <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest leading-tight">
                      Монтаж нейро-сцен и озвучки
                    </p>
                  </div>
                </motion.button>

                {/* Sub-option 3: HeyGen Avatar */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect('heygen-avatar')}
                  className="group relative h-48 sm:h-52 rounded-[2rem] bg-white/[0.02] border border-purple-500/20 overflow-hidden flex flex-col justify-between p-5 text-left transition-all hover:bg-white/[0.04] hover:border-purple-500/50 shadow-xl"
                >
                  <img 
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80" 
                    alt="AI Avatar" 
                    className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-45 group-hover:scale-105 transition-all duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090a14] via-[#090a14]/70 to-transparent" />

                  <div className="relative z-10 flex justify-between items-start">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-purple-500/40 backdrop-blur-md flex items-center justify-center shadow-lg">
                      <Bot size={16} className="text-purple-400" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[7px] font-black uppercase tracking-widest text-purple-300 backdrop-blur-md">
                      👤 Аватар
                    </span>
                  </div>

                  <div className="relative z-10 space-y-1">
                    <h3 className="text-base font-black italic uppercase tracking-tighter text-white leading-none">Аватар Студия</h3>
                    <p className="text-[9px] font-bold text-purple-200/60 uppercase tracking-widest leading-tight">
                      HeyGen ИИ-диктор по сценарию
                    </p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="shrink-0 pt-1">
          <button
            onClick={onBack}
            className="py-2 px-6 rounded-xl text-white/20 hover:text-white/40 text-[9px] font-black uppercase tracking-[0.25em] transition-colors"
          >
            Вернуться к Сценарию
          </button>
        </div>
      </motion.div>
    </div>
  );
};
