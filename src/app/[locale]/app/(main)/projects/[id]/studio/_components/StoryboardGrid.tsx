'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, Plus, ChevronRight, Monitor, 
  RefreshCw, Trash2 
} from 'lucide-react';
import { ProductionManifest } from '@/lib/types/studio';

interface StoryboardGridProps {
  manifest: ProductionManifest | null;
  selectedSegmentId: string | null;
  setSelectedSegmentId: (id: string | null) => void;
  isRegenerating: string | null;
  regenerateSegment: (id: string, prompt?: string) => Promise<void>;
  deleteSegment: (id: string) => void;
  updateSegmentField: (id: string, field: string, value: any) => void;
  addSegment: (type?: any) => void;
  handleFinalExport: () => void;
  setIsBRollModalOpen: (open: boolean) => void;
}

export const StoryboardGrid: React.FC<StoryboardGridProps> = ({
  manifest,
  selectedSegmentId,
  setSelectedSegmentId,
  isRegenerating,
  regenerateSegment,
  deleteSegment,
  updateSegmentField,
  addSegment,
  handleFinalExport,
  setIsBRollModalOpen,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-[#05050a] p-4 md:p-8 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <Scissors size={28} className="text-purple-400" />
            Storyboard <span className="text-purple-400">Assembly</span>
          </h2>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Multi-Layer Visual Orchestration</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-4">
            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Total Production</span>
            <span className="text-xs font-black text-white">{manifest?.segments.length || 0} Scenes</span>
          </div>
          <button 
            onClick={() => addSegment('animated_still')}
            className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> New Scene
          </button>
          <button 
            onClick={handleFinalExport}
            className="px-8 py-3 rounded-2xl bg-purple-500 text-white font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-purple-500/20 flex items-center gap-2"
          >
            Final Assembly <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
          {manifest?.segments.map((s, idx) => (
            <motion.div 
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedSegmentId(s.id)}
              className={`group relative flex flex-col rounded-[2rem] border transition-all duration-500 overflow-hidden ${selectedSegmentId === s.id ? 'bg-white/5 border-purple-500 ring-2 ring-purple-500/20 shadow-2xl scale-[1.02]' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}
            >
              {/* Card Header: Scene Index & Status */}
              <div className="p-4 flex items-center justify-between border-b border-white/5 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-white/40">0{idx + 1}</span>
                  <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">{s.type.replace('_', ' ')}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteSegment(s.id); }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-red-500 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Visual Preview Container (Dual Layer) */}
              <div className="aspect-[9/16] bg-black relative overflow-hidden group-hover:cursor-pointer">
                {/* Layer 1: Base Media (User Video or AI Gen) */}
                <div className="absolute inset-0 z-0">
                  {s.assetUrl ? (
                    s.type === 'user_recording' ? (
                      <video src={s.assetUrl} className="w-full h-full object-cover opacity-60" muted />
                    ) : (
                      <div className="w-full h-full bg-cover bg-center opacity-60" style={{ backgroundImage: `url('${s.assetUrl}')` }} />
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/5 gap-3">
                      <Monitor size={32} />
                      <span className="text-[8px] font-black uppercase">Source Missing</span>
                    </div>
                  )}
                </div>

                {/* Layer 2: B-Roll Overlay Preview */}
                <AnimatePresence>
                  {s.overlayBroll && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-4 rounded-3xl border border-white/10 shadow-2xl overflow-hidden z-20"
                    >
                      <div className="absolute top-2 left-2 px-2 py-1 bg-purple-500 rounded-lg text-[7px] font-black uppercase z-30">B-ROLL</div>
                      <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${s.overlayBroll}')` }} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hover Controls for B-Roll */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex flex-col items-center justify-center p-6 gap-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsBRollModalOpen(true); }}
                    className="w-full py-3 rounded-2xl bg-white text-black text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 transition-all"
                  >
                    <Plus size={14} /> Pick B-Roll
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); regenerateSegment(s.id); }}
                    className="w-full py-3 rounded-2xl bg-white/10 border border-white/20 text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
                  >
                    <RefreshCw size={14} className={isRegenerating === s.id ? 'animate-spin' : ''} />
                    Regenerate
                  </button>
                </div>
              </div>

              {/* Script / Text Block */}
              <div className="p-5 bg-white/[0.02] border-t border-white/5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase text-white/20 tracking-widest italic">Act Transcript</span>
                  <span className="text-[8px] font-black text-purple-400">10.5s</span>
                </div>
                <textarea 
                  value={s.scriptText}
                  onChange={(e) => updateSegmentField(s.id, 'scriptText', e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-[11px] leading-relaxed italic text-white/60 focus:ring-0 resize-none h-16 scrollbar-none"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
