'use client';

import React from 'react';
import { SceneSegment } from '@/lib/types/studio';
import { Monitor, CheckCircle2, RefreshCw, Scissors, Plus } from 'lucide-react';

interface StudioTimelineProps {
  segments: SceneSegment[];
  activeIndex: number;
  selectedId: string | null;
  onSelect: (id: string, index: number) => void;
  onAdd: () => void;
  isRegenerating?: string | null;
}

const StudioTimeline: React.FC<StudioTimelineProps> = ({ 
  segments, 
  activeIndex, 
  selectedId, 
  onSelect, 
  onAdd,
  isRegenerating 
}) => {
  return (
    <div className="w-full bg-[#0a0a14] border-t border-white/5 py-4 overflow-hidden flex flex-col gap-2">
      <div className="flex items-center justify-between px-6 mb-2">
        <span className="text-[10px] font-black uppercase text-white/20 tracking-widest flex items-center gap-2">
          <Scissors size={12} /> Timeline <span className="text-white/5 mx-1">|</span> {segments.length} Clips
        </span>
        <button 
          onClick={onAdd}
          className="p-1 px-3 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest hover:bg-purple-500/20 transition-all flex items-center gap-1.5"
        >
          <Plus size={12} /> Add Clip
        </button>
      </div>

      <div className="flex gap-2 px-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory">
        {segments.map((s, idx) => (
          <div 
            key={s.id}
            onClick={() => onSelect(s.id, idx)}
            className={`flex-none w-32 aspect-[9/16] rounded-xl border transition-all cursor-pointer relative snap-start group ${
              selectedId === s.id ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-white/5 hover:border-white/20'
            } ${activeIndex === idx ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-[#05050a]' : ''}`}
          >
            {/* Thumbnail */}
            <div className="absolute inset-0 bg-[#0d0d1a] overflow-hidden rounded-[calc(0.75rem-1px)]">
              {s.assetUrl ? (
                s.type.includes('avatar') ? (
                  <video src={s.assetUrl} className="w-full h-full object-cover opacity-60" muted />
                ) : (
                  <div 
                    className="w-full h-full bg-cover bg-center opacity-60" 
                    style={{ backgroundImage: `url('${s.assetUrl}')` }} 
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/10 uppercase font-black text-[8px] flex-col gap-2">
                  <Monitor size={16} />
                  <span>Pending</span>
                </div>
              )}
              
              {/* Overlays */}
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                 <p className="text-[8px] font-bold text-white/60 uppercase truncate">{s.type.replace('_', ' ')}</p>
              </div>
              
              {isRegenerating === s.id && (
                <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center backdrop-blur-sm">
                  <RefreshCw size={16} className="animate-spin text-white" />
                </div>
              )}
            </div>

            {/* Selection/Status Indicator */}
            <div className="absolute top-2 right-2 flex gap-1">
               {s.status === 'completed' && <CheckCircle2 size={12} className="text-green-500" />}
            </div>
            
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/40 backdrop-blur-md border border-white/5">
              <span className="text-[7px] font-black text-white/60">0:{Math.floor(s.duration || 5).toString().padStart(2, '0')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudioTimeline;
