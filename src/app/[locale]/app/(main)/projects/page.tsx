'use client';

import { useState, useEffect, useCallback } from 'react';
import { PremiumLimitModal } from '@/components/ui/PremiumLimitModal';
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
  const [error, setError] = useState<string | null>(null);

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
    <div className="space-y-0 pb-32 max-w-7xl mx-auto overflow-x-hidden">
      {/* Professional Header - Aligned with Global Strategist */}
      <div className="flex flex-col pt-4 mb-4 pl-16">
        <div className="space-y-0.5">
          <h1 className="text-4xl font-black uppercase tracking-tighter leading-none italic">
            Viral <span className="text-purple-500">Studio</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
            AI Content Production Factory
          </p>
        </div>
      </div>

      {/* Professional Stage Collage - Monolithic Diagonal Layout with Maximum Visibility */}
      <div className="relative group/monolith overflow-hidden border-y border-white/10 bg-black">
        {mainHubs.map((hub, index) => (
            <motion.div
              key={hub.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => router.push(`/${locale}/app/projects/new/${hub.id}`)}
              className="relative h-[250px] cursor-pointer group overflow-hidden border-b border-white/10 last:border-0"
            >
            <Link href={hub.href}>
              <div 
                className="relative w-full h-full transition-all duration-700 overflow-hidden active:scale-[0.99]"
              >
                {/* Subtle top shadow for depth */}
                <div className="absolute top-0 left-0 w-full h-[80px] bg-gradient-to-b from-black/50 to-transparent z-40 pointer-events-none" />

                {/* Comic Background with sharp edges */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <img 
                    src={hub.image} 
                    className="w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 transition-all duration-700" 
                    alt={hub.title} 
                  />
                  <div className={`absolute inset-0 bg-gradient-to-r from-purple-950/90 ${
                    index === 0 ? 'via-purple-900/40' : 
                    index === 1 ? 'via-orange-900/40' : 
                    'via-blue-900/40'
                  } to-transparent`} />
                  
                  {/* Subtle Comic Line Separators */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10" />
                </div>

                {/* Giant Original Stylized Numbering - Better Visibility Watermark */}
                <div className="absolute left-6 top-1/2 -translate-y-1/2 select-none pointer-events-none z-30">
                  <span className="text-[200px] font-black italic text-white/[0.2] leading-none tracking-tighter">
                    {index + 1}
                  </span>
                </div>

                {/* Content Layer - Safe and Readable Positioning */}
                <div className={`absolute inset-0 p-12 flex flex-col ${
                  index === 0 ? 'justify-start pt-16' : 
                  'justify-center'
                }`}>
                  <div className="space-y-1 z-40 max-w-lg">
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 mb-1">Step {index + 1}</p>
                    <h3 className="text-4xl sm:text-5xl font-black text-white uppercase italic tracking-tighter leading-none drop-shadow-2xl">
                      {hub.title.split(' ')[0]} <span className="text-white/40">{hub.title.split(' ')[1] || hub.title.split(' ')[2] || ''}</span>
                    </h3>
                    <p className="text-xs font-bold text-white/30 uppercase tracking-[0.1em] leading-none mt-3">
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
      <PremiumLimitModal 
        isOpen={!!error}
        onClose={() => setError(null)}
        title={locale === 'ru' ? 'Внимание' : 'Attention'}
        description={error || ''}
        type="tier"
        locale={locale}
      />
    </div>
  );
}
