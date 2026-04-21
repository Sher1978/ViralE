'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, FastForward, Rewind } from 'lucide-react';

interface TeleprompterProps {
  script: {
    hook: string;
    story: string;
    cta: string;
  } | string;
  isPlaying: boolean;
  speed: number; 
  fontSize?: number;
  themeColor?: string;
  letterSpacing?: number;
  isMirrored?: boolean;
  currentLineIndex?: number;
  isVoiceFollowing?: boolean;
}

export default function Teleprompter({ 
  script, 
  isPlaying, 
  speed,
  fontSize = 48,
  themeColor,
  letterSpacing = 0,
  isMirrored = false,
  currentLineIndex = 0,
  isVoiceFollowing = false
}: TeleprompterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [offset, setOffset] = useState(0);
  
  // Logic to process script into segments
  const segments = typeof script === 'string' 
    ? script.split('\n').filter(line => line.trim() !== '').map(line => ({
        type: 'CUSTOM',
        text: line,
        color: themeColor || 'text-white'
      }))
    : [
        { type: 'HOOK', text: script.hook, color: themeColor || 'text-cyan-400' },
        { type: 'STORY', text: script.story, color: themeColor || 'text-white' },
        { type: 'CTA', text: script.cta, color: themeColor || 'text-green-400' }
      ];

  useEffect(() => {
    if (!isPlaying || isVoiceFollowing) return;

    let requestRef: number;
    
    const animateManual = () => {
      setOffset(prev => prev + (speed / 5)); // Slightly faster base speed
      requestRef = requestAnimationFrame(animateManual);
    };

    requestRef = requestAnimationFrame(animateManual);
    return () => cancelAnimationFrame(requestRef);
  }, [isPlaying, speed, isVoiceFollowing]);

  // Voice following scroll logic
  useEffect(() => {
    if (isVoiceFollowing && segmentRefs.current[currentLineIndex]) {
      const activeSegment = segmentRefs.current[currentLineIndex];
      if (activeSegment) {
        // Calculate offset to bring the active segment to the focus line
        // Focus line is at 50% of parent height (pt-[50%])
        const targetOffset = activeSegment.offsetTop;
        setOffset(targetOffset);
      }
    }
  }, [currentLineIndex, isVoiceFollowing]);

  const handleReset = () => setOffset(0);

  return (
    <div className="relative h-full w-full bg-black/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden group">
      {/* Mirror Guide Line */}
      <div className="absolute top-[20%] left-0 w-full h-[1px] bg-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.5)] z-10 pointer-events-none" />
      <div className="absolute top-[20%] left-0 -translate-y-1/2 px-4 py-2 bg-cyan-500/20 text-[10px] font-black uppercase tracking-widest text-cyan-400 border border-cyan-500/30 rounded-r-lg z-20 backdrop-blur-md">
        Focus Here
      </div>

      <div className="h-full flex flex-col items-center justify-center pt-[20%] relative">
        {/* Gradient Masks */}
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />

        <motion.div 
          ref={scrollRef}
          style={{ 
            y: -offset,
            scaleX: isMirrored ? -1 : 1
          }}
          className="w-full px-12 space-y-24 pb-[100%] will-change-transform"
        >
          {segments.map((segment, idx) => (
            <div 
              key={idx} 
              ref={el => { segmentRefs.current[idx] = el; }}
              className={`space-y-4 text-center transition-opacity duration-500 ${isVoiceFollowing && idx !== currentLineIndex ? 'opacity-20' : 'opacity-100'}`}
            >
              <span className={`text-[10px] font-black tracking-[0.3em] uppercase opacity-40 ${segment.color}`}>
                [{segment.type}]
              </span>
              <p 
                style={{ 
                  fontSize: `${fontSize}px`,
                  letterSpacing: `${letterSpacing}px`
                }}
                className={`font-black leading-tight tracking-tight uppercase italic ${segment.color} drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]`}
              >
                {segment.text}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 p-2 bg-white/5 border border-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={handleReset}
          className="p-3 hover:bg-white/10 rounded-full transition-colors text-white/60"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
