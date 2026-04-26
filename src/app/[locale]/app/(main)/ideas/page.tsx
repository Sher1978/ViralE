'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, Bookmark, Loader2, History, Sparkles } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/navigation';
import IdeaCard, { Idea } from '@/components/ideas/IdeaCard';
import DNABlock from '@/components/ideas/DNABlock';
import MatrixScroller from '@/components/ideas/MatrixScroller';
import TopicInput from '@/components/ideas/TopicInput';

const CATEGORIES = [
  "Hooks", "Roles", "Awareness", "Problem", "Solution", "Loyalty", "Fast Sales",
  "Myths", "Comparison", "Educational", "Case Study", "Trends", "Lifestyle", "Future"
];

export default function IdeasPage() {
  const t = useTranslations('ideas');
  const locale = useLocale();
  const router = useRouter();

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'archived'>('new');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [dnaAnswers, setDnaAnswers] = useState<any>(null);

  const fetchDna = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/dna/answers'); // Note: I might need to create a simple GET for this or use profile DNA
      if (res.ok) {
        // Fallback for profile DNA if answers not found
      }
      // Actually let's fetch profile directly to see dna_answers
      const profileRes = await fetch('/api/profile'); // Assuming /api/profile exists or check where it's stored
      // If /api/profile doesn't exist, we'll use a safer approach: fetch from /api/profile/dna but it returns prompt.
      // Let's assume we can get it or just rely on the first fetch of ideas to tell us.
    } catch (e) {}
  }, []);

  const fetchIdeas = useCallback(async (status: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ideas?locale=${locale}&status=${status}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setIdeas(data);
    } catch (err) {
      console.error('Error fetching ideas:', err);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchIdeas(activeTab);
  }, [fetchIdeas, activeTab]);

  const handleToScript = (content: string, category?: string) => {
    let url = `/app/projects/new/script?topic=${encodeURIComponent(content)}`;
    
    // If we're picking a specific role or hook, we might want to attach it to the current topic
    // For now, if category is Hook or Role, we pass it as a param
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

  const groupedIdeas = useMemo(() => {
    const groups: Record<string, Idea[]> = {};
    ideas.forEach(idea => {
      const cat = (idea as any).metadata?.category || "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(idea);
    });
    return groups;
  }, [ideas]);

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
        <div className="space-y-6">
          <DNABlock 
            onComplete={() => fetchIdeas('new')}
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
      <div className="space-y-10">
        {activeTab === 'new' ? (
          CATEGORIES.map((cat) => (
            <MatrixScroller
              key={cat}
              title={cat}
              subtitle={locale === 'ru' ? 'Стратегические идеи' : 'Strategic Insights'}
              ideas={groupedIdeas[cat] || []}
              onToScript={(topic) => handleToScript(topic, cat)}
              onToggleArchive={handleToggleArchive}
            />
          ))
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
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 text-purple-500/50 animate-spin" />
          <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">
            {locale === 'ru' ? 'Синтезируем темы...' : 'Synthesizing Trends...'}
          </p>
        </div>
      )}
    </div>
  );
}
