import React from 'react';
import { AbsoluteFill, Sequence, Video, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { RemotionArchitectCutSheet, BRollElement } from '@/lib/types/remotionArchitect';
import { DynamicChart } from './elements/DynamicChart';
import { TweetCard } from './elements/TweetCard';
import { ListOverlay } from './elements/ListOverlay';
import { Icon3D } from './elements/Icon3D';
import { KineticQuote } from './components/new/KineticQuote';
import { GlassmorphicChart } from './components/new/GlassmorphicChart';

import { StatCallout } from './elements/StatCallout';
import { ComparisonCard } from './elements/ComparisonCard';

export interface ViraliCompositionProps {
  speakerVideoUrl: string;
  cutSheet: RemotionArchitectCutSheet;
  subtitles?: Array<{ start?: number; end?: number; text?: string; word?: string }>;
  onSelectElement?: (elementId: string) => void;
  selectedElementId?: string | null;
}

export const ViraliArchitectComposition: React.FC<ViraliCompositionProps> = ({
  speakerVideoUrl,
  cutSheet,
  subtitles = [],
  onSelectElement,
  selectedElementId
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cameraCuts = cutSheet?.cameraCuts || [];
  const bRollElements = cutSheet?.bRollElements || [];
  const globalJitter = cutSheet?.renderSettings?.globalJitter || 0.25;
  const includeSubtitles = cutSheet?.renderSettings?.includeSubtitles === true;
  const dynamicTheme = cutSheet?.renderSettings?.dynamicTheme;

  // 1. Поиск активной трансформации кадра спикера
  const activeCut = cameraCuts.find(
    (c) => frame >= c.startFrame && frame < c.startFrame + c.durationFrames
  );

  let videoStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '0px',
    transform: 'scale(1) translate(0px, 0px)'
  };

  if (activeCut) {
    const cutProgress = Math.max(0, frame - activeCut.startFrame);
    const spr = spring({
      frame: cutProgress,
      fps,
      config: { mass: 0.8, damping: 14 }
    });

    if (activeCut.action === 'micro_zoom') {
      const targetS = activeCut.targetScale || 1.03;
      const durationFr = Math.max(1, activeCut.durationFrames || 100);
      const microScale = interpolate(cutProgress, [0, durationFr], [1.0, targetS], { extrapolateRight: 'clamp' });
      videoStyle = {
        ...videoStyle,
        transform: `scale(${microScale})`
      };
    } else if (activeCut.action === 'punch_zoom') {
      const targetS = activeCut.targetScale || 1.12;
      const scale = interpolate(spr, [0, 1], [1.0, targetS]);
      videoStyle = {
        ...videoStyle,
        transform: `scale(${scale})`
      };
    } else if (activeCut.action === 'scale_to_circle') {
      const scale = interpolate(spr, [0, 1], [1, 0.45]);
      const borderRadius = interpolate(spr, [0, 1], [0, 50]);
      const translateX = interpolate(spr, [0, 1], [0, -25]); // Сдвиг влево

      videoStyle = {
        ...videoStyle,
        transform: `scale(${scale}) translateX(${translateX}%)`,
        borderRadius: `${borderRadius}%`,
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
      };
    } else if (activeCut.action === 'move_left') {
      const scale = interpolate(spr, [0, 1], [1, 0.8]);
      const translateX = interpolate(spr, [0, 1], [0, -30]);

      videoStyle = {
        ...videoStyle,
        transform: `scale(${scale}) translateX(${translateX}%)`,
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
      };
    } else if (activeCut.action === 'pip_right') {
      const scale = interpolate(spr, [0, 1], [1, 0.4]);
      const translateX = interpolate(spr, [0, 1], [0, 30]);

      videoStyle = {
        ...videoStyle,
        transform: `scale(${scale}) translateX(${translateX}%)`,
        borderRadius: '30px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
      };
    }
  }

  // Active subtitle for current frame if enabled
  const currentTimeSec = frame / fps;
  const activeSub = includeSubtitles
    ? subtitles.find((s) => {
        const start = s.start ?? 0;
        const end = s.end ?? start + 1.5;
        return currentTimeSec >= start && currentTimeSec <= end;
      })
    : null;

  return (
    <AbsoluteFill className="bg-slate-950 overflow-hidden font-sans">
      {/* СЛОЙ 0: Видео спикера с трансформируемой кадровой маской */}
      <AbsoluteFill className="flex items-center justify-center">
        <div style={videoStyle} className="transition-all duration-300 overflow-hidden">
          {speakerVideoUrl ? (
            <Video src={speakerVideoUrl} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
              [Speaker Video Placeholder]
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* СЛОЙ 1: Динамические инфографические оверлеи Remotion */}
      <AbsoluteFill>
        {bRollElements.map((elem: BRollElement) => {
          const durationFrames = Math.max(1, elem.endFrame - elem.startFrame);
          const isSelected = selectedElementId === elem.id;

          return (
            <Sequence
              key={elem.id}
              from={elem.startFrame}
              durationInFrames={durationFrames}
            >
              <div
                onClick={() => onSelectElement?.(elem.id)}
                className={`w-full h-full relative cursor-pointer ${
                  isSelected ? 'ring-4 ring-purple-500 rounded-3xl' : ''
                }`}
              >
                <RenderElement element={elem} globalJitter={globalJitter} />
              </div>
            </Sequence>
          );
        })}
      </AbsoluteFill>

      {/* СЛОЙ 2: Опциональные субтитры (только если включены в настройках Motion) */}
      {includeSubtitles && activeSub && (
        <AbsoluteFill className="flex items-center justify-end pb-24 pointer-events-none">
          <div className="px-6 py-2.5 rounded-2xl bg-black/80 border border-white/20 text-white font-black text-xl tracking-wide uppercase shadow-2xl">
            {activeSub.text || activeSub.word}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

const RenderElement: React.FC<{ element: BRollElement; globalJitter: number }> = ({ element, globalJitter }) => {
  switch (element.type) {
    case 'kinetic_quote':
      return <KineticQuote props={element.props} visualSeed={element.visualSeed} globalJitter={globalJitter} />;
    case 'glassmorphic_chart':
    case 'chart':
      return <GlassmorphicChart props={element.props} visualSeed={element.visualSeed} globalJitter={globalJitter} />;
    case 'tweet_card':
      return <TweetCard props={element.props} visualSeed={element.visualSeed} globalJitter={globalJitter} />;
    case 'list':
      return <ListOverlay props={element.props} visualSeed={element.visualSeed} globalJitter={globalJitter} />;
    case '3d_icon':
      return <Icon3D props={element.props} visualSeed={element.visualSeed} globalJitter={globalJitter} />;
    case 'stat_callout':
      return <StatCallout props={element.props} visualSeed={element.visualSeed} globalJitter={globalJitter} />;
    case 'comparison_card':
      return <ComparisonCard props={element.props} visualSeed={element.visualSeed} globalJitter={globalJitter} />;
    default:
      return null;
  }
};
