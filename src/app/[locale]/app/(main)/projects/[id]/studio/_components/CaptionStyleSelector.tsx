'use client';

import React from 'react';
import { Undo2 } from 'lucide-react';

interface CaptionStyleSelectorProps {
  currentStyle: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  subtitleColor: string;
  setSubtitleColor: (color: string) => void;
  subtitleBgColor: string;
  setSubtitleBgColor: (color: string) => void;
}

const STYLES_PREVIEW = [
  { name: 'Yellow Italic', style: { color: '#facc15', fontStyle: 'italic', fontWeight: '900', textShadow: '1px 1px 0px #000' } },
  { name: 'Left White Bold', style: { color: '#ffffff', fontWeight: '900', textShadow: '0 4px 10px rgba(0,0,0,0.5)' } },
  { name: 'Center Thin White', style: { color: '#ffffff', fontWeight: '400', textShadow: '0 4px 10px rgba(0,0,0,0.3)', letterSpacing: '0.05em' } },
  { name: 'Yellow Outline', style: { color: '#facc15', fontWeight: '800', textShadow: '1px 1px 0px #000' } },
  { name: 'Highlighter Yellow', style: { color: '#000', backgroundColor: '#facc15', padding: '2px 8px', fontWeight: '900', borderRadius: '2px' } },
];

const TEXT_COLORS = [
  { name: 'Белый', value: '#ffffff' },
  { name: 'Желтый', value: '#facc15' },
  { name: 'Красный', value: '#ef4444' },
  { name: 'Голубой', value: '#22d3ee' },
  { name: 'Зеленый', value: '#10b981' },
  { name: 'Розовый', value: '#f472b6' },
];

const BG_COLORS = [
  { name: 'Без фона', value: 'transparent' },
  { name: 'Черный 60%', value: 'rgba(0,0,0,0.6)' },
  { name: 'Черный', value: '#000000' },
  { name: 'Желтый', value: '#facc15' },
  { name: 'Белый', value: '#ffffff' },
  { name: 'Фиолетовый', value: '#8b5cf6' },
];

export const CaptionStyleSelector: React.FC<CaptionStyleSelectorProps> = ({
  currentStyle,
  onSelect,
  onClose,
  subtitleColor,
  setSubtitleColor,
  subtitleBgColor,
  setSubtitleBgColor,
}) => {
  return (
    <div className="flex flex-col h-full bg-[#0d0d12] text-white rounded-t-[3rem] overflow-hidden">
      <div className="relative flex items-center justify-between px-6 py-6 border-b border-white/5 shrink-0">
        <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
            <Undo2 size={24} />
        </button>
        <h2 className="text-lg font-black tracking-tight uppercase italic">Настройка титров</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar pb-16">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3 px-1">Стиль текста</h3>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {STYLES_PREVIEW.map((s, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(idx);
              }}
              className={`group relative h-28 rounded-3xl overflow-hidden border-2 transition-all active:scale-95 flex items-center justify-center p-4 bg-white/[0.03] ${
                currentStyle === idx ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)] bg-white/[0.08]' : 'border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
              }`}
            >
              <div className="text-center">
                <span 
                  className="block text-[10px] uppercase tracking-tighter leading-tight mb-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}
                >
                  {s.name}
                </span>
                <div 
                  className="inline-block text-[13px] uppercase tracking-tighter whitespace-nowrap"
                  style={s.style as any}
                >
                  Текст титров
                </div>
              </div>
              
              {currentStyle === idx && (
                <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Text Color Section */}
        <div className="border-t border-white/5 pt-6 mb-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3 px-1">Цвет текста</h3>
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
            {/* Custom Color Input Wrapper */}
            <label className="relative w-10 h-10 rounded-full border border-white/10 flex items-center justify-center cursor-pointer bg-white/5 active:scale-95 transition-all shrink-0">
              <span className="text-[14px]">🎨</span>
              <input 
                type="color" 
                value={subtitleColor && subtitleColor !== 'transparent' && subtitleColor.startsWith('#') ? subtitleColor : '#ffffff'} 
                onChange={(e) => setSubtitleColor((e.target as any).value)} 
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
            {TEXT_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setSubtitleColor(c.value)}
                className={`w-10 h-10 rounded-full border-2 transition-all active:scale-95 shrink-0 ${
                  subtitleColor === c.value ? 'border-purple-500 scale-110 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'border-transparent'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
            {/* Reset button to clear custom color */}
            <button
              onClick={() => setSubtitleColor('')}
              className={`px-3 h-10 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shrink-0 ${
                subtitleColor === '' ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-white/10 bg-white/5 text-white/40'
              }`}
            >
              Сброс
            </button>
          </div>
        </div>

        {/* Background Color Section */}
        <div className="border-t border-white/5 pt-6 pb-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3 px-1">Цвет подложки</h3>
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
            {/* Custom Color Input Wrapper */}
            <label className="relative w-10 h-10 rounded-full border border-white/10 flex items-center justify-center cursor-pointer bg-white/5 active:scale-95 transition-all shrink-0">
              <span className="text-[14px]">🎨</span>
              <input 
                type="color" 
                value={subtitleBgColor && subtitleBgColor !== 'transparent' && subtitleBgColor.startsWith('#') ? subtitleBgColor : '#000000'} 
                onChange={(e) => setSubtitleBgColor((e.target as any).value)} 
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
            {BG_COLORS.map((c) => {
              const isTransparent = c.value === 'transparent';
              return (
                <button
                  key={c.value}
                  onClick={() => setSubtitleBgColor(c.value)}
                  className={`w-10 h-10 rounded-full border-2 transition-all active:scale-95 shrink-0 flex items-center justify-center ${
                    subtitleBgColor === c.value ? 'border-purple-500 scale-110 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: isTransparent ? 'transparent' : c.value }}
                  title={c.name}
                >
                  {isTransparent && (
                    <span className="text-[10px] text-white/40">✕</span>
                  )}
                </button>
              );
            })}
            {/* Reset button to clear custom background color */}
            <button
              onClick={() => setSubtitleBgColor('')}
              className={`px-3 h-10 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shrink-0 ${
                subtitleBgColor === '' ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-white/10 bg-white/5 text-white/40'
              }`}
            >
              Сброс
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
