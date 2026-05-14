'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/navigation';
import { CheckCircle, Copy, Download, Share2, Send, Play, ArrowRight, ArrowLeft, Loader2, AlertCircle , HardDrive, Image as ImageIcon } from 'lucide-react';
import { StatusStepper } from '@/components/ui/StatusStepper';
import { renderService, RenderJob } from '@/lib/services/renderService';
import { socialService } from '@/lib/services/socialService';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { projectService, Project, ProjectVersion } from '@/lib/services/projectService';
import { idb } from '@/lib/idb';
const DistributionFactory = dynamic(() => import('../../[id]/studio/_components/DistributionFactory'), { ssr: false });
import { getFFmpeg, resetFFmpeg } from '@/lib/ffmpeg-delivery';
import { fetchFile } from '@ffmpeg/util';

import { Suspense } from 'react';

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
  const [isLaunchingRender, setIsLaunchingRender] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState('');
  const [renderLogs, setRenderLogs] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [renderMode, setRenderMode] = useState<'canvas' | 'ffmpeg'>(() => {
    try {
      const { browserCapabilities } = require('@/lib/browser-capabilities');
      return browserCapabilities.suggestRenderMode();
    } catch (e) {
      return 'ffmpeg';
    }
  });
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderVideoRef = useRef<HTMLVideoElement | null>(null);
  const brollVideoRef = useRef<HTMLVideoElement | null>(null);
  
  const addLog = (msg: string) => {
    console.log(msg);
    setRenderLogs(prev => [...prev.slice(-15), msg]);
  };
  const ffmpegRef = useRef<any>(null);
  const isLaunchingRenderRef = useRef(false);
  
  const manifest = version?.script_data as any;
  const distributionAssets = manifest?.distributionAssets as any;
  const distributionImages = manifest?.distributionImages as Record<string, string> || {};

  const scriptData = {
    hook: manifest?.hook || manifest?.script?.hook || manifest?.scriptText?.split('\n')?.[0] || manifest?.segments?.[0]?.scriptText?.split('\n')?.[0] || '',
    context: manifest?.context || manifest?.script?.context || '',
    meat: manifest?.customScript || manifest?.scriptText || manifest?.meat || manifest?.script?.meat || manifest?.segments?.map((s: any) => s.scriptText).join('\n\n') || '',
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

  const generateSRT = (clips: any[]) => {
    return clips.map((c, i) => {
      const formatTime = (seconds: number) => {
        const date = new Date(0);
        date.setSeconds(seconds);
        const ms = Math.floor((seconds % 1) * 1000);
        return date.toISOString().substr(11, 8) + ',' + ms.toString().padStart(3, '0');
      };
      return `${i + 1}\n${formatTime(c.startTime)} --> ${formatTime(c.endTime)}\n${c.text}\n`;
    }).join('\n');
  };

  // Build drawtext filter chain — works without libass in single-thread @ffmpeg/core
  const buildDrawtextFilter = (clips: any[], baseFilter: string): string => {
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
    const subSize = manifest?.subtitleSize || 82;
    const subPos = manifest?.subtitlePos || { x: 0, y: 0 };

    const drawtextChain = clips.map(c => {
      const txt = esc((c.text || '').toUpperCase());
      
      // Style mapping
      let fontcolor = 'white';
      let box = 0;
      let boxcolor = 'black@0.5';
      let borderw = 2;
      let bordercolor = 'black';
      let shadowx = 0;
      let shadowy = 0;
      let shadowcolor = 'black@0.8';
      let italic = 0;

      if (subStyleIdx === 0) { // Classic Yellow Italic
        fontcolor = '#facc15'; borderw = 4; shadowx = 2; shadowy = 2; italic = 1;
      } else if (subStyleIdx === 1) { // White Bold
        fontcolor = 'white'; borderw = 2; shadowy = 4;
      } else if (subStyleIdx === 2) { // Red Outline
        fontcolor = '#ef4444'; borderw = 6; bordercolor = 'white';
      } else if (subStyleIdx === 3) { // Cyber Neon
        fontcolor = '#22d3ee'; shadowx = 0; shadowy = 0; italic = 1; borderw = 0;
      } else if (subStyleIdx === 4) { // Minimalist
        fontcolor = 'white'; box = 1; boxcolor = 'black@0.6';
      } else if (subStyleIdx === 5) { // Boxy Yellow
        fontcolor = 'black'; box = 1; boxcolor = '#facc15';
      } else if (subStyleIdx === 6) { // Gradient (Approx)
        fontcolor = 'white'; shadowy = 2; shadowcolor = 'black@0.5';
      } else if (subStyleIdx === 7) { // Soft Pink
        fontcolor = '#f472b6'; shadowy = 2;
      } else if (subStyleIdx === 8) { // Ghostly
        fontcolor = 'white@0.4';
      } else if (subStyleIdx === 9) { // Impact
        fontcolor = 'white'; shadowx = 0; shadowy = 0; borderw = 8; bordercolor = 'white@0.5';
      } else if (subStyleIdx === 10) { // Green Hacker
        fontcolor = '#10b981'; shadowx = 0; shadowy = 0;
      } else if (subStyleIdx === 11) { // Royal Gold
        fontcolor = '#fbbf24'; italic = 1; shadowy = 2;
      }

      // Calculate final Y position (FFmpeg 0,0 is top-left)
      const baseVerticalPos = 1632; 
      const finalY = baseVerticalPos - subPos.y;

      return [
        `drawtext=fontfile=font.ttf:text='${txt}'`,
        `fontsize=${subSize}`,
        `fontcolor=${fontcolor}`,
        `borderw=${borderw}`,
        `bordercolor=${bordercolor}`,
        `shadowcolor=${shadowcolor}`,
        `shadowx=${shadowx}`,
        `shadowy=${shadowy}`,
        box ? `box=1:boxcolor=${boxcolor}:boxborderw=10` : '',
        `x=(w-text_w)/2 + ${subPos.x}`,
        `y=${finalY}`,
        `enable='between(t,${c.startTime},${c.endTime})'`,
      ].filter(Boolean).join(':');
    }).join(',');

    return baseFilter ? `${baseFilter},${drawtextChain}` : drawtextChain;
  };

  const handleCanvasRender = async (ver: ProjectVersion) => {
    if (isLaunchingRenderRef.current) return;
    isLaunchingRenderRef.current = true;
    setIsLaunchingRender(true);
    setRenderStatus('Инициализация GPU...');
    setRenderProgress(5);

    try {
      const manifest = ver.script_data as any;
      const subs = manifest.subtitleClips || [];
      const brolls = manifest.brollClips || [];
      
      // 1. Prepare Font
      setRenderStatus('Загрузка шрифтов...');
      try {
        const font = new FontFace('Roboto-Bold', 'url(/fonts/Roboto-Bold.ttf)');
        await font.load();
        document.fonts.add(font);
      } catch (e) { console.warn('Font load failed, fallback to sans-serif'); }

      // 2. Setup Canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Canvas context failed');

      // 3. Prepare Sources
      setRenderStatus('Подготовка потоков...');
      let aRollUrl = manifest?.aRollUrl || manifest?.videoUrl;
      
      // Verification: Blob URLs often 404 on mobile after navigation
      let isValidBlob = false;
      if (aRollUrl?.startsWith('blob:')) {
        try {
          const check = await fetch(aRollUrl, { method: 'HEAD' });
          if (check.ok) isValidBlob = true;
        } catch (e) { isValidBlob = false; }
      }

      if (!isValidBlob || !aRollUrl) {
        console.log('[Delivery] Blob URL invalid or missing, recovering from IDB...');
        const cached = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
        if (cached instanceof Blob) {
           aRollUrl = URL.createObjectURL(cached);
           console.log('[Delivery] Recovered aRoll from IDB successfully.');
        }
      }
      if (!aRollUrl) throw new Error('A-Roll not found');

      const vARoll = document.createElement('video');
      vARoll.src = aRollUrl;
      vARoll.muted = true;
      vARoll.playsInline = true;
      vARoll.crossOrigin = 'anonymous';
      
      const vBRoll = document.createElement('video');
      vBRoll.muted = true;
      vBRoll.playsInline = true;
      vBRoll.crossOrigin = 'anonymous';

      setRenderStatus('Загрузка основного видео...');
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout loading A-Roll')), 15000);
        vARoll.onloadedmetadata = () => { clearTimeout(timeout); resolve(true); };
        vARoll.onerror = () => { clearTimeout(timeout); reject(new Error('Failed to load A-Roll video file')); };
        vARoll.load();
      });
      
      const duration = vARoll.duration;
      const fps = 30;
      const totalFrames = Math.floor(duration * fps);

      // 4. Setup Recorder
      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm;codecs=h264',
        videoBitsPerSecond: 8000000
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      
      const recordPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }));
      });

      recorder.start();

      // 5. Render Loop
      for (let frame = 0; frame < totalFrames; frame++) {
        const time = frame / fps;
        vARoll.currentTime = time;
        try {
          await new Promise((resolve, reject) => { 
            const t = setTimeout(() => reject(new Error('Seek timeout')), 5000);
            vARoll.onseeked = () => { clearTimeout(t); resolve(true); }; 
            vARoll.onerror = () => { clearTimeout(t); reject(new Error('Seek error')); };
          });
        } catch (e) { console.warn('Seek failed on frame', frame); }

        // Draw A-Roll
        ctx.drawImage(vARoll, 0, 0, canvas.width, canvas.height);

        // Draw B-Roll
        const activeBR = brolls.find((b: any) => time >= b.startTime && time <= b.endTime && b.url);
        if (activeBR) {
          if (vBRoll.src !== activeBR.url) {
            vBRoll.src = activeBR.url;
            await new Promise(r => { 
              const t = setTimeout(r, 2000);
              vBRoll.onloadeddata = () => { clearTimeout(t); r(true); };
              vBRoll.onerror = () => { clearTimeout(t); r(false); };
              vBRoll.load();
            });
          }
          vBRoll.currentTime = Math.max(0, time - activeBR.startTime);
          await new Promise(r => { 
            const t = setTimeout(r, 500);
            vBRoll.onseeked = () => { clearTimeout(t); r(true); };
          });
          const brX = activeBR.x || 0;
          const brY = activeBR.y || 0;
          const brScale = activeBR.scale || 1;
          
          ctx.save();
          ctx.translate(brX, brY);
          ctx.scale(brScale, brScale);
          ctx.drawImage(vBRoll, 0, 0, canvas.width, canvas.height);
          ctx.restore();
        }

        // Draw Subtitles
        const activeSub = subs.find((s: any) => time >= s.startTime && time <= s.endTime);
        if (activeSub) {
          const subPos = manifest?.subtitlePos || { x: 0, y: 0 };
          const subSize = manifest?.subtitleSize || 82;
          const subStyleIdx = manifest?.subtitleStyle || 0;
          const baseIdx = canvas.height - 450 - subPos.y;
          
          let fontStyle = '';
          let fillStyle: string | CanvasGradient = '#facc15';
          let shadowBlur = 0;
          let shadowColor = 'transparent';
          let useBox = false;
          let boxColor = '#facc15';

          if (subStyleIdx === 0) { // Yellow Italic
            fontStyle = 'italic'; fillStyle = '#facc15';
          } else if (subStyleIdx === 1) { // White Bold
            fillStyle = 'white';
          } else if (subStyleIdx === 2) { // Red Outline
            fillStyle = '#ef4444'; ctx.strokeStyle = 'white'; ctx.lineWidth = 15;
          } else if (subStyleIdx === 3) { // Cyber Neon
            fontStyle = 'italic'; fillStyle = '#22d3ee'; shadowBlur = 20; shadowColor = '#22d3ee';
          } else if (subStyleIdx === 4) { // Minimalist
            fillStyle = 'white'; useBox = true; boxColor = 'rgba(0,0,0,0.6)';
          } else if (subStyleIdx === 5) { // Boxy Yellow
            fillStyle = 'black'; useBox = true; boxColor = '#facc15';
          } else if (subStyleIdx === 6) { // Gradient
            const grad = ctx.createLinearGradient(0, baseIdx - 50, 0, baseIdx + 50);
            grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#888888');
            fillStyle = grad;
          } else if (subStyleIdx === 7) { // Soft Pink
            fillStyle = '#f472b6'; shadowBlur = 10; shadowColor = 'rgba(244,114,182,0.4)';
          } else if (subStyleIdx === 8) { // Ghostly
            fillStyle = 'rgba(255,255,255,0.4)';
          } else if (subStyleIdx === 9) { // Impact
            fillStyle = 'white'; shadowBlur = 30; shadowColor = 'white';
          } else if (subStyleIdx === 10) { // Green Hacker
            fillStyle = '#10b981'; shadowBlur = 5; shadowColor = '#10b981';
          } else if (subStyleIdx === 11) { // Royal Gold
            fontStyle = 'italic'; fillStyle = '#fbbf24';
          }

          ctx.font = `900 ${fontStyle} ${subSize + 10}px Roboto-Bold, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = fillStyle;
          
          if (shadowBlur > 0) {
            ctx.shadowBlur = shadowBlur;
            ctx.shadowColor = shadowColor;
          }

          const words = activeSub.text.toUpperCase().split(' ');
          const line1 = words.slice(0, 3).join(' ');
          const line2 = words.slice(3).join(' ');
          
          
          if (useBox) {
            ctx.fillStyle = boxColor;
            const metrics = ctx.measureText(line1);
            ctx.fillRect(canvas.width / 2 + subPos.x - metrics.width / 2 - 20, baseIdx - subSize, metrics.width + 40, subSize + 40);
            ctx.fillStyle = fillStyle;
          }

          // Outline
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 12;
          ctx.lineJoin = 'round';
          
          // Draw Outline first
          ctx.strokeText(line1, canvas.width / 2 + subPos.x, baseIdx);
          if (line2) ctx.strokeText(line2, canvas.width / 2 + subPos.x, baseIdx + 100);
          
          // Draw Text
          ctx.fillText(line1, canvas.width / 2 + subPos.x, baseIdx);
          if (line2) ctx.fillText(line2, canvas.width / 2 + subPos.x, baseIdx + 100);
          
          // Reset shadow
          ctx.shadowBlur = 0;
        }

        const calculatedProgress = Math.max(0, Math.min(90, Math.round((frame / (totalFrames || 1)) * 90)));
        setRenderProgress(calculatedProgress);
        setRenderStatus(`Синтез кадров: ${Math.round((frame / (totalFrames || 1)) * 100)}%`);
      }

      recorder.stop();
      const silentVideoBlob = await recordPromise;
      
      console.log('[Canvas Render] Silent video blob size:', silentVideoBlob.size);
      if (silentVideoBlob.size < 500) {
        throw new Error('Сбой MediaRecorder: итоговый файл слишком мал. Вероятно, браузер ограничил доступ к видео-потоку (CORS).');
      }

      // 6. Merge Audio with FFmpeg (Lightning Fast)
      setRenderStatus('Финальная склейка (Audio)...');
      const ffmpeg = await getFFmpeg();

      await ffmpeg.writeFile('silent.mp4', await fetchFile(silentVideoBlob));
      await ffmpeg.writeFile('source.mp4', await fetchFile(aRollUrl));
      
      // Extract audio from source and merge into silent video
      await ffmpeg.exec(['-i', 'silent.mp4', '-i', 'source.mp4', '-map', '0:v', '-map', '1:a', '-c', 'copy', 'output.mp4']);
      
      const finalData = await ffmpeg.readFile('output.mp4');
      const finalBlob = new Blob([finalData as any], { type: 'video/mp4' });
      
      console.log('[Canvas Render] Final blob size:', finalBlob.size);
      if (finalBlob.size < 1000) {
        throw new Error('Финальный файл слишком мал. Попробуйте переключиться на FFmpeg-режим внизу страницы.');
      }
      
      await idb.set(`final_render_${projectId}_${ver.id}`, finalBlob, 'MediaBuffer');
      const finalUrl = URL.createObjectURL(finalBlob);
      
      setJob({ id: 'canvas-render', status: 'completed', output_url: finalUrl, progress: 100 } as any);
      setRenderProgress(100);
      setRenderStatus('Готово!');

    } catch (err: any) {
      console.error('[Canvas Render] Critical Failure:', err);
      const errorMsg = err instanceof Error ? err.message : (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setError(`Ошибка Canvas-рендера: ${errorMsg}. Пробую FFmpeg...`);
      
      // Auto-fallback after a short delay so user can see what happened
      setRenderStatus('Переключаюсь на запасной вариант сборки...');
      setTimeout(() => {
        if (!job || job.status !== 'completed') {
           setError('Использую запасной метод сборки (FFmpeg) для обеспечения качества...');
           setRenderMode('ffmpeg');
           handleClientRender(ver);
        }
      }, 2000);
    } finally {
      setIsLaunchingRender(false);
      isLaunchingRenderRef.current = false;
    }
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

    setIsLaunchingRender(true);
    setRenderStatus('Подготовка движка...');
    setRenderProgress(5);

    try {
      if (projectId) {
        await projectService.updateProjectStatus(projectId, 'rendering');
      }

      addLog('[System] Инициализация ядра...');
      const ffmpeg = await getFFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });
      
      ffmpeg.on('progress', ({ progress }) => {
        if (typeof progress !== 'number' || isNaN(progress) || progress < 0) return;
        const p = Math.max(0, Math.min(98, 50 + Math.round(progress * 48)));
        setRenderProgress(p);
      });

      setRenderStatus('Проверка готовности WASM...');

      const manifest = ver.script_data as any;
      const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
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
        console.warn('[Delivery] Failed to load font:', e);
      }

      const processedBrolls = [];
      for (let i = 0; i < brollFiles.length; i++) {
        setRenderStatus(`Оптимизация B-Roll ${i+1}/${brollFiles.length}...`);
        const { name, clip } = brollFiles[i];
        const optName = `opt_${name}`;
        await ffmpeg.exec(['-i', name, '-ss', (clip.sourceStartTime || 0).toString(), '-t', (clip.endTime - clip.startTime).toString(), '-vf', scale, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-an', '-sn', optName]);
        processedBrolls.push({ name: optName, clip });
        try { await ffmpeg.deleteFile(name); } catch(e) {}
      }

      const subs = manifest.subtitleClips || manifest.segments?.[0]?.subtitleClips || [];
      console.log('[Delivery] Subtitle clips found:', subs.length);

      setRenderStatus(`Финальная сборка ${isMobile ? '720p' : '1080p'}...`);
      setRenderProgress(60);

      // 1-3. Optimized Execution Path
      const hasBrolls = processedBrolls.length > 0;
      let currentInput = 'input_aroll.mp4';

      if (!hasBrolls) {
        // 🚀 FAST PATH: No B-Rolls (Faceless or Simple Teleprompter) -> 1 PASS!
        setRenderStatus(`Быстрая сборка ${isMobile ? '720p' : '1080p'}...`);
        const subOutput = 'final_fast.mp4';
        
        let vfFilter = scale;
        if (subs.length > 0) {
          setRenderStatus(`Быстрая сборка + субтитры (${subs.length})...`);
          vfFilter = buildDrawtextFilter(subs, scale);
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
        // 🐢 MULTI-PASS PATH: Has B-Rolls (Requires complex overlay)
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
          
          // Apply scale to the broll before overlaying
          const overlayFilter = `[1:v]scale=iw*${brScale}:-1[scaled];[0:v][scaled]overlay=x=${brX}:y=${brY}:enable='between(t,${broll.clip.startTime},${broll.clip.endTime})'[out]`;
          await ffmpeg.exec([
            '-i', currentInput,
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
          const vfFilter = buildDrawtextFilter(subs, '');
          
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
        // DO NOT save blob URL to Supabase
        await projectService.updateProject(projectId, { status: 'completed' });
      }

      setJob({ id: 'local-render', status: 'completed', output_url: videoUrl, progress: 100 } as any);

    } catch (err: any) {
      console.error('[Delivery] Client render failed:', err);
      setError(err.message || 'Ошибка рендера');
    } finally {
      setIsLaunchingRender(false);
      isLaunchingRenderRef.current = false;
    }
  };

  const downloadTXT = () => {
    const texts = TEXT_OUTPUTS.map(o => `[${o.platform}]\n${o.text}\n`).join('\n---\n\n');
    const blob = new Blob([texts], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ViralEngine_Texts_${projectId}.txt`;
    a.click();
  };

  const handleDownload = async () => {
    if (!job?.output_url) return;
    
    // Try native share first on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.share && job.output_url.startsWith('blob:')) {
      try {
        const res = await fetch(job.output_url);
        const blob = await res.blob();
        const file = new File([blob], `ViralEngine_Final_${projectId}.mp4`, { type: 'video/mp4' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Viral Engine Video',
            text: 'Check out my AI-generated video!'
          });
          return;
        }
      } catch (e) {
        console.warn('[Delivery] Native share failed:', e);
      }
    }

    // Standard download fallback
    try {
      const link = document.createElement('a');
      link.href = job.output_url;
      link.download = `ViralEngine_Final_${projectId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      window.open(job.output_url, '_blank');
    }
  };

  const handleExport = async (target: 'telegram' | 'drive') => {
    setIsExporting(true);
    await new Promise(r => setTimeout(r, 1500));
    if (target === 'telegram') {
      window.open('https://t.me/ViralEngine_Bot', '_blank');
    } else {
      alert('Загрузка на Google Drive начата.');
    }
    setIsExporting(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    let pollInterval: any;
    if (projectId && !distributionAssets) {
      pollInterval = setInterval(async () => {
        const ver = await projectService.getLatestVersion(projectId);
        if (ver?.script_data?.distributionAssets) {
          setVersion(ver);
          // If we are done with rendering and assets are ready, stop polling
          if (job?.status === 'completed') {
            clearInterval(pollInterval);
          }
        }
      }, 5000);
    }
    return () => clearInterval(pollInterval);
  }, [projectId, !!distributionAssets, job?.status]);

  useEffect(() => {
    return () => {
      console.log('[Delivery] Cleaning up FFmpeg instance...');
      resetFFmpeg();
    };
  }, []);

  useEffect(() => {
    async function loadResults() {
      if (projectId) {
        try {
          // 1. TRY RECOVERING FROM CACHE
          const cachedRec = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
          const verData = await projectService.getLatestVersion(projectId);
          
          if (cachedRec instanceof Blob) {
            setPreviewUrl(URL.createObjectURL(cachedRec));
          } else if (verData?.script_data?.aRollUrl) {
            setPreviewUrl(verData.script_data.aRollUrl);
          }

          const cachedRender = await idb.get(`final_render_${projectId}`, 'MediaBuffer');
          if (cachedRender instanceof Blob) {
            console.log('[Delivery] Restored from IDB cache');
            const url = URL.createObjectURL(cachedRender);
            setJob({ id: 'local-render', status: 'completed', output_url: url, progress: 100 } as any);
            setRenderProgress(100);
            setIsLoading(false);
            
            // Still load version data for assets
            if (verData) setVersion(verData);
            return;
          }

          // 2. IF NO CACHE, START RENDER
          if (verData) {
            setVersion(verData);
            // 🚀 ALWAYS use FFmpeg (handleClientRender) as primary to avoid flaky Canvas issues
            handleClientRender(verData);
          }
        } catch (err) {
          console.error('Failed to load project version:', err);
        } finally {
          setIsLoading(false);
        }
        return;
      }
      setError('Проект не найден');
      setIsLoading(false);
    }
    loadResults();
  }, [projectId]);

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="p-6 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 text-center space-y-4 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-black text-white uppercase tracking-tighter">Delivery Failed</h2>
          <p className="text-sm text-white/40">{error}</p>
        </div>
        <button 
          onClick={() => router.push(`/app/projects/${projectId}/studio?tab=assembly`)} 
          className="px-8 py-3 rounded-full bg-purple-500 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-purple-900/40"
        >
          {locale === 'ru' ? 'Вернуться в монтажку' : 'Back to Montage'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      <div className="flex items-center justify-between py-2">
        <button 
          onClick={() => router.push(`/app/projects/${projectId}/studio?tab=assembly`)} 
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
        >
          <ArrowLeft size={14} /> {locale === 'ru' ? 'В МОНТАЖКУ' : 'BACK TO STUDIO'}
        </button>
        <div className="text-[10px] font-black text-white/20 tracking-[0.3em] uppercase">Delivery Lab</div>
      </div>

      <StatusStepper currentStep={job?.status === 'completed' ? 'done' : 'processing'} />

      <div className="rounded-3xl p-6 text-center space-y-4 bg-white/[0.02] border border-white/5">
        <div className="text-4xl">{job?.status === 'completed' ? '🎬' : '⚡'}</div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase text-white">
            {job?.status === 'completed' ? t('badge') : (renderStatus || 'Сборка проекта...')}
          </h1>
          <p className="text-[11px] text-white/40 mt-1 font-bold uppercase tracking-widest">
            {job?.status === 'completed' ? t('statusSub') : `Пожалуйста, подождите. Прогресс: ${Math.round(renderProgress)}%`}
          </p>
        </div>
        {job?.status !== 'completed' && (
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <motion.div 
                className="h-full bg-gradient-to-r from-purple-600 to-blue-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" 
                initial={{ width: 0 }} 
                animate={{ width: `${Math.max(0, Math.min(100, renderProgress))}%` }} 
                transition={{ type: 'spring', damping: 25, stiffness: 50 }}
            />
          </div>
        )}
      </div>

      <div className="rounded-[2.5rem] overflow-hidden bg-[#050508] border border-white/10 aspect-[9/16] max-h-[500px] mx-auto relative shadow-2xl group">
        {job?.output_url ? (
          <video src={job.output_url} controls className="w-full h-full object-cover" />
        ) : (
          <div className="relative w-full h-full">
            {previewUrl && (
              <video 
                src={previewUrl} 
                autoPlay 
                muted 
                loop 
                playsInline 
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
                <Download size={16} /> {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? (locale === 'ru' ? 'СОХРАНИТЬ / ПОДЕЛИТЬСЯ' : 'SAVE / SHARE') : (locale === 'ru' ? 'СКАЧАТЬ ВИДЕО' : 'DOWNLOAD VIDEO')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Distribution Factory - Main Area */}
      <section id="distribution-section" className="pt-10 space-y-6">
        <div className="flex items-center gap-3 px-2">
           <div className="w-1.5 h-6 bg-purple-500 rounded-full" />
           <h2 className="text-xl font-black uppercase tracking-tight text-white">Media Distribution Pack</h2>
        </div>
        
        <div className="h-[700px] w-full">
          <DistributionFactory 
            manifest={manifest}
            scriptText={scriptData.meat || "Video Content Analysis"}
            projectId={projectId as string}
            locale={locale}
            onUpdateManifest={(newManifest: any) => {
               setVersion(prev => (prev ? { ...prev, script_data: newManifest } : prev) as any);
            }}
          />
        </div>
      </section>

      {/* Emergency Rollback UI */}
      <div className="mt-10 pt-10 border-t border-white/5 flex flex-col items-center gap-4">
          <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">
            Render Mode: <span className="text-purple-400">{renderMode.toUpperCase()}</span>
          </p>
          <button 
            onClick={() => {
              if (job?.status === 'completed' || job?.status === 'processing') {
                const confirmed = window.confirm(locale === 'ru' ? 'Это прервет текущий процесс и запустит сборку заново другим методом. Продолжить?' : 'This will restart the render using a different method. Continue?');
                if (!confirmed) return;
              }
              
              const next = renderMode === 'canvas' ? 'ffmpeg' : 'canvas';
              console.log('[Delivery] Manual switch to:', next);
              
              setRenderMode(next);
              setJob(null);
              setError(null);
              setRenderStatus(locale === 'ru' ? 'Подготовка к перезапуску...' : 'Preparing restart...');
              
              // FORCE RE-RENDER by resetting state first
              setTimeout(async () => {
                if (!projectId) return;
                const v = await projectService.getLatestVersion(projectId);
                if (v) {
                  setVersion(v);
                  if (next === 'canvas') handleCanvasRender(v);
                  else handleClientRender(v);
                } else {
                  setError('Не удалось загрузить данные проекта.');
                }
              }, 100);
            }}
            className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase text-white/40 hover:text-white transition-all"
          >
            Switch to {renderMode === 'canvas' ? 'Legacy (FFmpeg)' : 'High-Speed (Canvas)'}
          </button>
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

