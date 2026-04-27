'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WordToken } from '@/lib/types/studio';

interface KaraokeSubtitleOverlayProps {
  wordTimings: WordToken[];
  currentTime: number;
  style?: 'captions' | 'minimal' | 'bold';
  accentColor?: string;
}

const WINDOW_BEFORE = 1; // 1 word before active
const WINDOW_AFTER = 2;  // 2 words after active

const KaraokeSubtitleOverlay: React.FC<KaraokeSubtitleOverlayProps> = ({
  wordTimings,
  currentTime,
  style = 'captions',
  accentColor = '#FFEA00',
}) => {
  // Find active word index
  const activeIndex = useMemo(() => {
    for (let i = 0; i < wordTimings.length; i++) {
      if (currentTime >= wordTimings[i].start && currentTime < wordTimings[i].end) {
        return i;
      }
    }
    // If between words, find the last word that has passed
    const past = wordTimings.filter(w => w.end <= currentTime);
    return past.length > 0 ? past.length - 1 : -1;
  }, [wordTimings, currentTime]);

  // Build visible window of words
  const windowStart = Math.max(0, activeIndex - WINDOW_BEFORE);
  const windowEnd = Math.min(wordTimings.length, activeIndex + WINDOW_AFTER + 1);
  const visibleWords = wordTimings.slice(windowStart, windowEnd);
  const windowKey = Math.floor(activeIndex / 4); // changes every 4 words → triggers AnimatePresence

  if (!wordTimings.length || activeIndex < 0) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-50 flex items-end justify-center pb-10 px-4 pointer-events-none"
      style={{ minHeight: '120px' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={windowKey}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1 max-w-[85%]"
          style={{
            filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.9))',
          }}
        >
          {visibleWords.map((token, idx) => {
            const absoluteIdx = windowStart + idx;
            const isPast = absoluteIdx < activeIndex;
            const isActive = absoluteIdx === activeIndex;
            const isFuture = absoluteIdx > activeIndex;

            return (
              <motion.span
                key={`${absoluteIdx}-${token.word}`}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{
                  opacity: isActive ? 1 : isPast ? 0.55 : 0.3,
                  scale: isActive ? 1.08 : 1,
                }}
                transition={{ duration: 0.15 }}
                style={{
                  fontSize: style === 'bold' ? '38px' : '32px',
                  fontWeight: 900,
                  fontFamily: "'Inter', 'SF Pro Display', sans-serif",
                  letterSpacing: '-0.01em',
                  lineHeight: 1.15,
                  color: isActive ? accentColor : '#FFFFFF',
                  textShadow: isActive
                    ? `0 0 20px ${accentColor}88, 0 2px 8px rgba(0,0,0,1)`
                    : '0 2px 8px rgba(0,0,0,0.95)',
                  WebkitTextStroke: isActive ? '0px' : '0px',
                  display: 'inline-block',
                  transition: 'color 0.1s ease',
                }}
              >
                {token.word}
              </motion.span>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default KaraokeSubtitleOverlay;
