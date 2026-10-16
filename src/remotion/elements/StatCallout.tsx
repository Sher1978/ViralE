import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ElementProps } from './DynamicChart';

export const StatCallout: React.FC<ElementProps> = ({ props, visualSeed = 42, globalJitter = 0.25 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({
    frame,
    fps,
    config: { mass: 0.6, damping: 9, stiffness: 180 }
  });

  const scale = interpolate(spr, [0, 1], [0.6, 1]);
  const opacity = interpolate(spr, [0, 1], [0, 1]);
  const rotation = ((visualSeed % 7) - 3) * (1 + globalJitter);

  const statValue = props.statValue || '+300%';
  const statLabel = props.statLabel || props.title || 'Ключевой показатель';

  return (
    <div
      className="absolute inset-x-8 top-[30%] p-8 bg-slate-900/95 backdrop-blur-2xl border-2 border-amber-400/50 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-white font-sans text-center flex flex-col items-center justify-center gap-2"
      style={{
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        opacity
      }}
    >
      <div className="text-6xl sm:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 drop-shadow-[0_4px_20px_rgba(251,191,36,0.4)]">
        {statValue}
      </div>
      <div className="text-base sm:text-lg font-bold text-white/90 uppercase tracking-widest mt-1">
        {statLabel}
      </div>
    </div>
  );
};
