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
    let path = `/${project.id}`;
    
    if (project.status === 'completed') {
      path = `/projects/${project.id}/delivery`;
    } else if (project.status === 'scripting' || project.status === 'ideation') {
      path = `/projects/new/script?projectId=${project.id}`;
    } else if (project.status === 'storyboard') {
      path = `/projects/new/storyboard?projectId=${project.id}`;
    } else if (project.status === 'rendering') {
      path = `/projects/new/production?projectId=${project.id}`;
    }

    // Localized router handles prefix automatically
    router.push(path);
  };
  
  const handleIterate = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/projects/new/script?fromProjectId=${project.id}`);
  };

  const handleArchiveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsArchiving(true);
      const newStatus = project.status === 'archived' ? 'completed' : 'archived'; // Default back to completed if restoring, or we could store prev status
      
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group relative"
    >
      <div className={`p-5 rounded-3xl border ${config.borderColor} bg-white/[0.03] backdrop-blur-xl transition-all duration-300 group-hover:bg-white/[0.05] group-hover:border-white/20 ${project.status === 'archived' ? 'opacity-60' : ''}`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
            {config.icon}
            {config.label}
          </div>
          <button className="p-1 rounded-full hover:bg-white/10 transition-colors text-white/40 group-hover:text-white/80">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-lg font-medium text-white mb-2 line-clamp-2 min-h-[3.5rem] leading-snug">
          {projectTitle}
        </h3>

        {/* Progress Bar (Visual Only for now) */}
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-5">
          <div 
            className={`h-full ${project.status === 'completed' ? 'bg-emerald-500' : project.status === 'archived' ? 'bg-white/10' : 'bg-purple-500'} transition-all duration-1000`} 
            style={{ width: project.status === 'completed' || project.status === 'archived' ? '100%' : '65%' }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-[11px] text-white/40 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {date}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-hidden">
            {project.status !== 'archived' ? (
              <>
                <button
                  onClick={handleAction}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-xs font-medium transition-all group/btn whitespace-nowrap"
                >
                  {project.status === 'completed' ? t('viewBtn') : t('continueBtn')}
                  <ArrowRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-1" />
                </button>
                
                <button
                  onClick={handleArchiveToggle}
                  disabled={isArchiving}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all disabled:opacity-50"
                  title="Archive"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </>
            ) : (
                <button
                onClick={handleArchiveToggle}
                disabled={isArchiving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-medium transition-all group/btn"
              >
                <RotateCcw className="w-3 h-3" />
                {t('actions.restore')}
              </button>
            )}
            
            {project.status === 'completed' && (
              <button
                onClick={handleIterate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 text-xs font-medium transition-all group/btn whitespace-nowrap"
              >
                <Layers className="w-3 h-3" />
                {t('iterateBtn')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Glossy Glow Effect on Hover */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}
