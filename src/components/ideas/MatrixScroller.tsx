'use client';

import { Idea } from '@/components/ideas/IdeaCard';
import IdeaCard from '@/components/ideas/IdeaCard';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';

interface MatrixScrollerProps {
  title: string;
  subtitle?: string;
  ideas: Idea[];
  onToScript: (topic: string) => void;
  onToggleArchive: (id: string, status: string) => void;
}

export default function MatrixScroller({ title, subtitle, ideas, onToScript, onToggleArchive }: MatrixScrollerProps) {
  const locale = useLocale();

  const isEmpty = !ideas || ideas.length === 0;

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between px-1">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black uppercase tracking-tighter text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">
              {subtitle}
            </p>
          )}
        </div>
        {!isEmpty && (
          <button className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors">
            {locale === 'ru' ? 'ВСЕ' : 'ALL'}
            <ChevronRight size={12} />
          </button>
        )}
      </div>

      <div className="relative group">
        {/* Horizontal Scroll Container */}
        <div className="flex gap-4 overflow-x-auto pb-4 px-1 no-scrollbar snap-x">
          {isEmpty ? (
            // Skeleton state
            [...Array(3)].map((_, i) => (
              <div key={i} className="shrink-0 w-[280px] h-[180px] rounded-[2rem] border border-white/5 bg-white/[0.02] animate-pulse">
                <div className="p-6 space-y-4">
                  <div className="w-1/2 h-2 bg-white/5 rounded-full" />
                  <div className="w-full h-12 bg-white/5 rounded-2xl" />
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/5" />
                    <div className="w-8 h-8 rounded-full bg-white/5" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            ideas.map((idea, i) => (
              <div key={idea.id || i} className="shrink-0 w-[280px] snap-start">
                <IdeaCard
                  idea={idea}
                  index={i}
                  locale={locale}
                  onToScript={onToScript}
                  onToggleArchive={onToggleArchive}
                  isProcessing={false}
                />
              </div>
            ))
          )}
          
          {/* Last Spacer */}
          <div className="shrink-0 w-4" />
        </div>
        
        {/* Faders */}
        <div className="absolute top-0 right-0 bottom-4 w-12 bg-gradient-to-l from-[#020617] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
