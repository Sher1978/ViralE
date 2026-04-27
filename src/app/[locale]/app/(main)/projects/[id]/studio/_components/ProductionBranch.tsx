import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Sparkles, ChevronRight } from 'lucide-react';

interface ProductionBranchProps {
  onSelect: (type: 'record' | 'faceless') => void;
  onBack: () => void;
}

export const ProductionBranch: React.FC<ProductionBranchProps> = ({ onSelect, onBack }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full space-y-12"
      >
        <div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white mb-3">
            Выберите путь <span className="text-purple-400">Продакшна</span>
          </h2>
          <p className="text-[12px] text-white/30 uppercase tracking-[0.2em] font-bold">
            Сценарий готов. Как будем создавать контент?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Option 1: Record */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect('record')}
            className="group relative h-80 rounded-[3rem] bg-white/[0.03] border border-white/5 overflow-hidden flex flex-col items-center justify-center p-8 text-center transition-all hover:bg-white/[0.05] hover:border-white/10"
          >
             <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="w-24 h-24 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_60px_rgba(6,182,212,0.3)] transition-all">
                <Camera size={40} className="text-cyan-400" />
             </div>
             <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">Записать Себя</h3>
             <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed max-w-[200px]">
               Используйте телесуфлер для записи живого видео с вашей подачей
             </p>
             <div className="mt-8 flex items-center gap-2 text-cyan-400 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
               Выбрать <ChevronRight size={14} />
             </div>
          </motion.button>

          {/* Option 2: AI Faceless */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect('faceless')}
            className="group relative h-80 rounded-[3rem] bg-white/[0.03] border border-white/5 overflow-hidden flex flex-col items-center justify-center p-8 text-center transition-all hover:bg-white/[0.05] hover:border-white/10"
          >
             <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="w-24 h-24 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(168,85,247,0.15)] group-hover:shadow-[0_0_60px_rgba(168,85,247,0.3)] transition-all">
                <Sparkles size={40} className="text-purple-400" />
             </div>
             <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">AI Faceless</h3>
             <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed max-w-[200px]">
               Полностью автоматическая генерация сцен и озвучки ИИ голосом
             </p>
             <div className="mt-8 flex items-center gap-2 text-purple-400 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
               Выбрать <ChevronRight size={14} />
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
