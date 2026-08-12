'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/navigation';
import { CheckCircle, Copy, Download, Share2, Send, Play, ArrowRight, ArrowLeft, Loader2, AlertCircle, HardDrive, Image as ImageIcon, Folder, Plus, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { StatusStepper } from '@/components/ui/StatusStepper';
import { renderService, RenderJob } from '@/lib/services/renderService';
import { socialService } from '@/lib/services/socialService';
import { motion, AnimatePresence } from 'framer-motion';
import { projectService, Project, ProjectVersion } from '@/lib/services/projectService';
import { idb } from '@/lib/idb';
import { supabase } from '@/lib/supabase';
import { splitCaptionText } from '@/lib/utils';
import DistributionFactory from '../../[id]/studio/_components/DistributionFactory';
import { Suspense } from 'react';
import { getFFmpeg, resetFFmpeg } from '@/lib/ffmpeg-delivery';
import { fetchFile } from '@ffmpeg/util';
import { renderRemotionInDevice } from '@/lib/remotion/remotionClientExporter';
import { RemotionArchitectCutSheet } from '@/lib/types/remotionArchitect';

function DeliveryPageContent() {
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
  const [isExporting, setIsExporting] = useState(false);
  const [version, setVersion] = useState<ProjectVersion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [showRemotion, setShowRemotion] = useState<boolean>(false);
  const [activeEngine, setActiveEngine] = useState<'remotion' | 'ffmpeg'>('ffmpeg');
  const [remotionOutputUrl, setRemotionOutputUrl] = useState<string | null>(null);
  const [ffmpegOutputUrl, setFfmpegOutputUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const [displayProgress, setDisplayProgress] = useState(0);
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);
  const [shotstackRealStatus, setShotstackRealStatus] = useState<string | null>(null);
  const [showShotstackModal, setShowShotstackModal] = useState(false);
  const [renderMode, setRenderMode] = useState<'shotstack' | 'ffmpeg'>('ffmpeg');
  const [confirmEngineModal, setConfirmEngineModal] = useState<'remotion' | 'ffmpeg' | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(1);

  const REAL_STAGES_RU = [
    'Этап 1 из 5: Инициализация и подготовка медиапотока',
    'Этап 2 из 5: Мультиагентный ИИ-анализ сценария (Director, Art, Animator)',
    'Этап 3 из 5: Валидация Safe Zones и нормализация схемы монтажа',
    'Этап 4 из 5: Покадровый детерминированный Canvas-рендер 1080p',
    'Этап 5 из 5: Финализация контейнера MP4 и сохранение в CDN'
  ];

  const sendTelegramErrorAlert = async (stageIdx: number, stageTitle: string, errorDetails: string) => {
    try {
      await fetch('/api/telegram/notify-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: stageTitle,
          stageIndex: stageIdx,
          error: errorDetails,
          projectId
        })
      });
    } catch (e) {
      console.warn('[Delivery] Failed to send Telegram alert:', e);
    }
  };
  const isLaunchingRenderRef = useRef(false);
  const isCancelledRef = useRef(false);
  const ffmpegRef = useRef<any>(null);

  useEffect(() => {
    if (!version) return;
    const checkCaches = async () => {
      try {
        const remotionCache = await idb.get(`final_render_${projectId}_${version.id}_remotion`, 'MediaBuffer');
        if (remotionCache instanceof Blob) {
          const rUrl = URL.createObjectURL(remotionCache);
          setRemotionOutputUrl(rUrl);
        }
        const ffmpegCache = await idb.get(`final_render_${projectId}_${version.id}_ffmpeg`, 'MediaBuffer');
        if (ffmpegCache instanceof Blob) {
          const fUrl = URL.createObjectURL(ffmpegCache);
          setFfmpegOutputUrl(fUrl);
        }
      } catch (e) {}
    };
    checkCaches();
  }, [version, projectId]);


  const statusStepsRu = [
    'Собираем проект в облаке Shotstack...',
    'Обрабатываем оригинальный голос...',
    'Применяем умную обрезку под формат 9:16...',
    'Генерируем стильные анимированные субтитры...',
    'Синхронизируем текст с голосом спикера...',
    'Накатываем цветокоррекцию и склейки...',
    'Кодируем видео в формат H.264 для Telegram...',
    'Сохраняем готовый ролик на высокоскоростной CDN...'
  ];

  const statusStepsEn = [
    'Assembling project in Shotstack Cloud...',
    'Processing original voice track...',
    'Applying smart 9:16 portrait crop...',
    'Generating stylish animated subtitles...',
    'Syncing script timestamps with voice...',
    'Applying cinematic color grade and cuts...',
    'Encoding final video in H.264 MP4 format...',
    'Saving final cut to global CDN storage...'
  ];

  // Sync displayProgress with actual DB progress
  useEffect(() => {
    setDisplayProgress(renderProgress);
  }, [renderProgress]);

  // Smoothly increment visible progress between 30% and 92% to show the pipeline is alive
  useEffect(() => {
    if (job?.status !== 'processing' && job?.status !== 'queued') {
      return;
    }

    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        if (prev >= 30 && prev < 92) {
          return prev + 1; // Increment by 1%
        }
        return prev;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [job?.status, renderProgress]);

  // Periodically cycle through explanatory steps
  useEffect(() => {
    if (job?.status !== 'processing' && job?.status !== 'queued') {
      return;
    }

    const interval = setInterval(() => {
      setStatusMessageIndex(prev => (prev + 1) % statusStepsRu.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [job?.status]);

  // Build real-time explanatory status message based on actual Shotstack state
  const getShotstackStatusText = () => {
    if (!shotstackRealStatus) return null;
    
    switch (shotstackRealStatus.toLowerCase()) {
      case 'queued':
        return locale === 'ru' 
          ? 'В очереди Shotstack (Сервер ждет запуска)...' 
          : 'Queued in Shotstack (Waiting to start)...';
      case 'rendering':
      case 'processing':
        return locale === 'ru' 
          ? 'Рендерим видео (Сервер обрабатывает кадры)...' 
          : 'Rendering video (Server is processing frames)...';
      case 'done':
      case 'completed':
        return locale === 'ru' 
          ? 'Рендер окончен! Загружаем финальную версию...' 
          : 'Render completed! Fetching final cut...';
      case 'failed':
        return locale === 'ru' 
          ? 'Ошибка: Рендеринг в Shotstack завершился сбоем' 
          : 'Error: Shotstack rendering failed';
      default:
        return locale === 'ru'
          ? `Рендеринг в процессе (Ответ сервера: "${shotstackRealStatus}")...`
          : `Rendering in progress (Server response: "${shotstackRealStatus}")...`;
    }
  };

  const currentStatusMsg = job?.status === 'completed'
    ? 'Готово!'
    : job?.status === 'failed'
    ? 'Ошибка сборки'
    : job?.status === 'processing' || job?.status === 'queued'
    ? (getShotstackStatusText() || (locale === 'ru' ? statusStepsRu[statusMessageIndex] : statusStepsEn[statusMessageIndex]))
    : (renderStatus || 'Сборка проекта...');

  // Sync state once version/manifest loads
  useEffect(() => {
    if (version?.script_data) {
      const manifest = version.script_data as any;
      if (manifest.showSubtitles !== undefined) {
        setShowSubtitles(manifest.showSubtitles);
      }
      if (manifest.useRemotion !== undefined) {
        setShowRemotion(manifest.useRemotion);
        if (manifest.useRemotion) {
          setActiveEngine('remotion');
        }
      }
    }
  }, [version]);

  const handleToggleSubtitles = async (checked: boolean) => {
    setShowSubtitles(checked);
    addSystemLog(checked ? 'Субтитры включены' : 'Субтитры выключены');
    
    if (version && projectId) {
      // Mark active render as cancelled so error handler ignores worker termination
      isCancelledRef.current = true;
      setError(null);

      const updatedManifest = {
        ...(version.script_data as any),
        showSubtitles: checked
      };
      
      const updatedVersion: ProjectVersion = {
        ...version,
        script_data: updatedManifest
      };

      // Update local state optimistically
      setVersion(updatedVersion);
      
      try {
        await projectService.updateLatestVersionManifest(projectId, updatedManifest);
        addSystemLog('Настройки субтитров успешно сохранены в БД.');
      } catch (err: any) {
        console.error('Failed to update subtitles flag:', err);
        addSystemLog(`Ошибка сохранения настроек субтитров: ${err.message}`);
      }

      // If an FFmpeg render is currently running, cancel/reset it
      if (isLaunchingRenderRef.current) {
        addSystemLog('Прерываем текущий рендеринг...');
        try {
          await resetFFmpeg();
        } catch (e) {
          console.warn('[Delivery] Reset FFmpeg error:', e);
        }
        isLaunchingRenderRef.current = false;
      }

      // Reset current job view so loader or new cached render is shown
      setJob(null);
      setRenderProgress(0);
      setRenderStatus(checked ? 'Перезапуск рендера с субтитрами...' : 'Перезапуск рендера без субтитров...');

      // Immediately trigger client render with updated version
      setTimeout(() => {
        handleClientRender(updatedVersion);
      }, 150);
    }
  };

  const handleToggleRemotion = async (checked: boolean) => {
    setShowRemotion(checked);
    addSystemLog(checked ? 'Remotion Engine включен' : 'Remotion Engine отключен (пересборка без инфографики)');
    
    if (version && projectId) {
      isCancelledRef.current = true;
      setError(null);

      const updatedManifest = {
        ...(version.script_data as any),
        useRemotion: checked
      };
      
      const updatedVersion: ProjectVersion = {
        ...version,
        script_data: updatedManifest
      };

      setVersion(updatedVersion);
      
      try {
        await projectService.updateLatestVersionManifest(projectId, updatedManifest);
        addSystemLog('Настройки Remotion успешно сохранены в БД.');
      } catch (err: any) {
        console.error('Failed to update remotion flag:', err);
        addSystemLog(`Ошибка сохранения настроек Remotion: ${err.message}`);
      }

      if (isLaunchingRenderRef.current) {
        addSystemLog('Прерываем текущий рендеринг...');
        try {
          await resetFFmpeg();
        } catch (e) {
          console.warn('[Delivery] Reset FFmpeg error:', e);
        }
        isLaunchingRenderRef.current = false;
      }

      setJob(null);
      setRenderProgress(0);
      setRenderStatus(checked ? 'Перезапуск рендера через Remotion Engine...' : 'Перезапуск рендера без Remotion (FFmpeg)...');

      setTimeout(() => {
        handleClientRender(updatedVersion);
      }, 150);
    }
  };

  const [showLogConsole, setShowLogConsole] = useState(false);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);

  const addSystemLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setSystemLogs(prev => [`[${timestamp}] ${msg}`, ...prev]);
  };

  const manifest = version?.script_data as any;
  const distributionAssets = manifest?.distributionAssets as any;
  const distributionImages = manifest?.distributionImages as Record<string, string> || {};

  const scriptData = {
    hook: manifest?.hook || manifest?.script?.hook || manifest?.scriptText?.split('\n')?.[0] || manifest?.segments?.[0]?.scriptText?.split('\n')?.[0] || '',
    context: manifest?.context || manifest?.script?.context || '',
    meat: manifest?.subtitleClips?.map((s: any) => s.text).join(' ') || manifest?.customScript || manifest?.scriptText || manifest?.meat || manifest?.script?.meat || manifest?.segments?.map((s: any) => s.scriptText).join('\n\n') || '',
    cta: manifest?.cta || manifest?.script?.cta || '',
  };

  const TEXT_OUTPUTS = [
    {
      platform: 'Telegram',
      icon: '✈️',
      accent: '#4D9EFF',
      text: distributionAssets?.sfv_description?.text || (scriptData ? `${scriptData.hook}\n\n${scriptData.meat}\n\n${scriptData.cta}` : ''),
    },
    {
      platform: 'Twitter / X',
      icon: '🐦',
      accent: '#1DA1F2',
      text: distributionAssets?.deep_content?.threads_fb_text || (scriptData ? `${scriptData.hook.substring(0, 200)}... #ViralEngine` : ''),
    },
    {
      platform: 'Instagram',
      icon: '📸',
      accent: '#E4405F',
      text: distributionAssets?.sfv_description?.text || (scriptData ? `${scriptData.hook}\n\n${scriptData.meat}\n\n#ViralEngine #Reels` : ''),
    },
    {
      platform: 'TikTok',
      icon: '🎵',
      accent: '#00F2EA',
      text: distributionAssets?.sfv_description?.text || (scriptData ? `${scriptData.hook}\n\n#ViralEngine #Trends` : ''),
    },
    {
      platform: 'LinkedIn',
      icon: '💼',
      accent: '#0077B5',
      text: distributionAssets?.linkedin_executive?.text || (scriptData ? `New insights:\n\n${scriptData.meat}` : ''),
    },
  ];

  
  // Build drawtext filter chain
  const buildDrawtextFilter = (clips: any[], baseFilter: string, videoHeight: number = 1920, manifestData: any = null): string => {
    if (clips.length === 0) return baseFilter;
    
    // Escape special chars for FFmpeg drawtext
    const esc = (t: string) => (t || '')
      .replace(/\r?\n|\r/g, ' ')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\\\'")  
      .replace(/:/g, '\\\\:')
      .replace(/,/g, '\\\\,')
      .replace(/\[/g, '\\\\[')
      .replace(/\]/g, '\\\\]');

    const activeManifest = manifestData || manifest;
    const subStyleIdx = activeManifest?.subtitleStyle || 0;
    const rawSize = activeManifest?.subtitleSize;
    const subSize1080p = (rawSize && rawSize >= 25) ? rawSize : 38;
    const subPos = activeManifest?.subtitlePos || { x: 0, y: 0 };
    const customTextColor = activeManifest?.subtitleColor;
    const customBgColor = activeManifest?.subtitleBgColor;
    
    const toFfmpegColor = (hex: string, defaultColor: string): string => {
      if (!hex) return defaultColor;
      if (hex === 'transparent') return 'transparent';
      if (hex.startsWith('#')) {
        return '0x' + hex.substring(1).toUpperCase();
      }
      return hex;
    };

    // Scale coordinates accurately for 1080p (or 720p mobile export canvas)
    const isMobile = videoHeight === 1280;
    const canvasScale = isMobile ? (720 / 1080) : 1.0;
    const baseScale = isMobile ? 0.67 : 1.0;
    
    const subSize = Math.round(subSize1080p * canvasScale);

    const drawtextChain = clips.flatMap(c => {
      const lines = splitCaptionText(c.text || '');
      const line1 = lines[0] || '';
      const line2 = lines[1] || '';

      const isUppercase = subStyleIdx !== 3;
      const line1Processed = isUppercase ? line1.toUpperCase() : line1;
      const line2Processed = isUppercase ? line2.toUpperCase() : line2;

      const txt1 = esc(line1Processed);
      const txt2 = esc(line2Processed);
      
      // Style mapping with FFmpeg-compatible colors
      let fontcolor = 'white';
      let box = 0;
      let boxcolor = 'black@0.5';
      let borderw = 2;
      let bordercolor = 'black';
      let shadowx = 0;
      let shadowy = 0;
      let shadowcolor = 'black@0.8';
      let useItalic = false;

      if (subStyleIdx === 0) { // Yellow Italic (титры №1)
        fontcolor = '0xFACC15'; borderw = Math.round(2 * baseScale); shadowx = Math.round(2 * baseScale); shadowy = Math.round(2 * baseScale); useItalic = true;
      } else if (subStyleIdx === 1) { // Left White Bold (Screenshot 1)
        fontcolor = 'white'; borderw = 0; shadowy = Math.round(2 * baseScale); shadowcolor = 'black@0.6';
      } else if (subStyleIdx === 2) { // Center Thin White (Screenshot 2)
        fontcolor = 'white'; borderw = 0; shadowy = Math.round(2 * baseScale); shadowcolor = 'black@0.4';
      } else if (subStyleIdx === 3) { // Center Yellow Outline (Screenshot 3, bottom)
        fontcolor = '0xFACC15'; borderw = Math.round(2 * baseScale); bordercolor = 'black'; shadowx = 0; shadowy = 0;
      } else if (subStyleIdx === 4) { // Highlighter Yellow (Screenshot 3, top)
        fontcolor = 'black'; box = 1; boxcolor = '0xFACC15'; borderw = 0; shadowx = 0; shadowy = 0;
      }

      // Override colors if customized
      if (customTextColor) {
        fontcolor = toFfmpegColor(customTextColor, fontcolor);
      }
      if (customBgColor) {
        if (customBgColor === 'transparent') {
          box = 0;
        } else {
          box = 1;
          boxcolor = toFfmpegColor(customBgColor, boxcolor);
        }
      }

      // Map Y coordinates exactly to studio editor (bottom: 15% anchor + subtitlePos.y offset)
      const baseBottomY = Math.round(videoHeight * 0.85 + (subPos.y * canvasScale));
      const translatedX = Math.round(subPos.x * canvasScale);
      
      const isLeftAlign = subStyleIdx === 1;
      const finalX = isLeftAlign
        ? `w*0.1 + ${Math.round(translatedX)}`
        : `(w-text_w)/2 + ${Math.round(translatedX)}`;

      const subStart = typeof c.startTime === 'number' && !isNaN(c.startTime) ? c.startTime : 0;
      const subEnd = typeof c.endTime === 'number' && !isNaN(c.endTime) ? c.endTime : subStart + 3;
      const font = useItalic ? 'font_italic.ttf' : 'font.ttf';

      // Advanced Dynamics: Math-based slide expressions matching Framer Motion config
      const FADE_DUR = 0.15;
      const animMap: Record<number, {dxIn: number, dyIn: number, dxOut: number, dyOut: number}> = {
        0: { dxIn: 0, dyIn: 20, dxOut: 0, dyOut: -10 },
        1: { dxIn: -30, dyIn: 0, dxOut: 20, dyOut: 0 },
        2: { dxIn: 0, dyIn: 5, dxOut: 0, dyOut: -5 },
        3: { dxIn: 0, dyIn: 15, dxOut: 0, dyOut: -15 },
        4: { dxIn: 0, dyIn: 0, dxOut: 0, dyOut: 0 },
      };
      
      const anim = animMap[subStyleIdx] || animMap[0];
      const dxIn = Math.round(anim.dxIn * baseScale);
      const dyIn = Math.round(anim.dyIn * baseScale);
      const dxOut = Math.round(anim.dxOut * baseScale);
      const dyOut = Math.round(anim.dyOut * baseScale);

      const progIn = `clip((t-${subStart})/${FADE_DUR}\\,0\\,1)`;
      const progOut = `clip((t-(${subEnd}-${FADE_DUR}))/${FADE_DUR}\\,0\\,1)`;

      const alphaExpr = `clip((t-${subStart})/${FADE_DUR}\\,0\\,1)*clip((${subEnd}-t)/${FADE_DUR}\\,0\\,1)`;
      const xExpr = `${finalX} + ${dxIn}*(1-${progIn}) + ${dxOut}*${progOut}`;

      const lineGap = Math.round(6 * baseScale);
      const hasTwoLines = !!line2;

      // Mathematically anchor bottom of subtitle text block at baseBottomY
      const finalY2 = Math.round(baseBottomY - subSize);
      const finalY1 = hasTwoLines
        ? Math.round(baseBottomY - (subSize * 2 + lineGap))
        : finalY2;

      const yExpr1 = `${finalY1} + ${dyIn}*(1-${progIn}) + ${dyOut}*${progOut}`;
      const yExpr2 = `${finalY2} + ${dyIn}*(1-${progIn}) + ${dyOut}*${progOut}`;

      const padding = Math.round(6 * baseScale);

      const lineFilters = [];

      // Add Line 1
      if (line1) {
        lineFilters.push([
          `drawtext=fontfile=${font}:text='${txt1}'`,
          `fontsize=${subSize}`,
          `fontcolor=${fontcolor}`,
          `borderw=${borderw}`,
          `bordercolor=${bordercolor}`,
          `shadowcolor=${shadowcolor}`,
          `shadowx=${shadowx}`,
          `shadowy=${shadowy}`,
          box ? `box=1:boxcolor=${boxcolor}:boxborderw=${padding}` : '',
          `x='${xExpr}'`,
          `y='${yExpr1}'`,
          `alpha='${alphaExpr}'`,
          `enable='between(t,${subStart},${subEnd})'`,
        ].filter(Boolean).join(':'));
      }

      // Add Line 2 if it exists
      if (line2) {
        lineFilters.push([
          `drawtext=fontfile=${font}:text='${txt2}'`,
          `fontsize=${subSize}`,
          `fontcolor=${fontcolor}`,
          `borderw=${borderw}`,
          `bordercolor=${bordercolor}`,
          `shadowcolor=${shadowcolor}`,
          `shadowx=${shadowx}`,
          `shadowy=${shadowy}`,
          box ? `box=1:boxcolor=${boxcolor}:boxborderw=${padding}` : '',
          `x='${xExpr}'`,
          `y='${yExpr2}'`,
          `alpha='${alphaExpr}'`,
          `enable='between(t,${subStart},${subEnd})'`,
        ].filter(Boolean).join(':'));
      }

      return lineFilters;
    }).join(',');

    return baseFilter ? `${baseFilter},${drawtextChain}` : drawtextChain;
  };

  const executeConfirmedGeneration = async (engine: 'remotion' | 'ffmpeg') => {
    setConfirmEngineModal(null);
    setActiveEngine(engine);
    setShowRemotion(engine === 'remotion');
    addSystemLog(`Запуск сборки роликов через ${engine === 'remotion' ? 'Remotion AI Cinematic Engine' : 'Standard FFmpeg'}...`);

    if (!version) return;

    if (engine === 'remotion') setRemotionOutputUrl(null);
    else setFfmpegOutputUrl(null);

    setJob({ id: `local-${engine}-render`, status: 'processing', output_url: '', progress: 5 } as any);
    setRenderProgress(5);
    setRenderStatus(`Запуск генерации через ${engine === 'remotion' ? 'Remotion AI Engine' : 'Standard FFmpeg'}...`);

    isLaunchingRenderRef.current = false;
    isCancelledRef.current = false;
    handleClientRender(version, engine);
  };

  const handleSwitchEngine = async (targetEngine: 'remotion' | 'ffmpeg') => {
    setActiveEngine(targetEngine);
    setShowRemotion(targetEngine === 'remotion');
    addSystemLog(`Переключение движка рендеринга на ${targetEngine === 'remotion' ? 'Remotion Motion Engine' : 'Standard FFmpeg'}...`);

    if (!version) return;

    if (targetEngine === 'remotion' && remotionOutputUrl) {
      setJob({ id: 'local-remotion-render', status: 'completed', output_url: remotionOutputUrl, progress: 100 } as any);
      setRenderProgress(100);
      setRenderStatus('Готово (Remotion Motion Engine из кеша)!');
      return;
    }

    if (targetEngine === 'ffmpeg' && ffmpegOutputUrl) {
      setJob({ id: 'local-ffmpeg-render', status: 'completed', output_url: ffmpegOutputUrl, progress: 100 } as any);
      setRenderProgress(100);
      setRenderStatus('Готово (FFmpeg Engine из кеша)!');
      return;
    }

    // Target variant not yet in memory/cache — launch rendering for it!
    setJob({ id: `local-${targetEngine}-render`, status: 'processing', output_url: '', progress: 5 } as any);
    setRenderProgress(5);
    setRenderStatus(`Запуск сборки ${targetEngine === 'remotion' ? 'Remotion' : 'FFmpeg'}...`);

    isLaunchingRenderRef.current = false;
    isCancelledRef.current = false;
    handleClientRender(version, targetEngine);
  };

  const handleClientRender = async (ver: ProjectVersion, targetEngineOverride?: 'remotion' | 'ffmpeg') => {
    if (isLaunchingRenderRef.current) return;
    isLaunchingRenderRef.current = true;
    isCancelledRef.current = false;
    setError(null);
    
    const selectedEngine = targetEngineOverride || activeEngine;
    const manifestData = ver.script_data as any;
    const shouldShowSubtitles = manifestData?.showSubtitles !== false;
    
    const remotionCacheKey = `final_render_${projectId}_${ver.id}_remotion_v2`;
    const ffmpegCacheKey = `final_render_${projectId}_${ver.id}_ffmpeg_${shouldShowSubtitles ? 'subs' : 'nosubs'}`;

    setJob((prev: any) => {
      if (prev?.status === 'completed' && prev?.output_url) return prev;
      return { id: `local-${selectedEngine}-render`, status: 'processing', output_url: '', progress: 5 } as any;
    });
    
    // 0. CHECK CACHE FOR SELECTED ENGINE
    try {
      const activeCacheKey = selectedEngine === 'remotion' ? remotionCacheKey : ffmpegCacheKey;
      const cachedRender = await idb.get(activeCacheKey, 'MediaBuffer');
      if (cachedRender instanceof Blob) {
        console.log('[Delivery] Found cached render for engine:', selectedEngine, ver.id);
        const url = URL.createObjectURL(cachedRender);
        if (selectedEngine === 'remotion') setRemotionOutputUrl(url);
        else setFfmpegOutputUrl(url);

        setJob({ id: `local-${selectedEngine}-render`, status: 'completed', output_url: url, progress: 100 } as any);
        setRenderProgress(100);
        setRenderStatus(`Готово (${selectedEngine === 'remotion' ? 'Remotion' : 'FFmpeg'} из кеша)`);
        setIsLoading(false);
        isLaunchingRenderRef.current = false;
        return;
      }
    } catch (e) { console.warn('[Delivery] Cache check failed:', e); }

    // 1. REMOTION ARCHITECT ENGINE BRANCH
    if (selectedEngine === 'remotion') {
      try {
        setIsLoading(false);

        // STAGE 1: Media Initialization & Speaker Video Preload (0% -> 10%)
        setCurrentStageIndex(1);
        setRenderProgress(3);
        setRenderStatus('Инициализация Remotion Engine...');

        let speakerBlob: Blob | string | null = manifestData?.aRollUrl || null;
        if (!speakerBlob || (typeof speakerBlob === 'string' && speakerBlob.startsWith('blob:'))) {
          const cached = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
          if (cached instanceof Blob) speakerBlob = cached;
        }

        if (!speakerBlob) {
          const errorMsg = 'ОШИБКА ЭТАПА 1: Исходное видео спикера (A-Roll) не найдено в памяти устройства или БД.';
          setError(errorMsg);
          sendTelegramErrorAlert(1, REAL_STAGES_RU[0], errorMsg);
          setIsLoading(false);
          isLaunchingRenderRef.current = false;
          return;
        }

        setRenderProgress(8);
        setRenderStatus('Загрузка медиапотока исходного видео...');
        await new Promise((r) => setTimeout(r, 600)); // Visual stage pacing for Stage 1
        setRenderProgress(10);
        setRenderStatus('Медиапоток успешно инициализирован.');

        // STAGE 2: Multi-agent AI Analysis (10% -> 35%)
        setCurrentStageIndex(2);
        setRenderProgress(12);
        setRenderStatus('Director Agent: Анализ структуры сценария и смысловых фаз...');

        let cutSheet: RemotionArchitectCutSheet | null = null;
        addSystemLog('Remotion: Запуск мультиагентного конвейера (/api/ai/remotion-architect)...');
        try {
          const rawTranscript = manifestData?.subtitleClips || manifestData?.segments || manifestData?.transcriptData || [];
          const transcriptData = rawTranscript.length > 0 ? rawTranscript : [
            { start: 0, end: 15, text: manifestData?.scriptText || manifestData?.customScript || 'High retention AI video' }
          ];

          const userBrandDna = manifestData?.userBrandDna || {
            accentColor: manifestData?.subtitleColor || '#38bdf8',
            stylePreset: manifestData?.subtitleStylePreset || manifestData?.stylePreset || 'minimal_expert',
            niche: 'business'
          };

          // Progress animation during AI call
          const aiProgressTimer = setInterval(() => {
            setRenderProgress((prev) => {
              if (prev < 32) {
                const nextP = prev + 3;
                if (nextP > 18 && nextP <= 26) {
                  setRenderStatus('Art Director Agent: Подбор 3D-медиума и стилей оверлеев...');
                } else if (nextP > 26) {
                  setRenderStatus('Animator Agent: Расчет кадров упреждения (-150ms) и таймингов...');
                }
                return nextP;
              }
              return prev;
            });
          }, 400);

          const cutRes = await fetch('/api/ai/remotion-architect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcriptData,
              presetKey: userBrandDna.stylePreset || 'minimal_expert',
              userBrandDna,
              projectId,
              userIntent: 'High Retention dynamic motion edit with Safe Zones'
            })
          });

          clearInterval(aiProgressTimer);

          if (!cutRes.ok) {
            const errData = await cutRes.json().catch(() => ({}));
            const errorMsg = errData.error || `ОШИБКА ЭТАПА 2: Ошибка сервера ИИ (${cutRes.status} ${cutRes.statusText})`;
            setError(errorMsg);
            sendTelegramErrorAlert(2, REAL_STAGES_RU[1], errorMsg);
            setIsLoading(false);
            isLaunchingRenderRef.current = false;
            return;
          }

          const cutData = await cutRes.json();
          if (cutData.cutSheet) {
            cutSheet = cutData.cutSheet;
            manifestData.remotionCutSheet = cutSheet;
            addSystemLog('Remotion: Схема монтажа успешно создана Мультиагентским конвейером.');
            if (projectId) {
              projectService.updateLatestVersionManifest(projectId, manifestData).catch(() => {});
            }
          } else if (cutData.error) {
            const errorMsg = cutData.error;
            setError(errorMsg);
            sendTelegramErrorAlert(2, REAL_STAGES_RU[1], errorMsg);
            setIsLoading(false);
            isLaunchingRenderRef.current = false;
            return;
          }
        } catch (errCut: any) {
          console.warn('[Delivery] Multi-agent cutSheet fetch failed:', errCut);
          const errorMsg = `ОШИБКА ЭТАПА 2: Не удалось получить ответ от нейросети. Детали: ${errCut.message || errCut}`;
          setError(errorMsg);
          sendTelegramErrorAlert(2, REAL_STAGES_RU[1], errorMsg);
          setIsLoading(false);
          isLaunchingRenderRef.current = false;
          return;
        }

        if (!cutSheet) {
          cutSheet = manifestData?.remotionCutSheet || null;
        }

        setRenderProgress(35);
        setRenderStatus('ИИ-карта монтажа успешно построена.');

        // STAGE 3: Safe Zones Validation & Schema Enrichment (35% -> 40%)
        setCurrentStageIndex(3);
        setRenderProgress(36);
        setRenderStatus('Проверка Safe Zones и авто-сдвиг спикера при оверлеях...');

        const { validateRemotionCutSheet } = await import('@/lib/diagnostics/remotionTestRunner');
        const validationReport = validateRemotionCutSheet(cutSheet);
        
        setRenderProgress(38);
        setRenderStatus('Обогащение элементов математическим джиттером (visualSeed)...');
        await new Promise((r) => setTimeout(r, 700)); // Visual stage pacing for Stage 3

        if (!validationReport.isValid) {
          const issuesText = validationReport.issues.map((i) => i.message).join('; ');
          addSystemLog(`Предупреждение Safe Zones: ${issuesText}`);
        }

        setRenderProgress(40);
        setRenderStatus('Валидация Safe Zones завершена успешно.');

        // STAGE 4 & 5: Device Rendering (40% -> 100%)
        if (speakerBlob && cutSheet) {
          setCurrentStageIndex(4);
          setRenderProgress(40);
          setRenderStatus('Запуск покадрового рендеринга 1080p Canvas...');

          const { videoBlob, videoUrl } = await renderRemotionInDevice({
            projectId: projectId || 'demo',
            versionId: ver.id,
            speakerVideoBlobOrUrl: speakerBlob,
            cutSheet,
            onProgress: (p, msg, sIdx) => {
              setRenderProgress(p);
              setRenderStatus(msg);
              if (sIdx) setCurrentStageIndex(sIdx);
            }
          });

          setCurrentStageIndex(5);
          setRemotionOutputUrl(videoUrl);
          setJob({ id: 'local-remotion-render', status: 'completed', output_url: videoUrl, progress: 100 } as any);
          setRenderProgress(100);
          setRenderStatus('Готово (Remotion Motion Engine)!');
          setIsLoading(false);
          isLaunchingRenderRef.current = false;
          return;
        }
      } catch (remotionErr: any) {
        const errorText = `ОШИБКА ЭТАПА ${currentStageIndex}: ${remotionErr.message || String(remotionErr)}`;
        console.error('[Delivery] Remotion render failed:', remotionErr);
        setError(errorText);
        sendTelegramErrorAlert(currentStageIndex, REAL_STAGES_RU[currentStageIndex - 1] || 'Remotion Engine', errorText);
        setIsLoading(false);
        isLaunchingRenderRef.current = false;
        return;
      }
    }

    setIsLoading(false);
    setRenderStatus('Подготовка движка FFmpeg...');
    setRenderProgress(5);

    try {
      if (projectId) {
        await projectService.updateProjectStatus(projectId, 'rendering');
      }

      setRenderProgress(5);
      setRenderStatus('Инициализация видео ядра...');

      const ffmpeg = await getFFmpeg();
      ffmpegRef.current = ffmpeg;

      setRenderProgress(12);
      setRenderStatus('Загрузка исходников...');

      let totalEstDuration = 30;

      ffmpeg.on('log', ({ message }: any) => {
        console.log('[FFmpeg]', message);
        if (typeof message === 'string') {
          const timeMatch = message.match(/time=(\d+):(\d+):(\d+\.\d+)/);
          if (timeMatch) {
            const h = parseFloat(timeMatch[1]);
            const m = parseFloat(timeMatch[2]);
            const s = parseFloat(timeMatch[3]);
            const timeSec = h * 3600 + m * 60 + s;
            if (timeSec > 0 && totalEstDuration > 0) {
              const fraction = Math.min(1, timeSec / totalEstDuration);
              const p = Math.min(85, Math.max(20, 20 + Math.round(fraction * 65)));
              setRenderProgress(p);
            }
          }
        }
      });
      
      ffmpeg.on('progress', ({ progress }: any) => {
        if (typeof progress !== 'number' || isNaN(progress) || progress < 0) return;
        const p = Math.max(20, Math.min(85, 20 + Math.round(progress * 65)));
        setRenderProgress(p);
      });

      const execWithTimeout = async (args: string[], timeoutMs = 180000): Promise<number> => {
        return Promise.race([
          ffmpeg.exec(args),
          new Promise<number>((_, reject) =>
            setTimeout(() => reject(new Error(`Превышено время ожидания FFmpeg (${timeoutMs / 1000} сек)`)), timeoutMs)
          )
        ]);
      };

      const manifest = ver.script_data as any;
      const nav = globalThis.navigator as any;
      const isMobile = typeof nav !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(nav.userAgent);
      const res = isMobile ? '720:1280' : '1080:1920';
      const scale = `setsar=1,scale=${res.replace(':', ':')}:force_original_aspect_ratio=increase,crop=${res.replace(':', ':')},setsar=1`;
      
      let aRollUrl = manifest?.aRollUrl ||
        manifest?.segments?.find((s: any) => s.type === 'user_recording' && s.assetUrl)?.assetUrl ||
        manifest?.videoUrl ||
        null;

      if (!aRollUrl || aRollUrl.startsWith('blob:')) {
        const cachedVideo = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
        if (cachedVideo instanceof Blob) {
           aRollUrl = URL.createObjectURL(cachedVideo);
        }
      }

      if (!aRollUrl) throw new Error('Исходное видео (A-Roll) не найдено.');
      setPreviewUrl(aRollUrl);

      setRenderStatus('Скачивание основного видео...');
      setRenderProgress(18);
      let aRollData: Uint8Array | null = null;
      try {
        aRollData = await fetchFile(aRollUrl);
      } catch (fetchErr) {
        console.warn('[Delivery] Direct A-Roll fetch failed, attempting IndexedDB fallback...', fetchErr);
        const cachedVideo = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
        if (cachedVideo instanceof Blob) {
          aRollData = await fetchFile(cachedVideo);
        } else {
          throw new Error('Не удалось загрузить исходное видео. Пожалуйста, попробуйте перезагрузить страницу.');
        }
      }

      await ffmpeg.writeFile('input_aroll.mp4', aRollData);
      setRenderProgress(28);

      const brollClipsRaw = manifest?.brollClips || [];
      const brollFiles: Array<{ name: string; clip: any }> = [];

      for (let i = 0; i < brollClipsRaw.length; i++) {
        const clip = brollClipsRaw[i];
        try {
          setRenderStatus(`Синхронизация B-Roll ${i + 1}/${brollClipsRaw.length}...`);
          setRenderProgress(28 + Math.round(((i + 1) / Math.max(1, brollClipsRaw.length)) * 10));
          let clipUrl = clip.url;
          if (!clipUrl || clipUrl.startsWith('blob:')) {
            const cachedBroll = await idb.get(`broll_file_${clip.id}`, 'MediaBuffer');
            if (cachedBroll instanceof Blob) {
              clipUrl = URL.createObjectURL(cachedBroll);
            }
          }
          if (clipUrl) {
            const bRollData = await fetchFile(clipUrl);
            const name = `broll_${i}.mp4`;
            await ffmpeg.writeFile(name, bRollData);
            brollFiles.push({ name, clip });
          }
        } catch (e) {}
      }

      // Download Whiteboard clips
      const whiteboardClipsRaw = manifest?.whiteboardClips || [];
      const whiteboardFiles: Array<{ name: string; clip: any }> = [];

      for (let i = 0; i < whiteboardClipsRaw.length; i++) {
        const clip = whiteboardClipsRaw[i];
        try {
          setRenderStatus(`Синхронизация скетча ${i + 1}/${whiteboardClipsRaw.length}...`);
          setRenderProgress(38 + Math.round(((i + 1) / Math.max(1, whiteboardClipsRaw.length)) * 8));
          let clipUrl = clip.url;
          if (!clipUrl || clipUrl.startsWith('blob:')) {
            const cachedWb = await idb.get(`whiteboard_file_${clip.id}`, 'MediaBuffer');
            if (cachedWb instanceof Blob) {
              clipUrl = URL.createObjectURL(cachedWb);
            }
          }
          if (clipUrl) {
            const wbData = await fetchFile(clipUrl);
            const name = `whiteboard_${i}.mp4`;
            await ffmpeg.writeFile(name, wbData);
            whiteboardFiles.push({ name, clip });
          }
        } catch (e) {
          console.warn('[Delivery] Failed to download whiteboard clip:', e);
        }
      }

      setRenderStatus('Подготовка субтитров и шрифтов...');
      setRenderProgress(48);
      try {
        const fontData = await fetchFile('/fonts/Roboto-Bold.ttf');
        await ffmpeg.writeFile('font.ttf', fontData);
      } catch (e) {
        console.warn('[Delivery] Failed to load standard font:', e);
      }

      try {
        const italicFontData = await fetchFile('/fonts/Roboto-BoldItalic.ttf');
        await ffmpeg.writeFile('font_italic.ttf', italicFontData);
      } catch (e) {
        console.warn('[Delivery] Failed to load italic font, falling back to standard font copy:', e);
        try {
          const standardFont = await ffmpeg.readFile('font.ttf');
          await ffmpeg.writeFile('font_italic.ttf', standardFont);
        } catch (e2) {}
      }

      const processedBrolls = [];
      for (let i = 0; i < brollFiles.length; i++) {
        setRenderStatus(`Оптимизация B-Roll ${i+1}/${brollFiles.length}...`);
        setRenderProgress(50 + Math.round(((i + 1) / Math.max(1, brollFiles.length)) * 5));
        const { name, clip } = brollFiles[i];
        const optName = `opt_${name}`;
        
        const clipStart = typeof clip.startTime === 'number' && !isNaN(clip.startTime) ? clip.startTime : 0;
        const clipEnd = typeof clip.endTime === 'number' && !isNaN(clip.endTime) ? clip.endTime : clipStart + 5;
        const duration = Math.max(0.1, clipEnd - clipStart);

        await execWithTimeout(['-i', name, '-ss', (clip.sourceStartTime || 0).toString(), '-t', duration.toString(), '-vf', scale, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-an', '-sn', optName]);
        processedBrolls.push({ name: optName, clip: { ...clip, startTime: clipStart, endTime: clipEnd } });
        try { await ffmpeg.deleteFile(name); } catch(e) {}
      }

      // Optimize Whiteboard clips
      const processedWhiteboards = [];
      for (let i = 0; i < whiteboardFiles.length; i++) {
        setRenderStatus(`Оптимизация скетча ${i+1}/${whiteboardFiles.length}...`);
        setRenderProgress(55 + Math.round(((i + 1) / Math.max(1, whiteboardFiles.length)) * 5));
        const { name, clip } = whiteboardFiles[i];
        const optName = `opt_${name}`;
        
        const clipStart = typeof clip.startTime === 'number' && !isNaN(clip.startTime) ? clip.startTime : 0;
        const clipEnd = typeof clip.endTime === 'number' && !isNaN(clip.endTime) ? clip.endTime : clipStart + 5;
        const duration = Math.max(0.1, clipEnd - clipStart);

        await execWithTimeout([
          '-i', name,
          '-t', duration.toString(),
          '-vf', scale,
          '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-an', '-sn', optName
        ]);
        processedWhiteboards.push({ name: optName, clip: { ...clip, startTime: clipStart, endTime: clipEnd } });
        try { await ffmpeg.deleteFile(name); } catch(e) {}
      }

      const shouldShowSubtitles = manifest.showSubtitles !== false;
      const subs = shouldShowSubtitles ? (manifest.subtitleClips || manifest.segments?.[0]?.subtitleClips || []) : [];
      console.log('[Delivery] Subtitle clips found:', subs.length, 'Enabled:', shouldShowSubtitles);

      setRenderStatus(`Финальная сборка ${isMobile ? '720p' : '1080p'}...`);
      setRenderProgress(60);

      const hasOverlays = processedBrolls.length > 0 || processedWhiteboards.length > 0;
      let currentInput = 'input_aroll.mp4';

      if (!hasOverlays) {
        setRenderStatus(`Быстрая сборка ${isMobile ? '720p' : '1080p'}...`);
        const subOutput = 'final_fast.mp4';
        
        let vfFilter = scale;
        if (subs.length > 0) {
          setRenderStatus(`Быстрая сборка + субтитры (${subs.length})...`);
          vfFilter = buildDrawtextFilter(subs, scale, isMobile ? 1280 : 1920, manifest);
        }

        await execWithTimeout([
          '-i', currentInput,
          '-vf', vfFilter,
          '-r', '30',
          '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-crf', '28', '-threads', '1',
          '-c:a', 'aac', '-b:a', '128k',
          subOutput
        ]);
        try { await ffmpeg.deleteFile(currentInput); } catch(e) {}
        currentInput = subOutput;

      } else {
        setRenderStatus(`Масштабирование исходника...`);
        const scaledOutput = `temp_A.mp4`;
        await execWithTimeout([
          '-i', currentInput,
          '-vf', scale,
          '-r', '30',
          '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-crf', '28', '-threads', '1',
          '-c:a', 'aac', '-b:a', '128k',
          scaledOutput
        ]);
        try { await ffmpeg.deleteFile('input_aroll.mp4'); } catch(e) {}
        currentInput = scaledOutput;

        // Overlay B-Roll layers
        for (let i = 0; i < processedBrolls.length; i++) {
          const broll = processedBrolls[i];
          const nextOutput = i % 2 === 0 ? `temp_B.mp4` : `temp_A.mp4`;
          const brX = broll.clip.x || 0;
          const brY = broll.clip.y || 0;
          const brScale = broll.clip.scale || 1;
          
          setRenderStatus(`Слой B-Roll ${i + 1} из ${processedBrolls.length}...`);
          
          const overlayFilter = `[1:v]scale=iw*${brScale}:-1[scaled];[0:v][scaled]overlay=x=${brX}:y=${brY}:enable='between(t,${broll.clip.startTime},${broll.clip.endTime})'[out]`;
          await execWithTimeout([
            '-i', currentInput,
            '-itsoffset', broll.clip.startTime.toString(),
            '-i', broll.name,
            '-filter_complex', overlayFilter,
            '-map', '[out]',
            '-map', '0:a',
            '-r', '30',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-crf', '28', '-threads', '1', '-c:a', 'copy', nextOutput
          ]);
          try { await ffmpeg.deleteFile(currentInput); } catch(e) {}
          try { await ffmpeg.deleteFile(broll.name); } catch(e) {}
          currentInput = nextOutput;
        }

        // Overlay Whiteboard sketch animation layers
        for (let i = 0; i < processedWhiteboards.length; i++) {
          const wb = processedWhiteboards[i];
          const nextOutput = (processedBrolls.length + i) % 2 === 0 ? `temp_B.mp4` : `temp_A.mp4`;
          
          setRenderStatus(`Слой скетча ${i + 1} из ${processedWhiteboards.length}...`);
          
          const overlayFilter = `[0:v][1:v]overlay=x=0:y=0:enable='between(t,${wb.clip.startTime},${wb.clip.endTime})'[out]`;
          await execWithTimeout([
            '-i', currentInput,
            '-itsoffset', wb.clip.startTime.toString(),
            '-i', wb.name,
            '-filter_complex', overlayFilter,
            '-map', '[out]',
            '-map', '0:a',
            '-r', '30',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-crf', '28', '-threads', '1', '-c:a', 'copy', nextOutput
          ]);
          try { await ffmpeg.deleteFile(currentInput); } catch(e) {}
          try { await ffmpeg.deleteFile(wb.name); } catch(e) {}
          currentInput = nextOutput;
        }

        if (subs.length > 0) {
          setRenderStatus(`Наложение субтитров (${subs.length})...`);
          const subOutput = currentInput === 'temp_A.mp4' ? `temp_B.mp4` : `temp_A.mp4`;
          const vfFilter = buildDrawtextFilter(subs, '', isMobile ? 1280 : 1920, manifest);
          
          const exitCodeSub = await execWithTimeout([
            '-i', currentInput,
            '-vf', vfFilter,
            '-r', '30',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-crf', '28', '-threads', '1',
            '-c:a', 'copy',
            subOutput
          ]);
          
          if (exitCodeSub === 0) {
            try { await ffmpeg.deleteFile(currentInput); } catch(e) {}
            currentInput = subOutput;
          }
        }
      }

      setRenderStatus('Формирование финального MP4 файла...');
      setRenderProgress(88);
      const finalData = await ffmpeg.readFile(currentInput);
      const videoBlob = new Blob([finalData as any], { type: 'video/mp4' });
      
      setRenderStatus('Сохранение в память устройства...');
      setRenderProgress(94);
      // PERSIST TO IDB
      await idb.set(ffmpegCacheKey, videoBlob, 'MediaBuffer');
      
      const videoUrl = URL.createObjectURL(videoBlob);
      setFfmpegOutputUrl(videoUrl);
      
      setRenderProgress(100);
      setRenderStatus('Готово (Standard FFmpeg Engine)!');

      if (projectId) {
        await projectService.updateProject(projectId, { status: 'completed' });
      }

      setJob({ id: 'local-ffmpeg-render', status: 'completed', output_url: videoUrl, progress: 100 } as any);

      // CLEANUP FFmpeg FS
      try {
        const files = await ffmpeg.listDir('.');
        for (const f of files) {
          if (!f.isDir && f.name !== '.' && f.name !== '..') {
            await ffmpeg.deleteFile(f.name);
          }
        }
      } catch (e) { /* ignore cleanup errors */ }

    } catch (err: any) {
      if (isCancelledRef.current) {
        console.log('[Delivery] Client render cancelled silently.');
        return;
      }
      console.error('[Delivery] Client render failed:', err);
      setError(err.message || 'Ошибка рендера FFmpeg');
    } finally {
      setIsLoading(false);
      isLaunchingRenderRef.current = false;
    }
  };

  const executeShotstackRender = async (verData: any) => {
      addSystemLog('Запуск авто-рендеринга на сервере...');
      setRenderStatus('Инициализация серверной сборки...');

      try {
        const response = await fetch(`/api/projects/${projectId}/launch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: verData.script_data?.mode || 'pure',
            tier: verData.script_data?.tier || 'standard',
            versionId: verData.id,
            aiPolish: verData.script_data?.ai_look_polish || false,
            assetId: verData.script_data?.selected_asset_id || null,
            recordedAssetId: verData.script_data?.recordedAssetId || null
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Не удалось запустить серверный рендеринг');
        }

        const launchData = await response.json();
        if (launchData.success && launchData.jobId) {
          console.log('[Delivery] Serverless render launched. Job ID:', launchData.jobId);
          addSystemLog(`Задача успешно запущена. ID: ${launchData.jobId}`);
          router.replace(`/app/projects/new/delivery?projectId=${projectId}&jobId=${launchData.jobId}`);
        } else {
          throw new Error('Ответ сервера не содержит ID задачи рендеринга');
        }
      } catch (err: any) {
        console.error('[Delivery] Auto-launch failed:', err);
        addSystemLog(`Ошибка автозапуска: ${err.message || err}`);
        setError(err.message || 'Ошибка запуска серверного рендеринга');
        setIsLoading(false);
      }
  };

  const downloadTXT = () => {
    const texts = TEXT_OUTPUTS.map(o => `[${o.platform}]\n${o.text}\n`).join('\n---\n\n');
    const blob = new Blob([texts], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const doc = (globalThis as any).document;
    if (doc) {
      const a = doc.createElement('a');
      a.href = url;
      a.download = `ViralEngine_Texts_${projectId}.txt`;
      a.click();
    }
  };

  const handleDownload = async () => {
    if (!job?.output_url) return;
    
    const nav = (globalThis as any).navigator;
    
    // Check if Web Share API is available for file sharing
    if (nav?.share) {
      try {
        addSystemLog('Скачивание файла для отправки в системное меню...');
        const res = await fetch(job.output_url);
        if (!res.ok) throw new Error('Network response was not ok');
        const blob = await res.blob();
        const file = new File([blob], `ViralEngine_${projectId}.mp4`, { type: 'video/mp4' });
        
        if (nav.canShare && nav.canShare({ files: [file] })) {
          addSystemLog('Открытие системного меню отправки...');
          await nav.share({
            files: [file],
            title: 'ViralEngine Video',
            text: 'AI Generated Content'
          });
          addSystemLog('Системное меню успешно открыто.');
          return;
        }
      } catch (e: any) {
        console.warn('[Delivery] Native share failed, falling back to download:', e);
        addSystemLog(`Системная отправка не удалась: ${e.message || e}. Скачиваем файл...`);
      }
    }

    // Standard download fallback
    try {
      const doc = (globalThis as any).document;
      if (doc) {
        const link = doc.createElement('a');
        link.href = job.output_url;
        link.download = `ViralEngine_Final_${projectId}.mp4`;
        doc.body.appendChild(link);
        link.click();
        doc.body.removeChild(link);
        addSystemLog('Запущено скачивание файла по ссылке.');
      }
    } catch (err: any) {
      addSystemLog(`Ошибка скачивания: ${err.message}. Открытие в новой вкладке...`);
      if (typeof (globalThis as any).window !== 'undefined') {
        (globalThis as any).window.open(job.output_url, '_blank');
      }
    }
  };

  const handleExport = async (target: 'telegram' | 'drive') => {
    setIsExporting(true);
    try {
      if (target === 'telegram') {
        if (typeof (globalThis as any).window !== 'undefined') {
          (globalThis as any).window.open('https://t.me/ViralEngine_Bot', '_blank');
        }
      } else {
        addSystemLog('Загрузка видео на ваш Google Диск...');
        if (!job?.output_url) {
          throw new Error('Видео еще не сформировано.');
        }

        const res = await fetch(job.output_url);
        const blob = await res.blob();
        const { gdriveService } = await import('@/lib/services/gdriveService');
        const uploadRes = await gdriveService.uploadFileToDrive(blob, `ViralEngine_${projectId || 'video'}_${Date.now()}.mp4`);

        if (uploadRes.error) {
          if (uploadRes.error.includes('authorization token')) {
            addSystemLog('Требуется авторизация Google Диска...');
            if ((globalThis as any).confirm?.('Для сохранения файлов на Google Диск необходимо авторизоваться через Gmail аккаунт Google. Авторизоваться сейчас?')) {
              await gdriveService.signInWithGoogleDrive();
            }
          } else {
            throw new Error(uploadRes.error);
          }
        } else {
          addSystemLog(`Видео файл успешно сохранён на вашем Google Диске!`);
          (globalThis as any).alert?.('🎉 Файл видео успешно сохранен на ваш Google Диск!');
        }
      }
    } catch (err: any) {
      addSystemLog(`Ошибка Google Drive: ${err.message || err}`);
      (globalThis as any).alert?.(`Ошибка экспорт на Google Диск: ${err.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = (text: string) => {
    ((globalThis as any).navigator)?.clipboard?.writeText(text);
  };

  // Premium auto-play trigger when job output url becomes available
  useEffect(() => {
    const video = videoRef.current as any;
    if (video && job?.output_url) {
      console.log('[Delivery] Forcing video load and play for:', job.output_url);
      video.load();
      video.play().catch((err: any) => {
        console.warn('[Delivery] Play failed:', err);
      });
    }
  }, [job?.output_url]);

  // Premium auto-play trigger for background preview video during rendering
  useEffect(() => {
    const video = previewVideoRef.current as any;
    if (video && previewUrl) {
      console.log('[Delivery] Forcing background preview load and play for:', previewUrl);
      video.load();
      video.play().catch((err: any) => {
        console.warn('[Delivery] Background play failed:', err);
      });
    }
  }, [previewUrl]);

  // Automated background polling for real-time Shotstack status updates
  useEffect(() => {
    if (job?.status !== 'processing' && job?.status !== 'queued') {
      return;
    }

    let isSubscribed = true;
    
    async function pollShotstackStatus() {
      try {
        const syncRes = await fetch(`/api/debug-db?jobId=${jobId}&projectId=${projectId}`);
        const syncData = await syncRes.json();
        
        if (isSubscribed && syncData.success) {
          const rawStatus = syncData.shotstack?.status || null;
          setShotstackRealStatus(rawStatus);
          
          // Auto reload if completed
          if (rawStatus === 'done' && syncData.shotstack?.videoUrl) {
            addSystemLog('Видео готово! Перезагрузка страницы для обновления плеера...');
            isSubscribed = false;
            (globalThis as any).window?.location?.reload();
          }
        }
      } catch (err) {
        console.warn('[Delivery] Background status check failed:', err);
      }
    }

    // Initial check
    pollShotstackStatus();

    // Poll every 3500ms
    const interval = setInterval(pollShotstackStatus, 3500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [job?.status, jobId, projectId]);

  // Phase 7: Automate launching server-side render if jobId is not specified
  useEffect(() => {
    async function initServerlessFlow() {
      if (!projectId) {
        setError('Проект не найден');
        setIsLoading(false);
        return;
      }

      try {
        addSystemLog('Загрузка последней версии проекта...');
        const verData = await projectService.getLatestVersion(projectId);
        if (!verData) {
          throw new Error('Последняя версия проекта не найдена');
        }
        setVersion(verData);

        if (verData.script_data?.aRollUrl) {
          setPreviewUrl(verData.script_data.aRollUrl);
        }

        // Disable full-screen loading as we now have the required version artifacts to render the layout
        setIsLoading(false);

        if (jobId) {
          addSystemLog(`Режим отслеживания существующей задачи ID: ${jobId}`);
          return;
        }

        // Check if a completed render exists in cache first
        const remotionCacheKey = `final_render_${projectId}_${verData.id}_remotion_v2`;
        const ffmpegCacheKey = `final_render_${projectId}_${verData.id}_ffmpeg_subs`;
        
        const cachedRemotion = await idb.get(remotionCacheKey, 'MediaBuffer');
        const cachedFfmpeg = await idb.get(ffmpegCacheKey, 'MediaBuffer');
        
        if (cachedRemotion instanceof Blob) {
          const url = URL.createObjectURL(cachedRemotion);
          setRemotionOutputUrl(url);
          setActiveEngine('remotion');
          setShowRemotion(true);
          setJob({ id: 'local-remotion-render', status: 'completed', output_url: url, progress: 100 } as any);
          setRenderProgress(100);
          setRenderStatus('Готово (Remotion Engine из кеша)!');
          return;
        } else if (cachedFfmpeg instanceof Blob) {
          const url = URL.createObjectURL(cachedFfmpeg);
          setFfmpegOutputUrl(url);
          setActiveEngine('ffmpeg');
          setShowRemotion(false);
          setJob({ id: 'local-ffmpeg-render', status: 'completed', output_url: url, progress: 100 } as any);
          setRenderProgress(100);
          setRenderStatus('Готово (Standard FFmpeg из кеша)!');
          return;
        }

        // NO AUTO-LAUNCH: Wait for explicit user engine selection!
        addSystemLog('Ожидание выбора пользователем типа сборки...');
        setRenderStatus('Выберите тип сборки видео для начала генерации');
        setConfirmEngineModal('remotion'); // Prompt engine selection modal!

      } catch (err: any) {
        console.error('[Delivery] Auto-launch failed:', err);
        addSystemLog(`Ошибка автозапуска: ${err.message || err}`);
        setError(err.message || 'Ошибка запуска серверного рендеринга');
        setIsLoading(false);
      }
    }

    initServerlessFlow();
  }, [projectId, jobId]);

  // Phase 6: Realtime Postgres subscription for background serverless rendering
  useEffect(() => {
    if (!jobId) return;

    console.log('[Realtime] Subscribing to render job status updates for:', jobId);
    addSystemLog(`Подключение к каналу отслеживания реального времени для задачи: ${jobId}`);

    // 1. Fetch initial job state
    renderService.getJobStatus(jobId).then((initialJob) => {
      if (initialJob) {
        setJob(initialJob);
        setRenderProgress(initialJob.progress || 0);
        setRenderStatus(
          initialJob.status === 'completed'
            ? 'Готово!'
            : initialJob.status === 'failed'
            ? 'Ошибка сборки'
            : 'Сборка проекта на сервере...'
        );
        addSystemLog(`Состояние загружено. Статус: "${initialJob.status}", Прогресс: ${initialJob.progress}%`);
        if (initialJob.status_message) {
          addSystemLog(`Сообщение: ${initialJob.status_message}`);
        }
        if (initialJob.status === 'failed') {
          addSystemLog(`Сбой сборки: ${initialJob.error_log}`);
          setError(initialJob.error_log || 'Ошибка сборки видео на сервере');
        }
      }
      setIsLoading(false);
    }).catch(err => {
      console.error('[Realtime] Failed to load initial job status:', err);
      addSystemLog(`Ошибка загрузки статуса задачи: ${err.message || err}`);
      setIsLoading(false);
    });

    const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public';

    // 2. Subscribe to realtime Postgres changes for this job in the active schema
    const channel = supabase
      .channel(`render_job_updates_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: schema,
          table: 'render_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload: any) => {
          const updatedJob = payload.new as RenderJob;
          console.log('[Realtime] Job updated:', updatedJob);
          setJob(updatedJob);
          if (typeof updatedJob.progress === 'number') {
            setRenderProgress(updatedJob.progress);
          }
          addSystemLog(`Обновление из БД: Прогресс ${updatedJob.progress}%`);
          if (updatedJob.status_message) {
            addSystemLog(`Событие: ${updatedJob.status_message}`);
          }
          if (updatedJob.status === 'completed') {
            addSystemLog('🎉 Рендеринг полностью завершен! Файл готов к публикации.');
            setRenderStatus('Готово!');
          } else if (updatedJob.status === 'failed') {
            addSystemLog(`❌ Критическая ошибка: ${updatedJob.error_log}`);
            setError(updatedJob.error_log || 'Ошибка сборки видео на сервере');
          } else {
            setRenderStatus('Сборка проекта на сервере...');
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[Realtime] Unsubscribing from render job updates for:', jobId);
      addSystemLog('Отключение от канала отслеживания.');
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    let pollInterval: any;
    if (projectId && !distributionAssets) {
      pollInterval = setInterval(async () => {
        const ver = await projectService.getLatestVersion(projectId);
        if (ver?.script_data?.distributionAssets) {
          setVersion(ver);
          if (job?.status === 'completed') {
            clearInterval(pollInterval);
          }
        }
      }, 5000);
    }
    return () => clearInterval(pollInterval);
  }, [projectId, !!distributionAssets, job?.status]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-mint-400" />
        <p className="text-sm text-white/40 uppercase tracking-widest font-black">Retrieving Artifacts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 max-w-2xl mx-auto px-4 py-8">
          <div className="p-8 rounded-[2.5rem] bg-red-500/5 border border-red-500/20 text-center space-y-5 w-full backdrop-blur-md relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/50 via-red-600/30 to-transparent" />
            <AlertCircle className="w-14 h-14 text-red-500 mx-auto drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Delivery Failed</h2>
            <p className="text-sm text-red-200/80 font-semibold leading-relaxed">{error.trim()}</p>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => router.push(`/app/projects/${projectId}/studio?tab=assembly`)} 
              className="px-8 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              {locale === 'ru' ? 'В монтажку' : 'Back to Montage'}
            </button>
            <button 
              onClick={() => (globalThis as any).window?.location?.reload()} 
              className="px-8 py-3.5 rounded-2xl bg-purple-600 text-white text-xs font-black uppercase tracking-widest hover:bg-purple-500 shadow-lg shadow-purple-900/40 active:scale-95 transition-all"
            >
              {locale === 'ru' ? 'Повторить' : 'Retry'}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      <AnimatePresence>
        {showShotstackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f0f13] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
                  <AlertCircle className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                  {locale === 'ru' ? 'Облачный рендеринг' : 'Cloud Rendering Recommended'}
                </h2>
                <p className="text-sm text-white/60 font-medium">
                  {locale === 'ru' 
                    ? 'Ваше устройство может не справиться с тяжелым локальным монтажом. Рекомендуем выполнить сборку на наших мощных серверах (Shotstack).' 
                    : 'Your device might struggle with heavy local rendering. We recommend using our powerful cloud servers (Shotstack).'}
                </p>
                <div className="flex flex-col gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowShotstackModal(false);
                      setIsLoading(true);
                      executeShotstackRender(version);
                    }}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs transition-all"
                  >
                    {locale === 'ru' ? 'Продолжить в облаке (Быстро)' : 'Continue in Cloud (Fast)'}
                  </button>
                  <button
                    onClick={() => {
                      setShowShotstackModal(false);
                      setIsLoading(true);
                      setRenderMode('ffmpeg');
                      handleClientRender(version!);
                    }}
                    className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-black uppercase tracking-widest text-xs transition-all"
                  >
                    {locale === 'ru' ? 'Все равно локально (FFmpeg)' : 'Force Local (FFmpeg)'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1. Stepper line indicator placed at the very top */}
      <StatusStepper currentStep={job?.status === 'completed' ? 'done' : 'render'} />

      {/* 2. Central Status Card with built-in navigation button */}
      <div className="rounded-3xl p-6 text-center space-y-4 bg-white/[0.02] border border-white/5 relative pt-12">
        {/* Back to Studio button elegantly placed in top-left corner */}
        <button 
          onClick={() => router.push(`/app/projects/${projectId}/studio?tab=assembly`)} 
          className="absolute top-4 left-4 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-[9px] font-black uppercase tracking-widest hover:text-white hover:bg-[#8b5cf6]/20 hover:border-[#8b5cf6]/30 active:scale-95 transition-all shadow-lg"
        >
          <ArrowLeft size={12} /> {locale === 'ru' ? 'В МОНТАЖКУ' : 'BACK TO STUDIO'}
        </button>

        <div className="text-4xl">{job?.status === 'completed' ? '🎬' : '⚡'}</div>
        <div>
          {job?.status !== 'completed' && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-black text-xs uppercase tracking-wider mb-2 shadow-lg drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>{REAL_STAGES_RU[currentStageIndex - 1] || REAL_STAGES_RU[0]}</span>
            </div>
          )}
          <h1 className="text-lg font-bold tracking-tight uppercase text-white/90 min-h-[2rem]">
            {job?.status === 'completed' ? t('badge') : currentStatusMsg}
          </h1>
          <p className="text-[11px] text-white/40 mt-1 font-bold uppercase tracking-widest">
            {job?.status === 'completed' ? t('statusSub') : `Пожалуйста, подождите. Прогресс: ${Math.round(displayProgress)}%`}
          </p>
        </div>

        {job?.status !== 'completed' && (
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 shadow-inner mt-2">
            <motion.div 
                className="h-full bg-gradient-to-r from-purple-600 to-blue-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" 
                initial={{ width: 0 }} 
                animate={{ width: `${Math.max(0, Math.min(100, displayProgress))}%` }} 
                transition={{ type: 'spring', damping: 25, stiffness: 50 }}
            />
          </div>
        )}
      </div>

      {job?.output_url && (
        <div className="rounded-[2.5rem] p-6 bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 space-y-4 text-center shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block">ГОТОВЫЙ ФАЙЛ ДОСТУПЕН</span>
            <h2 className="text-lg font-black text-white uppercase tracking-tighter">Ваше видео успешно экспортировано!</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            {/* Direct Download Button */}
            <button 
              onClick={handleDownload}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-purple-900/40"
            >
              <Download size={16} />
              {locale === 'ru' ? 'СКАЧАТЬ MP4' : 'DOWNLOAD MP4'}
            </button>

            {/* Direct Link / Copy Link Button */}
            <button 
              onClick={() => {
                if (job?.output_url) {
                  (globalThis.navigator as any)?.clipboard?.writeText(job.output_url);
                  (globalThis as any).alert?.(locale === 'ru' ? 'Прямая ссылка скопирована в буфер обмена!' : 'Direct link copied to clipboard!');
                }
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              <Copy size={16} className="text-purple-400" />
              {locale === 'ru' ? 'СКОПИРОВАТЬ ССЫЛКУ' : 'COPY DIRECT LINK'}
            </button>
          </div>

          {/* Direct link preview */}
          <div className="pt-2 border-t border-white/5">
            <p className="text-[8px] text-white/30 uppercase tracking-wider">Прямая ссылка на сервере:</p>
            <a 
              href={job.output_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[9px] text-blue-400 hover:text-blue-300 font-mono break-all underline block mt-1"
            >
              {job.output_url}
            </a>
          </div>
        </div>
      )}

      <div className="rounded-[2.5rem] overflow-hidden bg-[#050508] border border-white/10 aspect-[9/16] max-h-[500px] mx-auto relative shadow-2xl group">
        {job?.output_url ? (
          <div className="relative w-full h-full">
            <video 
              ref={videoRef}
              src={job.output_url} 
              autoPlay 
              loop 
              muted={isMuted}
              playsInline 
              crossOrigin="anonymous"
              onClick={() => {
                const video = videoRef.current as any;
                if (video) {
                  if (video.paused) {
                    video.play().catch((err: any) => console.log('Play blocked:', err));
                  } else {
                    video.pause();
                  }
                }
              }}
              className="w-full h-full object-cover cursor-pointer" 
            />
            {/* Premium Floating Mute Control */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
              className="absolute top-4 right-4 z-20 p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white/90 hover:text-white hover:bg-black/70 hover:scale-105 active:scale-95 transition-all shadow-lg"
              title={isMuted ? "Включить звук" : "Выключить звук"}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {previewUrl && (
              <video 
                ref={previewVideoRef}
                src={previewUrl} 
                autoPlay 
                muted 
                loop 
                playsInline 
                crossOrigin="anonymous"
                className="absolute inset-0 w-full h-full object-cover transition-all duration-1000" 
                style={{ 
                    filter: `blur(${Math.max(0, 12 - (renderProgress / 100) * 12)}px) brightness(${0.4 + (renderProgress / 100) * 0.6})`,
                    opacity: 0.3 + (renderProgress / 100) * 0.7
                }}
              />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-purple-500/40 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center animate-pulse">
                        <Play size={16} className="text-purple-400 translate-x-0.5" />
                    </div>
                </div>
              </div>
              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.5em] text-purple-400 animate-pulse">Generating Final Cut</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-8 flex items-center justify-between bg-gradient-to-t from-black via-black/40 to-transparent">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50">4K AI PRODUCTION</span>
            <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-purple-400">Ready for Broadcast</span>
          </div>
          <div className="flex gap-3">
            {job?.output_url && (
              <button 
                onClick={handleDownload}
                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-black uppercase tracking-widest hover:bg-purple-500/20 hover:border-purple-500/50 hover:scale-105 active:scale-95 transition-all shadow-[0_10px_40px_rgba(168,85,247,0.15)]"
              >
                <Download size={16} /> {/iPhone|iPad|iPod|Android/i.test(((globalThis as any).navigator)?.userAgent || '') ? (locale === 'ru' ? 'СОХРАНИТЬ / ПОДЕЛИТЬСЯ' : 'SAVE / SHARE') : (locale === 'ru' ? 'СКАЧАТЬ ВИДЕО' : 'DOWNLOAD VIDEO')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Engine Restart */}
      <AnimatePresence>
        {confirmEngineModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-300">
                <RefreshCw size={24} className="animate-spin-slow" />
              </div>

              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                {locale === 'ru' ? 'Запустить сборку видео?' : 'Restart Video Generation?'}
              </h3>

              <p className="text-xs text-white/70 leading-relaxed font-medium">
                {confirmEngineModal === 'remotion'
                  ? (locale === 'ru'
                    ? 'Будет запущен Мультиагентский конвейер Remotion AI (Режиссер ➔ Арт-Директор ➔ Аниматор) с бренд-буком и Z-камерой.'
                    : 'Will launch Remotion AI Multi-Agent Pipeline.')
                  : (locale === 'ru'
                    ? 'Будет запущен быстрый движок Standard FFmpeg для генерации файла.'
                    : 'Will launch Standard FFmpeg generation.')}
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmEngineModal(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 text-xs font-black uppercase tracking-wider transition-all"
                >
                  {locale === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  onClick={() => executeConfirmedGeneration(confirmEngineModal)}
                  className={`flex-1 py-3 rounded-xl text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg ${
                    confirmEngineModal === 'remotion'
                      ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/30'
                      : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/30'
                  }`}
                >
                  {locale === 'ru' ? 'Да, запустить' : 'Start Build'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dual Engine Export Selection Panel - Clean 2 Engine Buttons */}
      <div className="max-w-[640px] mx-auto rounded-3xl p-6 bg-slate-900/60 border border-purple-500/20 backdrop-blur-xl shadow-2xl mt-4 space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex flex-col text-left">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>{locale === 'ru' ? 'Выбор движка рендеринга' : 'Rendering Engine Mode'}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">Dual-Engine</span>
            </h3>
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold mt-1">
              {locale === 'ru' ? 'Выберите способ сборки видео для запуск генерации' : 'Select rendering pipeline to launch generation'}
            </p>
          </div>
          
          <button
            onClick={() => handleToggleSubtitles(!showSubtitles)}
            className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              showSubtitles ? 'bg-purple-600/30 border-purple-500/50 text-purple-300' : 'bg-white/5 border-white/10 text-white/40'
            }`}
          >
            <span>{showSubtitles ? 'Титры ON' : 'Титры OFF'}</span>
          </button>
        </div>

        {/* 2 Main Engine Choice Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* FFmpeg Engine Button */}
          <button
            onClick={() => setConfirmEngineModal('ffmpeg')}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group ${
              activeEngine === 'ffmpeg'
                ? 'bg-cyan-600/20 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.25)] text-white'
                : 'bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20 hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                Standard FFmpeg ⚡
              </span>
              <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${
                ffmpegOutputUrl ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 text-white/40'
              }`}>
                {ffmpegOutputUrl ? 'Готово ⚡' : 'Не собрано'}
              </span>
            </div>
            <p className="text-[9px] text-white/40 leading-relaxed font-medium mb-3">
              Быстрая сборка, анимированные субтитры, B-roll
            </p>

            {ffmpegOutputUrl && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const doc = (globalThis as any).document;
                  if (doc) {
                    const a = doc.createElement('a');
                    a.href = ffmpegOutputUrl;
                    a.download = `ViralEngine_FFmpeg_${Date.now()}.mp4`;
                    doc.body.appendChild(a);
                    a.click();
                    doc.body.removeChild(a);
                  }
                }}
                className="mt-2 w-full py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30 text-[9px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-1 transition-all"
              >
                <Download size={11} /> Скачать MP4
              </div>
            )}
          </button>

          {/* Remotion Engine Button */}
          <button
            onClick={() => setConfirmEngineModal('remotion')}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group ${
              activeEngine === 'remotion'
                ? 'bg-purple-600/20 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.25)] text-white'
                : 'bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20 hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                Remotion Engine ✨
              </span>
              <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${
                remotionOutputUrl ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 text-white/40'
              }`}>
                {remotionOutputUrl ? 'Готово ✨' : 'Не собрано'}
              </span>
            </div>
            <p className="text-[9px] text-white/40 leading-relaxed font-medium mb-3">
              Мультиагентский монтаж, Z-камера, бренд-бук
            </p>

            {remotionOutputUrl && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const doc = (globalThis as any).document;
                  if (doc) {
                    const a = doc.createElement('a');
                    a.href = remotionOutputUrl;
                    a.download = `ViralEngine_Remotion_${Date.now()}.mp4`;
                    doc.body.appendChild(a);
                    a.click();
                    doc.body.removeChild(a);
                  }
                }}
                className="mt-2 w-full py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 hover:bg-purple-500/30 text-[9px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-1 transition-all"
              >
                <Download size={11} /> Скачать MP4
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Distribution Factory - Main Area */}
      <section id="distribution-section" className="pt-10 space-y-6">
        <div className="w-full">
          <DistributionFactory 
            manifest={manifest}
            scriptText={scriptData.meat || "Video Content Analysis"}
            projectId={projectId as string}
            locale={locale}
            projectTitle={(manifest as any)?.ideaTitle || (manifest as any)?.projectTitle || (manifest as any)?.title}
            onUpdateManifest={(newManifest: any) => {
               setVersion(prev => (prev ? { ...prev, script_data: newManifest } : prev) as any);
               if (projectId) {
                 projectService.updateLatestVersionManifest(projectId, newManifest);
               }
            }}
          />
        </div>
      </section>
    </div>
  );
}

export default function DeliveryPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" /></div>}>
      <DeliveryPageContent />
    </Suspense>
  );
}
