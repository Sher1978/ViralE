'use client';

import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Maximize2 } from 'lucide-react';
import { SceneSegment } from '@/lib/types/studio';

interface StudioPreviewProps {
  currentSegment: SceneSegment | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const StudioPreview: React.FC<StudioPreviewProps> = ({
  currentSegment,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0">
      <div className="relative aspect-[9/16] h-full max-h-[65vh] bg-[#0d0d1a] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group">
        {/* Content Layer */}
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          {currentSegment ? (
            currentSegment.type.includes('avatar') ? (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                {currentSegment.assetUrl ? (
                  <video 
                    src={currentSegment.assetUrl} 
                    autoPlay 
                    muted 
                    loop 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">Loading AI Meta-Human...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full relative overflow-hidden">
                {currentSegment.assetUrl && (
                  <div 
                    className="absolute inset-0 bg-cover bg-center" 
                    style={{ 
                      backgroundImage: `url('${currentSegment.assetUrl}')`,
                    }} 
                  />
                )}
                {currentSegment.overlayBroll && (
                  <div className="absolute inset-0 z-20 mix-blend-screen opacity-50">
                    <video src={currentSegment.overlayBroll} autoPlay muted loop className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Play size={48} className="text-white/5" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/10">No Scene Selected</p>
            </div>
          )}
        </div>

        {/* Playback Controls Overlay (Visible on Hover/Touch) */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-8 z-30">
           <div className="flex items-center gap-12">
              <button 
                onClick={onPrev}
                className="p-4 rounded-full bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
              >
                <SkipBack size={24} fill="currentColor" />
              </button>
              <button 
                onClick={onTogglePlay}
                className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-2xl active:scale-95 transition-all"
              >
                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
              </button>
              <button 
                onClick={onNext}
                className="p-4 rounded-full bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
              >
                <SkipForward size={24} fill="currentColor" />
              </button>
           </div>
           
           <button className="absolute bottom-10 right-10 p-3 rounded-2xl bg-white/10 border border-white/5 text-white/40">
              <Maximize2 size={18} />
           </button>
        </div>

        {/* Metadata Overlay */}
        {currentSegment && (
          <div className="absolute top-8 left-8 z-40 pointer-events-none">
             <div className="px-3 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 mb-2">
                <span className="text-[8px] font-black uppercase text-purple-400 tracking-widest">{currentSegment.type}</span>
             </div>
             <p className="text-[12px] font-bold text-white/80 leading-relaxed max-w-[200px] drop-shadow-lg italic">
               "{currentSegment.scriptText?.substring(0, 80)}..."
             </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudioPreview;
