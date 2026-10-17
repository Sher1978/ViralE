import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ElementProps } from './DynamicChart';
import { getThemeCardStyles } from '../utils/themeStyles';

export const StatCallout: React.FC<ElementProps> = ({ props, visualSeed = 42, globalJitter = 0.25, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const themeStyles = getThemeCardStyles(theme);

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
      className="absolute inset-x-8 top-[30%] p-8 backdrop-blur-2xl text-center flex flex-col items-center justify-center gap-2"
      style={{
        ...themeStyles.cardStyle,
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        opacity
      }}
    >
      <div 
        className="text-6xl sm:text-7xl font-black italic tracking-tighter"
        style={{
          color: themeStyles.accentPrimary,
          textShadow: `0 4px 25px ${themeStyles.accentPrimary}66`,
          fontFamily: themeStyles.fontFamily
        }}
      >
        {statValue}
      </div>
      <div 
        className="text-base sm:text-lg font-bold tracking-widest mt-1"
        style={{ 
          color: themeStyles.textMuted,
          textTransform: themeStyles.headerTransform,
          fontFamily: themeStyles.fontFamily
        }}
      >
        {statLabel}
      </div>
    </div>
  );
};
