'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Layers } from 'lucide-react';

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
  onDeleteBroll?: (id: string) => void;
  pxPerSecond: number;
  onPxPerSecondChange: (px: number) => void;
}

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
  onBrollLongPress,
  onDeleteBroll,
  pxPerSecond: PX_PER_SECOND,
  onPxPerSecondChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const isProgrammaticScrollRef = useRef(false);
  const lastTouchDistance = useRef<number | null>(null);
  const [placeholderTime, setPlaceholderTime] = useState<number | null>(null);

  const lastTapRef = useRef<number>(0);
  const lastSubtitleTapRef = useRef<number>(0);

  // Sync scroll position with current time
  useEffect(() => {
    const targetX = currentTime * PX_PER_SECOND;
    
    if (containerRef.current && !isScrolling) {
      if (Math.abs(containerRef.current.scrollLeft - targetX) > 0.1) {
        isProgrammaticScrollRef.current = true;
        containerRef.current.scrollLeft = targetX;
      }
    }
    
    if (trackRef.current) {
        trackRef.current.scrollLeft = targetX;
    }
  }, [currentTime, isScrolling, PX_PER_SECOND]);

  const handleScroll = () => {
    if (isProgrammaticScrollRef.current) {
      isProgrammaticScrollRef.current = false;
      return;
    }

    if (containerRef.current) {
      const scrollLeft = containerRef.current.scrollLeft;
      const newTime = scrollLeft / PX_PER_SECOND;
      if (Math.abs(newTime - currentTime) > 0.01) {
        onSeek(Math.max(0, Math.min(newTime, totalDuration)));
      }
    }
  };

  const handlePinch = (e: React.TouchEvent, mode: 'timeline' | 'clip', clipId?: string) => {
    if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) + 
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );

        if (lastTouchDistance.current !== null) {
            const delta = distance - lastTouchDistance.current;
            if (mode === 'timeline') {
                const newPx = Math.max(20, Math.min(500, PX_PER_SECOND + delta * 0.5));
                onPxPerSecondChange(newPx);
            } else if (mode === 'clip' && clipId) {
                const clip = brollClips.find(c => c.id === clipId);
                if (clip) {
                    const newDur = Math.max(0.2, clip.duration + delta / PX_PER_SECOND);
                    onBrollResize?.(clipId, newDur);
                }
            }
        }
        lastTouchDistance.current = distance;
    }
  };

  // Generate frame markers for the ruler
  const markers = useMemo(() => {
    const items = [];
    const step = PX_PER_SECOND < 50 ? 2 : PX_PER_SECOND < 100 ? 1 : 0.5;
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
  }, [totalDuration, PX_PER_SECOND]);

  return (
    <div className="w-full bg-[#080808] border-t border-white/[0.06] flex flex-col select-none h-48">
      {/* 1. Ruler Layer */}
      <div className="h-8 relative overflow-hidden border-b border-white/[0.03]">
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          onMouseDown={() => setIsScrolling(true)}
          onMouseUp={() => setIsScrolling(false)}
          onTouchStart={(e) => { if (e.touches.length === 2) lastTouchDistance.current = null; setIsScrolling(true); }}
          onTouchMove={(e) => handlePinch(e, 'timeline')}
          onTouchEnd={() => { lastTouchDistance.current = null; setIsScrolling(false); }}
          className="absolute inset-0 overflow-x-auto no-scrollbar"
        >
          <div className="relative h-full" style={{ width: totalDuration * PX_PER_SECOND + 1000, paddingLeft: '50%', paddingRight: '50%' }}>
            {markers}
          </div>
        </div>
      </div>

      {/* 2. Tracks Layer */}
      <div className="flex-1 relative overflow-hidden bg-black/20">
        <div 
            ref={trackRef}
            className="absolute inset-0 overflow-x-auto no-scrollbar pointer-events-none"
        >
            <div className="relative h-full" style={{ width: totalDuration * PX_PER_SECOND + 1000, paddingLeft: '50%', paddingRight: '50%' }}>
                
                {/* B-ROLL TRACK */}
                <div 
                    className="absolute top-1 h-10 w-full cursor-copy pointer-events-auto group/track"
                    onClick={(e) => {
                        if ((e.target as HTMLElement).closest('.broll-clip-box')) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const time = (x - rect.width / 2 + containerRef.current!.scrollLeft) / PX_PER_SECOND;
                        setPlaceholderTime(time);
                    }}
                >
                    <div className="absolute inset-0 bg-white/[0.02] border-y border-white/[0.05] group-hover/track:bg-white/[0.04] transition-colors" />
                    
                    {/* Placeholder */}
                    {placeholderTime !== null && (
                        <div 
                            onClick={(e) => {
                                e.stopPropagation();
                                onCreateBroll?.(placeholderTime);
                                setPlaceholderTime(null);
                            }}
                            className="absolute h-full w-12 bg-white/10 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/20 hover:border-white/40 transition-all animate-in fade-in zoom-in duration-200 z-30"
                            style={{ left: placeholderTime * PX_PER_SECOND }}
                        >
                            <span className="text-xl font-bold text-white/40">+</span>
                        </div>
                    )}
 
                    {brollClips.map(clip => (
                        <div 
                            key={clip.id}
                            onTouchStart={(e) => { if (e.touches.length === 2) lastTouchDistance.current = null; }}
                            onTouchMove={(e) => handlePinch(e, 'clip', clip.id)}
                            onTouchEnd={() => { lastTouchDistance.current = null; }}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                onBrollLongPress?.(clip.id);
                            }}
                            onPointerDown={(e) => {
                                // --- DOUBLE TAP DETECTION (Mobile/Responsive) ---
                                const now = Date.now();
                                if (now - lastTapRef.current < 300) {
                                    onBrollLongPress?.(clip.id);
                                    if ('vibrate' in navigator) navigator.vibrate([30, 30]);
                                    lastTapRef.current = 0;
                                    return;
                                }
                                lastTapRef.current = now;

                                // --- STILL LONG PRESS LOGIC (500ms for high responsiveness) ---
                                const startX = e.clientX;
                                const startY = e.clientY;
                                let movedTooMuch = false;
 
                                const timer = setTimeout(() => {
                                    if (!movedTooMuch) {
                                        if ('vibrate' in navigator) navigator.vibrate(50);
                                        onBrollLongPress?.(clip.id);
                                    }
                                }, 500);
                                
                                const onMove = (me: PointerEvent) => {
                                    const dist = Math.sqrt(Math.pow(me.clientX - startX, 2) + Math.pow(me.clientY - startY, 2));
                                    if (dist > 8) {
                                        movedTooMuch = true;
                                        clearTimeout(timer);
                                    }
                                };
                                const onUp = () => {
                                    clearTimeout(timer);
                                    window.removeEventListener('pointermove', onMove);
                                    window.removeEventListener('pointerup', onUp);
                                };
                                window.addEventListener('pointermove', onMove);
                                window.addEventListener('pointerup', onUp);
 
                                // --- INDEPENDENT DRAG LOGIC ---
                                if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
                                if ((e.target as HTMLElement).closest('.delete-btn')) return;
                                
                                const initialStartTime = clip.startTime;
                                const initialMouseX = e.clientX;
                                
                                const onDragMove = (me: PointerEvent) => {
                                    const deltaX = me.clientX - initialMouseX;
                                    const newStartTime = initialStartTime + (deltaX / PX_PER_SECOND);
                                    onBrollMove?.(clip.id, Math.max(0, newStartTime));
                                };
                                const onDragUp = () => {
                                    window.removeEventListener('pointermove', onDragMove);
                                    window.removeEventListener('pointerup', onDragUp);
                                };
                                window.addEventListener('pointermove', onDragMove);
                                window.addEventListener('pointerup', onDragUp);
                            }}
                            className="broll-clip-box absolute h-full rounded-lg bg-blue-500/35 border-2 border-blue-400/60 flex items-center justify-between overflow-hidden cursor-grab active:cursor-grabbing group/clip z-10"
                            style={{ 
                                left: clip.startTime * PX_PER_SECOND, 
                                width: clip.duration * PX_PER_SECOND 
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-300/10 to-transparent pointer-events-none" />
                            
                            {/* Visual Drag Dots indicator or layer icon */}
                            <Layers size={11} className="text-blue-200/60 relative z-10 ml-3 pointer-events-none" style={{ minWidth: '11px' }} />
                            
                            {/* Delete/Delete-btn Trigger (restored correctly!) */}
                            <button
                                className="delete-btn absolute left-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-red-500/90 border border-white/10 hover:bg-red-600 active:scale-95 text-white flex items-center justify-center z-30 transition-all opacity-0 group-hover/clip:opacity-100 touch-none shadow-md"
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    onDeleteBroll?.(clip.id);
                                }}
                            >
                                <span className="text-[11px] font-black leading-none" style={{ marginTop: '-1px' }}>×</span>
                            </button>

                            {/* Resize Handle */}
                            <div 
                                className="resize-handle absolute right-0 top-0 bottom-0 w-4 bg-blue-400/20 hover:bg-blue-400/60 cursor-ew-resize z-20 flex items-center justify-center"
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    const startX = e.clientX;
                                    const startDur = clip.duration;
                                    const move = (me: PointerEvent) => {
                                        const delta = (me.clientX - startX) / PX_PER_SECOND;
                                        onBrollResize?.(clip.id, Math.max(0.2, startDur + delta));
                                    };
                                    const up = () => {
                                        window.removeEventListener('pointermove', move);
                                        window.removeEventListener('pointerup', up);
                                    };
                                    window.addEventListener('pointermove', move);
                                    window.addEventListener('pointerup', up);
                                }}
                            >
                                <div className="w-[2px] h-4 bg-blue-200/50 rounded-full pointer-events-none" />
                            </div>
                        </div>
                    ))}
                </div>
 
                {/* SUBTITLE TRACK */}
                <div 
                    className="absolute bottom-1 h-8 w-full cursor-pointer pointer-events-auto"
                    onClick={() => onSubtitleTrackClick?.()}
                >
                    <div className="absolute inset-0 bg-yellow-500/[0.03] border-y border-yellow-500/[0.05]" />
                    {subtitleClips.map(clip => (
                        <div 
                            key={clip.id}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                onCaptionClick?.(clip.id);
                            }}
                            onPointerDown={(e) => {
                                // --- DOUBLE TAP DETECTION (Mobile/Responsive) ---
                                const now = Date.now();
                                if (now - lastSubtitleTapRef.current < 300) {
                                    onCaptionClick?.(clip.id);
                                    if ('vibrate' in navigator) navigator.vibrate([30, 30]);
                                    lastSubtitleTapRef.current = 0;
                                    return;
                                }
                                lastSubtitleTapRef.current = now;

                                // --- STILL LONG PRESS LOGIC (500ms for high responsiveness) ---
                                const startX = e.clientX;
                                const startY = e.clientY;
                                let movedTooMuch = false;
 
                                const timer = setTimeout(() => {
                                    if (!movedTooMuch) {
                                        if ('vibrate' in navigator) navigator.vibrate(50);
                                        onCaptionClick?.(clip.id);
                                    }
                                }, 500);
                                
                                const onMove = (me: PointerEvent) => {
                                    const dist = Math.sqrt(Math.pow(me.clientX - startX, 2) + Math.pow(me.clientY - startY, 2));
                                    if (dist > 8) {
                                        movedTooMuch = true;
                                        clearTimeout(timer);
                                    }
                                };
                                const onUp = () => {
                                    clearTimeout(timer);
                                    window.removeEventListener('pointermove', onMove);
                                    window.removeEventListener('pointerup', onUp);
                                };
                                window.addEventListener('pointermove', onMove);
                                window.addEventListener('pointerup', onUp);
                            }}
                            className={`absolute h-full rounded-md bg-yellow-500/20 border border-yellow-500/30 flex items-center px-2 overflow-hidden transition-all ${Math.abs(currentTime - clip.startTime) < 0.2 ? 'ring-2 ring-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]' : ''}`}
                            style={{ 
                                left: clip.startTime * PX_PER_SECOND, 
                                width: clip.duration * PX_PER_SECOND 
                            }}
                        >
                            <span className="text-[9px] text-yellow-100 truncate font-bold uppercase tracking-tighter pointer-events-none">{clip.content || '...'}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Needle */}
        <div className="absolute inset-y-0 left-1/2 w-[2px] bg-white z-20 pointer-events-none shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45" />
        </div>
      </div>
    </div>
  );
};
