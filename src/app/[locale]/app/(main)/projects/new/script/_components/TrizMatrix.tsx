import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface TrizIdea {
  screen_name: string;
  idea_title: string;
  rationale: string;
}

interface TrizMatrixProps {
  ideas: TrizIdea[];
  locale: string;
  onSelect: (ideaText: string) => void;
  onBack: () => void;
}

export function sortTrizIdeas<T extends { screen_name?: string; level?: string }>(ideas: T[]): T[] {
  if (!Array.isArray(ideas) || ideas.length === 0) return ideas;

  const getRank = (idea: T): number => {
    const level = ((idea as any).screen_name || (idea as any).level || '').toLowerCase();
    
    // Check if System (and NOT Subsystem or Suprasystem)
    const isSystem = level.includes('система') && !level.includes('подсистема') && !level.includes('надсистема');
    const isEnglishSystem = level.includes('system') && !level.includes('sub') && !level.includes('supra');

    // 1. СИСТЕМА + НАСТОЯЩЕЕ (Rank 1)
    if ((isSystem || isEnglishSystem) && (level.includes('настоящее') || level.includes('present'))) {
      return 1;
    }

    // 2. СИСТЕМА (Прошлое, Будущее и остальные) (Ranks 2-4)
    if (isSystem || isEnglishSystem) {
      if (level.includes('прошлое') || level.includes('past')) return 2;
      if (level.includes('будущее') || level.includes('future')) return 3;
      return 4;
    }

    // 3. ПОДСИСТЕМА (Ranks 10-13)
    const isSub = level.includes('подсистема') || (level.includes('sub') && level.includes('system'));
    if (isSub) {
      if (level.includes('настоящее') || level.includes('present')) return 10;
      if (level.includes('прошлое') || level.includes('past')) return 11;
      if (level.includes('будущее') || level.includes('future')) return 12;
      return 13;
    }

    // 4. НАДСИСТЕМА (Ranks 20-23)
    const isSupra = level.includes('надсистема') || level.includes('над') || level.includes('supra');
    if (isSupra) {
      if (level.includes('настоящее') || level.includes('present')) return 20;
      if (level.includes('прошлое') || level.includes('past')) return 21;
      if (level.includes('будущее') || level.includes('future')) return 22;
      return 23;
    }

    return 99;
  };

  return [...ideas].sort((a, b) => getRank(a) - getRank(b));
}

export function TrizMatrix({ ideas, locale, onSelect, onBack }: TrizMatrixProps) {
  const [visibleCount, setVisibleCount] = useState(3);

  const sortedIdeas = sortTrizIdeas(ideas);
  const displayedIdeas = sortedIdeas.slice(0, visibleCount);

  return (
    <div className="space-y-6 animate-fade-in slide-in-from-bottom-4">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-black uppercase italic tracking-widest text-white">
          {locale === 'ru' ? 'Выберите фокус сценария' : 'Choose Your Script Focus'}
        </h3>
        <p className="text-xs text-white/50 uppercase tracking-widest font-bold">
          {locale === 'ru'
            ? `${Math.min(visibleCount, sortedIdeas.length)} наиболее актуальных направления ТРИЗ`
            : `${Math.min(visibleCount, sortedIdeas.length)} Most Relevant TRIZ Angles`}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayedIdeas.map((idea, idx) => (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: (idx % 3) * 0.1 }}
            key={idx}
            onClick={() => onSelect(`${idea.screen_name}: ${idea.idea_title} - ${idea.rationale}`)}
            className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-left group relative overflow-hidden flex flex-col h-full"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* System grid coordinate indicator (1-9) */}
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-purple-500/30 group-hover:bg-purple-500/20 transition-all">
              <span className="text-[10px] font-black text-white/30 group-hover:text-purple-400">{idx + 1}</span>
            </div>

            <div className="relative z-10 space-y-3 flex-1 flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 border border-purple-500/30 bg-purple-500/10 px-2 py-1 rounded-full w-fit">
                {idea.screen_name}
              </span>
              <h4 className="text-sm font-bold text-white leading-tight mt-2">
                {idea.idea_title}
              </h4>
              <p className="text-[10px] text-white/60 font-medium leading-relaxed flex-1 mt-2 border-t border-white/5 pt-3">
                {idea.rationale}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
      {visibleCount < sortedIdeas.length && visibleCount < 9 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setVisibleCount(prev => prev + 3)}
            className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 text-xs font-bold uppercase tracking-widest text-white/80 hover:text-white transition-all shadow-md active:scale-95"
          >
            {locale === 'ru' ? 'Еще 3' : 'More 3'}
          </button>
        </div>
      )}
      <button
         onClick={onBack}
         className="w-full py-4 text-xs text-white/40 uppercase tracking-widest font-black hover:text-white transition-colors border border-transparent hover:border-white/10 rounded-2xl hover:bg-white/5"
      >
         {locale === 'ru' ? '← Назад' : '← Back'}
      </button>
    </div>
  );
}
