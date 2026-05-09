'use client';

import React from 'react';
import { 
  Play, Pause, Volume2, VolumeX, SkipBack, Sparkles, Mic 
} from 'lucide-react';
import { SubtitleClip } from '../_hooks/useStudioState';

interface StudioActionBarProps {
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  videoRef: React.RefObject<HTMLVideoElement>;
  
  // Stage & Actions
  stage: string;
  subtitleClips: SubtitleClip[];
  aRollUrl: string | null;
  onRefineSubtitles: () => void;
  onTranscribe: () => void;
  onGenerateBRoll: () => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

export const StudioActionBar: React.FC<StudioActionBarProps> = ({
  isPlaying, isMuted, currentTime, duration, togglePlay, setCurrentTime, setIsMuted, videoRef,
  stage, subtitleClips, aRollUrl, onRefineSubtitles, onTranscribe, onGenerateBRoll
}) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0a12] border-y border-white/5 flex-shrink-0">
      {/* Transport */}
      <button 
        onClick={() => { 
          setCurrentTime(0); 
          if (videoRef.current) videoRef.current.currentTime = 0; 
        }}
        className="p-2.5 rounded-xl bg-white/5 active:scale-95"
      >
        <SkipBack size={15} className="text-white/50" />
      </button>
      
      <button 
        onClick={togglePlay}
        className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20 active:scale-95"
      >
        {isPlaying ? <Pause size={17} fill="white" /> : <Play size={17} fill="white" className="ml-0.5" />}
      </button>
      
      <button 
        onClick={() => setIsMuted(m => !m)} 
        className="p-2.5 rounded-xl bg-white/5 active:scale-95"
      >
        {isMuted ? <VolumeX size={15} className="text-white/40" /> : <Volume2 size={15} className="text-white/50" />}
      </button>
      
      <span className="text-[12px] font-black text-purple-400 tabular-nums tracking-tight">
        {fmt(currentTime)}
        <span className="text-white/20">/{fmt(duration)}</span>
      </span>
      
      <div className="flex-1" />

      {/* Action Buttons */}
      <button 
        onClick={onRefineSubtitles}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest hover:text-purple-400 hover:border-purple-500/30 transition-all"
      >
        <Sparkles size={12} /> Refine AI Subtitles
      </button>

      {(stage === 'editing' || stage === 'empty') && subtitleClips.length === 0 && aRollUrl && (
        <button 
          onClick={onTranscribe}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[11px] font-black uppercase active:scale-95 transition-all"
        >
          <Mic size={14} /> Transcribe
        </button>
      )}

      {stage === 'editing' && subtitleClips.length > 0 && (
        <button 
          onClick={onGenerateBRoll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[11px] font-black uppercase active:scale-95 transition-all"
        >
          <Sparkles size={14} /> B-Roll
        </button>
      )}
    </div>
  );
};
