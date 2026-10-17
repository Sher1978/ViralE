import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ElementProps } from './DynamicChart';
import { getThemeCardStyles } from '../utils/themeStyles';

export const Icon3D: React.FC<ElementProps> = ({ props, visualSeed, globalJitter = 0.25, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const themeStyles = getThemeCardStyles(theme);

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
      className="absolute right-[8%] top-[8%] w-28 h-28 rounded-full shadow-2xl flex items-center justify-center border-4 border-white/20 z-20"
      style={{
        background: themeStyles.accentGradient,
        boxShadow: `0 15px 40px ${themeStyles.accentPrimary}66`,
        transform: `translateY(${floatY}px) scale(${scale}) rotate(${rotation}deg)`
      }}
    >
      <span className="text-6xl select-none">{props.icon || props.iconName || '⚡'}</span>
    </div>
  );
};
