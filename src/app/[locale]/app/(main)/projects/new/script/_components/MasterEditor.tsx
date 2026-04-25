'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, History } from 'lucide-react';

interface MasterEditorProps {
  text: string;
  selectionSources: Record<string, string>;
  onOverride: (text: string) => void;
  isOverride: boolean;
}

export function MasterEditor({
  text,
  selectionSources,
  onOverride,
  isOverride
}: MasterEditorProps) {
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-16 p-[2px] rounded-[2.5rem] bg-gradient-to-br from-yellow-400 via-purple-500 to-cyan-400 shadow-[0_30px_100px_rgba(250,204,21,0.15)] relative z-20 group/master"
    >
      <div className="bg-[#0c0c16] rounded-[2.4rem] p-6 border border-white/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 flex items-center justify-center border border-yellow-400/20 shadow-[0_0_20px_rgba(250,204,21,0.1)]">
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Master Content</h3>
              <p className="text-[10px] text-yellow-400/50 uppercase tracking-widest font-bold">The Ultimate Frankenstein Mix</p>
            </div>
          </div>
          <button 
            onClick={handleCopy}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all text-[11px] font-black uppercase tracking-widest ${
              copyFeedback ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 active:scale-95'
            } border shadow-xl`}
          >
            <History className={`w-4 h-4 ${copyFeedback ? 'animate-bounce' : ''}`} />
            {copyFeedback ? 'Copied!' : 'Copy'}
          </button>
        </div>
        
        <textarea 
          value={text}
          onChange={(e) => onOverride(e.target.value)}
          className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-5 text-base leading-[1.8] text-white/95 focus:outline-none focus:border-yellow-400/30 resize-none min-h-[250px] font-medium transition-all shadow-inner"
          placeholder="Select blocks above or type here to craft your final script..."
        />

        <div className="mt-5 pt-5 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1.5">
              {['hook', 'problem', 'good_news', 'solution', 'cta'].map((id) => {
                const src = selectionSources[id];
                return (
                  <div 
                    key={id} 
                    className={`w-4 h-4 rounded-full border-2 border-[#0c0c16] scale-110 shadow-lg ${
                      src === 'evergreen' ? 'bg-emerald-400' : 
                      src === 'trend' ? 'bg-purple-500' : 'bg-yellow-400'
                    }`} 
                  />
                );
              })}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Nerve Synthesis</span>
          </div>
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-white/50 uppercase tracking-tighter">
            {text.split(/\s+/).filter(Boolean).length} words
          </div>
        </div>
      </div>
    </motion.div>
  );
}
