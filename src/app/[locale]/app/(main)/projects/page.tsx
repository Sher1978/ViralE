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
  Archive,
  FlaskConical,
  Clapperboard,
  Video,
  Rocket,
  Zap,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import ProjectCard, { Project } from '@/components/projects/ProjectCard';
import { useRouter } from '@/navigation';

const LIMIT = 12;

type StudioTab = 'lab' | 'storyboard' | 'production';

export default function StudioPage() {
  const { locale } = useParams() as { locale: string };
  const t = useTranslations('projects');
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<StudioTab>('lab');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects?limit=${LIMIT}&search=${search}`);
      const data = await res.json();
      setProjects(data.items || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = projects.filter(p => {
    if (activeTab === 'lab') return ['ideation', 'scripting'].includes(p.status);
    if (activeTab === 'storyboard') return ['storyboard'].includes(p.status);
    if (activeTab === 'production') return ['rendering', 'completed'].includes(p.status);
    return false;
  });

  const tabs = [
    { id: 'lab', icon: FlaskConical, label: t('stageLab'), count: projects.filter(p => ['ideation', 'scripting'].includes(p.status)).length },
    { id: 'storyboard', icon: Clapperboard, label: t('stageStoryboard'), count: projects.filter(p => ['storyboard'].includes(p.status)).length },
    { id: 'production', icon: Video, label: t('stageProduction'), count: projects.filter(p => ['rendering', 'completed'].includes(p.status)).length },
  ] as const;

  return (
    <div className="space-y-10 pb-32 max-w-7xl mx-auto px-4">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-400 fill-current" />
             </div>
             <div>
               <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">
                 {t('studioTitle')}
               </h1>
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mt-1">
                 {t('studioDesc')}
               </p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* Search Miniature */}
           <div className="relative group hidden sm:block">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
             <input 
               type="text" 
               placeholder={t('search')}
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-purple-500/50 focus:bg-white/[0.08] transition-all w-48"
             />
           </div>
           
           <Link href={`/${locale}/app/projects/new`}>
             <button className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-white text-black font-black text-[11px] uppercase tracking-widest group active:scale-95 transition-all">
                <Plus className="w-4 h-4 stroke-[3]" />
                {t('launchBtn')}
             </button>
           </Link>
        </div>
      </div>

      {/* Main Workflow Tabs */}
      <div className="p-2 glass-premium rounded-[2.5rem] border border-white/5">
        <div className="grid grid-cols-3 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-6 rounded-[2rem] transition-all overflow-hidden group ${
                activeTab === tab.id 
                  ? 'bg-white/5 text-white' 
                  : 'text-white/20 hover:text-white/40 hover:bg-white/[0.02]'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent"
                />
              )}
              
              <tab.icon className={`w-6 h-6 mb-2 transition-all ${activeTab === tab.id ? 'scale-110 text-purple-400' : 'group-hover:scale-110'}`} />
              <span className="text-[11px] font-black uppercase tracking-widest mb-1">{tab.label}</span>
              
              <div className="flex items-center gap-1.5">
                <div className={`w-1 h-1 rounded-full ${tab.count > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-white/10'}`} />
                <span className="text-[9px] font-bold tabular-nums opacity-60">{tab.count} active</span>
              </div>

              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-purple-500 rounded-t-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="min-h-[400px]"
        >
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
              
              {/* Contextual Create Mini-Card */}
              <Link href={`/${locale}/app/projects/new`} className="group">
                <div className="h-full min-h-[160px] glass-premium rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center justify-center gap-3 p-6 hover:border-purple-500/40 hover:bg-purple-500/[0.02] transition-all">
                   <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="w-5 h-5 text-white/20 group-hover:text-purple-400" />
                   </div>
                   <div className="text-center">
                     <p className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">{t('startNew')}</p>
                     <p className="text-[8px] font-bold text-white/10 uppercase tracking-tight mt-0.5">Initialize sequence</p>
                   </div>
                </div>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-24 space-y-8 glass-premium rounded-[3rem] border border-white/5">
              <div className="relative">
                <div className="w-20 h-20 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center relative z-10">
                   <FlaskConical className="w-8 h-8 text-white/10" />
                </div>
                <div className="absolute inset-0 bg-purple-500/5 blur-3xl" />
              </div>
              
              <div className="space-y-4 max-w-sm mx-auto">
                <h3 className="text-xl font-black uppercase tracking-tighter">{t('noActive')}</h3>
                <p className="text-xs text-white/20 font-medium leading-relaxed">
                  Every viral masterpiece begins with a single prompt. Initialize your project and watch it climb the stages.
                </p>
                
                <Link href={`/${locale}/app/projects/new`} className="inline-block mt-4">
                  <button className="flex items-center gap-3 px-8 py-4 bg-purple-600 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-purple-600/20 hover:bg-purple-500 active:scale-95 transition-all">
                     <Rocket className="w-4 h-4" />
                     {t('startNew')}
                     <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Background Decor */}
      <div className="fixed top-20 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/5 blur-[120px] pointer-events-none -z-10" />
    </div>
  );
}
