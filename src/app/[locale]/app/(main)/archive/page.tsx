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
      {/* Header - Aligned with Strategist */}
      <div className="space-y-1 pl-16">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25">
            {t('supertitle')}
          </p>
          {loading && <Loader2 className="w-3 h-3 text-cyan-500 animate-spin" />}
        </div>
        <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">
          Archive <span className="text-cyan-500">{t('title')}</span>
        </h1>
      </div>

      {/* Search & Tabs */}
      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-cyan-500 transition-colors" />
          <input
            type="text"
            placeholder={tProjects('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30 focus:bg-white/[0.05] transition-all"
          />
        </div>

        <div className="flex p-1 rounded-2xl bg-white/[0.03] border border-white/5 relative overflow-hidden">
          {/* Subtle cyan glow for tabs */}
          <div className="absolute inset-0 bg-cyan-500/5 blur-xl pointer-events-none" />
          
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex-1 relative flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all z-10 ${
              activeTab === 'projects' 
                ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)]' 
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            <FileText className="w-3 h-3" />
            {t('projects')}
          </button>
          <button
            onClick={() => setActiveTab('ideas')}
            className={`flex-1 relative flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all z-10 ${
              activeTab === 'ideas' 
                ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)]' 
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
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                {projects.length > 0 ? (
                  projects.map((project, i) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={i % 3 === 1 ? 'xs:mt-8' : ''} // Staggered Waterfall Effect
                    >
                      <ProjectCard 
                        project={project} 
                        onRefresh={fetchArchivedProjects}
                      />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full">
                    <EmptyState t={t} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ideas' && (
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                {ideas.length > 0 ? (
                  ideas.map((idea, i) => (
                    <motion.div
                      key={idea.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={i % 2 === 1 ? 'xs:mt-12' : ''} // Stronger Waterfall Effect for Ideas
                    >
                      <IdeaCard
                        idea={idea}
                        index={i}
                        locale={locale}
                        isProcessing={processingId === idea.id}
                        onToggleArchive={handleToggleIdeaArchive}
                        onToScript={handleToScript}
                      />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full">
                    <EmptyState t={t} />
                  </div>
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
    <div className="flex flex-col items-center justify-center p-10 text-center space-y-6 rounded-[3rem] bg-white/[0.02] border border-dashed border-white/10 backdrop-blur-md">
      <div className="relative group">
        <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full animate-pulse group-hover:bg-cyan-500/40 transition-all" />
        <div className="relative w-20 h-20 rounded-3xl bg-black border border-white/10 flex items-center justify-center mb-2">
          <Archive className="w-10 h-10 text-cyan-400" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-black uppercase italic tracking-tighter text-white">{t('empty')}</h3>
        <p className="text-[9px] text-white/30 uppercase tracking-[0.3em] leading-relaxed max-w-[200px]">
          {t('emptyDesc')}
        </p>
      </div>
    </div>
  );
}
