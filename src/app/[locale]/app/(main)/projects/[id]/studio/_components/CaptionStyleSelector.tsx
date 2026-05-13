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
  { name: 'Yellow Italic', style: { color: '#facc15', fontStyle: 'italic', fontWeight: '900', textShadow: '1px 1px 0px #000' } },
  { name: 'White Bold', style: { color: '#ffffff', fontWeight: '900', textShadow: '0 4px 10px rgba(0,0,0,0.5)' } },
  { name: 'Red Outline', style: { color: '#ef4444', fontWeight: '900', WebkitTextStroke: '0.5px white', textShadow: '2px 2px 0px rgba(0,0,0,0.5)' } },
  { name: 'Cyber Neon', style: { color: '#22d3ee', fontWeight: '700', fontStyle: 'italic', textShadow: '0 0 8px #22d3ee' } },
  { name: 'Minimalist', style: { color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontWeight: '500', fontSize: '10px' } },
  { name: 'Boxy Yellow', style: { color: '#000', backgroundColor: '#facc15', padding: '2px 8px', fontWeight: '900', borderRadius: '2px' } },
  { name: 'Gradient', style: { background: 'linear-gradient(to bottom, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '900' } },
  { name: 'Soft Pink', style: { color: '#f472b6', fontWeight: '600', textShadow: '0 2px 8px rgba(244,114,182,0.4)' } },
  { name: 'Ghostly', style: { color: 'rgba(255,255,255,0.4)', fontWeight: '300', letterSpacing: '0.05em' } },
  { name: 'Impact', style: { color: '#ffffff', fontWeight: '900', textShadow: '0 0 15px #fff' } },
  { name: 'Hacker', style: { color: '#10b981', fontFamily: 'monospace', textShadow: '0 0 5px #10b981', fontWeight: 'bold' } },
  { name: 'Royal Gold', style: { color: '#fbbf24', fontWeight: '800', fontStyle: 'italic', textShadow: '0 2px 4px rgba(0,0,0,0.5)' } },
];

export const CaptionStyleSelector: React.FC<CaptionStyleSelectorProps> = ({
  currentStyle,
  onSelect,
  onClose
}) => {
  return (
    <div className="flex flex-col h-full bg-[#0d0d12] text-white rounded-t-[3rem] overflow-hidden">
      <div className="relative flex items-center justify-between px-6 py-6 border-b border-white/5 shrink-0">
        <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
            <Undo2 size={24} />
        </button>
        <h2 className="text-lg font-black tracking-tight uppercase italic">Caption Styles</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 grid grid-cols-2 gap-4 custom-scrollbar pb-12">
        {STYLES_PREVIEW.map((s, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(idx);
            }}
            className={`group relative h-32 rounded-3xl overflow-hidden border-2 transition-all active:scale-95 flex items-center justify-center p-4 bg-white/[0.03] ${
              currentStyle === idx ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)] bg-white/[0.08]' : 'border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
            }`}
          >
            <div className="text-center">
              <span 
                className="block text-[13px] uppercase tracking-tighter leading-tight mb-2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}
              >
                {s.name}
              </span>
              <div 
                className="inline-block text-[14px] uppercase tracking-tighter whitespace-nowrap"
                style={s.style as any}
              >
                Pick a style
              </div>
            </div>
            
            {currentStyle === idx && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
