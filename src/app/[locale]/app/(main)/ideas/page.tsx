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

const CATEGORIES = [
  "Hooks", "Roles", "Awareness", "Problem", "Solution", "Loyalty", "Fast Sales",
  "Controversial", "Evergreen", "Trends", "Lifestyle", "Future",
  "Myths", "Comparison", "Educational", "Case Study",
  "Backstage", "Mistakes", "POV", "Manifesto", "Blitz", "Verdicts", "Humor", "Inside", "Results", "Toolkit"
];

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

export default function IdeasPage() {
  const t = useTranslations('ideas');
  const locale = useLocale();
  const router = useRouter();

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'archived'>('new');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [dnaAnswers, setDnaAnswers] = useState<any>(null);

  const [isDnaComplete, setIsDnaComplete] = useState(false);

  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchDna = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/dna/answers');
      if (res.ok) {
        const data = await res.json();
        const answers = data?.answers || {};
        const hasFile = data?.hasFileStrategy || false;
        
        const interviewComplete = Object.values(answers).filter((v: any) => v && v.toString().length > 2).length >= 7;
        setIsDnaComplete(hasFile || interviewComplete);
      }
    } catch (e) {
      console.error('Failed to fetch DNA:', e);
    }
  }, []);

  const fetchIdeas = useCallback(async (status: string, category?: string) => {
    try {
      if (!category) setLoading(true);
      else setSynthesisLoading(true);
      
      const res = await fetch(`/api/ideas?locale=${locale}&status=${status}${category ? `&category=${category}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      if (category) {
        setIdeas(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(i => i.id));
          const filteredNew = data.filter((i: any) => !existingIds.has(i.id));
          return [...prev, ...filteredNew];
        });
      } else {
        setIdeas(data);
      }
    } catch (err) {
      console.error('Error fetching ideas:', err);
    } finally {
      setLoading(false);
      setSynthesisLoading(false);
    }
  }, [locale]);

  const groupedIdeas = useMemo(() => {
    const groups: Record<string, Idea[]> = {};
    ideas.forEach(idea => {
      const cat = idea.category || (idea as any).metadata?.category || "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(idea);
    });
    return groups;
  }, [ideas]);

  const synthesizeNextCategory = useCallback(async () => {
    if (synthesisLoading || loading || activeTab !== 'new') return;

    // Find first category in CATEGORIES that has 0 ideas in groupedIdeas
    const nextCat = CATEGORIES.find(cat => !groupedIdeas[cat] || groupedIdeas[cat].length === 0);
    
    if (nextCat) {
      console.log('Synthesizing next category:', nextCat);
      await fetchIdeas('new', nextCat);
    }
  }, [synthesisLoading, loading, activeTab, groupedIdeas, fetchIdeas]);

  useEffect(() => {
    fetchDna();
    fetchIdeas(activeTab);
  }, [fetchIdeas, activeTab, fetchDna]);

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
    
    if (category === "Hooks") {
      url = `/app/projects/new/script?hook=${encodeURIComponent(content)}`;
    } else if (category === "Roles") {
      url = `/app/projects/new/script?role=${encodeURIComponent(content)}`;
    }

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
        if (activeTab === 'archived' && newStatus === 'new') {
           setIdeas(prev => prev.filter(i => i.id !== ideaId));
        } else if (activeTab === 'new' && newStatus === 'archived') {
           setIdeas(prev => prev.filter(i => i.id !== ideaId));
        }
      }
    } catch (err) {
      console.error('Error updating idea status:', err);
    } finally {
      setProcessingId(null);
    }
  };



  const tabs = [
    { id: 'new', label: t('tabFeed') || 'Discover', icon: <TrendingUp className="w-3 h-3" /> },
    { id: 'archived', label: t('tabSaved') || 'Library', icon: <Bookmark className="w-3 h-3" /> },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25">
            {t('supertitle')}
          </p>
          {loading && <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />}
        </div>
        <h1
          className="text-4xl font-black tracking-tighter uppercase italic"
          style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
        >
          <span className="text-white">{activeTab === 'new' ? 'DISCOVER' : 'SAVED'}</span>{' '}
          <span className="text-emerald-500">LAB</span>
        </h1>
      </div>

      {/* DNA Integration */}
      {activeTab === 'new' && (
        <div className="space-y-6" data-dna-block>
          <DNABlock 
            onComplete={() => {
                fetchDna();
                fetchIdeas('new');
            }}
          />
          
          <TopicInput 
            onLaunch={handleToScript}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex p-1 rounded-2xl bg-white/[0.03] border border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-white/10 text-white shadow-lg' 
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollers or List */}
      <div className="relative space-y-10">
        {activeTab === 'new' ? (
          isDnaComplete ? (
            <>
              {(loading || synthesisLoading) && ideas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 animate-fade-in w-full">
                  <div className="relative w-32 h-32 mb-12">
                     <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-2 border-dashed border-purple-500/20 rounded-full"
                     />
                     <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-4 border border-dashed border-emerald-500/10 rounded-full"
                     />
                     <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative">
                           <motion.div
                              animate={{ 
                                 scale: [1, 1.2, 1],
                                 opacity: [0.3, 0.7, 0.3]
                              }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full"
                           />
                           <Dna className="w-16 h-16 text-purple-500 animate-pulse relative z-10" />
                        </div>
                     </div>
                  </div>
                  <div className="space-y-4 text-center">
                     <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">
                        {locale === 'ru' ? 'Синтез Матрицы' : 'Matrix Synthesis'}
                     </h3>
                     <div className="flex flex-col items-center gap-2">
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black animate-pulse">
                           {locale === 'ru' ? 'Калибруем цифровой след...' : 'Calibrating digital shadow...'}
                        </p>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                           <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                           <p className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest">
                             {locale === 'ru' ? 'СТРАТЕГИЯ: АКТИВНО' : 'STRATEGY: ACTIVE'}
                           </p>
                        </div>
                     </div>
                  </div>
                </div>
              ) : (
                CATEGORIES.map((cat) => (
                  <MatrixScroller
                    key={cat}
                    title={CATEGORY_LABELS[cat]?.[locale as 'en'|'ru'] || cat}
                    subtitle={locale === 'ru' ? 'Стратегические инсайты' : 'Strategic Insights'}
                    ideas={groupedIdeas[cat] || []}
                    onToScript={(topic) => handleToScript(topic, cat)}
                    onToggleArchive={handleToggleArchive}
                  />
                ))
              )}
              
              {/* Infinite Scroll Sentinel */}
              <div ref={sentinelRef} className="h-20 w-full flex items-center justify-center">
                {synthesisLoading && ideas.length > 0 && (
                  <div className="flex flex-col items-center gap-2 animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                    <p className="text-[8px] text-white/20 uppercase tracking-[0.3em] font-black">
                      {locale === 'ru' ? 'СИНТЕЗ СЛЕДУЮЩЕГО БЛОКА...' : 'SYNTHESIZING NEXT BATCH...'}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-12 text-center space-y-6">
               <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
               <div className="relative flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                     <Lock className="w-8 h-8 text-white/20" />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                     {locale === 'ru' ? 'Лента заблокирована' : 'Idea Feed Locked'}
                  </h2>
                  <p className="text-xs text-white/30 max-w-xs mx-auto leading-relaxed uppercase tracking-wider font-medium">
                     {locale === 'ru' 
                       ? 'Заполните ДНК стратегию, чтобы активировать персональную матрицу идей' 
                       : 'Calibrate your Creative DNA to activate the personalized idea matrix'}
                  </p>
                  <button 
                    onClick={() => {
                        const dnaBlock = document.querySelector('[data-dna-block]');
                        if (dnaBlock) dnaBlock.scrollIntoView({ behavior: 'smooth' });
                        // The DNABlock itself should handle the click if we make it auto-open or just guide them there.
                        // I'll make DNABlock accept a ref or just rely on the user clicking the top block.
                    }}
                    className="mt-4 px-8 py-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                  >
                     {locale === 'ru' ? 'Пройти калибровку' : 'Start Calibration'}
                  </button>
               </div>
            </div>
          )
        ) : (
          <div className="grid gap-4">
            {ideas.length > 0 ? (
              ideas.map((idea, i) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  index={i}
                  locale={locale}
                  isProcessing={processingId === idea.id}
                  onToggleArchive={handleToggleArchive}
                  onToScript={handleToScript}
                />
              ))
            ) : (
                <div className="text-center py-20 text-white/20 uppercase text-[10px] tracking-widest font-black">
                    {locale === 'ru' ? 'Библиотека пуста' : 'Library is empty'}
                </div>
            )}
          </div>
        )}
      </div>

      {loading && ideas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
          <div className="relative w-32 h-32 mb-12">
             <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-dashed border-purple-500/20 rounded-full"
             />
             <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 border border-dashed border-emerald-500/10 rounded-full"
             />
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                   <motion.div
                      animate={{ 
                         scale: [1, 1.2, 1],
                         opacity: [0.3, 0.7, 0.3]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full"
                   />
                   <Dna className="w-16 h-16 text-purple-500 animate-pulse relative z-10" />
                </div>
             </div>
          </div>
          <div className="space-y-4 text-center">
             <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">
                {locale === 'ru' ? 'Синтез Матрицы' : 'Matrix Synthesis'}
             </h3>
             <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black animate-pulse">
                   {locale === 'ru' ? 'Калибруем цифровой след...' : 'Calibrating digital shadow...'}
                </p>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                   <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                   <p className="text-[8px] text-emerald-500/60 uppercase tracking-[0.2em] font-black">
                      {locale === 'ru' ? 'Метод Бена Ханта: Активен' : 'Ben Hunt Ladder: Active'}
                   </p>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
