'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/navigation';
import { 
  Play, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Layout, 
  ArrowRight,
  MoreVertical,
  Layers,
  Archive,
  RotateCcw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

export interface Project {
  id: string;
  title?: string;
  topic_title?: string;
  status: 'ideation' | 'scripting' | 'storyboard' | 'rendering' | 'completed' | 'error' | 'archived';
  created_at: string;
  updated_at: string;
  metadata?: {
    video_url?: string;
    script?: any;
    storyboard?: any;
    credits_used?: number;
    format?: 'vertical' | 'square' | 'horizontal';
  };
}

interface ProjectCardProps {
  project: Project;
  onRefresh?: () => void;
}

export default function ProjectCard({ project, onRefresh }: ProjectCardProps) {
  const t = useTranslations('projects');
  const locale = useLocale();
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);

  const getStatusConfig = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          label: t('status.completed'),
          bgColor: 'bg-emerald-500/10',
          textColor: 'text-emerald-400',
          borderColor: 'border-emerald-500/20'
        };
      case 'archived':
        return {
          icon: <Archive className="w-4 h-4 text-white/40" />,
          label: t('status.archived') || 'Archived',
          bgColor: 'bg-white/5',
          textColor: 'text-white/40',
          borderColor: 'border-white/10'
        };
      case 'rendering':
// ... (rest of getStatusConfig)
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-rose-400" />,
          label: t('status.error'),
          bgColor: 'bg-rose-500/10',
          textColor: 'text-rose-400',
          borderColor: 'border-rose-500/20'
        };
      default:
        return {
          icon: <Layers className="w-4 h-4 text-purple-400" />,
          label: t(`status.${status}`),
          bgColor: 'bg-purple-500/10',
          textColor: 'text-purple-400',
          borderColor: 'border-purple-500/20'
        };
    }
  };

  const config = getStatusConfig(project.status);
  const date = new Date(project.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });

  const handleAction = () => {
    if (project.status === 'archived') return;

    // Determine the step based on status
    let path = `/app/projects/${project.id}`;
    
    if (project.status === 'completed') {
      path = `/app/projects/${project.id}/delivery`;
    } else if (project.status === 'scripting' || project.status === 'ideation') {
      // Use standard localized path, the router handles the [locale] prefix
      path = `/app/projects/${project.id}/studio`; 
    } else if (project.status === 'storyboard' || project.status === 'rendering') {
      path = `/app/projects/${project.id}/studio`;
    }

    router.push(path);
  };
  
  const handleIterate = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/app/projects/new/script?fromProjectId=${project.id}`);
  };

  const handleArchiveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsArchiving(true);
      const newStatus = project.status === 'archived' ? 'completed' : 'archived';
      
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, status: newStatus }),
      });

      if (res.ok && onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to toggle archive status:', err);
    } finally {
      setIsArchiving(false);
    }
  };

  const projectTitle = project.topic_title || project.title || 'Untitled Project';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative cursor-pointer"
      onClick={handleAction}
    >
      <div className={`aspect-square rounded-[2.5rem] border ${config.borderColor} bg-white/[0.03] backdrop-blur-xl overflow-hidden transition-all duration-500 group-hover:border-white/30 ${project.status === 'archived' ? 'opacity-60' : ''}`}>
        
        {/* Visual Background */}
        <div className="absolute inset-0 z-0">
          {project.metadata?.video_url ? (
            <video 
              src={project.metadata.video_url} 
              className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700"
              muted
              loop
              playsInline
              autoPlay
            />
          ) : (
            <div className="w-full h-full relative overflow-hidden bg-[#0a0a14]">
              {/* Dynamic Abstract Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-transparent to-emerald-600/10" />
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full animate-pulse [animation-delay:1s]" />
              <div className="w-full h-full flex flex-col items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
                <Layers className="w-16 h-16 text-white mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest">Neural Seed</span>
              </div>
            </div>
          )}
          {/* Rich Vignette & Glass Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] via-transparent to-[#0a0a14]/40 opacity-80" />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 h-full p-8 flex flex-col justify-between">
          {/* Top: Status Tag */}
          <div className="flex justify-between items-start">
            <div className={`px-4 py-2 rounded-2xl text-[9px] font-black tracking-widest uppercase flex items-center gap-2 ${config.bgColor} ${config.textColor} border ${config.borderColor} backdrop-blur-xl shadow-lg`}>
              <div className="relative">
                {config.icon}
                {project.status !== 'completed' && project.status !== 'archived' && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-ping" />
                )}
              </div>
              {config.label}
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); }}
              className="w-10 h-10 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/5 text-white/40 group-hover:text-white transition-all flex items-center justify-center backdrop-blur-md"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom: Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-black text-white leading-[1.1] tracking-tight group-hover:text-purple-300 transition-colors line-clamp-2">
                {projectTitle}
              </h3>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Updated {date}
              </p>
            </div>
            
            <div className="flex items-center justify-between gap-4 pt-2 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
              <div className="flex items-center gap-2">
                {project.status === 'completed' && (
                  <button
                    onClick={handleIterate}
                    className="w-10 h-10 rounded-xl bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white border border-purple-500/30 transition-all flex items-center justify-center group/btn"
                    title={t('iterateBtn')}
                  >
                    <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                  </button>
                )}
                <button
                  onClick={handleArchiveToggle}
                  disabled={isArchiving}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/5 text-white/20 hover:text-rose-400 transition-all flex items-center justify-center"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-purple-500 flex items-center justify-center text-black shadow-xl shadow-purple-500/20 hover:scale-110 active:scale-95 transition-all">
                <ArrowRight className="w-6 h-6 stroke-[3]" />
              </div>
            </div>

            {/* Precision Progress Indicator */}
            <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: project.status === 'completed' ? '100%' : '65%' }}
                className={`absolute inset-y-0 left-0 rounded-full ${project.status === 'completed' ? 'bg-emerald-400 shadow-[0_0_10px_#10B981]' : 'bg-purple-500 shadow-[0_0_10px_#A855F7]'}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ambient Outer Glow */}
      <div className={`absolute -inset-1 rounded-[2.8rem] bg-gradient-to-br ${project.status === 'completed' ? 'from-emerald-500/0 via-emerald-500/0 to-emerald-500/0' : 'from-purple-500/0 via-purple-500/0 to-purple-500/0'} group-hover:opacity-20 transition-opacity blur-xl -z-10`} />
    </motion.div>
  );
}
