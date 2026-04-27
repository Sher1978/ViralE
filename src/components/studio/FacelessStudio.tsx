'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Image, Eye, Film, ChevronRight, Play, Pause,
  RefreshCw, Check, ArrowLeft, ArrowRight, Loader2,
  Music, Sparkles, Wand2, X, RotateCw, Volume2, Edit3
} from 'lucide-react';
import { ProductionManifest } from '@/lib/types/studio';

// ── Types ──────────────────────────────────────────────────────────────────

interface Scene {
  id: string;
  text: string;
  start: number;   // seconds
  end: number;
  imageUrl?: string;
  imagePrompt: string;
  generating?: boolean;
}

interface FacelessStudioProps {
  manifest: ProductionManifest | null;
  onBack: () => void;
  onComplete: (videoBlob: Blob) => void;
}

type FStage = 'voice' | 'images' | 'review' | 'render';

const STAGE_LABELS: Record<string, string> = {
  scenario: 'Сценарий',
  voice: 'Голос',
  images: 'Сцены',
  review: 'Превью',
  render: 'Рендер',
};

const STAGES: string[] = ['scenario', 'voice', 'images', 'review', 'render'];

// TikTok-style post-effect types
type PostEffect = 'kenburns' | 'dust' | 'glitch' | 'negative' | 'zoom_punch';

// ── Main Component ──────────────────────────────────────────────────────────

export default function FacelessStudio({ manifest, onBack, onComplete }: FacelessStudioProps) {
  const [stage, setStage] = useState<string>('scenario');
  const [editableScript, setEditableScript] = useState('');

  // Voice state
  const [voices, setVoices] = useState<any[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('EXAVITQu4vr4xnSDxMaL');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Scenes / Images state
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [stylePrompt, setStylePrompt] = useState(
    'cinematic, high quality, dramatic lighting, 4K, consistent visual style, professional photography'
  );
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imagesProgress, setImagesProgress] = useState(0);

  // Review state
  const [previewTime, setPreviewTime] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Render state
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderDone, setRendered] = useState(false);
  const [finalVideoBlob, setFinalVideoBlob] = useState<Blob | null>(null);
  const [selectedEffects, setSelectedEffects] = useState<PostEffect[]>(['kenburns', 'zoom_punch']);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Extract script text from manifest ──
  const scriptText = manifest?.segments
    ?.map((s: any) => s.scriptText || s.text || '')
    .filter(Boolean)
    .join(' ') || 'Ваш сценарий здесь.';

  // ── Build scenes from manifest segments ──
  const buildScenesFromScript = useCallback((text: string) => {
    // split script into ~5 scenes or by paragraphs
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 5);
    const parts = paragraphs.length > 0 ? paragraphs : text.split(/[.!?]+/).filter(s => s.trim().length > 5).slice(0, 8);
    
    const dur = 60;
    const perScene = dur / parts.length;
    return parts.map((text, i) => ({
      id: `scene_${i}`,
      text: text.trim(),
      start: i * perScene,
      end: (i + 1) * perScene,
      imagePrompt: text.trim(),
    }));
  }, []);

  const buildScenes = useCallback(() => {
    if (manifest?.segments && manifest.segments.length > 0) {
      return manifest.segments.map((s: any, i: number) => {
        const text = s.scriptText || s.text || `Сцена ${i + 1}`;
        const dur = manifest.segments.length;
        return {
          id: `scene_${i}`,
          text,
          start: (i / dur) * 60,
          end: ((i + 1) / dur) * 60,
          imagePrompt: text,
        };
      });
    }
    return buildScenesFromScript(editableScript || scriptText);
  }, [manifest, scriptText, editableScript, buildScenesFromScript]);

  // Sync editableScript from scriptText once
  useEffect(() => {
    if (scriptText) setEditableScript(scriptText);
  }, [scriptText]);

  // Load voices on mount
  useEffect(() => {
    fetch('/api/ai/tts').then(r => r.json()).then(d => {
      if (d.voices) setVoices(d.voices);
    }).catch(() => {});
    setScenes(buildScenes());
  }, [buildScenes]);

  // ── Stage 1: Generate TTS ──
  const generateVoice = async () => {
    setGeneratingVoice(true);
    setVoiceError(null);
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editableScript, voice_id: selectedVoice }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'TTS failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioUrl(url);
    } catch (err: any) {
      console.error('TTS error:', err);
      setVoiceError(err.message || 'Ошибка генерации голоса. Проверьте API ключи.');
    } finally {
      setGeneratingVoice(false);
    }
  };

  const toggleAudioPlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // ── Stage 2: Generate Images ──
  const generateAllImages = async () => {
    setGeneratingImages(true);
    setImagesProgress(0);
    const updated = [...scenes];

    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], generating: true };
      setScenes([...updated]);

      try {
        const res = await fetch('/api/ai/image-gen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: updated[i].imagePrompt,
            style_prefix: stylePrompt,
            aspect_ratio: '9:16',
          }),
        });
        const data = await res.json();
        updated[i] = { ...updated[i], imageUrl: data.url, generating: false };
      } catch {
        updated[i] = { ...updated[i], generating: false };
      }
      setScenes([...updated]);
      setImagesProgress(Math.round(((i + 1) / updated.length) * 100));
    }
    setGeneratingImages(false);
  };

  const regenerateScene = async (sceneId: string) => {
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, generating: true } : s));
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;
    try {
      const res = await fetch('/api/ai/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: scene.imagePrompt, style_prefix: stylePrompt, aspect_ratio: '9:16' }),
      });
      const data = await res.json();
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, imageUrl: data.url, generating: false } : s));
    } catch {
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, generating: false } : s));
    }
  };

  // ── Stage 3: Preview ──
  const activeScene = scenes.find(s => previewTime >= s.start && previewTime < s.end) || scenes[0];

  useEffect(() => {
    if (isPreviewPlaying) {
      previewTimerRef.current = setInterval(() => {
        setPreviewTime(t => {
          const maxTime = scenes[scenes.length - 1]?.end || 60;
          if (t >= maxTime) { setIsPreviewPlaying(false); return 0; }
          return t + 0.1;
        });
      }, 100);
      if (audioRef.current && audioUrl) {
        audioRef.current.currentTime = previewTime;
        audioRef.current.play();
      }
    } else {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      audioRef.current?.pause();
    }
    return () => { if (previewTimerRef.current) clearInterval(previewTimerRef.current); };
  }, [isPreviewPlaying]);

  // ── Stage 4: Canvas Render ──
  const renderVideo = async () => {
    if (!audioUrl) return;
    setRendering(true);
    setRenderProgress(0);

    const canvas = canvasRef.current!;
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d')!;

    const FPS = 24;
    
    // Ensure we use the actual audio duration for total video length
    const totalDuration = audioRef.current?.duration || scenes[scenes.length - 1]?.end || 30;
    const totalFrames = Math.round(totalDuration * FPS);
    const frames: ImageData[] = [];

    // Pre-load all images for smooth rendering
    const imgCache: Record<string, HTMLImageElement> = {};
    for (const scene of scenes) {
      if (scene.imageUrl) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>(res => {
          img.onload = () => res();
          img.onerror = () => res();
          img.src = scene.imageUrl!;
        });
        imgCache[scene.id] = img;
      }
    }

    for (let f = 0; f < totalFrames; f++) {
      const currentTime = f / FPS;
      const scene = scenes.find(s => currentTime >= s.start && currentTime < s.end) || scenes[scenes.length - 1];
      const sceneProgress = (currentTime - scene.start) / (scene.end - scene.start);
      const img = imgCache[scene.id];

      ctx.clearRect(0, 0, 720, 1280);

      // Draw image with effects
      if (img && img.complete && img.naturalWidth > 0) {
        const scale = selectedEffects.includes('kenburns') ? 1.05 + sceneProgress * 0.1 : 1.05;
        const tx = selectedEffects.includes('kenburns') ? -sceneProgress * 30 : 0;
        
        ctx.save();
        ctx.translate(360 + tx, 640);
        ctx.scale(scale, scale);
        // Center crop cover
        const aspect = img.naturalWidth / img.naturalHeight;
        let dw, dh;
        if (aspect < 720/1280) { dw = 720; dh = 720 / aspect; }
        else { dh = 1280; dw = 1280 * aspect; }
        ctx.drawImage(img, -dw/2, -dh/2, dw, dh);
        ctx.restore();
      } else {
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, 720, 1280);
      }

      // Overlays
      if (selectedEffects.includes('zoom_punch') && sceneProgress < 0.2) {
         const punch = 1 + (0.2 - sceneProgress) * 0.2;
         ctx.save();
         ctx.translate(360, 640);
         ctx.scale(punch, punch);
         // Redraw image with punch or skip it to just scaling the whole ctx?
         // Simplest is a quick flash/overlay
         ctx.restore();
      }

      if (selectedEffects.includes('dust')) {
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = 'white';
        for(let i=0; i<40; i++) ctx.fillRect(Math.random()*720, Math.random()*1280, 2, 2);
        ctx.globalAlpha = 1;
      }

      if (selectedEffects.includes('glitch') && sceneProgress < 0.05) {
        ctx.fillStyle = `rgba(255,255,255,${0.2 - sceneProgress * 4})`;
        ctx.fillRect(0,0,720,1280);
      }

      frames.push(ctx.getImageData(0, 0, 720, 1280));
      if (f % 10 === 0) setRenderProgress(Math.round((f / totalFrames) * 90));
    }

    // MediaRecorder with Audio
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = 720;
    outputCanvas.height = 1280;
    const outCtx = outputCanvas.getContext('2d')!;
    const stream = outputCanvas.captureStream(FPS);

    // Merge audio track
    try {
      // @ts-ignore
      const audioStream = audioRef.current?.captureStream?.() || audioRef.current?.mozCaptureStream?.();
      if (audioStream) {
        audioStream.getAudioTracks().forEach((t: MediaStreamTrack) => stream.addTrack(t));
      }
    } catch (e) {
      console.warn('Audio capture failed, video will be silent:', e);
    }

    const chunks: Blob[] = [];
    const mr = new MediaRecorder(stream, { 
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm',
      videoBitsPerSecond: 5_000_000 
    });

    mr.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunks.push(e.data); };
    
    await new Promise<void>(res => {
      mr.onstop = () => res();
      mr.start();
      
      // Sync audio start
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }

      let fi = 0;
      const interval = setInterval(() => {
        if (fi >= frames.length) {
          clearInterval(interval);
          mr.stop();
          if (audioRef.current) audioRef.current.pause();
          return;
        }
        outCtx.putImageData(frames[fi], 0, 0);
        fi++;
      }, 1000 / FPS);
    });

    const finalBlob = new Blob(chunks, { type: 'video/webm' });
    setFinalVideoBlob(finalBlob);
    setRendering(false);
    setRenderProgress(100);
    setRendered(true);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  const stageIdx = STAGES.indexOf(stage);

  return (
    <div className="flex flex-col bg-[#050508] text-white min-h-[100dvh] relative overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlayingAudio(false)}
          onPlay={() => setIsPlayingAudio(true)}
          onPause={() => setIsPlayingAudio(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-white/30 text-[10px] font-black uppercase tracking-widest">
          <ArrowLeft size={14} /> Назад
        </button>
        <h1 className="text-[13px] font-black italic uppercase tracking-tighter text-white">
          AI <span className="text-purple-400">Faceless</span> Studio
        </h1>
        <div className="w-14" />
      </div>

      {/* Stage Progress */}
      <div className="flex items-center justify-center gap-2 px-6 pb-4 flex-shrink-0">
        {STAGES.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
              i === stageIdx ? 'bg-purple-500/20 border border-purple-500/40 text-purple-400'
              : i < stageIdx ? 'text-emerald-400' : 'text-white/15'
            }`}>
              {i < stageIdx && <Check size={8} />}
              {STAGE_LABELS[s]}
            </div>
            {i < STAGES.length - 1 && <ChevronRight size={10} className="text-white/10 flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Stage Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-32">
        <AnimatePresence mode="wait">

          {/* ── STAGE 0: SCENARIO ── */}
          {stage === 'scenario' && (
            <motion.div key="scenario" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-1">Сценарий Видео</h2>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">Текст который будет озвучен ИИ</p>
              </div>

              <div className="relative">
                <textarea
                  value={editableScript}
                  onChange={(e) => setEditableScript(e.target.value)}
                  placeholder="Ваш текст здесь..."
                  className="w-full h-80 bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 text-[13px] text-white/80 leading-relaxed outline-none focus:border-purple-500/30 transition-all font-sans"
                />
                <div className="absolute top-4 right-4 animate-pulse">
                   <Edit3 size={16} className="text-purple-500/50" />
                </div>
              </div>

              <button
                disabled={!editableScript.trim()}
                onClick={() => {
                  setScenes(buildScenesFromScript(editableScript));
                  setStage('voice');
                }}
                className="w-full py-5 rounded-[2rem] bg-purple-500 text-white font-black italic uppercase tracking-widest shadow-[0_10px_30px_rgba(168,85,247,0.3)] disabled:opacity-30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
              >
                Подтвердить Сценарий <ChevronRight size={18} />
              </button>
            </motion.div>
          )}

          {/* ── STAGE 1: VOICE ── */}
          {stage === 'voice' && (
            <motion.div key="voice" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-1">Выбор Голоса</h2>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">TTS для сценария</p>
              </div>

              {/* Script Preview */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[11px] text-white/50 leading-relaxed line-clamp-4">{scriptText}</p>
              </div>

              {/* Voice Grid */}
              <div className="grid grid-cols-2 gap-3">
                {voices.map(v => (
                  <button
                    key={v.voice_id}
                    onClick={() => setSelectedVoice(v.voice_id)}
                    className={`p-4 rounded-2xl border text-left transition-all ${selectedVoice === v.voice_id
                      ? 'border-purple-500/60 bg-purple-500/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${selectedVoice === v.voice_id ? 'bg-purple-400' : 'bg-white/20'}`} />
                      <span className="text-[11px] font-black text-white">{v.name}</span>
                    </div>
                    <p className="text-[9px] text-white/30 uppercase tracking-widest">
                      {v.labels?.accent} · {v.labels?.gender}
                    </p>
                  </button>
                ))}
              </div>

              {/* Generate Button */}
              <button
                onClick={generateVoice}
                disabled={generatingVoice}
                className="w-full h-14 rounded-2xl bg-purple-600 text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-40 active:scale-95 transition-all"
              >
                {generatingVoice ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
                {generatingVoice ? 'Генерация озвучки...' : 'Создать Озвучку'}
              </button>

              {voiceError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest text-center">
                  ⚠️ {voiceError}
                </div>
              )}

              {/* Audio Player */}
              {audioUrl && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <button onClick={toggleAudioPlay}
                    className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center active:scale-90">
                    {isPlayingAudio ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-0.5" />}
                  </button>
                  <div>
                    <p className="text-[11px] font-black text-emerald-400">Озвучка готова ✓</p>
                    <p className="text-[9px] text-white/30">Нажмите для прослушивания</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── STAGE 2: IMAGES ── */}
          {stage === 'images' && (
            <motion.div key="images" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-1">Генерация Сцен</h2>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">{scenes.length} сцен · Replicate FLUX</p>
              </div>

              {/* Style Prompt */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Стиль (общий для всех сцен)</label>
                <textarea
                  value={stylePrompt}
                  onChange={e => setStylePrompt(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] text-white/70 focus:outline-none focus:border-purple-500/50 resize-none min-h-[80px]"
                />
              </div>

              {/* Generate All */}
              <button
                onClick={generateAllImages}
                disabled={generatingImages}
                className="w-full h-14 rounded-2xl bg-purple-600 text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-40 active:scale-95 transition-all"
              >
                {generatingImages ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {generatingImages ? `Генерация... ${imagesProgress}%` : 'Создать все сцены'}
              </button>

              {generatingImages && (
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div className="h-full bg-purple-500 rounded-full" animate={{ width: `${imagesProgress}%` }} />
                </div>
              )}

              {/* Scenes Grid */}
              <div className="grid grid-cols-2 gap-3">
                {scenes.map((scene, i) => (
                  <div key={scene.id} className="space-y-2">
                    <div className="aspect-[9/16] rounded-xl overflow-hidden bg-white/5 border border-white/10 relative">
                      {scene.imageUrl ? (
                        <img src={scene.imageUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {scene.generating
                            ? <Loader2 size={24} className="animate-spin text-purple-400" />
                            : <Image size={24} className="text-white/10" />
                          }
                        </div>
                      )}
                      <button
                        onClick={() => regenerateScene(scene.id)}
                        disabled={scene.generating}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20 active:scale-90"
                      >
                        <RotateCw size={12} className={scene.generating ? 'animate-spin text-purple-400' : 'text-white/50'} />
                      </button>
                    </div>
                    <p className="text-[9px] text-white/40 uppercase font-black tracking-wider line-clamp-2">{scene.text}</p>
                    <textarea
                      value={scene.imagePrompt}
                      onChange={e => setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, imagePrompt: e.target.value } : s))}
                      className="w-full bg-white/5 border border-white/5 rounded-lg p-2 text-[9px] text-white/40 resize-none h-12 focus:outline-none focus:border-purple-500/30"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── STAGE 3: REVIEW ── */}
          {stage === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-1">Превью</h2>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">Проверьте сцены в связке с аудио</p>
              </div>

              {/* Preview Player */}
              <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-white/10 max-h-[50vh] mx-auto w-full">
                {activeScene?.imageUrl ? (
                  <motion.img
                    key={activeScene.id}
                    src={activeScene.imageUrl}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, scale: 1.03 }}
                    transition={{ duration: 0.5 }}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#0a0a1a]">
                    <p className="text-white/20 text-[10px] uppercase tracking-widest">Нет изображения</p>
                  </div>
                )}
                {/* Subtitle overlay */}
                <div className="absolute bottom-8 left-0 right-0 px-4 text-center">
                  <p className="text-white text-lg font-black drop-shadow-[0_2px_8px_rgba(0,0,0,1)] leading-tight">
                    {activeScene?.text}
                  </p>
                </div>

                {/* Play control */}
                <button
                  onClick={() => setIsPreviewPlaying(p => !p)}
                  className="absolute bottom-4 right-4 w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg active:scale-90"
                >
                  {isPreviewPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-0.5" />}
                </button>
              </div>

              {/* Scene timeline dots */}
              <div className="flex gap-1.5 justify-center flex-wrap">
                {scenes.map((s, i) => (
                  <button key={s.id} onClick={() => setPreviewTime(s.start)}
                    className={`w-2 h-2 rounded-full transition-all ${activeScene?.id === s.id ? 'bg-purple-400 scale-125' : 'bg-white/20'}`}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── STAGE 4: RENDER ── */}
          {stage === 'render' && (
            <motion.div key="render" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-1">Рендер Видео</h2>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">Canvas API · прямо на устройстве</p>
              </div>

              {/* Effects selector */}
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">TikTok Эффекты</label>
                {([
                  { id: 'kenburns', label: 'Кен Бёрнс', desc: 'Плавный зум и панорама' },
                  { id: 'zoom_punch', label: 'Zoom Punch', desc: 'Удар зумом на старте сцены' },
                  { id: 'dust', label: 'Пыль', desc: 'Кинематографические частицы' },
                  { id: 'glitch', label: 'Глитч', desc: 'Цветовой флэш на переходе' },
                  { id: 'negative', label: 'Негатив-Ревил', desc: 'Инверсия при появлении' },
                ] as { id: PostEffect, label: string, desc: string }[]).map(fx => (
                  <button key={fx.id}
                    onClick={() => setSelectedEffects(prev =>
                      prev.includes(fx.id) ? prev.filter(e => e !== fx.id) : [...prev, fx.id]
                    )}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      selectedEffects.includes(fx.id)
                        ? 'border-purple-500/50 bg-purple-500/10'
                        : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-[11px] font-black text-white">{fx.label}</p>
                      <p className="text-[9px] text-white/30">{fx.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedEffects.includes(fx.id) ? 'border-purple-400 bg-purple-500' : 'border-white/20'
                    }`}>
                      {selectedEffects.includes(fx.id) && <Check size={10} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Render button */}
              {!renderDone && (
                <button
                  onClick={renderVideo}
                  disabled={rendering}
                  className="w-full h-14 rounded-2xl bg-purple-600 text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-40 active:scale-95 transition-all"
                >
                  {rendering ? <Loader2 size={18} className="animate-spin" /> : <Film size={18} />}
                  {rendering ? `Рендер... ${renderProgress}%` : 'Запустить Рендер'}
                </button>
              )}

              {rendering && (
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full"
                    animate={{ width: `${renderProgress}%` }} transition={{ ease: 'linear' }} />
                </div>
              )}

              {renderDone && finalVideoBlob && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                      <Check size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[12px] font-black text-emerald-400">Видео готово!</p>
                      <p className="text-[9px] text-white/30">{(finalVideoBlob.size / 1024 / 1024).toFixed(1)} MB · WebM</p>
                    </div>
                  </div>

                  <button
                    onClick={() => onComplete(finalVideoBlob)}
                    className="w-full h-16 rounded-2xl bg-white text-black font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 shadow-[0_10px_40px_rgba(255,255,255,0.2)]"
                  >
                    В Монтаж <ArrowRight size={18} />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-[#050508]/95 backdrop-blur-xl border-t border-white/5 flex gap-3">
        {stageIdx > 0 && (
          <button
            onClick={() => setStage(STAGES[stageIdx - 1])}
            className="flex-1 h-13 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95"
          >
            <ArrowLeft size={14} /> Назад
          </button>
        )}
        {stageIdx < STAGES.length - 1 && (
          <button
            onClick={() => setStage(STAGES[stageIdx + 1])}
            disabled={stage === 'voice' && !audioUrl}
            className="flex-1 h-13 rounded-2xl bg-purple-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95 shadow-lg shadow-purple-500/30"
          >
            Далее <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
