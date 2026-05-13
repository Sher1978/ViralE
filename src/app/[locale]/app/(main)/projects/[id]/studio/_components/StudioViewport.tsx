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
}

const SUBTITLE_STYLES: Record<number, any> = {
  0: { // Classic Yellow (Requested)
    color: '#facc15',
    fontStyle: 'italic',
    textShadow: '2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 0px 4px 10px rgba(0,0,0,0.8)',
    fontWeight: '900',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'uppercase' as const,
    animation: { initial: { opacity: 0, y: 10, scale: 0.9 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, scale: 1.1 } }
  },
  1: { // White Bold
    color: '#ffffff',
    textShadow: '0 4px 20px rgba(0,0,0,0.5)',
    fontWeight: '900',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'uppercase' as const,
    animation: { initial: { opacity: 0, scale: 0.5 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.5 } }
  },
  2: { // Red Outline
    color: '#ef4444',
    WebkitTextStroke: '2px white',
    textShadow: '4px 4px 0px rgba(0,0,0,0.5)',
    fontWeight: '900',
    fontFamily: "'Inter', sans-serif",
    animation: { initial: { x: -50, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 50, opacity: 0 } }
  },
  3: { // Cyber Neon
    color: '#22d3ee',
    textShadow: '0 0 10px #22d3ee, 0 0 20px #22d3ee',
    fontWeight: '700',
    fontStyle: 'italic',
    animation: { initial: { opacity: 0, filter: 'blur(10px)' }, animate: { opacity: 1, filter: 'blur(0px)' }, exit: { opacity: 0, filter: 'blur(5px)' } }
  },
  4: { // Minimalist
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: '4px 12px',
    borderRadius: '8px',
    fontWeight: '500',
    fontSize: '0.8em',
    animation: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
  },
  5: { // Boxy Yellow
    color: '#000000',
    backgroundColor: '#facc15',
    padding: '2px 10px',
    fontWeight: '900',
    textTransform: 'uppercase' as const,
    animation: { initial: { rotateX: 90 }, animate: { rotateX: 0 }, exit: { rotateX: -90 } }
  },
  6: { // Gradient Text
    background: 'linear-gradient(to bottom, #fff, #999)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: '800',
    animation: { initial: { y: 20 }, animate: { y: 0 }, exit: { y: -20 } }
  },
  7: { // Soft Pink
    color: '#f472b6',
    textShadow: '0 2px 10px rgba(244,114,182,0.4)',
    fontWeight: '600',
    animation: { initial: { scale: 0.8 }, animate: { scale: 1 }, exit: { opacity: 0 } }
  },
  8: { // Ghostly
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.2em',
    fontWeight: '300',
    animation: { initial: { letterSpacing: '0.5em', opacity: 0 }, animate: { letterSpacing: '0.2em', opacity: 1 }, exit: { opacity: 0 } }
  },
  9: { // Impact
    color: '#ffffff',
    textShadow: '0 0 20px #fff',
    fontWeight: '900',
    animation: { initial: { scale: 2, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.5, opacity: 0 } }
  },
  10: { // Green Hacker
    color: '#10b981',
    fontFamily: 'monospace',
    textShadow: '0 0 5px #10b981',
    animation: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
  },
  11: { // Royal Gold
    color: '#fbbf24',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
    fontWeight: '800',
    fontStyle: 'italic',
    animation: { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 10 } }
  }
};

const BRollPreview = React.memo(({ url, startTime, currentTime, isPlaying }: { 
  url: string; startTime: number; currentTime: number; isPlaying: boolean;
}) => {
  const vRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = vRef.current;
    if (!v) return;

    if (isPlaying) {
      if (v.paused) v.play().catch(() => {});
    } else {
      if (!v.paused) v.pause();
    }

    const relativeTime = Math.max(0, currentTime - startTime);
    const drift = Math.abs(v.currentTime - relativeTime);
    
    // Ensure frame sync during drag or pause
    // We use a smaller drift threshold (0.2s) for better responsiveness
    if (!isPlaying || drift > 0.2) {
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
        const target = e.target as HTMLVideoElement;
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
  selectedCaptionId, subtitleStyle
}) => {
  // 🚀 High-frequency sync for smoother timeline (60fps)
  useEffect(() => {
    let frameId: number;
    const sync = () => {
      if (videoRef.current && isPlaying) {
        setCurrentTime(videoRef.current.currentTime);
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
      <div className="relative h-full aspect-[9/16] bg-neutral-900 rounded-[20px] overflow-hidden shadow-2xl border border-white/5 group">
        {aRollUrl ? (
          <div className="relative w-full h-full" onClick={togglePlay}>
            <video 
              key={aRollUrl}
              ref={videoRef} 
              src={aRollUrl}
              muted={isMuted} 
              className="w-full h-full object-cover" 
              playsInline 
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setARollDuration(e.currentTarget.duration)}
            />
            
            {/* B-ROLL OVERLAY */}
            <AnimatePresence mode="wait">
              {(() => {
                const activeBR = brollClips.find(c => c.url && c.url.length > 5 && currentTime >= c.startTime && currentTime <= c.endTime);
                if (!activeBR) return null;
                return (
                  <motion.div 
                    key={activeBR.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 bg-black flex items-center justify-center"
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
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* SUBTITLE OVERLAY (Edits Style) */}
            <div className="absolute inset-0 pointer-events-none z-30">
              <AnimatePresence>
                {(() => {
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
                        setSubtitlePos(prev => ({
                          x: prev.x + info.delta.x,
                          y: prev.y + info.delta.y
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
                              
                              const onPointerMove = (moveEvent: PointerEvent) => {
                                const delta = moveEvent.clientX - startX;
                                setSubtitleSize(Math.max(10, Math.min(200, startSize + delta * 0.5)));
                              };
                              
                              const onPointerUp = () => {
                                window.removeEventListener('pointermove', onPointerMove);
                                window.removeEventListener('pointerup', onPointerUp);
                              };
                              
                              window.addEventListener('pointermove', onPointerMove);
                              window.addEventListener('pointerup', onPointerUp);
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
                  <div className="space-y-4">
                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest leading-relaxed">
                      {transcriptionError}
                    </p>
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
