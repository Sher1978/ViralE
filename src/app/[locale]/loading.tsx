'use client';

import React from 'react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] bg-[#050505] flex flex-col items-center justify-center bg-[url('/splash_bg.png')] bg-cover bg-center">
      {/* Dark overlay for consistency */}
      <div className="absolute inset-0 bg-black/40 radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.6) 100%) pointer-events-none" />
    </div>
  );
}
