'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Maximize2 } from 'lucide-react';
import { SceneSegment } from '@/lib/types/studio';
import KaraokeSubtitleOverlay from './KaraokeSubtitleOverlay';

interface StudioPreviewProps {
  currentSegment: SceneSegment | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  accentColor?: string;
}

const StudioPreview: React.FC<StudioPreviewProps> = ({
  currentSegment,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  accentColor = '#FFEA00',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Sync play/pause from parent state
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Reset time when segment changes
  useEffect(() => {
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [currentSegment?.id]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const hasWordTimings = !!(currentSegment?.wordTimings && currentSegment.wordTimings.length > 0);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0">
      <div className="relative aspect-[9/16] h-full max-h-[65vh] bg-[#0d0d1a] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group">

        {/* Content Layer */}
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          {currentSegment ? (
            currentSegment.type.includes('avatar') ? (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                {currentSegment.assetUrl ? (
                  <video
                    ref={videoRef}
                    src={currentSegment.assetUrl}
                    autoPlay={isPlaying}
                    muted
                    loop
                    onTimeUpdate={handleTimeUpdate}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">Loading AI Meta-Human...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full relative overflow-hidden">
                {currentSegment.assetUrl && (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${currentSegment.assetUrl}')` }}
                  />
                )}
                {/* Voiceover with karaoke sync */}
                {currentSegment.voiceUrl && (
                  <audio
                    ref={videoRef as any}
                    src={currentSegment.voiceUrl}
                    autoPlay={isPlaying}
                    onTimeUpdate={handleTimeUpdate}
                    style={{ display: 'none' }}
                  />
                )}
                {currentSegment.overlayBroll && (
                  <div className="absolute inset-0 z-20 mix-blend-screen opacity-50">
                    <video src={currentSegment.overlayBroll} autoPlay muted loop className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Play size={48} className="text-white/5" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/10">No Scene Selected</p>
            </div>
          )}
        </div>

        {/* === KARAOKE SUBTITLE OVERLAY === */}
        {hasWordTimings && currentSegment?.wordTimings && (
          <KaraokeSubtitleOverlay
            wordTimings={currentSegment.wordTimings}
            currentTime={currentTime}
            accentColor={accentColor}
          />
        )}

        {/* Fallback: Static segment label if no karaoke data */}
        {!hasWordTimings && currentSegment && (
          <div className="absolute bottom-20 left-0 right-0 z-40 pointer-events-none flex justify-center px-6">
            <div
              className="px-4 py-2 rounded-2xl text-center"
              style={{
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.08)',
                maxWidth: '85%',
              }}
            >
              <p className="text-[13px] font-bold text-white/80 leading-relaxed italic">
                &ldquo;{currentSegment.scriptText?.substring(0, 90)}...&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Playback Controls Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-8 z-30">
          <div className="flex items-center gap-12">
            <button
              onClick={onPrev}
              className="p-4 rounded-full bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
            >
              <SkipBack size={24} fill="currentColor" />
            </button>
            <button
              onClick={onTogglePlay}
              className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-2xl active:scale-95 transition-all"
            >
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
            <button
              onClick={onNext}
              className="p-4 rounded-full bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
            >
              <SkipForward size={24} fill="currentColor" />
            </button>
          </div>

          <button className="absolute bottom-10 right-10 p-3 rounded-2xl bg-white/10 border border-white/5 text-white/40">
            <Maximize2 size={18} />
          </button>
        </div>

        {/* Segment Type Badge */}
        {currentSegment && (
          <div className="absolute top-8 left-8 z-40 pointer-events-none">
            <div className="px-3 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
              <span className="text-[8px] font-black uppercase text-purple-400 tracking-widest">{currentSegment.type}</span>
            </div>
            {hasWordTimings && (
              <div className="mt-1 px-2 py-0.5 rounded-md bg-yellow-500/20 border border-yellow-500/30">
                <span className="text-[7px] font-black uppercase text-yellow-400 tracking-widest">⚡ Karaoke</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudioPreview;
