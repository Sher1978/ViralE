'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TrendingUp, Bookmark, Loader2, History, Sparkles, Lock, Dna } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/navigation';
import IdeaCard, { Idea } from '@/components/ideas/IdeaCard';
import DNABlock from '@/components/ideas/DNABlock';
import MatrixScroller from '@/components/ideas/MatrixScroller';
import TopicInput from '@/components/ideas/TopicInput';
import { motion } from 'framer-motion';
import { useAppData } from '@/components/providers/AppDataProvider';
import { v4 as uuidv4 } from 'uuid';

const CATEGORY_LABELS: Record<string, { en: string, ru: string }> = {
  "Hooks": { en: "Virality Hooks", ru: "Крючки виральности" },
  "Roles": { en: "Persona Masks", ru: "Маски личности" },
  "Awareness": { en: "Warming Cold Leads", ru: "Прогрев холодных" },
  "Problem": { en: "Deep Pain Mirror", ru: "Зеркало болей" },
  "Solution": { en: "Solution Proofs", ru: "Доказательства решения" },
  "Loyalty": { en: "Fan Club & Loyalty", ru: "Клуб фанатов и Лояльность" },
  "Fast Sales": { en: "Turbo Sales Today", ru: "Турбо-продажи сегодня" },
  "Controversial": { en: "Provocations & Hype", ru: "Провокации и Хайп" },
  "Evergreen": { en: "Golden Fund (Evergreen)", ru: "Золотой фонд (Вечное)" },
  "Trends": { en: "Trend Hunting", ru: "Охота на тренды" },
  "Lifestyle": { en: "Personal Brand 360", ru: "Личный бренд 360°" },
  "Future": { en: "Vision & Forecasts", ru: "Визионерство и Прогнозы" },
  "Myths": { en: "Myth Busting", ru: "Разоблачение мифов" },
  "Comparison": { en: "Product Battles", ru: "Битва продуктов" },
  "Educational": { en: "Expertise Vault", ru: "База экспертности" },
  "Case Study": { en: "Results Factory (Cases)", ru: "Завод результатов (Кейсы)" },
  "Backstage": { en: "System Backstage", ru: "Закулисье системы" },
  "Mistakes": { en: "Failure Breakdowns", ru: "Кладбище ошибок" },
  "POV": { en: "Point of View (POV)", ru: "Твоими глазами (POV)" },
  "Manifesto": { en: "Values & Manifesto", ru: "Манифест и Ценности" },
  "Blitz": { en: "Blitz Q&A", ru: "Блиц-ответы (Q&A)" },
  "Verdicts": { en: "Honest Verdicts", ru: "Честные вердикты" },
  "Humor": { en: "Intellectual Humor", ru: "Интеллектуальный юмор" },
  "Inside": { en: "Industry Insides", ru: "Инсайды индустрии" },
  "Results": { en: "Results (Before/After)", ru: "Результаты (До/После)" },
  "Toolkit": { en: "Master Toolkit", ru: "Тулкит мастера" }
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);

export default function IdeasPage() {
  const t = useTranslations('ideas');
  const locale = useLocale();
  const router = useRouter();

  const { 
    ideas: allNewIdeas, 
    archivedIdeas,
    loadingIdeas, 
    loadingArchived,
    dnaComplete: isDnaComplete,
    refreshIdeas 
  } = useAppData();

  const [activeTab, setActiveTab] = useState<'new' | 'archived'>('new');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  
  const sentinelRef = useRef<HTMLDivElement>(null);

  const ideas = activeTab === 'new' ? allNewIdeas : archivedIdeas;
  const globalLoading = activeTab === 'new' ? loadingIdeas : loadingArchived;

  const groupedIdeas = useMemo(() => {
    const groups: Record<string, Idea[]> = {};
    ideas.forEach(idea => {
      const cat = idea.category || (idea as any).metadata?.category || "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(idea);
    });
    return groups;
  }, [ideas]);

  const displayCategories = useMemo(() => {
    return [...CATEGORIES].sort((a, b) => {
      const countA = (groupedIdeas[a] || []).length;
      const countB = (groupedIdeas[b] || []).length;
      if (countA > 0 && countB === 0) return -1;
      if (countA === 0 && countB > 0) return 1;
      return 0;
    });
  }, [groupedIdeas]);

  const synthesizeNextCategory = useCallback(async () => {
    if (synthesisLoading || globalLoading || activeTab !== 'new') return;
    const nextCat = CATEGORIES.find(cat => !groupedIdeas[cat] || groupedIdeas[cat].length === 0);
    
    if (nextCat) {
      setSynthesisLoading(true);
      await refreshIdeas('new', nextCat);
      setSynthesisLoading(false);
    }
  }, [synthesisLoading, globalLoading, activeTab, groupedIdeas, refreshIdeas]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        synthesizeNextCategory();
      }
    }, { threshold: 0.1 });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [synthesizeNextCategory]);

  const handleToScript = (content: string, category?: string) => {
    let url = `/app/projects/new/script?topic=${encodeURIComponent(content)}`;
    if (category === "Hooks") url = `/app/projects/new/script?hook=${encodeURIComponent(content)}`;
    else if (category === "Roles") url = `/app/projects/new/script?role=${encodeURIComponent(content)}`;
    router.push(url);
  };

  const handleToggleArchive = async (ideaId: string, currentStatus: string) => {
    try {
      setProcessingId(ideaId);
      const newStatus = currentStatus === 'new' ? 'archived' : 'new';
      const res = await fetch('/api/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, status: newStatus }),
      });

      if (res.ok) {
        await refreshIdeas('new');
        await refreshIdeas('archived');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const tabs = [
    { id: 'new', label: t('tabFeed') || 'Discover', icon: <TrendingUp className="w-3 h-3" /> },
    { id: 'archived', label: t('tabSaved') || 'Library', icon: <Bookmark className="w-3 h-3" /> },
  ];

  return (
    <div className="flex flex-col gap-8 pb-32 animate-fade-in relative">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
          {activeTab === 'new' ? (locale === 'ru' ? 'ИНСАЙТЫ' : 'INSIGHTS') : (locale === 'ru' ? 'БИБЛИОТЕКА' : 'LIBRARY')}
        </h1>
        <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-black">
          {activeTab === 'new' ? (locale === 'ru' ? 'СИНТЕЗ МАТРИЦЫ КОНТЕНТА' : 'CONTENT MATRIX SYNTHESIS') : (locale === 'ru' ? 'ЗАПАС ЗОЛОТЫХ ИДЕЙ' : 'GOLDEN IDEAS VAULT')}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Quick Idea Gen */}
        <div className="flex-1">
          <TopicInput onGenerated={() => refreshIdeas('new')} />
        </div>
      </div>

      <div className="flex border-b border-white/5 gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${
              activeTab === tab.id ? 'text-white' : 'text-white/20 hover:text-white/40'
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
        ))}
      </div>

      <div className="relative space-y-10">
        {activeTab === 'new' ? (
          !isDnaComplete ? (
            <DNABlock onComplete={() => window.location.reload()} />
          ) : (
            <>
              {globalLoading && ideas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 animate-fade-in w-full">
                  <div className="relative w-32 h-32 mb-12">
                     <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-2 border-dashed border-purple-500/20 rounded-full" />
                     <motion.div animate={{ rotate: -360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} className="absolute inset-4 border border-dashed border-emerald-500/10 rounded-full" />
                     <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative">
                           <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full" />
                           <Dna className="w-16 h-16 text-purple-500 animate-pulse relative z-10" />
                        </div>
                     </div>
                  </div>
                  <div className="space-y-4 text-center">
                     <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">{locale === 'ru' ? 'Синтез Матрицы' : 'Matrix Synthesis'}</h3>
                     <div className="flex flex-col items-center gap-2">
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black animate-pulse">{locale === 'ru' ? 'Калибруем цифровой след...' : 'Calibrating digital shadow...'}</p>
                     </div>
                  </div>
                </div>
              ) : (
                displayCategories.map((cat) => (
                  <MatrixScroller
                    key={cat}
                    title={CATEGORY_LABELS[cat]?.[locale as 'en'|'ru'] || cat}
                    subtitle={locale === 'ru' ? 'Стратегические инсайты' : 'Strategic Insights'}
                    ideas={groupedIdeas[cat] || []}
                    onToScript={(topic) => handleToScript(topic, cat)}
                    onToggleArchive={handleToggleArchive}
                    onRefresh={() => refreshIdeas('new', cat)}
                  />
                ))
              )}
              
              <div ref={sentinelRef} className="h-20 w-full flex items-center justify-center">
                {synthesisLoading && ideas.length > 0 && (
                  <div className="flex flex-col items-center gap-2 animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                    <p className="text-[8px] text-white/20 uppercase tracking-[0.3em] font-black">{locale === 'ru' ? 'СИНТЕЗ СЛЕДУЮЩЕГО БЛОКА...' : 'SYNTHESIZING NEXT BATCH...'}</p>
                  </div>
                )}
              </div>
            </>
          )
        ) : (
          <div className="grid gap-4">
            {globalLoading && ideas.length === 0 ? (
               <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/10" /></div>
            ) : ideas.length > 0 ? (
              ideas.map((idea, i) => (
                <IdeaCard key={idea.id} idea={idea} index={i} locale={locale} isProcessing={processingId === idea.id} onToggleArchive={handleToggleArchive} onToScript={handleToScript} />
              ))
            ) : (
              <div className="text-center py-20 text-white/20 uppercase text-[10px] tracking-widest font-black">
                  {locale === 'ru' ? 'Библиотека пуста' : 'Library is empty'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
