'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  Play, Pause, Plus, Image as ImageIcon,
  Wand2, Clock, Trash2, Layers, ChevronRight, X,
  ZoomIn, ZoomOut, AlertTriangle, CheckCircle2
} from 'lucide-react';
import AvatarHub from '@/components/production/AvatarHub';
import { clsx } from 'clsx';

interface TimelineSegment {
  id: string;
  startTime: number;
  endTime: number;
}

interface AvatarLayer {
  id: string;
  avatarUrl: string;
  isMain: boolean;
  segments: TimelineSegment[];
}

interface ExportSegment {
  id: string;
  startTime: number;
  endTime: number;
  avatarUrl?: string;
  label: string;
}

interface TimelineLabProps {
  videoUrl: string;
  projectId: string;
  onGenerate: (segments: ExportSegment[]) => void;
  onBack: () => void;
}

export const TimelineLab: React.FC<TimelineLabProps> = ({
  videoUrl,
  projectId,
  onGenerate,
  onBack
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(1); // 1 to 10 scale
  
  // Layer State (Max 4 layers)
  const [layers, setLayers] = useState<AvatarLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  
  // Modal State
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [modalTargetLayerId, setModalTargetLayerId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const trackAreaRef = useRef<HTMLDivElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      // Auto-scroll timeline to follow playhead if zoomed in
      if (timelineScrollRef.current && zoom > 1) {
        const percentage = videoRef.current.currentTime / duration;
        const scrollWidth = timelineScrollRef.current.scrollWidth;
        const containerWidth = timelineScrollRef.current.clientWidth;
        const targetScroll = (percentage * scrollWidth) - (containerWidth / 2);
        timelineScrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent | React.PointerEvent) => {
    if (!timelineScrollRef.current) return;
    const rect = timelineScrollRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineScrollRef.current.scrollLeft;
    const totalWidth = timelineScrollRef.current.scrollWidth;
    const percentage = Math.max(0, Math.min(1, x / totalWidth));
    const time = percentage * duration;
    
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const openAvatarLibrary = (layerId: string | null = null) => {
    setModalTargetLayerId(layerId);
    setShowAvatarModal(true);
  };

  const handleAvatarSelect = (config: any) => {
    if (!config.photoUrl) return; 
    
    if (modalTargetLayerId) {
      setLayers(layers.map(l => l.id === modalTargetLayerId ? { ...l, avatarUrl: config.photoUrl } : l));
    } else {
      if (layers.length >= 4) return;
      const isMain = layers.length === 0;
      const newLayerId = `layer-${Date.now()}`;
      
      // If it's a secondary layer, automatically drop an initial segment at the playhead
      const initialSegments: TimelineSegment[] = [];
      if (!isMain && duration > 0) {
        const fixedDuration = Math.min(5, duration / 4);
        initialSegments.push({
          id: `seg-init-${Date.now()}`,
          startTime: currentTime,
          endTime: Math.min(currentTime + fixedDuration, duration)
        });
      }

      const newLayer: AvatarLayer = {
        id: newLayerId,
        avatarUrl: config.photoUrl,
        isMain,
        segments: initialSegments
      };

      setLayers([...layers, newLayer]);
      setActiveLayerId(newLayerId);
    }
    setShowAvatarModal(false);
  };

  const addSegmentToLayer = (layerId: string) => {
    if (duration === 0) return;
    
    setLayers(layers.map(layer => {
      if (layer.id === layerId) {
        if (layer.isMain) return layer;
        
        // Exact playhead placement (Magnetism)
        const fixedDuration = Math.min(5, duration / 4);
        
        const newSeg: TimelineSegment = {
          id: `seg-${Date.now()}`,
          startTime: currentTime,
          endTime: Math.min(currentTime + fixedDuration, duration)
        };
        return { ...layer, segments: [...layer.segments, newSeg] };
      }
      return layer;
    }));
  };

  const deleteSegment = (layerId: string, segmentId: string) => {
    setLayers(layers.map(layer => {
      if (layer.id === layerId) {
        return { ...layer, segments: layer.segments.filter(s => s.id !== segmentId) };
      }
      return layer;
    }));
  };

  const deleteLayer = (layerId: string) => {
    setLayers(layers.filter(l => l.id !== layerId));
    if (activeLayerId === layerId) setActiveLayerId(null);
  };

  const handleGenerate = () => {
    const mainLayer = layers.find(l => l.isMain);
    if (!mainLayer) {
      alert("Please assign a Main Avatar first.");
      return;
    }

    // Compile logic
    let secondarySegments: ExportSegment[] = [];
    layers.filter(l => !l.isMain).forEach(layer => {
      layer.segments.forEach(seg => {
        secondarySegments.push({
          id: seg.id,
          startTime: seg.startTime,
          endTime: seg.endTime,
          avatarUrl: layer.avatarUrl,
          label: `Secondary Avatar`
        });
      });
    });

    secondarySegments.sort((a, b) => a.startTime - b.startTime);

    let flatSegments: ExportSegment[] = [];
    let currentT = 0;

    for (const secSeg of secondarySegments) {
      if (secSeg.startTime > currentT) {
        flatSegments.push({
          id: `main-${currentT}`,
          startTime: currentT,
          endTime: secSeg.startTime,
          avatarUrl: mainLayer.avatarUrl,
          label: 'Main Avatar'
        });
      }
      flatSegments.push(secSeg);
      currentT = Math.max(currentT, secSeg.endTime);
    }

    if (currentT < duration) {
      flatSegments.push({
        id: `main-${currentT}`,
        startTime: currentT,
        endTime: duration,
        avatarUrl: mainLayer.avatarUrl,
        label: 'Main Avatar'
      });
    }

    onGenerate(flatSegments);
    setShowConfirmModal(false);
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#050508] text-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5 shrink-0 z-10 bg-[#050508]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-white/40 transition-colors">
            <Trash2 size={20}/>
          </button>
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-widest text-white flex items-center gap-2">
              <Layers className="text-purple-500" size={18}/>
              Avatar Studio
            </h2>
            <p className="text-[10px] font-bold uppercase text-white/20 tracking-tighter">
              Layer Personas onto your timeline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Removed Zoom Controls per user request */}

          <button 
            onClick={() => setShowConfirmModal(true)}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 font-black uppercase italic tracking-widest text-xs shadow-lg shadow-purple-900/40 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5"
          >
            <div className="flex items-center gap-2">
              Синтезировать ИИ
              <Wand2 size={16} />
            </div>
            <span className="text-[7px] opacity-60 font-bold tracking-widest">ЗАПУСТИТЬ FUSION PIPELINE</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Top: Video Player */}
        <div className="flex-[0.55] min-h-0 p-4 flex flex-col items-center justify-center relative bg-black/40">
          <div className="relative h-[85%] aspect-[9/16] bg-black rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
            <video 
              ref={videoRef}
              src={videoUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full h-full object-cover"
              playsInline
              onClick={togglePlay}
            />
            
            <AnimatePresence>
              {!isPlaying && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none"
                >
                  <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                    <Play size={32} className="translate-x-1"/>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Player Controls Bar */}
          <div className="w-full max-w-xs mt-4 flex items-center justify-between px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
            <button 
              onClick={togglePlay}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            
            <div className="flex flex-col items-center">
               <div className="text-[10px] font-black tracking-widest text-white/80">
                 {currentTime.toFixed(1)}s <span className="text-white/20">/</span> {duration.toFixed(1)}s
               </div>
               <div className="w-32 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                  <motion.div 
                    className="h-full bg-purple-500" 
                    animate={{ width: `${(currentTime / duration) * 100}%` }}
                    transition={{ ease: "linear", duration: 0.1 }}
                  />
               </div>
            </div>

            <div className="flex items-center gap-2">
               <Clock size={14} className="text-white/20" />
            </div>
          </div>
        </div>

        {/* Bottom: Layered Timeline */}
        <div className="flex-[0.45] min-h-0 bg-[#0a0a14] border-t border-white/5 flex flex-col relative z-20">
          <div className="px-6 py-4 flex items-center justify-between shrink-0 border-b border-white/5">
             <div className="flex items-center gap-2">
                <Layers size={14} className="text-white/40" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Layers Workflow</span>
             </div>
             {layers.length < 4 && (
               <button 
                 onClick={() => openAvatarLibrary()}
                 className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors text-[9px] font-black uppercase tracking-widest"
               >
                 <Plus size={12} /> Add Persona Layer
               </button>
             )}
          </div>

          <div className="flex-1 flex overflow-hidden">
             {/* Left Column: Layer Headers */}
             <div className="w-40 shrink-0 flex flex-col border-r border-white/10 bg-[#08080f] z-30">
                {layers.map((layer, index) => (
                  <div 
                    key={layer.id}
                    onClick={() => setActiveLayerId(layer.id)}
                    className={clsx(
                      "h-24 flex flex-col justify-center gap-2 px-4 border-b border-white/5 cursor-pointer transition-all",
                      activeLayerId === layer.id ? 'bg-purple-500/20 shadow-inner' : 'bg-white/[0.01] hover:bg-white/[0.03]'
                    )}
                  >
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white/10 bg-neutral-900 shrink-0 group relative">
                           <img src={layer.avatarUrl} className="w-full h-full object-cover" />
                           <div 
                             onClick={(e) => { e.stopPropagation(); openAvatarLibrary(layer.id); }}
                             className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                              <Wand2 size={12} className="text-white" />
                           </div>
                        </div>
                        <div className="flex flex-col min-w-0">
                           <span className={clsx(
                             "text-[9px] font-black uppercase tracking-widest truncate",
                             activeLayerId === layer.id ? "text-purple-400" : "text-white/80"
                           )}>
                             {layer.isMain ? 'MASTER TRACK' : `TRACK ${index + 1}`}
                           </span>
                           <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-1">
                             {layer.isMain ? <CheckCircle2 size={8} className="text-purple-500"/> : <Layers size={8}/>}
                             {layer.isMain ? 'PERFORMANCE' : 'OVERLAY'}
                           </span>
                        </div>
                     </div>
                     {!layer.isMain && (
                       <button 
                         onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                         className="flex items-center gap-1.5 text-[8px] font-bold text-white/10 hover:text-red-400 transition-colors uppercase tracking-widest mt-1"
                       >
                         <Trash2 size={10} /> Delete Track
                       </button>
                     )}
                  </div>
                ))}
                {layers.length === 0 && (
                   <div className="flex-1 flex items-center justify-center text-white/10 text-[8px] font-black uppercase text-center px-4">
                      Add a main persona to unlock tracks
                   </div>
                )}
             </div>

             {/* Right Column: Scrollable Tracks Area */}
             <div 
                ref={timelineScrollRef}
                className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-none relative cursor-crosshair"
                onPointerDown={handleTimelineClick}
              >
                <div 
                  ref={trackAreaRef}
                  className="h-full relative"
                  style={{ width: `${100 * zoom}%` }}
                >
                   {/* Background Grid */}
                   <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({ length: 20 * zoom }).map((_, i) => (
                        <div key={i} className="h-full border-l border-white/[0.03] flex-1" />
                      ))}
                   </div>

                   {/* Layer Tracks */}
                   {layers.map((layer, idx) => (
                      <div 
                        key={layer.id}
                        className={clsx(
                          "h-24 border-b border-white/5 relative group/track transition-colors",
                          idx % 2 === 0 ? "bg-white/[0.01]" : "bg-transparent"
                        )}
                        onClick={(e) => {
                          if (!layer.isMain) {
                            e.stopPropagation(); // Prevent track-wide click
                            addSegmentToLayer(layer.id);
                          }
                        }}
                      >
                         {layer.isMain ? (
                           <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent flex items-center px-4">
                              <div className="text-[8px] font-black uppercase tracking-[0.3em] text-white/5 select-none">Base Stream Performance</div>
                           </div>
                         ) : (
                           layer.segments.map(seg => (
                             <div 
                               key={seg.id}
                               onClick={(e) => e.stopPropagation()}
                               className="absolute top-2 bottom-2 rounded-2xl bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-white/10 backdrop-blur-md flex items-center px-3 cursor-pointer group/seg z-20 shadow-xl ring-1 ring-white/10"
                               style={{
                                 left: `${(seg.startTime / duration) * 100}%`,
                                 width: `${((seg.endTime - seg.startTime) / duration) * 100}%`
                               }}
                             >
                                <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/20 shrink-0">
                                  <img src={layer.avatarUrl} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 px-2 overflow-hidden">
                                   <div className="text-[7px] font-black text-white/60 uppercase tracking-widest truncate">Overlay Persona</div>
                                   <div className="text-[6px] font-bold text-white/30 tracking-tighter">{(seg.endTime - seg.startTime).toFixed(1)}s</div>
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); deleteSegment(layer.id, seg.id); }}
                                  className="w-5 h-5 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center opacity-0 group-hover/seg:opacity-100 transition-opacity"
                                >
                                  <X size={10} />
                                </button>
                             </div>
                           ))
                         )}

                         {!layer.isMain && (
                           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/track:opacity-100 pointer-events-none transition-opacity">
                              <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[7px] font-black uppercase tracking-widest text-white/40">
                                 Click track to attach segment at {currentTime.toFixed(1)}s
                              </div>
                           </div>
                         )}
                      </div>
                    ))}

                   {/* Magnetic Playhead */}
                   <motion.div 
                     className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)] z-40 cursor-grab active:cursor-grabbing group/playhead"
                     style={{ left: `${(currentTime / duration) * 100}%` }}
                     drag="x"
                     dragConstraints={trackAreaRef}
                     dragElastic={0}
                     dragMomentum={false}
                     onDrag={(e, info) => {
                       const rect = trackAreaRef.current!.getBoundingClientRect();
                       const x = info.point.x - rect.left;
                       const percentage = Math.max(0, Math.min(1, x / rect.width));
                       const time = percentage * duration;
                       if (videoRef.current) {
                         videoRef.current.currentTime = time;
                         setCurrentTime(time);
                       }
                     }}
                   >
                     <div className="absolute top-0 -translate-x-1/2 w-4 h-6 bg-red-500 rounded-b-lg flex flex-col items-center justify-center gap-0.5 shadow-2xl">
                        <div className="w-0.5 h-3 bg-white/20 rounded-full" />
                     </div>
                     <div className="absolute top-8 left-4 px-2 py-1 bg-red-500 rounded-lg text-[8px] font-black text-white whitespace-nowrap shadow-xl">
                        {currentTime.toFixed(2)}s
                     </div>
                   </motion.div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
          >
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="max-w-sm w-full bg-[#0a0a14] border border-white/10 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl"
             >
                <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto">
                   <AlertTriangle size={32} className="text-purple-400" />
                </div>
                <div>
                   <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">Confirm Fusion?</h3>
                   <p className="text-xs text-white/40 leading-relaxed font-bold uppercase tracking-widest">
                     This will start the AI processing pipeline. Make sure all segments are correctly positioned to avoid re-rendering.
                   </p>
                </div>
                <div className="flex flex-col gap-3">
                   <button 
                     onClick={handleGenerate}
                     className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-white/90 transition-all active:scale-95 flex items-center justify-center gap-2"
                   >
                     <CheckCircle2 size={16} /> Yes, Synthesize
                   </button>
                   <button 
                     onClick={() => setShowConfirmModal(false)}
                     className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black uppercase tracking-[0.2em] text-[10px] hover:text-white transition-all"
                   >
                     Wait, go back
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Hub Modal */}
      <AnimatePresence>
        {showAvatarModal && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute inset-0 z-[150] bg-[#050508] flex flex-col pt-safe"
          >
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#0a0a14] shrink-0">
              <div>
                <h2 className="text-sm font-black italic uppercase tracking-widest text-white">Select AI Persona</h2>
                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">30+ Premium Archetypes Available</p>
              </div>
              <button 
                onClick={() => setShowAvatarModal(false)}
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
               <AvatarHub 
                 onSelect={handleAvatarSelect} 
                 currentConfig={{ mode: 'photo' }}
                 projectId={projectId}
               />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
