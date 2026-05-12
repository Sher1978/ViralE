'use client';

import React from 'react';
import { 
  Play, Pause, RotateCcw, RotateCw, VolumeX, Volume2, Square
} from 'lucide-react';

interface StudioActionBarProps {
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  togglePlay: () => void;
  onSeek: (time: number) => void;
  setIsMuted: (muted: boolean) => void;
}

const fmt = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

export const StudioActionBar: React.FC<StudioActionBarProps> = ({
  isPlaying, isMuted, currentTime, duration, togglePlay, onSeek, setIsMuted
}) => {
  return (
    <div className="flex items-center justify-between px-6 h-14 bg-black border-y border-white/[0.06] flex-shrink-0 z-40">
      {/* Left: Transport Controls */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => {
            if (isPlaying) togglePlay();
            onSeek(0);
          }}
          className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
          title="Stop"
        >
          <Square size={20} fill="currentColor" strokeWidth={0} />
        </button>
        <button 
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center text-white active:scale-90 transition-all bg-white/5 rounded-full hover:bg-white/10"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause size={22} fill="white" strokeWidth={0} />
          ) : (
            <Play size={22} fill="white" strokeWidth={0} className="ml-0.5" />
          )}
        </button>
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>
      
      {/* Center: Dual-line Timecode */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
            <span className="text-[14px] font-black tabular-nums text-white leading-none tracking-tight">
            {fmt(currentTime)}
            </span>
            <span className="text-[9px] font-black text-white/20 tabular-nums leading-none uppercase tracking-widest mt-0.5">
            Current
            </span>
        </div>
        <div className="w-[1px] h-6 bg-white/10" />
        <div className="flex flex-col items-start">
            <span className="text-[14px] font-black tabular-nums text-white/40 leading-none tracking-tight">
            {fmt(duration)}
            </span>
            <span className="text-[9px] font-black text-white/10 tabular-nums leading-none uppercase tracking-widest mt-0.5">
            Total
            </span>
        </div>
      </div>
      
      {/* Right: Quick Actions */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => onSeek(Math.max(0, currentTime - 5))}
          className="w-10 h-10 flex items-center justify-center text-white/20 hover:text-white/40 active:scale-90 transition-all"
        >
          <RotateCcw size={18} strokeWidth={2.5} />
        </button>
        <button 
          onClick={() => onSeek(Math.min(duration, currentTime + 5))}
          className="w-10 h-10 flex items-center justify-center text-white/20 hover:text-white/40 active:scale-90 transition-all"
        >
          <RotateCw size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
