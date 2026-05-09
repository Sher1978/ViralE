'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Upload, Wand2 } from 'lucide-react';
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
}

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
    if (Math.abs(v.currentTime - relativeTime) > 0.15) {
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
      style={{ opacity: 0, transition: 'opacity 0.3s ease' }}
    />
  );
});

export const StudioViewport: React.FC<StudioViewportProps> = ({
  videoRef, aRollUrl, isMuted, isPlaying, currentTime, togglePlay,
  brollClips, subtitleClips, subtitlePos, setSubtitlePos, subtitleSize, setSubtitleSize,
  setCurrentTime, setARollDuration, onUploadClick,
  stage, stageMessage, transcriptionError, heartbeat, runTranscriptionAndPhrases, setStage, setTranscriptionError, setStageMessage
}) => {
  return (
    <div className="relative bg-[#050508] flex items-center justify-center flex-shrink-0" style={{ height: '38%' }}>
      <div className="relative h-full aspect-[9/16] bg-black border border-white/10 z-10">
        {aRollUrl ? (
          <div className="relative w-full h-full">
            <video 
              key={aRollUrl}
              ref={videoRef} 
              src={aRollUrl}
              muted={isMuted} 
              className="w-full h-full object-cover" 
              playsInline 
              onClick={togglePlay}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setARollDuration(e.currentTarget.duration)}
            />
            
            {/* B-ROLL OVERLAY */}
            {(() => {
              const activeBR = brollClips.find(c => c.url && c.url.length > 5 && currentTime >= c.startTime && currentTime <= c.endTime);
              if (!activeBR) return null;
              return (
                <div className="absolute inset-0 z-20 bg-black flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f] z-0">
                    <Loader2 className="w-8 h-8 text-purple-500/40 animate-spin" />
                  </div>
                  <BRollPreview 
                    url={activeBR.url}
                    startTime={activeBR.startTime}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                  />
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 w-full h-full p-6 bg-[#0a0a0f]">
            <button onClick={onUploadClick}
              className="flex flex-col items-center gap-3 w-full p-6 rounded-xl bg-white/[0.02] border border-dashed border-white/10 hover:border-purple-500/40 transition-all active:scale-[0.98]">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Upload size={20} className="text-purple-400" />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Upload A-Roll</p>
              </div>
            </button>
          </div>
        )}

        {/* PROCESSING OVERLAY */}
        {stage === 'transcribing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-40">
            <div className="relative w-14 h-14 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Wand2 size={24} className="text-purple-400 animate-pulse" />
              <div 
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] transition-all duration-300" 
                style={{ opacity: 0.3 + (heartbeat % 10) / 10, transform: `scale(${1 + (heartbeat % 5) / 10})` }}
              />
            </div>
            <div className="text-center px-8">
              <h2 className="text-lg font-black text-white uppercase tracking-tight mb-1">{stageMessage}</h2>
              {transcriptionError ? (
                <div className="mt-2 space-y-4">
                  <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest leading-relaxed max-w-[260px] mx-auto">
                    {transcriptionError}
                  </p>
                  <button 
                    onClick={() => {
                      setTranscriptionError(null);
                      setStageMessage('Повторная попытка...');
                      runTranscriptionAndPhrases(true);
                    }}
                    className="px-6 py-2 rounded-xl bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-purple-900/40 active:scale-95 transition-all"
                  >
                    Попробовать снова
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-1 justify-center mt-3">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={() => setStage('editing')}
                className="mt-6 px-4 py-2 rounded-xl text-white/20 text-[9px] font-bold uppercase tracking-widest hover:text-white/40 transition-colors"
              >
                Пропустить анализ
              </button>
            </div>
          </motion.div>
        )}

        {/* SUBTITLE OVERLAY */}
        <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
            {aRollUrl && (() => {
              const activeSub = subtitleClips.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
              if (!activeSub) return null;

              return (
                <motion.div
                  key="global-subtitle-container"
                  drag
                  dragMomentum={false}
                  onDrag={(e, info) => {
                    setSubtitlePos(prev => ({
                      x: prev.x + info.delta.x,
                      y: prev.y + info.delta.y
                    }));
                  }}
                  className="absolute text-center px-4 w-full z-[100] cursor-move active:cursor-grabbing pointer-events-auto"
                  style={{ bottom: '17%', x: subtitlePos.x, y: subtitlePos.y }}
                >
                  <div className="flex justify-center px-4">
                    <span 
                      style={{ fontSize: `${subtitleSize}px` }}
                      className="font-[900] leading-[1.0] tracking-tighter text-yellow-400 text-center [text-shadow:0_2px_0_#000] italic uppercase"
                    >
                      {activeSub.text}
                    </span>
                  </div>
                </motion.div>
              );
            })()}
        </div>
      </div>
    </div>
  );
};
