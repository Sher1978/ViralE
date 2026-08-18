'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TrendingUp, Bookmark, Loader2, Sparkles, Dna, X, TrendingDown, Target, RefreshCw, AlertTriangle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/navigation';
import IdeaCard, { Idea } from '@/components/ideas/IdeaCard';
import DNABlock from '@/components/ideas/DNABlock';
import MatrixScroller from '@/components/ideas/MatrixScroller';
import TopicInput from '@/components/ideas/TopicInput';
import TurboLoadingOverlay from '@/components/ideas/TurboLoadingOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppData } from '@/components/providers/AppDataProvider';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { AppOnboardingTour } from '@/components/ui/AppOnboardingTour';
import { HelpCircle } from 'lucide-react';

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

  const { 
    profile,
    ideas: allNewIdeas, 
    archivedIdeas, 
    usedIdeas, 
    refreshIdeas, 
    loadingIdeas, 
    ideasError,
    clearIdeasError,
    updateProfile, 
    moveIdeaLocally, 
    markIdeaAsUsed, 
    dnaComplete: isDnaComplete, 
    loadingArchived, 
    loadingUsed 
  } = useAppData();

  const [activeTab, setActiveTab] = useState<'new' | 'archived' | 'used'>('new');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [showDnaEditor, setShowDnaEditor] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [turboLoadingTopic, setTurboLoadingTopic] = useState<string | null>(null);
  
  const [forcedLoading, setForcedLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setForcedLoading(false), 4000);
    const win = typeof globalThis !== 'undefined' ? (globalThis as any).window : null;
    if (win) {
      if (win.localStorage.getItem('hideWelcomeIdeas') === 'true') {
        setShowWelcome(false);
      }
      if (win.localStorage.getItem('hasCompletedAppTour_v1') !== 'true') {
        const tourTimer = setTimeout(() => setShowTour(true), 1200);
        return () => { clearTimeout(timer); clearTimeout(tourTimer); };
      }
    }
    return () => clearTimeout(timer);
  }, []);

  const handleDismissWelcome = () => {
    setShowWelcome(false);
    const win = typeof globalThis !== 'undefined' ? (globalThis as any).window : null;
    if (win) {
      win.localStorage.setItem('hideWelcomeIdeas', 'true');
    }
  };

  const sentinelRef = useRef<HTMLDivElement>(null);

  const ideas = activeTab === 'new' ? allNewIdeas : activeTab === 'archived' ? archivedIdeas : usedIdeas;
  const globalLoading = activeTab === 'new' ? loadingIdeas : activeTab === 'archived' ? loadingArchived : loadingUsed;

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

  const attemptedCategoriesRef = useRef<Set<string>>(new Set());

  const synthesizeNextCategory = useCallback(async () => {
    if (synthesisLoading || globalLoading || activeTab !== 'new') return;
    
    const nextCat = CATEGORIES.find(cat => 
      (!groupedIdeas[cat] || groupedIdeas[cat].length === 0) && !attemptedCategoriesRef.current.has(cat)
    );
    
    if (nextCat) {
      attemptedCategoriesRef.current.add(nextCat);
      setSynthesisLoading(true);
      try {
        await refreshIdeas('new', nextCat);
      } finally {
        setSynthesisLoading(false);
      }
    }
  }, [synthesisLoading, globalLoading, activeTab, groupedIdeas, refreshIdeas]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const Obs = typeof globalThis !== 'undefined' ? (globalThis as any).IntersectionObserver : null;
    if (!Obs) return;
    const observer = new Obs((entries: any[]) => {
      if (entries[0].isIntersecting) {
        synthesizeNextCategory();
      }
    }, { threshold: 0.1 });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [synthesizeNextCategory]);

  const handleToScript = async (content: string, rationale?: string, ideaId?: string) => {
    if (ideaId) {
      await markIdeaAsUsed(ideaId);
    }
    
    const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
    if (globalObj && typeof globalObj.document !== 'undefined') {
      globalObj.document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    }
    if (globalObj && typeof globalObj.window !== 'undefined') {
      globalObj.window.localStorage.setItem('NEXT_LOCALE', locale);
    }

    let finalContent = content;
    if (rationale && rationale.length > 3) {
      const cleanRationale = rationale.replace(/^\(.*\)\s*/, '');
      finalContent = `${content}\n\n${cleanRationale}`;
    }
    let url = `/app/projects/new/script?topic=${encodeURIComponent(finalContent)}&ideaTitle=${encodeURIComponent(content)}`;
    router.push(url);
  };

  const handleTurboToScript = async (content: string, rationale?: string, ideaId?: string) => {
    if (ideaId) {
      await markIdeaAsUsed(ideaId);
    }

    const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
    if (globalObj && typeof globalObj.document !== 'undefined') {
      globalObj.document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    }

    let finalContent = content;
    if (rationale && rationale.length > 3) {
      const cleanRationale = rationale.replace(/^\(.*\)\s*/, '');
      finalContent = `${content}\n\n${cleanRationale}`;
    }

    try {
      setTurboLoadingTopic(content);
      const res = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coreIdea: finalContent,
          mode: 'turbo',
          locale
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Turbo script generation failed');

      if (data.projectId) {
        router.push(`/app/projects/${data.projectId}/studio?tab=script_editor`);
      }
    } catch (err: any) {
      console.error('[IdeasPage] Turbo generation failed:', err);
      // Fallback to standard script lab if turbo API fails
      let url = `/app/projects/new/script?topic=${encodeURIComponent(finalContent)}&ideaTitle=${encodeURIComponent(content)}`;
      router.push(url);
    } finally {
      // Smooth fade out after router navigation initiates
      setTimeout(() => {
        setTurboLoadingTopic(null);
      }, 1500);
    }
  };

  const handleToggleArchive = async (ideaId: string, currentStatus: string) => {
    try {
      setProcessingId(ideaId);
      const newStatus = currentStatus === 'archived' ? 'new' : 'archived';
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

  const handleRegenerateMatrix = async () => {
    const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : {} as any;
    if (!globalObj.confirm?.(locale === 'ru' ? 'Вы уверены, что хотите полностью очистить текущую матрицу и сгенерировать новые идеи с нуля?' : 'Are you sure you want to clear the current matrix and generate new ideas from scratch?')) return;
    try {
      setSynthesisLoading(true);
      await fetch('/api/ideas/reset', { method: 'DELETE' });
      const win = typeof globalThis !== 'undefined' ? (globalThis as any).window : null;
      if (win) {
        win.location.reload();
      }
    } catch (err) {
      console.error('Failed to regenerate matrix:', err);
      setSynthesisLoading(false);
    }
  };

  const tabs = [
    { id: 'new', label: t('tabFeed') || 'Discover', icon: <TrendingUp className="w-3 h-3" /> },
    { id: 'archived', label: t('tabSaved') || 'Library', icon: <Bookmark className="w-3 h-3" /> },
    { id: 'used', label: locale === 'ru' ? 'Отработанные' : 'Spent Ideas', icon: <Target className="w-3 h-3" /> },
  ];

  return (
    <div className="flex flex-col gap-8 pt-[max(3rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-32 animate-fade-in relative">
      {/* Turbo Generation Fullscreen Overlay */}
      <TurboLoadingOverlay 
        isOpen={!!turboLoadingTopic} 
        topicTitle={turboLoadingTopic || ''} 
        locale={locale} 
      />

      {/* Onboarding Feature Tour Modal */}
      <AppOnboardingTour 
        isOpen={showTour} 
        onClose={() => setShowTour(false)} 
      />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
            {activeTab === 'new' 
              ? (locale === 'ru' ? 'ИНСАЙТЫ' : 'INSIGHTS') 
              : activeTab === 'archived'
              ? (locale === 'ru' ? 'СОХРАНЕННЫЕ' : 'SAVED')
              : (locale === 'ru' ? 'ОТРАБОТАННЫЕ' : 'SPENT IDEAS')}
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTour(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-all text-[9px] font-black uppercase tracking-widest shadow-md"
              title={locale === 'ru' ? 'Инструкция по приложению' : 'App Guide & Tour'}
            >
              <HelpCircle size={14} className="text-purple-400" />
              <span>{locale === 'ru' ? 'Инструкция' : 'Guide'}</span>
            </button>

            {isDnaComplete && activeTab === 'new' && (
              <div className="flex flex-col gap-2 items-end">
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
                <button 
                  onClick={handleRegenerateMatrix}
                  disabled={synthesisLoading}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400/80 hover:text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  <RefreshCw size={12} className={synthesisLoading ? "animate-spin" : ""} />
                  {synthesisLoading ? (locale === 'ru' ? 'Очистка...' : 'Clearing...') : (locale === 'ru' ? 'Сгенерировать новый контент' : 'Regenerate all content')}
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-black">
          {activeTab === 'new' 
            ? (locale === 'ru' ? 'СИНТЕЗ МАТРИЦЫ КОНТЕНТА' : 'CONTENT MATRIX SYNTHESIS') 
            : activeTab === 'archived'
            ? (locale === 'ru' ? 'ЗАПАС ЗОЛОТЫХ ИДЕЙ' : 'GOLDEN IDEAS VAULT')
            : (locale === 'ru' ? 'КАТАЛОГ ИСПОЛЬЗОВАННЫХ ИДЕЙ' : 'SPENT IDEAS CATALOGUE')}
        </p>
      </div>


      <AnimatePresence>

        {ideasError && (() => {
          const isDnaError = ideasError.includes('ДНК') || ideasError.includes('DNA') || ideasError.includes('brand DNA') || ideasError.includes('Brand DNA');
          if (isDnaError) {
            return (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 pointer-events-none" />
                <div className="flex items-center gap-3 z-10">
                  <Dna className="w-6 h-6 text-purple-400 shrink-0 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-300">
                      {locale === 'ru' ? 'ДНК Бренда не заполнена' : 'Brand DNA Not Configured'}
                    </h4>
                    <p className="text-xs text-purple-200/60 mt-0.5 max-w-xs">
                      {locale === 'ru'
                        ? 'Для генерации персонализированных идей необходимо заполнить профиль вашего бренда.'
                        : 'To generate personalized ideas, please complete your brand profile.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 z-10">
                  <button
                    onClick={() => {
                      clearIdeasError();
                      router.push('/app/onboarding' as any);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Dna size={12} />
                    {locale === 'ru' ? 'Заполнить ДНК' : 'Configure DNA'}
                  </button>
                  <button onClick={clearIdeasError} className="p-1 hover:bg-white/10 rounded-lg text-purple-400">
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            );
          }
          return (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-red-200 shadow-xl relative overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-300">
                    {locale === 'ru' ? 'Ошибка генерации идей' : 'Idea Generation Error'}
                  </h4>
                  <p className="text-xs text-red-200/80 mt-0.5">{ideasError}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    clearIdeasError();
                    refreshIdeas('new', undefined, true);
                  }}
                  disabled={loadingIdeas}
                  className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-100 text-xs font-bold transition-all border border-red-500/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={loadingIdeas ? "animate-spin" : ""} />
                  {loadingIdeas ? (locale === 'ru' ? 'Генерация...' : 'Generating...') : (locale === 'ru' ? 'Повторить' : 'Retry')}
                </button>
                <button onClick={clearIdeasError} className="p-1 hover:bg-white/10 rounded-lg text-red-400">
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          );
        })()}

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

      {(activeTab === 'new' || activeTab === 'archived' || activeTab === 'used') && (
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
            <DNABlock onComplete={() => { setShowDnaEditor(false); const win = typeof globalThis !== 'undefined' ? (globalThis as any).window : null; if (win) win.location.reload(); }} />
          </div>
        ) : activeTab === 'new' ? (
          <>
            {/* 🎬 CINEMATIC SPLASH OVERLAY - ONLY FOR COLD LOAD */}
            <AnimatePresence>
              {forcedLoading && ideas.length === 0 && (
                <motion.div 
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center overflow-hidden"
                >
                    <div className="absolute inset-0 z-0 scale-105">
                      <img 
                        src="/splash_bg.png" 
                        className="w-full h-full object-cover opacity-60 animate-ken-burns" 
                        alt="Splash Background" 
                        onError={(e) => ((e.currentTarget as any).style.display = 'none')}
                      />
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    </div>
                    
                    <div className="relative z-10 space-y-6 mb-12 px-6">
                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400 drop-shadow-lg"
                      >
                        Viral Engine Digital Core
                      </motion.p>
                      <motion.h2 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl sm:text-6xl font-black italic uppercase text-white tracking-tighter leading-[0.85] max-w-2xl mx-auto drop-shadow-2xl"
                      >
                        {landingT('title')} <span className="text-purple-500 [text-shadow:0_0_30px_rgba(168,85,247,0.5)]">{landingT('titleAccent')}</span>
                      </motion.h2>
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-[10px] font-bold text-white/50 uppercase tracking-[0.3em] max-w-sm mx-auto drop-shadow-lg"
                      >
                        {landingT('subtitle')}
                      </motion.p>
                    </div>

                    <div className="relative z-10 w-24 h-24 mb-12">
                      <div className="absolute inset-0 border-2 border-purple-500/10 rounded-full" />
                      <div className="absolute inset-0 border-2 border-t-purple-500 rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <Sparkles className="w-10 h-10 text-purple-400 animate-pulse" />
                      </div>
                    </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Matrix Scroller Content */}
            <div className="space-y-12 min-h-screen">
              {displayCategories.map((cat) => (
                <MatrixScroller
                  key={cat}
                  title={CATEGORY_LABELS[cat]?.[locale as 'en'|'ru'] || cat}
                  subtitle={locale === 'ru' ? 'Стратегические инсайты' : 'Strategic Insights'}
                  ideas={groupedIdeas[cat] || []}
                  onToScript={(topic, rationale, ideaId) => handleToScript(topic, rationale, ideaId)}
                  onTurboScript={(topic, rationale, ideaId) => handleTurboToScript(topic, rationale, ideaId)}
                  onToggleArchive={handleToggleArchive}
                  onRefresh={(force) => refreshIdeas('new', cat, force)}
                />
              ))}
              
              <div ref={sentinelRef} className="h-40 w-full flex items-center justify-center pb-20">
                {synthesisLoading && (
                  <div className="flex flex-col items-center gap-3 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                    <p className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-black italic">
                      {locale === 'ru' ? 'СИНТЕЗИРУЮ СЛЕДУЮЩИЙ СЛОЙ...' : 'SYNTHESIZING NEXT LAYER...'}
                    </p>
                  </div>
                )}
                {!synthesisLoading && ideas.length < 20 && (
                   <button 
                    onClick={synthesizeNextCategory}
                    className="px-10 py-5 rounded-[2rem] bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-white hover:border-white/30 transition-all active:scale-95"
                   >
                      {locale === 'ru' ? 'СИНТЕЗИРОВАТЬ ЕЩЕ' : 'SYNTHESIZE MORE'}
                   </button>
                )}
              </div>
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
                  {activeTab === 'used' 
                    ? (locale === 'ru' ? 'Использованных идей пока нет' : 'No spent ideas yet') 
                    : (locale === 'ru' ? 'Библиотека пуста' : 'Library is empty')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
