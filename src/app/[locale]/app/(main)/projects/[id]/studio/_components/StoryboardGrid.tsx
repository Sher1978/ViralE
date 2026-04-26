'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, Plus, ChevronRight, Monitor, Video,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <Scissors size={24} className="text-purple-400" />
            </span>
            Final <span className="text-purple-400">Assembly</span>
          </h2>
          <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.3em] mt-2 ml-1">Sequence Orchestration Stage</p>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={handleFinalExport}
            className="group relative px-10 py-5 rounded-[2rem] bg-purple-500 text-white font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(168,85,247,0.3)] flex items-center gap-3"
          >
             Assemble Final Video
             <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
               <ChevronRight size={14} />
             </div>
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
              className={`group relative flex flex-col rounded-[2.5rem] border transition-all duration-500 overflow-hidden ${selectedSegmentId === s.id ? 'bg-white/10 border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.1)] scale-[1.02]' : 'bg-white/[0.03] border-white/5 hover:border-white/10'}`}
            >
              {/* Card HUD */}
              <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center text-[10px] font-black text-white/60 border border-white/10">0{idx + 1}</span>
                <span className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md text-[7px] font-black uppercase text-white/40 tracking-[0.2em] border border-white/10">{s.type.replace('_', ' ')}</span>
              </div>

              {/* Visual Frame */}
              <div className="aspect-[9/16] relative bg-black/40 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 z-0">
                  {s.assetUrl ? (
                    s.type === 'user_recording' ? (
                      <video src={s.assetUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <div className="w-full h-full bg-cover bg-center opacity-80" style={{ backgroundImage: `url('${s.assetUrl}')` }} />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-3 opacity-10">
                      <Monitor size={48} />
                      <span className="text-[10px] font-black uppercase tracking-widest">No Media</span>
                    </div>
                  )}
                </div>

                {/* B-Roll Preview Overlay */}
                <AnimatePresence>
                  {s.overlayBroll && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute inset-6 rounded-[2rem] border border-white/20 shadow-2xl overflow-hidden z-20 group-hover:scale-95 transition-transform duration-500"
                    >
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 rounded-full text-[7px] font-black uppercase z-30 shadow-lg">B-Roll Active</div>
                      <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${s.overlayBroll}')` }} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hover States - Primary Actions only */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 z-30 flex flex-col items-center justify-center p-8 gap-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsBRollModalOpen(true); }}
                    className="w-full py-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-purple-400 transition-all"
                  >
                    <Plus size={16} /> {s.overlayBroll ? 'Change B-Roll' : 'Add B-Roll'}
                  </button>
                </div>
              </div>

              {/* Minimal Script & Styling Editor */}
              <div className="p-6 bg-black/40 backdrop-blur-xl border-t border-white/5 flex flex-col gap-4 relative z-10">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                      <span className="text-[9px] font-black text-white/40 tracking-[0.2em] uppercase">Narrative Layer</span>
                   </div>
                   {/* Subtitle Style Picker */}
                   <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
                      {['minimal', 'pop', 'bold'].map(style => (
                        <button 
                          key={style}
                          onClick={(e) => { e.stopPropagation(); updateSegmentField(s.id, 'captionStyle', style); }}
                          className={`px-3 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all ${s.captionStyle === style ? 'bg-purple-500 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}
                        >
                          {style}
                        </button>
                      ))}
                   </div>
                </div>
                
                <textarea 
                  value={s.scriptText}
                  onChange={(e) => updateSegmentField(s.id, 'scriptText', e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-[13px] font-medium leading-relaxed italic text-white/70 focus:text-white focus:ring-0 resize-none h-20 transition-colors scrollbar-none"
                  placeholder="Tell your story here..."
                />

                {/* Layer Indicators (CapCut Style) */}
                <div className="flex items-center gap-3 pt-2">
                   <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${s.assetUrl ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-white/20'}`}>
                      <Video size={10} />
                      <span className="text-[7px] font-black uppercase">A-Roll</span>
                   </div>
                   <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${s.overlayBroll ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-white/5 border-white/10 text-white/20'}`}>
                      <Monitor size={10} />
                      <span className="text-[7px] font-black uppercase">B-Roll</span>
                   </div>
                </div>
              </div>
            </motion.div>
          ))}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
