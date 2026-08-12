import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { BRollElementProps } from '@/lib/types/remotionArchitect';

export interface GlassmorphicChartProps {
  props: BRollElementProps;
  visualSeed: number;
  globalJitter?: number;
}

export const GlassmorphicChart: React.FC<GlassmorphicChartProps> = ({ props, visualSeed, globalJitter = 0.25 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
      className="absolute right-[5%] top-[20%] w-[48%] p-6 bg-slate-900/80 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.7)] text-white font-sans overflow-hidden z-20"
      style={{
        transform: `translateX(${translateX}px) scale(${scale}) rotate(${seedJitterDeg}deg)`,
        opacity
      }}
    >
      {/* Header section with pulsating neon marker */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse" />
          <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-sky-300 to-indigo-300">
            {title}
          </h3>
        </div>
        {statValue && (
          <span className="text-xs font-mono font-extrabold text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 px-2.5 py-1 rounded-full">
            {statValue}
          </span>
        )}
      </div>

      {/* Chart Bars Section */}
      <div className="flex items-end gap-3.5 h-48 pt-6 pb-2 relative">
        {/* Subtle grid lines background */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 border-t border-b border-slate-700">
          <div className="border-b border-slate-700 w-full" />
          <div className="border-b border-slate-700 w-full" />
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
              <span className="text-xs font-mono font-bold text-cyan-200/90">
                {val}%
              </span>
              <div className="w-full bg-slate-950/60 rounded-t-xl h-full flex items-end p-0.5 overflow-hidden border border-slate-800">
                <div
                  className="w-full bg-gradient-to-t from-indigo-600 via-cyan-500 to-cyan-300 rounded-t-lg shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all"
                  style={{ height: `${barHeightPct}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-400 font-sans tracking-tight truncate w-full text-center">
                {labels[idx]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
