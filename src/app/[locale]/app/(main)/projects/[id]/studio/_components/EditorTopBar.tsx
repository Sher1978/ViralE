'use client';

import React from 'react';
import { X, ChevronDown } from 'lucide-react';

interface EditorTopBarProps {
  onBack: () => void;
  onExport: () => void;
  onMotionClick?: () => void;
  title?: string;
  quality?: string;
  isExporting?: boolean;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({
  onBack,
  onExport,
  onMotionClick,
  title = 'Монтаж',
  quality = 'HD',
  isExporting = false,
}) => {
  return (
    <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 h-12 bg-black border-b border-white/[0.06] flex-shrink-0 z-50">
      {/* Left: Close */}
      <button
        onClick={onBack}
        className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white active:scale-90 transition-all"
        aria-label="Назад"
      >
        <X size={22} strokeWidth={2.5} />
      </button>

      {/* Center: Project title */}
      <button className="flex items-center gap-1.5 text-white font-semibold text-[14px] sm:text-[15px] tracking-[-0.01em] active:opacity-70 transition-opacity truncate max-w-[140px] sm:max-w-xs">
        <span className="truncate">{title}</span>
        <ChevronDown size={15} className="text-white/40 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
      </button>

      {/* Right: Quality + Motion + Export */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 mr-12 sm:mr-16">
        <span className="hidden md:inline-block text-[11px] font-bold text-white/40 tracking-[0.15em] uppercase">
          {quality}
        </span>
        {onMotionClick && (
          <button
            type="button"
            onClick={onMotionClick}
            disabled={isExporting}
            className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-500 hover:brightness-110 active:scale-95 text-white text-[11px] sm:text-[12px] font-extrabold tracking-tight transition-all shadow-md shadow-purple-500/20 border border-white/20 whitespace-nowrap cursor-pointer"
            title="Claude Motion AI монтаж (параллельный пайплайн)"
          >
            <span>Motion</span>
            <span className="text-[11px] sm:text-[12px]">✨</span>
          </button>
        )}
        <button
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-1 sm:gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white text-black text-[12px] sm:text-[13px] font-bold tracking-tight active:scale-95 active:opacity-90 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed transition-all shadow-sm min-w-[75px] sm:min-w-[90px] justify-center"
        >
          {isExporting ? (
            <>
              <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>Сохранение</span>
            </>
          ) : (
            <>
              <span>Экспорт</span>
              <span className="ml-0.5 text-black/60">›</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
