'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Plus, Wand2, Clock, Trash2, Layers, X,
  ZoomIn, ZoomOut, AlertCircle, CheckCircle2
} from 'lucide-react';
import AvatarHub from '@/components/production/AvatarHub';
import { clsx } from 'clsx';

interface TimelineSegment {
  id: string;
  startTime: number;
  endTime: number;
}

interface ExportSegment {
  id: string;
  startTime: number;
  endTime: number;
  avatarUrl?: string;
  label: string;
}

interface TimelineTrack {
  id: number;
  color: string;
  avatarUrl: string | null;
  isActive: boolean;
  segments: TimelineSegment[];
}

interface TimelineLabProps {
  videoUrl: string;
  projectId: string;
  initialMasterAvatar?: string;
  onGenerate: (segments: ExportSegment[]) => void;
  onBack: () => void;
}

export const TimelineLab: React.FC<TimelineLabProps> = ({
  videoUrl,
  projectId,
  initialMasterAvatar,
  onGenerate,
  onBack
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // 4 Persistent Tracks
  const [tracks, setTracks] = useState<TimelineTrack[]>([
    { id: 1, color: '#A855F7', avatarUrl: initialMasterAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2', isActive: true, segments: [] },
    { id: 2, color: '#3B82F6', avatarUrl: null, isActive: false, segments: [] },
    { id: 3, color: '#10B981', avatarUrl: null, isActive: false, segments: [] },
    { id: 4, color: '#F59E0B', avatarUrl: null, isActive: false, segments: [] },
  ]);
  
  const [activeTrackId, setActiveTrackId] = useState<number>(1);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [modalTargetTrackId, setModalTargetTrackId] = useState<number | null>(null);
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
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const openAvatarLibrary = (trackId: number) => {
    setModalTargetTrackId(trackId);
    setShowAvatarModal(true);
  };

  const handleAvatarSelect = (config: any) => {
    if (!config.photoUrl || modalTargetTrackId === null) return;
    
    setTracks(tracks.map(t => t.id === modalTargetTrackId ? { ...t, avatarUrl: config.photoUrl, isActive: true } : t));
    setActiveTrackId(modalTargetTrackId);
    setShowAvatarModal(false);
  };

  const addSegmentToTrack = (trackId: number) => {
    if (duration === 0) return;
    
    setTracks(tracks.map(track => {
      if (track.id === trackId && track.isActive && track.id !== 1) {
        const fixedDuration = Math.min(3, duration - currentTime);
        const newSeg: TimelineSegment = {
          id: `seg-${Date.now()}`,
          startTime: currentTime,
          endTime: Math.min(currentTime + fixedDuration, duration)
        };
        return { ...track, segments: [...track.segments, newSeg] };
      }
      return track;
    }));
  };

  const deleteSegment = (trackId: number, segmentId: string) => {
    setTracks(tracks.map(track => {
      if (track.id === trackId) {
        return { ...track, segments: track.segments.filter(s => s.id !== segmentId) };
      }
      return track;
    }));
  };

  const handleGenerate = () => {
    const mainTrack = tracks[0];
    if (!mainTrack.avatarUrl) {
      alert("Please assign a Master Persona first.");
      return;
    }

    // Compile logic: Overlays take priority over Master
    let overlaySegments: ExportSegment[] = [];
    tracks.slice(1).forEach(track => {
      if (track.isActive && track.avatarUrl) {
        track.segments.forEach(seg => {
           overlaySegments.push({
             id: seg.id,
             startTime: seg.startTime,
             endTime: seg.endTime,
             avatarUrl: track.avatarUrl!,
             label: `Track ${track.id} Overlay`
           });
        });
      }
    });

    // Sort by start time
    overlaySegments.sort((a, b) => a.startTime - b.startTime);

    // Final mapping with Master as base
    let finalMapping: ExportSegment[] = [];
    let lastT = 0;

    for (const overlay of overlaySegments) {
       if (overlay.startTime > lastT) {
         finalMapping.push({
           id: `master-${lastT}`,
           startTime: lastT,
           endTime: overlay.startTime,
           avatarUrl: mainTrack.avatarUrl!,
           label: 'Master Performance'
         });
       }
       finalMapping.push(overlay);
       lastT = Math.max(lastT, overlay.endTime);
    }

    if (lastT < duration) {
       finalMapping.push({
         id: `master-${lastT}`,
         startTime: lastT,
         endTime: duration,
         avatarUrl: mainTrack.avatarUrl!,
         label: 'Master Performance'
       });
    }

    onGenerate(finalMapping);
    setShowConfirmModal(false);
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#020205] text-white overflow-hidden relative">
      {/* Header */}
      <div className="px-8 py-6 flex items-center justify-between border-b border-white/5 z-50 bg-[#020205]/80 backdrop-blur-2xl">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all">
             <AlertCircle className="rotate-45" size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
              <Layers className="text-purple-500" size={24}/>
              Studio V3
            </h2>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 mt-1">Multi-Persona Synthesis Engine</p>
          </div>
        </div>

        <button 
          onClick={() => setShowConfirmModal(true)}
          className="px-10 py-4 rounded-[2rem] bg-gradient-to-r from-purple-600 to-blue-600 font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          Синтезировать ИИ
          <Wand2 size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Top: Premium Video Player */}
        <div className="flex-[0.5] min-h-0 p-8 flex flex-col items-center justify-center relative">
          <div className="relative h-full aspect-[9/16] bg-black rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(168,85,247,0.15)] border border-white/5">
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
                  <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-2xl">
                    <Play size={40} className="text-white translate-x-1" fill="currentColor" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Player Progress Mini */}
          <div className="absolute bottom-12 px-6 py-3 bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 flex items-center gap-4">
             <button onClick={togglePlay} className="text-white/80 hover:text-white transition-colors">
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
             </button>
             <div className="h-1 w-32 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${(currentTime/duration)*100}%` }} />
             </div>
             <span className="text-[10px] font-black font-mono text-white/40 italic">
               {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
             </span>
          </div>
        </div>

        {/* Bottom: 4-Track Pro Timeline */}
        <div className="flex-[0.5] bg-[#05050a] border-t border-white/5 flex flex-col relative">
           {/* Timeline Headers */}
           <div className="px-8 py-4 flex items-center justify-between border-b border-white/5 bg-black/20">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Live Sync Recording</span>
              </div>
           </div>

           <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Fixed Track Identity */}
              <div className="w-56 shrink-0 flex flex-col bg-[#020205] border-r border-white/5 z-40">
                 {tracks.map((track) => (
                   <div 
                     key={track.id}
                     className={clsx(
                       "flex-1 flex items-center gap-4 px-6 border-b border-white/[0.03] transition-all relative group cursor-pointer",
                       activeTrackId === track.id ? "bg-white/[0.03]" : "opacity-40 grayscale hover:grayscale-0 hover:opacity-100"
                     )}
                     onClick={() => setActiveTrackId(track.id)}
                   >
                      <div 
                        className="w-12 h-12 rounded-2xl bg-neutral-900 border border-white/10 overflow-hidden relative shadow-2xl cursor-pointer hover:scale-105 transition-all"
                        onClick={(e) => { e.stopPropagation(); openAvatarLibrary(track.id); }}
                      >
                         {track.avatarUrl ? (
                           <img src={track.avatarUrl} className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-white/10">
                              <Plus size={20} />
                           </div>
                         )}
                         <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Wand2 size={12} className="text-white" />
                         </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                         <span className="text-[9px] font-black uppercase tracking-widest text-white/80 truncate">
                           {track.id === 1 ? 'Master Track' : `Overlay ${track.id - 1}`}
                         </span>
                         <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest">
                           {track.avatarUrl ? 'Persona Loaded' : 'Empty Slot'}
                         </span>
                      </div>
                      {activeTrackId === track.id && (
                        <div className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full" style={{ backgroundColor: track.color }} />
                      )}
                   </div>
                 ))}
              </div>

              {/* Right Column: Interactive Tracks Area */}
              <div className="flex-1 overflow-x-auto relative bg-[#020205] scrollbar-none" ref={timelineScrollRef}>
                 <div className="h-full min-w-full relative" ref={trackAreaRef}>
                    {/* Horizontal Tracks */}
                    {tracks.map((track) => (
                      <div 
                        key={track.id}
                        className={clsx(
                          "flex-1 border-b border-white/[0.03] relative group/track",
                          activeTrackId === track.id ? "bg-white/[0.01]" : ""
                        )}
                        onClick={(e) => {
                          if (track.id !== 1 && track.isActive) {
                             e.stopPropagation();
                             addSegmentToTrack(track.id);
                          } else if (track.id !== 1 && !track.isActive) {
                             openAvatarLibrary(track.id);
                          }
                        }}
                      >
                         {track.id === 1 ? (
                           <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent flex items-center px-8">
                              <div className="text-[7px] font-black uppercase tracking-[0.5em] text-white/5 select-none italic">
                                Original Performance Stream Base Layer
                              </div>
                           </div>
                         ) : (
                           track.segments.map(seg => (
                             <div 
                               key={seg.id}
                               onClick={(e) => e.stopPropagation()}
                               className="absolute top-2 bottom-2 rounded-2xl shadow-2xl backdrop-blur-2xl border border-white/10 flex items-center px-4 cursor-move group/seg z-20 group"
                               style={{
                                 left: `${(seg.startTime / duration) * 100}%`,
                                 width: `${((seg.endTime - seg.startTime) / duration) * 100}%`,
                                 backgroundColor: `${track.color}20`,
                                 borderColor: `${track.color}40`
                               }}
                             >
                                <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/20 shrink-0 shadow-lg">
                                   <img src={track.avatarUrl!} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 px-3 min-w-0">
                                   <div className="text-[7px] font-black text-white/60 uppercase tracking-widest truncate">AI Morph</div>
                                   <div className="text-[6px] font-bold text-white/20">{(seg.endTime - seg.startTime).toFixed(1)}s</div>
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); deleteSegment(track.id, seg.id); }}
                                  className="w-5 h-5 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={10} />
                                </button>
                             </div>
                           ))
                         )}

                         {track.id !== 1 && !track.isActive && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/track:opacity-100 transition-all">
                               <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-white/40">
                                 Unlock Track {track.id}
                               </div>
                            </div>
                         )}
                      </div>
                    ))}

                    {/* Pro Playhead */}
                    <motion.div 
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 shadow-[0_0_30px_rgba(239,68,68,0.8)]"
                      style={{ left: `${(currentTime / duration) * 100}%` }}
                    >
                       <div className="absolute top-0 -translate-x-1/2 w-6 h-8 bg-red-500 rounded-b-xl flex items-center justify-center shadow-2xl">
                          <div className="w-0.5 h-4 bg-white/30 rounded-full" />
                       </div>
                       <div className="absolute top-10 left-4 px-3 py-1.5 bg-red-500 rounded-xl text-[10px] font-black text-white italic shadow-2xl whitespace-nowrap">
                          {currentTime.toFixed(2)}s
                       </div>
                    </motion.div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Synthesis Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-8"
          >
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               className="max-w-md w-full bg-[#0a0a14] border border-white/10 rounded-[3rem] p-10 text-center space-y-8 shadow-2xl shadow-purple-500/10"
             >
                <div className="w-24 h-24 rounded-[2rem] bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto shadow-inner">
                   <Wand2 size={40} className="text-purple-400 animate-pulse" />
                </div>
                <div>
                   <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-3">Launch Synthesis?</h3>
                   <p className="text-[10px] text-white/30 leading-relaxed font-bold uppercase tracking-[0.2em]">
                     AI will now generate {tracks.filter(t => t.isActive).length} personas mapping over your original video stream.
                   </p>
                </div>
                <div className="flex flex-col gap-4">
                   <button 
                     onClick={handleGenerate}
                     className="w-full py-5 rounded-[2rem] bg-white text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-white/90 transition-all active:scale-95 shadow-2xl shadow-white/10"
                   >
                     🚀 Synthesize Personas
                   </button>
                   <button 
                     onClick={() => setShowConfirmModal(false)}
                     className="w-full py-5 rounded-[2rem] bg-white/5 border border-white/10 text-white/30 font-black uppercase tracking-[0.2em] text-[10px] hover:text-white transition-all"
                   >
                     Back to Timeline
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen Avatar Hub */}
      <AnimatePresence>
        {showAvatarModal && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[400] bg-[#050508]"
          >
             <AvatarHub 
               projectId={projectId}
               onSelect={handleAvatarSelect}
               onBack={() => setShowAvatarModal(false)}
             />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
