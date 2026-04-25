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
import { StrategistChat } from '@/components/studio/StrategistChat';

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

  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState(1);

  const toggleStep = (step: number) => {
    if (activeStep === step) return;
    setActiveStep(step);
  };

  const confirmStep = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps(prev => [...prev, step]);
    }
    setActiveStep(step + 1);
  };

  const calculateTotalCost = () => {
    let base = config.tier === 'pro' ? 50 : config.tier === 'standard' ? 25 : 10;
    if (config.mode === 'avatar') base += 20;
    if (config.aiPolish) base += 10;
    return base;
  };

  // ... (useEffect initials and polling remain same) ...
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
            if (ver?.script_data) setScriptData(ver.script_data as any);
          }
        }
      } catch (err) {
        setError('Failed to load project details');
      }
    }
    init();
  }, [projectId, versionId]);

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
            setTimeout(() => router.push(`/${locale}/app/projects/new/delivery?projectId=${projectId}&jobId=${jobId}`), 2000);
          }
        }
      } catch (err) { console.error(err); }
    };
    const interval = setInterval(pollStatus, 3000);
    pollStatus();
    return () => clearInterval(interval);
  }, [router, locale, stage, jobId, projectId]);

  const handleLaunch = async () => {
    if (!projectId || !versionId) { setError('Missing project or version ID'); return; }
    setIsLaunching(true);
    setError(null);
    try {
      const job = await renderService.createJob({ projectId, versionId, config: { ...config, previewUrl: version?.preview_url } });
      setJobId(job.id);
      setJobStatus(job.status);
      setStage('processing');
    } catch (err: any) {
      setError(err.message || 'Failed to launch project');
    } finally { setIsLaunching(false); }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-32">
      <StatusStepper currentStep="render" />

      {stage === 'selection' ? (
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* STEP 01: VISUAL IDENTITY */}
          <div 
            onClick={() => activeStep !== 1 && toggleStep(1)}
            className={`relative transition-all duration-700 ${activeStep === 1 ? 'z-30 scale-100' : 'z-10 opacity-50 cursor-pointer overflow-hidden rounded-[2.5rem]'}`}
          >
            {activeStep !== 1 && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-40 flex items-center justify-between px-10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-black">1</div>
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Step 01 / Completed</p>
                     <p className="text-sm font-bold text-white italic">{config.mode === 'avatar' ? 'AI Avatar Actor' : 'Custom Upload Mode'}</p>
                   </div>
                </div>
                <div className="px-5 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest bg-white/5">Tap to Edit</div>
              </div>
            )}
            
            <div className="space-y-6">
               <div className="px-4 space-y-1">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">01 Visual Identity</h3>
                  <p className="text-xs text-white/40">Select your cinematic base: Viral Models or personal DNA.</p>
               </div>
               <AvatarHub onSelect={(c) => setConfig(prev => ({ ...prev, ...c }))} currentConfig={config} />
               {activeStep === 1 && (
                 <button onClick={() => confirmStep(1)} className="w-full bg-white text-black py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
                   Confirm Identity & Proceed <ChevronRight className="w-4 h-4" />
                 </button>
               )}
            </div>
          </div>

          {/* STEP 02: ANIMATION TIER */}
          <div 
            onClick={() => activeStep !== 2 && toggleStep(2)}
            className={`relative transition-all duration-700 ${activeStep === 2 ? 'z-30 scale-100' : 'z-10 opacity-50 cursor-pointer overflow-hidden rounded-[2.5rem]'}`}
          >
            {(activeStep !== 2) && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-40 flex items-center justify-between px-10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-black">2</div>
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Step 02 / Quality</p>
                     <p className="text-sm font-bold text-white italic">{config.tier.toUpperCase()} Intelligence</p>
                   </div>
                </div>
                {activeStep > 2 && <div className="px-5 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest bg-white/5">Tap to Edit</div>}
              </div>
            )}
            
            <div className="space-y-6">
               <div className="px-4 space-y-1">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">02 Motion Intelligence</h3>
                  <p className="text-xs text-white/40">Choose AI power level. Different engines provide different motion quality.</p>
               </div>
               <AnimationTiers onSelect={(c) => setConfig(prev => ({ ...prev, ...c }))} currentConfig={config} />
               {activeStep === 2 && (
                 <button onClick={() => confirmStep(2)} className="w-full bg-white text-black py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
                   Confirm Motion & Proceed <ChevronRight className="w-4 h-4" />
                 </button>
               )}
            </div>
          </div>

          {/* STEP 03: RECORDING STUDIO */}
          <div 
            onClick={() => activeStep !== 3 && toggleStep(3)}
            className={`relative transition-all duration-700 ${activeStep === 3 ? 'z-30 scale-100' : 'z-10 opacity-50 cursor-pointer overflow-hidden rounded-[2.5rem]'}`}
          >
            {(activeStep !== 3) && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-40 flex items-center justify-between px-10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-black">3</div>
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Step 03 / Studio</p>
                     <p className="text-sm font-bold text-white italic">{config.recordedAssetId ? 'Reference Captured' : 'Stock Performance'}</p>
                   </div>
                </div>
                {activeStep > 3 && <div className="px-5 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest bg-white/5">Tap to Edit</div>}
              </div>
            )}
            
            <div className="space-y-6">
               <div className="px-4 space-y-1">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">03 Human Reference</h3>
                  <p className="text-xs text-white/40">Optional: Record your voice or video to clone your behavior perfectly.</p>
               </div>
               
               <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-center justify-between gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 font-bold text-cyan-400 italic">HD</div>
                      <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Recording Studio</h3>
                    </div>
                  </div>
                  <button onClick={() => setShowStudio(true)} className="px-8 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">
                    {config.recordedAssetId ? "Update Reference" : "Record Live"}
                  </button>
               </div>

               {activeStep === 3 && (
                 <button onClick={() => confirmStep(3)} className="w-full bg-white text-black py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
                   Finalize Selection <ChevronRight className="w-4 h-4" />
                 </button>
               )}
            </div>
          </div>

          {/* FINAL LAUNCH SECTION */}
          {activeStep >= 3 && (
            <div className="pt-10 animate-in fade-in slide-in-from-bottom-10">
               <div className="p-10 rounded-[3rem] bg-gradient-to-br from-purple-500/20 to-transparent border border-purple-500/30 text-center space-y-8">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400">Ready for Rendering</p>
                    <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white">Initialize Factory</h2>
                  </div>
                  
                  <div className="flex justify-center gap-12">
                     <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Total Cost</p>
                        <p className="text-3xl font-black text-white italic">{calculateTotalCost()} <span className="text-sm opacity-30">CREDITS</span></p>
                     </div>
                     <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Estimated Time</p>
                        <p className="text-3xl font-black text-white italic">3-5 <span className="text-sm opacity-30">MIN</span></p>
                     </div>
                  </div>

                  <button
                    onClick={handleLaunch}
                    disabled={isLaunching}
                    className="w-full bg-white text-black font-black py-8 rounded-[2.5rem] text-xl uppercase tracking-tighter italic hover:scale-[0.98] active:scale-[0.95] transition-all flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
                  >
                    {isLaunching ? <Loader2 className="w-6 h-6 animate-spin" /> : <Factory className="w-6 h-6" />}
                    {isLaunching ? 'Waking up Agents...' : 'Start Production'}
                  </button>
               </div>
            </div>
          )}

        </div>
      ) : (
        <div className="space-y-12 py-10 animate-fade-in">
          <FactoryMonitor progress={progress} status={jobStatus} />
        </div>
      )}

      {/* Studio & Chat Overlays */}
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
