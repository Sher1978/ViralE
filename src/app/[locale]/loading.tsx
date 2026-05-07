'use client';

import React from 'react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] bg-[#050505] flex flex-col items-center justify-center">
      <img 
        src="/icon-512x512.png" 
        alt="ViralEngine" 
        className="w-20 h-20 rounded-2xl shadow-[0_0_40px_rgba(155,95,255,0.2)] mb-6"
      />

      <div className="flex flex-col items-center">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
          VIRAL<span className="text-purple-500">E</span>
        </h2>
        <p className="mt-6 text-[9px] font-black uppercase tracking-[0.4em] text-white/20">
          Syncing Narrative Matrix
        </p>
      </div>

      {/* Background Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-600/20 blur-[100px] pointer-events-none -z-10" />
    </div>
  );
}
