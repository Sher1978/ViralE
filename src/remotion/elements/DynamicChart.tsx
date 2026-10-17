import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { BRollElementProps, DynamicThemeConfig } from '@/lib/types/remotionArchitect';
import { getThemeCardStyles } from '../utils/themeStyles';

export interface ElementProps {
  props: BRollElementProps;
  visualSeed: number;
  globalJitter?: number;
  theme?: DynamicThemeConfig;
}

export const DynamicChart: React.FC<ElementProps> = ({ props, visualSeed, globalJitter = 0.25, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const themeStyles = getThemeCardStyles(theme);

  // Рандомизация на основе visualSeed
  const randomRotation = ((visualSeed % 7) - 3) * (1 + globalJitter); // от -3 до +3 градусов
  const microDelay = (visualSeed % 4) * 2; // задержка в кадрах

  const adjustedFrame = Math.max(0, frame - microDelay);
  const spr = spring({
    frame: adjustedFrame,
    fps,
    config: { mass: 0.8, damping: 10 + (visualSeed % 5) }
  });

  const scale = interpolate(spr, [0, 1], [0.6, 1]);
  const opacity = interpolate(spr, [0, 1], [0, 1]);

  const values = props.values || [35, 60, 80, 95];
  const title = props.title || 'Статистика';

  return (
    <div
      className="absolute right-[5%] top-[22%] w-[44%] p-6 backdrop-blur-xl overflow-hidden"
      style={{
        ...themeStyles.cardStyle,
        transform: `scale(${scale}) rotate(${randomRotation}deg)`,
        opacity
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div 
          className="w-3 h-3 rounded-full animate-pulse" 
          style={{ backgroundColor: themeStyles.accentPrimary, boxShadow: `0 0 10px ${themeStyles.accentPrimary}` }} 
        />
        <h3 
          className="text-xl font-bold"
          style={{ 
            color: themeStyles.accentPrimary,
            textTransform: themeStyles.headerTransform,
            fontFamily: themeStyles.fontFamily
          }}
        >
          {title}
        </h3>
      </div>

      <div className="flex items-end gap-3 h-44 pt-4 border-b border-white/10 pb-2">
        {values.map((val: number, idx: number) => {
          const barSpr = spring({
            frame: Math.max(0, adjustedFrame - idx * 3),
            fps,
            config: { damping: 12 }
          });
          const barHeight = interpolate(barSpr, [0, 1], [0, val]);

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div
                className="w-full transition-all shadow-lg"
                style={{ 
                  height: `${barHeight}%`,
                  background: themeStyles.accentGradient,
                  borderRadius: themeStyles.borderRadius === '0px' ? '0px' : '8px 8px 0 0'
                }}
              />
              <span className="text-xs font-mono font-bold" style={{ color: themeStyles.textMuted }}>{val}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
