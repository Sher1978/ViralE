'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/navigation';
import { CheckCircle, Copy, Download, Share2, Send, Play, ArrowRight, ArrowLeft, Loader2, AlertCircle, HardDrive, Image as ImageIcon, Folder, Plus } from 'lucide-react';
import { StatusStepper } from '@/components/ui/StatusStepper';
import { renderService, RenderJob } from '@/lib/services/renderService';
import { socialService } from '@/lib/services/socialService';
import { motion, AnimatePresence } from 'framer-motion';
import { projectService, Project, ProjectVersion } from '@/lib/services/projectService';
import { idb } from '@/lib/idb';
import { supabase } from '@/lib/supabase';
import DistributionFactory from '../../[id]/studio/_components/DistributionFactory';
import { Suspense } from 'react';

function DeliveryPageContent() {
  const t = useTranslations('delivery');
  const commonT = useTranslations('common');
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;

  const jobId = searchParams.get('jobId');
  const projectId = searchParams.get('projectId');

  const [isLoading, setIsLoading] = useState(true);
  const [job, setJob] = useState<RenderJob | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [version, setVersion] = useState<ProjectVersion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const manifest = version?.script_data as any;
  const distributionAssets = manifest?.distributionAssets as any;
  const distributionImages = manifest?.distributionImages as Record<string, string> || {};

  const scriptData = {
    hook: manifest?.hook || manifest?.script?.hook || manifest?.scriptText?.split('\n')?.[0] || manifest?.segments?.[0]?.scriptText?.split('\n')?.[0] || '',
    context: manifest?.context || manifest?.script?.context || '',
    meat: manifest?.subtitleClips?.map((s: any) => s.text).join(' ') || manifest?.customScript || manifest?.scriptText || manifest?.meat || manifest?.script?.meat || manifest?.segments?.map((s: any) => s.scriptText).join('\n\n') || '',
    cta: manifest?.cta || manifest?.script?.cta || '',
  };

  const TEXT_OUTPUTS = [
    {
      platform: 'Telegram',
      icon: '✈️',
      accent: '#4D9EFF',
      text: distributionAssets?.sfv_description?.text || (scriptData ? `${scriptData.hook}\n\n${scriptData.meat}\n\n${scriptData.cta}` : ''),
    },
    {
      platform: 'Twitter / X',
      icon: '🐦',
      accent: '#1DA1F2',
      text: distributionAssets?.deep_content?.threads_fb_text || (scriptData ? `${scriptData.hook.substring(0, 200)}... #ViralEngine` : ''),
    },
    {
      platform: 'Instagram',
      icon: '📸',
      accent: '#E4405F',
      text: distributionAssets?.sfv_description?.text || (scriptData ? `${scriptData.hook}\n\n${scriptData.meat}\n\n#ViralEngine #Reels` : ''),
    },
    {
      platform: 'TikTok',
      icon: '🎵',
      accent: '#00F2EA',
      text: distributionAssets?.sfv_description?.text || (scriptData ? `${scriptData.hook}\n\n#ViralEngine #Trends` : ''),
    },
    {
      platform: 'LinkedIn',
      icon: '💼',
      accent: '#0077B5',
      text: distributionAssets?.linkedin_executive?.text || (scriptData ? `New insights:\n\n${scriptData.meat}` : ''),
    },
  ];

  const downloadTXT = () => {
    const texts = TEXT_OUTPUTS.map(o => `[${o.platform}]\n${o.text}\n`).join('\n---\n\n');
    const blob = new Blob([texts], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const doc = (globalThis as any).document;
    if (doc) {
      const a = doc.createElement('a');
      a.href = url;
      a.download = `ViralEngine_Texts_${projectId}.txt`;
      a.click();
    }
  };

  const handleDownload = async () => {
    if (!job?.output_url) return;
    
    // Try native share first on mobile
    const nav = (globalThis as any).navigator;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(nav?.userAgent || '');
    if (isMobile && nav?.share && job.output_url.startsWith('blob:')) {
      try {
        const res = await fetch(job.output_url);
        const blob = await res.blob();
        const file = new File([blob], `ViralEngine_Final_${projectId}.mp4`, { type: 'video/mp4' });
        
        if (nav.canShare && nav.canShare({ files: [file] })) {
          await nav.share({
            files: [file],
            title: 'Viral Engine Video',
            text: 'Check out my AI-generated video!'
          });
          return;
        }
      } catch (e) {
        console.warn('[Delivery] Native share failed:', e);
      }
    }

    // Standard download fallback
    try {
      const doc = (globalThis as any).document;
      if (doc) {
        const link = doc.createElement('a');
        link.href = job.output_url;
        link.download = `ViralEngine_Final_${projectId}.mp4`;
        doc.body.appendChild(link);
        link.click();
        doc.body.removeChild(link);
      }
    } catch (err) {
      if (typeof (globalThis as any).window !== 'undefined') {
        (globalThis as any).window.open(job.output_url, '_blank');
      }
    }
  };

  const handleExport = async (target: 'telegram' | 'drive') => {
    setIsExporting(true);
    await new Promise(r => setTimeout(r, 1500));
    if (target === 'telegram') {
      if (typeof (globalThis as any).window !== 'undefined') {
        (globalThis as any).window.open('https://t.me/ViralEngine_Bot', '_blank');
      }
    } else {
      (globalThis as any).alert?.('Загрузка на Google Drive начата.');
    }
    setIsExporting(false);
  };

  const handleCopy = (text: string) => {
    ((globalThis as any).navigator)?.clipboard?.writeText(text);
  };

  // Phase 7: Automate launching server-side render if jobId is not specified
  useEffect(() => {
    async function initServerlessFlow() {
      if (!projectId) {
        setError('Проект не найден');
        setIsLoading(false);
        return;
      }

      try {
        const verData = await projectService.getLatestVersion(projectId);
        if (!verData) {
          throw new Error('Последняя версия проекта не найдена');
        }
        setVersion(verData);

        if (verData.script_data?.aRollUrl) {
          setPreviewUrl(verData.script_data.aRollUrl);
        }

        if (jobId) {
          // If we already have a jobId in the query params, let the Realtime effect track it
          return;
        }

        // Auto-launch the serverless API
        setRenderStatus('Инициализация серверной сборки...');
        setIsLoading(true);

        const response = await fetch(`/api/projects/${projectId}/launch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: verData.script_data?.mode || 'pure',
            tier: verData.script_data?.tier || 'standard',
            versionId: verData.id,
            aiPolish: verData.script_data?.ai_look_polish || false,
            assetId: verData.script_data?.selected_asset_id || null,
            recordedAssetId: verData.script_data?.recordedAssetId || null
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Не удалось запустить серверный рендеринг');
        }

        const launchData = await response.json();
        if (launchData.success && launchData.jobId) {
          console.log('[Delivery] Serverless render launched. Job ID:', launchData.jobId);
          // Redirect the browser dynamically, which triggers the realtime channel subscription automatically
          router.replace(`/app/projects/new/delivery?projectId=${projectId}&jobId=${launchData.jobId}`);
        } else {
          throw new Error('Ответ сервера не содержит ID задачи рендеринга');
        }

      } catch (err: any) {
        console.error('[Delivery] Auto-launch failed:', err);
        setError(err.message || 'Ошибка запуска серверного рендеринга');
        setIsLoading(false);
      }
    }

    initServerlessFlow();
  }, [projectId, jobId]);

  // Phase 6: Realtime Postgres subscription for background serverless rendering
  useEffect(() => {
    if (!jobId) return;

    console.log('[Realtime] Subscribing to render job status updates for:', jobId);
    setIsLoading(true);

    // 1. Fetch initial job state
    renderService.getJobStatus(jobId).then((initialJob) => {
      if (initialJob) {
        setJob(initialJob);
        setRenderProgress(initialJob.progress || 0);
        setRenderStatus(
          initialJob.status === 'completed'
            ? 'Готово!'
            : initialJob.status === 'failed'
            ? 'Ошибка сборки'
            : 'Сборка проекта на сервере...'
        );
        if (initialJob.status === 'failed') {
          setError(initialJob.error_log || 'Ошибка сборки видео на сервере');
        }
      }
      setIsLoading(false);
    }).catch(err => {
      console.error('[Realtime] Failed to load initial job status:', err);
      setIsLoading(false);
    });

    const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public';

    // 2. Subscribe to realtime Postgres changes for this job in the active schema
    const channel = supabase
      .channel(`render_job_updates_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: schema,
          table: 'render_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload: any) => {
          const updatedJob = payload.new as RenderJob;
          console.log('[Realtime] Job updated:', updatedJob);
          setJob(updatedJob);
          if (typeof updatedJob.progress === 'number') {
            setRenderProgress(updatedJob.progress);
          }
          if (updatedJob.status === 'completed') {
            setRenderStatus('Готово!');
          } else if (updatedJob.status === 'failed') {
            setError(updatedJob.error_log || 'Ошибка сборки видео на сервере');
          } else {
            setRenderStatus('Сборка проекта на сервере...');
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[Realtime] Unsubscribing from render job updates for:', jobId);
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    let pollInterval: any;
    if (projectId && !distributionAssets) {
      pollInterval = setInterval(async () => {
        const ver = await projectService.getLatestVersion(projectId);
        if (ver?.script_data?.distributionAssets) {
          setVersion(ver);
          if (job?.status === 'completed') {
            clearInterval(pollInterval);
          }
        }
      }, 5000);
    }
    return () => clearInterval(pollInterval);
  }, [projectId, !!distributionAssets, job?.status]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-mint-400" />
        <p className="text-sm text-white/40 uppercase tracking-widest font-black">Retrieving Artifacts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 max-w-2xl mx-auto px-4 py-8">
        <div className="p-8 rounded-[2.5rem] bg-red-500/5 border border-red-500/20 text-center space-y-5 w-full backdrop-blur-md relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/50 via-red-600/30 to-transparent" />
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Delivery Failed</h2>
          <p className="text-sm text-red-200/80 font-semibold leading-relaxed">{error.trim()}</p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => router.push(`/app/projects/${projectId}/studio?tab=assembly`)} 
            className="px-8 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            {locale === 'ru' ? 'В монтажку' : 'Back to Montage'}
          </button>
          <button 
            onClick={() => (globalThis as any).window?.location?.reload()} 
            className="px-8 py-3.5 rounded-2xl bg-purple-600 text-white text-xs font-black uppercase tracking-widest hover:bg-purple-500 shadow-lg shadow-purple-900/40 active:scale-95 transition-all"
          >
            {locale === 'ru' ? 'Повторить' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 px-4 rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-md">
        {/* Left: Back to Montage */}
        <button 
          onClick={() => router.push(`/app/projects/${projectId}/studio?tab=assembly`)} 
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 active:scale-95 transition-all w-full md:w-auto"
        >
          <ArrowLeft size={14} /> {locale === 'ru' ? 'В МОНТАЖКУ' : 'BACK TO STUDIO'}
        </button>

        {/* Center: Title / Logo */}
        <div className="hidden md:flex flex-col items-center">
          <span className="text-[11px] font-black text-white/40 tracking-[0.3em] uppercase">Delivery Lab</span>
          <span className="text-[8px] font-bold text-purple-400/60 uppercase tracking-widest mt-0.5">Finalizing Project</span>
        </div>

        {/* Right: Quick actions for Library & New Script */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Library Link */}
          <button 
            onClick={() => router.push('/app/projects')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600/10 to-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-widest hover:from-blue-600/20 hover:to-blue-500/20 active:scale-95 transition-all"
          >
            <Folder size={14} className="text-blue-400" />
            {locale === 'ru' ? 'БИБЛИОТЕКА' : 'LIBRARY'}
          </button>

          {/* New Project Link */}
          <button 
            onClick={() => router.push('/app/projects/new/script')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600/15 to-purple-500/15 border border-purple-500/25 text-purple-300 text-[10px] font-black uppercase tracking-widest hover:from-purple-600/25 hover:to-purple-500/25 active:scale-95 transition-all shadow-lg shadow-purple-950/20"
          >
            <Plus size={14} className="text-purple-400" />
            {locale === 'ru' ? 'НОВЫЙ ПРОЕКТ' : 'NEW PROJECT'}
          </button>
        </div>
      </div>

      <StatusStepper currentStep={job?.status === 'completed' ? 'done' : 'processing'} />

      <div className="rounded-3xl p-6 text-center space-y-4 bg-white/[0.02] border border-white/5">
        <div className="text-4xl">{job?.status === 'completed' ? '🎬' : '⚡'}</div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase text-white">
            {job?.status === 'completed' ? t('badge') : (renderStatus || 'Сборка проекта...')}
          </h1>
          <p className="text-[11px] text-white/40 mt-1 font-bold uppercase tracking-widest">
            {job?.status === 'completed' ? t('statusSub') : `Пожалуйста, подождите. Прогресс: ${Math.round(renderProgress)}%`}
          </p>
        </div>
        {job?.status !== 'completed' && (
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <motion.div 
                className="h-full bg-gradient-to-r from-purple-600 to-blue-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" 
                initial={{ width: 0 }} 
                animate={{ width: `${Math.max(0, Math.min(100, renderProgress))}%` }} 
                transition={{ type: 'spring', damping: 25, stiffness: 50 }}
            />
          </div>
        )}
      </div>

      {job?.output_url && (
        <div className="rounded-[2.5rem] p-6 bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 space-y-4 text-center shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block">ГОТОВЫЙ ФАЙЛ ДОСТУПЕН</span>
            <h2 className="text-lg font-black text-white uppercase tracking-tighter">Ваше видео успешно экспортировано!</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            {/* Direct Download Button */}
            <button 
              onClick={handleDownload}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-purple-900/40"
            >
              <Download size={16} />
              {locale === 'ru' ? 'СКАЧАТЬ MP4' : 'DOWNLOAD MP4'}
            </button>

            {/* Direct Link / Copy Link Button */}
            <button 
              onClick={() => {
                if (job?.output_url) {
                  (globalThis.navigator as any)?.clipboard?.writeText(job.output_url);
                  (globalThis as any).alert?.(locale === 'ru' ? 'Прямая ссылка скопирована в буфер обмена!' : 'Direct link copied to clipboard!');
                }
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              <Copy size={16} className="text-purple-400" />
              {locale === 'ru' ? 'СКОПИРОВАТЬ ССЫЛКУ' : 'COPY DIRECT LINK'}
            </button>
          </div>

          {/* Direct link preview */}
          <div className="pt-2 border-t border-white/5">
            <p className="text-[8px] text-white/30 uppercase tracking-wider">Прямая ссылка на сервере:</p>
            <a 
              href={job.output_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[9px] text-blue-400 hover:text-blue-300 font-mono break-all underline block mt-1"
            >
              {job.output_url}
            </a>
          </div>
        </div>
      )}

      <div className="rounded-[2.5rem] overflow-hidden bg-[#050508] border border-white/10 aspect-[9/16] max-h-[500px] mx-auto relative shadow-2xl group">
        {job?.output_url ? (
          <video src={job.output_url} controls className="w-full h-full object-cover" />
        ) : (
          <div className="relative w-full h-full">
            {previewUrl && (
              <video 
                src={previewUrl} 
                autoPlay 
                muted 
                loop 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover transition-all duration-1000" 
                style={{ 
                    filter: `blur(${Math.max(0, 12 - (renderProgress / 100) * 12)}px) brightness(${0.4 + (renderProgress / 100) * 0.6})`,
                    opacity: 0.3 + (renderProgress / 100) * 0.7
                }}
              />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-purple-500/40 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center animate-pulse">
                        <Play size={16} className="text-purple-400 translate-x-0.5" />
                    </div>
                </div>
              </div>
              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.5em] text-purple-400 animate-pulse">Generating Final Cut</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-8 flex items-center justify-between bg-gradient-to-t from-black via-black/40 to-transparent">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50">4K AI PRODUCTION</span>
            <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-purple-400">Ready for Broadcast</span>
          </div>
          <div className="flex gap-3">
            {job?.output_url && (
              <button 
                onClick={handleDownload}
                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-black uppercase tracking-widest hover:bg-purple-500/20 hover:border-purple-500/50 hover:scale-105 active:scale-95 transition-all shadow-[0_10px_40px_rgba(168,85,247,0.15)]"
              >
                <Download size={16} /> {/iPhone|iPad|iPod|Android/i.test(((globalThis as any).navigator)?.userAgent || '') ? (locale === 'ru' ? 'СОХРАНИТЬ / ПОДЕЛИТЬСЯ' : 'SAVE / SHARE') : (locale === 'ru' ? 'СКАЧАТЬ ВИДЕО' : 'DOWNLOAD VIDEO')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Distribution Factory - Main Area */}
      <section id="distribution-section" className="pt-10 space-y-6">
        <div className="w-full">
          <DistributionFactory 
            manifest={manifest}
            scriptText={scriptData.meat || "Video Content Analysis"}
            projectId={projectId as string}
            locale={locale}
            onUpdateManifest={(newManifest: any) => {
               setVersion(prev => (prev ? { ...prev, script_data: newManifest } : prev) as any);
               if (projectId) {
                 projectService.updateLatestVersionManifest(projectId, newManifest);
               }
            }}
          />
        </div>
      </section>
    </div>
  );
}

export default function DeliveryPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" /></div>}>
      <DeliveryPageContent />
    </Suspense>
  );
}
