import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ElementProps } from './DynamicChart';

export const ComparisonCard: React.FC<ElementProps> = ({ props, visualSeed = 42, globalJitter = 0.25 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
      className="absolute inset-x-6 top-[25%] p-6 bg-slate-900/95 backdrop-blur-2xl border-2 border-indigo-500/40 rounded-[2rem] shadow-2xl text-white font-sans space-y-4"
      style={{
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        opacity
      }}
    >
      <div className="text-center">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">Сравнение эффекта</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Before */}
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center flex flex-col items-center justify-center gap-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-red-400">{beforeTitle}</span>
          <p className="text-xs font-bold text-white/80 leading-tight">{beforeValue}</p>
        </div>

        {/* After */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center flex flex-col items-center justify-center gap-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">{afterTitle}</span>
          <p className="text-xs font-black text-white leading-tight">{afterValue}</p>
        </div>
      </div>
    </div>
  );
};
