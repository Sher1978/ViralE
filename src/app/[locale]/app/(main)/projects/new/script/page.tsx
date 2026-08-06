'use client';
// Build trigger: Ensure TypeScript property name parity (script_data)


import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { 
  Sparkles, ArrowRight, Wand2, History, ChevronRight, Loader2, Dna, Lock, Key, 
  AlertTriangle, Cpu, GraduationCap, TrendingUp, Leaf, Zap, Play, Camera, 
  Share2, Monitor 
} from 'lucide-react';

const Youtube = ({ className, size = 24 }: { className?: string; size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <polygon points="10 15 15 12 10 9" fill="currentColor" />
  </svg>
);
import { StatusStepper } from '@/components/ui/StatusStepper';
import { profileService, Profile } from '@/lib/services/profileService';
import { projectService, Project, ProjectVersion } from '@/lib/services/projectService';
import { StrategistChat } from '@/components/studio/StrategistChat';
import { PremiumLimitModal } from '@/components/ui/PremiumLimitModal';
import { motion, AnimatePresence } from 'framer-motion';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { ScriptPreviews } from './_components/ScriptPreviews';
import { SingleScriptEditor } from './_components/SingleScriptEditor';
import { ScenarioLegend } from './_components/ScenarioLegend';
import { TrizMatrix } from './_components/TrizMatrix';

import { createInitialManifest, parseScriptTextToPayload, sortTrizIdeas } from '@/lib/studio-utils';

import { idb } from '@/lib/idb';

import { BottomNav } from '@/components/layout/BottomNav';


export default function ScriptLabPage() {
  const t = useTranslations('scriptLab');
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = useLocale();

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
  const [selectedEngine, setSelectedEngine] = useState<'gemini' | 'claude' | 'claude-byok' | 'groq'>('groq');
  
  const [trizIdeas, setTrizIdeas] = useState<any[] | null>(null);
  const [isGeneratingTriz, setIsGeneratingTriz] = useState(false);
  const [isAiLocked, setIsAiLocked] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalData, setLimitModalData] = useState({ title: '', desc: '', type: 'trial' as any });
  const [selectedPlatform, setSelectedPlatform] = useState<'tiktok' | 'youtube' | 'instagram' | 'threads' | 'linkedin'>('tiktok');
  const [ideationType, setIdeationType] = useState<'text' | 'youtube'>('text');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [scriptPreviews, setScriptPreviews] = useState<any | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  const [initialTab, setInitialTab] = useState<'new' | 'used'>('new');
  const [usedIdeas, setUsedIdeas] = useState<any[]>([]);
  const [loadingUsed, setLoadingUsed] = useState(false);

  useEffect(() => {
    async function loadUsedIdeas() {
      setLoadingUsed(true);
      try {
        const res = await fetch(`/api/ideas?status=used`);
        if (res.ok) {
          const data = await res.json();
          setUsedIdeas(Array.isArray(data) ? data : data.ideas || []);
        }
      } catch (err) {
        console.error('Failed to load spent ideas:', err);
      } finally {
        setLoadingUsed(false);
      }
    }
    loadUsedIdeas();
  }, []);

  const handleRestartGeneration = async (topic: string) => {
    setError(null);
    setTopicInput(topic);
    setInitialTab('new');
    setIsLoading(true);

    setAllScenarios(null);
    setScriptPreviews(null);
    setSelectedStyle(null);
    setScriptData({ hook: '' as any, body: '' as any, triz_inversion: '' as any, cta: '' as any, visual_hook: '', social_post: '' });
    if (typeof (globalThis as any).window !== 'undefined') {
      (globalThis as any).sessionStorage?.removeItem('allScenarios');
      (globalThis as any).sessionStorage?.removeItem('scriptPreviews');
      (globalThis as any).sessionStorage?.removeItem('selectedStyle');
      (globalThis as any).sessionStorage?.removeItem('isGenerating');
    }
    try {
      const response = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coreIdea: topic,
          mode: 'initial',
          locale,
          engine: selectedEngine
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (locale === 'ru' ? 'Ошибка генерации' : 'Generation failed'));

      if (data.previews) {
        setScriptPreviews(data.previews);
        if (typeof (globalThis as any).window !== 'undefined') {
          (globalThis as any).sessionStorage?.setItem('scriptPreviews', JSON.stringify(data.previews));
        }
      }

      if (data.onboardingIncomplete) {
        setOnboardingIncomplete(true);
      }
      
      const prof = await profileService.getOrCreateProfile();
      setUser(prof);
      
      setIsGenerating(true);
      if (typeof (globalThis as any).window !== 'undefined') {
        (globalThis as any).sessionStorage?.setItem('isGenerating', 'true');
      }
      
      router.replace(`/app/projects/new/script?projectId=${data.projectId}`);
    } catch (err: any) {
      console.error('[ScriptLab] Restart generation failed:', err);
      setError(err.message || (locale === 'ru' ? 'Произошла ошибка' : 'An error occurred'));
      setIsGenerating(false);
    } finally {
      setIsLoading(false);
    }
  };


  const [activeScenario, setActiveScenario] = useState<'edutainment' | 'evergreen' | 'trends' | 'controversial' | 'detective' | 'napkin_explainer'>('evergreen');
  const [allScenarios, setAllScenarios] = useState<any>(() => {
    if (typeof (globalThis as any).window !== 'undefined') {
      const saved = (globalThis as any).sessionStorage?.getItem('allScenarios');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { return null; }
      }
    }
    return null;
  });

  const [scriptData, setScriptData] = useState(() => {
    const defaultData = {
      hook: '' as any,
      body: '' as any,
      triz_inversion: '' as any,
      cta: '' as any,
      visual_hook: '',
      social_post: ''
    };
    if (typeof (globalThis as any).window !== 'undefined') {
      const saved = (globalThis as any).sessionStorage?.getItem('allScenarios');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.evergreen || parsed || defaultData;
        } catch (e) { return defaultData; }
      }
    }
    return defaultData;
  });


  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const loadingSteps = locale === 'ru' 
    ? [
        { title: 'Анализируем идею...', desc: 'Нейросеть ищет лучшие паттерны под ваш запрос' },
        { title: 'Калибруем Digital DNA...', desc: 'Адаптируем стиль под ваш профиль' },
        { title: 'Прошиваем смыслы...', desc: 'Логически выстраиваем структуру видео' },
        { title: 'Финальная сборка...', desc: 'Создаем 5 вариантов подачи (от хайпа до классики)' }
      ]
    : [
        { title: 'Analyzing Idea...', desc: 'AI is searching for optimal narrative patterns' },
        { title: 'Calibrating Digital DNA...', desc: 'Adapting style to match your profile' },
        { title: 'Injecting Narrative...', desc: 'Structuring logical video flow' },
        { title: 'Final Assembly...', desc: 'Generating 5 delivery variations' }
      ];

  useEffect(() => {
    let interval: any;
    if (isLoading || isGenerating) {
      interval = setInterval(() => {
        setGenerationStep(prev => (prev + 1) % loadingSteps.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isLoading, isGenerating, loadingSteps.length]);
  
  const [selectionSources, setSelectionSources] = useState<Record<string, 'edutainment' | 'evergreen' | 'trends' | 'controversial' | 'detective' | 'napkin_explainer'>>({
    hook: 'evergreen',
    body: 'evergreen',
    triz_inversion: 'evergreen',
    cta: 'evergreen'
  });

  const [masterTextOverride, setMasterTextOverride] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);


  const scenarios: ('edutainment' | 'evergreen' | 'trends' | 'controversial' | 'detective' | 'napkin_explainer')[] = ['edutainment', 'evergreen', 'trends', 'controversial', 'detective', 'napkin_explainer'];

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentVersion, setCurrentVersion] = useState<ProjectVersion | null>(null);
  const [user, setUser] = useState<Profile | null>(null);

  // Session Recovery for Generation State (Fix for state loss during router transitions)
  useEffect(() => {
    if (typeof (globalThis as any).window !== 'undefined') {
      const savedGenerating = (globalThis as any).sessionStorage?.getItem('isGenerating') === 'true';
      const savedScenarios = (globalThis as any).sessionStorage?.getItem('allScenarios');
      const savedPreviews = (globalThis as any).sessionStorage?.getItem('scriptPreviews');
      const savedStyle = (globalThis as any).sessionStorage?.getItem('selectedStyle');
      
      if (savedGenerating) {
        setIsGenerating(true);
      }
      
      if (savedPreviews) {
        try {
          setScriptPreviews(JSON.parse(savedPreviews));
        } catch (e) {}
      }

      if (savedStyle) {
        setSelectedStyle(savedStyle);
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

  const hasTriggeredGen = useRef(false);

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
        const fromStrategist = searchParams.get('from_strategist');
        if (fromStrategist === '1') {
          try {
            if (typeof (globalThis as any).window !== 'undefined') {
              const text = (globalThis as any).localStorage?.getItem('strategist_export_text');
              if (text) {
                const parsed = parseScriptTextToPayload(text);
                const scriptObj = {
                  hook: parsed.hook || text,
                  body: parsed.body || '',
                  triz_inversion: parsed.triz_inversion || '',
                  cta: parsed.cta || '',
                  visual_hook: '',
                  social_post: ''
                };
                
                const matrixObj = {
                  evergreen: scriptObj,
                  trends: scriptObj,
                  edutainment: scriptObj,
                  controversial: scriptObj,
                  detective: scriptObj,
                  napkin_explainer: scriptObj
                };
                
                setScriptData(scriptObj);
                setAllScenarios(matrixObj);
                setTopicInput(parsed.hook ? parsed.hook.slice(0, 60) : text.slice(0, 60));

                (globalThis as any).sessionStorage?.setItem('allScenarios', JSON.stringify(matrixObj));
                
                // Clear localStorage keys
                (globalThis as any).localStorage?.removeItem('strategist_export_text');
                (globalThis as any).localStorage?.removeItem('strategist_export_ts');
              }
            }
          } catch (e) {
            console.error('[ScriptLab] Failed to load strategist exported script:', e);
          }
        } else {
          // If no project, check for pre-filled topic from Ideas page
          const topic = searchParams.get('topic');
          if (topic) {
            setTopicInput(topic);
          }
        }
        return;
      }
      
      setIsLoading(true);
      try {
        const ver = versionIdParam 
          ? await projectService.getVersion(versionIdParam)
          : await projectService.getLatestVersion(projectIdParam);
          
        if (ver?.script_data) {
          const data = ver.script_data as any;
          if (data.evergreen) {
            setAllScenarios(data);
            setScriptData(data[activeScenario] || data.evergreen);
            
            // Sync with session cache immediately
            if (typeof (globalThis as any).window !== 'undefined') {
              (globalThis as any).sessionStorage?.setItem('allScenarios', JSON.stringify(data));
            }
          } else if (data.allScenarios) {
            setAllScenarios(data.allScenarios);
            setScriptData(data.allScenarios[activeScenario] || data.allScenarios.evergreen);
            
            if (typeof (globalThis as any).window !== 'undefined') {
              (globalThis as any).sessionStorage?.setItem('allScenarios', JSON.stringify(data.allScenarios));
            }
          } else if (data.segments) {
            const hookSegment = data.segments.find((s: any) => s.type === 'intro_avatar');
            const contextSegment = data.segments.find((s: any) => s.type === 'animated_still');
            const meatSegment = data.segments.find((s: any) => s.type === 'broll');
            const ctaSegment = data.segments.find((s: any) => s.type === 'outro_avatar');

            const reconstructedScript = {
              hook: hookSegment?.scriptText || '',
              body: contextSegment?.scriptText || '',
              triz_inversion: meatSegment?.scriptText || '',
              cta: ctaSegment?.scriptText || '',
              visual_hook: '',
              social_post: ''
            };
            setScriptData(reconstructedScript);
            
            const dummyAllScenarios = {
              evergreen: reconstructedScript,
              trends: reconstructedScript,
              edutainment: reconstructedScript,
              controversial: reconstructedScript,
              detective: reconstructedScript,
              napkin_explainer: reconstructedScript
            };
            setAllScenarios(dummyAllScenarios);
          } else {
            setScriptData(data);
            const dummyAllScenarios = {
              evergreen: data,
              trends: data,
              edutainment: data,
              controversial: data,
              detective: data,
              napkin_explainer: data
            };
            setAllScenarios(dummyAllScenarios);
          }
          setCurrentVersion(ver);
        }
        
        const proj = await projectService.getProject(projectIdParam);
        setCurrentProject(proj);
        if (proj?.title) setTopicInput(proj.title);
        
        // Stop global loading
        setIsLoading(false);
        setIsGenerating(false);
        if (typeof (globalThis as any).window !== 'undefined') {
          (globalThis as any).sessionStorage?.removeItem('isGenerating');
        }
        
      } catch (err) {
        console.error('Failed to load script:', err);
        setError('Failed to load project data');
        setIsLoading(false);
        setIsGenerating(false);
        if (typeof (globalThis as any).window !== 'undefined') {
          (globalThis as any).sessionStorage?.removeItem('isGenerating');
        }
      }
    }

    loadData();
  }, [projectIdParam, versionIdParam, searchParams]);

  const handleScenarioSwitch = (scenario: 'edutainment' | 'evergreen' | 'trends' | 'controversial' | 'detective' | 'napkin_explainer') => {
    setActiveScenario(scenario);
  };

  const handleBlockSelect = (type: string, source: 'edutainment' | 'evergreen' | 'trends' | 'controversial' | 'detective' | 'napkin_explainer') => {
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
      allScenarios[selectionSources.body]?.body?.words || allScenarios[selectionSources.body]?.body,
      allScenarios[selectionSources.triz_inversion]?.triz_inversion?.words || allScenarios[selectionSources.triz_inversion]?.triz_inversion,
      allScenarios[selectionSources.cta]?.cta?.words || allScenarios[selectionSources.cta]?.cta,
    ];
    return parts.filter(Boolean).map(v => typeof v === 'string' ? v : (v as any)?.words || '').join('\n\n');
  };

  const handleCopyToClipboard = () => {
    const text = getFinalText();
    ((globalThis as any).navigator)?.clipboard?.writeText(text);
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
        const updatedMatrix = { ...allScenarios, [activeScenario]: newScript };
        setAllScenarios(updatedMatrix);
        if (typeof (globalThis as any).window !== 'undefined') {
          (globalThis as any).sessionStorage?.setItem('allScenarios', JSON.stringify(updatedMatrix));
        }
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
      if (typeof (globalThis as any).window !== 'undefined') {
        (globalThis as any).sessionStorage?.setItem('isGenerating', 'true');
      }
      
      router.replace(`/app/projects/new/script?projectId=${project.id}&versionId=${version.id}`);
    } catch (err: any) {
      console.error('[ScriptLab] Manual start failed:', err);
      setError(err.message || (locale === 'ru' ? 'Произошла ошибка' : 'An error occurred'));
      setIsGenerating(false);
      if (typeof (globalThis as any).window !== 'undefined') {
        (globalThis as any).sessionStorage?.removeItem('isGenerating');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTriz = async () => {
    if (!topicInput.trim()) {
      setError(locale === 'ru' ? 'Введите идею видео' : 'Please enter a video idea');
      return;
    }
    
    setError(null);
    setIsGeneratingTriz(true);
    try {
      const response = await fetch('/api/script/triz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicInput,
          locale,
          engine: selectedEngine
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate TRIZ ideas');
      
      // Map API fields (level, hook, scenario/goal/cta) to TrizMatrix fields (screen_name, idea_title, rationale)
      const mappedIdeas = (data.ideas || []).map((idea: any) => ({
        screen_name: idea.screen_name || idea.level || '',
        idea_title: idea.idea_title || idea.hook || '',
        rationale: idea.rationale || `${idea.goal ? `[${idea.goal}] ` : ''}${idea.scenario || ''}${idea.cta ? ` \nCTA: ${idea.cta}` : ''}`.trim()
      }));
      setTrizIdeas(sortTrizIdeas(mappedIdeas));

    } catch (err: any) {
      setError(err.message || 'Error generating TRIZ matrix');
    } finally {
      setIsGeneratingTriz(false);
    }
  };

  const handleInitialGenerate = async () => {
    if (isAiLocked) {
      return handleManualStart();
    }
    
    if (ideationType === 'youtube') {
      if (!youtubeUrl.trim()) {
        setError(locale === 'ru' ? 'Введите ссылку на YouTube видео' : 'Please enter a YouTube video URL');
        return;
      }
      
      setYoutubeLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/ai/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: youtubeUrl })
        });
        
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch YouTube transcript');
        }
        
        setYoutubeLoading(false);
        // Execute the AI script generation using the fetched transcript text directly
        await executeGeneration(data.transcript);
      } catch (err: any) {
        console.error('[YouTubeGen] Error:', err);
        setError(err.message || 'Error parsing YouTube video');
        setYoutubeLoading(false);
      }
    } else {
      // Directly generate 6 scenarios bypassing TRIZ matrix
      await executeGeneration(topicInput);
    }
  };

  const executeGeneration = async (overrideIdea?: string) => {
    setError(null);
    setIsLoading(true);
    setAllScenarios(null);
    setScriptPreviews(null);
    setSelectedStyle(null);

    setScriptData({ hook: '' as any, body: '' as any, triz_inversion: '' as any, cta: '' as any, visual_hook: '', social_post: '' });
    if (typeof (globalThis as any).window !== 'undefined') {
      (globalThis as any).sessionStorage?.removeItem('allScenarios');
      (globalThis as any).sessionStorage?.removeItem('scriptPreviews');
      (globalThis as any).sessionStorage?.removeItem('selectedStyle');
      (globalThis as any).sessionStorage?.removeItem('isGenerating');
    }
    const ideaToUse = overrideIdea || topicInput;
    try {
      const response = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coreIdea: ideaToUse,
          mode: 'initial',
          locale,
          engine: selectedEngine
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (locale === 'ru' ? 'Ошибка генерации' : 'Generation failed'));

      if (data.previews) {
        setScriptPreviews(data.previews);
        if (typeof (globalThis as any).window !== 'undefined') {
          (globalThis as any).sessionStorage?.setItem('scriptPreviews', JSON.stringify(data.previews));
        }
      }

      if (data.onboardingIncomplete) {
        setOnboardingIncomplete(true);
      }
      
      const prof = await profileService.getOrCreateProfile();
      setUser(prof);
      
      // Crucial: Set generating mode to true and persist it
      setIsGenerating(true);
      if (typeof (globalThis as any).window !== 'undefined') {
        (globalThis as any).sessionStorage?.setItem('isGenerating', 'true');
        if (data.projectId) {
          (globalThis as any).sessionStorage?.setItem('currentProjectId', data.projectId);
        }
      }
      
      router.replace(`/app/projects/new/script?projectId=${data.projectId}`);
    } catch (err: any) {
      console.error('[ScriptLab] Generation failed:', err);
      const isCreditError = err.message === 'Insufficient credits' || 
                            err.message?.includes('limit reached') || 
                            err.message?.includes('Limit reached') ||
                            err.message?.includes('limit (3) reached') ||
                            err.message?.includes('limit (20) reached') ||
                            err.message?.includes('threshold (50 credits) required');
      
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
      if (typeof (globalThis as any).window !== 'undefined') {
        (globalThis as any).sessionStorage?.removeItem('isGenerating');
        (globalThis as any).sessionStorage?.removeItem('scriptPreviews');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreview = async (styleKey: string, preview: any) => {
    setIsLoading(true);
    setError(null);
    const targetProjectId = projectIdParam || currentProject?.id || (typeof (globalThis as any).window !== 'undefined' ? (globalThis as any).sessionStorage?.getItem('currentProjectId') : null);
    try {
      const response = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: targetProjectId,
          coreIdea: topicInput,
          mode: 'full_script',
          selectedStyle: styleKey,
          selectedPreview: preview,
          locale,
          engine: selectedEngine
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate script');

      if (data.projectId && typeof (globalThis as any).window !== 'undefined') {
        (globalThis as any).sessionStorage?.setItem('currentProjectId', data.projectId);
      }

      setScriptData(data.script);
      setSelectedStyle(styleKey);
      
      if (typeof (globalThis as any).window !== 'undefined') {
        (globalThis as any).sessionStorage?.setItem('selectedStyle', styleKey);
      }

      // Redirect to include versionId in the URL
      router.replace(`/app/projects/new/script?projectId=${data.projectId}&versionId=${data.versionId}`);
    } catch (err: any) {
      console.error('[ScriptLab] Full script generation failed:', err);
      setError(err.message || 'Error generating script');
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
    const isRawString = typeof activeScript === 'string';
    const scriptPayload = isRawString 
      ? parseScriptTextToPayload(activeScript) 
      : activeScript;

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
          title: topicInput || (isRawString ? activeScript.substring(0, 30) : (activeScript.hook?.words || activeScript.hook || '').substring(0, 30)) + '...',
          userId: profile.id,
          parentId: fromProjectId && fromProjectId !== 'null' ? fromProjectId : undefined
        });
        if (!project) throw new Error(locale === 'ru' ? 'Не удалось создать проект' : 'Project creation failed');
        pId = project.id;

        // Copy dialogue session from temp empty/global key to new project ID
        try {
          if (typeof (globalThis as any).window !== 'undefined') {
            const oldMessages = (globalThis as any).sessionStorage.getItem('strategist_messages_') || 
                               (globalThis as any).sessionStorage.getItem('strategist_messages_global');
            if (oldMessages) {
              (globalThis as any).sessionStorage.setItem(`strategist_messages_${pId}`, oldMessages);
            }
          }
        } catch (e) {
          console.warn('[ScriptLab] Failed to copy strategist session to new project:', e);
        }
      }

      // Clear local IndexedDB cache drafts to force the Studio to reload the fresh script manifest
      try {
        await idb.delete(`viral_draft_${pId}`, 'ProjectDrafts');
        await idb.delete(`viral_editor_draft_${pId}`, 'ProjectDrafts');
        console.log('[ScriptLab] Cleared local IndexedDB drafts for project:', pId);
      } catch (e) {
        console.warn('[ScriptLab] Failed to clear local drafts:', e);
      }

      if (!vId || vId === 'null') {
        console.log('[ScriptLab] No valid versionId, creating new version...');
        
        // Wrap raw script into a Production Manifest for the Studio
        const initialManifest = createInitialManifest(pId, 'temp', scriptPayload);
        if (isRawString) {
          initialManifest.customScript = activeScript;
          initialManifest.useCustomScript = true;
        }
        if (allScenarios) {
          (initialManifest as any).allScenarios = allScenarios;
        }
        
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
        const initialManifest = createInitialManifest(pId, vId, scriptPayload);
        if (isRawString) {
          initialManifest.customScript = activeScript;
          initialManifest.useCustomScript = true;
        }
        if (allScenarios) {
          (initialManifest as any).allScenarios = allScenarios;
        }
        
        const version = await projectService.updateVersion(vId, {
          script_data: initialManifest
        });
        if (!version) throw new Error(locale === 'ru' ? 'Ошибка при обновлении версии' : 'Version update failed');
      }

      // Redirect to Studio (Universal Script Screen)
      router.push(`/app/projects/${pId}/studio?tab=script_editor`);
    } catch (err: any) {
      console.error('[ScriptLab] Save failed:', err);
      setError(err.message || (locale === 'ru' ? 'Не удалось сохранить проект' : 'Failed to save project'));
    } finally {
      setIsSaving(false);
    }
  };

  // Show full-screen loader for YouTube subtitle fetching
  if (youtubeLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center animate-fade-in overflow-hidden">
        {/* Cinematic Backdrop for Loading */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/cyberpunk_splash.png" 
            className="w-full h-full object-cover opacity-60 animate-ken-burns scale-110"
            alt="Splash Background"
          />
          <div className="absolute inset-0 bg-[#050508]/80" />
        </div>

        <div className="relative z-10 space-y-2 mb-12">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">YouTube Parser Core</p>
          <h2 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-widest leading-tight">
            {locale === 'ru' ? 'Извлечение субтитров' : 'Extracting Subtitles'}
          </h2>
        </div>

        <div className="relative z-10 w-32 h-32 mb-12">
           <div className="absolute inset-0 border-2 border-red-500/10 rounded-full" />
           <div className="absolute inset-0 border-2 border-t-red-500 rounded-full animate-spin" />
           <div className="absolute inset-4 border border-orange-500/20 rounded-full animate-reverse-spin" />
           <div className="absolute inset-0 flex items-center justify-center">
              <Youtube className="w-8 h-8 text-red-500 animate-pulse" />
           </div>
        </div>
        
        <div className="relative z-10 space-y-4 max-w-sm">
           <div className="space-y-2">
             <p className="text-xl font-black uppercase italic tracking-tighter text-white">
               {locale === 'ru' ? 'Скачиваем транскрипт видео...' : 'Downloading video transcript...'}
             </p>
             <p className="text-xs font-medium text-white/60">
               {locale === 'ru' 
                 ? 'ИИ считывает аудиодорожку и форматирует её для дальнейшего рерайта' 
                 : 'AI is reading the audio track and formatting it for subsequent rewriting'}
             </p>
           </div>
           <div className="pt-4 space-y-2">
             <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] leading-relaxed">
                SHER DIGITAL CORE IS EXTRACTING AUDIO DATA MATRIX
             </p>
           </div>
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)] pointer-events-none z-10" />
      </div>
    );
  }

  // Only show full-screen loader if we have NO data to show yet
  if ((isLoading || isGenerating) && !scriptPreviews && (!scriptData || !scriptData.hook || (!scriptData.hook.words && typeof scriptData.hook !== 'string'))) {

    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center animate-fade-in overflow-hidden">
        {/* Cinematic Backdrop for Loading */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/cyberpunk_splash.png" 
            className="w-full h-full object-cover opacity-60 animate-ken-burns scale-110"
            alt="Splash Background"
          />
          <div className="absolute inset-0 bg-[#050508]/80" />
        </div>

        <div className="relative z-10 space-y-2 mb-12">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Viral Engine Core</p>
          <h2 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-widest leading-tight">
            {locale === 'ru' ? 'Начата генерация Контентного Лего' : 'Content Lego Assembly Started'}
          </h2>
        </div>

        <div className="relative z-10 w-32 h-32 mb-12">
           <div className="absolute inset-0 border-2 border-purple-500/10 rounded-full" />
           <div className="absolute inset-0 border-2 border-t-purple-500 rounded-full animate-spin" />
           <div className="absolute inset-4 border border-cyan-500/20 rounded-full animate-reverse-spin" />
           <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
           </div>
        </div>
        
        <div className="relative z-10 space-y-4 max-w-sm">
           <AnimatePresence mode="wait">
             <motion.div 
               key={generationStep}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               className="space-y-2"
             >
               <p className="text-xl font-black uppercase italic tracking-tighter text-white">
                 {loadingSteps[generationStep].title}
               </p>
               <p className="text-xs font-medium text-white/60">
                 {loadingSteps[generationStep].desc}
               </p>
             </motion.div>
           </AnimatePresence>
           <div className="pt-4 space-y-2">
             <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] leading-relaxed">
                SHER DIGITAL CORE IS ASSEMBLING YOUR NARRATIVE MATRIX
             </p>
             <p className="text-[10px] font-bold text-purple-400 capitalize pt-2">
                {locale === 'ru' ? 'Обычно это занимает 15-20 секунд 👇' : 'This usually takes 15-20 seconds 👇'}
             </p>
           </div>
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.05)_0%,transparent_70%)] pointer-events-none z-10" />
      </div>
    );
  }

  // Initial Ideation UI if no project exists yet AND we don't have generated data in memory
  if (!projectIdParam && !scriptPreviews && (!scriptData || !scriptData.hook || (!scriptData.hook.words && typeof scriptData.hook !== 'string'))) {
    return (
      <div className="space-y-12 animate-fade-in max-w-2xl mx-auto pt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+1.25rem))] pb-10 px-4">
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

        {/* Sub-navigation tabs inside Initial Script Lab */}
        <div className="flex border-b border-white/5 gap-6 justify-center">
          <button 
            onClick={() => setInitialTab('new')} 
            className={`flex items-center gap-2 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${initialTab === 'new' ? 'text-white' : 'text-white/20 hover:text-white/40'}`}
          >
            <Zap className="w-3.5 h-3.5" />
            {locale === 'ru' ? 'Новый сценарий' : 'New Script'}
            {initialTab === 'new' && <motion.div layoutId="initialActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />}
          </button>
          <button 
            onClick={() => setInitialTab('used')} 
            className={`flex items-center gap-2 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${initialTab === 'used' ? 'text-white' : 'text-white/20 hover:text-white/40'}`}
          >
            <History className="w-3.5 h-3.5" />
            {locale === 'ru' ? 'История идей' : 'Spent Ideas'}
            {initialTab === 'used' && <motion.div layoutId="initialActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />}
          </button>
        </div>

        {initialTab === 'used' ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            {loadingUsed ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold animate-pulse">
                  {locale === 'ru' ? 'Загрузка истории...' : 'Loading Spent Ideas...'}
                </p>
              </div>
            ) : usedIdeas.length > 0 ? (
              <div className="grid gap-4">
                {usedIdeas.map((idea, index) => (
                  <div 
                    key={idea.id || index}
                    className="p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/40">
                          {idea.category || 'Idea'}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white uppercase italic tracking-tight leading-tight">
                        {idea.topic_title}
                      </h3>
                      {idea.rationale && (
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest line-clamp-2">
                          {idea.rationale}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRestartGeneration(idea.topic_title)}
                      disabled={isLoading}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600/10 to-purple-500/10 border border-purple-500/20 hover:from-purple-600/20 hover:to-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                    >
                      {isLoading ? (
                        <Loader2 size={12} className="animate-spin text-purple-400" />
                      ) : (
                        <Wand2 size={12} className="text-purple-400" />
                      )}
                      {locale === 'ru' ? 'Перезапустить генерацию' : 'Restart Generation'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-white/20 uppercase text-[10px] tracking-widest font-black rounded-[2rem] border border-dashed border-white/5 bg-white/[0.01]">
                {locale === 'ru' ? 'История пуста. Вы еще не генерировали сценарии из идей.' : 'Idea history is empty.'}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-300">
            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-shake uppercase tracking-widest text-center">
                {error}
              </div>
            )}
            
            {/* Input Type Selector (Text Idea vs YouTube Link) */}
            <div className="flex gap-3">
              <button 
                onClick={() => setIdeationType('text')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all relative ${
                  ideationType === 'text'
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                    : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                }`}
              >
                <Sparkles size={14} className={ideationType === 'text' ? 'text-purple-400' : ''} />
                {locale === 'ru' ? 'Текст Идеи' : 'Text Idea'}
              </button>
              <button 
                onClick={() => setIdeationType('youtube')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all relative ${
                  ideationType === 'youtube'
                    ? 'bg-red-500/10 border-red-500/30 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                    : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                }`}
              >
                <Youtube size={14} className={ideationType === 'youtube' ? 'text-red-500' : ''} />
                {locale === 'ru' ? 'YouTube Видео' : 'YouTube Video'}
              </button>
            </div>

            {ideationType === 'youtube' ? (
              <div className="relative group space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400/60 ml-2">
                    {locale === 'ru' ? 'ССЫЛКА НА YOUTUBE' : 'YOUTUBE LINK'}
                  </span>
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mr-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    {locale === 'ru' ? 'ТРАНСКРИПТ' : 'TRANSCRIPT ACTIVE'}
                  </span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 top-6" />
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl((e.target as any).value)}
                  placeholder={locale === 'ru' ? 'Вставьте https://www.youtube.com/watch?v=...' : 'Paste https://www.youtube.com/watch?v=...'}
                  className="w-full bg-[#0d0d1a] border border-white/10 rounded-[2rem] px-8 py-6 text-lg font-medium text-white placeholder:text-white/10 focus:outline-none focus:border-red-500/50 transition-all shadow-2xl relative z-10"
                />
                <p className="text-[10px] text-white/40 font-bold uppercase leading-relaxed px-4 pt-1">
                  {locale === 'ru' 
                    ? '💡 ИИ автоматически извлечет субтитры из этого видео, проанализирует его структуру и создаст для вас 5 вариантов нового вирусного сценария!'
                    : '💡 AI will automatically download subtitles from this video, analyze its structure, and generate 5 variants of a new viral script!'}
                </p>
              </div>
            ) : (
              <div className="relative group space-y-2">
                <div className="flex items-center justify-between px-1">
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400/60 ml-2">
                     {locale === 'ru' ? 'СУТЬ РОЛИКА' : 'VIDEO ESSENCE'}
                   </span>
                   <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-xl">
                      {[
                        { id: 'tiktok', icon: Zap, color: 'text-purple-400' },
                        { id: 'youtube', icon: Play, color: 'text-red-500' },
                        { id: 'instagram', icon: Camera, color: 'text-pink-500' },
                        { id: 'threads', icon: Share2, color: 'text-blue-400' },
                        { id: 'linkedin', icon: Monitor, color: 'text-blue-600' }
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPlatform(p.id as any)}
                          className={`p-2.5 rounded-xl transition-all ${
                            selectedPlatform === p.id 
                              ? 'bg-white/10 border border-white/10 text-white shadow-lg' 
                              : 'text-white/20 hover:text-white/40'
                          }`}
                          title={p.id.toUpperCase()}
                        >
                          <p.icon size={14} className={selectedPlatform === p.id ? p.color : ''} />
                        </button>
                      ))}
                   </div>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 top-6" />
                <textarea
                  id="topic-textarea"
                  value={topicInput}
                  onChange={(e) => {
                    console.log('Topic change:', (e.target as any).value);
                    setTopicInput((e.target as any).value);
                  }}
                  placeholder={locale === 'ru' ? 'Напр: 5 секретов как выбрать лучшее авто...' : 'E.g.: 5 secrets to picking the best car...'}
                  className="w-full h-48 bg-[#0d0d1a] border border-white/10 rounded-[2rem] p-8 text-xl font-medium text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/50 transition-all resize-none shadow-2xl relative z-10"
                />
              </div>
            )}


            {!isAiLocked && (
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-2 ml-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400/60">
                    {locale === 'ru' ? 'Выбор ИИ' : 'AI Engine'}
                  </label>
                  <InfoTooltip 
                    content={locale === 'ru' 
                      ? "Gemini — быстрая классика. Claude — глубокий анализ. Groq — моментальная генерация." 
                      : "Gemini — fast classic. Claude — deep analysis. Groq — lightning fast generation."} 
                  />
                </div>
                <div className="flex flex-wrap gap-2 p-1.5 bg-black/40 rounded-[1.5rem] border border-white/5 backdrop-blur-xl">
                  <button
                    onClick={() => setSelectedEngine('gemini')}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest ${
                      selectedEngine === 'gemini' 
                        ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' 
                        : 'text-white/20 hover:text-white/40'
                    }`}
                  >
                    Gemini 3
                  </button>
                  <button
                    onClick={() => setSelectedEngine('claude')}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest ${
                      selectedEngine === 'claude' 
                        ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' 
                        : 'text-white/20 hover:text-white/40'
                    }`}
                  >
                    Claude 4
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
            ) : trizIdeas ? (
              <TrizMatrix 
                ideas={trizIdeas}
                locale={locale}
                onSelect={(ideaText) => executeGeneration(ideaText)}
                onBack={() => setTrizIdeas(null)}
              />
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400/60 ml-2">
                  {locale === 'ru' ? 'ВЫБЕРИТЕ ПАЙПЛАЙН ГЕНЕРАЦИИ' : 'SELECT GENERATION PIPELINE'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                  {/* Pipeline Option 1: TRIZ 9-Screen Matrix */}
                  <button
                    onClick={handleGenerateTriz}
                    disabled={
                      ideationType === 'youtube'
                        ? (!youtubeUrl || youtubeUrl.trim().length < 5 || isLoading || isGeneratingTriz)
                        : (!topicInput || topicInput.trim().length < 3 || isLoading || isGeneratingTriz)
                    }
                    className="p-6 rounded-[2rem] bg-gradient-to-br from-purple-900/30 via-purple-900/10 to-transparent border border-purple-500/30 hover:border-purple-500/60 hover:from-purple-900/40 text-left transition-all group disabled:opacity-30 disabled:pointer-events-none active:scale-[0.98] shadow-xl flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                          {isGeneratingTriz ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {locale === 'ru' ? '9 Экранов' : '9 Screens'}
                        </span>
                      </div>
                      <h4 className="text-base font-black uppercase italic tracking-tight text-white group-hover:text-purple-300 transition-colors">
                        {locale === 'ru' ? '🧩 Матрица ТРИЗ' : '🧩 TRIZ Matrix'}
                      </h4>
                      <p className="text-[11px] font-medium text-white/50 leading-relaxed">
                        {locale === 'ru'
                          ? 'Анализ идеи по 9 экранам ТРИЗ (надсистема, подсистема, прошлое/будущее) для поиска нестандартного угла.'
                          : 'Deep idea analysis across 9 TRIZ screens (supersystem, subsystem, past/future) to find a unique angle.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] font-black uppercase tracking-widest text-purple-400 group-hover:text-purple-300">
                      <span>{isGeneratingTriz ? (locale === 'ru' ? 'Синтезирую ТРИЗ...' : 'Generating TRIZ...') : (locale === 'ru' ? 'Прогнать через ТРИЗ →' : 'Run TRIZ Matrix →')}</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  {/* Pipeline Option 2: Direct 6 Scripts */}
                  <button
                    id="generate-script-btn"
                    onClick={handleInitialGenerate}
                    disabled={
                      ideationType === 'youtube'
                        ? (!youtubeUrl || youtubeUrl.trim().length < 5 || isLoading || isGeneratingTriz)
                        : (!topicInput || topicInput.trim().length < 3 || isLoading || isGeneratingTriz)
                    }
                    className="p-6 rounded-[2rem] bg-gradient-to-br from-indigo-900/30 via-indigo-900/10 to-transparent border border-indigo-500/30 hover:border-indigo-500/60 hover:from-indigo-900/40 text-left transition-all group disabled:opacity-30 disabled:pointer-events-none active:scale-[0.98] shadow-xl flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {locale === 'ru' ? 'Быстрый старт' : 'Fast Track'}
                        </span>
                      </div>
                      <h4 className="text-base font-black uppercase italic tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                        {locale === 'ru' ? '🚀 Сразу 6 сценариев' : '🚀 Direct 6 Scripts'}
                      </h4>
                      <p className="text-[11px] font-medium text-white/50 leading-relaxed">
                        {locale === 'ru'
                          ? 'Прямой синтез 6 готовых вариантов сценария под разные психотипы (Evergreen, Trends, Edutainment и др.).'
                          : 'Directly generate 6 complete script variations tailored to different viewer personas.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] font-black uppercase tracking-widest text-indigo-400 group-hover:text-indigo-300">
                      <span>{isLoading ? (locale === 'ru' ? 'Генерирую сценарии...' : 'Generating Scripts...') : (locale === 'ru' ? 'Сгенерировать 6 вариантов →' : 'Generate 6 Scripts →')}</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-40">
      <StatusStepper currentStep="script" />

      {/* Explanation Block */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 to-cyan-500/5 border border-white/10 flex flex-col gap-2 text-white/80 shadow-lg relative overflow-hidden group">
        <div className="flex items-start gap-3 relative z-10">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 shrink-0">
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-white">
              {locale === 'ru' ? 'Сборка по методу «Контент-Lego»' : 'Content-Lego Assembly Method'}
            </h3>
            <p className="text-[11px] sm:text-xs font-medium leading-relaxed text-white/60">
              {locale === 'ru' 
                ? 'Здесь представлены несколько стилей написания сценария на заданную тему. Однако они разбиты на составляющие блоки (Хук, Контекст, Мясо, Призыв). С помощью контент-Lego можно сопоставлять эти блоки из разных матриц, собирая как конструктор свой идеальный гибридный текст, а также редактировать любой из них. Когда всё будет готово, нажмите кнопку в самом низу, чтобы перейти на этап Студии.'
                : 'Here are several styles of writing a script on a given topic. However, they are broken down into component blocks (Hook, Context, Meat, CTA). With Content-Lego, you can mix and match these blocks from different matrices, assembling your ideal hybrid text like a constructor, and edit any of them. When you are ready, click the button at the very bottom to proceed to the Studio stage.'}
            </p>
          </div>
        </div>
      </div>

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
            { id: 'edutainment', color: '#3B82F6', label: 'Edutainment' },
            { id: 'evergreen', color: '#00FF9F', label: 'Evergreen' },
            { id: 'trends', color: '#FF8A00', label: 'Trends' },
            { id: 'controversial', color: '#FF2D55', label: 'Controversial' },
            { id: 'detective', color: '#00D2FF', label: locale === 'ru' ? 'Детектив' : 'Detective' },
            { id: 'napkin_explainer', color: '#A855F7', label: locale === 'ru' ? 'Маркер и доска' : 'Marker & Board' }
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

      {scriptPreviews && (!scriptData || !scriptData.hook || (!scriptData.hook.words && typeof scriptData.hook !== 'string')) ? (
        <ScriptPreviews 
          previews={scriptPreviews}
          locale={locale}
          onSelect={handleSelectPreview}
          isLoading={isLoading}
        />
      ) : scriptData && (scriptData.hook?.words || typeof scriptData.hook === 'string') ? (
        <SingleScriptEditor 
          scriptData={scriptData}
          locale={locale}
          selectedStyle={selectedStyle}
          onUpdate={setScriptData}
          onRefine={handleApplyRefinement}
          onAccept={async () => {
            handleApprove(scriptData);
          }}
          onCopy={handleCopyToClipboard}
          isSaving={isSaving}
          isGenerating={isRefining || isLoading}
        />
      ) : null}

      <StrategistChat 
        projectId={projectIdParam || ''}
        userId={user?.id || ''}
        context="script"
        locale={locale}
        onApplySuggestion={(text) => handleApplyRefinement(text)}
        onUseScript={(text) => handleApprove(text)}
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
