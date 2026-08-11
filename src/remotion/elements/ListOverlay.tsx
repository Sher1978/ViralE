import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ElementProps } from './DynamicChart';

export const ListOverlay: React.FC<ElementProps> = ({ props, visualSeed, globalJitter = 0.25 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const randomRotation = ((visualSeed % 7) - 3) * (1 + globalJitter);
  const title = props.title || 'Главные тезисы';
  const items = props.items || ['Первый ключевой фактор', 'Второй важный инструмент', 'Финал и призыв к действию'];

  return (
    <div
      className="absolute right-6 top-1/4 w-[430px] p-6 bg-slate-900/90 backdrop-blur-2xl border border-amber-500/30 rounded-3xl shadow-2xl text-white font-sans"
      style={{
        transform: `rotate(${randomRotation}deg)`
      }}
    >
      <h3 className="text-xl font-black mb-4 text-amber-400 uppercase tracking-wider">
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
              className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50"
              style={{
                transform: `translateX(${translateX}px)`,
                opacity
              }}
            >
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-xs">
                {idx + 1}
              </div>
              <span className="text-sm font-semibold text-slate-100">{item}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
