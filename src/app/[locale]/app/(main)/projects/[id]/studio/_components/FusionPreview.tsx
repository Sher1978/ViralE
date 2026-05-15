'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, Share, Download, FileVideo, CheckCircle2, ChevronRight, Wand2 } from 'lucide-react';

interface FusionPreviewProps {
  videoUrl: string;
  onRegenerate: () => void;
  onExportToMontage: () => void;
}

export const FusionPreview: React.FC<FusionPreviewProps> = ({
  videoUrl,
  onRegenerate,
  onExportToMontage
}) => {
  return (
    <div className="h-full w-full flex flex-col bg-[#020205] text-white overflow-hidden relative">
      {/* Premium Header */}
      <div className="px-8 py-6 flex items-center justify-between border-b border-white/5 z-50 bg-[#020205]/80 backdrop-blur-2xl">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
             <CheckCircle2 size={24} strokeWidth={3} />
          </div>
          <div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
              Fusion Ready
            </h2>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 mt-1">AI Synthesis Pipeline Completed</p>
          </div>
        </div>

        <button 
          onClick={onExportToMontage}
          className="px-10 py-4 rounded-[2rem] bg-white text-black font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-white/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          В МОНТАЖ (A-ROLL)
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
         {/* Background Glow */}
         <div className="absolute inset-0 bg-gradient-to-b from-purple-600/5 to-transparent pointer-events-none" />
         
         <div className="relative h-full aspect-[9/16] bg-black rounded-[3.5rem] overflow-hidden shadow-[0_0_120px_rgba(34,197,94,0.15)] border-4 border-white/10 group">
            <video 
              src={videoUrl}
              autoPlay
              loop
              muted={false}
              controls
              className="w-full h-full object-cover"
            />
            
            {/* Overlay Info */}
            <div className="absolute top-8 left-8 right-8 flex items-center justify-between pointer-events-none">
               <div className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[8px] font-black uppercase tracking-widest text-white/60">
                  Preview Mode
               </div>
               <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/40">
                  <Wand2 size={16} className="text-white" />
               </div>
            </div>
         </div>

         {/* Actions Bar */}
         <div className="mt-12 flex items-center gap-6">
            <button 
              onClick={onRegenerate}
              className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 text-white/60 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-[0.2em]"
            >
               <RotateCcw size={16} />
               Регенерировать
            </button>
            
            <div className="w-px h-8 bg-white/5" />
            
            <button 
              onClick={() => {}} // Download logic if needed
              className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
               <Download size={20} />
            </button>
            <button 
              onClick={() => {}} // Share logic
              className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
               <Share size={20} />
            </button>
         </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="px-12 py-6 bg-black/40 backdrop-blur-xl border-t border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-8">
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Resolution</span>
               <span className="text-[10px] font-black text-white/60">1080x1920 (9:16)</span>
            </div>
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">AI Engine</span>
               <span className="text-[10px] font-black text-white/60 italic">Live Portrait v2</span>
            </div>
         </div>
         
         <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-green-500/5 border border-green-500/10">
            <CheckCircle2 size={14} className="text-green-500" />
            <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">A-Roll Export Optimized</span>
         </div>
      </div>
    </div>
  );
};
