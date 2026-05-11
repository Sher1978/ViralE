'use client';

import React from 'react';
import { 
  Play, Pause, RotateCcw, RotateCw
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
  videoRef: React.RefObject<HTMLVideoElement | null>;
  
  // Stage & Actions (Note: Some of these will move to ToolDrawer)
  stage: string;
  subtitleClips: SubtitleClip[];
  aRollUrl: string | null;
  onRefineSubtitles: () => void;
  onTranscribe: () => void;
  onGenerateBRoll: () => void;
}

const fmt = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

export const StudioActionBar: React.FC<StudioActionBarProps> = ({
  isPlaying, currentTime, duration, togglePlay
}) => {
  return (
    <div className="flex items-center justify-between px-6 h-14 bg-black border-y border-white/[0.06] flex-shrink-0 z-40">
      {/* Left: Transport Controls */}
      <div className="flex items-center">
        <button 
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center text-white active:scale-90 transition-all"
        >
          {isPlaying ? (
            <Pause size={24} fill="white" strokeWidth={0} />
          ) : (
            <Play size={24} fill="white" strokeWidth={0} className="ml-0.5" />
          )}
        </button>
      </div>
      
      {/* Center: Dual-line Timecode */}
      <div className="flex flex-col items-center justify-center">
        <span className="text-[16px] font-bold tabular-nums text-white leading-tight tracking-tight">
          {fmt(currentTime)}
        </span>
        <span className="text-[10px] font-medium text-white/30 tabular-nums leading-tight uppercase tracking-widest">
          {fmt(duration)}
        </span>
      </div>
      
      {/* Right: History Controls */}
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white/60 active:scale-90 transition-all">
          <RotateCcw size={20} strokeWidth={2.5} />
        </button>
        <button className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white/60 active:scale-90 transition-all">
          <RotateCw size={20} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
