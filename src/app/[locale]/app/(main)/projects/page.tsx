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
    <div className="space-y-8 pb-32 max-w-7xl mx-auto px-4 overflow-x-hidden">
      {/* Compact Pro Header */}
      <div className="flex items-start justify-between pt-6 mb-2">
        <div className="flex items-center gap-4">
          {/* Logo/Strategist Placeholder - Ensuring it stays top-left as a button */}
          <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center active:scale-95 transition-transform cursor-pointer">
            <h1 className="text-2xl font-black text-purple-500 italic">V</h1>
          </div>
          
          <div className="space-y-0.5">
            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none italic">
              Viral <span className="text-purple-500">Studio</span>
            </h1>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
              AI Content Production
            </p>
          </div>
        </div>
      </div>

      {/* Professional Stage Collage - Monolithic Diagonal Layout with Comic/Graphic Novel Aesthetic */}
      <div className="relative group/monolith overflow-hidden rounded-[3rem] border-4 border-black shadow-2xl bg-black">
        {mainHubs.map((hub, index) => (
          <motion.div
            key={hub.id}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ 
              duration: 0.8, 
              delay: index * 0.2,
              ease: [0.16, 1, 0.3, 1] 
            }}
            className="block relative group"
          >
            <Link href={hub.href}>
              <div 
                className={`relative h-[160px] transition-all duration-700 overflow-hidden active:scale-[0.98]
                  ${index === 0 ? 'z-30 h-[180px]' : index === 1 ? 'z-20 -mt-16 h-[220px]' : 'z-10 -mt-16 h-[180px]'}
                `}
                style={{
                  clipPath: index === 0 ? 'polygon(0 0, 100% 0, 100% 85%, 0 100%)' :
                            index === 1 ? 'polygon(0 15%, 100% 0, 100% 85%, 0 100%)' :
                            'polygon(0 15%, 100% 0, 100% 100%, 0 100%)'
                }}
              >
                {/* Thick Comic-Style Separator Line - Precise Alignment for 15% Slant */}
                {index > 0 && (
                  <div 
                    className="absolute top-0 left-0 w-full h-[8px] bg-black z-50 pointer-events-none shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                    style={{
                      clipPath: 'polygon(0 15%, 100% 0, 100% 3%, 0 18%)'
                    }}
                  />
                )}

                {/* Image Layer with Better Visibility */}
                <div className="absolute inset-0">
                  <img 
                    src={hub.image} 
                    className="w-full h-full object-cover opacity-50 grayscale group-active:grayscale-0 group-active:opacity-90 transition-all duration-1000 group-active:scale-105"
                    alt={hub.title}
                    onError={(e) => (e.currentTarget.style.opacity = '0')}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${
                    hub.id === 'lab' ? 'from-purple-600/30 via-purple-900/50' :
                    hub.id === 'storyboard' ? 'from-orange-600/30 via-orange-900/50' :
                    'from-blue-600/30 via-blue-900/50'
                  } to-black/60`} />
                </div>

                {/* Stylized Numbering - High Contrast Watermark Style */}
                <div className="absolute -left-10 top-1/2 -translate-y-1/2 select-none pointer-events-none z-40">
                  <span className="text-[180px] font-black italic text-white/15 leading-none tracking-tighter outline-text-subtle">
                    {index + 1}
                  </span>
                </div>

                {/* Content Layer - More Compact and Clear */}
                <div className={`absolute inset-0 p-8 flex flex-col ${
                  index === 0 ? 'justify-start pt-10' : 
                  index === 1 ? 'justify-center' : 
                  'justify-end pb-10'
                }`}>
                  <div className={`${index === 1 ? 'md:pl-16' : index === 2 ? 'md:pl-32' : ''} space-y-0.5 z-30 transition-transform duration-500 group-active:translate-x-1`}>
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/60 mb-0.5">Phase 0{index + 1}</p>
                    <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none drop-shadow-lg">
                      {hub.title.split(' ')[0]} <span className="text-white/60">{hub.title.split(' ')[1] || ''}</span>
                    </h3>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mt-1.5">
                      {hub.desc}
                    </p>
                  </div>
                </div>

                {/* Interaction Overlay */}
                <div className="absolute inset-0 bg-white/0 group-active:bg-white/5 transition-colors duration-300 z-50 pointer-events-none" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Active Projects Section - Horizontal Scroll Implementation */}
      <div className="space-y-6 pt-8">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Clock className="w-4 h-4 text-orange-400" />
             </div>
             <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Resume Creation</h2>
          </div>
          <Link href={`/${locale}/app/archive`} className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-purple-400 transition-colors">
            View All
          </Link>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center">
             <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : activeProjects.length > 0 ? (
          <div className="relative -mx-4">
            {/* Gradient Mask for Scroll Suggestion */}
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#05050a] to-transparent z-40 pointer-events-none" />
            
            <div className="flex overflow-x-auto gap-5 px-4 pb-8 no-scrollbar scroll-smooth snap-x snap-mandatory">
              {activeProjects.map((project) => (
                <div key={project.id} className="min-w-[280px] sm:min-w-[340px] flex-shrink-0 snap-start">
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-12 rounded-[3rem] bg-white/[0.02] border border-dashed border-white/10 text-center space-y-4 mx-2">
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
