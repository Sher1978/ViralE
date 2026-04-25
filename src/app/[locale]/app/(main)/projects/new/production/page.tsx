'use client';

import { useEffect, useState, Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  Bot, Loader2, CheckCircle2, Factory, Zap, Timer, 
  User, ShieldCheck, ChevronRight, Video, Mic, RefreshCw,
  Camera, Cpu, Play
} from 'lucide-react';
import { StatusStepper } from '@/components/ui/StatusStepper';
import AvatarHub from '@/components/production/AvatarHub';
import AnimationTiers from '@/components/production/AnimationTiers';
import StudioRecorder from '@/components/production/StudioRecorder';
import { FactoryMonitor } from '@/components/production/FactoryMonitor';
import { profileService, Profile } from '@/lib/services/profileService';
import { projectService, Project, ProjectVersion } from '@/lib/services/projectService';
import { renderService } from '@/lib/services/renderService';
import { StrategistChat } from '@/components/studio/StrategistChat';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumLimitModal } from '@/components/ui/PremiumLimitModal';

function ProductionContent() {
  const t = useTranslations('production');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const versionId = searchParams.get('versionId');

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
  const [activeStep, setActiveStep] = useState(1);
  const [generationStep, setGenerationStep] = useState(0);

  const loadingSteps = locale === 'ru' 
    ? ['Пробуждаем ИИ-агентов...', 'Синхронизируем звук...', 'Калибруем мимику...', 'Финальная сборка...']
    : ['Waking up AI Agents...', 'Synchronizing Audio...', 'Calibrating Motion...', 'Final Assembly...'];

  useEffect(() => {
    let interval: any;
    if (isLaunching) {
      interval = setInterval(() => {
        setGenerationStep(prev => (prev + 1) % loadingSteps.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLaunching, loadingSteps.length]);

  useEffect(() => {
    async function init() {
      if (!projectId) {
        setError(locale === 'ru' ? 'Сначала выберите проект в Студии' : 'Please select a project in the Studio first');
        return;
      }
      try {
        const profile = await profileService.getOrCreateProfile();
        setUser(profile);
        const proj = await projectService.getProject(projectId);
        setProject(proj);
        if (versionId) {
          const ver = await projectService.getVersion(versionId);
          setVersion(ver);
          if (ver?.script_data) setScriptData(ver.script_data as any);
        }
      } catch (err) {
        setError(locale === 'ru' ? 'Ошибка загрузки данных проекта' : 'Failed to load project details');
      }
    }
    init();
  }, [projectId, versionId, locale]);

  useEffect(() => {
    if (stage !== 'processing' || !jobId) return;
    const pollStatus = async () => {
      try {
        const job = await renderService.getJobStatus(jobId);
        if (job) {
          setJobStatus(job.status);
          const statusMap: Record<string, number> = { 'pending': 10, 'queued': 25, 'processing': 45, 'assembling': 80, 'completed': 100, 'failed': 0 };
          const targetProgress = statusMap[job.status] || 0;
          setProgress(prev => prev < targetProgress ? prev + 1 : targetProgress);
          if (job.status === 'completed') {
            setTimeout(() => router.push(`/app/projects/new/delivery?projectId=${projectId}&jobId=${jobId}`), 2000);
          }
        }
      } catch (err) { console.error(err); }
    };
    const interval = setInterval(pollStatus, 3000);
    pollStatus();
    return () => clearInterval(interval);
  }, [router, stage, jobId, projectId]);

  const handleLaunch = async () => {
    if (!projectId || !versionId) return;
    setIsLaunching(true);
    try {
      const job = await renderService.createJob({ projectId, versionId, config: { ...config, previewUrl: version?.preview_url } });
      setJobId(job.id);
      setJobStatus(job.status);
      setStage('processing');
    } catch (err: any) {
      setError(err.message || 'Production initialization failed');
    } finally { setIsLaunching(false); }
  };

  const calculateTotalCost = () => {
    let base = config.tier === 'pro' ? 50 : config.tier === 'standard' ? 25 : 10;
    if (config.mode === 'avatar') base += 20;
    return base;
  };

  const steps = [
    {
      id: 1,
      title: locale === 'ru' ? 'Визуальный Фундамент' : 'Visual Foundation',
      instruction: locale === 'ru' ? 'Выберите цифрового аватара или загрузите свое фото, которое станет основой видео.' : 'Choose a digital avatar or upload your photo as the video base.',
      icon: User,
      summary: config.mode === 'avatar' ? 'AI Avatar Actor' : 'DNA Upload'
    },
    {
      id: 2,
      title: locale === 'ru' ? 'Интеллект Движения' : 'Motion Intelligence',
      instruction: locale === 'ru' ? 'Выберите мощность ИИ-движка. Чем выше уровень, тем реалистичнее мимика.' : 'Choose the AI engine power. Higher tier means more realistic expressions.',
      icon: Cpu,
      summary: config.tier.toUpperCase() + ' Intelligence'
    },
    {
      id: 3,
      title: locale === 'ru' ? 'Голос и Референс' : 'Voice & Studio',
      instruction: locale === 'ru' ? 'Вы можете записать эталон своего голоса или движений для максимального сходства.' : 'Optional: Record your voice or motion reference for maximum cinematic likeness.',
      icon: Mic,
      summary: config.recordedAssetId ? 'Reference Captured' : 'Stock Performance'
    }
  ];

  return (
    <div className="space-y-0 pb-32 max-w-7xl mx-auto overflow-x-hidden">
      {/* Header - Aligned with Strategist */}
      <div className="flex flex-col pt-4 mb-4 pl-16">
        <div className="space-y-0.5">
          <h1 className="text-4xl font-black uppercase tracking-tighter leading-none italic">
            Production <span className="text-purple-500">Conveyor</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.4em] font-black text-white/20">
            Phase 03 — Final Assembly
          </p>
        </div>
      </div>

      <div className="mb-8">
        <StatusStepper currentStep="render" />
      </div>

      {stage === 'selection' ? (
        <div className="space-y-0 bg-black">
          {steps.map((step) => (
            <div key={step.id} className="relative transition-all duration-500 border-b border-white/5 last:border-0 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeStep === step.id ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-zinc-950/50"
                  >
                    <div className="p-8 space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl font-black text-purple-500 italic">0{step.id}</span>
                          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">{step.title}</h3>
                        </div>
                        <p className="text-xs text-white/40 max-w-md leading-relaxed">{step.instruction}</p>
                      </div>

                      <div className="py-4">
                        {step.id === 1 && <AvatarHub onSelect={(c) => setConfig(prev => ({ ...prev, ...c }))} currentConfig={config} />}
                        {step.id === 2 && <AnimationTiers onSelect={(c) => setConfig(prev => ({ ...prev, ...c }))} currentConfig={config} />}
                        {step.id === 3 && (
                          <div className="p-8 bg-white/[0.02] border border-white/5 flex items-center justify-between gap-8 group">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-purple-500/30 transition-all">
                                <Video className="w-5 h-5 text-white/30" />
                              </div>
                              <div>
                                <h4 className="text-sm font-black uppercase text-white tracking-widest">{locale === 'ru' ? 'Студия Референса' : 'Reference Studio'}</h4>
                                <p className="text-[10px] text-white/20 uppercase tracking-widest mt-1">Capture your unique character DNA</p>
                              </div>
                            </div>
                            <button onClick={() => setShowStudio(true)} className="px-6 py-4 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 active:scale-95 transition-all">
                              {config.recordedAssetId ? (locale === 'ru' ? "Обновить" : "Update") : (locale === 'ru' ? "Записать" : "Record")}
                            </button>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => setActiveStep(prev => prev + 1)}
                        className="w-full bg-white text-black py-6 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                      >
                        Confirm & Proceed <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div 
                    onClick={() => step.id < activeStep + 2 && setActiveStep(step.id)}
                    className="p-8 group cursor-pointer hover:bg-white/[0.02] transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-6">
                      <span className={`text-xl font-black italic ${step.id < activeStep ? 'text-purple-500/40' : 'text-white/10'}`}>0{step.id}</span>
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${step.id < activeStep ? 'text-purple-400' : 'text-white/10'}`}>
                          {step.id < activeStep ? 'COMPLETED' : 'PENDING'}
                        </p>
                        <h3 className={`text-lg font-black uppercase tracking-tighter italic ${step.id < activeStep ? 'text-white/60' : 'text-white/20'}`}>
                          {step.title}
                        </h3>
                      </div>
                    </div>
                    {step.id < activeStep && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-500/60">{step.summary}</span>
                        <CheckCircle2 className="w-4 h-4 text-purple-500/40 mt-1" />
                      </div>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* FINAL LAUNCH SECTION */}
          {activeStep >= 3 && (
            <div className="bg-gradient-to-br from-purple-500/10 to-transparent border-t border-purple-500/20 p-12 text-center space-y-10">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-purple-400">Step 04 — Launch Phase</p>
                <h2 className="text-6xl font-black uppercase italic tracking-tighter text-white">Initialize Factory</h2>
                <p className="text-xs text-white/20 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                  {locale === 'ru' ? 'Конвейер готов к сборке вашего видео. Проверьте параметры и начните производство.' : 'Conveyor is ready for assembly. Check parameters and start production.'}
                </p>
              </div>
              
              <div className="flex justify-center gap-16 border-y border-white/5 py-8">
                 <div className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-2">Cost Analysis</p>
                    <p className="text-4xl font-black text-white italic">{calculateTotalCost()} <span className="text-[10px] opacity-30">CREDITS</span></p>
                 </div>
                 <div className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-2">Build Window</p>
                    <p className="text-4xl font-black text-white italic">~5 <span className="text-[10px] opacity-30">MINUTES</span></p>
                 </div>
              </div>

              <button
                onClick={handleLaunch}
                disabled={isLaunching}
                className="w-full bg-white text-black font-black py-10 text-2xl uppercase tracking-tighter italic hover:bg-purple-500 hover:text-white transition-all flex items-center justify-center gap-6 shadow-[0_20px_60px_rgba(168,85,247,0.2)]"
              >
                {isLaunching ? <Loader2 className="w-8 h-8 animate-spin" /> : <Factory className="w-8 h-8" />}
                {isLaunching ? 'Waking up Agents...' : 'Start Production'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-10 animate-fade-in text-center px-4">
           <div className="max-w-xl mx-auto">
             <FactoryMonitor progress={progress} status={jobStatus} />
           </div>
        </div>
      )}

      {/* Premium Processing Overlay (Visible during launch) */}
      <AnimatePresence>
        {(isLaunching) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="relative w-32 h-32 mb-12">
               <div className="absolute inset-0 border-2 border-purple-500/10 rounded-full" />
               <div className="absolute inset-0 border-2 border-t-purple-500 rounded-full animate-spin" />
               <div className="absolute inset-4 border border-cyan-500/20 rounded-full animate-reverse-spin" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <Factory className="w-8 h-8 text-purple-400 animate-pulse" />
               </div>
            </div>
            
            <div className="space-y-4 max-w-sm">
               <motion.p 
                 key={generationStep}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="text-xl font-black uppercase italic tracking-tighter text-white"
               >
                 {loadingSteps[generationStep]}
               </motion.p>
               <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.4em] leading-relaxed">
                  SHER DIGITAL CORE IS ASSEMBLING YOUR VIRAL ENGINE SEQUENCE
               </p>
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.05)_0%,transparent_70%)] pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays & Alerts */}
      <PremiumLimitModal 
        isOpen={!!error}
        onClose={() => {
          setError(null);
          if (!projectId) router.push('/app/projects');
        }}
        title={locale === 'ru' ? 'Конвейерный Сбой' : 'Conveyor Alert'}
        description={error || ''}
        advice={locale === 'ru' ? 'Время сборки зависит от загрузки ИИ-агентов. Проверь, достаточно ли кредитов для этого движка.' : 'Assembly time depends on AI agent load. Check if you have enough credits for this engine tier.'}
        type="error"
        locale={locale}
        balance={user?.credits_balance}
      />

      {showStudio && scriptData && project && (
        <StudioRecorder 
          projectId={projectId as string}
          script={scriptData}
          onCancel={() => setShowStudio(false)}
          onComplete={(assetId, url) => {
            setConfig(prev => ({ ...prev, recordedAssetId: assetId, recordingType: url.includes('video') ? 'video' : 'audio' }));
            setShowStudio(false);
          }}
        />
      )}

      <StrategistChat 
        projectId={projectId || ''}
        userId={user?.id || ''}
        context="production"
        onApplySuggestion={(text) => {
          if (text.toLowerCase().includes('pro tier')) setConfig(prev => ({ ...prev, tier: 'pro' }));
        }}
      />
    </div>
  );
}

export default function ProductionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>}>
      <ProductionContent />
    </Suspense>
  );
}
