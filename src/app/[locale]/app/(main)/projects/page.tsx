'use client';

import { useState, useEffect, useCallback } from 'react';
import { PremiumLimitModal } from '@/components/ui/PremiumLimitModal';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Sparkles, Layers, Video, Zap, Play, CheckCircle2, 
  ChevronRight, Brain, Clock, Plus, Monitor, ArrowRight
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


  return (
    <div className="space-y-0 pb-32 max-w-7xl mx-auto overflow-x-hidden">
      {/* Professional Header - Aligned with Global Strategist Logo */}
      <div className="flex items-center gap-4 pt-6 mb-8 px-6 min-h-12">
        {/* Spacer for the Fixed Strategist Orb (w-12) */}
        <div className="w-12 flex-shrink-0" />
        <div className="flex flex-col justify-center">
          <div className="space-y-0">
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-[0.8] italic">
              Viral<span className="text-purple-500">E</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.4em] font-black text-white/20 mt-1">
              AI Content Production Factory
            </p>
          </div>
        </div>
      </div>

      {/* Professional Stage Collage - Monolithic Diagonal Layout with Maximum Visibility */}
      <div className="relative group/monolith overflow-hidden bg-black space-y-[-40px]">
        {[
          {
            id: 'script',
            title: locale === 'ru' ? 'Лаборатория идей' : 'Idea Lab',
            desc: locale === 'ru' ? 'МАСТЕРСКАЯ СМЫСЛОВ И ГЕНЕРАЦИЯ ТЕКСТА' : 'CRAFT YOUR MESSAGE & GENERATE TEXT CONTENT',
            href: '/app/projects/new/script',
            image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1973&auto=format&fit=crop',
          },
          {
            id: 'recording',
            title: locale === 'ru' ? 'Студия Записи' : 'Recording Hub',
            desc: locale === 'ru' ? 'ЗАПИСЬ СУФЛЕРА, АВАТАРЫ И AI-ВИДЕО' : 'RECORD TELEPROMPTER OR GENERATE AI VIDEO',
            href: '/app/projects/new/storyboard',
            image: 'https://images.unsplash.com/photo-1590179068383-b9c69aacebd3?q=80&w=1974&auto=format&fit=crop',
          },
          {
            id: 'production',
            title: locale === 'ru' ? 'Продакшн' : 'Production Hub',
            desc: locale === 'ru' ? 'МОНТАЖ, B-ROLL И ПОСТ-ОБРАБОТКА' : 'MONTAGE, B-ROLL & FINAL POST-PROCESSING',
            href: '/app/projects/new/production',
            image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059&auto=format&fit=crop',
          }
        ].map((hub, index) => (
            <motion.div
              key={hub.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => router.push(hub.href)}
              className={`relative h-[250px] cursor-pointer group overflow-hidden ${
                index === 0 ? 'z-30' : index === 1 ? 'z-20' : 'z-10'
              }`}
              style={{
                clipPath: index === 0 ? 'polygon(0 0, 100% 0, 100% 88%, 0 100%)' :
                          index === 1 ? 'polygon(0 12%, 100% 0, 100% 88%, 0 100%)' :
                          'polygon(0 12%, 100% 0, 100% 100%, 0 100%)'
              }}
            >
              <div 
                className="relative w-full h-full transition-all duration-700 overflow-hidden active:scale-[0.99]"
              >
                {/* Subtle top shadow for depth */}
                <div className="absolute top-0 left-0 w-full h-[80px] bg-gradient-to-b from-black/50 to-transparent z-40 pointer-events-none" />

                {/* Comic Background with sharp edges */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <img 
                    src={hub.image} 
                    className="w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 transition-all duration-700 hover:scale-105" 
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
                <span className="absolute bottom-0 right-4 text-[120px] font-black text-white/[0.2] italic leading-none z-1 tracking-tighter transition-all group-hover:scale-110 group-hover:text-white/30">
                  {index + 1}
                </span>

                {/* Content Overlay */}
                <div className="relative z-10 h-full flex flex-col justify-center px-8 pt-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 block">Step {index + 1}</span>
                    <h2 className="text-4xl font-black uppercase text-white tracking-tighter italic leading-tight">
                      {hub.title}
                    </h2>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 max-w-[200px] leading-relaxed">
                      {hub.desc}
                    </p>
                  </div>
                </div>

                {/* Interaction Overlay */}
                <div className="absolute inset-0 bg-white/0 group-active:bg-white/5 transition-colors duration-300 z-50 pointer-events-none" />
              </div>
          </motion.div>
        ))}
      </div>

      {/* RECENT PROJECTS / RESUME - Professional Minimalism */}
      <div className="mt-8 space-y-6">
        <div className="flex items-center justify-between px-6">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Clock className="w-4 h-4 text-orange-400" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white italic">Resume Creation</h2>
           </div>
           <Link href="/app/library" className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors">View All</Link>
        </div>

        {projects.length > 0 ? (
          <div className="px-6 space-y-3">
            {projects.slice(0, 3).map((project) => (
               <div 
                key={project.id}
                onClick={() => router.push(`/app/projects/new/${project.id}`)}
                className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-white/5 group-hover:border-purple-500/30 transition-all">
                      <Play className="h-5 w-5 text-white/50 group-hover:text-purple-400 transition-all" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-tight text-white/80">{project.title}</span>
                      <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Updated recently</span>
                   </div>
                </div>
                <ArrowRight className="h-4 w-4 text-white/10 group-hover:text-white transition-all group-hover:translate-x-1" />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-[3rem] bg-white/[0.02] border border-dashed border-white/10 text-center space-y-4 mx-2">
             <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No active sequences found</p>
             <Link href="/app/projects/new" className="text-[10px] font-black uppercase tracking-widest text-purple-400 hover:underline">
               Initialize First Project
             </Link>
          </div>
        )}
      </div>

      <StrategistChat 
        projectId="" 
        userId={profile?.id || ''} 
        context="studio"
      />

      {/* Decorative Assets */}
      <div className="fixed top-1/4 -right-64 w-[600px] h-[600px] bg-purple-600/5 blur-[150px] pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-1/4 -left-64 w-[600px] h-[600px] bg-blue-600/5 blur-[150px] pointer-events-none -z-10 animate-pulse [animation-delay:2s]" />
      
      <PremiumLimitModal 
        isOpen={!!error}
        onClose={() => setError(null)}
        title={locale === 'ru' ? 'Сбой Системы' : 'System Notice'}
        description={error || ''}
        advice={locale === 'ru' ? 'Попробуй проверить соединение или освежить сессию. Конвейер иногда требует перезагрузки.' : 'Try checking your connection or refreshing your session. The engine occasionally needs a restart.'}
        type="error"
        locale={locale}
      />
    </div>
  );
}
