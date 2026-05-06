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
import { projectService, Project, ProjectVersion } from '@/lib/services/projectService';
import { idb } from '@/lib/idb';
import DistributionFactory from '@/app/[locale]/app/(main)/projects/[id]/studio/_components/DistributionFactory';

export default function DeliveryPage() {
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
  
  const addLog = (msg: string) => {
    console.log(msg);
    setRenderLogs(prev => [...prev.slice(-15), msg]);
  };
  const ffmpegRef = useRef<any>(null);
  
  const manifest = version?.script_data as any;
  const distributionAssets = manifest?.distributionAssets as any;
  const distributionImages = manifest?.distributionImages as Record<string, string> || {};

  const scriptData = {
    hook: manifest?.hook || manifest?.script?.hook || manifest?.scriptText?.split('\n')?.[0] || manifest?.segments?.[0]?.scriptText?.split('\n')?.[0] || '',
    context: manifest?.context || manifest?.script?.context || '',
    meat: manifest?.scriptText || manifest?.meat || manifest?.script?.meat || manifest?.segments?.map((s: any) => s.scriptText).join('\n\n') || '',
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

    const drawtextChain = clips.map(c => {
      const txt = esc((c.text || '').toUpperCase());
      return [
        `drawtext=fontfile=font.ttf:text='${txt}'`,
        `fontsize=72`,
        `fontcolor=#facc15`, // yellow-400 equivalent
        `shadowcolor=black`,
        `shadowx=4`,
        `shadowy=4`,
        `x=(w-text_w)/2`,
        `y=h-420`,
        `enable='between(t,${c.startTime},${c.endTime})'`,
      ].join(':');
    }).join(',');

    return baseFilter ? `${baseFilter},${drawtextChain}` : drawtextChain;
  };

  const handleClientRender = async (ver: ProjectVersion) => {
    if (isLaunchingRender) return;
    
    // 0. CHECK CACHE FIRST
    try {
      const cachedRender = await idb.get(`final_render_${projectId}`, 'MediaBuffer');
      if (cachedRender instanceof Blob) {
        console.log('[Delivery] Found cached render in IDB, skipping generation');
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
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL, fetchFile } = await import('@ffmpeg/util');
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });
      
      ffmpeg.on('progress', ({ progress }) => {
        const p = Math.min(98, 50 + Math.round(progress * 48));
        setRenderProgress(p);
      });

      setRenderStatus('Загрузка модулей сборки (WASM)...');
      const baseURL = '/ffmpeg';
      
      try {
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
      } catch (loadErr) {
        console.error('[Delivery] FFmpeg load failed:', loadErr);
        throw new Error('Не удалось загрузить ядро рендера. Проверьте соединение.');
      }

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
          setRenderStatus(`Слой B-Roll ${i + 1} из ${processedBrolls.length}...`);
          const overlayFilter = `[0:v][1:v]overlay=enable='between(t,${broll.clip.startTime},${broll.clip.endTime})'[out]`;
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
      await idb.set(`final_render_${projectId}`, videoBlob, 'MediaBuffer');
      
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
    async function loadResults() {
      if (projectId) {
        try {
          // 1. TRY RECOVERING FROM CACHE
          const cachedRender = await idb.get(`final_render_${projectId}`, 'MediaBuffer');
          if (cachedRender instanceof Blob) {
            console.log('[Delivery] Restored from IDB cache');
            const url = URL.createObjectURL(cachedRender);
            setJob({ id: 'local-render', status: 'completed', output_url: url, progress: 100 } as any);
            setRenderProgress(100);
            setIsLoading(false);
            
            // Still load version data for assets
            const verData = await projectService.getLatestVersion(projectId);
            if (verData) setVersion(verData);
            return;
          }

          // 2. IF NO CACHE, START RENDER
          const verData = await projectService.getLatestVersion(projectId);
          if (verData) {
            setVersion(verData);
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
        <button onClick={() => router.back()} className="px-8 py-3 rounded-full bg-purple-500 text-white text-xs font-black uppercase tracking-widest">Back to Studio</button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      <div className="flex items-center justify-between py-2">
        <button onClick={() => router.back()} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">
          <ArrowLeft size={14} /> {locale === 'ru' ? 'В СТУДИЮ' : 'STUDIO'}
        </button>
        <div className="text-[10px] font-black text-white/20 tracking-[0.3em] uppercase">Delivery Lab</div>
      </div>

      <StatusStepper currentStep={job?.status === 'completed' ? 'done' : 'processing'} />

      <div className="rounded-3xl p-6 text-center space-y-4 bg-white/[0.02] border border-white/5">
        <div className="text-5xl">{job?.status === 'completed' ? '🎉' : '⚙️'}</div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase text-white">
            {job?.status === 'completed' ? t('badge') : (renderStatus || 'Видео в процессе...')}
          </h1>
          <p className="text-[11px] text-white/40 mt-1">
            {job?.status === 'completed' ? t('statusSub') : `Пожалуйста, подождите. Прогресс: ${renderProgress}%`}
          </p>
        </div>
        {job?.status !== 'completed' && (
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <motion.div className="h-full bg-purple-500" initial={{ width: 0 }} animate={{ width: `${renderProgress}%` }} />
          </div>
        )}
      </div>

      <div className="rounded-[2rem] overflow-hidden bg-[#0a0a1a] border border-white/5 aspect-[9/16] max-h-[500px] mx-auto relative shadow-2xl">
        {job?.output_url ? (
          <video src={job.output_url} controls className="w-full h-full object-cover" />
        ) : (
          <>
            {previewUrl && (
              <video src={previewUrl} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-60" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400">Generating Final Cut...</p>
            </div>
          </>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">65 SEC · AI PRODUCTION</span>
          <div className="flex gap-2">
            <a href={job?.output_url} download className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors">
              <Download className="w-4 h-4 text-white" />
            </a>
          </div>
        </div>
      </div>

      {/* Distribution Factory (New Design) */}
      <div className="pt-8 h-[600px] mb-8">
        <DistributionFactory 
          manifest={manifest}
          scriptText={scriptData.meat}
          projectId={projectId as string}
          locale={locale}
          onUpdateManifest={(newManifest: any) => {
             setVersion(prev => (prev ? { ...prev, script_data: newManifest } : prev) as any);
          }}
        />
      </div>
    </div>
  );
}

