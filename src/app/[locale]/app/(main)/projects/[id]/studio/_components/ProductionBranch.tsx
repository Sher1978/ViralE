import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Sparkles, Mic, Bot } from 'lucide-react';

interface ProductionBranchProps {
  onSelect: (type: 'record' | 'faceless' | 'voice-master' | 'heygen-avatar') => void;
  onBack: () => void;
}

export const ProductionBranch: React.FC<ProductionBranchProps> = ({ onSelect, onBack }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 text-center overflow-y-auto py-8">
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
            Сценарий готов. Как будем создавать контент?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Option 1: Record */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect('record')}
            className="group relative h-56 rounded-[2.5rem] bg-white/[0.03] border border-white/5 overflow-hidden flex flex-col items-center justify-center p-6 text-center transition-all hover:bg-white/[0.05] hover:border-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(6,182,212,0.1)] group-hover:shadow-[0_0_50px_rgba(6,182,212,0.2)] transition-all">
              <Camera size={28} className="text-cyan-400" />
            </div>
            <h3 className="text-base font-black italic uppercase tracking-tighter text-white mb-1 leading-none">Записать Себя</h3>
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-tight max-w-[150px]">
              Телесуфлер для записи живого видео
            </p>
          </motion.button>

          {/* Option 2: Voice Master */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect('voice-master')}
            className="group relative h-56 rounded-[2.5rem] bg-white/[0.03] border border-white/5 overflow-hidden flex flex-col items-center justify-center p-6 text-center transition-all hover:bg-white/[0.05] hover:border-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(168,85,247,0.1)] group-hover:shadow-[0_0_50px_rgba(168,85,247,0.2)] transition-all">
              <Mic size={28} className="text-purple-400" />
            </div>
            <h3 className="text-base font-black italic uppercase tracking-tighter text-white mb-1 leading-none">Voice Master</h3>
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-tight max-w-[150px]">
              Голос + фото → AI генерирует видео
            </p>
          </motion.button>

          {/* Option 3: AI Faceless */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect('faceless')}
            className="group relative h-56 rounded-[2.5rem] bg-white/[0.03] border border-white/5 overflow-hidden flex flex-col items-center justify-center p-6 text-center transition-all hover:bg-white/[0.05] hover:border-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(16,185,129,0.1)] group-hover:shadow-[0_0_50px_rgba(16,185,129,0.2)] transition-all">
              <Sparkles size={28} className="text-emerald-400" />
            </div>
            <h3 className="text-base font-black italic uppercase tracking-tighter text-white mb-1 leading-none">AI Faceless</h3>
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-tight max-w-[150px]">
              Авто-генерация сцен и озвучки
            </p>
          </motion.button>

          {/* Option 4: HeyGen Avatar */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect('heygen-avatar')}
            className="group relative h-56 rounded-[2.5rem] overflow-hidden flex flex-col items-center justify-center p-6 text-center transition-all border"
            style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.06) 0%, rgba(59,130,246,0.06) 100%)',
              borderColor: 'rgba(168,85,247,0.25)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />

            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(168,85,247,0.2)] group-hover:shadow-[0_0_60px_rgba(168,85,247,0.4)] transition-all">
              <Bot size={28} className="text-purple-400" />
            </div>
            <h3 className="text-base font-black italic uppercase tracking-tighter text-white mb-1 leading-none relative">HeyGen Avatar</h3>
            <p className="text-[9px] font-bold text-purple-300/40 uppercase tracking-widest leading-tight max-w-[150px] relative">
              AI-аватар по вашему сценарию
            </p>

            {/* BYOK badge */}
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30">
              <span className="text-[7px] font-black uppercase tracking-widest text-purple-400">BYOK</span>
            </div>
          </motion.button>
        </div>

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
