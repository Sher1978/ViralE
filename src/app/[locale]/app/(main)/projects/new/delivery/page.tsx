'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/navigation';
import { CheckCircle, Copy, Download, Share2, Send, Play, ArrowRight, ArrowLeft, Loader2, AlertCircle , HardDrive } from 'lucide-react';
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
      text: scriptData ? `${scriptData.hook}\n\n${scriptData.context}\n\n${scriptData.meat}\n\n${scriptData.cta}` : '',
    },
    {
      platform: 'Twitter / X',
      icon: '🐦',
      accent: '#1DA1F2',
      text: scriptData ? `${scriptData.hook.substring(0, 200)}... #ViralEngine` : '',
    },
    {
      platform: 'Instagram',
      icon: '📸',
      accent: '#E4405F',
      text: scriptData ? `${scriptData.hook}\n\n${scriptData.meat}\n\n#ViralEngine #Reels` : '',
    },
    {
      platform: 'TikTok',
      icon: '🎵',
      accent: '#00F2EA',
      text: scriptData ? `${scriptData.hook}\n\n#ViralEngine #Trends` : '',
    },
    {
      platform: 'LinkedIn',
      icon: '💼',
      accent: '#0077B5',
      text: scriptData ? `New insights:\n\n${scriptData.meat}` : '',
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
      // Set project status to rendering
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
      addLog(`[System] Режим: ${isMobile ? 'Mobile (720p)' : 'Desktop (1080p)'}`);
      let aRollUrl = manifest?.aRollUrl ||
        manifest?.segments?.find((s: any) => s.type === 'user_recording' && s.assetUrl)?.assetUrl ||
        manifest?.videoUrl ||
        null;

      // ── RECOVERY: If aRollUrl is missing or is a dead blob, try IndexedDB ──
      if (!aRollUrl || aRollUrl.startsWith('blob:')) {
        console.log('[Delivery] A-Roll URL missing or session-bound, checking IndexedDB...');
        const cachedVideo = await idb.get(`video_file_${projectId}`);
        if (cachedVideo instanceof Blob) {
           aRollUrl = URL.createObjectURL(cachedVideo);
           console.log('[Delivery] Recovered A-Roll from IndexedDB');
        }
      }

      if (!aRollUrl) throw new Error('Исходное видео (A-Roll) не найдено. Вернитесь в студию и убедитесь, что видео загружено.');

      setRenderStatus('Скачивание основного видео...');
      setRenderProgress(10);
      
      try {
        const aRollData = await fetchFile(aRollUrl);
      addLog(`[File] Основное видео: ${Math.round(aRollData.byteLength / 1024)} KB`);
      if (aRollData.byteLength < 100) throw new Error('Исходный файл (A-Roll) поврежден или пуст.');
      await ffmpeg.writeFile('input_aroll.mp4', aRollData);
      } catch (fileErr) {
        console.error('[Delivery] A-Roll fetch failed:', fileErr);
        throw new Error('Не удалось получить исходное видео. Попробуйте вернуться в студию и запустить экспорт заново.');
      }

      const brollClipsRaw = manifest?.brollClips || [];
      const brollClipsWithUrls = brollClipsRaw.filter((c: any) => c.url && (c.url.startsWith('http') || c.url.startsWith('blob')));
      const brollFiles: Array<{ name: string; clip: any }> = [];

      for (let i = 0; i < brollClipsRaw.length; i++) {
        const clip = brollClipsRaw[i];
        try {
          setRenderStatus(`Синхронизация B-Roll ${i + 1}/${brollClipsRaw.length}...`);
          setRenderProgress(10 + Math.round((i / brollClipsRaw.length) * 30));
          const name = `broll_${i}.mp4`;
          
          let clipUrl = clip.url;
          // RECOVERY for B-Roll blobs
          if (!clipUrl || clipUrl.startsWith('blob:')) {
            const cachedBroll = await idb.get(`broll_file_${clip.id}`);
            if (cachedBroll instanceof Blob) {
              clipUrl = URL.createObjectURL(cachedBroll);
            }
          }

          if (clipUrl) {
            const bRollData = await fetchFile(clipUrl);
            addLog(`[File] B-Roll ${i}: ${Math.round(bRollData.byteLength / 1024)} KB`);
            if (bRollData.byteLength > 100) {
              await ffmpeg.writeFile(name, bRollData);
              brollFiles.push({ name, clip });
            }
          }
        } catch (e) {
          console.warn(`[FFmpeg] Failed to load B-Roll ${i}, skipping:`, e);
        }
      }

      // --- STEP 2: Pre-process B-Rolls ---
      const processedBrolls = [];
      for (let i = 0; i < brollFiles.length; i++) {
        setRenderStatus(`Оптимизация B-Roll ${i+1}/${brollFiles.length}...`);
        setRenderProgress(20 + (i / brollFiles.length) * 20);
        const { name, clip } = brollFiles[i];
        const optName = `opt_${name}`;
        await ffmpeg.exec(['-i', name, '-ss', clip.startTime.toString(), '-t', (clip.endTime - clip.startTime).toString(), '-vf', scale, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-an', '-sn', optName]);
        processedBrolls.push({ name: optName, clip });
        try { await ffmpeg.deleteFile(name); } catch(e) {}
      }

      setRenderStatus('Подготовка субтитров...');
      const srtContent = generateSRT(ver.script_data.subtitleClips || []);
      await ffmpeg.writeFile('subs.srt', srtContent);

      setRenderStatus(`Финальная сборка ${isMobile ? '720p' : '1080p'}...`);
      setRenderProgress(60);

      let ffmpegArgs: string[];
      if (processedBrolls.length === 0) {
        ffmpegArgs = [
          '-i', 'input_aroll.mp4',
          '-vf', `${scale},subtitles=subs.srt:force_style='FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=40',format=yuv420p`, 
          '-c:v', 'libx264',
          '-preset', 'ultrafast', '-threads', '1', '-crf', '30', '-pix_fmt', 'yuv420p',
          '-crf', '23',
          '-c:a', 'aac',
          '-movflags', '+faststart',
          'output.mp4'
        ];
      } else {
        const inputs = ['-i', 'input_aroll.mp4', ...processedBrolls.flatMap(b => ['-i', b.name])];
        let filterParts = `[0:v]${scale},subtitles=subs.srt:force_style='FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=40'[base]`;
        let prevLabel = 'base';
        
        for (let i = 0; i < brollFiles.length; i++) {
          const { clip } = brollFiles[i];
          const vLabel = `bv${i}`;
          const outLabel = `out${i}`;
          filterParts += `;[${i + 1}:v]copy[${vLabel}]`;
          filterParts += `;[${prevLabel}][${vLabel}]overlay=enable='between(t,${clip.startTime},${clip.endTime})'[${outLabel}]`;
          prevLabel = outLabel;
        }

        ffmpegArgs = [
          ...inputs,
          '-filter_complex', filterParts,
          '-map', `[${prevLabel}]`,
          '-map', '0:a',
          '-c:v', 'libx264',
          '-preset', 'ultrafast', '-threads', '1', '-crf', '30', '-pix_fmt', 'yuv420p',
          '-crf', '23',
          '-c:a', 'aac',
          '-movflags', '+faststart',
          'output.mp4'
        ];
      }

      addLog(`[Render] Запуск: ${brollFiles.length} B-Rolls`);
      const exitCode = await ffmpeg.exec(ffmpegArgs);
      if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode}`);
      setRenderProgress(98);

      const data = await ffmpeg.readFile('output.mp4');
      const videoBlob = new Blob([data as any], { type: 'video/mp4' });
      
      if (videoBlob.size < 1000) {
        addLog(`[Error] Результат пуст: ${videoBlob.size} байт`);
        throw new Error('Сборка завершилась ошибкой: получен пустой файл. Попробуйте изменить настройки или вернуться в студию.');
      }

      const videoUrl = URL.createObjectURL(videoBlob);
      
      setRenderProgress(100);
      setRenderStatus('Готово!');

      // Save success status and URL
      if (projectId) {
        await projectService.updateProject(projectId, { 
          status: 'completed',
          final_video_url: videoUrl // Note: this is a local blob, in real prod we'd upload it here
        });
      }

      setJob({
        id: 'local-render',
        status: 'completed',
        output_url: videoUrl,
        progress: 100
      } as any);

    } catch (err: any) {
      console.error('[Delivery] Client render failed:', err);
      setError(err.message || 'Ошибка рендера');
      if (projectId) {
        await projectService.updateProjectStatus(projectId, 'error');
      }
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
    addLog(`[Export] Выгрузка в ${target}...`);
    await new Promise(r => setTimeout(r, 1500));
    if (target === 'telegram') {
      window.open('https://t.me/ViralEngine_Bot', '_blank');
    } else {
      alert('Загрузка на Google Drive начата. Проверьте папку "ViralEngine/Exports"');
    }
    setIsExporting(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    async function loadResults() {
      if (jobId) {
        // ... existing job loading logic (kept for cloud compatibility if needed)
      }

      if (projectId) {
        try {
          const verData = await projectService.getLatestVersion(projectId);
          if (verData) {
            setVersion(verData);
            // AUTO-LAUNCH CLIENT-SIDE RENDER
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
  }, [jobId, projectId]);


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-mint-400" />
        <p className="text-sm text-white/40 uppercase tracking-widest font-black">Retrieving Artifacts...</p>
      </div>
    );
  }

  if (error || (job && job.status === 'failed')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="p-6 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 text-center space-y-4 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-black text-white uppercase tracking-tighter">Delivery Failed</h2>
          <p className="text-sm text-white/40">
            {error || job?.error_log || 'An unknown error occurred during the render process.'}
          </p>
          {renderLogs.length > 0 && (
            <div className="mt-4 p-3 bg-black/40 rounded-2xl border border-white/5 text-left space-y-1 overflow-hidden">
              <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Debug Terminal</div>
              {renderLogs.map((log, i) => (
                <div key={i} className="text-[9px] font-mono text-white/40 leading-tight">
                  <span className="text-purple-500/50 mr-1">$</span> {log}
                </div>
              ))}
            </div>
          )}
        </div>
        <button 
          onClick={() => { if (projectId) router.push(`/app/projects/${projectId}/studio?tab=assembly`); else router.back(); }}
          className="px-8 py-3 rounded-full bg-purple-500 border border-purple-400 text-white text-xs font-black uppercase tracking-widest hover:bg-purple-400 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
        >
          Back to Studio
        </button>
      </div>
    );
  }

  // Resolve script content from multiple possible manifest key locations

  const getProviderKey = (platform: string): 'instagram' | 'tiktok' | 'youtube' | null => {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) return 'instagram';
    if (p.includes('tiktok')) return 'tiktok';
    if (p.includes('youtube')) return 'youtube';
    return null;
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between py-2">
        <button 
          onClick={() => { if (projectId) router.push(`/app/projects/${projectId}/studio?tab=assembly`); else router.back(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          {locale === 'ru' ? 'В СТУДИЮ' : 'STUDIO'}
        </button>
        <div className="text-[10px] font-black text-white/20 tracking-[0.3em] uppercase">Delivery Lab</div>
      </div>

      {/* Status */}
      <StatusStepper currentStep={job?.status === 'completed' ? 'done' : 'processing'} />

      {/* Rendering / Success header */}
      <div
        className="rounded-3xl p-6 text-center space-y-4"
        style={{
          background: job?.status === 'completed' 
            ? 'linear-gradient(135deg, rgba(0,255,204,0.08) 0%, rgba(155,95,255,0.05) 100%)'
            : 'linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(59,130,246,0.05) 100%)',
          border: job?.status === 'completed'
            ? '1px solid rgba(0,255,204,0.15)'
            : '1px solid rgba(168,85,247,0.2)',
        }}
      >
        <div className={`text-5xl ${job?.status === 'completed' ? 'animate-float' : ''}`}>
          {job?.status === 'completed' ? '🎉' : '⚙️'}
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase text-white">
            {job?.status === 'completed' ? t('badge') : (renderStatus || 'Видео в процессе...')}
          </h1>
          <p className="text-[11px] text-white/40 mt-1">
            {job?.status === 'completed' ? t('statusSub') : `Пожалуйста, подождите. Прогресс: ${renderProgress}%`}
          </p>
        </div>

        {/* Loading Bar for processing */}
        {job?.status !== 'completed' && (
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${renderProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}

        {/* Delivery chips */}
        <div className="flex justify-center gap-2 flex-wrap">
          {[
            t('videoMp4'),
            t('textsCount', { n: 5 }),
            t('carouselSlides', { n: 8 })
          ].map((item) => (
            <span
              key={item}
              className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── Auto-launching state ── */}
      {!job && isLaunchingRender && (
        <div className="rounded-3xl p-8 bg-purple-500/5 border border-purple-500/20 text-center animate-pulse">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400">Initializing Engine...</p>
        </div>
      )}

      {/* Video preview card - Now using real output_url */}
      <div
        className="rounded-[2rem] overflow-hidden group shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #1a0a2e 0%, #0d0d1a 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          aspectRatio: '9/16', // Vertical video format
          maxHeight: '500px',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {job?.output_url ? (
          <video 
            src={job.output_url} 
            controls 
            className="w-full h-full object-cover"
            poster={version?.preview_url}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400 animate-pulse">
              Generating Final Cut...
            </p>
          </div>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-between pointer-events-none"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
            {t('videoMeta', { n: 65, category: locale === 'ru' ? 'Авто Эксперт' : 'Car Expert' })}
          </span>
          <div className="flex gap-2 pointer-events-auto">
            <a href={job?.output_url} download className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors">
              <Download className="w-4 h-4 text-white" />
            </a>
            <button className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors">
              <Share2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Text Outputs */}
      <div className="space-y-4 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 ml-1">
          {t('statusSub')}
        </p>
        <div className="space-y-3">
          {TEXT_OUTPUTS.map((output) => (
            <div
              key={output.platform}
              className="rounded-3xl p-5 space-y-4"
              style={{
                background: 'rgba(11,18,41,0.6)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{output.icon}</span>
                  <span
                    className="text-[11px] font-black uppercase tracking-widest"
                    style={{ color: output.accent }}
                  >
                    {output.platform}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: `${output.accent}15`,
                      border: `1px solid ${output.accent}25`,
                      color: output.accent,
                    }}
                    onClick={() => handleCopy(output.text)}
                  >
                    <Copy className="w-3 h-3" />
                    {t('copyBtn')}
                  </button>
                  
                  {/* Automated Posting Button */}
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80 active:scale-95"
                    style={{
                      background: output.accent,
                      color: '#000',
                    }}
                    onClick={() => {
                        const provider = getProviderKey(output.platform);
                        if (provider) {
                            window.location.href = socialService.getAuthUrl(provider);
                        } else {
                            handleCopy(output.text);
                        }
                    }}
                  >
                    <Share2 className="w-3 h-3" />
                    Connect & Post
                  </button>
                </div>
              </div>
              <p className="text-[12px] text-white/60 leading-relaxed font-medium">
                {output.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Carousel link */}
      <div
        className="rounded-3xl p-5 flex items-center justify-between"
        style={{
          background: 'rgba(155,95,255,0.08)',
          border: '1px solid rgba(155,95,255,0.2)',
        }}
      >
        <div className="flex items-center gap-4">
          <span className="text-3xl">🖼️</span>
          <div>
            <p className="text-sm font-black uppercase tracking-tight text-white/90">{t('instaCarousel')}</p>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{t('carouselMeta', { n: 8 })}</p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all bg-purple-500/20 hover:bg-purple-500/30">
          <Download className="w-5 h-5" style={{ color: '#9B5FFF' }} />
        </button>
      </div>

      {/* Open in Telegram */}
      <div
        className="flex items-center justify-between p-5 rounded-3xl"
        style={{
          background: 'rgba(77,158,255,0.08)',
          border: '1px solid rgba(77,158,255,0.2)',
        }}
      >
        <div className="flex items-center gap-4">
          <Send className="w-6 h-6" style={{ color: '#4D9EFF' }} />
          <div>
            <p className="text-sm font-black uppercase tracking-tight text-white/90">{t('openTg')}</p>
            <p className="text-[10px] font-bold text-white/30 tracking-widest uppercase">{t('botName')}</p>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest"
          style={{ background: 'rgba(0,255,204,0.15)', color: '#00FFCC', border: '1px solid rgba(0,255,204,0.2)' }}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          {t('delivered')}
        </div>
      </div>

      {/* Export Section */}
      <div className="pt-8 space-y-4">
        <button 
          onClick={() => downloadTXT()}
          className="w-full py-5 rounded-[2.5rem] bg-purple-600 text-white flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(168,85,247,0.4)] border border-purple-400 group transition-all hover:scale-[1.02] active:scale-95"
        >
          <Download size={20} className="group-hover:bounce" />
          <span className="font-black text-sm uppercase tracking-widest">ВЫГРУЗИТЬ (TXT + VIDEO)</span>
        </button>
        
        <div className="grid grid-cols-2 gap-3">
           <button 
             onClick={() => handleExport('telegram')}
             className="py-4 rounded-2xl bg-[#24A1DE]/10 border border-[#24A1DE]/20 text-[#24A1DE] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
           >
             <Send size={14} /> Telegram
           </button>
           <button 
             onClick={() => handleExport('drive')}
             className="py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
           >
             <HardDrive size={14} /> Google Drive
           </button>
        </div>
      </div>
    </div>
  );
}
