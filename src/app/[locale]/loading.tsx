'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] bg-[#050505] flex flex-col items-center justify-center">
      <div className="relative">
        {/* Animated Rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 rounded-full border-2 border-purple-500/10 border-t-purple-500 border-r-purple-500"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 rounded-full border-2 border-cyan-500/10 border-b-cyan-500 border-l-cyan-500"
        />
        
        {/* Central Logo Symbol */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-8 h-8 bg-white/10 rounded-lg backdrop-blur-md border border-white/20 flex items-center justify-center"
          >
            <div className="w-4 h-4 bg-purple-500 rounded-sm shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
          </motion.div>
        </div>
      </div>

      <div className="mt-12 flex flex-col items-center">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
          VIRAL<span className="text-purple-500">E</span>
        </h2>
        <div className="mt-4 flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                height: [4, 12, 4],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ 
                duration: 1, 
                repeat: Infinity, 
                delay: i * 0.2 
              }}
              className="w-1 bg-purple-500 rounded-full"
            />
          ))}
        </div>
        <p className="mt-4 text-[9px] font-black uppercase tracking-[0.4em] text-white/20">
          Syncing Narrative Matrix
        </p>
      </div>

      {/* Background Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-600/20 blur-[100px] pointer-events-none -z-10" />
    </div>
  );
}
