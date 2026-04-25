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


  const [activeScenario, setActiveScenario] = useState<'evergreen' | 'trend' | 'educational'>('evergreen');
  const [allScenarios, setAllScenarios] = useState<any>(null);
  
  const [scriptData, setScriptData] = useState({
    hook: locale === 'ru' 
      ? "Знаешь почему 90% покупателей переплачивают за авто?"
      : "Do you know why 90% of buyers overpay for cars?",
    story: locale === 'ru'
      ? "Разбираю по-честному. Первое — VIN история. Второе — незавизимая диагностика."
      : "I'm breaking it down honestly. First — VIN history. Second — independent diagnostics.",
    cta: locale === 'ru'
      ? "Пиши слово «МАШИНА» в комментариях."
      : "Comment the word \"CAR\".",
    visual_hook: locale === 'ru'
      ? "Эстетичный кадр с дорогим авто в неоновом свете"
      : "Aesthetic shot of a premium car in neon light",
    social_post: locale === 'ru'
      ? "Секреты автоподбора 2026. 🚗💨 #авто #советы #viral"
      : "Car buying secrets 2026. 🚗💨 #cars #tips #viral"
  });

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentVersion, setCurrentVersion] = useState<ProjectVersion | null>(null);
  const [user, setUser] = useState<Profile | null>(null);

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
      } catch (err) {
        console.error('Failed to load script:', err);
        setError('Failed to load project data');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [projectIdParam, versionIdParam, searchParams]);

  const handleScenarioSwitch = (scenario: 'evergreen' | 'trend' | 'educational') => {
    if (user?.tier === 'free' && scenario !== 'evergreen') {
      router.push('/app/profile/subscription');
      return;
    }
    setActiveScenario(scenario);
    if (allScenarios?.[scenario]) {
      setScriptData(allScenarios[scenario]);
    }
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
      
      router.replace(`/app/projects/new/script?projectId=${project.id}&versionId=${version.id}`);
    } catch (err: any) {
      console.error('[ScriptLab] Manual start failed:', err);
      setError(err.message || (locale === 'ru' ? 'Произошла ошибка' : 'An error occurred'));
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
    setIsLoading(true);
    setError(null);

    try {
      // Tier Check: Creator limit (20 generations/month)
      if (user?.tier === 'creator') {
        const { count, error: countError } = await profileService.getMonthlyGenerationCount(user.id);
        if (countError) throw countError;
        if ((count || 0) >= 20) {
          setLimitModalData({
            title: locale === 'ru' ? 'Лимит Создателя' : 'Creator Limit',
            desc: locale === 'ru' 
              ? 'Лимит в 20 генераций в месяц исчерпан. Перейдите на PRO для безлимитного создания.' 
              : 'Monthly limit of 20 generations reached. Upgrade to PRO for unlimited creation.',
            type: 'tier'
          });
          setShowLimitModal(true);
          setIsLoading(false);
          return;
        }
      }

      // Warning for credits if user not pro
      if (user?.tier !== 'pro') {
        const confirmMsg = locale === 'ru' 
          ? 'Это действие потратит 10 кредитов. Продолжить?'
          : 'This action will cost 10 credits. Continue?';
        if (typeof window !== 'undefined' && !window.confirm(confirmMsg)) {
          setIsLoading(false);
          return;
        }
      }

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
      } else {
        setScriptData(fullScript);
      }

      if (data.onboardingIncomplete) {
        setOnboardingIncomplete(true);
      }
      
      const prof = await profileService.getOrCreateProfile();
      setUser(prof);
      
      router.replace(`/app/projects/new/script?projectId=${data.projectId}&versionId=${data.versionId}`);
    } catch (err: any) {
      console.error('[ScriptLab] Generation failed:', err);
      setError(err.message || (locale === 'ru' ? 'Произошла ошибка' : 'An error occurred'));
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

  const handleApprove = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const profile = await profileService.getOrCreateProfile();
      if (!profile) {
        setError(locale === 'ru' ? 'Ошибка авторизации. Попробуйте снова.' : 'Authorization failed. Please try again.');
        return;
      }
      let pId = projectIdParam;
      let vId = versionIdParam;

      // 1. Create project if doesn't exist
      if (!pId) {
        const fromProjectId = searchParams.get('fromProjectId');
        const project = await projectService.createProject({
          title: topicInput || scriptData.hook.substring(0, 30) + '...',
          userId: profile.id,
          parentId: fromProjectId || undefined
        });
        if (!project) throw new Error(locale === 'ru' ? 'Не удалось создать проект' : 'Project creation failed');
        pId = project.id;
      }

      // 2. Update version with latest script data
      if (!vId || vId === 'null') {
        console.log('[ScriptLab] No valid versionId, creating new version...');
        const newVersion = await projectService.createVersion({
          projectId: pId,
          scriptData: scriptData
        });
        if (!newVersion) throw new Error(locale === 'ru' ? 'Не удалось создать версию сценария' : 'Failed to create script version');
        vId = newVersion.id;
      } else {
        console.log('[ScriptLab] Updating existing version:', vId);
        const version = await projectService.updateVersion(vId, {
          script_data: scriptData
        });
        if (!version) throw new Error(locale === 'ru' ? 'Ошибка при обновлении версии' : 'Version update failed');
      }

      // Redirect to Storyboard
      router.push(`/app/projects/new/storyboard?projectId=${pId}&versionId=${vId}`);
    } catch (err: any) {
      console.error('[ScriptLab] Save failed:', err);
      setError(err.message || (locale === 'ru' ? 'Не удалось сохранить проект' : 'Failed to save project'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin" />
        </div>
        <p className="text-[10px] text-purple-400/60 uppercase tracking-[0.3em] font-black animate-pulse">
          Processing Matrix...
        </p>
      </div>
    );
  }

  // Initial Ideation UI if no project exists yet
  if (!projectIdParam) {
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

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center animate-shake">
            ⚠️ {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <StatusStepper currentStep="script" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400/80 leading-none mb-1">
              {t('badge')}
            </p>
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">
              {t('title')} <span className="gradient-text-purple">{t('titleAccent')}</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-lg backdrop-blur-md">
            <span className="text-[10px] font-bold text-white/60 tracking-wider font-mono">{t('cost')}</span>
          </div>
          {user && user.credits_balance < 50 && user.tier !== 'pro' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 animate-pulse">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest whitespace-nowrap">
                {t('lowBalance')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scenario Selector */}
      <div className="p-1 px-1.5 bg-black/40 rounded-[1.5rem] border border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar backdrop-blur-xl shadow-2xl">
        {[
          { id: 'evergreen', icon: Leaf },
          { id: 'trend', icon: TrendingUp },
          { id: 'educational', icon: GraduationCap }
        ].map(({ id, icon: Icon }) => {
          const isLocked = user?.tier === 'free' && id !== 'evergreen';
          const isActive = activeScenario === id;

          return (
            <button
              key={id}
              onClick={() => handleScenarioSwitch(id as any)}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-xl transition-all relative overflow-hidden group ${
                isActive 
                  ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' 
                  : 'text-white/40 hover:text-white/60'
              } ${isLocked ? 'cursor-not-allowed opacity-60 grayscale' : ''}`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-purple-400/40 group-hover:text-purple-400 transition-colors'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                {t(`scenarios.${id}`)}
              </span>
              {isLocked && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                  <Lock className="w-4 h-4 text-white/40" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {user?.tier === 'free' && activeScenario !== 'evergreen' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest leading-relaxed max-w-[200px]">
              {t('scenarios.lockedHint')}
            </p>
          </div>
          <button 
            onClick={() => router.push(`/${locale}/app/profile/subscription`)}
            className="px-4 py-2 rounded-xl bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all"
          >
            Upgrade
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center animate-shake">
          ⚠️ {error}
        </div>
      )}

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
                    ? 'Ваша ДНК еще не настроена. Сценарий создан в экспертном стиле. Настройте ДНК для идеального отзеркаливания.'
                    : 'Your DNA is not configured. Script generated in expert style. Complete DNA for perfect persona mirroring.'}
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

      {/* Topic Context */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group/topic hover:bg-white/[0.07] transition-all">
        <div className="flex items-center gap-3 flex-1 mr-4">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
          {isEditingTopic ? (
            <input 
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onBlur={handleUpdateTopic}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateTopic()}
              autoFocus
              className="bg-transparent text-xs font-medium text-white focus:outline-none w-full border-b border-purple-500/30 pb-0.5"
            />
          ) : (
            <p className="text-xs font-medium text-white/70">
              {t('topic', { topic: currentProject?.title || (locale === 'ru' ? 'Секреты автоподбора 2026' : 'Car Buying Secrets 2026') })}
            </p>
          )}
        </div>
        <button 
          onClick={() => isEditingTopic ? handleUpdateTopic() : setIsEditingTopic(true)}
          className="text-[10px] font-black text-purple-400 uppercase tracking-widest hover:text-white transition-colors"
        >
          {isEditingTopic ? 'Save' : 'Edit'}
        </button>
      </div>

      {/* Script Blocks */}
      <div className="space-y-4 relative">
        {isRefining && (
          <div className="absolute inset-0 bg-[#06060c]/40 backdrop-blur-[2px] z-10 rounded-3xl flex items-center justify-center flex-col space-y-3">
             <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
             <span className="text-[10px] font-black uppercase tracking-widest text-purple-400/80">Recalculating Style...</span>
          </div>
        )}

        {/* HOOK Block */}
        <div className="group relative">
          <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-transparent rounded-full opacity-50" />
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-white/30 uppercase">{t('tagHook')}</span>
              <button 
                onClick={() => handleApplyRefinement('Regenerate only the hook to be more viral')}
                className="opacity-0 group-hover:opacity-100 transition-all text-[9px] font-bold text-purple-400 hover:text-white uppercase tracking-widest"
              >
                {t('regenerate')}
              </button>
            </div>
            <textarea
              value={scriptData.hook}
              onChange={(e) => setScriptData({ ...scriptData, hook: e.target.value })}
              className="w-full p-5 rounded-2xl bg-[#0d0d1a] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden text-sm leading-relaxed text-white/90 font-medium focus:outline-none focus:border-purple-500/50 resize-none min-h-[100px] transition-all"
            />
          </div>
        </div>

        {/* STORY Block */}
        <div className="group relative">
          <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500/20 to-purple-500/20 rounded-full" />
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-white/30 uppercase">{t('tagStory')}</span>
              <button 
                onClick={() => handleApplyRefinement('Regenerate the story/body to be more engaging and structured')}
                className="opacity-0 group-hover:opacity-100 transition-all text-[9px] font-bold text-purple-400 hover:text-white uppercase tracking-widest"
              >
                {t('regenerate')}
              </button>
            </div>
            <textarea
              value={scriptData.story}
              onChange={(e) => setScriptData({ ...scriptData, story: e.target.value })}
              className="w-full p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-sm leading-relaxed text-white/70 focus:outline-none focus:border-purple-500/30 resize-none min-h-[120px] transition-all"
            />
          </div>
        </div>

        {/* CTA Block */}
        <div className="group relative">
          <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-t from-purple-500 to-transparent rounded-full opacity-50" />
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-white/30 uppercase">{t('tagCTA')}</span>
              <button 
                onClick={() => handleApplyRefinement('Regenerate CTA to be more punchy and clear')}
                className="opacity-0 group-hover:opacity-100 transition-all text-[9px] font-bold text-purple-400 hover:text-white uppercase tracking-widest"
              >
                {t('regenerate')}
              </button>
            </div>
            <textarea
              value={scriptData.cta}
              onChange={(e) => setScriptData({ ...scriptData, cta: e.target.value })}
              className="w-full p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-sm leading-relaxed text-white/70 focus:outline-none focus:border-purple-500/30 resize-none min-h-[80px] transition-all"
            />
          </div>
        </div>

        {/* VISUAL HOOK Block */}
        <div className="group relative">
          <div className="absolute -left-2 top-0 bottom-0 w-1 bg-cyan-500/40 rounded-full" />
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black tracking-[0.2em] text-cyan-400/50 uppercase">Visual Hook</span>
                <div className="px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[8px] font-black text-cyan-400 uppercase tracking-tighter">AI Cover</div>
              </div>
              <button 
                onClick={() => handleApplyRefinement('Regenerate the visual hook prompt to be more cinematic and professional')}
                className="opacity-0 group-hover:opacity-100 transition-all text-[9px] font-bold text-cyan-400 hover:text-white uppercase tracking-widest"
              >
                {t('regenerate')}
              </button>
            </div>
            <textarea
              value={scriptData.visual_hook || ''}
              onChange={(e) => setScriptData({ ...scriptData, visual_hook: e.target.value })}
              placeholder={locale === 'ru' ? 'Описание для обложки (Midjourney prompt)...' : 'Description for cover (Midjourney prompt)...'}
              className="w-full p-5 rounded-2xl bg-[#09121a]/50 border border-cyan-500/10 text-sm italic leading-relaxed text-cyan-100/60 focus:outline-none focus:border-cyan-500/30 resize-none min-h-[100px] transition-all"
            />
          </div>
        </div>

        {/* SOCIAL POST Block */}
        <div className="group relative">
          <div className="absolute -left-2 top-0 bottom-0 w-1 bg-pink-500/40 rounded-full" />
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-pink-400/50 uppercase">Social Post</span>
              <button 
                onClick={() => handleApplyRefinement('Refine the social post caption to be more catchy with emojis')}
                className="opacity-0 group-hover:opacity-100 transition-all text-[9px] font-bold text-pink-400 hover:text-white uppercase tracking-widest"
              >
                {t('regenerate')}
              </button>
            </div>
            <textarea
              value={scriptData.social_post || ''}
              onChange={(e) => setScriptData({ ...scriptData, social_post: e.target.value })}
              placeholder={locale === 'ru' ? 'Текст поста для соцсетей...' : 'Social post caption...'}
              className="w-full p-5 rounded-2xl bg-[#1a0912]/50 border border-pink-500/10 text-sm leading-relaxed text-pink-100/60 focus:outline-none focus:border-pink-500/30 resize-none min-h-[100px] transition-all"
            />
          </div>
        </div>
      </div>

      {/* AI Controls */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">
          {t('aiCommands')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: t('cmdSharper'), icon: '🔥', instruction: 'Make the tone sharper and more confident' },
            { label: t('cmdShorter'), icon: '✂️', instruction: 'Make it much shorter and more minimalist' },
            { label: t('cmdFunnier'), icon: '😂', instruction: 'Add some irony and humor' },
            { label: t('cmdFormal'), icon: '💼', instruction: 'Make it more professional and official' },
          ].map((cmd) => (
            <button
              key={cmd.label}
              onClick={() => handleApplyRefinement(cmd.instruction)}
              disabled={isRefining}
              className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 transition-all text-left group/btn disabled:opacity-50"
            >
              <span className="text-sm group-hover/btn:scale-110 transition-transform">{cmd.icon}</span>
              <span className="text-[11px] font-bold text-white/70 tracking-tight">{cmd.label}</span>
            </button>
          ))}
        </div>
        <div className="relative group/input">
          <input
            type="text"
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyRefinement(customCommand)}
            placeholder={t('cmdQuestion')}
            className="w-full bg-[#12121f] border border-white/10 rounded-xl py-4 px-4 pr-12 text-[12px] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-[#16162a] transition-all"
          />
          <button 
            onClick={() => handleApplyRefinement(customCommand)}
            disabled={isRefining || !customCommand.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500 hover:text-white transition-all disabled:opacity-30"
          >
            <Wand2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Strategist Advisor */}
      <StrategistChat 
        projectId={projectIdParam || ''}
        userId={user?.id || ''}
        context="script"
        onApplySuggestion={(text) => {
          // If the strategist provides a direct instruction, we use it to refine the script
          setCustomCommand(text);
          handleApplyRefinement(text);
        }}
      />

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#06060c]/80 backdrop-blur-2xl border-t border-white/5 z-50">
        <button 
          onClick={handleApprove}
          disabled={isSaving || isRefining}
          className="btn-primary w-full rounded-[2rem] py-5 flex items-center justify-center gap-3 group disabled:opacity-50 shadow-[0_8px_32px_rgba(168,85,247,0.2)]"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span className="font-black text-sm uppercase tracking-[0.1em]">{t('approve')}</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>
      <PremiumLimitModal 
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        title={limitModalData.title}
        description={limitModalData.desc}
        type={limitModalData.type}
        locale={locale}
      />
    </div>
  );
}
