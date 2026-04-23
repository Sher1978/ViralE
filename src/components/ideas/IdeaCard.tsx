'use client';

import { TrendingUp, ArrowRight, Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface Idea {
  id: string;
  topic_title: string;
  rationale: string;
  viral_potential_score: number;
  status: 'new' | 'archived' | 'used';
  category?: string;
  created_at: string;
}

interface IdeaCardProps {
  idea: Idea;
  index: number;
  locale: string;
  isProcessing: boolean;
  onToggleArchive: (id: string, status: string) => void;
  onToScript: (topic: string) => void;
}

export default function IdeaCard({ 
  idea, 
  index, 
  locale, 
  isProcessing, 
  onToggleArchive, 
  onToScript 
}: IdeaCardProps) {
  const t = useTranslations('ideas');

  return (
    <div
      className="card-idea p-5 space-y-4 animate-slide-up opacity-0"
      style={{
        animationFillMode: 'forwards',
        animationDelay: `${0.05 + index * 0.07}s`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              {t('tagTrend')}
            </span>
            <span className="text-[8px] text-white/20 font-mono">
              {new Date(idea.created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h3 className="text-base font-bold text-white leading-tight">
            &ldquo;{idea.topic_title}&rdquo;
          </h3>
        </div>

        <div className="flex flex-col items-center shrink-0">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            {idea.viral_potential_score}%
          </div>
          <span className="text-[7px] font-black uppercase tracking-tighter text-amber-500/50 mt-1">Viral Score</span>
        </div>
      </div>

      <p className="text-xs text-white/50 leading-relaxed italic">
        &ldquo;{idea.rationale}&rdquo;
      </p>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => onToggleArchive(idea.id, idea.status)}
          disabled={isProcessing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:bg-white/10 hover:text-white/80 transition-all text-[10px] font-bold uppercase tracking-widest"
        >
          {isProcessing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : idea.status === 'archived' ? (
            <BookmarkCheck className="w-3 h-3 text-amber-400" />
          ) : (
            <Bookmark className="w-3 h-3" />
          )}
          {idea.status === 'archived' ? t('btnSaved') : t('btnSave')}
        </button>

        <button
          onClick={() => onToScript(idea.topic_title)}
          className="group flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:from-emerald-500/20 hover:to-emerald-500/30 hover:border-emerald-500/50 transition-all font-black text-[10px] uppercase tracking-wider"
        >
          {t('btnScript')}
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-black flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
}
