'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Sparkles, AlertTriangle, Cpu, HelpCircle, ArrowRight, Loader2 } from 'lucide-react';

export interface PreviewData {
  title: string;
  hook: string;
  reveal: string;
  meat: string;
  cta: string;
}

interface ScriptPreviewsProps {
  previews: Record<string, PreviewData>;
  locale: string;
  onSelect: (styleName: string, preview: PreviewData) => void;
  isLoading: boolean;
}

const STYLE_CONFIGS: Record<string, { color: string; bg: string; border: string; desc: { en: string; ru: string } }> = {
  controversial: {
    color: '#EF4444',
    bg: 'from-red-500/10 via-transparent to-red-500/5',
    border: 'border-red-500/20 hover:border-red-500/50',
    desc: { en: 'Attacking popular myths and breaking patterns.', ru: 'Разрушение популярных мифов и стереотипов.' }
  },
  edutainment: {
    color: '#3B82F6',
    bg: 'from-blue-500/10 via-transparent to-blue-500/5',
    border: 'border-blue-500/20 hover:border-blue-500/50',
    desc: { en: 'Fun + learning. High value through metaphors and irony.', ru: 'Обучение через юмор, метафоры и иронию.' }
  },
  evergreen: {
    color: '#10B981',
    bg: 'from-emerald-500/10 via-transparent to-emerald-500/5',
    border: 'border-emerald-500/20 hover:border-emerald-500/50',
    desc: { en: 'Calm and deep analysis of psychology or strategy.', ru: 'Спокойный, авторитетный разбор глубоких законов.' }
  },
  trends: {
    color: '#F59E0B',
    bg: 'from-amber-500/10 via-transparent to-amber-500/5',
    border: 'border-amber-500/20 hover:border-amber-500/50',
    desc: { en: 'Dynamic listicles connected to pop-culture.', ru: 'Динамичный список ценностей и разбор трендов.' }
  },
  detective: {
    color: '#06B6D4',
    bg: 'from-cyan-500/10 via-transparent to-cyan-500/5',
    border: 'border-cyan-500/20 hover:border-cyan-500/50',
    desc: { en: 'Mini-investigation conducted by an empathetic researcher.', ru: 'Мини-расследование от лица эмпатичного эксперта.' }
  },
  napkin_explainer: {
    color: '#A855F7',
    bg: 'from-purple-500/10 via-transparent to-purple-500/5',
    border: 'border-purple-500/20 hover:border-purple-500/50',
    desc: { en: 'Whiteboard animation structure using physical metaphors.', ru: 'Разбор на доске с использованием физических метафор.' }
  }
};

export function ScriptPreviews({ previews, locale, onSelect, isLoading }: ScriptPreviewsProps) {
  const styles = Object.keys(previews);
  const [clickedStyle, setClickedStyle] = useState<string | null>(null);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="text-center space-y-3 max-w-lg mx-auto">
        <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-widest text-white leading-tight">
          {locale === 'ru' ? 'Выберите концепцию видео' : 'Choose Video Concept'}
        </h2>
        <p className="text-xs text-white/50 uppercase tracking-widest font-bold">
          {locale === 'ru' 
            ? 'ИИ подготовил 6 unique направлений подачи. Выберите наиболее подходящий вариант для полной генерации.'
            : 'AI prepared 6 unique presentation styles. Choose the best fit to write the full script.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {styles.map((styleKey) => {
          const preview = previews[styleKey];
          const config = STYLE_CONFIGS[styleKey] || {
            color: '#A855F7',
            bg: 'from-purple-500/10 via-transparent to-purple-500/5',
            border: 'border-purple-500/20 hover:border-purple-500/50',
            desc: { en: 'Script presentation style.', ru: 'Стиль подачи сценария.' }
          };

          const isSelectedAndLoading = isLoading && clickedStyle === styleKey;

          return (
            <motion.div
              key={styleKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`p-6 rounded-[2.5rem] bg-[#0d0d16]/90 border ${config.border} backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden h-full shadow-2xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]`}
            >
              {/* Cinematic glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${config.bg} opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none`} />

              <div className="relative z-10 space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentcolor] animate-pulse"
                      style={{ backgroundColor: config.color, color: config.color }}
                    />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                      {styleKey.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-white uppercase italic tracking-tight group-hover:text-purple-300 transition-colors">
                    {preview.title || styleKey}
                  </h3>
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider leading-relaxed">
                    {locale === 'ru' ? config.desc.ru : config.desc.en}
                  </p>
                </div>

                {/* Preview segments breakdown */}
                <div className="space-y-4 py-2 flex-1 text-xs border-t border-white/5 mt-2">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-purple-400/50 uppercase tracking-widest block">
                      {locale === 'ru' ? 'ХУК' : 'HOOK'}
                    </span>
                    <p className="text-white/70 font-medium leading-relaxed italic line-clamp-2">
                      "{preview.hook}"
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-purple-400/50 uppercase tracking-widest block">
                      {locale === 'ru' ? 'РАСКРЫТИЕ' : 'REVEAL'}
                    </span>
                    <p className="text-white/70 font-medium leading-relaxed italic line-clamp-2">
                      {preview.reveal}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-purple-400/50 uppercase tracking-widest block">
                      {locale === 'ru' ? 'МЯСО' : 'MEAT'}
                    </span>
                    <p className="text-white/70 font-medium leading-relaxed italic line-clamp-2">
                      {preview.meat}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-purple-400/50 uppercase tracking-widest block">
                      {locale === 'ru' ? 'CTA' : 'CTA'}
                    </span>
                    <p className="text-white/70 font-medium leading-relaxed italic line-clamp-2">
                      {preview.cta}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setClickedStyle(styleKey);
                  onSelect(styleKey, preview);
                }}
                disabled={isLoading}
                className={`w-full mt-6 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2.5 relative overflow-hidden
                  ${isSelectedAndLoading 
                    ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 border-purple-400 text-white shadow-[0_0_30px_rgba(168,85,247,0.6)] animate-pulse scale-[1.02] opacity-100' 
                    : 'bg-white/5 border-white/10 hover:bg-white hover:text-black hover:border-transparent text-white active:scale-[0.98] hover:scale-[1.02] disabled:opacity-40'
                  }`}
              >
                {isSelectedAndLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white shrink-0" />
                    <span className="text-white font-black text-[11px] tracking-[0.2em] animate-pulse">
                      {locale === 'ru' ? 'СОЗДАЕМ СЦЕНАРИЙ...' : 'GENERATING SCRIPT...'}
                    </span>
                    <Sparkles size={16} className="animate-bounce text-yellow-300 shrink-0" />
                  </>
                ) : (
                  <>
                    {locale === 'ru' ? 'Выбрать этот сюжет' : 'Choose this plot'}
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
