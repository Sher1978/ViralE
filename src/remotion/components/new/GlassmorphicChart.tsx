import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { BRollElementProps, DynamicThemeConfig } from '@/lib/types/remotionArchitect';
import { getThemeCardStyles } from '../../utils/themeStyles';

export interface GlassmorphicChartProps {
  props: BRollElementProps;
  visualSeed: number;
  globalJitter?: number;
  theme?: DynamicThemeConfig;
}

export const GlassmorphicChart: React.FC<GlassmorphicChartProps> = ({ props, visualSeed, globalJitter = 0.25, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const themeStyles = getThemeCardStyles(theme);

  // Mathematical Seed Jitter (-1.5deg to +1.5deg tilt)
  const seedJitterDeg = ((visualSeed % 5) - 2) * (0.6 + globalJitter * 0.5);
  const microDelay = (visualSeed % 3) * 2; // staggered frame delay

  const adjustedFrame = Math.max(0, frame - microDelay);

  // Entrance spring animation
  const cardSpring = spring({
    frame: adjustedFrame,
    fps,
    config: { mass: 0.8, damping: 13, stiffness: 150 }
  });

  const scale = interpolate(cardSpring, [0, 1], [0.8, 1]);
  const opacity = interpolate(cardSpring, [0, 1], [0, 1]);
  const translateX = interpolate(cardSpring, [0, 1], [40, 0]);

  const values = props.values && props.values.length > 0 ? props.values : [30, 55, 80, 95];
  const labels = props.labels && props.labels.length === values.length
    ? props.labels
    : values.map((_, i) => `Q${i + 1}`);

  const title = props.title || 'Growth Matrix';
  const statValue = props.statValue || '';

  return (
    <div
      className="absolute right-[5%] top-[20%] w-[48%] p-6 backdrop-blur-2xl overflow-hidden z-20"
      style={{
        ...themeStyles.cardStyle,
        transform: `translateX(${translateX}px) scale(${scale}) rotate(${seedJitterDeg}deg)`,
        opacity
      }}
    >
      {/* Header section with pulsating neon marker */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-3.5 h-3.5 rounded-full animate-pulse" 
            style={{ 
              backgroundColor: themeStyles.accentPrimary,
              boxShadow: `0 0 12px ${themeStyles.accentPrimary}`
            }} 
          />
          <h3 
            className="text-lg font-bold"
            style={{ 
              color: themeStyles.accentPrimary,
              fontFamily: themeStyles.fontFamily,
              textTransform: themeStyles.headerTransform
            }}
          >
            {title}
          </h3>
        </div>
        {statValue && (
          <span 
            className="text-xs font-mono font-extrabold px-2.5 py-1 rounded-full border"
            style={{ 
              color: themeStyles.accentPrimary,
              backgroundColor: `${themeStyles.accentPrimary}20`,
              borderColor: `${themeStyles.accentPrimary}40`
            }}
          >
            {statValue}
          </span>
        )}
      </div>

      {/* Chart Bars Section */}
      <div className="flex items-end gap-3.5 h-48 pt-6 pb-2 relative">
        {/* Subtle grid lines background */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 border-t border-b border-white/20">
          <div className="border-b border-white/20 w-full" />
          <div className="border-b border-white/20 w-full" />
        </div>

        {values.map((val: number, idx: number) => {
          const barDelay = Math.max(0, adjustedFrame - idx * 4);
          const barSpring = spring({
            frame: barDelay,
            fps,
            config: { mass: 0.6, damping: 11, stiffness: 160 }
          });

          // Normalize height between 10% and 100%
          const maxVal = Math.max(...values, 100);
          const targetPct = Math.min(100, Math.max(10, (val / maxVal) * 100));
          const barHeightPct = interpolate(barSpring, [0, 1], [0, targetPct]);

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end relative z-10">
              <span className="text-xs font-mono font-bold" style={{ color: themeStyles.textPrimary }}>
                {val}%
              </span>
              <div 
                className="w-full bg-black/40 h-full flex items-end p-0.5 overflow-hidden border border-white/10"
                style={{ borderRadius: themeStyles.borderRadius === '0px' ? '0px' : '8px 8px 0 0' }}
              >
                <div
                  className="w-full transition-all shadow-md"
                  style={{ 
                    height: `${barHeightPct}%`,
                    background: themeStyles.accentGradient,
                    borderRadius: themeStyles.borderRadius === '0px' ? '0px' : '6px 6px 0 0'
                  }}
                />
              </div>
              <span 
                className="text-[11px] font-semibold tracking-tight truncate w-full text-center"
                style={{ color: themeStyles.textMuted, fontFamily: themeStyles.fontFamily }}
              >
                {labels[idx]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
