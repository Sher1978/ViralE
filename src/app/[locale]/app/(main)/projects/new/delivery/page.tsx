'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Copy, Download, Share2, Send, Play, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { StatusStepper } from '@/components/ui/StatusStepper';
import { renderService, RenderJob } from '@/lib/services/renderService';
import { socialService } from '@/lib/services/socialService';
import { projectService, Project, ProjectVersion } from '@/lib/services/projectService';

export default function DeliveryPage() {
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
  const [version, setVersion] = useState<ProjectVersion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLaunchingRender, setIsLaunchingRender] = useState(false);

  useEffect(() => {
    async function loadResults() {
      // ── Case 1: Have a jobId — load job status ──
      if (jobId) {
        try {
          const jobData = await renderService.getJobStatus(jobId);
          if (!jobData) {
            setError('Job not found');
          } else {
            setJob(jobData);
            const verData = await projectService.getVersion(jobData.version_id);
            setVersion(verData);
            
            // Auto-refresh if status is processing/queued
            if (jobData.status === 'queued' || jobData.status === 'processing') {
              setTimeout(() => loadResults(), 3000);
            }
          }
        } catch (err) {
          console.error('Failed to load delivery results:', err);
          setError('Failed to connect to production system');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // ── Case 2: No jobId — load from projectId directly ──
      if (projectId) {
        try {
          const verData = await projectService.getLatestVersion(projectId);
          if (verData) {
            setVersion(verData);
            // AUTO-LAUNCH RENDER if no jobId provided
            handleLaunchRender(projectId, verData.id);
          }
        } catch (err) {
          console.error('Failed to load project version:', err);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      setError('Проект не найден. Вернитесь в студию.');
      setIsLoading(false);
    }
    loadResults();
  }, [jobId, projectId]);

  const handleLaunchRender = async (pId?: string, vId?: string) => {
    const targetProjectId = pId || projectId;
    const targetVersionId = vId || version?.id;
    
    if (!targetProjectId || isLaunchingRender) return;
    
    setIsLaunchingRender(true);
    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: targetProjectId, versionId: targetVersionId })
      });
      
      const data = await response.json();
      if (response.ok && data.jobId) {
        router.push(`/${locale}/app/projects/new/delivery?projectId=${targetProjectId}&jobId=${data.jobId}`);
      } else {
        throw new Error(data.error || 'Failed to start render');
      }
    } catch (err: any) {
      console.error('Render launch failed:', err);
      setError(err.message || 'Ошибка запуска рендера');
    } finally {
      setIsLaunchingRender(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-mint-400" />
        <p className="text-sm text-white/40 uppercase tracking-widest font-black">Retrieving Artifacts...</p>
      </div>
    );
  }

  if (error || (job && job.status === 'failed')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="p-6 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 text-center space-y-4 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-black text-white uppercase tracking-tighter">Delivery Failed</h2>
          <p className="text-sm text-white/40">
            {error || job?.error_log || 'An unknown error occurred during the render process.'}
          </p>
        </div>
        <button 
          onClick={() => router.push(`/${locale}/app/dashboard`)}
          className="px-8 py-3 rounded-full bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const scriptData = version?.script_data as { hook: string; context: string; meat: string; cta: string } || null;
  const TEXT_OUTPUTS = [
    {
      platform: 'Telegram',
      icon: '✈️',
      accent: '#4D9EFF',
      text: scriptData ? `${scriptData.hook}\n\n${scriptData.context}\n\n${scriptData.meat}\n\n${scriptData.cta}` : '',
    },
    {
      platform: 'Twitter / X',
      icon: '🐦',
      accent: '#1DA1F2',
      text: scriptData ? `${scriptData.hook.substring(0, 200)}... #ViralEngine` : '',
    },
    {
      platform: 'Instagram',
      icon: '📸',
      accent: '#E4405F',
      text: scriptData ? `${scriptData.hook}\n\n${scriptData.meat}\n\n#ViralEngine #Reels` : '',
    },
    {
      platform: 'TikTok',
      icon: '🎵',
      accent: '#00F2EA',
      text: scriptData ? `${scriptData.hook}\n\n#ViralEngine #Trends` : '',
    },
    {
      platform: 'LinkedIn',
      icon: '💼',
      accent: '#0077B5',
      text: scriptData ? `New insights:\n\n${scriptData.meat}` : '',
    },
  ];

  const getProviderKey = (platform: string): 'instagram' | 'tiktok' | 'youtube' | null => {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) return 'instagram';
    if (p.includes('tiktok')) return 'tiktok';
    if (p.includes('youtube')) return 'youtube';
    return null;
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Status */}
      <StatusStepper currentStep={job?.status === 'completed' ? 'done' : 'processing'} />

      {/* Rendering / Success header */}
      <div
        className="rounded-3xl p-6 text-center space-y-4"
        style={{
          background: job?.status === 'completed' 
            ? 'linear-gradient(135deg, rgba(0,255,204,0.08) 0%, rgba(155,95,255,0.05) 100%)'
            : 'linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(59,130,246,0.05) 100%)',
          border: job?.status === 'completed'
            ? '1px solid rgba(0,255,204,0.15)'
            : '1px solid rgba(168,85,247,0.2)',
        }}
      >
        <div className={`text-5xl ${job?.status === 'completed' ? 'animate-float' : ''}`}>
          {job?.status === 'completed' ? '🎉' : '⚙️'}
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase text-white">
            {job?.status === 'completed' ? t('badge') : 'Видео в процессе...'}
          </h1>
          <p className="text-[11px] text-white/40 mt-1">
            {job?.status === 'completed' ? t('statusSub') : `Пожалуйста, подождите. Прогресс: ${job?.progress || 0}%`}
          </p>
        </div>

        {/* Loading Bar for processing */}
        {job && job.status !== 'completed' && (
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${job.progress || 10}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}

        {/* Delivery chips */}
        <div className="flex justify-center gap-2 flex-wrap">
          {[
            t('videoMp4'),
            t('textsCount', { n: 5 }),
            t('carouselSlides', { n: 8 })
          ].map((item) => (
            <span
              key={item}
              className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── Auto-launching state ── */}
      {!job && isLaunchingRender && (
        <div className="rounded-3xl p-8 bg-purple-500/5 border border-purple-500/20 text-center animate-pulse">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400">Initializing Engine...</p>
        </div>
      )}

      {/* Video preview card - Now using real output_url */}
      <div
        className="rounded-[2rem] overflow-hidden group shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #1a0a2e 0%, #0d0d1a 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          aspectRatio: '9/16', // Vertical video format
          maxHeight: '500px',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {job?.output_url ? (
          <video 
            src={job.output_url} 
            controls 
            className="w-full h-full object-cover"
            poster={version?.preview_url}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400 animate-pulse">
              Generating Final Cut...
            </p>
          </div>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-between pointer-events-none"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
            {t('videoMeta', { n: 65, category: locale === 'ru' ? 'Авто Эксперт' : 'Car Expert' })}
          </span>
          <div className="flex gap-2 pointer-events-auto">
            <a href={job?.output_url} download className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors">
              <Download className="w-4 h-4 text-white" />
            </a>
            <button className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors">
              <Share2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Text Outputs */}
      <div className="space-y-4 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 ml-1">
          {t('statusSub')}
        </p>
        <div className="space-y-3">
          {TEXT_OUTPUTS.map((output) => (
            <div
              key={output.platform}
              className="rounded-3xl p-5 space-y-4"
              style={{
                background: 'rgba(11,18,41,0.6)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{output.icon}</span>
                  <span
                    className="text-[11px] font-black uppercase tracking-widest"
                    style={{ color: output.accent }}
                  >
                    {output.platform}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: `${output.accent}15`,
                      border: `1px solid ${output.accent}25`,
                      color: output.accent,
                    }}
                    onClick={() => handleCopy(output.text)}
                  >
                    <Copy className="w-3 h-3" />
                    {t('copyBtn')}
                  </button>
                  
                  {/* Automated Posting Button */}
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80 active:scale-95"
                    style={{
                      background: output.accent,
                      color: '#000',
                    }}
                    onClick={() => {
                        const provider = getProviderKey(output.platform);
                        if (provider) {
                            window.location.href = socialService.getAuthUrl(provider);
                        } else {
                            handleCopy(output.text);
                        }
                    }}
                  >
                    <Share2 className="w-3 h-3" />
                    Connect & Post
                  </button>
                </div>
              </div>
              <p className="text-[12px] text-white/60 leading-relaxed font-medium">
                {output.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Carousel link */}
      <div
        className="rounded-3xl p-5 flex items-center justify-between"
        style={{
          background: 'rgba(155,95,255,0.08)',
          border: '1px solid rgba(155,95,255,0.2)',
        }}
      >
        <div className="flex items-center gap-4">
          <span className="text-3xl">🖼️</span>
          <div>
            <p className="text-sm font-black uppercase tracking-tight text-white/90">{t('instaCarousel')}</p>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{t('carouselMeta', { n: 8 })}</p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all bg-purple-500/20 hover:bg-purple-500/30">
          <Download className="w-5 h-5" style={{ color: '#9B5FFF' }} />
        </button>
      </div>

      {/* Open in Telegram */}
      <div
        className="flex items-center justify-between p-5 rounded-3xl"
        style={{
          background: 'rgba(77,158,255,0.08)',
          border: '1px solid rgba(77,158,255,0.2)',
        }}
      >
        <div className="flex items-center gap-4">
          <Send className="w-6 h-6" style={{ color: '#4D9EFF' }} />
          <div>
            <p className="text-sm font-black uppercase tracking-tight text-white/90">{t('openTg')}</p>
            <p className="text-[10px] font-bold text-white/30 tracking-widest uppercase">{t('botName')}</p>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest"
          style={{ background: 'rgba(0,255,204,0.15)', color: '#00FFCC', border: '1px solid rgba(0,255,204,0.2)' }}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          {t('delivered')}
        </div>
      </div>

      {/* New content button */}
      <div className="pt-6">
        <Link href={`/${locale}/app/dashboard`}>
          <button className="btn-primary w-full rounded-[2rem] py-5 flex items-center justify-center gap-3 group">
            <span className="text-xl">⚡</span>
            <span className="font-black text-sm uppercase tracking-widest">{t('createMore')}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </Link>
      </div>
    </div>
  );
}
