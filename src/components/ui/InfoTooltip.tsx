import { HelpCircle } from 'lucide-react';
import React from 'react';

interface InfoTooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  size?: number;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  iconClassName?: string;
}

export function InfoTooltip({ 
  content, 
  children, 
  size = 14, 
  className = '', 
  position = 'top',
  iconClassName = "text-white/30 hover:text-white/60"
}: InfoTooltipProps) {
  const positioning = {
    top: 'bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2',
    bottom: 'top-[calc(100%+8px)] left-1/2 -translate-x-1/2',
    left: 'right-[calc(100%+8px)] top-1/2 -translate-y-1/2',
    right: 'left-[calc(100%+8px)] top-1/2 -translate-y-1/2'
  };

  return (
    <div className={`relative group inline-flex items-center justify-center ${className}`}>
      {children || <HelpCircle size={size} className={`transition-colors cursor-help ${iconClassName}`} />}
      
      <div className={`absolute z-50 invisible opacity-0 translate-y-1 group-hover:translate-y-0 group-hover:visible group-hover:opacity-100 transition-all duration-300 ${positioning[position]} w-max max-w-[200px] sm:max-w-[260px] p-2.5 sm:p-3 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] pointer-events-none`}>
        <p className="text-[9px] sm:text-[10px] text-white/80 leading-relaxed font-medium">
          {content}
        </p>
      </div>
    </div>
  );
}
