import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ElementProps } from './DynamicChart';
import { getThemeCardStyles } from '../utils/themeStyles';

export const ComparisonCard: React.FC<ElementProps> = ({ props, visualSeed = 42, globalJitter = 0.25, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const themeStyles = getThemeCardStyles(theme);

  const spr = spring({
    frame,
    fps,
    config: { mass: 0.7, damping: 11, stiffness: 150 }
  });

  const scale = interpolate(spr, [0, 1], [0.8, 1]);
  const opacity = interpolate(spr, [0, 1], [0, 1]);
  const rotation = ((visualSeed % 5) - 2) * (1 + globalJitter);

  const beforeTitle = props.beforeTitle || 'Было';
  const beforeValue = props.beforeValue || 'Ручной долгий монтаж';
  const afterTitle = props.afterTitle || 'Стало';
  const afterValue = props.afterValue || 'AI Motion за 3 секунды';

  return (
    <div
      className="absolute inset-x-6 top-[25%] p-6 backdrop-blur-2xl space-y-4"
      style={{
        ...themeStyles.cardStyle,
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        opacity
      }}
    >
      <div className="text-center">
        <span 
          className="text-[10px] font-black uppercase tracking-[0.25em]"
          style={{ color: themeStyles.accentPrimary, fontFamily: themeStyles.fontFamily }}
        >
          Сравнение эффекта
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Before */}
        <div 
          className="p-4 text-center flex flex-col items-center justify-center gap-1 border border-red-500/20 bg-red-500/10"
          style={{ borderRadius: themeStyles.borderRadius === '0px' ? '0px' : '16px' }}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-red-400">{beforeTitle}</span>
          <p className="text-xs font-bold leading-tight" style={{ color: themeStyles.textMuted }}>{beforeValue}</p>
        </div>

        {/* After */}
        <div 
          className="p-4 text-center flex flex-col items-center justify-center gap-1 border border-emerald-500/30 bg-emerald-500/10"
          style={{ borderRadius: themeStyles.borderRadius === '0px' ? '0px' : '16px' }}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">{afterTitle}</span>
          <p className="text-xs font-black leading-tight" style={{ color: themeStyles.textPrimary }}>{afterValue}</p>
        </div>
      </div>
    </div>
  );
};
