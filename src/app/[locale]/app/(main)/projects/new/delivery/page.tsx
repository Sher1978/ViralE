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

  const handleClientRender = async (ver: ProjectVersion) => {
    if (isLaunchingRender) return;
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
        if (message.includes('error') || message.includes('failed')) {
           setRenderStatus(`Движок: ${message.slice(0, 40)}...`);
        }
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
        const cachedVideo = await idb.get(`video_file_${projectId}`);
        if (cachedVideo instanceof Blob) {
           aRollUrl = URL.createObjectURL(cachedVideo);
        }
      }

      if (!aRollUrl) throw new Error('Исходное видео (A-Roll) не найдено.');

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
            const cachedBroll = await idb.get(`broll_file_${clip.id}`);
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

      const processedBrolls = [];
      for (let i = 0; i < brollFiles.length; i++) {
        setRenderStatus(`Оптимизация B-Roll ${i+1}/${brollFiles.length}...`);
        const { name, clip } = brollFiles[i];
        const optName = `opt_${name}`;
        await ffmpeg.exec(['-i', name, '-ss', (clip.sourceStartTime || 0).toString(), '-t', (clip.endTime - clip.startTime).toString(), '-vf', scale, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-an', '-sn', optName]);
        processedBrolls.push({ name: optName, clip });
        try { await ffmpeg.deleteFile(name); } catch(e) {}
      }

      setRenderStatus('Подготовка субтитров...');
      const subs = manifest.subtitleClips || manifest.segments?.[0]?.subtitleClips || [];
      console.log('[Delivery] Finalizing subtitles count:', subs.length);
      const srtContent = generateSRT(subs);
      await ffmpeg.writeFile('subs.srt', srtContent);

      setRenderStatus(`Финальная сборка ${isMobile ? '720p' : '1080p'}...`);
      setRenderProgress(60);

      let currentInput = 'input_aroll.mp4';
      
      if (subs.length > 0) {
        setRenderStatus(`Наложение субтитров...`);
        const subOutput = `temp_A.mp4`;
        const exitCodeSub = await ffmpeg.exec([
          '-i', currentInput,
          '-vf', `${scale},subtitles=./subs.srt`,
          '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-threads', '1', '-c:a', 'aac', '-b:a', '128k', subOutput
        ]);
        
        if (exitCodeSub !== 0) {
          console.warn('[Delivery] Subtitle burn failed, continuing without them...');
        } else {
          try { await ffmpeg.deleteFile('input_aroll.mp4'); } catch(e) {}
          currentInput = subOutput;
        }
      }

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

      const finalData = await ffmpeg.readFile(currentInput);
      await ffmpeg.writeFile('output.mp4', finalData);
      const videoBlob = new Blob([finalData as any], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(videoBlob);
      
      setRenderProgress(100);
      setRenderStatus('Готово!');

      if (projectId) {
        await projectService.updateProject(projectId, { status: 'completed', final_video_url: videoUrl });
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
          clearInterval(pollInterval);
        }
      }, 5000);
    }
    return () => clearInterval(pollInterval);
  }, [projectId, !!distributionAssets]);

  useEffect(() => {
    async function loadResults() {
      if (projectId) {
        try {
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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400">Generating Final Cut...</p>
          </div>
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

      {/* Distribution Section */}
      <div className="space-y-4 pt-4">
      {(!distributionAssets && !isLaunchingRender) && (
        <div className="p-8 rounded-3xl bg-purple-500/5 border border-dashed border-purple-500/20 text-center space-y-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto">
            <ImageIcon className="text-purple-400" size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase text-white">Ассеты дистрибуции не готовы</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Нажмите кнопку ниже для генерации всего пакета</p>
          </div>
          <button 
            onClick={async () => { 
              setRenderStatus("Генерация ассетов...");
              const res = await fetch("/api/ai/distribution-assets", { 
                method: "POST", 
                body: JSON.stringify({ scriptText: scriptData.meat, projectId, locale }) 
              });
              const assets = await res.json();
              if (assets && !assets.error) {
                await projectService.updateLatestVersionManifest(projectId, { ...manifest, distributionAssets: assets });
                setVersion(prev => (prev ? { ...prev, script_data: { ...prev.script_data, distributionAssets: assets } } : prev) as any);
              }
            }}
            className="px-6 py-3 rounded-xl bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            Сгенерировать пакет (AI)
          </button>
        </div>
      )}
      {TEXT_OUTPUTS.map((output) => (
          <div key={output.platform} className="rounded-3xl p-5 space-y-4 bg-white/[0.02] border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{output.icon}</span>
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: output.accent }}>{output.platform}</span>
              </div>
              <button onClick={() => handleCopy(output.text)} className="flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-white/5 text-white/60 hover:bg-white/10">
                <Copy className="w-3 h-3" /> {t('copyBtn')}
              </button>
            </div>
            <p className="text-[12px] text-white/60 leading-relaxed font-medium">{output.text}</p>
          </div>
        ))}
      </div>

      {/* Visual Assets */}
      {distributionAssets?.ig_carousel && (
        <div className="space-y-4 pt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Instagram Carousel</p>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {distributionAssets.ig_carousel.prompts.map((prompt: string, i: number) => {
              const url = distributionImages[`carousel-${i}`];
              return (
                <div key={i} className="flex-shrink-0 w-48 relative aspect-[4/5] rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
                  {url ? <img src={url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-white/10" size={24} /></div>}
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/40 text-[8px] font-black text-white">SLIDE {i + 1}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {distributionAssets?.video_banner && (
        <div className="space-y-4 pt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Video Cover</p>
          <div className="rounded-3xl p-5 flex items-center justify-between bg-purple-500/5 border border-purple-500/20">
            <div className="flex items-center gap-4">
              <div className="w-16 h-20 rounded-xl bg-purple-500/10 border border-purple-500/20 overflow-hidden">
                {distributionImages['banner'] ? <img src={distributionImages['banner']} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-purple-500/20" size={20} /></div>}
              </div>
              <div>
                <p className="text-sm font-black uppercase text-white/90">Video Cover Master</p>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest italic truncate max-w-[150px]">"{distributionAssets.video_banner.text_on_banner}"</p>
              </div>
            </div>
            {distributionImages['banner'] && (
              <button onClick={() => { const a = document.createElement('a'); a.href = distributionImages['banner']; a.download = 'banner.webp'; a.click(); }} className="w-10 h-10 rounded-2xl flex items-center justify-center bg-purple-500/20 hover:bg-purple-500/30 text-purple-400">
                <Download size={20} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="pt-8 space-y-4">
        <button onClick={() => downloadTXT()} className="w-full py-5 rounded-[2.5rem] bg-purple-600 text-white flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(168,85,247,0.4)] border border-purple-400 font-black text-sm uppercase tracking-widest transition-all active:scale-95">
          <Download size={20} /> ВЫГРУЗИТЬ (TXT + VIDEO)
        </button>
      </div>
    </div>
  );
}
