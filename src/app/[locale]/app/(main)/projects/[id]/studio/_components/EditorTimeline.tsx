'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
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
}

const PX_PER_SECOND = 100; // High density for Edits style

export const EditorTimeline: React.FC<EditorTimelineProps> = ({
  totalDuration = 60,
  currentTime = 0,
  onSeek,
  aRollUrl,
  brollClips = [],
  subtitleClips = [],
  onCreateBroll
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // Sync scroll position with current time
  useEffect(() => {
    if (containerRef.current && !isScrolling) {
      const centerX = containerRef.current.clientWidth / 2;
      const targetX = currentTime * PX_PER_SECOND;
      containerRef.current.scrollLeft = targetX;
    }
  }, [currentTime, isScrolling]);

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollLeft = containerRef.current.scrollLeft;
      const newTime = scrollLeft / PX_PER_SECOND;
      onSeek(Math.max(0, Math.min(newTime, totalDuration)));
    }
  };

  // Generate frame markers for the ruler
  const markers = useMemo(() => {
    const items = [];
    const step = 0.5; // Every half second
    for (let i = 0; i <= totalDuration; i += step) {
      const isFullSecond = i % 1 === 0;
      items.push(
        <div 
          key={i} 
          className="absolute flex flex-col items-center" 
          style={{ left: i * PX_PER_SECOND }}
        >
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

  // Generate mock thumbnails for the filmstrip
  const thumbnails = useMemo(() => {
    const count = Math.ceil(totalDuration / 2); // One thumb every 2 seconds
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(
        <div 
          key={i} 
          className="h-12 w-14 bg-white/5 border-r border-black/20 flex-shrink-0 relative overflow-hidden"
        >
          {aRollUrl && (
            <video 
              src={`${aRollUrl}#t=${i * 2}`} 
              className="w-full h-full object-cover opacity-40 grayscale"
            />
          )}
        </div>
      );
    }
    return items;
  }, [totalDuration, aRollUrl]);

  return (
    <div className="w-full bg-[#080808] border-t border-white/[0.06] flex flex-col select-none h-44">
      {/* 1. Ruler Layer */}
      <div className="h-8 relative overflow-hidden border-b border-white/[0.03]">
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          onMouseDown={() => setIsScrolling(true)}
          onMouseUp={() => setIsScrolling(false)}
          onTouchStart={() => setIsScrolling(true)}
          onTouchEnd={() => setIsScrolling(false)}
          className="absolute inset-0 overflow-x-auto no-scrollbar"
        >
          <div className="relative h-full" style={{ width: totalDuration * PX_PER_SECOND + 1000, paddingLeft: '50%', paddingRight: '50%' }}>
            {markers}
          </div>
        </div>
      </div>

      {/* 2. Audio/Track Layer */}
      <div className="h-4 relative overflow-hidden bg-black/40">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-full overflow-hidden">
             <div 
                className="h-1 bg-blue-500/80 rounded-full absolute top-1.5" 
                style={{ 
                    left: `calc(50% - ${currentTime * PX_PER_SECOND}px)`,
                    width: totalDuration * PX_PER_SECOND
                }} 
            />
        </div>
      </div>

      {/* 3. Filmstrip Layer */}
      <div className="flex-1 relative overflow-hidden flex items-center">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-full flex items-center overflow-hidden">
            <div 
                className="flex items-center"
                style={{ 
                    transform: `translateX(calc(50% - ${currentTime * PX_PER_SECOND}px))`
                }}
            >
                <div className="flex rounded-lg overflow-hidden border border-white/10 bg-white/5">
                    {thumbnails}
                </div>
                
                {/* Add Button */}
                <button 
                    onClick={() => onCreateBroll?.(currentTime)}
                    className="ml-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-90 transition-all border border-white/10"
                >
                    <Plus size={20} />
                </button>
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
