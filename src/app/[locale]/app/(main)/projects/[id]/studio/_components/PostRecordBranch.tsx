'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Scissors, Sparkles, ArrowRight, Play, User } from 'lucide-react';

interface PostRecordBranchProps {
  videoUrl: string;
  onSelect: (type: 'pure' | 'animate') => void;
  t: (key: string) => string;
}

export const PostRecordBranch: React.FC<PostRecordBranchProps> = ({
  videoUrl,
  onSelect,
  t
}) => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-[#050508]">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        
        {/* Left: Video Preview */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative aspect-[9/16] bg-neutral-900 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl group"
        >
          <video 
            src={videoUrl} 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-6 left-6 right-6 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Raw Recording Ready</span>
          </div>
        </motion.div>

        {/* Right: Choices */}
        <div className="flex flex-col gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-4xl font-black italic uppercase tracking-tight text-white mb-2 leading-none">
              Perfect Take.
            </h2>
            <p className="text-white/40 text-sm font-medium leading-relaxed">
              Choose how you want to proceed with this performance.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-4">
            {/* Option 1: Pure Reality */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect('pure')}
              className="group relative p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Scissors size={80} className="text-white rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors">
                  <Play className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-1 uppercase tracking-tight italic">В МОНТАЖ</h3>
                <p className="text-white/40 text-xs font-medium">Отправить оригинальную запись сразу в студию сборки</p>
                <div className="mt-4 flex items-center gap-2 text-white/20 group-hover:text-white transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-widest">Pure Reality</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </motion.button>

            {/* Option 2: AI Face Fusion */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect('animate')}
              className="group relative p-6 rounded-3xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 hover:border-purple-400/50 transition-all text-left overflow-hidden shadow-lg shadow-purple-900/20"
            >
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                <Sparkles size={80} className="text-purple-400 -rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-purple-500 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                  <User className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-1 italic uppercase tracking-tight">БИБЛИОТЕКА ЛУКОВ</h3>
                <p className="text-white/40 text-xs font-medium">Оживить фото-аватар твоей мимикой через AI</p>
                <div className="mt-4 flex items-center gap-2 text-purple-400 group-hover:text-purple-300 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-widest">AI Face Fusion</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
