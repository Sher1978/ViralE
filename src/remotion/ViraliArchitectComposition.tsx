import React from 'react';
import { AbsoluteFill, Sequence, Video, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { RemotionArchitectCutSheet, BRollElement } from '@/lib/types/remotionArchitect';
import { DynamicChart } from './elements/DynamicChart';
import { TweetCard } from './elements/TweetCard';
import { ListOverlay } from './elements/ListOverlay';
import { Icon3D } from './elements/Icon3D';

export interface ViraliCompositionProps {
  speakerVideoUrl: string;
  cutSheet: RemotionArchitectCutSheet;
}

export const ViraliArchitectComposition: React.FC<ViraliCompositionProps> = ({
  speakerVideoUrl,
  cutSheet
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cameraCuts = cutSheet?.cameraCuts || [];
  const bRollElements = cutSheet?.bRollElements || [];
  const globalJitter = cutSheet?.renderSettings?.globalJitter || 0.25;

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
      config: { mass: 0.8, damping: 12 }
    });

    if (activeCut.action === 'scale_to_circle') {
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

          return (
            <Sequence
              key={elem.id}
              from={elem.startFrame}
              durationInFrames={durationFrames}
            >
              <RenderElement element={elem} globalJitter={globalJitter} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const RenderElement: React.FC<{ element: BRollElement; globalJitter: number }> = ({ element, globalJitter }) => {
  switch (element.type) {
    case 'chart':
      return <DynamicChart props={element.props} visualSeed={element.visualSeed} globalJitter={globalJitter} />;
    case 'tweet_card':
      return <TweetCard props={element.props} visualSeed={element.visualSeed} globalJitter={globalJitter} />;
    case 'list':
      return <ListOverlay props={element.props} visualSeed={element.visualSeed} globalJitter={globalJitter} />;
    case '3d_icon':
      return <Icon3D props={element.props} visualSeed={element.visualSeed} globalJitter={globalJitter} />;
    default:
      return null;
  }
};
