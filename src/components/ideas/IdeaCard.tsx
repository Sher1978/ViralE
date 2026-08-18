'use client';
import { useState } from 'react';
import { Star, ArrowRight, Loader2, Sparkles, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

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
  onToScript: (topic: string, rationale?: string, ideaId?: string) => void;
  onTurboScript?: (topic: string, rationale?: string, ideaId?: string) => void;
}

export default function IdeaCard({ 
  idea, 
  index, 
  locale, 
  isProcessing, 
  onToggleArchive, 
  onToScript,
  onTurboScript
}: IdeaCardProps) {
  const t = useTranslations('ideas');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isTurboing, setIsTurboing] = useState(false);

  const handleTransfer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTransferring || isTurboing) return;
    
    setIsTransferring(true);
    
    // Play light premium haptics if supported
    const win = (globalThis as any).window;
    if (win && win.navigator?.vibrate) {
      win.navigator.vibrate([45, 30, 45]);
    }
    
    // Animate beautifully before navigating
    await new Promise(resolve => setTimeout(resolve, 800));
    
    onToScript(idea.topic_title, idea.rationale, idea.id);
  };

  const handleTurbo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTransferring || isTurboing) return;
    
    setIsTurboing(true);
    
    const win = (globalThis as any).window;
    if (win && win.navigator?.vibrate) {
      win.navigator.vibrate([70, 40, 70]);
    }
    
    if (onTurboScript) {
      onTurboScript(idea.topic_title, idea.rationale, idea.id);
    } else {
      onToScript(idea.topic_title, idea.rationale, idea.id);
    }
  };

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
  const score = idea.viral_potential_score;
  
  const getScoreStyle = (s: number) => {
    if (s >= 95) return { border: 'border-amber-500/40', glow: 'shadow-[0_0_20px_-2px_rgba(245,158,11,0.3)]', text: 'text-amber-400', label: 'ELITE' };
    if (s >= 90) return { border: 'border-purple-500/40', glow: 'shadow-[0_0_20px_-2px_rgba(168,85,247,0.3)]', text: 'text-purple-400', label: 'HIGH' };
    return { border: 'border-white/10', glow: 'shadow-none', text: 'text-white/60', label: 'MID' };
  };

  const scoreStyle = getScoreStyle(score);

  return (
    <div
      className={`card-idea p-6 space-y-4 animate-slide-up opacity-0 group/card relative overflow-visible border ${scoreStyle.border} ${scoreStyle.glow} rounded-[2rem] transition-all duration-500 ${
        isTransferring 
          ? 'scale-[0.98] border-purple-500/80 shadow-[0_0_30px_rgba(168,85,247,0.3)] bg-purple-950/10' 
          : 'hover:scale-[1.01]'
      }`}
      style={{
        animationFillMode: 'forwards',
        animationDelay: `${0.05 + index * 0.07}s`,
      }}
    >
      {/* Dynamic Over-the-Border Badge (Potential) */}
      <div className={`absolute -top-3 left-8 z-40 px-3 py-1.5 rounded-xl bg-black border ${scoreStyle.border} flex items-center gap-2 shadow-2xl scale-90 group-hover/card:scale-100 transition-transform`}>
        <Sparkles className={`w-3 h-3 ${scoreStyle.text}`} />
        <span className={`text-[10px] font-black italic ${scoreStyle.text} tracking-tighter`}>{score}%</span>
        <div className="w-[1px] h-3 bg-white/10 mx-1" />
        <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">{scoreStyle.label}</span>
      </div>

      {/* Background Image with Studio Grading */}
      <div className="absolute inset-0 z-0 overflow-hidden rounded-[2rem]">
        <img 
          src={theme.img + "?q=80&w=400&auto=format&fit=crop"} 
          className="w-full h-full object-cover opacity-20 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000" 
          alt="" 
        />
        <div className={`absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent`} />
        {/* Color Tint Tint Overlay */}
        <div className={`absolute inset-0 opacity-10 pointer-events-none bg-${theme.color}-500/20`} />
      </div>

      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,.25)_50%),linear-gradient(90deg,rgba(255,0,0,.06),rgba(0,255,0,.02),rgba(0,0,111,.06))] bg-[length:100%_4px,3px_100%] opacity-10 rounded-[2rem]" />

      {/* Action: Save/Star (Top Right) - Increased Z and added Haptics */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const win = (globalThis as any).window;
          if (win && win.navigator?.vibrate) win.navigator.vibrate(50);
          onToggleArchive(idea.id, idea.status);
        }}
        disabled={isProcessing}
        className="absolute top-5 right-5 w-10 h-10 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all group/star shadow-2xl z-50 pointer-events-auto"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
        ) : (
          <Star 
            className={`w-4 h-4 transition-all duration-300 ${
              idea.status === 'archived' 
                ? 'text-amber-400 fill-amber-400 scale-110 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]' 
                : 'text-white/20 group-hover/star:text-white/60 group-hover/star:scale-110'
            }`} 
          />
        )}
      </button>

      {/* Invisible overlay for tap-to-script */}
      <div 
        className="absolute inset-0 cursor-pointer z-10 rounded-[2rem]" 
        onClick={handleTransfer}
      />

      {/* Content Header */}
      <div className="flex flex-col gap-3 relative z-20 pointer-events-none pr-12">
        <div className="flex items-center gap-2">
          <span className={`text-[7px] font-black uppercase tracking-[0.3em] px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-white/40 drop-shadow-sm`}>
            {idea.category || t('tagTrend')}
          </span>
        </div>
        <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-[0.95] drop-shadow-2xl max-w-[280px]">
          {idea.topic_title}
        </h3>
      </div>

      <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] leading-relaxed relative z-20 pointer-events-none max-w-[90%] line-clamp-3">
        {idea.rationale}
      </p>

      {/* Actions: Equal size 50/50 responsive layout */}
      <div className="grid grid-cols-2 gap-2.5 pt-2 relative z-20">
        {/* Turbo Button (1-Click Automated Script) */}
        <motion.button
          onClick={handleTurbo}
          disabled={isTransferring || isTurboing}
          animate={isTurboing ? {
            scale: [1, 0.95, 1.05],
            boxShadow: [
              "0px 0px 20px rgba(245,158,11,0.4)",
              "0px 0px 35px rgba(245,158,11,0.8)",
              "0px 0px 45px rgba(245,158,11,1)"
            ]
          } : {}}
          transition={{ duration: 0.8, repeat: isTurboing ? Infinity : 0 }}
          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all duration-300 relative overflow-hidden border cursor-pointer select-none ${
            isTurboing
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-amber-300 shadow-lg shadow-amber-500/30'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-gradient-to-r hover:from-amber-500 hover:to-yellow-400 hover:text-black hover:scale-[1.02] active:scale-95'
          }`}
          title={locale === 'ru' ? 'Сгенерировать готовый сценарий в 1 клик' : 'Generate full script in 1 click'}
        >
          {isTurboing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          ) : (
            <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:text-black fill-current shrink-0" />
          )}
          <span className="truncate">
            {isTurboing 
              ? (locale === 'ru' ? 'ТУРБО...' : 'TURBO...') 
              : (locale === 'ru' ? '⚡ ТУРБО' : '⚡ TURBO')}
          </span>
        </motion.button>

        {/* Step-by-Step Script Button */}
        <motion.button
          onClick={handleTransfer}
          disabled={isTransferring || isTurboing}
          animate={isTransferring ? {
            scale: [1, 0.9, 1.05],
            boxShadow: [
              "0px 10px 30px -10px rgba(168,85,247,0.3)",
              "0px 0px 40px rgba(168,85,247,0.8)",
              "0px 0px 50px rgba(168,85,247,1)"
            ]
          } : {}}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all duration-300 relative overflow-hidden border cursor-pointer select-none ${
            isTransferring 
              ? 'bg-purple-600 text-white border-purple-400/50 shadow-lg shadow-purple-500/30' 
              : 'bg-white text-black border-white hover:bg-purple-600 hover:text-white hover:border-purple-500 hover:scale-[1.02] active:scale-95'
          }`}
        >
          {isTransferring ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-white" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="truncate">
            {isTransferring 
              ? (locale === 'ru' ? 'ПЕРЕНОС...' : 'ROUTING...') 
              : t('btnScript')}
          </span>
        </motion.button>
      </div>
    </div>
  );
}
