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
import DistributionFactory from '../../[id]/studio/_components/DistributionFactory';
import { Suspense } from 'react';
import { getFFmpeg, getFetchFile, resetFFmpeg } from '@/lib/ffmpeg-delivery';

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
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const [displayProgress, setDisplayProgress] = useState(0);
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);
  const [shotstackRealStatus, setShotstackRealStatus] = useState<string | null>(null);
  const [showShotstackModal, setShowShotstackModal] = useState(false);
  const [renderMode, setRenderMode] = useState<'shotstack' | 'ffmpeg'>('ffmpeg');
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const isLaunchingRenderRef = useRef(false);
  const ffmpegRef = useRef<any>(null);

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
    }
  }, [version]);

  const handleToggleSubtitles = async (checked: boolean) => {
    setShowSubtitles(checked);
    addSystemLog(checked ? 'Субтитры включены' : 'Субтитры выключены');
    
    if (version && projectId) {
      const updatedManifest = {
        ...version.script_data as any,
        showSubtitles: checked
      };
      
      // Update local state optimistically
      setVersion(prev => prev ? { ...prev, script_data: updatedManifest } : null);
      
      try {
        await projectService.updateLatestVersionManifest(projectId, updatedManifest);
        addSystemLog('Настройки субтитров успешно сохранены в БД.');
      } catch (err: any) {
        console.error('Failed to update subtitles flag:', err);
        addSystemLog(`Ошибка сохранения настроек субтитров: ${err.message}`);
      }
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
  const buildDrawtextFilter = (clips: any[], baseFilter: string, videoHeight: number = 1920): string => {
    if (clips.length === 0) return baseFilter;
    
    // Escape special chars for FFmpeg drawtext
    const esc = (t: string) => t
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\\\'")  
      .replace(/:/g, '\\\\:')
      .replace(/,/g, '\\\\,')
      .replace(/\[/g, '\\\\[')
      .replace(/\]/g, '\\\\]');

    const subStyleIdx = manifest?.subtitleStyle || 0;
    const subSizeRaw = manifest?.subtitleSize || 18; // Default matches StudioViewport.tsx
    const subPos = manifest?.subtitlePos || { x: 0, y: 0 };
    
    // Scale subtitle size to match 1080p canvas proportions
    // 82px in the ~360px studio viewport equals ~246px in 1080p
    const isMobile = videoHeight === 1280;
    const baseScale = isMobile ? 2.0 : 3.0;
    const subSize = Math.round(subSizeRaw * baseScale);

    const drawtextChain = clips.flatMap(c => {
      // Split words into two balanced lines exactly like Canvas editor does
      const words = (c.text || '').toUpperCase().split(' ');
      const midpoint = Math.ceil(words.length / 2);
      const line1 = words.slice(0, midpoint).join(' ');
      const line2 = words.slice(midpoint).join(' ');

      const txt1 = esc(line1);
      const txt2 = esc(line2);
      
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

      if (subStyleIdx === 0) { // Classic Yellow Italic
        fontcolor = '0xFACC15'; borderw = Math.round(2 * baseScale); shadowx = Math.round(2 * baseScale); shadowy = Math.round(2 * baseScale); useItalic = true;
      } else if (subStyleIdx === 1) { // White Bold
        fontcolor = 'white'; borderw = 0; shadowy = Math.round(4 * baseScale);
      } else if (subStyleIdx === 2) { // Red Outline
        fontcolor = '0xEF4444'; borderw = Math.round(2 * baseScale); bordercolor = 'white'; shadowx = Math.round(4 * baseScale); shadowy = Math.round(4 * baseScale);
      } else if (subStyleIdx === 3) { // Cyber Neon
        fontcolor = '0x22D3EE'; shadowx = 0; shadowy = 0; useItalic = true; borderw = 0;
      } else if (subStyleIdx === 4) { // Minimalist
        fontcolor = 'white'; box = 1; boxcolor = 'black@0.6';
      } else if (subStyleIdx === 5) { // Boxy Yellow
        fontcolor = 'black'; box = 1; boxcolor = '0xFACC15';
      } else if (subStyleIdx === 6) { // Gradient (Approx)
        fontcolor = 'white'; shadowy = Math.round(2 * baseScale); shadowcolor = 'black@0.5';
      } else if (subStyleIdx === 7) { // Soft Pink
        fontcolor = '0xF472B6'; shadowy = Math.round(2 * baseScale);
      } else if (subStyleIdx === 8) { // Ghostly
        fontcolor = 'white@0.4';
      } else if (subStyleIdx === 9) { // Impact
        fontcolor = 'white'; shadowx = 0; shadowy = 0; borderw = Math.round(4 * baseScale); bordercolor = 'white@0.5';
      } else if (subStyleIdx === 10) { // Green Hacker
        fontcolor = '0x10B981'; shadowx = 0; shadowy = 0;
      } else if (subStyleIdx === 11) { // Royal Gold
        fontcolor = '0xFBBF24'; useItalic = true; shadowy = Math.round(2 * baseScale);
      } else if (subStyleIdx === 12) { // Elegant Italic
        fontcolor = 'white'; shadowy = Math.round(2 * baseScale); shadowcolor = 'white@0.3'; useItalic = true;
      } else if (subStyleIdx === 13) { // Gentle Pastel
        fontcolor = '0xFEF3C7'; shadowy = Math.round(1 * baseScale); shadowcolor = 'black@0.1';
      }

      // Map Y coordinates exactly to canvas editor: bottom 15% + framer-motion translation
      const baseBottom = videoHeight * 0.15; 
      const translatedY = subPos.y * (isMobile ? (720/1080) : 1);
      const finalY = Math.round(videoHeight - baseBottom - subSize + translatedY);
      const translatedX = subPos.x * (isMobile ? (720/1080) : 1);
      const finalX = `(w-text_w)/2 + ${Math.round(translatedX)}`;

      const subStart = typeof c.startTime === 'number' && !isNaN(c.startTime) ? c.startTime : 0;
      const subEnd = typeof c.endTime === 'number' && !isNaN(c.endTime) ? c.endTime : subStart + 3;
      const font = useItalic ? 'font_italic.ttf' : 'font.ttf';

      // Advanced Dynamics: Math-based slide expressions matching Framer Motion config
      const FADE_DUR = 0.15;
      const animMap: Record<number, {dxIn: number, dyIn: number, dxOut: number, dyOut: number}> = {
        0: { dxIn: 0, dyIn: 20, dxOut: 0, dyOut: -10 },
        1: { dxIn: 0, dyIn: -20, dxOut: 0, dyOut: 20 },
        2: { dxIn: -50, dyIn: 0, dxOut: 50, dyOut: 0 },
        3: { dxIn: -20, dyIn: 0, dxOut: 20, dyOut: 0 },
        4: { dxIn: 0, dyIn: 0, dxOut: 0, dyOut: 0 },
        5: { dxIn: 0, dyIn: 30, dxOut: 0, dyOut: -30 },
        6: { dxIn: 0, dyIn: 20, dxOut: 0, dyOut: -20 },
        7: { dxIn: 0, dyIn: 10, dxOut: 0, dyOut: -10 },
        8: { dxIn: 0, dyIn: 0, dxOut: 0, dyOut: 0 },
        9: { dxIn: 0, dyIn: -40, dxOut: 0, dyOut: 40 },
        10: { dxIn: 0, dyIn: 0, dxOut: 0, dyOut: 0 },
        11: { dxIn: 0, dyIn: -15, dxOut: 0, dyOut: 15 },
        12: { dxIn: 0, dyIn: 15, dxOut: 0, dyOut: -15 },
        13: { dxIn: -10, dyIn: 0, dxOut: 10, dyOut: 0 },
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
      const yExpr1 = `${finalY} + ${dyIn}*(1-${progIn}) + ${dyOut}*${progOut}`;
      const yExpr2 = `${finalY + subSize + 15} + ${dyIn}*(1-${progIn}) + ${dyOut}*${progOut}`;

      const lineFilters = [];

      // Add Line 1
      lineFilters.push([
        `drawtext=fontfile=${font}:text='${txt1}'`,
        `fontsize=${subSize}`,
        `fontcolor=${fontcolor}`,
        `borderw=${borderw}`,
        `bordercolor=${bordercolor}`,
        `shadowcolor=${shadowcolor}`,
        `shadowx=${shadowx}`,
        `shadowy=${shadowy}`,
        box ? `box=1:boxcolor=${boxcolor}:boxborderw=10` : '',
        `x='${xExpr}'`,
        `y='${yExpr1}'`,
        `alpha='${alphaExpr}'`,
        `enable='between(t,${subStart},${subEnd})'`,
      ].filter(Boolean).join(':'));

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
          box ? `box=1:boxcolor=${boxcolor}:boxborderw=10` : '',
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

  const handleClientRender = async (ver: ProjectVersion) => {
    if (isLaunchingRenderRef.current) return;
    isLaunchingRenderRef.current = true;
    
    // 0. CHECK CACHE FIRST
    try {
      const cachedRender = await idb.get(`final_render_${projectId}_${ver.id}`, 'MediaBuffer');
      if (cachedRender instanceof Blob) {
        console.log('[Delivery] Found cached render for version', ver.id);
        const url = URL.createObjectURL(cachedRender);
        setJob({ id: 'local-render', status: 'completed', output_url: url, progress: 100 } as any);
        setRenderProgress(100);
        setRenderStatus('Готово (из кеша)');
        return;
      }
    } catch (e) { console.warn('[Delivery] Cache check failed:', e); }

    setIsLoading(false);
    setRenderStatus('Подготовка движка FFmpeg...');
    setRenderProgress(5);

    try {
      if (projectId) {
        await projectService.updateProjectStatus(projectId, 'rendering');
      }

      addSystemLog('[System] Инициализация FFmpeg ядра...');
      const ffmpeg = await getFFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on('log', ({ message }: any) => {
        console.log('[FFmpeg]', message);
      });
      
      ffmpeg.on('progress', ({ progress }: any) => {
        if (typeof progress !== 'number' || isNaN(progress) || progress < 0) return;
        const p = Math.max(0, Math.min(98, 50 + Math.round(progress * 48)));
        setRenderProgress(p);
      });

      setRenderStatus('Проверка готовности WASM...');

      const manifest = ver.script_data as any;
      const nav = globalThis.navigator as any;
      const isMobile = typeof nav !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(nav.userAgent);
      const res = isMobile ? '720:1280' : '1080:1920';
      const scale = `scale=${res.replace(':', ':')}:force_original_aspect_ratio=increase,crop=${res.replace(':', ':')}`;
      
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
      const fetchFile = await getFetchFile();
      const aRollData = await fetchFile(aRollUrl);
      await ffmpeg.writeFile('input_aroll.mp4', aRollData);

      const brollClipsRaw = manifest?.brollClips || [];
      const brollFiles: Array<{ name: string; clip: any }> = [];

      for (let i = 0; i < brollClipsRaw.length; i++) {
        const clip = brollClipsRaw[i];
        try {
          setRenderStatus(`Синхронизация B-Roll ${i + 1}/${brollClipsRaw.length}...`);
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

      setRenderStatus('Подготовка субтитров и шрифтов...');
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
        const { name, clip } = brollFiles[i];
        const optName = `opt_${name}`;
        
        const clipStart = typeof clip.startTime === 'number' && !isNaN(clip.startTime) ? clip.startTime : 0;
        const clipEnd = typeof clip.endTime === 'number' && !isNaN(clip.endTime) ? clip.endTime : clipStart + 5;
        const duration = Math.max(0.1, clipEnd - clipStart);

        await ffmpeg.exec(['-i', name, '-ss', (clip.sourceStartTime || 0).toString(), '-t', duration.toString(), '-vf', scale, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-an', '-sn', optName]);
        processedBrolls.push({ name: optName, clip: { ...clip, startTime: clipStart, endTime: clipEnd } });
        try { await ffmpeg.deleteFile(name); } catch(e) {}
      }

      const shouldShowSubtitles = manifest.showSubtitles !== false;
      const subs = shouldShowSubtitles ? (manifest.subtitleClips || manifest.segments?.[0]?.subtitleClips || []) : [];
      console.log('[Delivery] Subtitle clips found:', subs.length, 'Enabled:', shouldShowSubtitles);

      setRenderStatus(`Финальная сборка ${isMobile ? '720p' : '1080p'}...`);
      setRenderProgress(60);

      const hasBrolls = processedBrolls.length > 0;
      let currentInput = 'input_aroll.mp4';

      if (!hasBrolls) {
        setRenderStatus(`Быстрая сборка ${isMobile ? '720p' : '1080p'}...`);
        const subOutput = 'final_fast.mp4';
        
        let vfFilter = scale;
        if (subs.length > 0) {
          setRenderStatus(`Быстрая сборка + субтитры (${subs.length})...`);
          vfFilter = buildDrawtextFilter(subs, scale, isMobile ? 1280 : 1920);
        }

        await ffmpeg.exec([
          '-i', currentInput,
          '-vf', vfFilter,
          '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-threads', '1',
          '-c:a', 'aac', '-b:a', '128k',
          subOutput
        ]);
        try { await ffmpeg.deleteFile(currentInput); } catch(e) {}
        currentInput = subOutput;

      } else {
        setRenderStatus(`Масштабирование исходника...`);
        const scaledOutput = `temp_A.mp4`;
        await ffmpeg.exec([
          '-i', currentInput,
          '-vf', scale,
          '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-threads', '1',
          '-c:a', 'aac', '-b:a', '128k',
          scaledOutput
        ]);
        try { await ffmpeg.deleteFile('input_aroll.mp4'); } catch(e) {}
        currentInput = scaledOutput;

        for (let i = 0; i < processedBrolls.length; i++) {
          const broll = processedBrolls[i];
          const nextOutput = i % 2 === 0 ? `temp_B.mp4` : `temp_A.mp4`;
          const brX = broll.clip.x || 0;
          const brY = broll.clip.y || 0;
          const brScale = broll.clip.scale || 1;
          
          setRenderStatus(`Слой B-Roll ${i + 1} из ${processedBrolls.length}...`);
          
          const overlayFilter = `[1:v]scale=iw*${brScale}:-1[scaled];[0:v][scaled]overlay=x=${brX}:y=${brY}:enable='between(t,${broll.clip.startTime},${broll.clip.endTime})'[out]`;
          await ffmpeg.exec([
            '-i', currentInput,
            '-itsoffset', broll.clip.startTime.toString(),
            '-i', broll.name,
            '-filter_complex', overlayFilter,
            '-map', '[out]',
            '-map', '0:a',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-threads', '1', '-c:a', 'copy', nextOutput
          ]);
          try { await ffmpeg.deleteFile(currentInput); } catch(e) {}
          try { await ffmpeg.deleteFile(broll.name); } catch(e) {}
          currentInput = nextOutput;
        }

        if (subs.length > 0) {
          setRenderStatus(`Наложение субтитров (${subs.length})...`);
          const subOutput = currentInput === 'temp_A.mp4' ? `temp_B.mp4` : `temp_A.mp4`;
          const vfFilter = buildDrawtextFilter(subs, '', isMobile ? 1280 : 1920);
          
          const exitCodeSub = await ffmpeg.exec([
            '-i', currentInput,
            '-vf', vfFilter,
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-threads', '1',
            '-c:a', 'copy',
            subOutput
          ]);
          
          if (exitCodeSub === 0) {
            try { await ffmpeg.deleteFile(currentInput); } catch(e) {}
            currentInput = subOutput;
          }
        }
      }

      const finalData = await ffmpeg.readFile(currentInput);
      const videoBlob = new Blob([finalData as any], { type: 'video/mp4' });
      
      // PERSIST TO IDB
      await idb.set(`final_render_${projectId}_${ver.id}`, videoBlob, 'MediaBuffer');
      
      const videoUrl = URL.createObjectURL(videoBlob);
      
      setRenderProgress(100);
      setRenderStatus('Готово!');

      if (projectId) {
        await projectService.updateProject(projectId, { status: 'completed' });
      }

      setJob({ id: 'local-render', status: 'completed', output_url: videoUrl, progress: 100 } as any);

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
      console.error('[Delivery] Client render failed:', err);
      const errMsg = err.message || 'Ошибка рендера FFmpeg';
      setFallbackError(errMsg);
      setIsFallbackMode(true);
      setShowShotstackModal(true);
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
    await new Promise(r => setTimeout(r, 1500));
    if (target === 'telegram') {
      if (typeof (globalThis as any).window !== 'undefined') {
        (globalThis as any).window.open('https://t.me/ViralEngine_Bot', '_blank');
      }
    } else {
      (globalThis as any).alert?.('Загрузка на Google Drive начата.');
    }
    setIsExporting(false);
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

        // --- ALWAYS TRY LOCAL FFmpeg FIRST BY DEFAULT ---
        addSystemLog('Запуск локального FFmpeg сборщика (основной движок)...');
        setRenderMode('ffmpeg');
        handleClientRender(verData);

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

        {/* Realtime Floating system logs console panel */}
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
          <button
            onClick={() => setShowLogConsole(prev => !prev)}
            className="px-4 py-2.5 rounded-full bg-[#8b5cf6]/90 hover:bg-[#7c3aed] text-white font-black uppercase tracking-widest text-[9px] border border-white/10 backdrop-blur-md shadow-2xl flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {locale === 'ru' ? `ЛОГИ СБОРКИ (${systemLogs.length})` : `RENDER LOGS (${systemLogs.length})`}
          </button>

          <AnimatePresence>
            {showLogConsole && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                className="w-[calc(100vw-2rem)] sm:w-[400px] h-[300px] bg-black/95 border border-white/10 rounded-3xl backdrop-blur-2xl shadow-2xl p-4 flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                    {locale === 'ru' ? 'Системный Лог Рендера' : 'Render System Log'}
                  </span>
                  <button
                    onClick={() => setSystemLogs([])}
                    className="text-[8px] font-black uppercase tracking-widest text-red-400 hover:text-red-300"
                  >
                    {locale === 'ru' ? 'Очистить' : 'Clear'}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[9px] text-white/70 select-text custom-scrollbar">
                  {systemLogs.length === 0 ? (
                    <p className="text-white/20 italic text-center pt-24">
                      {locale === 'ru' ? 'Лента логов пуста.' : 'Log is empty.'}
                    </p>
                  ) : (
                    systemLogs.map((log, idx) => (
                      <div key={idx} className="border-l-2 border-purple-500 pl-2 leading-relaxed text-left">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
                  {isFallbackMode 
                    ? (locale === 'ru' ? 'Резервный рендеринг' : 'Render Fallback')
                    : (locale === 'ru' ? 'Облачный рендеринг' : 'Cloud Rendering Recommended')}
                </h2>
                <p className="text-sm text-white/60 font-medium">
                  {isFallbackMode 
                    ? (locale === 'ru' 
                        ? `Локальный монтаж на устройстве завершился ошибкой: ${fallbackError}. Желаете переключиться на наши мощные серверы в облаке (Shotstack)?`
                        : `Local rendering failed: ${fallbackError}. Would you like to switch to our powerful cloud servers (Shotstack) instead?`)
                    : (locale === 'ru' 
                        ? 'Ваше устройство может не справиться с тяжелым локальным монтажом. Рекомендуем выполнить сборку на наших мощных серверах (Shotstack).' 
                        : 'Your device might struggle with heavy local rendering. We recommend using our powerful cloud servers (Shotstack).')}
                </p>
                <div className="flex flex-col gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowShotstackModal(false);
                      setIsFallbackMode(false);
                      setFallbackError(null);
                      setIsLoading(true);
                      executeShotstackRender(version);
                    }}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs transition-all"
                  >
                    {locale === 'ru' ? 'Продолжить в облаке (Быстро)' : 'Continue in Cloud (Fast)'}
                  </button>
                  {isFallbackMode ? (
                    <button
                      onClick={() => {
                        setShowShotstackModal(false);
                        setIsFallbackMode(false);
                        setError(fallbackError || 'Ошибка рендера FFmpeg');
                      }}
                      className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-black uppercase tracking-widest text-xs transition-all"
                    >
                      {locale === 'ru' ? 'Отмена' : 'Cancel'}
                    </button>
                  ) : (
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
                  )}
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
          <h1 className="text-2xl font-black tracking-tighter uppercase text-white min-h-[2rem]">
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

      {/* Subtitles Toggle Switch Card under video preview */}
      <div className="max-w-[500px] mx-auto rounded-3xl p-5 bg-white/[0.02] border border-white/5 flex items-center justify-between shadow-lg">
        <div className="flex flex-col text-left">
          <span className="text-xs font-black text-white/80 uppercase tracking-wider">
            {locale === 'ru' ? 'Показывать субтитры' : 'Show Subtitles'}
          </span>
          <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold mt-1">
            {locale === 'ru' ? 'Генерировать финальное видео с текстовыми субтитрами' : 'Generate final video with subtitles overlay'}
          </span>
        </div>
        <button
          onClick={() => handleToggleSubtitles(!showSubtitles)}
          className={`w-12 h-7 rounded-full p-1 transition-all duration-300 relative flex items-center shrink-0 ${
            showSubtitles ? 'bg-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/10'
          }`}
        >
          <motion.div
            layout
            className="w-5 h-5 rounded-full bg-white shadow-md cursor-pointer"
            animate={{ x: showSubtitles ? 20 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      {/* Distribution Factory - Main Area */}
      <section id="distribution-section" className="pt-10 space-y-6">
        <div className="w-full">
          <DistributionFactory 
            manifest={manifest}
            scriptText={scriptData.meat || "Video Content Analysis"}
            projectId={projectId as string}
            locale={locale}
            onUpdateManifest={(newManifest: any) => {
               setVersion(prev => (prev ? { ...prev, script_data: newManifest } : prev) as any);
               if (projectId) {
                 projectService.updateLatestVersionManifest(projectId, newManifest);
               }
            }}
          />
        </div>
      </section>

      {/* Realtime Floating system logs console panel */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
        <button
          onClick={() => setShowLogConsole(prev => !prev)}
          className="px-4 py-2.5 rounded-full bg-[#8b5cf6]/90 hover:bg-[#7c3aed] text-white font-black uppercase tracking-widest text-[9px] border border-white/10 backdrop-blur-md shadow-2xl flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {locale === 'ru' ? `ЛОГИ СБОРКИ (${systemLogs.length})` : `RENDER LOGS (${systemLogs.length})`}
        </button>

        <AnimatePresence>
          {showLogConsole && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="w-[calc(100vw-2rem)] sm:w-[400px] h-[300px] bg-black/95 border border-white/10 rounded-3xl backdrop-blur-2xl shadow-2xl p-4 flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                  {locale === 'ru' ? 'Системный Лог Рендера' : 'Render System Log'}
                </span>
                <button
                  onClick={() => setSystemLogs([])}
                  className="text-[8px] font-black uppercase tracking-widest text-red-400 hover:text-red-300"
                >
                  {locale === 'ru' ? 'Очистить' : 'Clear'}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[9px] text-white/70 select-text custom-scrollbar">
                {systemLogs.length === 0 ? (
                  <p className="text-white/20 italic text-center pt-24">
                    {locale === 'ru' ? 'Лента логов пуста.' : 'Log is empty.'}
                  </p>
                ) : (
                  systemLogs.map((log, idx) => (
                    <div key={idx} className="border-l-2 border-purple-500 pl-2 leading-relaxed text-left">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
