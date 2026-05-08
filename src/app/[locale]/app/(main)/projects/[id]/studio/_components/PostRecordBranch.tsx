'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Scissors, Sparkles, ArrowRight, Play, User, Download, Send } from 'lucide-react';

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
    <div className="h-full w-full flex flex-col bg-[#050508] overflow-y-auto pb-10">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 flex flex-col items-center">
          
          {/* Video Preview */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full aspect-[9/16] max-h-[35vh] bg-neutral-900 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group"
          >
            <video 
              src={videoUrl} 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover"
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none">
              TAKE IS<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">MASTERED</span>
            </h2>
          </motion.div>

          {/* PRIMARY ACTIONS (JTBD: Finalizing the content) */}
          <div className="w-full space-y-3 pt-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect('pure')}
              className="w-full py-5 rounded-[2rem] bg-purple-600 text-white font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-purple-900/40 flex items-center justify-center gap-2"
            >
              В МОНТАЖ <ArrowRight size={16} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect('animate')}
              className="w-full py-4 rounded-[2rem] bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2"
            >
              БИБЛИОТЕКА ЛУКОВ <Sparkles size={14} className="text-purple-400" />
            </motion.button>
          </div>

          {/* SECONDARY ACTIONS (Backup / Safety) */}
          <div className="grid grid-cols-2 gap-3 w-full pt-4 border-t border-white/5">
            <button
              onClick={onDownload}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.02] border border-white/5 text-white/30 hover:text-white/60 transition-all"
            >
              <Download size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">Save</span>
            </button>

            <button
              onClick={onTelegram}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.02] border border-white/5 text-white/30 hover:text-white/60 transition-all"
            >
              <Send size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">Telegram</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
