'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface TeleprompterViewProps {
  cameraStream: MediaStream | null;
  videoPreviewRef: React.RefObject<HTMLVideoElement | null>;
  isVideoMirrored: boolean;
  prompterWidth: number;
  isReading: boolean;
  countdown: number | null;
  prompterRef: React.RefObject<HTMLDivElement | null>;
  isMirrored: boolean;
  useCustomScript: boolean;
  manifest: any;
  customScript: string;
  textSize: 'sm' | 'md' | 'lg';
  scriptOpacity: number;
  t: (key: string, data?: any) => string;
}

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({
  cameraStream,
  videoPreviewRef,
  isVideoMirrored,
  prompterWidth,
  isReading,
  countdown,
  prompterRef,
  isMirrored,
  useCustomScript,
  manifest,
  customScript,
  textSize,
  scriptOpacity,
  t,
}) => {
  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden rounded-[3rem] border border-white/5">
      {/* Camera Layer */}
      {cameraStream && (
        <div className="absolute inset-0 z-0">
          <video 
            ref={videoPreviewRef}
            autoPlay 
            muted 
            playsInline
            className={`w-full h-full object-cover opacity-60 transition-transform duration-500 ${isVideoMirrored ? 'scale-x-[-1]' : ''}`}
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        </div>
      )}
      
      {/* Industry Reading Indicators */}
      <div className="absolute top-[30%] left-0 right-0 z-20 pointer-events-none">
        {/* Focus Marker Arrows */}
        <div className="absolute left-8 -translate-y-1/2 flex items-center gap-4">
          <ChevronRight size={48} className="text-purple-500 animate-pulse drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
        </div>
        <div className="absolute right-8 -translate-y-1/2 flex items-center gap-4 rotate-180">
          <ChevronRight size={48} className="text-purple-500 animate-pulse drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
        </div>
        
        {/* Central Reading Guide */}
        <div className="mx-auto h-[100px] border-y border-white/5 bg-white/[0.02] flex items-center justify-center transition-all duration-700"
             style={{ maxWidth: `${prompterWidth + 100}px` }}>
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        </div>
      </div>

      {/* Status Indicator */}
      <div className="absolute top-0 right-0 p-8 flex items-center gap-3">
         <div className={`w-3 h-3 rounded-full ${isReading ? 'bg-red-500 animate-pulse box-content border-4 border-red-500/20' : 'bg-white/10'}`} />
         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
           {isReading ? 'On Air - Professional Mode' : 'Ready'}
         </span>
      </div>

      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div 
            initial={{ opacity: 0, scale: 2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl"
          >
            <div className="relative">
              <span className="text-[12rem] font-black italic text-transparent bg-clip-text bg-gradient-to-br from-purple-400 via-white to-blue-500 drop-shadow-[0_0_50px_rgba(168,85,247,0.8)]">
                {countdown}
              </span>
              <div className="absolute -inset-20 border-2 border-white/10 rounded-full animate-ping opacity-20" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Scrolling Canvas */}
      <div 
        ref={prompterRef}
        className={`w-full h-full overflow-y-auto scrollbar-none transition-transform duration-700 ${isMirrored ? 'scale-x-[-1]' : ''}`}
        style={{
          paddingTop: '30vh',
          paddingBottom: '60vh'
        }}
      >
        <div 
          className="mx-auto space-y-48 transition-all duration-700 ease-out px-12"
          style={{ maxWidth: `${prompterWidth}px` }}
        >
          {!useCustomScript ? (
            manifest?.segments.map((s: any, idx: number) => (
              <div key={s.id} className="space-y-12 text-center group cursor-default">
                <div className="flex items-center justify-center gap-6 opacity-20 group-hover:opacity-100 transition-opacity">
                  <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-purple-500/50" />
                  <span className="text-[12px] font-black uppercase text-purple-500 tracking-[0.5em]">{t('teleprompter.sceneLabel', { n: idx + 1 })}</span>
                  <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-purple-500/50" />
                </div>
                <p className={`font-black leading-[1.2] transition-all duration-500 drop-shadow-2xl tracking-tight ${
                  textSize === 'sm' ? 'text-4xl' : textSize === 'lg' ? 'text-8xl' : 'text-6xl'
                }`} style={{ 
                  color: `rgba(255, 255, 255, ${isReading ? scriptOpacity : 0.2})` 
                }}>
                  {s.scriptText || '---'}
                </p>
              </div>
            ))
          ) : (
            <div className="space-y-12 text-center">
               <div className="flex items-center justify-center gap-6 opacity-40">
                  <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-blue-500/50" />
                  <span className="text-[12px] font-black uppercase text-blue-500 tracking-[0.5em]">Custom Script Mode</span>
                  <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-blue-500/50" />
                </div>
              <p className={`font-black leading-[1.2] transition-all duration-500 drop-shadow-2xl tracking-tight whitespace-pre-wrap ${
                textSize === 'sm' ? 'text-4xl' : textSize === 'lg' ? 'text-8xl' : 'text-6xl'
              }`} style={{ 
                color: `rgba(255, 255, 255, ${isReading ? scriptOpacity : 0.2})` 
              }}>
                {customScript || 'PASTE SCRIPT IN CONSOLE'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Fade Overlays */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[#05050a] via-[#05050a]/80 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#05050a] via-[#05050a]/80 to-transparent pointer-events-none z-10" />
    </div>
  );
};
