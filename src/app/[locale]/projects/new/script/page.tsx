'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, ArrowRight, Wand2, History, ChevronRight, Loader2 } from 'lucide-react';
import { StatusStepper } from '@/components/ui/StatusStepper';
import { profileService } from '@/lib/services/profileService';
import { projectService, Project, ProjectVersion } from '@/lib/services/projectService';

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

  const [scriptData, setScriptData] = useState({
    hook: locale === 'ru' 
      ? "Знаешь почему 90% покупателей переплачивают за авто? Не потому что \"рынок такой\" — а потому что никто не объяснил 3 простых правила проверки."
      : "Do you know why 90% of buyers overpay for cars? It's not because \"that's the market\" — it's because nobody explained 3 simple inspection rules.",
    story: locale === 'ru'
      ? "Разбираю по-честному. Первое — VIN история. Всего 500 рублей и ты знаешь всё тёмное прошлое. Второе — независимая диагностика. Не верь продавцу, верь цифрам. Третье — правильный тест-драйв."
      : "I'm breaking it down honestly. First — VIN history. Just $10 and you know the entire dark past. Second — independent diagnostics. Don't trust the seller, trust the numbers. Third — the proper test drive.",
    cta: locale === 'ru'
      ? "Хочешь чек-лист проверки авто перед покупкой? Пиши слово «МАШИНА» в комментариях и я пришлю его в директ."
      : "Want a car inspection checklist before buying? Comment the word \"CAR\" and I'll send it to your DMs."
  });

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentVersion, setCurrentVersion] = useState<ProjectVersion | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!projectIdParam || !versionIdParam) return;
      
      setIsLoading(true);
      try {
        const ver = await projectService.getVersion(versionIdParam);
        if (ver?.script_data) {
          setScriptData(ver.script_data as any);
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
  }, [projectIdParam, versionIdParam]);

  const handleApplyRefinement = async (instruction: string) => {
    if (!projectIdParam || !versionIdParam) return;
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
          locale
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Refinement failed');

      setScriptData(data.script);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRefining(false);
      setCustomCommand('');
    }
  };

  const handleInitialGenerate = async () => {
    if (!topicInput.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coreIdea: topicInput,
          mode: 'initial',
          locale
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');

      setScriptData(data.script);
      // Update URL without refreshing the whole page state
      router.replace(`/${locale}/projects/new/script?projectId=${data.projectId}&versionId=${data.versionId}`);
    } catch (err: any) {
      setError(err.message);
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
        setError('Authorization failed. Please try again.');
        return;
      }
      let pId = projectIdParam;
      let vId = versionIdParam;

      // 1. Create project if doesn't exist (edge case)
      if (!pId) {
        const project = await projectService.createProject({
          title: scriptData.hook.substring(0, 30) + '...',
          userId: profile.id
        });
        if (!project) throw new Error('Project creation failed');
        pId = project.id;
      }

      // 2. Update version with latest script data
      const version = await projectService.updateVersion(vId!, {
        scriptData: scriptData
      });
      if (!version) throw new Error('Version update failed');

      // Redirect to Storyboard
      router.push(`/${locale}/projects/new/storyboard?projectId=${pId}&versionId=${vId}`);
    } catch (err: any) {
      console.error('Save failed:', err);
      setError(err.message || 'Failed to save project');
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
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder={locale === 'ru' ? 'Напр: 5 секретов как выбрать лучшее авто...' : 'E.g.: 5 secrets to picking the best car...'}
              className="w-full h-48 bg-[#0d0d1a] border border-white/10 rounded-[2rem] p-8 text-xl font-medium text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/50 transition-all resize-none shadow-2xl"
            />
          </div>

          <button
            onClick={handleInitialGenerate}
            disabled={!topicInput.trim()}
            className="w-full btn-primary py-6 rounded-[2rem] flex items-center justify-center gap-4 group disabled:opacity-30 disabled:grayscale transition-all shadow-[0_20px_40px_rgba(168,85,247,0.3)]"
          >
            <span className="font-black text-lg uppercase tracking-widest">
              {locale === 'ru' ? 'Создать сценарий' : 'Generate Script'}
            </span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </button>
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
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-lg backdrop-blur-md">
          <span className="text-[10px] font-bold text-white/60 tracking-wider font-mono">{t('cost')}</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center animate-shake">
          ⚠️ {error}
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
    </div>
  );
}
