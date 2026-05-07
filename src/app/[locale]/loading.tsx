'use client';

import React from 'react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] bg-[#050505] flex flex-col items-center justify-center">
      <img 
        src="/icon-512x512.png" 
        alt="ViralEngine" 
        className="w-24 h-24 rounded-3xl shadow-[0_0_60px_rgba(155,95,255,0.15)] animate-pulse"
      />

      {/* Background Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-600/20 blur-[100px] pointer-events-none -z-10" />
    </div>
  );
}
