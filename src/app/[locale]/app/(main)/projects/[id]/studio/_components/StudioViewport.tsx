'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Upload, Wand2, RefreshCw } from 'lucide-react';
import { BRollClip, SubtitleClip, WhiteboardClip } from '../_hooks/useStudioState';
import { splitCaptionText } from '@/lib/utils';

interface StudioViewportProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  aRollUrl: string | null;
  isMuted: boolean;
  isPlaying: boolean;
  currentTime: number;
  togglePlay: () => void;
  brollClips: BRollClip[];
  whiteboardClips: WhiteboardClip[];
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
  subtitleColor: string;
  subtitleBgColor: string;
}

const SUBTITLE_STYLES: Record<number, any> = {
  0: { // Yellow Italic (Original Style #1)
    color: '#facc15',
    fontStyle: 'italic',
    textShadow: '2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 0px 4px 10px rgba(0,0,0,0.8)',
    fontWeight: '900',
    fontFamily: "'Roboto-Bold', sans-serif",
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
    animation: { initial: { opacity: 0, y: 20, x: 0 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: -10, x: 0 }, transition: { duration: 0.15 } }
  },
  1: { // Left White Bold (Screenshot 1)
    color: '#ffffff',
    textShadow: '0 4px 12px rgba(0,0,0,0.6)',
    fontWeight: '900',
    fontFamily: "'Roboto-Bold', sans-serif",
    textTransform: 'uppercase' as const,
    textAlign: 'left' as const,
    alignItems: 'flex-start',
    animation: { initial: { opacity: 0, x: -30, y: 0 }, animate: { opacity: 1, x: 0, y: 0 }, exit: { opacity: 0, x: 20, y: 0 }, transition: { duration: 0.15 } }
  },
  2: { // Center Thin White (Screenshot 2)
    color: '#ffffff',
    textShadow: '0 4px 10px rgba(0,0,0,0.4)',
    fontWeight: '400',
    fontFamily: "'Roboto-Bold', sans-serif",
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    textAlign: 'center' as const,
    animation: { initial: { opacity: 0, scale: 0.95, y: 5 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 1.05, y: -5 }, transition: { duration: 0.15 } }
  },
  3: { // Center Yellow Outline (Screenshot 3, bottom)
    color: '#facc15',
    textShadow: '1px 1px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 0px 4px 10px rgba(0,0,0,0.8)',
    fontWeight: '800',
    fontFamily: "'Roboto-Bold', sans-serif",
    textTransform: 'none' as const,
    textAlign: 'center' as const,
    animation: { initial: { opacity: 0, y: 15, x: 0 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: -15, x: 0 }, transition: { duration: 0.15 } }
  },
  4: { // Highlighter Yellow (Screenshot 3, top)
    color: '#000000',
    backgroundColor: '#facc15',
    padding: '4px 10px',
    borderRadius: '4px',
    fontWeight: '900',
    fontFamily: "'Roboto-Bold', sans-serif",
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
    animation: { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.1 }, transition: { duration: 0.15 } }
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
      style={{ opacity: 0, transition: 'opacity 0.2s ease', transform: 'scale(1.02)' }}
    />
  );
});

export const StudioViewport: React.FC<StudioViewportProps> = ({
  videoRef, aRollUrl, isMuted, isPlaying, currentTime, togglePlay,
  brollClips, whiteboardClips, subtitleClips, subtitlePos, setSubtitlePos, subtitleSize, setSubtitleSize,
  setCurrentTime, setARollDuration, onUploadClick,
  stage, stageMessage, transcriptionError, heartbeat, runTranscriptionAndPhrases, setStage, setTranscriptionError, setStageMessage,
  selectedCaptionId, subtitleStyle, setBrollClips, voiceoverUrl, showSubtitles, subtitleColor, subtitleBgColor
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

            {/* WHITEBOARD OVERLAY */}
            <AnimatePresence>
              {(() => {
                const activeWB = whiteboardClips?.find(c => c.url && c.url.length > 5 && currentTime >= c.startTime && currentTime <= c.endTime);
                if (!activeWB) return null;
                return (
                  <motion.div 
                    key={activeWB.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-white"
                  >
                    <BRollPreview 
                      url={activeWB.url}
                      startTime={activeWB.startTime}
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
                  if (!showSubtitles) return null;
                  const activeSub = subtitleClips.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
                  if (!activeSub) return null;

                  const isSelected = selectedCaptionId === activeSub.id;
                  const styleConfig = SUBTITLE_STYLES[subtitleStyle] || SUBTITLE_STYLES[0];
                  const lines = splitCaptionText(activeSub.text);

                  // Extract container animation & placement, but keep styling on spans
                  const textStyle = {
                    fontSize: `${subtitleSize}px`,
                    lineHeight: '1.2',
                    WebkitTextStroke: styleConfig.WebkitTextStroke || '1px rgba(0,0,0,0.5)',
                    fontFamily: styleConfig.fontFamily || "'Roboto-Bold', sans-serif",
                    fontWeight: styleConfig.fontWeight || '900',
                    fontStyle: styleConfig.fontStyle || 'normal',
                    color: subtitleColor || styleConfig.color,
                    textShadow: styleConfig.textShadow,
                    textTransform: styleConfig.textTransform || 'uppercase',
                    background: subtitleColor ? undefined : styleConfig.background,
                    WebkitBackgroundClip: subtitleColor ? undefined : styleConfig.WebkitBackgroundClip,
                    WebkitTextFillColor: subtitleColor ? undefined : styleConfig.WebkitTextFillColor,
                    letterSpacing: styleConfig.letterSpacing,
                    textAlign: styleConfig.textAlign,
                  };

                  const lineStyle = {
                    backgroundColor: subtitleBgColor || styleConfig.backgroundColor,
                    padding: (subtitleBgColor || styleConfig.backgroundColor) ? (styleConfig.padding || '2px 10px') : undefined,
                    borderRadius: (subtitleBgColor || styleConfig.backgroundColor) ? (styleConfig.borderRadius || '4px') : undefined,
                  };

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
                      className={`absolute inset-x-4 flex ${styleConfig.textAlign === 'left' ? 'justify-start pl-8' : 'justify-center'} pointer-events-auto cursor-grab active:cursor-grabbing ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-4 ring-offset-black/20 rounded-xl' : ''}`}
                      style={{ bottom: '15%', x: subtitlePos.x, y: subtitlePos.y }}
                    >
                      <div className="relative group">
                        <div className="px-6 py-3 text-center flex flex-col items-center gap-1.5"
                             style={textStyle}>
                          {lines.map((line, lIdx) => (
                            <span 
                              key={lIdx} 
                              style={lineStyle} 
                              className="inline-block"
                            >
                              {line}
                            </span>
                          ))}
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
