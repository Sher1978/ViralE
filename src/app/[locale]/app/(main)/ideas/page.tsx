'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TrendingUp, Bookmark, Loader2, Sparkles, Dna, X, TrendingDown, Target } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/navigation';
import IdeaCard, { Idea } from '@/components/ideas/IdeaCard';
import DNABlock from '@/components/ideas/DNABlock';
import MatrixScroller from '@/components/ideas/MatrixScroller';
import TopicInput from '@/components/ideas/TopicInput';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppData } from '@/components/providers/AppDataProvider';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

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
  const landingT = useTranslations('landing');
  const locale = useLocale();
  const router = useRouter();

  const { ideas: allNewIdeas, archivedIdeas, refreshIdeas, loadingIdeas, updateProfile, moveIdeaLocally, dnaComplete: isDnaComplete, loadingArchived } = useAppData();

  const [activeTab, setActiveTab] = useState<'new' | 'archived'>('new');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [showDnaEditor, setShowDnaEditor] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  
  const [forcedLoading, setForcedLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setForcedLoading(false), 4000);
    if (typeof window !== 'undefined' && localStorage.getItem('hideWelcomeIdeas') === 'true') {
      setShowWelcome(false);
    }
    return () => clearTimeout(timer);
  }, []);

  const handleDismissWelcome = () => {
    setShowWelcome(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hideWelcomeIdeas', 'true');
    }
  };
  
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

  const handleToScript = (content: string, rationale?: string) => {
    let finalContent = content;
    if (rationale && rationale.length > 5 && !rationale.includes('(')) {
      finalContent = `${content}: ${rationale}`;
    }
    let url = `/app/projects/new/script?topic=${encodeURIComponent(finalContent)}`;
    router.push(url);
  };

  const handleToggleArchive = async (ideaId: string, currentStatus: string) => {
    try {
      setProcessingId(ideaId);
      const newStatus = currentStatus === 'new' ? 'archived' : 'new';
      moveIdeaLocally(ideaId, currentStatus, newStatus);
      const res = await fetch('/api/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, status: newStatus }),
      });
      if (!res.ok) moveIdeaLocally(ideaId, newStatus, currentStatus);
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
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
            {activeTab === 'new' ? (locale === 'ru' ? 'ИНСАЙТЫ' : 'INSIGHTS') : (locale === 'ru' ? 'БИБЛИОТЕКА' : 'LIBRARY')}
          </h1>
          {isDnaComplete && activeTab === 'new' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowDnaEditor(!showDnaEditor)}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-purple-400 hover:border-purple-500/30 transition-all text-[9px] font-black uppercase tracking-widest"
              >
                <Dna size={14} className={showDnaEditor ? "text-purple-400 animate-pulse" : ""} />
                {showDnaEditor ? (locale === 'ru' ? 'Скрыть ДНК' : 'Hide DNA') : (locale === 'ru' ? 'Настроить ДНК' : 'Tune DNA')}
              </button>
              <InfoTooltip content={locale === 'ru' ? "Обновите ДНК для точности ИИ" : "Update DNA for AI accuracy"} />
            </div>
          )}
        </div>
        <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-black">
          {activeTab === 'new' ? (locale === 'ru' ? 'СИНТЕЗ МАТРИЦЫ КОНТЕНТА' : 'CONTENT MATRIX SYNTHESIS') : (locale === 'ru' ? 'ЗАПАС ЗОЛОТЫХ ИДЕЙ' : 'GOLDEN IDEAS VAULT')}
        </p>
      </div>

      <AnimatePresence>
        {activeTab === 'new' && showWelcome && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, scale: 0.95 }} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4 text-white/70 shadow-lg relative group overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-cyan-500/5 pointer-events-none" />
             <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
             <div className="flex-1 pr-6 text-[11px] font-medium leading-relaxed">
                {locale === 'ru' ? "Добро пожаловать в Инсайты. ИИ постоянно анализирует тренды." : "Welcome to Insights. AI scans trends."}
             </div>
             <button onClick={handleDismissWelcome} className="absolute top-3 right-3 text-white/20 hover:text-white/60 p-1"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {(activeTab === 'new' || activeTab === 'archived') && (
        <div className="relative z-10 w-full max-w-xl">
          <TopicInput onLaunch={(topic) => handleToScript(topic)} />
        </div>
      )}

      <div className="flex border-b border-white/5 gap-6">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'text-white' : 'text-white/20 hover:text-white/40'}`}>
            {tab.icon} {tab.label}
            {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />}
          </button>
        ))}
      </div>

      <div className="relative space-y-10">
        {activeTab === 'new' && (!isDnaComplete || showDnaEditor) ? (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <DNABlock onComplete={() => { setShowDnaEditor(false); window.location.reload(); }} />
          </div>
        ) : activeTab === 'new' ? (
          <>
            {(globalLoading || forcedLoading) && ideas.length === 0 ? (
               <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center animate-fade-in overflow-hidden">
                  <div className="absolute inset-0 z-0">
                    <img src="/cyberpunk_alley_integrated_text_banner_1777280603399.png" className="w-full h-full object-cover opacity-60 animate-ken-burns scale-110" alt="Splash Background" />
                    <div className="absolute inset-0 bg-[#050508]/60 backdrop-blur-md" />
                  </div>
                  <div className="relative z-10 space-y-4 mb-12 px-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Viral Engine Digital Core</p>
                    <h2 className="text-2xl sm:text-4xl font-black italic uppercase text-white tracking-tighter leading-[0.9] max-w-lg mx-auto">
                      {landingT('title')} <span className="text-purple-500">{landingT('titleAccent')}</span>
                    </h2>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest max-w-xs mx-auto">{landingT('subtitle')}</p>
                  </div>
                  <div className="relative z-10 w-24 h-24 mb-12">
                    <div className="absolute inset-0 border-2 border-purple-500/10 rounded-full" />
                    <div className="absolute inset-0 border-2 border-t-purple-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-6 h-6 text-purple-400 animate-pulse" /></div>
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
                  onRefresh={(force) => refreshIdeas('new', cat, force)}
                />
              ))
            )}
            <div ref={sentinelRef} className="h-20 w-full flex items-center justify-center">
              {synthesisLoading && ideas.length > 0 && (
                <div className="flex flex-col items-center gap-2 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                  <p className="text-[8px] text-white/20 uppercase tracking-[0.3em] font-black">{locale === 'ru' ? 'СИНТЕЗ...' : 'SYNTHESIZING...'}</p>
                </div>
              )}
            </div>
          </>
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
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img src="/cyberpunk_alley_center_crop_vertical_1777280456497.png" className="w-full h-full object-cover opacity-10 animate-ken-burns scale-125 saturate-0" alt="Page Background" />
        <div className="absolute inset-0 bg-[#050508]/80 backdrop-blur-[100px]" />
      </div>
    </div>
  );
}
