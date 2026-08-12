import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ElementProps } from './DynamicChart';

export const TweetCard: React.FC<ElementProps> = ({ props, visualSeed, globalJitter = 0.25 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const randomRotation = ((visualSeed % 5) - 2) * (1 + globalJitter);
  const microDelay = (visualSeed % 3) * 2;

  const adjustedFrame = Math.max(0, frame - microDelay);
  const spr = spring({
    frame: adjustedFrame,
    fps,
    config: { mass: 0.9, damping: 11 }
  });

  const scale = interpolate(spr, [0, 1], [0.7, 1]);
  const translateY = interpolate(spr, [0, 1], [40, 0]);
  const opacity = interpolate(spr, [0, 1], [0, 1]);

  const author = props.author || 'Alex Hormozi';
  const handle = props.handle || '@alexhormozi';
  const text = props.text || 'High retention editing is not about flashiness, it is about respecting the audience time and attention.';

  return (
    <div
      className="absolute left-[6%] top-[6%] w-[88%] p-6 bg-slate-950/85 backdrop-blur-2xl border border-sky-500/30 rounded-3xl shadow-2xl text-white font-sans"
      style={{
        transform: `translateY(${translateY}px) scale(${scale}) rotate(${randomRotation}deg)`,
        opacity
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center font-bold text-lg text-white">
          {author.charAt(0)}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base text-slate-100">{author}</span>
          <span className="text-xs text-sky-400 font-mono">{handle}</span>
        </div>
      </div>
      <p className="text-sm font-medium leading-relaxed text-slate-200">
        "{text}"
      </p>
    </div>
  );
};
