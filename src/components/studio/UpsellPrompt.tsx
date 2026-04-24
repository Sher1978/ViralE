'use client';

import React from 'react';
import { Sparkles, Brain, Award, X } from 'lucide-react';

interface UpsellPromptProps {
  type: 'strategist' | 'broll' | 'premium';
  title: string;
  message: string;
  onClose?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

const UpsellPrompt: React.FC<UpsellPromptProps> = ({
  type,
  title,
  message,
  onClose,
  actionLabel,
  onAction
}) => {
  const getIcon = () => {
    switch (type) {
      case 'strategist': return <Brain className="text-yellow-400" size={20} />;
      case 'broll': return <Sparkles className="text-purple-400" size={20} />;
      default: return <Award className="text-blue-400" size={20} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'strategist': return 'border-yellow-500/20';
      case 'broll': return 'border-purple-500/20';
      default: return 'border-blue-500/20';
    }
  };

  const getBgGlow = () => {
    switch (type) {
      case 'strategist': return 'bg-yellow-500/5';
      case 'broll': return 'bg-purple-500/5';
      default: return 'bg-blue-500/5';
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl border ${getBorderColor()} ${getBgGlow()} p-5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2`}>
      <div className="flex gap-4">
        <div className="flex-none w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          {getIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-black uppercase tracking-widest text-white">{title}</h4>
            {onClose && (
              <button 
                onClick={onClose}
                className="p-1 hover:bg-white/5 rounded-lg text-white/20 hover:text-white/60 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <p className="text-[10px] font-medium text-white/40 leading-relaxed max-w-sm uppercase tracking-wider">
            {message}
          </p>
          {actionLabel && (
            <button 
              onClick={onAction}
              className="mt-3 text-[9px] font-black uppercase tracking-widest text-white hover:text-purple-400 transition-colors flex items-center gap-2 group"
            >
              {actionLabel}
              <div className="w-1 h-1 rounded-full bg-white group-hover:bg-purple-400 transition-colors" />
            </button>
          )}
        </div>
      </div>
      
      {/* Premium decorative line */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-purple-500/40 to-transparent" />
    </div>
  );
};

export default UpsellPrompt;
