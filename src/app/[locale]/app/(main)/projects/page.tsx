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

  const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'archived').slice(0, 3);
  const finishedProjects = projects.filter(p => p.status === 'completed');

  const mainHubs = [
    { 
      id: 'lab', 
      title: t('stageLab'), 
      desc: 'Craft your message with AI precision', 
      href: `/${locale}/app/projects/new/script`, 
      image: '/assets/studio/script_lab.png',
      color: 'from-purple-600/40'
    },
    { 
      id: 'storyboard', 
      title: t('stageStoryboard'), 
      desc: 'Visualize your cinematic sequence', 
      href: `/${locale}/app/projects/new/storyboard`, 
      image: '/assets/studio/storyboard.png',
      color: 'from-orange-600/40'
    },
    { 
      id: 'production', 
      title: t('stageProduction'), 
      desc: 'Launch professional rendering', 
      href: `/${locale}/app/projects/new/production`, 
      image: '/assets/studio/production.png',
      color: 'from-cyan-600/40'
    },
  ];

  return (
    <div className="space-y-12 pb-32 max-w-7xl mx-auto px-4 overflow-x-hidden">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-10">
        <div className="space-y-1">
          <h1 className="text-4xl font-black uppercase tracking-tighter leading-none italic">
            Viral <span className="text-purple-500">Studio</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
            Professional Content Production Hub
          </p>
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
               className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-purple-500/50 transition-all w-48"
             />
           </div>
           
           <Link href={`/${locale}/app/projects/new`}>
             <button className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-white text-black font-black text-[11px] uppercase tracking-widest group active:scale-95 transition-all shadow-xl shadow-white/5">
                <Plus className="w-4 h-4 stroke-[3]" />
                {t('launchBtn')}
             </button>
           </Link>
        </div>
      </div>

      {/* Main Visual Hubs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mainHubs.map((hub) => (
          <Link key={hub.id} href={hub.href} className="group">
            <div className="relative aspect-[16/10] rounded-[2.5rem] border border-white/10 overflow-hidden transition-all duration-700 hover:border-white/30 hover:scale-[1.02] active:scale-[0.98] shadow-2xl">
              {/* Background Image */}
              <img 
                src={hub.image} 
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-110"
                alt={hub.title}
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${hub.color} via-[#0a0a14]/60 to-[#0a0a14]/20 group-hover:via-[#0a0a14]/20 transition-all duration-700`} />
              
              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1 group-hover:text-white transition-colors">Start Sequence</p>
                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">
                  {hub.title}
                </h3>
                <p className="text-xs font-bold text-white/40 group-hover:text-white/60 transition-colors uppercase tracking-widest">
                  {hub.desc}
                </p>
              </div>

              {/* Hover Arrow */}
              <div className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                <ArrowRight className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Active Projects Section */}
      <div className="space-y-6 pt-8">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Clock className="w-4 h-4 text-orange-400" />
             </div>
             <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Resume Creation</h2>
          </div>
          <Link href={`/${locale}/app/archive`} className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-purple-400 transition-colors">
            View All in Library
          </Link>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center">
             <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : activeProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-[3rem] bg-white/[0.02] border border-dashed border-white/10 text-center space-y-4">
             <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No active sequences found</p>
             <Link href={`/${locale}/app/projects/new`} className="text-[10px] font-black uppercase tracking-widest text-purple-400 hover:underline">
               Initialize First Project
             </Link>
          </div>
        )}
      </div>

      {/* Decorative Assets */}
      <div className="fixed top-1/4 -right-64 w-[600px] h-[600px] bg-purple-600/5 blur-[150px] pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-1/4 -left-64 w-[600px] h-[600px] bg-blue-600/5 blur-[150px] pointer-events-none -z-10 animate-pulse [animation-delay:2s]" />
    </div>
  );
}
