'use client';

import { useState, useEffect, useCallback } from 'react';
import { PremiumLimitModal } from '@/components/ui/PremiumLimitModal';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Sparkles, Play, Clock, Monitor, ArrowRight, Video, Hourglass, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { projectService, Project } from '@/lib/services/projectService';
import { profileService } from '@/lib/services/profileService';
import { useRouter } from '@/navigation';
import { StrategistChat } from '@/components/studio/StrategistChat';

export default function ProjectsPage() {
  const t = useTranslations('projects');
  const locale = useLocale();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [showProjectsOverlay, setShowProjectsOverlay] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await profileService.getOrCreateProfile();
      setProfile(data);
      if (data?.id) {
        const projData = await projectService.listProjects(data.id);
        setProjects(projData);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchProjects();
  }, [fetchProjects]);

  if (!mounted) return null;

  const hubs = [
    {
      id: 'script',
      title: locale === 'ru' ? 'IDEA LAB' : 'IDEA LAB',
      desc: locale === 'ru' ? 'CRAFT YOUR MESSAGE & GENERATE TEXT CONTENT' : 'CRAFT YOUR MESSAGE & GENERATE TEXT CONTENT',
      href: '/app/projects/new/script',
      image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1973&auto=format&fit=crop',
    },
    {
      id: 'recording',
      title: locale === 'ru' ? 'RECORDING HUB' : 'RECORDING HUB',
      desc: locale === 'ru' ? 'RECORD TELEPROMPTER OR GENERATE AI VIDEO' : 'RECORD TELEPROMPTER OR GENERATE AI VIDEO',
      href: '/app/projects/new/storyboard',
      image: 'https://images.unsplash.com/photo-1590179068383-b9c69aacebd3?q=80&w=1974&auto=format&fit=crop',
    },
    {
      id: 'production',
      title: locale === 'ru' ? 'PRODUCTION HUB' : 'PRODUCTION HUB',
      desc: locale === 'ru' ? 'MONTAGE, B-ROLL & FINAL POST-PROCESSING' : 'MONTAGE, B-ROLL & FINAL POST-PROCESSING',
      href: '/app/projects/new/production',
      image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059&auto=format&fit=crop',
    }
  ];

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden bg-[#0A0A10] flex flex-col touch-none select-none">
      {/* Fixed Header */}
      <header className="px-6 h-[12dvh] flex items-center justify-between shrink-0 z-50">
        <div className="flex flex-col pt-4">
          <h1 className="text-4xl font-black italic tracking-tighter leading-none text-white">
            VIRAL<span className="text-purple-500">E</span>
          </h1>
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/20 mt-1 leading-none">
            AI CONTENT PRODUCTION FACTORY
          </p>
        </div>

        <div 
          onClick={() => setShowProjectsOverlay(true)}
          className="w-12 h-12 relative cursor-pointer group"
        >
           <div className="absolute top-0 right-0 w-full h-full overflow-hidden">
              <div className="absolute top-0 right-0 w-[140%] h-[40%] bg-amber-500 border-b border-amber-400 origin-top-right rotate-45 translate-x-1/2 -translate-y-1/2 group-hover:bg-amber-400 transition-all flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                  <Hourglass className="w-5 h-5 text-black group-hover:scale-110 rotate-[-45deg] transition-all translate-x-[-8px] translate-y-[8px]" />
              </div>
           </div>
        </div>
      </header>

      {/* Grid Blocks - Forced fit to remaining viewport */}
      <div className="flex-1 grid grid-rows-3 w-full h-full relative z-10 overflow-hidden pb-[8dvh]">
        {hubs.map((hub, index) => (
          <motion.div
            key={hub.id}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => router.push(hub.href)}
            className={`relative cursor-pointer group overflow-hidden w-full h-full transition-all duration-500 ${
              index === 0 ? 'z-30' : index === 1 ? 'z-20' : 'z-10'
            }`}
            style={{
              clipPath: index === 0 ? 'polygon(0 0, 100% 0, 100% 96%, 0 100%)' :
                        index === 1 ? 'polygon(0 4%, 100% 0, 100% 96%, 0 100%)' :
                        'polygon(0 4%, 100% 0, 100% 100%, 0 100%)',
              marginTop: index === 0 ? '0' : '-2dvh'
            }}
          >
            <div className="relative w-full h-[104%] -mt-[2%] overflow-hidden active:scale-[0.99] transition-transform">
              <div className="absolute inset-0 z-0">
                <img 
                  src={hub.image} 
                  className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105" 
                  alt="" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent opacity-80" />
                <div className={`absolute inset-0 bg-gradient-to-r ${
                  index === 0 ? 'from-purple-900/40' : index === 1 ? 'from-orange-900/40' : 'from-blue-900/40'
                } to-transparent`} />
              </div>

              <span className="absolute bottom-6 right-8 text-[120px] font-black text-white/[0.03] italic leading-none z-1 tracking-tighter transition-all group-hover:text-white/[0.1] select-none">
                {index + 1}
              </span>

              <div className="relative z-10 h-full flex flex-col justify-center px-12">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40 block mb-1">STEP {index + 1}</span>
                <h2 className="text-4xl lg:text-5xl font-black uppercase text-white tracking-tighter italic leading-[0.85] mb-2 group-hover:translate-x-2 transition-all">
                    {hub.title}
                </h2>
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20 max-w-[240px] leading-relaxed">
                  {hub.desc}
                </p>
              </div>

              {/* Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,.25)_50%),linear-gradient(90deg,rgba(255,0,0,.06),rgba(0,255,0,.02),rgba(0,0,111,.06))] bg-[length:100%_4px,3px_100%] opacity-10" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Projects Slide-over Overlay (90% width) */}
      <AnimatePresence>
        {showProjectsOverlay && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProjectsOverlay(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: '10%' }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 w-[90%] h-full bg-[#12121A] border-l border-white/5 z-[101] shadow-2xl p-10 overflow-y-auto"
            >
              {/* Close Bookmark (Top Left of Overlay) */}
              <div 
                onClick={() => setShowProjectsOverlay(false)}
                className="absolute top-0 left-0 w-24 h-24 overflow-hidden cursor-pointer group"
              >
                  <div className="absolute top-0 left-0 w-[140%] h-[40%] bg-white/5 border-b border-white/10 origin-top-left -rotate-45 -translate-x-1/2 -translate-y-1/2 group-hover:bg-white/10 transition-all flex items-center justify-center">
                    <Video className="w-5 h-5 text-white/40 group-hover:text-purple-400 rotate-[45deg] transition-all translate-x-[12px] translate-y-[12px]" />
                  </div>
              </div>

              <div className="flex items-center justify-between mb-12 ml-10">
                <div className="flex flex-col">
                  <h2 className="text-3xl font-black uppercase tracking-tighter italic text-white">RESUME FLOW</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mt-1">ACTIVE PRODUCTION SEQUENCES</p>
                </div>
                <button
                  onClick={() => setShowProjectsOverlay(false)}
                   className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white/40 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {projects.length > 0 ? (
                <div className="grid gap-4">
                  {projects.map((project) => (
                    <div 
                      key={project.id}
                      onClick={() => router.push(`/app/projects/new/${project.id}`)}
                      className="flex items-center justify-between p-6 bg-white/[0.03] border border-white/5 rounded-[2.5rem] hover:bg-white/[0.06] transition-all cursor-pointer group hover:border-purple-500/20"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center border border-white/5 group-hover:border-amber-400/30 transition-all">
                          <Play className="h-7 w-7 text-white/50 group-hover:text-amber-400 transition-all" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-lg font-black uppercase tracking-tight text-white group-hover:text-amber-400 transition-colors italic">{project.title}</span>
                          <div className="flex items-center gap-2 mt-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                             <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">In Progress • Updated recently</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-all">
                        <ArrowRight size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-20 rounded-[4rem] bg-white/[0.02] border border-dashed border-white/10 text-center space-y-5">
                  <Monitor className="w-16 h-16 text-white/5 mx-auto" />
                  <p className="text-xs font-black uppercase tracking-widest text-white/10">No unfinished projects detected in the grid</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <StrategistChat projectId="" userId={profile?.id || ''} context="studio" />

      {/* Decorative Blur Assets */}
      <div className="fixed top-1/4 -right-64 w-[800px] h-[800px] bg-purple-600/10 blur-[200px] pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-1/4 -left-64 w-[800px] h-[800px] bg-cyan-600/10 blur-[200px] pointer-events-none -z-10 animate-pulse [animation-delay:2s]" />
      
      <PremiumLimitModal 
        isOpen={!!error}
        onClose={() => setError(null)}
        title={locale === 'ru' ? 'Сбой Системы' : 'System Notice'}
        description={error || ''}
        advice={locale === 'ru' ? 'Проверьте соединение или обновите сессию.' : 'Check connection or refresh session.'}
        type="error"
        locale={locale}
      />
    </div>
  );
}
