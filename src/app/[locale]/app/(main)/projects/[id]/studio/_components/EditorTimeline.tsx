'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Plus, Type, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

interface TimelineOverlay {
  id: string;
  type: 'broll' | 'subtitle';
  startTime: number;
  duration: number;
  content?: string;
}

interface EditorTimelineProps {
  totalDuration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  aRollUrl?: string | null;
  brollClips?: TimelineOverlay[];
  subtitleClips?: TimelineOverlay[];
  onCreateBroll?: (time: number) => void;
  onCaptionClick?: (id: string) => void;
}

const PX_PER_SECOND = 100; // High density for Edits style

export const EditorTimeline: React.FC<EditorTimelineProps> = ({
  totalDuration = 60,
  currentTime = 0,
  onSeek,
  aRollUrl,
  brollClips = [],
  subtitleClips = [],
  onCreateBroll,
  onCaptionClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const isProgrammaticScrollRef = useRef(false);

  // Sync scroll position with current time
  useEffect(() => {
    if (containerRef.current && !isScrolling) {
      const targetX = currentTime * PX_PER_SECOND;
      if (Math.abs(containerRef.current.scrollLeft - targetX) > 5) {
        isProgrammaticScrollRef.current = true;
        containerRef.current.scrollLeft = targetX;
      }
    }
  }, [currentTime, isScrolling]);

  const handleScroll = () => {
    if (isProgrammaticScrollRef.current) {
      isProgrammaticScrollRef.current = false;
      return;
    }

    if (containerRef.current) {
      const scrollLeft = containerRef.current.scrollLeft;
      const newTime = scrollLeft / PX_PER_SECOND;
      if (Math.abs(newTime - currentTime) > 0.1) {
        onSeek(Math.max(0, Math.min(newTime, totalDuration)));
      }
    }
  };

  // Generate frame markers for the ruler
  const markers = useMemo(() => {
    const items = [];
    const step = 0.5;
    for (let i = 0; i <= totalDuration; i += step) {
      const isFullSecond = i % 1 === 0;
      items.push(
        <div key={i} className="absolute flex flex-col items-center" style={{ left: i * PX_PER_SECOND }}>
          <div className={`w-[1px] bg-white/${isFullSecond ? '20' : '10'} ${isFullSecond ? 'h-2' : 'h-1'}`} />
          {isFullSecond && (
            <span className="text-[9px] font-medium text-white/30 mt-1 tabular-nums">
              {i < 1 ? `${Math.round(i * 24)}f` : `${Math.floor(i)}s`}
            </span>
          )}
        </div>
      );
    }
    return items;
  }, [totalDuration]);

  return (
    <div className="w-full bg-[#080808] border-t border-white/[0.06] flex flex-col select-none h-48">
      {/* 1. Ruler Layer */}
      <div className="h-8 relative overflow-hidden border-b border-white/[0.03]">
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          onMouseDown={() => setIsScrolling(true)}
          onMouseUp={() => setIsScrolling(false)}
          className="absolute inset-0 overflow-x-auto no-scrollbar"
        >
          <div className="relative h-full" style={{ width: totalDuration * PX_PER_SECOND + 1000, paddingLeft: '50%', paddingRight: '50%' }}>
            {markers}
          </div>
        </div>
      </div>

      {/* 2. Audio/Needle Layer */}
      <div className="flex-1 relative overflow-hidden bg-black/40">
        <div 
            className="absolute inset-0 overflow-x-auto no-scrollbar pointer-events-none"
            style={{ scrollLeft: currentTime * PX_PER_SECOND }}
        >
            <div className="relative h-full" style={{ width: totalDuration * PX_PER_SECOND + 1000, paddingLeft: '50%', paddingRight: '50%' }}>
                
                {/* B-ROLL TRACK */}
                <div className="absolute top-2 h-12 flex gap-1 pointer-events-auto">
                    {brollClips.map(clip => (
                        <div 
                            key={clip.id}
                            className="absolute h-full rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center px-2 overflow-hidden"
                            style={{ 
                                left: clip.startTime * PX_PER_SECOND, 
                                width: clip.duration * PX_PER_SECOND 
                            }}
                        >
                            <Layers size={12} className="text-blue-400 mr-1 flex-shrink-0" />
                            <span className="text-[9px] text-blue-200 truncate font-bold uppercase">Scene</span>
                        </div>
                    ))}
                </div>

                {/* SUBTITLE TRACK */}
                <div className="absolute bottom-2 h-8 flex gap-1 pointer-events-auto">
                    {subtitleClips.map(clip => (
                        <button 
                            key={clip.id}
                            onClick={() => onCaptionClick?.(clip.id)}
                            className={`absolute h-full rounded bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/30 transition-colors flex items-center px-2 overflow-hidden ${Math.abs(currentTime - clip.startTime) < 0.2 ? 'ring-1 ring-yellow-400' : ''}`}
                            style={{ 
                                left: clip.startTime * PX_PER_SECOND, 
                                width: clip.duration * PX_PER_SECOND 
                            }}
                        >
                            <Type size={10} className="text-yellow-400 mr-1 flex-shrink-0" />
                            <span className="text-[8px] text-yellow-200 truncate font-medium">{clip.content || '...'}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Center Needle (Fixed) */}
        <div className="absolute inset-y-0 left-1/2 w-[2px] bg-white z-20 pointer-events-none shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45" />
        </div>
      </div>
      
      {/* 3. Action Row */}
      <div className="h-10 border-t border-white/5 bg-white/[0.02] flex items-center px-4 justify-between">
          <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Main Track</span>
              <div className="w-[1px] h-3 bg-white/10" />
              <span className="text-[10px] font-black uppercase text-blue-500/60 tracking-widest">B-Roll</span>
              <span className="text-[10px] font-black uppercase text-yellow-500/60 tracking-widest">Captions</span>
          </div>
          <button 
              onClick={() => onCreateBroll?.(currentTime)}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
              <Plus size={14} className="text-white/60" />
              <span className="text-[10px] font-bold uppercase text-white/60">Moment</span>
          </button>
      </div>
    </div>
  );
};
