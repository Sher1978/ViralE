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
  X
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

  const tabs = [
    { id: 'all', label: t('filterAll') },
    { id: 'active', label: t('filterActive') },
    { id: 'completed', label: t('filterDone') },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-1">
              Viral Engine
            </p>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <span className="text-white/40">{t('title')}</span>
              <span className="text-white">{t('titleAccent')}</span>
            </h1>
          </div>

          <Link href={`/${locale}/app/projects/new`}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-sm"
            >
              <Plus className="w-4 h-4" />
              {t('newBtn')}
            </motion.button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-purple-400 transition-colors" />
            <input
              type="text"
              placeholder={t('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-purple-500/50 focus:bg-white/[0.05] text-white text-sm outline-none transition-all"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === tab.id 
                    ? 'bg-white/10 text-white shadow-lg' 
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="relative min-h-[400px]">
        {loading && page === 1 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <RefreshCcw className="w-8 h-8 text-purple-500/50 animate-spin" />
            <p className="text-xs font-medium text-white/20 animate-pulse uppercase tracking-widest">
              {t('processing')}...
            </p>
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-6">
              <LayoutGrid className="w-8 h-8 text-white/10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t('noResults')}</h3>
            <p className="text-sm text-white/40 max-w-xs mx-auto">
              {search || statusFilter !== 'all' 
                ? 'Try adjusting your filters or search terms to find what you are looking for.' 
                : 'You havent created any projects yet. Start by generating your first script!'}
            </p>
            {!search && statusFilter === 'all' && (
              <Link href={`/${locale}/app/projects/new`} className="mt-8">
                <button className="px-8 py-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-xl shadow-purple-500/20">
                  {t('newProject')}
                </button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Load More */}
      {totalPages > page && (
        <div className="flex justify-center pt-10">
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-8 py-4 rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-white/60 hover:text-white transition-all text-sm font-bold disabled:opacity-50"
          >
            {loadingMore ? (
              <RefreshCcw className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            {t('loadMore')}
          </motion.button>
        </div>
      )}

      {/* Background Decor */}
      <div className="fixed top-1/4 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] -z-10 rounded-full" />
      <div className="fixed bottom-1/4 left-0 w-[400px] h-[400px] bg-blue-600/5 blur-[120px] -z-10 rounded-full" />
    </div>
  );
}
