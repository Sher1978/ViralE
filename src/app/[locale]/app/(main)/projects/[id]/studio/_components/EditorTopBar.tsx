'use client';

import React from 'react';
import { X, ChevronDown } from 'lucide-react';

interface EditorTopBarProps {
  onBack: () => void;
  onExport: () => void;
  title?: string;
  quality?: string;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({
  onBack,
  onExport,
  title = 'Монтаж',
  quality = 'HD',
}) => {
  return (
    <div className="flex items-center justify-between px-4 h-14 bg-black border-b border-white/[0.06] flex-shrink-0 z-50">
      {/* Left: Close */}
      <button
        onClick={onBack}
        className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white active:scale-90 transition-all"
        aria-label="Назад"
      >
        <X size={22} strokeWidth={2.5} />
      </button>

      {/* Center: Project title */}
      <button className="flex items-center gap-1.5 text-white font-semibold text-[15px] tracking-[-0.01em] active:opacity-70 transition-opacity">
        {title}
        <ChevronDown size={15} className="text-white/40 mt-0.5" strokeWidth={2.5} />
      </button>

      {/* Right: Quality + Export */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold text-white/40 tracking-[0.15em] uppercase">
          {quality}
        </span>
        <button
          onClick={onExport}
          className="flex items-center gap-1 px-4 py-2 rounded-full bg-white text-black text-[13px] font-bold tracking-tight active:scale-95 active:opacity-90 transition-all shadow-sm"
        >
          Экспорт
          <span className="ml-0.5 text-black/60">›</span>
        </button>
      </div>
    </div>
  );
};
