'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, Wand2, Play, Pause, RotateCcw, Shuffle, Download, 
  Layers, Palette, Layout, Sliders, ChevronRight, Check, Eye, EyeOff,
  BarChart2, ListOrdered, MessageSquare, Quote, Activity, CheckCircle2,
  TrendingUp, SplitSquareVertical
} from 'lucide-react';
import { Player, PlayerRef } from '@remotion/player';
import { ViraliArchitectComposition } from '@/remotion/ViraliArchitectComposition';
import { 
  RemotionArchitectCutSheet, 
  BRollElement, 
  DynamicThemeConfig,
  BRollLayoutMode,
  BRollElementType
} from '@/lib/types/remotionArchitect';
import { buildDynamicThemeFromPrompt, resolveUserBrandStyle } from '@/lib/remotion/stylePresets';

interface MotionDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  speakerVideoUrl: string;
  transcriptData?: any[];
  initialCutSheet?: RemotionArchitectCutSheet | null;
  onExportMotion: (cutSheet: RemotionArchitectCutSheet) => Promise<void>;
  isExporting?: boolean;
}

const PRESET_PILLS = [
  { id: 'apple_clean', label: '🍏 Apple Keynote', prompt: 'Презентация Apple, светлые карточки, плавные переходы, технологичный стиль' },
  { id: 'cyberpunk_neon', label: '⚡ Неон Киберпанк', prompt: 'Темный неоновый стиль, киберпанк, яркие акценты циан и фуксия' },
  { id: 'editorial_luxury', label: '👑 Luxury Gold', prompt: 'Премиум стиль, шампанское золото, темный изумруд, глянец' },
  { id: 'hormozi_bold', label: '🔥 Hormozi Viral', prompt: 'Взрывной Hormozi стиль, желтый контраст, большие цифры, динамичный сплит-скрин' },
  { id: 'minimal_expert', label: '🎯 Минимализм', prompt: 'Строгий минималистичный стиль эксперта, матовое стекло, графики и тезисы' },
];

export const MotionDirectorModal: React.FC<MotionDirectorModalProps> = ({
  isOpen,
  onClose,
  projectId,
  speakerVideoUrl,
  transcriptData = [],
  initialCutSheet = null,
  onExportMotion,
  isExporting = false
}) => {
  const playerRef = useRef<PlayerRef>(null);

  // 1. CutSheet & Settings State
  const [cutSheet, setCutSheet] = useState<RemotionArchitectCutSheet | null>(initialCutSheet);
  const [includeSubtitles, setIncludeSubtitles] = useState<boolean>(
    initialCutSheet?.renderSettings?.includeSubtitles ?? false // OFF by default as required!
  );
  const [userPrompt, setUserPrompt] = useState<string>('Сделай стильный динамичный монтаж в стиле Apple Keynote с карточками тезисов и графиком роста');
  const [selectedPreset, setSelectedPreset] = useState<string>('apple_clean');
  const [activeTab, setActiveTab] = useState<'brief' | 'beats'>('brief');
  
  // 2. AI Processing States
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [enrichedBrief, setEnrichedBrief] = useState<any | null>(null);
  
  // 3. Selection & Surgical Edit States
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [surgicalCommand, setSurgicalCommand] = useState<string>('');
  const [isSurgicalLoading, setIsSurgicalLoading] = useState<boolean>(false);
  const [bottomRefinementPrompt, setBottomRefinementPrompt] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);

  // Dynamic Theme state
  const [dynamicTheme, setDynamicTheme] = useState<DynamicThemeConfig>(() => {
    return initialCutSheet?.renderSettings?.dynamicTheme || buildDynamicThemeFromPrompt(userPrompt, selectedPreset);
  });

  // Keep local cutSheet synced with initialCutSheet
  useEffect(() => {
    if (initialCutSheet && !cutSheet) {
      setCutSheet(initialCutSheet);
      if (initialCutSheet.renderSettings?.includeSubtitles !== undefined) {
        setIncludeSubtitles(initialCutSheet.renderSettings.includeSubtitles);
      }
      if (initialCutSheet.renderSettings?.dynamicTheme) {
        setDynamicTheme(initialCutSheet.renderSettings.dynamicTheme);
      }
    }
  }, [initialCutSheet]);

  // Video duration calculation
  const totalFrames = useMemo(() => {
    const fps = cutSheet?.renderSettings?.fps || 30;
    const maxBRoll = (cutSheet?.bRollElements || []).reduce((max, e) => Math.max(max, e.endFrame || 0), 0);
    const maxCut = (cutSheet?.cameraCuts || []).reduce((max, c) => Math.max(max, (c.startFrame || 0) + (c.durationFrames || 0)), 0);
    const transcriptMax = (transcriptData || []).reduce((max, t) => Math.max(max, Math.round((t.end || t.endTime || 0) * fps)), 0);
    return Math.max(90, maxBRoll, maxCut, transcriptMax, 300); // at least 10s fallback
  }, [cutSheet, transcriptData]);

  // 1. AI Prompt Enrichment Handler (Claude Motion Brief)
  const handleEnrichPrompt = async () => {
    if (!userPrompt.trim()) return;
    setIsEnriching(true);
    try {
      const res = await fetch('/api/ai/remotion-enrich-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'enrich_brief',
          userPrompt,
          presetKey: selectedPreset,
          scriptContext: transcriptData.map(t => t.text || t.word).join(' ').slice(0, 800)
        })
      });

      if (!res.ok) throw new Error('Ошибка связи с сервером ИИ');
      const data = await res.json();
      if (data.brief) {
        setEnrichedBrief(data.brief);
      }
      if (data.dynamicTheme) {
        setDynamicTheme(data.dynamicTheme);
      }
    } catch (err: any) {
      console.error('[MotionDirector] Enrich prompt failed:', err);
      // Fallback procedural theme
      const proceduralTheme = buildDynamicThemeFromPrompt(userPrompt, selectedPreset);
      setDynamicTheme(proceduralTheme);
      setEnrichedBrief({
        conceptTitle: 'Динамичный AI Motion',
        visualMood: 'Технологичный и лаконичный стиль',
        directorAdvice: 'Четкие переходы, инфографика в Safe Zones',
        suggestedElements: ['График показателей', 'Карточка сравнения', 'Тезисный список']
      });
    } finally {
      setIsEnriching(false);
    }
  };

  // 2. Generate Full Remotion CutSheet
  const handleGenerateCutSheet = async (overridePrompt?: string) => {
    setIsGenerating(true);
    try {
      const activePrompt = overridePrompt || userPrompt;
      const res = await fetch('/api/ai/remotion-architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptData: transcriptData.length > 0 ? transcriptData : [
            { start: 0, end: 15, text: 'Claude Motion high-retention video edit' }
          ],
          presetKey: selectedPreset,
          userPrompt: activePrompt,
          includeSubtitles,
          dynamicTheme,
          projectId,
          userIntent: activePrompt
        })
      });

      if (!res.ok) throw new Error('Ошибка генерации схемы монтажа');
      const data = await res.json();
      if (data.cutSheet) {
        // Guarantee includeSubtitles flag is respected
        const enrichedCutSheet: RemotionArchitectCutSheet = {
          ...data.cutSheet,
          renderSettings: {
            ...data.cutSheet.renderSettings,
            includeSubtitles,
            dynamicTheme
          }
        };
        setCutSheet(enrichedCutSheet);
        setActiveTab('beats'); // automatically switch to scene beats view
      }
    } catch (err: any) {
      console.error('[MotionDirector] Generate CutSheet failed:', err);
      alert('Не удалось сгенерировать сцены монтажа: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Remix Design (Changes visual seed, accent harmony, geometry without re-calling full LLM)
  const handleRemixStyle = () => {
    if (!cutSheet) return;

    // Generate random seed for every element
    const updatedElements = (cutSheet.bRollElements || []).map(elem => ({
      ...elem,
      visualSeed: Math.floor(Math.random() * 100),
      layoutMode: (['floating_hud', 'split_screen', 'pip_side_card', 'full_slide'] as BRollLayoutMode[])[
        Math.floor(Math.random() * 4)
      ]
    }));

    // Randomize dynamicTheme card geometry and pattern
    const geometries = ['rounded_modern', 'sharp_brutalist', 'hud_tech', 'pill_soft'] as const;
    const patterns = ['aurora_ring', 'tech_grid', 'minimal_dots', 'clean_gradient', 'diagonal_mesh'] as const;
    
    const nextGeometry = geometries[Math.floor(Math.random() * geometries.length)];
    const nextPattern = patterns[Math.floor(Math.random() * patterns.length)];

    const nextTheme: DynamicThemeConfig = {
      ...dynamicTheme,
      cardGeometry: nextGeometry,
      backgroundPattern: nextPattern
    };

    setDynamicTheme(nextTheme);

    const remixedCutSheet: RemotionArchitectCutSheet = {
      ...cutSheet,
      bRollElements: updatedElements,
      renderSettings: {
        ...cutSheet.renderSettings,
        dynamicTheme: nextTheme,
        includeSubtitles
      }
    };

    setCutSheet(remixedCutSheet);
  };

  // 4. Toggle Subtitles (Off by default for Motion)
  const handleToggleSubtitles = (checked: boolean) => {
    setIncludeSubtitles(checked);
    if (cutSheet) {
      setCutSheet({
        ...cutSheet,
        renderSettings: {
          ...cutSheet.renderSettings,
          includeSubtitles: checked
        }
      });
    }
  };

  // 5. Seek Player to Scene Beat
  const handleSelectBeat = (elem: BRollElement) => {
    setSelectedElementId(elem.id);
    if (playerRef.current && typeof elem.startFrame === 'number') {
      playerRef.current.seekTo(elem.startFrame);
    }
  };

  // 6. Surgical Scene Edit
  const handleSurgicalEdit = async () => {
    if (!selectedElementId || !surgicalCommand.trim() || !cutSheet) return;
    const targetElem = (cutSheet.bRollElements || []).find(e => e.id === selectedElementId);
    if (!targetElem) return;

    setIsSurgicalLoading(true);
    try {
      const res = await fetch('/api/ai/remotion-enrich-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'surgical_scene_edit',
          targetElement: targetElem,
          userCommand: surgicalCommand,
          dynamicTheme
        })
      });

      if (!res.ok) throw new Error('Ошибка хирургической модификации');
      const data = await res.json();
      if (data.updatedElement) {
        const nextElements = cutSheet.bRollElements.map(e => 
          e.id === selectedElementId ? { ...e, ...data.updatedElement } : e
        );
        setCutSheet({ ...cutSheet, bRollElements: nextElements });
        setSurgicalCommand('');
      }
    } catch (err: any) {
      console.error('[MotionDirector] Surgical edit failed:', err);
      alert('Ошибка изменения элемента: ' + err.message);
    } finally {
      setIsSurgicalLoading(false);
    }
  };

  // 7. Refine Entire CutSheet via bottom prompt
  const handleRefineAll = async () => {
    if (!bottomRefinementPrompt.trim()) return;
    setIsRefining(true);
    try {
      await handleGenerateCutSheet(`${userPrompt}. Дополнительное уточнение: ${bottomRefinementPrompt}`);
      setBottomRefinementPrompt('');
    } finally {
      setIsRefining(false);
    }
  };

  // 8. Direct Export Action
  const handleExport = async () => {
    let finalCutSheet = cutSheet;
    if (!finalCutSheet) {
      // If user hasn't generated yet, generate baseline procedural
      finalCutSheet = {
        cameraCuts: [{ startTime: '00:00.00', startFrame: 0, duration: 15, durationFrames: 450, action: 'micro_zoom' }],
        bRollElements: [
          {
            id: 'stat_1',
            type: 'stat_callout',
            startTime: '00:02.00',
            endTime: '00:06.00',
            startFrame: 60,
            endFrame: 180,
            visualSeed: 42,
            layoutMode: 'floating_hud',
            props: { title: 'КЛЮЧЕВОЙ ПОКАЗАТЕЛЬ', statValue: '+350%', statLabel: 'Рост охватов и конверсий' }
          }
        ],
        soundCues: [],
        semanticBeats: [],
        renderSettings: {
          fps: 30,
          stylePreset: selectedPreset,
          includeSubtitles,
          dynamicTheme
        }
      };
    } else {
      finalCutSheet = {
        ...finalCutSheet,
        renderSettings: {
          ...finalCutSheet.renderSettings,
          includeSubtitles,
          dynamicTheme
        }
      };
    }

    await onExportMotion(finalCutSheet);
  };

  if (!isOpen) return null;

  const selectedElem = (cutSheet?.bRollElements || []).find(e => e.id === selectedElementId);

  return (
    <div className="fixed inset-0 z-[400] bg-[#070A12]/95 backdrop-blur-2xl flex flex-col overflow-hidden text-white font-sans">
      {/* 1. TOP HEADER (Claude Motion Artifacts Header) */}
      <div className="h-14 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between bg-black/40 flex-shrink-0 z-50">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-400 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Sparkles size={16} className="text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[14px] sm:text-[15px] tracking-tight bg-gradient-to-r from-white via-white/90 to-purple-200 bg-clip-text text-transparent">
                Claude Motion Studio
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                AI Directed • 60 FPS
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right: Subtitles toggle + Remix button + Export */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Subtitles Toggle Pill (Optional for Motion, off by default!) */}
          <button
            type="button"
            onClick={() => handleToggleSubtitles(!includeSubtitles)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
              includeSubtitles 
                ? 'bg-purple-600/30 border-purple-500/60 text-purple-200' 
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
            }`}
            title="Для Motion видео субтитры опциональны"
          >
            {includeSubtitles ? <Eye size={13} className="text-purple-400" /> : <EyeOff size={13} />}
            <span>Субтитры: {includeSubtitles ? 'ВКЛ' : 'ВЫКЛ'}</span>
          </button>

          {/* Style Remix Button */}
          <button
            type="button"
            onClick={handleRemixStyle}
            disabled={!cutSheet}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 active:scale-95 transition-all disabled:opacity-40"
            title="Сгенерировать другой сид дизайна и расположение"
          >
            <Shuffle size={13} className="text-indigo-400" />
            <span>Ремикс дизайна</span>
          </button>

          {/* Export MP4 button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-500 hover:brightness-110 active:scale-95 text-white text-[12px] sm:text-[13px] font-bold tracking-tight transition-all shadow-md shadow-purple-500/25 border border-white/20 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Сохранение...</span>
              </>
            ) : (
              <>
                <span>Рендер MP4 (В экспорт)</span>
                <ChevronRight size={14} className="text-white/70" />
              </>
            )}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all ml-1"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 2. MAIN SPLIT-VIEW (Claude Artifacts Workspace) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT PANE: Prompt, Brief & Scene Beats Controls */}
        <div className="w-full md:w-[460px] lg:w-[500px] border-r border-white/10 bg-[#0A0E1A]/80 flex flex-col h-full overflow-hidden flex-shrink-0">
          {/* Tabs Switcher */}
          <div className="p-3 border-b border-white/10 bg-white/[0.02] flex items-center gap-2">
            <button
              onClick={() => setActiveTab('brief')}
              className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'brief'
                  ? 'bg-purple-600/25 border border-purple-500/40 text-purple-200 shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Wand2 size={13} />
              <span>Motion Brief & Стиль</span>
            </button>
            <button
              onClick={() => setActiveTab('beats')}
              className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'beats'
                  ? 'bg-purple-600/25 border border-purple-500/40 text-purple-200 shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers size={13} />
              <span>Раскадровка ({cutSheet?.bRollElements?.length || 0})</span>
            </button>
          </div>

          {/* Tab 1: Brief & Prompt Engine */}
          {activeTab === 'brief' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* User Prompt Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider flex items-center justify-between">
                  <span>Текстовый промпт для монтажа</span>
                  <span className="text-purple-400 lowercase">по-русски или English</span>
                </label>
                <div className="relative">
                  <textarea
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    rows={3}
                    placeholder="Например: Сделай в стиле презентации Apple с неоновыми акцентами, покажи рост метрик и сравнение до/после..."
                    className="w-full rounded-2xl bg-black/40 border border-white/10 p-3.5 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60 transition-all resize-none leading-relaxed"
                  />
                  <button
                    onClick={handleEnrichPrompt}
                    disabled={isEnriching || !userPrompt.trim()}
                    className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-bold border border-purple-500/30 flex items-center gap-1 transition-all disabled:opacity-40"
                  >
                    {isEnriching ? (
                      <>
                        <span className="w-3 h-3 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                        <span>Анализ...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={11} />
                        <span>✨ Обогатить ИИ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Style Presets Pills */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                  Быстрые стили дизайна
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_PILLS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPreset(p.id);
                        setUserPrompt(p.prompt);
                        setDynamicTheme(buildDynamicThemeFromPrompt(p.prompt, p.id));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                        selectedPreset === p.id
                          ? 'bg-purple-500/20 border-purple-500/50 text-white shadow-sm'
                          : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enriched AI Brief Card */}
              {enrichedBrief && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/30 to-indigo-950/20 border border-purple-500/30 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1">
                      <Sparkles size={11} />
                      AI Motion Brief
                    </span>
                    <span className="text-[10px] text-white/40">{enrichedBrief.conceptTitle}</span>
                  </div>
                  <p className="text-[12px] text-white/80 leading-relaxed italic">
                    «{enrichedBrief.visualMood || 'Стильная динамичная анимация'}»
                  </p>
                  
                  {/* Theme Palette Swatches */}
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <span className="text-[10px] text-white/40">Палитра:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full border border-white/20 shadow" style={{ backgroundColor: dynamicTheme.palette.accentPrimary }} title="Accent Primary" />
                      <div className="w-4 h-4 rounded-full border border-white/20 shadow" style={{ backgroundColor: dynamicTheme.palette.accentSecondary }} title="Accent Secondary" />
                      <div className="w-4 h-4 rounded-full border border-white/20 shadow" style={{ backgroundColor: dynamicTheme.palette.cardSurface }} title="Card Surface" />
                    </div>
                    <span className="text-[10px] text-white/40 ml-auto capitalize">
                      {dynamicTheme.cardGeometry.replace('_', ' ')}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Action Button: Build Scenes */}
              <button
                type="button"
                onClick={() => handleGenerateCutSheet()}
                disabled={isGenerating}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-500 hover:brightness-110 active:scale-[0.99] font-bold text-[13px] text-white transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Мультиагентный конвейер собирает сцены...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={15} />
                    <span>Сгенерировать сцены (Remotion CutSheet)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Tab 2: Scene Beats & Surgical Editor */}
          {activeTab === 'beats' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Beats list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {(!cutSheet?.bRollElements || cutSheet.bRollElements.length === 0) ? (
                  <div className="p-8 text-center space-y-3">
                    <Layers className="w-8 h-8 text-white/20 mx-auto" />
                    <p className="text-[12px] text-white/40">Сцены еще не сгенерированы.</p>
                    <button
                      onClick={() => handleGenerateCutSheet()}
                      className="px-4 py-2 rounded-xl bg-purple-600/30 border border-purple-500/50 text-purple-200 text-xs font-bold"
                    >
                      Создать сцены сейчас
                    </button>
                  </div>
                ) : (
                  cutSheet.bRollElements.map((elem, idx) => {
                    const isSelected = selectedElementId === elem.id;
                    const layoutBadge = elem.layoutMode || 'full_slide';

                    return (
                      <div
                        key={elem.id || idx}
                        onClick={() => handleSelectBeat(elem)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-950/40 border-purple-500/80 shadow-md shadow-purple-500/20 ring-1 ring-purple-500/40'
                            : 'bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase">
                              #{idx + 1} {elem.type.replace('_', ' ')}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/50 text-[10px] font-bold">
                              {elem.startTime} – {elem.endTime}
                            </span>
                          </div>
                          <span className="text-[10px] font-medium text-white/40 capitalize">
                            {layoutBadge}
                          </span>
                        </div>

                        {/* Summary of content */}
                        <div className="text-[12px] font-medium text-white/90 truncate">
                          {elem.props?.title || elem.props?.statLabel || elem.props?.text || 'Инфографический слайд'}
                        </div>
                        {elem.props?.statValue && (
                          <div className="text-[13px] font-black text-purple-400 mt-0.5">
                            {elem.props.statValue}
                          </div>
                        )}
                        {elem.props?.items && (
                          <div className="text-[10px] text-white/40 truncate mt-0.5">
                            {elem.props.items.join(' • ')}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Surgical Editor Drawer for selected beat */}
              {selectedElem && (
                <div className="p-3.5 border-t border-white/10 bg-black/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                      <Sliders size={12} />
                      Хирургическая правка выбранной сцены
                    </span>
                    <button
                      onClick={() => setSelectedElementId(null)}
                      className="text-[10px] text-white/40 hover:text-white"
                    >
                      Снять выбор
                    </button>
                  </div>

                  {/* Layout mode switcher */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-white/40 mr-1">Лейаут:</span>
                    {(['floating_hud', 'split_screen', 'pip_side_card', 'full_slide'] as BRollLayoutMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          if (!cutSheet) return;
                          const nextElements = cutSheet.bRollElements.map(e =>
                            e.id === selectedElem.id ? { ...e, layoutMode: mode } : e
                          );
                          setCutSheet({ ...cutSheet, bRollElements: nextElements });
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                          (selectedElem.layoutMode || 'full_slide') === mode
                            ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                            : 'bg-white/5 border-transparent text-white/40 hover:text-white/70'
                        }`}
                      >
                        {mode.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Command input */}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={surgicalCommand}
                      onChange={(e) => setSurgicalCommand(e.target.value)}
                      placeholder="Пример: замени заголовок на Х3 РОСТ и сделай цифры зелеными..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[11px] text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSurgicalEdit();
                      }}
                    />
                    <button
                      onClick={handleSurgicalEdit}
                      disabled={isSurgicalLoading || !surgicalCommand.trim()}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition-all disabled:opacity-40"
                    >
                      {isSurgicalLoading ? '...' : 'ИИ'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Refinement Bar (Claude Chat prompt) */}
          <div className="p-3 border-t border-white/10 bg-black/40 flex items-center gap-2">
            <input
              type="text"
              value={bottomRefinementPrompt}
              onChange={(e) => setBottomRefinementPrompt(e.target.value)}
              placeholder="Что изменить во всем ролике? (ИИ пересоберет схему)..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRefineAll();
              }}
            />
            <button
              onClick={handleRefineAll}
              disabled={isRefining || !bottomRefinementPrompt.trim()}
              className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all disabled:opacity-40"
              title="Отправить команду на ремикс ролика"
            >
              {isRefining ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" />
              ) : (
                <Sparkles size={15} />
              )}
            </button>
          </div>
        </div>

        {/* RIGHT PANE: Interactive @remotion/player Preview */}
        <div className="flex-1 bg-[#05070D] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden relative">
          {/* Ambient Glow */}
          <div 
            className="absolute w-[400px] h-[400px] rounded-full blur-[140px] opacity-20 pointer-events-none"
            style={{ backgroundColor: dynamicTheme.palette.accentPrimary }}
          />

          {/* Player Container (Phone Mockup Frame) */}
          <div className="h-full max-h-[82vh] aspect-[9/16] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white/10 bg-black relative flex flex-col">
            {cutSheet ? (
              <Player
                ref={playerRef}
                component={ViraliArchitectComposition as any}
                inputProps={{
                  speakerVideoUrl,
                  cutSheet,
                  subtitles: includeSubtitles ? transcriptData : [],
                  onSelectElement: (id: string) => setSelectedElementId(id),
                  selectedElementId
                }}
                durationInFrames={totalFrames}
                compositionWidth={1080}
                compositionHeight={1920}
                fps={30}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#000000'
                }}
                controls
                autoPlay={false}
                loop
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[14px] font-bold text-white">Интерактивный плеер Remotion</h4>
                  <p className="text-[12px] text-white/40 max-w-xs">
                    Нажмите кнопку «Сгенерировать сцены» слева, чтобы запустить живой 60 FPS просмотр
                  </p>
                </div>
                <button
                  onClick={() => handleGenerateCutSheet()}
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-lg shadow-purple-500/30"
                >
                  Собрать сцены
                </button>
              </div>
            )}
          </div>

          {/* Bottom helper info */}
          <div className="mt-3 flex items-center gap-4 text-[11px] text-white/40">
            <span>• 1080x1920 Full HD</span>
            <span>• {includeSubtitles ? 'Субтитры включены' : 'Без субтитров (чистый моушн)'}</span>
            <span>• Детерминированный Canvas</span>
          </div>
        </div>
      </div>
    </div>
  );
};
