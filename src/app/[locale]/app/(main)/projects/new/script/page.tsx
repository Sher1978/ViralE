'use client';
// Build trigger: Ensure TypeScript property name parity (script_data)


import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { Sparkles, ArrowRight, Wand2, History, ChevronRight, Loader2, Dna, Lock, Key, AlertTriangle, Cpu, GraduationCap, TrendingUp, Leaf } from 'lucide-react';
import { StatusStepper } from '@/components/ui/StatusStepper';
import { profileService, Profile } from '@/lib/services/profileService';
import { projectService, Project, ProjectVersion } from '@/lib/services/projectService';
import { StrategistChat } from '@/components/studio/StrategistChat';
import { PremiumLimitModal } from '@/components/ui/PremiumLimitModal';
import { motion, AnimatePresence } from 'framer-motion';
import { ContentMatrix } from './_components/ContentMatrix';
import { ScenarioLegend } from './_components/ScenarioLegend';
import { createInitialManifest } from '@/lib/studio-utils';

import { BottomNav } from '@/components/layout/BottomNav';


export default function ScriptLabPage() {
  const t = useTranslations('scriptLab');
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string;

  const projectIdParam = searchParams.get('projectId');
  const versionIdParam = searchParams.get('versionId');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [onboardingIncomplete, setOnboardingIncomplete] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<'gemini' | 'claude' | 'claude-byok' | 'groq'>('gemini');
  const [isAiLocked, setIsAiLocked] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalData, setLimitModalData] = useState({ title: '', desc: '', type: 'trial' as any });


  const [activeScenario, setActiveScenario] = useState<'evergreen' | 'trend' | 'educational' | 'controversial' | 'storytelling'>('evergreen');
  const [allScenarios, setAllScenarios] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const loadingSteps = locale === 'ru' 
    ? ['Анализируем идею...', 'Калибруем Digital DNA...', 'Прошиваем смыслы...', 'Финальная сборка...']
    : ['Analyzing Idea...', 'Calibrating Digital DNA...', 'Injecting Narrative...', 'Final Assembly...'];

  useEffect(() => {
    let interval: any;
    if (isLoading || isGenerating) {
      interval = setInterval(() => {
        setGenerationStep(prev => (prev + 1) % loadingSteps.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading, isGenerating, loadingSteps.length]);
  
  const [selectionSources, setSelectionSources] = useState<Record<string, 'evergreen' | 'trend' | 'educational' | 'controversial' | 'storytelling'>>({
    hook: 'evergreen',
    context: 'evergreen',
    meat: 'evergreen',
    cta: 'evergreen'
  });

  const [scriptData, setScriptData] = useState({
    hook: '' as any,
    context: '' as any,
    meat: '' as any,
    cta: '' as any,
    visual_hook: '',
    social_post: ''
  });

  const [masterTextOverride, setMasterTextOverride] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const scenarios: ('evergreen' | 'trend' | 'educational' | 'controversial' | 'storytelling')[] = ['evergreen', 'trend', 'educational', 'controversial', 'storytelling'];

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentVersion, setCurrentVersion] = useState<ProjectVersion | null>(null);
  const [user, setUser] = useState<Profile | null>(null);

  // Session Recovery for Generation State (Fix for state loss during router transitions)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedGenerating = sessionStorage.getItem('isGenerating') === 'true';
      const savedScenarios = sessionStorage.getItem('allScenarios');
      
      if (savedGenerating) {
        setIsGenerating(true);
      }
      
      if (savedScenarios) {
        try {
          const parsed = JSON.parse(savedScenarios);
          setAllScenarios(parsed);
          setScriptData(parsed.evergreen || parsed);
        } catch (e) {
          console.error('[SessionRecovery] Failed to parse saved scenarios:', e);
        }
      }
    }
  }, []); // Run on mount to catch redirected generation state

  useEffect(() => {
    async function loadData() {
      // Load user profile
      try {
        const prof = await profileService.getOrCreateProfile();
        setUser(prof);
        setIsAiLocked(prof?.tier === 'free');
      } catch (err) {
        console.error('Failed to load profile:', err);
      }

      // Handle Iteration Logic (Copying from existing project)
      const fromProjectId = searchParams.get('fromProjectId');
      if (fromProjectId && !projectIdParam) {
        setIsLoading(true);
        try {
          const parentProj = await projectService.getProject(fromProjectId);
          const latestVer = await projectService.getLatestVersion(fromProjectId);
          if (latestVer?.script_data) {
            setScriptData(latestVer.script_data as any);
            setTopicInput(parentProj?.title || '');
            setCurrentProject(parentProj);
          }
        } catch (err) {
          console.error('Failed to load iteration data:', err);
          setError('Failed to load parent project data');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      if (!projectIdParam) {
        // If no project, check for pre-filled topic from Ideas page
        const topic = searchParams.get('topic');
        if (topic) {
          setTopicInput(topic);
        }
        return;
      }
      
      setIsLoading(true);
      try {
        const ver = await projectService.getVersion(versionIdParam!);
        if (ver?.script_data) {
          const data = ver.script_data as any;
          if (data.evergreen) {
            setAllScenarios(data);
            setScriptData(data[activeScenario] || data.evergreen);
          } else {
            // Legacy format
            setScriptData(data);
          }
          setCurrentVersion(ver);
        }
        const proj = await projectService.getProject(projectIdParam);
        setCurrentProject(proj);
        setTopicInput(proj?.title || '');
        // Clear generating state and session cache once data is loaded from DB
        setIsGenerating(false);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('isGenerating');
          sessionStorage.removeItem('allScenarios');
        }
      } catch (err) {
        console.error('Failed to load script:', err);
        setError('Failed to load project data');
        setIsGenerating(false);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [projectIdParam, versionIdParam, searchParams]);

  const handleScenarioSwitch = (scenario: 'evergreen' | 'trend' | 'educational') => {
    setActiveScenario(scenario);
  };

  const handleBlockSelect = (type: string, source: 'evergreen' | 'trend' | 'educational' | 'controversial' | 'storytelling') => {
    setSelectionSources(prev => ({ ...prev, [type]: source }));
  };

  const handleBlockUpdate = (blockId: string, scenarioId: string, newContent: string) => {
    setAllScenarios((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        [scenarioId]: {
          ...prev[scenarioId],
          [blockId]: newContent
        }
      };
    });
  };

  const getActiveBlockValue = (type: string) => {
    if (allScenarios?.[activeScenario]?.[type]) {
      return allScenarios[activeScenario][type];
    }
    return scriptData[type as keyof typeof scriptData] || '';
  };

  const getFinalText = () => {
    if (!allScenarios) return Object.values(scriptData).filter(v => v).map((v: any) => typeof v === 'string' ? v : v.words).join('\n\n');
    const parts = [
      allScenarios[selectionSources.hook]?.hook?.words || allScenarios[selectionSources.hook]?.hook,
      allScenarios[selectionSources.context]?.context?.words || allScenarios[selectionSources.context]?.context,
      allScenarios[selectionSources.meat]?.meat?.words || allScenarios[selectionSources.meat]?.meat,
      allScenarios[selectionSources.cta]?.cta?.words || allScenarios[selectionSources.cta]?.cta,
    ];
    return parts.filter(Boolean).map(v => typeof v === 'string' ? v : (v as any)?.words || '').join('\n\n');
  };

  const handleCopyToClipboard = () => {
    const text = getFinalText();
    navigator.clipboard.writeText(text);
  };

  const handleApplyRefinement = async (instruction: string) => {
    if (!projectIdParam || !versionIdParam) return;
    
    // Threshold check
    if ((user?.credits_balance || 0) < 50 && user?.tier !== 'pro') {
      setLimitModalData({
        title: locale === 'ru' ? 'Лимит исчерпан' : 'Limit Reached',
        desc: locale === 'ru' 
          ? 'Для редактирования сценария нужно минимум 50 кредитов. Пополните баланс, чтобы продолжить.' 
          : 'Minimum 50 credits required for adjustment. Please refill your balance to continue.',
        type: 'credits'
      });
      setShowLimitModal(true);
      return;
    }

    setIsRefining(true);
    setError(null);

    try {
      const response = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectIdParam,
          versionId: versionIdParam,
          mode: 'refine',
          instruction,
          currentScript: scriptData,
          locale,
          engine: selectedEngine
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.code === 'BALANCE_TOO_LOW') {
          setLimitModalData({
            title: locale === 'ru' ? 'Недостаточно средств' : 'Insufficient Credits',
            desc: locale === 'ru' 
              ? 'На вашем балансе недостаточно кредитов для этой операции.' 
              : 'You do not have enough credits for this operation.',
            type: 'credits'
          });
          setShowLimitModal(true);
          return;
        }
        throw new Error(data.error || (locale === 'ru' ? 'Сбой при редактировании' : 'Refinement failed'));
      }

      // Update script data
      const newScript = data.script;
      setScriptData(newScript);
      
      // Update allScenarios if it's a multi-scenario object
      if (allScenarios) {
        setAllScenarios({ ...allScenarios, [activeScenario]: newScript });
      }

      if (data.onboardingIncomplete) {
        setOnboardingIncomplete(true);
      }
      
      // Refresh user balance if possible
      const prof = await profileService.getOrCreateProfile();
      setUser(prof);
    } catch (err: any) {
      console.error('[ScriptLab] Refinement failed:', err);
      setError(err.message || (locale === 'ru' ? 'Произошла ошибка' : 'An error occurred'));
    } finally {
      setIsRefining(false);
      setCustomCommand('');
    }
  };

  const handleManualStart = async () => {
    if (!topicInput.trim()) {
      setError(locale === 'ru' ? 'Введите идею видео' : 'Please enter a video idea');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const profile = await profileService.getOrCreateProfile();
      if (!profile) throw new Error(locale === 'ru' ? 'Ошибка авторизации' : 'Auth failed');
      
      const project = await projectService.createProject({
        title: topicInput,
        userId: profile.id
      });
      if (!project) throw new Error(locale === 'ru' ? 'Не удалось создать проект' : 'Project creation failed');
      
      await projectService.updateProjectStatus(project.id, 'scripting');
      const version = await projectService.createVersion({
        projectId: project.id,
        scriptData: scriptData, // Use current default scriptData
      });
      
      if (!version) throw new Error(locale === 'ru' ? 'Не удалось создать версию' : 'Version creation failed');
      
      // Persist generating state to session to survive router replace remount
      setIsGenerating(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('isGenerating', 'true');
      }
      
      router.replace(`/app/projects/new/script?projectId=${project.id}&versionId=${version.id}`);
    } catch (err: any) {
      console.error('[ScriptLab] Manual start failed:', err);
      setError(err.message || (locale === 'ru' ? 'Произошла ошибка' : 'An error occurred'));
      setIsGenerating(false);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('isGenerating');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialGenerate = async () => {
    if (isAiLocked) {
      return handleManualStart();
    }
    if (!topicInput.trim()) {
      setError(locale === 'ru' ? 'Введите идею видео' : 'Please enter a video idea');
      return;
    }
    await executeGeneration();
  };

  const executeGeneration = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coreIdea: topicInput,
          mode: 'initial',
          locale,
          engine: selectedEngine
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (locale === 'ru' ? 'Ошибка генерации' : 'Generation failed'));

      const fullScript = data.script;
      if (fullScript.evergreen) {
        setAllScenarios(fullScript);
        setScriptData(fullScript.evergreen);
        setActiveScenario('evergreen');
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('allScenarios', JSON.stringify(fullScript));
        }
      } else {
        setScriptData(fullScript);
      }

      if (data.onboardingIncomplete) {
        setOnboardingIncomplete(true);
      }
      
      const prof = await profileService.getOrCreateProfile();
      setUser(prof);
      
      // Crucial: Set generating mode to true and persist it
      setIsGenerating(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('isGenerating', 'true');
      }
      
      router.replace(`/app/projects/new/script?projectId=${data.projectId}&versionId=${data.versionId}`);
    } catch (err: any) {
      console.error('[ScriptLab] Generation failed:', err);
      const isCreditError = err.message?.includes('credits') || err.message?.includes('limit');
      
      if (isCreditError) {
        setLimitModalData({
          title: locale === 'ru' ? 'Лимит ИИ' : 'AI Limit',
          desc: err.message,
          type: 'credits'
        });
        setShowLimitModal(true);
      } else {
        setError(err.message || (locale === 'ru' ? 'Произошла ошибка' : 'An error occurred'));
      }
      
      setIsGenerating(false);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('isGenerating');
        sessionStorage.removeItem('allScenarios');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTopic = async () => {
    if (!projectIdParam) {
      // In initial mode, just update the local state
      setIsEditingTopic(false);
      return;
    }
    try {
      await projectService.updateProject(projectIdParam, { title: topicInput });
      if (currentProject) {
        setCurrentProject({ ...currentProject, title: topicInput });
      }
      setIsEditingTopic(false);
      // Visual feedback - could add a toast here
    } catch (err: any) {
      setError('Failed to update topic');
    }
  };

  const handleApprove = async (manualScriptData?: any) => {
    setIsSaving(true);
    setError(null);

    const activeScript = manualScriptData || scriptData;

    try {
      const profile = await profileService.getOrCreateProfile();
      if (!profile) {
        setError(locale === 'ru' ? 'Ошибка авторизации. Попробуйте снова.' : 'Authorization failed. Please try again.');
        return;
      }
      let pId = projectIdParam && projectIdParam !== 'null' ? projectIdParam : null;
      let vId = versionIdParam && versionIdParam !== 'null' ? versionIdParam : null;

      // 1. Create project if doesn't exist
      if (!pId) {
        const fromProjectId = searchParams.get('fromProjectId');
        const project = await projectService.createProject({
          title: topicInput || activeScript.hook.substring(0, 30) + '...',
          userId: profile.id,
          parentId: fromProjectId && fromProjectId !== 'null' ? fromProjectId : undefined
        });
        if (!project) throw new Error(locale === 'ru' ? 'Не удалось создать проект' : 'Project creation failed');
        pId = project.id;
      }

      // 2. Update version with latest script data
      if (!vId || vId === 'null') {
        console.log('[ScriptLab] No valid versionId, creating new version...');
        
        // Wrap raw script into a Production Manifest for the Studio
        const initialManifest = createInitialManifest(pId, 'temp', activeScript);
        
        const newVersion = await projectService.createVersion({
          projectId: pId,
          scriptData: initialManifest
        });
        if (!newVersion) throw new Error(locale === 'ru' ? 'Не удалось создать версию сценария' : 'Failed to create script version');
        vId = newVersion.id;
        // Update manifest with real versionId
        initialManifest.versionId = vId;
        await projectService.updateVersion(vId, { script_data: initialManifest });
      } else {
        console.log('[ScriptLab] Updating existing version:', vId);
        
        // Wrap raw script into a Production Manifest
        const initialManifest = createInitialManifest(pId, vId, activeScript);
        
        const version = await projectService.updateVersion(vId, {
          script_data: initialManifest
        });
        if (!version) throw new Error(locale === 'ru' ? 'Ошибка при обновлении версии' : 'Version update failed');
      }

      // Redirect to Studio (Branch Selection)
      router.push(`/app/projects/${pId}/studio?tab=branch`);
    } catch (err: any) {
      console.error('[ScriptLab] Save failed:', err);
      setError(err.message || (locale === 'ru' ? 'Не удалось сохранить проект' : 'Failed to save project'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || isGenerating) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="relative w-32 h-32 mb-12">
           <div className="absolute inset-0 border-2 border-purple-500/10 rounded-full" />
           <div className="absolute inset-0 border-2 border-t-purple-500 rounded-full animate-spin" />
           <div className="absolute inset-4 border border-cyan-500/20 rounded-full animate-reverse-spin" />
           <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
           </div>
        </div>
        
        <div className="space-y-4 max-w-sm">
           <AnimatePresence mode="wait">
             <motion.p 
               key={generationStep}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               className="text-xl font-black uppercase italic tracking-tighter text-white"
             >
               {loadingSteps[generationStep]}
             </motion.p>
           </AnimatePresence>
           <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.4em] leading-relaxed">
              SHER DIGITAL CORE IS ASSEMBLING YOUR NARRATIVE MATRIX
           </p>
        </div>

        {/* Matrix background deco */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.05)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      </div>
    );
  }

  // Initial Ideation UI if no project exists yet AND we don't have generated data in memory
  if (!projectIdParam && !allScenarios) {
    return (
      <div className="space-y-12 animate-fade-in max-w-2xl mx-auto py-10">
        <StatusStepper currentStep="script" />
        
        <div className="space-y-6 text-center">
          <div className="inline-flex p-4 rounded-3xl bg-purple-500/10 border border-purple-500/20 mb-4 animate-bounce-slow">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-4xl font-black tracking-tight uppercase italic leading-none">
            {locale === 'ru' ? 'С чего' : 'What is the'} <span className="gradient-text-purple">{locale === 'ru' ? 'начнем?' : 'Start?'}</span>
          </h1>
          <p className="text-white/40 text-sm max-w-sm mx-auto uppercase tracking-widest font-bold">
            {locale === 'ru' ? 'Опиши идею своего видео в одном предложении' : 'Describe your video idea in one sentence'}
          </p>
        </div>

        <div className="space-y-8">
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-shake uppercase tracking-widest text-center">
              {error}
            </div>
          )}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000" />
            <textarea
              id="topic-textarea"
              value={topicInput}
              onChange={(e) => {
                console.log('Topic change:', e.target.value);
                setTopicInput(e.target.value);
              }}
              placeholder={locale === 'ru' ? 'Напр: 5 секретов как выбрать лучшее авто...' : 'E.g.: 5 secrets to picking the best car...'}
              className="w-full h-48 bg-[#0d0d1a] border border-white/10 rounded-[2rem] p-8 text-xl font-medium text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/50 transition-all resize-none shadow-2xl relative z-10"
            />
          </div>

          {!isAiLocked && (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400/60 ml-2">
                {locale === 'ru' ? 'Выбор ИИ' : 'AI Engine'}
              </label>
              <div className="flex flex-wrap gap-2 p-1.5 bg-black/40 rounded-[1.5rem] border border-white/5 backdrop-blur-xl">
                <button
                  onClick={() => setSelectedEngine('gemini')}
                  className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest ${
                    selectedEngine === 'gemini' 
                      ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' 
                      : 'text-white/20 hover:text-white/40'
                  }`}
                >
                  Gemini 2.5
                </button>
                <button
                  onClick={() => setSelectedEngine('claude')}
                  className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest ${
                    selectedEngine === 'claude' 
                      ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' 
                      : 'text-white/20 hover:text-white/40'
                  }`}
                >
                  Claude 3.5
                </button>
                {user?.anthropic_api_key && (
                  <button
                    onClick={() => setSelectedEngine('claude-byok' as any)}
                    className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest border border-purple-500/30 ${
                      selectedEngine === ('claude-byok' as any)
                        ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' 
                        : 'text-purple-400/40 hover:text-purple-400'
                    }`}
                  >
                    <Key className="w-3 h-3" />
                    Claude (BYOK)
                  </button>
                )}
                {user?.groq_api_key && (
                  <button
                    onClick={() => setSelectedEngine('groq' as any)}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest border border-orange-500/30 ${
                      selectedEngine === ('groq' as any)
                        ? 'bg-orange-600 text-white shadow-[0_0_20px_rgba(255,100,0,0.3)]' 
                        : 'text-orange-400/40 hover:text-orange-400'
                    }`}
                  >
                    Groq
                  </button>
                )}
              </div>
            </div>
          )}

          {isAiLocked ? (
            <div className="space-y-4">
              <button
                onClick={handleManualStart}
                disabled={!topicInput || topicInput.trim().length < 3 || isLoading}
                className="w-full btn-primary py-6 rounded-[2rem] flex items-center justify-center gap-4 group transition-all shadow-[0_20px_40px_rgba(168,85,247,0.3)] relative z-10"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                ) : (
                  <>
                    <span className="font-black text-lg uppercase tracking-widest">
                      {locale === 'ru' ? 'Написать вручную' : 'Write Manually'}
                    </span>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/app/profile/subscription')}
                className="w-full bg-white text-black py-6 rounded-[2rem] flex items-center justify-center gap-4 group font-black text-lg uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all relative z-10"
              >
                <Sparkles className="w-6 h-6 animate-pulse" />
                {locale === 'ru' ? 'Разблокировать ИИ' : 'Unlock AI Engine'}
              </button>
            </div>
          ) : (
            <button
              id="generate-script-btn"
              onClick={handleInitialGenerate}
              disabled={!topicInput || topicInput.trim().length < 3 || isLoading}
              className="w-full btn-primary py-6 rounded-[2rem] flex items-center justify-center gap-4 group disabled:opacity-30 disabled:grayscale transition-all shadow-[0_20px_40px_rgba(168,85,247,0.3)] relative z-10"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              ) : (
                <>
                  <span className="font-black text-lg uppercase tracking-widest">
                    {locale === 'ru' ? 'Создать сценарий' : 'Generate Script'}
                  </span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-40">
      <StatusStepper currentStep="script" />

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest animate-shake">
          {error}
        </div>
      )}

      {/* Header Context */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-lg">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400/60 leading-none mb-1">
              Idea Lab Stage
            </p>
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none text-white">
              Creative <span className="gradient-text-purple">Matrix</span>
            </h1>
          </div>
        </div>

        <ScenarioLegend 
          scenarios={[
            { id: 'evergreen', color: '#00FF9F', label: 'Evergreen' },
            { id: 'trend', color: '#FF8A00', label: 'Trends' },
            { id: 'educational', color: '#3B82F6', label: 'Educational' },
            { id: 'controversial', color: '#FF2D55', label: 'Controversial' },
            { id: 'storytelling', color: '#00D2FF', label: 'Storytelling' }
          ]} 
        />
      </div>

      {onboardingIncomplete && (
        <div className="animate-slide-up relative overflow-hidden p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-white/10 backdrop-blur-xl group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Dna className="w-12 h-12 text-cyan-400" />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-black uppercase tracking-widest text-cyan-400">
                  {locale === 'ru' ? 'Используется экспертный стиль' : 'Expert Style Active'}
                </p>
                <p className="text-[10px] text-white/40 leading-relaxed max-w-sm">
                  {locale === 'ru' 
                    ? 'Ваша ДНК еще не настроена. Сценарий создан в экспертном стиле.'
                    : 'Your DNA is not configured. Script generated in expert style.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/onboarding')}
              className="px-5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-[10px] font-black uppercase tracking-widest text-cyan-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {locale === 'ru' ? 'Настроить ДНК' : 'Set up DNA'}
            </button>
          </div>
        </div>
      )}

      {/* Topic Edit */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-white/[0.08] transition-all">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <p className="text-xs font-medium text-white/60">
            {topicInput || 'Your core idea here...'}
          </p>
        </div>
      </div>

      {/* The Matrix Carousel */}
      <ContentMatrix 
        blocks={[
          { id: 'hook', label: locale === 'ru' ? 'ХУК' : 'HOOK' },
          { id: 'context', label: locale === 'ru' ? 'КОНТЕКСТ' : 'CONTEXT' },
          { id: 'meat', label: locale === 'ru' ? 'МЯСО' : 'MEAT' },
          { id: 'cta', label: locale === 'ru' ? 'CTA' : 'CTA' }
        ]}
        scenarios={['evergreen', 'trend', 'educational', 'controversial', 'storytelling']}
        selectionSources={selectionSources}
        allScenarios={allScenarios}
        scriptData={scriptData}
        locale={locale}
        t={t}
        onBlockSelect={handleBlockSelect}
        onBlockUpdate={handleBlockUpdate}
        onRefine={handleApplyRefinement}
        onAccept={async () => {
          const sd = scriptData as any;
          const synthesizedScript = {
            hook: allScenarios[selectionSources.hook]?.hook || sd.hook,
            context: allScenarios[selectionSources.context]?.context || sd.context,
            meat: allScenarios[selectionSources.meat]?.meat || sd.meat,
            cta: allScenarios[selectionSources.cta]?.cta || sd.cta,
            visual_hook: allScenarios[selectionSources.hook]?.visual_hook || sd.visual_hook,
            social_post: allScenarios[selectionSources.hook]?.social_post || sd.social_post,
          };
          handleApprove(synthesizedScript);
        }}
        onCopy={handleCopyToClipboard}
        isSaving={isSaving}
      />

      <StrategistChat 
        projectId={projectIdParam || ''}
        userId={user?.id || ''}
        context="script"
        onApplySuggestion={(text) => handleApplyRefinement(text)}
        onMatrixUpdate={(matrix) => {
          console.log('[ScriptLab] Matrix sync from Chat:', matrix);
          if (matrix.evergreen || matrix.trend) {
             setAllScenarios(matrix);
             setScriptData(matrix[activeScenario] || matrix.evergreen);
             if (typeof window !== 'undefined') {
                sessionStorage.setItem('allScenarios', JSON.stringify(matrix));
             }
          } else if (matrix.styles && Array.isArray(matrix.styles)) {
             // Map styles array to the 5-scenario format if possible, or just use styles[0]
             const mapped: any = {};
             matrix.styles.forEach((s: any, i: number) => {
                const key = i === 0 ? 'evergreen' : i === 1 ? 'trend' : i === 2 ? 'educational' : i === 3 ? 'controversial' : 'storytelling';
                mapped[key] = {
                   hook: s.hook,
                   context: s.context,
                   meat: s.meat,
                   cta: s.cta,
                };
             });
             setAllScenarios(mapped);
             setScriptData(mapped.evergreen);
             if (typeof window !== 'undefined') {
                sessionStorage.setItem('allScenarios', JSON.stringify(mapped));
             }
          }
        }}
      />

      <PremiumLimitModal 
        isOpen={!!error || showLimitModal}
        onClose={() => { setError(null); setShowLimitModal(false); }}
        title={limitModalData.title || (locale === 'ru' ? 'Внимание' : 'Attention')}
        description={error || limitModalData.desc}
        type={error ? 'error' : limitModalData.type}
        locale={locale}
      />
      <BottomNav />
    </div>
  );
}
