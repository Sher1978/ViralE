'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Scissors, Sparkles, ArrowRight, Play, User } from 'lucide-react';

interface PostRecordBranchProps {
  videoUrl: string;
  onSelect: (type: 'pure' | 'animate') => void;
  onDownload?: () => void;
  onTelegram?: () => void;
  t: (key: string) => string;
}

export const PostRecordBranch: React.FC<PostRecordBranchProps> = ({
  videoUrl,
  onSelect,
  onDownload,
  onTelegram,
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
            className="text-center"
          >
            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">
              TAKE IS<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">MASTERED</span>
            </h2>
            <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em] mt-4">
              Ready for final editing
            </p>
          </motion.div>

          {/* Quick Actions (The Save/TG Buttons from screenshot) */}
          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDownload}
              className="flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                <Scissors size={20} className="text-white/60" /> {/* Download icon proxy */}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Save</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onTelegram}
              className="flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                <Sparkles size={20} className="text-white/60" /> {/* Telegram icon proxy */}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Telegram</span>
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect('pure')}
            className="w-full py-6 rounded-[2.5rem] bg-purple-600 text-white font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-purple-900/40 flex items-center justify-center gap-3"
          >
            В МОНТАЖ <ArrowRight size={18} />
          </motion.button>

          <button 
            onClick={() => onSelect('animate')}
            className="w-full py-4 text-[10px] font-black uppercase tracking-[0.4em] text-white/10 hover:text-purple-400 transition-colors"
          >
            Библиотека луков
          </button>
        </div>
      </div>
    </div>
  );
};
