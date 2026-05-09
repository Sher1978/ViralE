'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SceneSegment, TimelineOverlay } from '@/lib/types/studio';
import { 
  Monitor, CheckCircle2, RefreshCw, Scissors, Plus, 
  ZoomIn, ZoomOut, Type, Film 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StudioTimelineProps {
  segments: SceneSegment[];
  totalDuration: number;
  currentTime?: number;
  brollClips: TimelineOverlay[];
  subtitleClips: TimelineOverlay[];
  activeIndex: number;
  selectedId: string | null;
  onSelect: (type: 'segment' | 'broll' | 'subtitle', id: string) => void;
  onUpdateOverlay: (type: 'broll' | 'subtitle', id: string, data: Partial<TimelineOverlay>) => void;
  onDeleteOverlay: (type: 'broll' | 'subtitle', id: string) => void;
  onCreateOverlay: (type: 'broll' | 'subtitle', startTime: number) => void;
  onOpenEditor: (type: 'broll' | 'subtitle', id: string) => void;
  onAddSegment: () => void;
  isRegenerating?: string | null;
  onSeek?: (time: number) => void;
}

const StudioTimeline: React.FC<StudioTimelineProps> = ({ 
  segments, 
  totalDuration = 60,
  currentTime = 0,
  brollClips = [],
  subtitleClips = [],
  activeIndex, 
  selectedId, 
  onSelect,
  onUpdateOverlay,
  onDeleteOverlay,
  onCreateOverlay,
  onOpenEditor,
  onAddSegment,
  isRegenerating,
  onSeek
}) => {
  const [pxPerSecond, setPxPerSecond] = useState(40); 
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPinching, setIsPinching] = useState(false);
  const initialDistRef = useRef<number | null>(null);
  
  // Interaction State
  const [dragState, setDragState] = useState<{
    id: string;
    type: 'broll' | 'subtitle';
    handle: 'move' | 'start' | 'end';
    initialX: number;
    initialStartTime: number;
    initialDuration: number;
  } | null>(null);

  const longPressTimer = useRef<any>(null);

  // --- GESTURE HANDLERS ---

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setPxPerSecond(prev => Math.min(Math.max(prev * delta, 5), 1000));
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      initialDistRef.current = dist;
      setIsPinching(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPinching && e.touches.length === 2 && initialDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const ratio = dist / initialDistRef.current;
      setPxPerSecond(prev => Math.min(Math.max(prev * ratio, 5), 1000));
      initialDistRef.current = dist;
    }
  };

  // --- DRAG & RESIZE LOGIC ---

  const startDrag = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent, overlay: TimelineOverlay, handle: 'move' | 'start' | 'end') => {
    e.stopPropagation();
    const clientX = 'touches' in e ? (e as any).touches[0].clientX : (e as any).clientX;
    
    setDragState({
      id: overlay.id,
      type: overlay.type,
      handle,
      initialX: clientX,
      initialStartTime: overlay.startTime,
      initialDuration: overlay.duration
    });

    onSelect(overlay.type, overlay.id);

    // Setup Long Press for Editor
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(60);
      onOpenEditor(overlay.type, overlay.id);
      setDragState(null); // Cancel drag if it becomes a long press
    }, 3000); 
  };

  const startLongPress = (type: 'broll' | 'subtitle' | 'empty', clientX: number) => {
     clearLongPress();
     longPressTimer.current = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(60);
        
        if (type === 'empty') {
           const container = containerRef.current;
           if (!container) return;
           const rect = container.getBoundingClientRect();
           const x = clientX - rect.left + container.scrollLeft - 32;
           const time = Math.max(0, x / pxPerSecond);
           onCreateOverlay('broll', time);
        }
     }, 3000); 
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const [previewOverlay, setPreviewOverlay] = useState<{id: string, start: number, dur: number} | null>(null);

  const handleGlobalMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragState) return;
    
    // Block scrolling while dragging a clip
    if (e.cancelable) e.preventDefault();
    
    clearLongPress();

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const deltaX = clientX - dragState.initialX;
    const deltaSeconds = deltaX / pxPerSecond;

    let newStart = dragState.initialStartTime;
    let newDuration = dragState.initialDuration;

    if (dragState.handle === 'move') {
      newStart = Math.max(0, Math.min(totalDuration - dragState.initialDuration, dragState.initialStartTime + deltaSeconds));
    } else if (dragState.handle === 'start') {
      const maxStart = dragState.initialStartTime + dragState.initialDuration - 0.5;
      newStart = Math.max(0, Math.min(maxStart, dragState.initialStartTime + deltaSeconds));
      newDuration = dragState.initialDuration - (newStart - dragState.initialStartTime);
    } else if (dragState.handle === 'end') {
      newDuration = Math.max(0.5, Math.min(totalDuration - dragState.initialStartTime, dragState.initialDuration + deltaSeconds));
    }

    setPreviewOverlay({ id: dragState.id, start: newStart, dur: newDuration });
  }, [dragState, pxPerSecond, totalDuration]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', () => {
        if (dragState && previewOverlay) {
           onUpdateOverlay(dragState.type, dragState.id, { startTime: previewOverlay.start, duration: previewOverlay.dur });
        }
        setDragState(null);
        setPreviewOverlay(null);
      });
      window.addEventListener('touchmove', handleGlobalMouseMove, { passive: false });
      window.addEventListener('touchend', () => {
        if (dragState && previewOverlay) {
           onUpdateOverlay(dragState.type, dragState.id, { startTime: previewOverlay.start, duration: previewOverlay.dur });
        }
        setDragState(null);
        setPreviewOverlay(null);
      });
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('touchmove', handleGlobalMouseMove);
    };
  }, [dragState, handleGlobalMouseMove]);

  // Sync scroll to playhead
  useEffect(() => {
    if (containerRef.current) {
      const playheadX = currentTime * pxPerSecond;
      const scrollLeft = containerRef.current.scrollLeft;
      const width = containerRef.current.clientWidth;
      
      // Auto-scroll if playhead goes out of view
      if (playheadX > scrollLeft + width * 0.8) {
         containerRef.current.scrollTo({ left: playheadX - width * 0.2, behavior: 'smooth' });
      } else if (playheadX < scrollLeft) {
         containerRef.current.scrollTo({ left: playheadX - width * 0.8, behavior: 'smooth' });
      }
    }
  }, [currentTime, pxPerSecond]);

  // --- RENDERERS ---

  const renderMarkers = () => {
    if (!totalDuration || !isFinite(totalDuration) || totalDuration <= 0) return null;
    const markers = [];
    const step = pxPerSecond < 10 ? 10 : pxPerSecond < 50 ? 5 : 1;
    const safeDuration = Math.min(totalDuration, 3600); // Cap at 1 hour for safety
    for (let i = 0; i <= safeDuration; i += step) {
      markers.push(
        <div key={i} className="absolute flex flex-col items-center" style={{ left: i * pxPerSecond }}>
          <div className="h-1.5 w-[1px] bg-white/20" />
          <span className="text-[7px] text-white/40 mt-1 font-bold">{i}s</span>
        </div>
      );
    }
    return markers;
  };

  const OverlayItem = ({ overlay, color }: { overlay: TimelineOverlay; color: string }) => {
    const isSelected = selectedId === overlay.id;
    const isPreviewing = previewOverlay?.id === overlay.id;
    const displayStart = isPreviewing ? previewOverlay!.start : overlay.startTime;
    const displayDur = isPreviewing ? previewOverlay!.dur : overlay.duration;
    return (
      <motion.div
        layout
        onPointerDown={(e) => startDrag(e, overlay, 'move')}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
        className={`absolute h-8 rounded-lg border transition-all cursor-grab active:cursor-grabbing flex items-center px-3 overflow-hidden group ${
          isSelected ? `ring-2 ring-white border-transparent ${color} shadow-xl z-20` : `bg-white/5 border-white/10 hover:border-white/20 z-10`
        }`}
        style={{ 
          left: displayStart * pxPerSecond, 
          width: displayDur * pxPerSecond,
          backgroundColor: isSelected ? undefined : 'rgba(255,255,255,0.05)'
        }}
      >
        <div className="absolute top-0 bottom-0 w-11 -left-[22px] cursor-ew-resize hover:bg-white/5 flex items-center justify-center z-30" 
             onPointerDown={(e) => startDrag(e, overlay, 'start')}>
          <div className="w-1.5 h-4 bg-white/40 rounded-full shadow-sm" />
        </div>
        
        <div className="flex items-center gap-2 min-w-0 mx-auto pointer-events-none">
          {overlay.type === 'broll' ? <Film size={10} className="text-blue-400" /> : <Type size={10} className="text-amber-400" />}
          <span className="text-[8px] font-black uppercase truncate tracking-widest text-white/80">
            {overlay.type === 'subtitle' ? overlay.content : 'B-ROLL'}
          </span>
        </div>

        <div className="absolute top-0 bottom-0 w-11 -right-[22px] cursor-ew-resize hover:bg-white/5 flex items-center justify-center z-30" 
             onPointerDown={(e) => startDrag(e, overlay, 'end')}>
          <div className="w-1.5 h-4 bg-white/40 rounded-full shadow-sm" />
        </div>
      </motion.div>
    );
  };

    const safeDuration = (!totalDuration || !isFinite(totalDuration) || totalDuration <= 0) ? 60 : Math.min(totalDuration, 3600);

    return (
    <div 
      className="w-full bg-[#050508] border-t border-white/5 py-4 flex flex-col gap-2 select-none relative"
      onWheel={handleWheel}
      onPointerDown={handleTouchStart}
      onPointerMove={handleTouchMove}
      onPointerUp={() => setIsPinching(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header HUD - Minimalist */}
      <div className="flex items-center justify-between px-8 mb-2">
        <div className="flex items-center gap-4 p-1 bg-white/5 rounded-xl border border-white/5">
           <button onClick={() => setPxPerSecond(p => Math.max(p * 0.8, 5))} className="p-1.5 text-white/40 hover:text-white transition-all"><ZoomOut size={14}/></button>
           <button onClick={() => setPxPerSecond(p => Math.min(p * 1.2, 1000))} className="p-1.5 text-white/40 hover:text-white transition-all"><ZoomIn size={14}/></button>
        </div>
        
        <div className="flex items-center gap-3 px-4 py-1.5 bg-white/5 rounded-xl border border-white/5">
           <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">B-Rolls: {brollClips.length}</span>
           </div>
           <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Subs: {subtitleClips.length}</span>
           </div>
        </div>
      </div>
 
      {/* Timeline Workspace */}
      <div 
        ref={containerRef}
        className={`relative flex-1 overflow-y-hidden custom-scrollbar pb-6 ${dragState ? 'overflow-x-hidden' : 'overflow-x-auto'}`}
        onMouseUp={clearLongPress}
        onClick={(e) => {
          if (dragState) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left + e.currentTarget.scrollLeft - 32; // 32 is paddingLeft
          const time = x / pxPerSecond;
          if (onSeek) onSeek(Math.max(0, Math.min(time, totalDuration)));
        }}
      >
        <div className="relative h-[180px]" style={{ width: safeDuration * pxPerSecond + 400, paddingLeft: 32 }}>
          
          {/* Playhead (Time Cursor) */}
          <div 
            className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-50 pointer-events-none"
            style={{ left: 32 + (currentTime * pxPerSecond) }}
          >
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rotate-45" />
          </div>
 
          {/* Time Scale Ruler */}
          <div className="absolute top-2 left-8 right-0 h-6 border-b border-white/10 flex items-start">
             {renderMarkers()}
          </div>
 
          {/* Track 1: Master A-Roll (Segments) */}
          <div className="absolute top-10 left-8 right-0 h-10 flex items-center">
             <div className="absolute inset-y-0 left-0 bg-white/[0.02] border-y border-white/5" style={{ width: safeDuration * pxPerSecond }} />
             <div className="flex gap-0 h-full">
                {segments.map((s, idx) => (
                  <div 
                    key={s.id}
                    className={`h-full border-r flex-shrink-0 overflow-hidden relative ${activeIndex === idx ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/5 bg-white/5'}`}
                    style={{ width: (s.duration || 5) * pxPerSecond }}
                  >
                    {s.assetUrl && <video src={`${s.assetUrl}#t=0.001`} className="w-full h-full object-cover opacity-30" muted />}
                  </div>
                ))}
             </div>
          </div>

          {/* Track 2: B-Rolls */}
          <div 
            className="absolute top-22 left-8 right-0 h-12 border-t border-white/5 flex items-center" 
            style={{ marginTop: '56px' }}
            onPointerDown={(e) => startLongPress('empty', e.clientX)}
            onPointerUp={clearLongPress}
            onPointerLeave={clearLongPress}
          >
             <span className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[7px] font-black text-white/10 uppercase tracking-[0.5em] pointer-events-none">B-ROLL</span>
             {brollClips.map(clip => <OverlayItem key={clip.id} overlay={clip} color="bg-blue-600" />)}
          </div>

          {/* Track 3: Subtitles */}
          <div className="absolute top-34 left-8 right-0 h-12 border-t border-white/5 flex items-center" style={{ marginTop: '104px' }}>
             <span className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[7px] font-black text-white/10 uppercase tracking-[0.5em]">SUBS</span>
             {subtitleClips.map(clip => <OverlayItem key={clip.id} overlay={clip} color="bg-amber-600" />)}
          </div>
        </div>
      </div>
    </div>
  );
};

export { StudioTimeline };
