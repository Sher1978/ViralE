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

  const getCategoryTheme = (category?: string) => {
    const themes: Record<string, { img: string, color: string }> = {
      "Hooks": { img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f", color: "emerald" },
      "Roles": { img: "https://images.unsplash.com/photo-1542281286-9e0a16bb7366", color: "amber" },
      "Awareness": { img: "https://images.unsplash.com/photo-1509023467864-1ecbb3f6354b", color: "cyan" },
      "Problem": { img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c", color: "red" },
      "Solution": { img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa", color: "emerald" },
      "Loyalty": { img: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4", color: "blue" },
      "Fast Sales": { img: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400", color: "amber" },
      "Myths": { img: "https://images.unsplash.com/photo-1534447677768-be436bb09401", color: "lime" },
      "Comparison": { img: "https://images.unsplash.com/photo-1557683316-973673baf926", color: "orange" },
      "Educational": { img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8", color: "blue" },
      "Case Study": { img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f", color: "cyan" },
      "Trends": { img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b", color: "fuchsia" },
      "Lifestyle": { img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c", color: "rose" },
      "Future": { img: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e", color: "indigo" }
    };
    return themes[category || ""] || { img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe", color: "slate" };
  };

  const theme = getCategoryTheme(idea.category);

  return (
    <div
      className="card-idea p-5 space-y-4 animate-slide-up opacity-0 group/card relative overflow-hidden border border-white/5 rounded-2xl"
      style={{
        animationFillMode: 'forwards',
        animationDelay: `${0.05 + index * 0.07}s`,
      }}
    >
      {/* Background Image with Studio Grading */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img 
          src={theme.img + "?q=80&w=400&auto=format&fit=crop"} 
          className="w-full h-full object-cover opacity-30 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000" 
          alt="" 
        />
        <div className={`absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent`} />
        {/* Color Tint Tint Overlay */}
        <div className={`absolute inset-0 opacity-20 pointer-events-none bg-${theme.color}-500/20`} />
      </div>

      {/* Scanline Effect - Same as Studio */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,.25)_50%),linear-gradient(90deg,rgba(255,0,0,.06),rgba(0,255,0,.02),rgba(0,0,111,.06))] bg-[length:100%_4px,3px_100%] opacity-10" />

      <div 
        className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity cursor-pointer z-10" 
        onClick={() => onToScript(idea.topic_title)}
      />

      <div className="flex items-start justify-between gap-4 relative z-20 pointer-events-none">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className={`text-[7px] font-black uppercase tracking-[0.3em] px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/40`}>
              {idea.category || t('tagTrend')}
            </span>
            <span className="text-[7px] text-white/20 font-black uppercase tracking-widest">
              ID: {idea.id.substring(0, 5)}
            </span>
          </div>
          <h3 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-2xl">
            {idea.topic_title}
          </h3>
        </div>

        <div className="flex flex-col items-center shrink-0">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base bg-white/5 border border-white/10 text-white shadow-2xl backdrop-blur-md italic">
            {idea.viral_potential_score}
          </div>
          <span className="text-[6px] font-black uppercase tracking-tighter text-white/30 mt-1.5">Potential</span>
        </div>
      </div>

      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed relative z-20 pointer-events-none max-w-[80%]">
        {idea.rationale}
      </p>

      <div className="flex items-center justify-between pt-3 relative z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleArchive(idea.id, idea.status);
          }}
          disabled={isProcessing}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/30 hover:bg-white/10 hover:text-white/70 transition-all text-[9px] font-black uppercase tracking-widest"
        >
          {isProcessing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : idea.status === 'archived' ? (
            <BookmarkCheck className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <Bookmark className="w-3.5 h-3.5" />
          )}
          {idea.status === 'archived' ? t('btnSaved') : t('btnSave')}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToScript(idea.topic_title);
          }}
          className="group flex items-center gap-4 pl-5 pr-2 py-2 rounded-xl bg-white text-black hover:bg-emerald-500 hover:text-white transition-all font-black text-[9px] uppercase tracking-wider shadow-2xl"
        >
          {t('btnScript')}
          <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
}
