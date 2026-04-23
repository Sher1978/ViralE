'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCcw, 
  LayoutGrid,
  ChevronDown,
  X,
  Monitor,
  CheckCircle2,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import ProjectCard, { Project } from '@/components/projects/ProjectCard';

const LIMIT = 6;

export default function ProjectsPage() {
  const { locale } = useParams() as { locale: string };
  const t = useTranslations('projects');
  
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch projects
  const fetchProjects = useCallback(async (pageNum: number, isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: LIMIT.toString(),
        search: search,
      });

      if (statusFilter === 'active') {
        params.append('status', 'ideation,scripting,storyboard,rendering');
      } else if (statusFilter === 'completed') {
        params.append('status', 'completed');
      }

      const res = await fetch(`/api/projects?${params.toString()}`);
      const data = await res.json();

      if (isLoadMore) {
        setProjects(prev => [...prev, ...(data.items || [])]);
      } else {
        setProjects(data.items || []);
      }
      
      setTotalPages(data.totalPages);
      setTotalCount(data.total);
      setPage(data.page);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, statusFilter]);

  // Initial fetch and filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects(1);
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [fetchProjects]);

  const handleLoadMore = () => {
    if (page < totalPages) {
      fetchProjects(page + 1, true);
    }
  };

  const [viewMode, setViewMode] = useState<'status' | 'format'>('status');
  
  // Format sections
  const formats = [
    { id: 'vertical', title: 'Vertical (9:16)', icon: Monitor },
    { id: 'square', title: 'Square (1:1)', icon: LayoutGrid },
    { id: 'horizontal', title: 'Horizontal (16:9)', icon: Monitor }, // Using Monitor for now as placeholder
    { id: 'unknown', title: 'Other Formats', icon: Filter },
  ];

  const sections = [
    { 
      id: 'active', 
      title: t('filterActive'), 
      status: ['ideation', 'scripting', 'storyboard', 'rendering'],
      icon: RefreshCcw
    },
    { 
      id: 'completed', 
      title: t('filterDone'), 
      status: ['completed'],
      icon: CheckCircle2 
    },
    { 
      id: 'archived', 
      title: t('archived'), 
      status: ['archived'],
      icon: Archive 
    }
  ];

  return (
    <div className="space-y-12 pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header & Controls */}
      <div className="flex flex-col gap-6 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 mb-2">
              Viral Engine Ecosystem
            </p>
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-2">
              <span className="text-white/40">{t('title')}</span>
              <span className="text-white">{t('titleAccent')}</span>
            </h1>
          </div>

          <Link href={`/${locale}/app/projects/new`}>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(16,185,129,0.2)' }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] bg-emerald-500 text-black font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/10 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              {t('newBtn')}
            </motion.button>
          </Link>
        </div>

        {/* Search & Global Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-purple-400 transition-colors" />
            <input
              type="text"
              placeholder={t('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-14 pr-4 py-4 rounded-[1.5rem] bg-white/[0.03] border border-white/5 focus:border-purple-500/50 focus:bg-white/[0.05] text-white text-sm outline-none transition-all placeholder:text-white/20"
            />
          </div>
          
          <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl shrink-0">
             <button 
               onClick={() => setViewMode('status')}
               className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'status' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-white/40 hover:text-white/60'}`}
             >
               By Status
             </button>
             <button 
               onClick={() => setViewMode('format')}
               className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'format' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-white/40 hover:text-white/60'}`}
             >
               By Format
             </button>
          </div>
        </div>
      </div>

      {/* Dynamic Sections */}
      <div className="space-y-16">
        {loading && page === 1 ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 animate-pulse">
              Syncing Neural Archive...
            </p>
          </div>
        ) : projects.length > 0 ? (
          sections.map((section) => {
            const sectionProjects = projects.filter(p => section.status.includes(p.status));
            if (sectionProjects.length === 0 && !search) return null;

            return (
              <div key={section.id} className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-purple-400">
                      <section.icon className="w-4 h-4" />
                    </div>
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/80">
                      {section.title}
                      <span className="ml-3 text-white/20 tabular-nums">({sectionProjects.length})</span>
                    </h2>
                  </div>
                </div>

                <div className="relative group">
                  <div className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth pb-8 px-2 -mx-2">
                    <AnimatePresence mode="popLayout">
                      {sectionProjects.map((project) => (
                        <div key={project.id} className="flex-none w-[280px] sm:w-[320px]">
                          <ProjectCard project={project} />
                        </div>
                      ))}
                    </AnimatePresence>
                    
                    {/* Ghost card for "Create New" at the end of active section */}
                    {section.id === 'active' && !search && (
                      <Link href={`/${locale}/app/projects/new`} className="flex-none block group/new">
                        <div className="w-[320px] aspect-square rounded-[2.5rem] border-2 border-dashed border-white/5 bg-white/[0.02] hover:bg-purple-500/[0.03] hover:border-purple-500/20 transition-all flex flex-col items-center justify-center gap-4 text-center p-8">
                          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center group-hover/new:scale-110 group-hover/new:rotate-90 transition-all">
                            <Plus className="w-8 h-8 text-white/20 group-hover/new:text-purple-400" />
                          </div>
                          <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-1 group-hover/new:text-white">Start New</h3>
                            <p className="text-[9px] font-bold text-white/10 uppercase tracking-tight group-hover/new:text-white/20">Generate next viral hit</p>
                          </div>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="min-h-[400px] flex flex-col items-center justify-center text-center px-6">
            <div className="w-24 h-24 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 bg-purple-500/10 blur-2xl rounded-full" />
              <LayoutGrid className="w-10 h-10 text-white/10 relative z-10" />
            </div>
            <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">{t('noResults')}</h3>
            <p className="text-sm text-white/30 max-w-sm mx-auto leading-relaxed font-medium">
              {search 
                ? 'Your neural query returned zero matches. Try recalibrating search parameters.' 
                : 'Your creative vault is currently empty. Initialize your first production sequence to begin.'}
            </p>
            {!search && (
              <Link href={`/${locale}/app/projects/new`} className="mt-12">
                <button className="px-10 py-4 rounded-[1.8rem] bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-purple-500/40 active:scale-95">
                  Launch Project Alpha
                </button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Decorative Elements */}
      <div className="fixed top-1/4 -right-64 w-[600px] h-[600px] bg-purple-600/10 blur-[150px] -z-10 rounded-full" />
      <div className="fixed bottom-1/4 -left-64 w-[600px] h-[600px] bg-emerald-600/5 blur-[150px] -z-10 rounded-full" />
    </div>
  );
}
