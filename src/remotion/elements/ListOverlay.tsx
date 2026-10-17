import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ElementProps } from './DynamicChart';
import { getThemeCardStyles } from '../utils/themeStyles';

export const ListOverlay: React.FC<ElementProps> = ({ props, visualSeed, globalJitter = 0.25, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const themeStyles = getThemeCardStyles(theme);

  const randomRotation = ((visualSeed % 7) - 3) * (1 + globalJitter);
  const title = props.title || 'Главные тезисы';
  const items = props.items || ['Первый ключевой фактор', 'Второй важный инструмент', 'Финал и призыв к действию'];

  return (
    <div
      className="absolute right-[5%] top-[22%] w-[44%] p-6 backdrop-blur-2xl"
      style={{
        ...themeStyles.cardStyle,
        transform: `rotate(${randomRotation}deg)`
      }}
    >
      <h3 
        className="text-xl font-black mb-4 tracking-wider"
        style={{
          color: themeStyles.accentPrimary,
          textTransform: themeStyles.headerTransform,
          fontFamily: themeStyles.fontFamily
        }}
      >
        {title}
      </h3>
      <div className="flex flex-col gap-3">
        {items.map((item: string, idx: number) => {
          const itemSpr = spring({
            frame: Math.max(0, frame - idx * 6),
            fps,
            config: { mass: 0.7, damping: 9 }
          });
          const translateX = interpolate(itemSpr, [0, 1], [60, 0]);
          const opacity = interpolate(itemSpr, [0, 1], [0, 1]);

          return (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 border border-white/10"
              style={{
                transform: `translateX(${translateX}px)`,
                opacity,
                borderRadius: themeStyles.borderRadius === '0px' ? '0px' : '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)'
              }}
            >
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs"
                style={{ 
                  backgroundColor: `${themeStyles.accentPrimary}25`,
                  color: themeStyles.accentPrimary
                }}
              >
                {idx + 1}
              </div>
              <span className="text-sm font-semibold" style={{ color: themeStyles.textPrimary, fontFamily: themeStyles.fontFamily }}>
                {item}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
