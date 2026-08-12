import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { BRollElementProps } from '@/lib/types/remotionArchitect';

export interface ElementProps {
  props: BRollElementProps;
  visualSeed: number;
  globalJitter?: number;
}

export const DynamicChart: React.FC<ElementProps> = ({ props, visualSeed, globalJitter = 0.25 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
      className="absolute right-[5%] top-[22%] w-[44%] p-6 bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-3xl shadow-2xl text-white font-sans overflow-hidden"
      style={{
        transform: `scale(${scale}) rotate(${randomRotation}deg)`,
        opacity
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
          {title}
        </h3>
      </div>

      <div className="flex items-end gap-3 h-44 pt-4 border-b border-slate-800 pb-2">
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
                className="w-full bg-gradient-to-t from-indigo-600 via-indigo-400 to-cyan-300 rounded-t-xl transition-all shadow-lg"
                style={{ height: `${barHeight}%` }}
              />
              <span className="text-xs font-mono text-slate-300 font-bold">{val}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
