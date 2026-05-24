'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Upload, Wand2, RefreshCw } from 'lucide-react';
import { BRollClip, SubtitleClip } from '../_hooks/useStudioState';

interface StudioViewportProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  aRollUrl: string | null;
  isMuted: boolean;
  isPlaying: boolean;
  currentTime: number;
  togglePlay: () => void;
  brollClips: BRollClip[];
  subtitleClips: SubtitleClip[];
  subtitlePos: { x: number; y: number };
  setSubtitlePos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  subtitleSize: number;
  setSubtitleSize: React.Dispatch<React.SetStateAction<number>>;
  setCurrentTime: (time: number) => void;
  setARollDuration: (dur: number) => void;
  onUploadClick: () => void;
  // Stage props
  stage: string;
  stageMessage: string;
  transcriptionError: string | null;
  heartbeat: number;
  runTranscriptionAndPhrases: (force?: boolean) => void;
  setStage: (stage: any) => void;
  setTranscriptionError: (err: string | null) => void;
  setStageMessage: (msg: string) => void;
  selectedCaptionId?: string | null;
  subtitleStyle: number;
  showSubtitles: boolean;
  setBrollClips: React.Dispatch<React.SetStateAction<BRollClip[]>>;
  voiceoverUrl: string | null;
}

const SUBTITLE_STYLES: Record<number, any> = {
  0: { // Classic Yellow (Requested)
    color: '#facc15',
    fontStyle: 'italic',
    textShadow: '2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 0px 4px 10px rgba(0,0,0,0.8)',
    fontWeight: '900',
    fontFamily: "'Roboto-Bold', sans-serif",
    textTransform: 'uppercase' as const,
    animation: { initial: { opacity: 0, y: 20, x: 0 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: -10, x: 0 }, transition: { duration: 0.15 } }
  },
  1: { // White Bold
    color: '#ffffff',
    textShadow: '0 4px 20px rgba(0,0,0,0.5)',
    fontWeight: '900',
    fontFamily: "'Roboto-Bold', sans-serif",
    textTransform: 'uppercase' as const,
    animation: { initial: { opacity: 0, y: -20, x: 0 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: 20, x: 0 }, transition: { duration: 0.15 } }
  },
  2: { // Red Outline
    color: '#ef4444',
    WebkitTextStroke: '2px white',
    textShadow: '4px 4px 0px rgba(0,0,0,0.5)',
    fontWeight: '900',
    fontFamily: "'Roboto-Bold', sans-serif",
    animation: { initial: { opacity: 0, x: -50, y: 0 }, animate: { opacity: 1, x: 0, y: 0 }, exit: { opacity: 0, x: 50, y: 0 }, transition: { duration: 0.15 } }
  },
  3: { // Cyber Neon
    color: '#22d3ee',
    textShadow: '0 0 10px #22d3ee, 0 0 20px #22d3ee',
    fontWeight: '700',
    fontStyle: 'italic',
    animation: { initial: { opacity: 0, x: -20, y: 0 }, animate: { opacity: 1, x: 0, y: 0 }, exit: { opacity: 0, x: 20, y: 0 }, transition: { duration: 0.15 } }
  },
  4: { // Minimalist
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: '4px 12px',
    borderRadius: '8px',
    fontWeight: '500',
    fontSize: '0.8em',
    animation: { initial: { opacity: 0, x: 0, y: 0 }, animate: { opacity: 1, x: 0, y: 0 }, exit: { opacity: 0, x: 0, y: 0 }, transition: { duration: 0.15 } }
  },
  5: { // Boxy Yellow
    color: '#000000',
    backgroundColor: '#facc15',
    padding: '2px 10px',
    fontWeight: '900',
    textTransform: 'uppercase' as const,
    animation: { initial: { opacity: 0, y: 30, x: 0 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: -30, x: 0 }, transition: { duration: 0.15 } }
  },
  6: { // Gradient Text
    background: 'linear-gradient(to bottom, #fff, #999)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: '800',
    animation: { initial: { opacity: 0, y: 20, x: 0 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: -20, x: 0 }, transition: { duration: 0.15 } }
  },
  7: { // Soft Pink
    color: '#f472b6',
    textShadow: '0 2px 10px rgba(244,114,182,0.4)',
    fontWeight: '600',
    animation: { initial: { opacity: 0, y: 10, x: 0 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: -10, x: 0 }, transition: { duration: 0.15 } }
  },
  8: { // Ghostly
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.2em',
    fontWeight: '300',
    animation: { initial: { opacity: 0, x: 0, y: 0 }, animate: { opacity: 1, x: 0, y: 0 }, exit: { opacity: 0, x: 0, y: 0 }, transition: { duration: 0.15 } }
  },
  9: { // Impact
    color: '#ffffff',
    textShadow: '0 0 20px #fff',
    fontWeight: '900',
    animation: { initial: { opacity: 0, y: -40, x: 0 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: 40, x: 0 }, transition: { duration: 0.15 } }
  },
  10: { // Green Hacker
    color: '#10b981',
    fontFamily: 'monospace',
    textShadow: '0 0 5px #10b981',
    animation: { initial: { opacity: 0, x: 0, y: 0 }, animate: { opacity: 1, x: 0, y: 0 }, exit: { opacity: 0, x: 0, y: 0 }, transition: { duration: 0.15 } }
  },
  11: { // Royal Gold
    color: '#fbbf24',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
    fontWeight: '800',
    fontStyle: 'italic',
    animation: { initial: { opacity: 0, y: -15, x: 0 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: 15, x: 0 }, transition: { duration: 0.15 } }
  },
  12: { // Elegant Italic
    color: '#ffffff',
    fontStyle: 'italic',
    textShadow: '0 2px 10px rgba(255,255,255,0.3)',
    fontWeight: '400',
    animation: { initial: { opacity: 0, y: 15, x: 0 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: -15, x: 0 }, transition: { duration: 0.15 } }
  },
  13: { // Gentle Pastel
    color: '#fef3c7',
    textShadow: '0 1px 3px rgba(0,0,0,0.1)',
    fontWeight: '300',
    letterSpacing: '0.05em',
    animation: { initial: { opacity: 0, x: -10, y: 0 }, animate: { opacity: 1, x: 0, y: 0 }, exit: { opacity: 0, x: 10, y: 0 }, transition: { duration: 0.15 } }
  }
};

const BRollPreview = React.memo(({ url, startTime, currentTime, isPlaying }: { 
  url: string; startTime: number; currentTime: number; isPlaying: boolean;
}) => {
  const vRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = vRef.current as any;
    if (!v) return;

    // Handle play/pause
    if (isPlaying) {
      if (v.paused) v.play().catch(() => {});
    } else {
      if (!v.paused) v.pause();
    }

    // Handle time sync
    const relativeTime = Math.max(0, currentTime - startTime);
    const drift = Math.abs(v.currentTime - relativeTime);
    
    // 🔥 OPTIMIZATION: Only seek if we are paused/dragging OR if the drift is significant (>300ms)
    // Seeking every frame (60fps) kills performance.
    const needsSeek = !isPlaying || drift > 0.3;

    if (needsSeek) {
      v.currentTime = relativeTime;
    }
  }, [isPlaying, currentTime, startTime]);

  return (
    <video 
      ref={vRef}
      src={url}
      muted
      playsInline
      preload="auto"
      crossOrigin="anonymous"
      className="w-full h-full object-cover relative z-10" 
      onLoadedData={(e) => {
        const target = e.target as any;
        target.style.opacity = "1";
        target.currentTime = Math.max(0.001, currentTime - startTime);
        if (isPlaying) target.play().catch(() => {});
      }}
      style={{ opacity: 0, transition: 'opacity 0.2s ease' }}
    />
  );
});

export const StudioViewport: React.FC<StudioViewportProps> = ({
  videoRef, aRollUrl, isMuted, isPlaying, currentTime, togglePlay,
  brollClips, subtitleClips, subtitlePos, setSubtitlePos, subtitleSize, setSubtitleSize,
  setCurrentTime, setARollDuration, onUploadClick,
  stage, stageMessage, transcriptionError, heartbeat, runTranscriptionAndPhrases, setStage, setTranscriptionError, setStageMessage,
  selectedCaptionId, subtitleStyle, setBrollClips, voiceoverUrl, showSubtitles
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const voiceoverRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const v = videoRef.current as any;
    const a = voiceoverRef.current as any;
    if (!v) return;

    if (voiceoverUrl) {
        v.muted = true;
        if (a) {
            if (isPlaying) a.play().catch(() => {});
            else a.pause();
            
            const drift = Math.abs(a.currentTime - v.currentTime);
            if (drift > 0.1) a.currentTime = v.currentTime;
        }
    } else {
        v.muted = isMuted;
    }
  }, [isPlaying, voiceoverUrl, isMuted, currentTime, videoRef]);

  const getScaleFactor = () => {
    const rect = (viewportRef.current as any)?.getBoundingClientRect();
    if (!rect) return 1;
    return 1080 / rect.width;
  };
  // 🚀 High-frequency sync for smoother timeline (60fps)
  useEffect(() => {
    let frameId: number;
    const sync = () => {
      if (videoRef.current && isPlaying) {
        setCurrentTime((videoRef.current as any).currentTime);
        frameId = requestAnimationFrame(sync);
      }
    };
    if (isPlaying) {
      frameId = requestAnimationFrame(sync);
    }
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, setCurrentTime, videoRef]);

  return (
    <div className="w-full px-4 py-3 flex items-center justify-center bg-black" style={{ height: '55vh' }}>
      <div 
        ref={viewportRef}
        className="relative h-full aspect-[9/16] bg-neutral-900 rounded-[20px] overflow-hidden shadow-2xl border border-white/5 group"
      >
        {aRollUrl ? (
          <div className="relative w-full h-full" onClick={togglePlay}>
            <video 
              key={aRollUrl}
              ref={videoRef} 
              src={aRollUrl}
              muted={isMuted} 
              className="w-full h-full object-cover" 
              playsInline 
              preload="auto"
              crossOrigin="anonymous"
              onLoadedData={(e) => {
                const target = e.currentTarget as any;
                if (target.currentTime === 0) {
                  console.log('[Studio LOG] Forcing video to seek to 0.001s to render poster frame');
                  target.currentTime = 0.001;
                }
              }}
              onLoadedMetadata={(e) => {
                const dur = (e.currentTarget as any).duration;
                if (typeof dur === 'number' && isFinite(dur) && dur > 0) {
                  console.log('[Studio LOG] Video metadata loaded. safe duration:', dur);
                  setARollDuration(dur);
                } else {
                  console.warn('[Studio LOG] Video duration from loadedmetadata was not finite:', dur);
                  setARollDuration(60);
                }
              }}
              onDurationChange={(e) => {
                const dur = (e.currentTarget as any).duration;
                if (typeof dur === 'number' && isFinite(dur) && dur > 0) {
                  console.log('[Studio LOG] Video duration updated. safe duration:', dur);
                  setARollDuration(dur);
                }
              }}
            />

            {voiceoverUrl && (
                <audio ref={voiceoverRef} src={voiceoverUrl} preload="auto" />
            )}
            
            {/* B-ROLL OVERLAY */}
            <AnimatePresence>
              {(() => {
                const activeBR = brollClips.find(c => c.url && c.url.length > 5 && currentTime >= c.startTime && currentTime <= c.endTime);
                if (!activeBR) return null;
                return (
                  <motion.div 
                    key={activeBR.id}
                    drag
                    dragMomentum={false}
                    onDrag={(e, info) => {
                      const sf = getScaleFactor();
                      setBrollClips(prev => prev.map(c => c.id === activeBR.id ? {
                        ...c,
                        x: (c.x || 0) + info.delta.x * sf,
                        y: (c.y || 0) + info.delta.y * sf
                      } : c));
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`absolute z-20 flex items-center justify-center cursor-grab active:cursor-grabbing border-2 ${isPlaying ? 'border-transparent' : 'border-purple-500/50'}`}
                    style={{ 
                      inset: 0,
                      x: activeBR.x || 0,
                      y: activeBR.y || 0,
                      scale: activeBR.scale || 1
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f] z-0">
                      <Loader2 className="w-8 h-8 text-purple-500/40 animate-spin" />
                    </div>
                    <BRollPreview 
                      url={activeBR.url}
                      startTime={activeBR.startTime}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                    />
                    
                    {/* Resize Handle for B-Roll */}
                    {!isPlaying && (
                      <div 
                        className="absolute -bottom-2 -right-2 w-8 h-8 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center cursor-nwse-resize z-50 shadow-lg pointer-events-auto"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          const startX = e.clientX;
                          const startScale = activeBR.scale || 1;
                          
                          const onPointerMove = (moveEvent: any) => {
                            const delta = moveEvent.clientX - startX;
                            const newScale = Math.max(0.1, Math.min(5, startScale + delta * 0.005));
                            setBrollClips(prev => prev.map(c => c.id === activeBR.id ? { ...c, scale: newScale } : c));
                          };
                          
                          const onPointerUp = () => {
                            globalThis.removeEventListener('pointermove', onPointerMove);
                            globalThis.removeEventListener('pointerup', onPointerUp);
                          };
                          
                          globalThis.addEventListener('pointermove', onPointerMove);
                          globalThis.addEventListener('pointerup', onPointerUp);
                        }}
                      >
                        <Wand2 size={14} className="text-white" />
                      </div>
                    )}
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* SUBTITLE OVERLAY (Edits Style) */}
            <div className="absolute inset-0 pointer-events-none z-30">
              <AnimatePresence>
                {(() => {
                  if (!showSubtitles) return null;
                  const activeSub = subtitleClips.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
                  if (!activeSub) return null;

                  const isSelected = selectedCaptionId === activeSub.id;
                  const styleConfig = SUBTITLE_STYLES[subtitleStyle] || SUBTITLE_STYLES[0];

                  return (
                    <motion.div
                      key={activeSub.id}
                      drag
                      dragMomentum={false}
                      onDrag={(e, info) => {
                        const sf = getScaleFactor();
                        setSubtitlePos(prev => ({
                          x: prev.x + info.delta.x * sf,
                          y: prev.y + info.delta.y * sf
                        }));
                      }}
                      initial={styleConfig.animation.initial}
                      animate={styleConfig.animation.animate}
                      exit={styleConfig.animation.exit}
                      className={`absolute inset-x-4 flex justify-center pointer-events-auto cursor-grab active:cursor-grabbing ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-4 ring-offset-black/20 rounded-xl' : ''}`}
                      style={{ bottom: '15%', x: subtitlePos.x, y: subtitlePos.y }}
                    >
                      <div className="relative group">
                        <div className="px-6 py-3 text-center uppercase tracking-tight"
                             style={{ 
                               fontSize: `${subtitleSize}px`, 
                               lineHeight: '1',
                               WebkitTextStroke: '1px rgba(0,0,0,0.5)',
                               ...styleConfig
                            }}>
                          {activeSub.text}
                        </div>

                        {/* Resize Handle */}
                        {isSelected && (
                          <div 
                            className="absolute -bottom-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full border-2 border-black flex items-center justify-center cursor-nwse-resize z-50 shadow-lg"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              const startX = e.clientX;
                              const startSize = subtitleSize;
                              
                              const onPointerMove = (moveEvent: any) => {
                                const delta = moveEvent.clientX - startX;
                                setSubtitleSize(Math.max(10, Math.min(200, startSize + delta * 0.5)));
                              };
                              
                              const onPointerUp = () => {
                                globalThis.removeEventListener('pointermove', onPointerMove);
                                globalThis.removeEventListener('pointerup', onPointerUp);
                              };
                              
                              globalThis.addEventListener('pointermove', onPointerMove);
                              globalThis.addEventListener('pointerup', onPointerUp);
                            }}
                          >
                            <div className="w-2 h-2 bg-black rounded-full" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>

            {/* Play/Pause Overlay Indicator on Click - REMOVED per user request */}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-6 w-full h-full p-8 bg-[#0a0a0f]">
            <div className="w-20 h-20 rounded-3xl bg-purple-500/10 border border-dashed border-purple-500/30 flex items-center justify-center animate-pulse">
                <Upload size={32} className="text-purple-400" />
            </div>
            <button onClick={onUploadClick}
              className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-[0.98] text-[12px] font-black uppercase tracking-[0.2em] text-white/80">
              Upload A-Roll
            </button>
          </div>
        )}

        {/* PROCESSING OVERLAY (Integrated) */}
        <AnimatePresence>
          {stage === 'transcribing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-6 z-40 p-8">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Wand2 size={28} className="text-purple-400 animate-pulse" />
                </div>
                <motion.div 
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_15px_#10b981]" 
                  animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-sm font-black text-white uppercase tracking-wider">{stageMessage}</h2>
                {transcriptionError ? (
                  <div className="space-y-4 max-w-xs mx-auto">
                    <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl">
                      <p className="text-xs text-red-400 font-medium leading-relaxed text-center break-words select-text">
                        {transcriptionError}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setTranscriptionError(null);
                        setStageMessage('Retrying...');
                        runTranscriptionAndPhrases(true);
                      }}
                      className="px-6 py-2 rounded-xl bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-purple-900/40"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5 justify-center">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400"
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
