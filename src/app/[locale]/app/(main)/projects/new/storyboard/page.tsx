'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Image as ImageIcon, Sparkles, RefreshCw, ChevronLeft, ChevronRight, Wand2, Loader2 } from 'lucide-react';
import { StatusStepper } from '@/components/ui/StatusStepper';
import { projectService, Project, ProjectVersion } from '@/lib/services/projectService';
import { profileService, Profile } from '@/lib/services/profileService';
import { StrategistChat } from '@/components/studio/StrategistChat';

export default function StoryboardPage() {
  const t = useTranslations('storyboard');
  const commonT = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string;

  const projectIdParam = searchParams.get('projectId');
  const versionIdParam = searchParams.get('versionId');

  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [version, setVersion] = useState<ProjectVersion | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState(0);

  const loadingSteps = locale === 'ru' 
    ? ['Анализируем контекст...', 'Синтезируем атмосферу...', 'Прорисовываем кадры...', 'Финальная калибровка...']
    : ['Analyzing Context...', 'Synthesizing Atmosphere...', 'Mapping Frames...', 'Final Calibration...'];

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setGenerationStep(prev => (prev + 1) % loadingSteps.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading, loadingSteps.length]);

  const generateStoryboard = async () => {
    if (!projectIdParam || !versionIdParam) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectIdParam,
          versionId: versionIdParam,
          locale
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');
      
      const updatedVersion = await projectService.getVersion(versionIdParam);
      setVersion(updatedVersion);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateScene = async (sceneIndex: number, instruction?: string) => {
    if (!projectIdParam || !versionIdParam) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectIdParam,
          versionId: versionIdParam,
          mode: 'refine_scene',
          sceneIndex,
          instruction: instruction || 'Make this scene more cinematic and viral',
          locale
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Regeneration failed');
      
      const updatedVersion = await projectService.getVersion(versionIdParam);
      setVersion(updatedVersion);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      if (!projectIdParam || !versionIdParam) {
        setError('Missing project parameters');
        setIsLoading(false);
        return;
      }

      try {
        const [proj, ver, prof] = await Promise.all([
          projectService.getProject(projectIdParam),
          projectService.getVersion(versionIdParam),
          profileService.getOrCreateProfile()
        ]);
        
        setUser(prof);
        if (!proj || !ver) {
          setError('Project not found');
        } else {
          setProject(proj);
          setVersion(ver);
        }
      } catch (err) {
        console.error('Failed to load storyboard:', err);
        setError('Connection error');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [projectIdParam, versionIdParam]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="relative w-32 h-32 mb-12">
           <div className="absolute inset-0 border-2 border-orange-500/10 rounded-full" />
           <div className="absolute inset-0 border-2 border-t-orange-500 rounded-full animate-spin" />
           <div className="absolute inset-4 border border-white/5 rounded-full animate-reverse-spin" />
           <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-orange-400 animate-pulse" />
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
              SHER VISUAL CORE IS SYNTHESIZING YOUR CINEMATIC TIMELINE
           </p>
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.05)_0%,transparent_70%)] pointer-events-none" />
      </div>
    );
  }

  const scriptData = version?.script_data as { hook: string; story: string; cta: string } || null;
  const storyboardData = version?.storyboard_data as { scenes: any[] } || { scenes: [] };
  
  // Map AI scenes to the script blocks
  const scenes = storyboardData.scenes.length > 0 ? storyboardData.scenes : [];

  const handleReturnToScript = () => {
    router.push(`/${locale}/app/projects/new/script?projectId=${projectIdParam}&versionId=${versionIdParam}`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <StatusStepper currentStep="storyboard" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
            <ImageIcon className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400/80 leading-none mb-1">
              {t('badge')}
            </p>
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">
              {t('title')}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 shadow-lg shadow-orange-500/5">
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">{t('cost')}</span>
        </div>
      </div>

      {(storyboardData.scenes.length === 0) && (
        <div className="p-12 rounded-[2.5rem] bg-orange-500/5 border border-orange-500/10 text-center space-y-6 animate-pulse-slow">
          <div className="w-16 h-16 rounded-3xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30 mx-auto">
            <Wand2 className="w-8 h-8 text-orange-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Visual Matrix Empty</h3>
            <p className="text-sm text-white/40 max-w-xs mx-auto">Transform your text into a cinematic visual sequence using our AI Director.</p>
          </div>
          <button 
            onClick={generateStoryboard}
            className="btn-primary px-8 py-4 rounded-2xl flex items-center justify-center gap-3 mx-auto group shadow-[0_10px_20px_rgba(249,115,22,0.2)]"
          >
            <Sparkles className="w-4 h-4" />
            <span className="font-black text-xs uppercase tracking-widest">Generate All Frames</span>
          </button>
        </div>
      )}

      {/* Frames Grid */}
      <div className="space-y-6">
        {scenes.map((scene, index) => (
          <div key={index} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-[0.2em] text-white/30 uppercase">
                  {t('frameLabel')} {index + 1}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-[8px] font-black text-orange-400 uppercase tracking-tighter">
                  {t('selectedLabel')}
                </span>
              </div>
              <button 
                onClick={() => handleRegenerateScene(index)}
                className="flex items-center gap-1.5 text-[9px] font-bold text-orange-400 uppercase tracking-widest hover:text-orange-300 transition-colors"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                {t('regenerateFrame')}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div
                className="aspect-square rounded-2xl bg-[#0d0d1a] border border-white/10 overflow-hidden relative group cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                }}
              >
                <div className="absolute inset-x-0 bottom-0 p-3 bg-black/60 backdrop-blur-md">
                  <p className="text-[10px] text-white/80 font-bold leading-tight">
                    {scene.visual_prompt}
                  </p>
                </div>
                <div className="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="aspect-square rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center group cursor-pointer hover:bg-white/[0.07] transition-all">
                <div className="text-center space-y-2 opacity-20 group-hover:opacity-100 transition-all">
                  <RefreshCw className="w-6 h-6 mx-auto text-white/40 group-hover:text-orange-400" />
                  <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">New Variant</p>
                </div>
              </div>
            </div>
            
            <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
              <p className="text-[11px] text-orange-400 font-black uppercase tracking-wider mb-1">AI Instruction:</p>
              <p className="text-[10px] text-white/60 leading-relaxed">
                {scene.action_description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Strategist Advisor */}
      <StrategistChat 
        projectId={projectIdParam || ''}
        userId={user?.id || ''}
        context="storyboard"
        onApplySuggestion={(text) => {
          // If the strategist suggests a visual change, we apply it to the whole storyboard or first scene
          handleRegenerateScene(0, text);
        }}
      />

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-inherit backdrop-blur-xl border-t border-white/5 z-50">
        <div className="flex gap-3">
          <Link href={`/${locale}/app/projects/new/script?projectId=${projectIdParam}&versionId=${versionIdParam}`} className="flex-1">
            <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-4 h-4" />
              {commonT('back')}
            </button>
          </Link>
          <Link href={`/${locale}/app/projects/new/production?projectId=${projectIdParam}&versionId=${versionIdParam}`} className="flex-[2]">
            <button className="btn-primary w-full rounded-2xl py-4 flex flex-col items-center justify-center leading-none group relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="font-black text-sm uppercase tracking-tight">{t('launchBtn')}</span>
              </div>
              <span className="text-[9px] font-bold text-black/50 uppercase tracking-widest">
                {t('launchCost')}
              </span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
