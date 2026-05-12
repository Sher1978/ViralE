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
  onSubtitleTrackClick?: () => void;
  onBrollMove?: (id: string, newStartTime: number) => void;
  onBrollResize?: (id: string, newDuration: number) => void;
  onBrollLongPress?: (id: string) => void;
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
  onCaptionClick,
  onSubtitleTrackClick,
  onBrollMove,
  onBrollResize,
  onBrollLongPress
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
                
                {/* B-ROLL TRACK (INTERACTIVE) */}
                <div 
                    className="absolute top-2 h-14 w-full cursor-copy pointer-events-auto group/track"
                    onDoubleClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const time = x / PX_PER_SECOND;
                        onCreateBroll?.(time);
                    }}
                >
                    <div className="absolute inset-0 bg-white/[0.02] border-y border-white/[0.05] group-hover/track:bg-white/[0.04] transition-colors" />
                    {brollClips.map(clip => (
                        <motion.div 
                            key={clip.id}
                            drag="x"
                            dragMomentum={false}
                            onDrag={(e, info) => {
                                // Simplified drag logic for now
                                const newX = (clip.startTime * PX_PER_SECOND) + info.delta.x;
                                const newTime = newX / PX_PER_SECOND;
                                onBrollMove?.(clip.id, newTime);
                            }}
                            className="absolute h-full rounded-lg bg-blue-500/30 border-2 border-blue-500/50 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing group/clip"
                            style={{ 
                                left: clip.startTime * PX_PER_SECOND, 
                                width: clip.duration * PX_PER_SECOND 
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent" />
                            <Layers size={14} className="text-blue-300 relative z-10" />
                            
                            {/* Resize Handles */}
                            <div 
                                className="absolute right-0 top-0 bottom-0 w-2 bg-blue-400/40 hover:bg-blue-400 cursor-ew-resize z-20"
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    const startX = e.clientX;
                                    const startDur = clip.duration;
                                    const move = (me: PointerEvent) => {
                                        const delta = (me.clientX - startX) / PX_PER_SECOND;
                                        onBrollResize?.(clip.id, Math.max(0.5, startDur + delta));
                                    };
                                    const up = () => {
                                        window.removeEventListener('pointermove', move);
                                        window.removeEventListener('pointerup', up);
                                    };
                                    window.addEventListener('pointermove', move);
                                    window.addEventListener('pointerup', up);
                                }}
                            />
                        </motion.div>
                    ))}
                </div>

                {/* SUBTITLE TRACK (INTERACTIVE) */}
                <div 
                    className="absolute bottom-2 h-10 w-full cursor-pointer pointer-events-auto"
                    onClick={() => onSubtitleTrackClick?.()}
                >
                    <div className="absolute inset-0 bg-yellow-500/[0.03] border-y border-yellow-500/[0.05]" />
                    {subtitleClips.map(clip => (
                        <div 
                            key={clip.id}
                            className={`absolute h-full rounded-md bg-yellow-500/20 border border-yellow-500/30 flex items-center px-2 overflow-hidden transition-all ${Math.abs(currentTime - clip.startTime) < 0.2 ? 'ring-2 ring-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]' : ''}`}
                            style={{ 
                                left: clip.startTime * PX_PER_SECOND, 
                                width: clip.duration * PX_PER_SECOND 
                            }}
                        >
                            <span className="text-[9px] text-yellow-100 truncate font-bold uppercase tracking-tighter">{clip.content || '...'}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Center Needle (Fixed) */}
        <div className="absolute inset-y-0 left-1/2 w-[2px] bg-white z-20 pointer-events-none shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45" />
        </div>
      </div>
      
    </div>
  );
};
