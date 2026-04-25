'use client';
import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Bookmark, Loader2, History } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/navigation';
import IdeaCard, { Idea } from '@/components/ideas/IdeaCard';

export default function IdeasPage() {
  const t = useTranslations('ideas');
  const common = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'archived'>('new');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<'TIER_LOCK' | 'MONTHLY_LIMIT' | null>(null);

  const fetchIdeas = useCallback(async (status: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ideas?locale=${locale}&status=${status}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.error === 'TIER_LOCK') {
        setErrorState('TIER_LOCK');
        return;
      }
      if (data.error === 'MONTHLY_LIMIT') {
        setErrorState('MONTHLY_LIMIT');
        return;
      }
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

  const handleToScript = (topic: string) => {
    router.push(`/app/projects/new/script?topic=${encodeURIComponent(topic)}`);
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
        // Remove from current list visually
        setIdeas(prev => prev.filter(i => i.id !== ideaId));
      }
    } catch (err) {
      console.error('Error updating idea status:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const tabs = [
    { id: 'new', label: t('title'), icon: <TrendingUp className="w-3 h-3" /> },
    { id: 'archived', label: t('tabSaved') || 'Saved', icon: <Bookmark className="w-3 h-3" /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25">
            {t('supertitle')}
          </p>
          {loading && <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />}
        </div>
        <h1
          className="text-2xl font-black tracking-tighter uppercase"
          style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
        >
          <span className="gradient-text-gold">{activeTab === 'new' ? t('title') : (t('titleSaved') || 'Saved Themes')}</span>{' '}
          <span className="text-white/50">{t('titleAccent')}</span>
        </h1>
        <p className="text-[11px] text-white/30">
          {activeTab === 'new' ? t('subtitle') : (t('subtitleSaved') || 'Your collection of high-potential themes')}
        </p>
      </div>

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

      {/* Ideas list */}
      <div className="space-y-4">
        {errorState === 'TIER_LOCK' ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center space-y-8 bg-white/[0.02] border border-white/5 rounded-[2rem] animate-fade-up">
            <div className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center relative overflow-hidden group">
              <TrendingUp className="w-10 h-10 text-white/40 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent" />
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-black uppercase tracking-tighter gradient-text-purple">Unlock AI Trends</h3>
              <p className="text-[11px] text-white/40 uppercase tracking-[0.1em] font-medium leading-relaxed max-w-[240px]">
                AI-powered trend scouting is exclusive to <span className="text-white/60">Creator</span> and <span className="text-white/60">Pro</span> tiers.
              </p>
            </div>
            <button 
              onClick={() => router.push('/billing')}
              className="px-8 py-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-purple-500/20"
            >
              Upgrade Now
            </button>
          </div>
        ) : errorState === 'MONTHLY_LIMIT' ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center space-y-8 bg-white/[0.02] border border-white/5 rounded-[2rem] animate-fade-up">
            <div className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-white/10 flex items-center justify-center relative overflow-hidden group">
              <TrendingUp className="w-10 h-10 text-white/40 group-hover:scale-110 transition-transform" />
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-black uppercase tracking-tighter text-yellow-500/80">Monthly Limit Reached</h3>
              <p className="text-[11px] text-white/40 uppercase tracking-[0.1em] font-medium leading-relaxed max-w-[240px]">
                You've used your 10 AI topics for this month. Upgrade to <span className="text-white/60">Pro</span> for unlimited insights.
              </p>
            </div>
            <button 
               onClick={() => router.push('/billing')}
               className="px-8 py-4 rounded-2xl bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-yellow-500/20"
            >
              Go Pro
            </button>
          </div>
        ) : loading && ideas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 text-purple-500/50 animate-spin" />
            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">Synthesizing Trends...</p>
          </div>
        ) : ideas.length > 0 ? (
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
          <div className="flex flex-col items-center justify-center py-20 px-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
              <History className="w-8 h-8 text-white/10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white/60">No themes found</h3>
              <p className="text-[10px] text-white/20 uppercase tracking-widest leading-relaxed">
                {activeTab === 'new' 
                  ? 'We are looking for fresh trends. Check back in a few minutes.' 
                  : 'Your archive is empty. Save promising themes to see them here.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
