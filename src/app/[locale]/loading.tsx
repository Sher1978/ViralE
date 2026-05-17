'use client';

import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] bg-[#050505] flex flex-col items-center justify-center bg-[url('/splash_bg.png')] bg-cover bg-center overflow-hidden">
      {/* Dark overlay for consistency */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 100%) pointer-events-none" />

      {/* Decorative Orbs for cosmic aesthetic */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-purple-600/10 blur-[100px] rounded-full animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-[250px] h-[250px] bg-cyan-600/10 blur-[80px] rounded-full animate-pulse delay-700 pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Animated Brand Glow */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full scale-150 animate-pulse" />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-2xl border border-white/10 relative overflow-hidden">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          </div>
        </div>

        {/* Text and Loader */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-xl font-black tracking-[0.2em] uppercase text-white flex items-center gap-2">
            VIRALE<span className="text-cyan-400">.UNO</span>
          </h2>
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md">
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/80 animate-pulse">
              Initializing Engine
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
