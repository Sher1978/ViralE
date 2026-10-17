import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { BRollElementProps, DynamicThemeConfig } from '@/lib/types/remotionArchitect';
import { getThemeCardStyles } from '../../utils/themeStyles';

export interface KineticQuoteProps {
  props: BRollElementProps;
  visualSeed: number;
  globalJitter?: number;
  theme?: DynamicThemeConfig;
}

export const KineticQuote: React.FC<KineticQuoteProps> = ({ props, visualSeed, globalJitter = 0.25, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const themeStyles = getThemeCardStyles(theme);

  // Mathematical Seed Jitter (-1.5deg to +1.5deg tilt)
  const seedJitterDeg = ((visualSeed % 5) - 2) * (0.6 + globalJitter * 0.5);

  // Entrance spring animation for the container
  const containerSpring = spring({
    frame,
    fps,
    config: { mass: 0.7, damping: 12, stiffness: 140 }
  });

  const scale = interpolate(containerSpring, [0, 1], [0.85, 1]);
  const opacity = interpolate(containerSpring, [0, 1], [0, 1]);
  const translateY = interpolate(containerSpring, [0, 1], [-20, 0]);

  // Determine text content & word tokens
  const fullText = props.quoteText || props.quote || props.text || props.title || 'Kinetic Quote Baseline';
  const author = props.author || props.subtitle || '';
  const highlightKeywords = (props.highlightKeywords || []).map((k) => k.toLowerCase());

  const words = props.quoteWords && props.quoteWords.length > 0
    ? props.quoteWords
    : fullText.split(/\s+/).filter(Boolean);

  // Calculate word-by-word spring progress
  const framesPerWord = Math.max(2, Math.floor(30 / Math.max(1, words.length / 3)));

  return (
    <div
      className="absolute top-[8%] left-[6%] right-[6%] p-7 backdrop-blur-2xl overflow-hidden z-20"
      style={{
        ...themeStyles.cardStyle,
        transform: `translateY(${translateY}px) scale(${scale}) rotate(${seedJitterDeg}deg)`,
        opacity
      }}
    >
      {/* Decorative quote mark badge */}
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center font-serif font-bold text-lg shadow-md"
          style={{ background: themeStyles.accentGradient, color: '#000000' }}
        >
          “
        </div>
        <span 
          className="text-xs font-semibold uppercase tracking-wider font-mono"
          style={{ color: themeStyles.accentPrimary }}
        >
          Key Takeaway
        </span>
      </div>

      {/* Kinetic Word-by-Word Container */}
      <div 
        className="flex flex-wrap gap-x-2.5 gap-y-1.5 leading-snug text-2xl md:text-3xl font-extrabold tracking-tight"
        style={{ fontFamily: themeStyles.fontFamily }}
      >
        {words.map((word, idx) => {
          const cleanWord = word.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '').toLowerCase();
          const isKeyword = highlightKeywords.some((k) => cleanWord.includes(k));

          // Word entrance delay
          const wordFrameOffset = Math.max(0, frame - idx * framesPerWord);
          const wordSpr = spring({
            frame: wordFrameOffset,
            fps,
            config: { mass: 0.5, damping: 9, stiffness: 180 }
          });

          // State check: revealed vs unrevealed
          const isRevealed = wordFrameOffset > 0;
          const wordScale = interpolate(wordSpr, [0, 1], [0.8, 1]);
          const wordBlur = interpolate(wordSpr, [0, 1], [4, 0]);
          
          // Active vs Inactive opacity logic
          const wordOpacity = isRevealed ? 1.0 : 0.4;

          return (
            <span
              key={`${word}-${idx}`}
              className="inline-block transition-all duration-150 rounded px-1"
              style={{
                transform: `scale(${wordScale})`,
                opacity: wordOpacity,
                filter: `blur(${wordBlur}px)`,
                color: isKeyword ? themeStyles.accentPrimary : themeStyles.textPrimary,
                textShadow: isKeyword ? `0 0 15px ${themeStyles.accentPrimary}88` : 'none',
                fontWeight: isKeyword ? 900 : 700
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      {author && (
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-sm">
          <span className="font-medium" style={{ color: themeStyles.textMuted, fontFamily: themeStyles.fontFamily }}>
            — {author}
          </span>
        </div>
      )}
    </div>
  );
};
