'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Archive, 
  Search, 
  Loader2, 
  LayoutGrid,
  FileText,
  Lightbulb,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProjectCard, { Project } from '@/components/projects/ProjectCard';
import IdeaCard, { Idea } from '@/components/ideas/IdeaCard';
import { useRouter } from '@/navigation';

export default function ArchivePage() {
  const t = useTranslations('archive');
  const tProjects = useTranslations('projects');
  const locale = useLocale();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'projects' | 'ideas'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchArchivedProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: 'archived',
        search: search
      });
      const res = await fetch(`/api/projects?${params.toString()}`);
      const data = await res.json();
      setProjects(data.items || []);
    } catch (error) {
      console.error('Failed to fetch archived projects:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchArchivedIdeas = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ideas?locale=${locale}&status=archived`);
      const data = await res.json();
      // Filter by search locally for ideas as the API might not support it yet for archived
      const filtered = search 
        ? data.filter((i: Idea) => i.topic_title.toLowerCase().includes(search.toLowerCase()))
        : data;
      setIdeas(filtered);
    } catch (error) {
      console.error('Failed to fetch archived ideas:', error);
    } finally {
      setLoading(false);
    }
  }, [locale, search]);

  useEffect(() => {
    if (activeTab === 'projects') {
      fetchArchivedProjects();
    } else {
      fetchArchivedIdeas();
    }
  }, [activeTab, fetchArchivedProjects, fetchArchivedIdeas]);

  const handleToggleIdeaArchive = async (ideaId: string, currentStatus: string) => {
    try {
      setProcessingId(ideaId);
      const res = await fetch('/api/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, status: 'new' }), // Restoring to 'new'
      });

      if (res.ok) {
        setIdeas(prev => prev.filter(i => i.id !== ideaId));
      }
    } catch (err) {
      console.error('Error restoring idea:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleToScript = (topic: string) => {
    router.push(`/projects/new/script?topic=${encodeURIComponent(topic)}`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25">
            {t('supertitle')}
          </p>
          {loading && <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />}
        </div>
        <h1 className="text-2xl font-black tracking-tighter uppercase font-space">
          <span className="gradient-text-gold">{t('title')}</span>
        </h1>
      </div>

      {/* Search & Tabs */}
      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder={tProjects('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30 focus:bg-white/[0.05] transition-all"
          />
        </div>

        <div className="flex p-1 rounded-2xl bg-white/[0.03] border border-white/5">
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'projects' 
                ? 'bg-white/10 text-white shadow-lg' 
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            <FileText className="w-3 h-3" />
            {t('projects')}
          </button>
          <button
            onClick={() => setActiveTab('ideas')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'ideas' 
                ? 'bg-white/10 text-white shadow-lg' 
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            <Lightbulb className="w-3 h-3" />
            {t('ideas')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading && (projects.length === 0 && ideas.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <Archive className="w-8 h-8 text-white/5 mb-4" />
            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">Accessing Vault...</p>
          </div>
        ) : (
          <>
            {activeTab === 'projects' && (
              <div className="grid grid-cols-1 gap-4">
                {projects.length > 0 ? (
                  projects.map((project, i) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onRefresh={fetchArchivedProjects}
                    />
                  ))
                ) : (
                  <EmptyState t={t} />
                )}
              </div>
            )}

            {activeTab === 'ideas' && (
              <div className="space-y-4">
                {ideas.length > 0 ? (
                  ideas.map((idea, i) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      index={i}
                      locale={locale}
                      isProcessing={processingId === idea.id}
                      onToggleArchive={handleToggleIdeaArchive}
                      onToScript={handleToScript}
                    />
                  ))
                ) : (
                  <EmptyState t={t} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ t }: { t: any }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-10 text-center space-y-4">
      <div className="w-20 h-20 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-center mb-2">
        <Archive className="w-10 h-10 text-white/10" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-white/60">{t('empty')}</h3>
        <p className="text-[10px] text-white/20 uppercase tracking-widest leading-relaxed">
          {t('emptyDesc')}
        </p>
      </div>
    </div>
  );
}
