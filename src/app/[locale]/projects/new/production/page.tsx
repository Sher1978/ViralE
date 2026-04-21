'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Bot, Loader2, CheckCircle2, Factory, Zap, Timer, User, ShieldCheck, ChevronRight, Video, Mic, RefreshCw } from 'lucide-react';
import { StatusStepper } from '@/components/ui/StatusStepper';
import AvatarHub from '@/components/production/AvatarHub';
import AnimationTiers from '@/components/production/AnimationTiers';
import StudioRecorder from '@/components/production/StudioRecorder';
import { FactoryMonitor } from '@/components/production/FactoryMonitor';
import { supabase } from '@/lib/supabase';
import { profileService, Profile } from '@/lib/services/profileService';
import { projectService, Project, ProjectVersion } from '@/lib/services/projectService';
import { renderService, RenderJob } from '@/lib/services/renderService';

export default function ProductionPage() {
  const t = useTranslations('production');
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const versionId = searchParams.get('versionId');
  const locale = params.locale as string;

  const [user, setUser] = useState<Profile | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [version, setVersion] = useState<ProjectVersion | null>(null);

  const [stage, setStage] = useState<'selection' | 'processing'>('selection');
  const [progress, setProgress] = useState(0);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('pending');
  const [config, setConfig] = useState({
    mode: 'stock',
    tier: 'lite',
    assetId: null as string | null,
    aiPolish: false,
    recordedAssetId: null as string | null,
    recordingType: null as 'audio' | 'video' | null
  });
  const [showStudio, setShowStudio] = useState(false);
  const [scriptData, setScriptData] = useState<{ hook: string; story: string; cta: string } | null>(null);

  const calculateTotalCost = () => {
    let base = config.tier === 'pro' ? 50 : config.tier === 'plus' ? 25 : 10;
    if (config.mode === 'avatar') base += 20;
    if (config.aiPolish) base += 5;
    return base;
  };

  // Initialize profile and fetch project data
  useEffect(() => {
    async function init() {
      try {
        const profile = await profileService.getOrCreateProfile();
        setUser(profile);

        if (projectId) {
          const proj = await projectService.getProject(projectId);
          setProject(proj);
          
          if (versionId) {
            const ver = await projectService.getVersion(versionId);
            setVersion(ver);
            if (ver?.script_data) {
              setScriptData(ver.script_data as any);
            }
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to load project details');
      }
    }
    init();
  }, [projectId, versionId]);

  // Real status polling logic using renderService
  useEffect(() => {
    if (stage !== 'processing' || !jobId) return;

    const pollStatus = async () => {
      try {
        const job = await renderService.getJobStatus(jobId);
        if (job) {
          setJobStatus(job.status);
          
          const statusMap: Record<string, number> = {
            'pending': 10,
            'queued': 25,
            'processing': 45,
            'assembling': 80,
            'completed': 100,
            'failed': 0
          };
          
          const targetProgress = statusMap[job.status] || 0;
          
          setProgress(prev => {
            if (prev < targetProgress) return prev + 1;
            return targetProgress;
          });

          if (job.status === 'completed') {
            setTimeout(() => {
              router.push(`/${locale}/projects/new/delivery?projectId=${projectId}&jobId=${jobId}`);
            }, 2000);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    const interval = setInterval(pollStatus, 3000);
    pollStatus();

    return () => clearInterval(interval);
  }, [router, locale, stage, jobId, projectId, locale]);

  const handleLaunch = async () => {
    if (!projectId || !versionId) {
      setError('Missing project or version ID');
      return;
    }

    setIsLaunching(true);
    setError(null);

    try {
      const job = await renderService.createJob({
        projectId,
        versionId,
        config: {
          ...config,
          previewUrl: version?.preview_url
        }
      });

      setJobId(job.id);
      setJobStatus(job.status);
      setStage('processing');

      // 🔥 Trigger simulation for development environment
      // In production, this would be handled by a real worker listening to the DB
      fetch('/api/render/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      }).catch(err => console.debug('Worker trigger skipped (not in dev or failed):', err));

    } catch (err: any) {
      setError(err.message || 'Failed to launch project');
      console.error('Launch error:', err);
    } finally {
      setIsLaunching(false);
    }
  };

  const tasks = [
    { id: 1, label: t('task1'), status: progress > 20 ? 'done' : 'processing' },
    { id: 2, label: t('task2'), status: progress > 45 ? 'done' : progress > 20 ? 'processing' : 'pending' },
    { id: 3, label: t('task3'), status: progress > 65 ? 'done' : progress > 45 ? 'processing' : 'pending' },
    { id: 4, label: t('task4'), status: progress > 80 ? 'done' : progress > 65 ? 'processing' : 'pending' },
    { id: 5, label: t('task5'), status: progress > 90 ? 'done' : progress > 80 ? 'processing' : 'pending' },
    { id: 6, label: t('task6'), status: progress === 100 ? 'done' : progress > 90 ? 'processing' : 'pending' },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <StatusStepper currentStep="render" />

      {stage === 'selection' ? (
        <div className="space-y-12">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <User className="w-4 h-4 text-white/40" />
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
                {t('avatarHubTitle')}
              </h2>
            </div>
            <p className="text-sm text-white/40 max-w-md">
              Configure your visual appearance and animation quality for this project.
            </p>
          </div>

          <AvatarHub 
            onSelect={(c) => setConfig(prev => ({ ...prev, ...c }))} 
            currentConfig={config}
          />
          
          <AnimationTiers 
            onSelect={(c) => setConfig(prev => ({ ...prev, ...c }))} 
            currentConfig={config}
          />

          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold text-center animate-pulse">
              ⚠️ {error}
            </div>
          )}

          {/* Viral Studio Trigger */}
          <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[80px] -z-10 group-hover:bg-cyan-500/10 transition-all" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                    <RefreshCw className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">
                    {t('recordingStudioTitle')}
                  </h3>
                </div>
                <p className="text-sm text-white/40 max-w-sm leading-relaxed">
                  {config.recordedAssetId 
                    ? "Recording ready! You can retake if needed or proceed to launch."
                    : t('recordingStudioSub')}
                </p>
                
                {config.recordedAssetId && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-500">
                      Take Registered ({config.recordingType})
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowStudio(true)}
                className={`group relative px-10 py-6 rounded-3xl transition-all overflow-hidden flex items-center gap-4 ${config.recordedAssetId ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-white/5 border border-white/10 hover:border-white/20'}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${config.recordedAssetId ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white/40 group-hover:bg-white/20 group-hover:text-white'}`}>
                  {config.recordedAssetId ? <CheckCircle2 className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </div>
                
                <div className="text-left">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] leading-none mb-1">
                    Professional Capture
                  </p>
                  <p className="text-lg font-black text-white uppercase tracking-tighter italic leading-none">
                    {config.recordedAssetId ? "Update Recording" : t('studioToggle')}
                  </p>
                </div>
                
                <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all ml-auto" />

                {/* Animated Background Pulse */}
                {!config.recordedAssetId && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleLaunch}
              disabled={isLaunching}
              className="w-full bg-white text-black font-black py-4 rounded-[2rem] text-sm uppercase tracking-widest hover:scale-[0.98] active:scale-[0.95] transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLaunching ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Factory className="w-5 h-5" />
              )}
              {isLaunching ? 'Preparing Factory...' : t('launchBtn')}
            </button>
            <p className="text-[10px] text-center text-white/20 mt-4 uppercase tracking-[0.2em] font-bold">
              ESTIMATED COST: {calculateTotalCost()} CREDITS
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-12 py-10 animate-fade-in">
          <FactoryMonitor 
            progress={progress} 
            status={jobStatus} 
          />
          
          {jobStatus === 'failed' && (
            <div className="max-w-md mx-auto p-6 rounded-[2rem] bg-red-500/10 border border-red-500/20 text-center space-y-4">
              <p className="text-red-400 font-bold">Factory Malfunction Detected</p>
              <button 
                onClick={() => setStage('selection')}
                className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 transition-all"
              >
                Return to Control Room
              </button>
            </div>
          )}
        </div>
      )}

      {/* Studio Overlay */}
      {showStudio && scriptData && project && (
        <StudioRecorder 
          projectId={projectId as string}
          script={scriptData}
          onCancel={() => setShowStudio(false)}
          onComplete={(assetId, url) => {
            setConfig(prev => ({
              ...prev,
              recordedAssetId: assetId,
              recordingType: url.includes('video') ? 'video' : 'audio'
            }));
            setShowStudio(false);
          }}
        />
      )}
    </div>
  );
}
