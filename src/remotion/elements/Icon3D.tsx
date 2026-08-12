import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ElementProps } from './DynamicChart';

export const Icon3D: React.FC<ElementProps> = ({ props, visualSeed, globalJitter = 0.25 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({
    frame,
    fps,
    config: { mass: 1, damping: 8 }
  });

  const scale = interpolate(spr, [0, 1], [0.3, 1]);
  const floatY = Math.sin(frame / 10) * 12;
  const rotation = Math.cos(frame / 15) * 8 + ((visualSeed % 9) - 4);

  return (
    <div
      className="absolute right-[8%] top-[8%] w-28 h-28 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-full shadow-2xl flex items-center justify-center border-4 border-white/20 z-20"
      style={{
        transform: `translateY(${floatY}px) scale(${scale}) rotate(${rotation}deg)`
      }}
    >
      <span className="text-6xl select-none">⚡</span>
    </div>
  );
};
