'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Layers } from 'lucide-react';

interface TimelineOverlay {
  id: string;
  type: 'broll' | 'subtitle' | 'whiteboard';
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
  whiteboardClips?: TimelineOverlay[];
  onCreateBroll?: (time: number) => void;
  onCreateWhiteboard?: (time: number) => void;
  onCaptionClick?: (id: string) => void;
  onSubtitleTrackClick?: () => void;
  onBrollMove?: (id: string, newStartTime: number) => void;
  onBrollResize?: (id: string, newDuration: number) => void;
  onBrollLongPress?: (id: string) => void;
  onDeleteBroll?: (id: string) => void;
  onWhiteboardMove?: (id: string, newStartTime: number) => void;
  onWhiteboardResize?: (id: string, newDuration: number) => void;
  onWhiteboardLongPress?: (id: string) => void;
  onDeleteWhiteboard?: (id: string) => void;
  onSplitSegment?: (time: number) => void;
  pxPerSecond: number;
  onPxPerSecondChange: (px: number) => void;
  isPlaying?: boolean;
  arollSegments?: { id: string; startTime: number; duration: number; content: string; }[];
  selectedClipId?: string | null;
  onSelectClip?: (id: string | null, type: 'aroll' | 'broll' | 'whiteboard' | 'subtitle') => void;
}

export const EditorTimeline: React.FC<EditorTimelineProps> = ({
  totalDuration = 60,
  currentTime = 0,
  onSeek,
  aRollUrl,
  brollClips = [],
  subtitleClips = [],
  whiteboardClips = [],
  onCreateBroll,
  onCreateWhiteboard,
  onCaptionClick,
  onSubtitleTrackClick,
  onBrollMove,
  onBrollResize,
  onBrollLongPress,
  onDeleteBroll,
  onWhiteboardMove,
  onWhiteboardResize,
  onWhiteboardLongPress,
  onDeleteWhiteboard,
  onSplitSegment,
  pxPerSecond: PX_PER_SECOND,
  onPxPerSecondChange,
  isPlaying = false,
  arollSegments = [],
  selectedClipId = null,
  onSelectClip
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const isProgrammaticScrollRef = useRef(false);
  const lastTouchDistance = useRef<number | null>(null);
  const [placeholderTime, setPlaceholderTime] = useState<number | null>(null);
  const [wbPlaceholderTime, setWbPlaceholderTime] = useState<number | null>(null);

  const lastTapRef = useRef<number>(0);
  const lastSubtitleTapRef = useRef<number>(0);

  // Sync scroll position with current time
  useEffect(() => {
    const targetX = currentTime * PX_PER_SECOND;
    
    if (containerRef.current && !isScrolling) {
      if (Math.abs((containerRef.current as any).scrollLeft - targetX) > 0.1) {
        isProgrammaticScrollRef.current = true;
        (containerRef.current as any).scrollLeft = targetX;
      }
    }
    
    if (trackRef.current) {
        (trackRef.current as any).scrollLeft = targetX;
    }
  }, [currentTime, isScrolling, PX_PER_SECOND]);

  const handleScroll = () => {
    if (isPlaying) return; // Prevent circular feedback loop during playback
    if (isProgrammaticScrollRef.current) {
      isProgrammaticScrollRef.current = false;
      return;
    }

    if (containerRef.current) {
      const scrollLeft = (containerRef.current as any).scrollLeft;
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
    // Defensive check: Ensure totalDuration is a finite, positive number, capped at 3600s to prevent infinite/OOM loops
    const safeDuration = (typeof totalDuration === 'number' && isFinite(totalDuration) && totalDuration > 0)
      ? Math.min(totalDuration, 3600)
      : 60;

    for (let i = 0; i <= safeDuration; i += step) {
      const isFullSecond = i % 1 === 0;
      items.push(
        <div key={i} className="absolute bottom-1.5 flex flex-col items-center" style={{ left: i * PX_PER_SECOND }}>
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
    <div className="w-full bg-[#080808] border-t border-white/[0.06] flex flex-col select-none h-[260px]">
      {/* 1. Ruler Layer */}
      <div className="h-10 relative overflow-hidden border-b border-white/[0.03]">
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          onMouseDown={() => setIsScrolling(true)}
          onMouseUp={() => setIsScrolling(false)}
          onDoubleClick={(e) => {
            const target = e.currentTarget as any;
            const rect = target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const scrollLeft = target.scrollLeft;
            const clickTime = (x - rect.width / 2 + scrollLeft) / PX_PER_SECOND;
            if (clickTime >= 0 && clickTime <= totalDuration) {
              onSplitSegment?.(clickTime);
            }
          }}
          onTouchStart={(e) => { if (e.touches.length === 2) lastTouchDistance.current = null; setIsScrolling(true); }}
          onTouchMove={(e) => handlePinch(e, 'timeline')}
          onTouchEnd={() => { lastTouchDistance.current = null; setIsScrolling(false); }}
          className="absolute inset-0 overflow-x-auto no-scrollbar cursor-cell"
          title="Двойной клик на линейке: разрезать А-ролл"
        >
          <div className="relative h-full" style={{ width: totalDuration * PX_PER_SECOND + 1000, paddingLeft: '50%', paddingRight: '50%' }}>
            {markers}
          </div>
        </div>
      </div>

      {/* 2. Tracks Layer */}
      <div 
        className="flex-1 relative overflow-hidden bg-black/20"
        onClick={() => onSelectClip?.(null, 'aroll')}
      >
        {/* Track Grid Separators (Stationary Boundaries) */}
        <div className="absolute left-0 right-0 border-t border-dashed border-white/10 pointer-events-none" style={{ bottom: '187px' }} />
        <div className="absolute left-0 right-0 border-t border-dashed border-white/10 pointer-events-none" style={{ bottom: '141px' }} />
        <div className="absolute left-0 right-0 border-t border-dashed border-white/10 pointer-events-none" style={{ bottom: '95px' }} />
        <div className="absolute left-0 right-0 border-t border-dashed border-white/10 pointer-events-none" style={{ bottom: '49px' }} />

        <div 
            ref={trackRef}
            className="absolute inset-0 overflow-x-auto no-scrollbar pointer-events-none"
        >
            <div className="relative h-full" style={{ width: totalDuration * PX_PER_SECOND + 1000, paddingLeft: '50%', paddingRight: '50%' }}>
                
                {/* A-ROLL TRACK */}
                <div 
                    className="absolute bottom-[144px] h-10 w-full cursor-pointer pointer-events-auto group/track bg-teal-500/[0.04]"
                    onPointerDown={(e) => {
                        if ((e.target as any).closest('.aroll-clip-box') || (e.target as any).tagName === 'BUTTON') return;
                        
                        const startX = e.clientX;
                        const initialScrollLeft = (containerRef.current as any)?.scrollLeft || 0;
                        setIsScrolling(true);
                        
                        const onMove = (me: any) => {
                            const deltaX = me.clientX - startX;
                            if (containerRef.current) {
                                (containerRef.current as any).scrollLeft = initialScrollLeft - deltaX;
                            }
                        };
                        
                        const onUp = () => {
                            setIsScrolling(false);
                            globalThis.removeEventListener('pointermove', onMove);
                            globalThis.removeEventListener('pointerup', onUp);
                        };
                        
                        globalThis.addEventListener('pointermove', onMove);
                        globalThis.addEventListener('pointerup', onUp);
                    }}
                >
                    <div className="absolute inset-0 border-y border-teal-500/[0.05] group-hover/track:bg-teal-500/[0.08] transition-colors" />
                    
                    {arollSegments?.map(clip => (
                        <div 
                            key={clip.id}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                const rect = (e.currentTarget as any).getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const time = clip.startTime + (x / PX_PER_SECOND);
                                onSplitSegment?.(time);
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSeek(clip.startTime);
                                onSelectClip?.(clip.id, 'aroll');
                            }}
                            className={`aroll-clip-box absolute h-full rounded-lg border-2 flex items-center px-3 overflow-hidden cursor-pointer transition-all group/clip ${
                                selectedClipId === clip.id
                                    ? 'bg-teal-500/40 border-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.5)] z-30'
                                    : 'bg-teal-500/25 border-teal-400/40 hover:bg-teal-500/35'
                            }`}
                            style={{ 
                                left: clip.startTime * PX_PER_SECOND, 
                                width: clip.duration * PX_PER_SECOND 
                            }}
                            title="Двойной клик: разрезать А-ролл в этой точке"
                        >
                            <span className="text-[9px] text-teal-100 font-bold uppercase tracking-tighter truncate pointer-events-none">
                                🗣 {clip.content}
                            </span>
                        </div>
                    ))}
                </div>

                {/* B-ROLL TRACK */}
                <div 
                    className="absolute bottom-[6px] h-10 w-full cursor-copy pointer-events-auto group/track bg-blue-500/[0.04]"
                    onClick={(e) => {
                        if ((e.target as any).closest('.broll-clip-box')) return;
                        const rect = (e.currentTarget as any).getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const time = (x - rect.width / 2 + (containerRef.current as any).scrollLeft) / PX_PER_SECOND;
                        setPlaceholderTime(time);
                    }}
                >
                    <div className="absolute inset-0 border-y border-blue-500/[0.05] group-hover/track:bg-blue-500/[0.08] transition-colors" />
                    
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
                                onSelectClip?.(clip.id, 'broll');
                                // --- DOUBLE TAP DETECTION ---
                                const now = Date.now();
                                if (now - lastTapRef.current < 300) {
                                    onBrollLongPress?.(clip.id);
                                    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate([30, 30]);
                                    lastTapRef.current = 0;
                                    return;
                                }
                                lastTapRef.current = now;

                                const startX = e.clientX;
                                const startY = e.clientY;
                                let movedTooMuch = false;
 
                                const timer = setTimeout(() => {
                                    if (!movedTooMuch) {
                                        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate(50);
                                        onBrollLongPress?.(clip.id);
                                    }
                                }, 500);
                                
                                const onMove = (me: any) => {
                                    const dist = Math.sqrt(Math.pow(me.clientX - startX, 2) + Math.pow(me.clientY - startY, 2));
                                    if (dist > 8) { movedTooMuch = true; clearTimeout(timer); }
                                };
                                const onUp = () => {
                                    clearTimeout(timer);
                                    globalThis.removeEventListener('pointermove', onMove);
                                    globalThis.removeEventListener('pointerup', onUp);
                                };
                                globalThis.addEventListener('pointermove', onMove);
                                globalThis.addEventListener('pointerup', onUp);
 
                                if ((e.target as any).classList.contains('resize-handle')) return;
                                if ((e.target as any).closest('.delete-btn')) return;
                                
                                const initialStartTime = clip.startTime;
                                const initialMouseX = e.clientX;
                                
                                const onDragMove = (me: any) => {
                                    const deltaX = me.clientX - initialMouseX;
                                    const newStartTime = initialStartTime + (deltaX / PX_PER_SECOND);
                                    onBrollMove?.(clip.id, Math.max(0, newStartTime));
                                };
                                const onDragUp = () => {
                                    globalThis.removeEventListener('pointermove', onDragMove);
                                    globalThis.removeEventListener('pointerup', onDragUp);
                                };
                                globalThis.addEventListener('pointermove', onDragMove);
                                globalThis.addEventListener('pointerup', onDragUp);
                            }}
                            className={`broll-clip-box absolute h-full rounded-lg flex items-center justify-between overflow-hidden cursor-grab active:cursor-grabbing group/clip z-10 ${
                                selectedClipId === clip.id
                                    ? 'bg-blue-500/50 border-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.5)] z-30'
                                    : !clip.content
                                        ? 'border-2 border-dashed border-violet-400/70 bg-violet-500/15 animate-pulse'
                                        : 'bg-blue-500/35 border-2 border-blue-400/60'
                            }`}
                            style={{ 
                                left: clip.startTime * PX_PER_SECOND, 
                                width: clip.duration * PX_PER_SECOND 
                            }}
                        >
                            <div className={`absolute inset-0 pointer-events-none ${!clip.content ? 'bg-gradient-to-br from-violet-400/5 to-transparent' : 'bg-gradient-to-br from-blue-300/10 to-transparent'}`} />
                            
                            {/* Icon — question mark for placeholders, layers icon for filled */}
                            {!clip.content ? (
                                <span className="text-violet-300/80 text-[10px] font-black ml-2 relative z-10 pointer-events-none leading-none">?</span>
                            ) : (
                                <Layers size={11} className="text-blue-200/60 relative z-10 ml-3 pointer-events-none" style={{ minWidth: '11px' }} />
                            )}
                            {/* Resize Handle */}
                            <div 
                                className={`resize-handle absolute right-0 top-0 bottom-0 w-4 hover:bg-blue-400/60 cursor-ew-resize z-20 flex items-center justify-center ${!clip.content ? 'bg-violet-400/10 hover:bg-violet-400/40' : 'bg-blue-400/20'}`}
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    const startX = e.clientX;
                                    const startDur = clip.duration;
                                    const move = (me: any) => {
                                        const delta = (me.clientX - startX) / PX_PER_SECOND;
                                        onBrollResize?.(clip.id, Math.max(0.2, startDur + delta));
                                    };
                                    const up = () => {
                                        globalThis.removeEventListener('pointermove', move);
                                        globalThis.removeEventListener('pointerup', up);
                                    };
                                    globalThis.addEventListener('pointermove', move);
                                    globalThis.addEventListener('pointerup', up);
                                }}
                            >
                                <div className="w-[2px] h-4 bg-blue-200/50 rounded-full pointer-events-none" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* WHITEBOARD/SKETCH TRACK */}
                <div 
                    className="absolute bottom-[52px] h-10 w-full cursor-copy pointer-events-auto group/track bg-purple-500/[0.04]"
                    onClick={(e) => {
                        if ((e.target as any).closest('.whiteboard-clip-box')) return;
                        const rect = (e.currentTarget as any).getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const time = (x - rect.width / 2 + (containerRef.current as any).scrollLeft) / PX_PER_SECOND;
                        setWbPlaceholderTime(time);
                    }}
                >
                    <div className="absolute inset-0 border-y border-purple-500/[0.05] group-hover/track:bg-purple-500/[0.08] transition-colors" />
                    
                    {/* Placeholder */}
                    {wbPlaceholderTime !== null && (
                        <div 
                            onClick={(e) => {
                                e.stopPropagation();
                                onCreateWhiteboard?.(wbPlaceholderTime);
                                setWbPlaceholderTime(null);
                            }}
                            className="absolute h-full w-12 bg-white/10 border-2 border-dashed border-purple-500/20 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/20 hover:border-purple-500/40 transition-all animate-in fade-in zoom-in duration-200 z-30"
                            style={{ left: wbPlaceholderTime * PX_PER_SECOND }}
                        >
                            <span className="text-xl font-bold text-purple-400/80">+</span>
                        </div>
                    )}
 
                    {whiteboardClips.map(clip => {
                        const isFullVideo = clip.duration >= (totalDuration - 0.5);
                        const bgClass = isFullVideo 
                            ? 'bg-purple-950/90 border-2 border-purple-800/40 text-purple-200' 
                            : 'bg-purple-600/35 border-2 border-purple-400/60 text-purple-100';
                        return (
                            <div 
                                key={clip.id}
                                onTouchStart={(e) => { if (e.touches.length === 2) lastTouchDistance.current = null; }}
                                onTouchMove={(e) => handlePinch(e, 'clip', clip.id)}
                                onTouchEnd={() => { lastTouchDistance.current = null; }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    onWhiteboardLongPress?.(clip.id);
                                }}
                                onPointerDown={(e) => {
                                    onSelectClip?.(clip.id, 'whiteboard');
                                    // --- DOUBLE TAP DETECTION ---
                                    const now = Date.now();
                                    if (now - lastTapRef.current < 300) {
                                        onWhiteboardLongPress?.(clip.id);
                                        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate([30, 30]);
                                        lastTapRef.current = 0;
                                        return;
                                    }
                                    lastTapRef.current = now;

                                    const startX = e.clientX;
                                    const startY = e.clientY;
                                    let movedTooMuch = false;
     
                                    const timer = setTimeout(() => {
                                        if (!movedTooMuch) {
                                            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate(50);
                                            onWhiteboardLongPress?.(clip.id);
                                        }
                                    }, 500);
                                    
                                    const onMove = (me: any) => {
                                        const dist = Math.sqrt(Math.pow(me.clientX - startX, 2) + Math.pow(me.clientY - startY, 2));
                                        if (dist > 8) { movedTooMuch = true; clearTimeout(timer); }
                                    };
                                    const onUp = () => {
                                        clearTimeout(timer);
                                        globalThis.removeEventListener('pointermove', onMove);
                                        globalThis.removeEventListener('pointerup', onUp);
                                    };
                                    globalThis.addEventListener('pointermove', onMove);
                                    globalThis.addEventListener('pointerup', onUp);
     
                                    if ((e.target as any).classList.contains('resize-handle')) return;
                                    if ((e.target as any).closest('.delete-btn')) return;
                                    
                                    const initialStartTime = clip.startTime;
                                    const initialMouseX = e.clientX;
                                    
                                    const onDragMove = (me: any) => {
                                        const deltaX = me.clientX - initialMouseX;
                                        const newStartTime = initialStartTime + (deltaX / PX_PER_SECOND);
                                        onWhiteboardMove?.(clip.id, Math.max(0, newStartTime));
                                    };
                                    const onDragUp = () => {
                                        globalThis.removeEventListener('pointermove', onDragMove);
                                        globalThis.removeEventListener('pointerup', onDragUp);
                                    };
                                    globalThis.addEventListener('pointermove', onDragMove);
                                    globalThis.addEventListener('pointerup', onDragUp);
                                }}
                                className={`whiteboard-clip-box absolute h-full rounded-lg flex items-center justify-between overflow-hidden cursor-grab active:cursor-grabbing group/clip z-10 ${
                                    selectedClipId === clip.id
                                        ? 'bg-purple-600/50 border-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.5)] z-30 text-purple-100'
                                        : isFullVideo 
                                            ? 'bg-purple-950/90 border-2 border-purple-800/40 text-purple-200' 
                                            : 'bg-purple-600/35 border-2 border-purple-400/60 text-purple-100'
                                }`}
                                style={{ 
                                    left: clip.startTime * PX_PER_SECOND, 
                                    width: clip.duration * PX_PER_SECOND 
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/5 to-transparent pointer-events-none" />
                                <span className="text-[9px] font-black ml-2 relative z-10 pointer-events-none truncate uppercase tracking-tighter max-w-[80%]">
                                    {isFullVideo ? '🎨 WHITEBOARD (FULL VIDEO)' : `🎨 ${clip.content ? 'Скетч сгенерирован' : 'Ожидает генерации'}`}
                                </span>
                                
                                {/* Resize Handle */}
                                <div 
                                    className="resize-handle absolute right-0 top-0 bottom-0 w-4 hover:bg-purple-400/60 cursor-ew-resize z-20 flex items-center justify-center bg-purple-400/20"
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        const startX = e.clientX;
                                        const startDur = clip.duration;
                                        const move = (me: any) => {
                                            const delta = (me.clientX - startX) / PX_PER_SECOND;
                                            onWhiteboardResize?.(clip.id, Math.max(0.2, startDur + delta));
                                        };
                                        const up = () => {
                                            globalThis.removeEventListener('pointermove', move);
                                            globalThis.removeEventListener('pointerup', up);
                                        };
                                        globalThis.addEventListener('pointermove', move);
                                        globalThis.addEventListener('pointerup', up);
                                    }}
                                >
                                    <div className="w-[2px] h-4 bg-purple-200/50 rounded-full pointer-events-none" />
                                </div>
                            </div>
                        );
                    })}
                </div>
 
                {/* SUBTITLE TRACK */}
                <div 
                    className="absolute bottom-[98px] h-10 w-full cursor-pointer pointer-events-auto bg-yellow-500/[0.04]"
                    onClick={() => onSubtitleTrackClick?.()}
                >
                    <div className="absolute inset-0 border-y border-yellow-500/[0.05] hover:bg-yellow-500/[0.08] transition-colors" />
                    {subtitleClips.map(clip => (
                        <div 
                            key={clip.id}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                onCaptionClick?.(clip.id);
                            }}
                            onPointerDown={(e) => {
                                onSelectClip?.(clip.id, 'subtitle');
                                // --- DOUBLE TAP DETECTION (Mobile/Responsive) ---
                                const now = Date.now();
                                if (now - lastSubtitleTapRef.current < 300) {
                                    onCaptionClick?.(clip.id);
                                    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate([30, 30]);
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
                                        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate(50);
                                        onCaptionClick?.(clip.id);
                                    }
                                }, 500);
                                
                                const onMove = (me: any) => {
                                    const dist = Math.sqrt(Math.pow(me.clientX - startX, 2) + Math.pow(me.clientY - startY, 2));
                                    if (dist > 8) {
                                        movedTooMuch = true;
                                        clearTimeout(timer);
                                    }
                                };
                                const onUp = () => {
                                    clearTimeout(timer);
                                    globalThis.removeEventListener('pointermove', onMove);
                                    globalThis.removeEventListener('pointerup', onUp);
                                };
                                globalThis.addEventListener('pointermove', onMove);
                                globalThis.addEventListener('pointerup', onUp);
                            }}
                            className={`absolute h-full rounded-md flex items-center px-2 overflow-hidden transition-all ${
                                selectedClipId === clip.id
                                    ? 'bg-yellow-500/40 border-purple-500 ring-2 ring-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.5)] z-30'
                                    : Math.abs(currentTime - clip.startTime) < 0.2 
                                        ? 'bg-yellow-500/20 border-yellow-500/30 ring-2 ring-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]' 
                                        : 'bg-yellow-500/20 border-yellow-500/30'
                            }`}
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
