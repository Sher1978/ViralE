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
  ArrowRight,
  Clock
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
      {/* Ultra-Clean Header */}
      <div className="pt-10 mb-2">
        <div className="space-y-1 text-center md:text-left">
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none italic">
            Viral <span className="text-purple-500">Studio</span>
          </h1>
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20 mt-2">
            AI Content Production pipeline
          </p>
        </div>
      </div>

      {/* Main Visual Hubs - Single Column focused for maximum impact */}
      <div className="grid grid-cols-1 gap-10">
        {mainHubs.map((hub) => (
          <Link key={hub.id} href={hub.href} className="group">
            <div className="relative h-[200px] sm:h-[240px] md:h-[280px] rounded-[2.5rem] border border-white/10 overflow-hidden transition-all duration-700 hover:border-white/30 hover:scale-[1.01] active:scale-[0.99] shadow-2xl">
              {/* Background with Professional Fallback Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${
                hub.id === 'lab' ? 'from-purple-600/30 to-indigo-900/60' :
                hub.id === 'storyboard' ? 'from-orange-600/30 to-amber-900/60' :
                'from-blue-600/30 to-cyan-900/60'
              } z-0`} />
              
              <img 
                src={hub.image} 
                className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-70 transition-all duration-1000 group-hover:scale-105 z-10"
                alt={hub.title}
                onError={(e) => (e.currentTarget.style.opacity = '0')}
              />
              
              <div className={`absolute inset-0 bg-gradient-to-t ${hub.color} via-[#0a0a14]/80 to-transparent z-20 transition-all duration-700 group-hover:via-[#0a0a14]/40`} />
              
              <div className="absolute inset-0 p-8 flex flex-col justify-end z-30">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-1.5 group-hover:text-white transition-colors">Initialize Step</p>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">
                  {hub.title}
                </h3>
                <p className="text-[10px] font-bold text-white/40 group-hover:text-white/60 transition-colors uppercase tracking-widest leading-relaxed">
                  {hub.desc}
                </p>
              </div>

              {/* Action Indicator */}
              <div className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-y-0 transition-all duration-500 z-40">
                <ArrowRight className="w-5 h-5 text-white" />
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
