'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Undo2 } from 'lucide-react';

interface CaptionStyleSelectorProps {
  currentStyle: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

const STYLES_PREVIEW = [
  { name: 'Yellow Italic', color: '#facc15', fontStyle: 'italic', bg: 'bg-yellow-500/10' },
  { name: 'White Bold', color: '#ffffff', fontWeight: '900', bg: 'bg-white/10' },
  { name: 'Red Outline', color: '#ef4444', border: 'border-white', bg: 'bg-red-500/10' },
  { name: 'Cyber Neon', color: '#22d3ee', glow: 'shadow-[0_0_10px_#22d3ee]', bg: 'bg-cyan-500/10' },
  { name: 'Minimalist', color: '#ffffff', bg: 'bg-black/60' },
  { name: 'Boxy Yellow', color: '#000', bg: 'bg-yellow-400' },
  { name: 'Gradient', color: '#fff', bg: 'bg-gradient-to-b from-white to-gray-500' },
  { name: 'Soft Pink', color: '#f472b6', bg: 'bg-pink-500/10' },
  { name: 'Ghostly', color: '#fff', opacity: 'opacity-40', bg: 'bg-white/5' },
  { name: 'Impact', color: '#fff', shadow: 'shadow-lg', bg: 'bg-white/20' },
  { name: 'Hacker', color: '#10b981', font: 'font-mono', bg: 'bg-emerald-950' },
  { name: 'Royal Gold', color: '#fbbf24', fontStyle: 'italic', bg: 'bg-amber-900/40' },
];

export const CaptionStyleSelector: React.FC<CaptionStyleSelectorProps> = ({
  currentStyle,
  onSelect,
  onClose
}) => {
  return (
    <div className="flex flex-col h-full bg-[#0d0d12] text-white rounded-t-[3rem] overflow-hidden">
      <div className="relative flex items-center justify-between px-6 py-8 border-b border-white/5">
        <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
            <Undo2 size={24} />
        </button>
        <h2 className="text-xl font-bold tracking-tight uppercase">Caption Styles</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 grid grid-cols-2 gap-4 custom-scrollbar">
        {STYLES_PREVIEW.map((style, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`relative aspect-square rounded-[2rem] overflow-hidden border-2 transition-all active:scale-95 ${
              currentStyle === idx ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'border-white/5 hover:border-white/20'
            } ${style.bg}`}
          >
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <span 
                className={`text-center font-black uppercase tracking-tighter leading-none ${style.glow} ${style.opacity} ${style.font}`}
                style={{ 
                    color: style.color, 
                    fontStyle: style.fontStyle, 
                    fontWeight: style.fontWeight || '900',
                    fontSize: '14px'
                }}
              >
                {style.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
