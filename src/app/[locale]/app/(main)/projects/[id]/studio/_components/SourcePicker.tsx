'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Upload, Video, ArrowRight, Monitor, Cpu } from 'lucide-react';

interface SourcePickerProps {
  onSelect: (type: 'ai' | 'upload' | 'record') => void;
  onBack: () => void;
}

export const SourcePicker: React.FC<SourcePickerProps> = ({ onSelect, onBack }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#05050a] p-8 animate-in fade-in zoom-in-95 duration-700">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-4">
            A-Roll <span className="text-purple-400">Foundation</span>
          </h2>
          <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.4em]">Select the primary visual anchor for your production</p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* AI Faceless Option */}
          <motion.button 
            whileHover={{ scale: 1.02, y: -5 }}
            whileActive={{ scale: 0.98 }}
            onClick={() => onSelect('ai')}
            className="group relative h-[400px] rounded-[3rem] bg-white/[0.03] border border-white/5 hover:border-purple-500/50 hover:bg-white/[0.06] transition-all overflow-hidden flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-20 h-20 rounded-3xl bg-purple-500/20 flex items-center justify-center mb-8 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
              <Cpu size={40} className="text-purple-400" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase italic mb-3">AI Faceless</h3>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Generate cinematic AI avatars or abstract visuals using your expert DNA</p>
            <div className="mt-8 flex items-center gap-2 text-purple-400 font-black text-[9px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
              Initialize Matrix <ArrowRight size={14} />
            </div>
          </motion.button>

          {/* Upload Option */}
          <motion.button 
            whileHover={{ scale: 1.02, y: -5 }}
            whileActive={{ scale: 0.98 }}
            onClick={() => onSelect('upload')}
            className="group relative h-[400px] rounded-[3rem] bg-white/[0.03] border border-white/5 hover:border-cyan-500/50 hover:bg-white/[0.06] transition-all overflow-hidden flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/20 flex items-center justify-center mb-8 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
              <Upload size={40} className="text-cyan-400" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase italic mb-3">Upload Media</h3>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Import high-quality RAW footage recorded on external devices</p>
            <div className="mt-8 flex items-center gap-2 text-cyan-400 font-black text-[9px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
              Browse Files <ArrowRight size={14} />
            </div>
          </motion.button>

          {/* Record Option */}
          <motion.button 
            whileHover={{ scale: 1.02, y: -5 }}
            whileActive={{ scale: 0.98 }}
            onClick={() => onSelect('record')}
            className="group relative h-[400px] rounded-[3rem] bg-white/[0.03] border border-white/5 hover:border-emerald-500/50 hover:bg-white/[0.06] transition-all overflow-hidden flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 flex items-center justify-center mb-8 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <Video size={40} className="text-emerald-400" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase italic mb-3">Studio Record</h3>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Launch the iPhone-optimized teleprompter cockpit for a new take</p>
            <div className="mt-8 flex items-center gap-2 text-emerald-400 font-black text-[9px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
              Start Session <ArrowRight size={14} />
            </div>
          </motion.button>
        </div>

        {/* Footer info */}
        <div className="mt-16 flex items-center justify-center gap-4 text-[8px] font-black uppercase text-white/10 tracking-[0.3em]">
           <span>4K Production</span>
           <div className="w-1 h-1 rounded-full bg-white/10" />
           <span>Dolby Atmos Ready</span>
           <div className="w-1 h-1 rounded-full bg-white/10" />
           <span>Neural Synthesis</span>
        </div>
      </div>
    </div>
  );
};
