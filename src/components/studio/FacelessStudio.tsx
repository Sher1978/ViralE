'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Image as ImageIcon, Eye, Film, ChevronRight, Play, Pause,
  RefreshCw, Check, ArrowLeft, ArrowRight, Loader2,
  Music, Sparkles, Wand2, X, RotateCw, Volume2, Edit3, Brain,
  Layers, Clock, MessageSquare, History, Type, Trash2, Maximize2
} from 'lucide-react';
import { useLocale } from 'next-intl';
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
  onComplete: (videoBlob: Blob, transcript?: any[]) => void;
  onJumpToConcept?: () => void;
}

// TikTok-style post-effect types
type PostEffect = 'kenburns' | 'dust' | 'glitch' | 'negative' | 'zoom_punch';

// ── Main Component ──────────────────────────────────────────────────────────

export default function FacelessStudio({ manifest, onBack, onComplete, onJumpToConcept }: FacelessStudioProps) {
  const locale = useLocale();
  const [editableScript, setEditableScript] = useState('');
  
  // App State
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [activeStage, setActiveStage] = useState<'setup' | 'editor' | 'rendering'>('setup');

  // Voice state
  const [voices, setVoices] = useState<any[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('EXAVITQu4vr4xnSDxMaL');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Editor State
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [stylePrompt, setStylePrompt] = useState(
    'cinematic, high quality, dramatic lighting, 4K, consistent visual style, professional photography'
  );
  
  // Subtitles / Transcript (approximate for pre-render)
  const [transcript, setTranscript] = useState<any[]>([]);

  // Generation State
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imagesProgress, setImagesProgress] = useState(0);

  // Render state
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderDone, setRendered] = useState(false);
  const [finalVideoBlob, setFinalVideoBlob] = useState<Blob | null>(null);
  const [selectedEffects, setSelectedEffects] = useState<PostEffect[]>(['kenburns', 'zoom_punch']);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // ── Helpers ──
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // ── Extract script text from manifest ──
  const scriptText = manifest?.segments
    ?.map((s: any) => s.scriptText || s.text || '')
    .filter(Boolean)
    .join(' ') || 'Ваш сценарий здесь.';

  // ── Build scenes from manifest segments ──
  const buildScenesFromScript = useCallback((text: string, totalDur: number = 30) => {
    // split script into ~5-8 scenes by paragraphs/sentences
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 5);
    const parts = paragraphs.length > 0 ? paragraphs : text.split(/[.!?]+/).filter(s => s.trim().length > 5);
    
    const limitedParts = parts.slice(0, 10); // Don't overwhelm
    const perScene = totalDur / limitedParts.length;
    
    return limitedParts.map((t, i) => ({
      id: `scene_${i}_${Date.now()}`,
      text: t.trim(),
      start: i * perScene,
      end: (i + 1) * perScene,
      imagePrompt: t.trim(),
    }));
  }, []);

  // Initial Sync
  useEffect(() => {
    if (scriptText) setEditableScript(scriptText);
  }, [scriptText]);

  // Load voices
  useEffect(() => {
    fetch('/api/ai/tts').then(r => r.json()).then(d => {
      if (d.voices) setVoices(d.voices);
    }).catch(() => {});
  }, []);

  // ── Stage 1: Generate Voice ──
  const startProduction = async () => {
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
      
      // Determine duration from generated audio (approx estimate until metadata loads)
      // ElevenLabs average is ~15 chars per second
      const estimatedDur = Math.max(10, Math.min(60, editableScript.length / 15));
      setDuration(estimatedDur);
      
      const newScenes = buildScenesFromScript(editableScript, estimatedDur);
      setScenes(newScenes);
      setTranscript(newScenes.map(s => ({ text: s.text, start: s.start, end: s.end })));
      
      setActiveStage('editor');
      setIsSystemReady(true);
    } catch (err: any) {
      console.error('TTS error:', err);
      setVoiceError(err.message || 'Ошибка генерации голоса.');
    } finally {
      setGeneratingVoice(false);
    }
  };

  // ── Stage 2: Generate All Images ──
  const generateAllImages = async () => {
    setGeneratingImages(true);
    setImagesProgress(0);
    const updated = [...scenes];

    for (let i = 0; i < updated.length; i++) {
        if (updated[i].imageUrl) continue; // Skip already generated
        
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
            if (res.ok) {
                updated[i] = { ...updated[i], imageUrl: data.url, generating: false };
            } else {
                updated[i] = { ...updated[i], generating: false };
            }
        } catch {
            updated[i] = { ...updated[i], generating: false };
        }
        setScenes([...updated]);
        setImagesProgress(Math.round(((i + 1) / updated.length) * 100));
    }
    setGeneratingImages(false);
  };

  const regenerateScene = async (sceneId: string) => {
    const sceneIdx = scenes.findIndex(s => s.id === sceneId);
    if (sceneIdx === -1) return;
    
    const updated = [...scenes];
    updated[sceneIdx] = { ...updated[sceneIdx], generating: true };
    setScenes(updated);
    
    try {
      const res = await fetch('/api/ai/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            prompt: updated[sceneIdx].imagePrompt, 
            style_prefix: stylePrompt, 
            aspect_ratio: '9:16' 
        }),
      });
      const data = await res.json();
      if (res.ok) {
          updated[sceneIdx] = { ...updated[sceneIdx], imageUrl: data.url, generating: false };
      } else {
          updated[sceneIdx] = { ...updated[sceneIdx], generating: false };
      }
      setScenes([...updated]);
    } catch {
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, generating: false } : s));
    }
  };

  // ── Sync Video Audio ──
  useEffect(() => {
    const v = audioRef.current;
    if (!v || !audioUrl) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onLoad = () => {
        if (v.duration && !isNaN(v.duration) && v.duration !== Infinity) {
            setDuration(v.duration);
        }
    };
    const onEnd = () => setIsPlayingAudio(false);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onLoad);
    v.addEventListener('ended', onEnd);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onLoad);
      v.removeEventListener('ended', onEnd);
    };
  }, [audioUrl]);

  // ── Active Item Logic ──
  const activeScene = useMemo(() => {
    return scenes.find(s => currentTime >= s.start && currentTime < s.end) || scenes[scenes.length - 1];
  }, [scenes, currentTime]);

  const selectedScene = useMemo(() => {
    return scenes.find(s => s.id === selectedSceneId) || null;
  }, [scenes, selectedSceneId]);

  // ── Render Video Logic (Canvas) ──
  const startVideoRender = async () => {
    setRendering(true);
    setActiveStage('rendering');
    setRenderProgress(0);

    const canvas = canvasRef.current!;
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d')!;
    const FPS = 24;
    const totalFrames = Math.round(duration * FPS);
    const frames: ImageData[] = [];

    // Pre-load Cache
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
      const time = f / FPS;
      const scene = scenes.find(s => time >= s.start && time < s.end) || scenes[scenes.length-1];
      const prog = (time - scene.start) / (scene.end - scene.start);
      const img = imgCache[scene.id];

      ctx.clearRect(0, 0, 720, 1280);
      if (img && img.complete) {
        const scale = selectedEffects.includes('kenburns') ? 1.05 + prog * 0.1 : 1.05;
        const tx = selectedEffects.includes('kenburns') ? -prog * 30 : 0;
        ctx.save();
        ctx.translate(360 + tx, 640);
        ctx.scale(scale, scale);
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

      // Micro-effects like Zoom Punch or Dust
      if (selectedEffects.includes('zoom_punch') && prog < 0.15) {
          const punch = 1 + (0.15 - prog) * 0.3;
          ctx.save();
          ctx.translate(360, 640); ctx.scale(punch, punch);
          ctx.restore();
      }

      frames.push(ctx.getImageData(0, 0, 720, 1280));
      if (f % 10 === 0) setRenderProgress(Math.round((f / totalFrames) * 90));
    }

    // MediaRecorder
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = 720; outputCanvas.height = 1280;
    const outCtx = outputCanvas.getContext('2d')!;
    const stream = outputCanvas.captureStream(FPS);

    // Audio Sync
    if (audioRef.current) {
        // @ts-ignore
        const audioStream = audioRef.current?.captureStream?.() || audioRef.current?.mozCaptureStream?.();
        if (audioStream) audioStream.getAudioTracks().forEach((t: any) => stream.addTrack(t));
    }

    const chunks: Blob[] = [];
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    
    await new Promise<void>(res => {
      mr.onstop = () => res();
      mr.start();
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); }
      let fi = 0;
      const t = setInterval(() => {
        if (fi >= frames.length) { clearInterval(t); mr.stop(); return; }
        outCtx.putImageData(frames[fi], 0, 0);
        fi++;
      }, 1000 / FPS);
    });

    const blob = new Blob(chunks, { type: 'video/webm' });
    setFinalVideoBlob(blob);
    setRendering(false);
    setRenderProgress(100);
    setRendered(true);
  };

  // ── Timeline Utils ──
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    setCurrentTime(Math.max(0, Math.min(time, duration)));
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-[#050508] text-white h-screen relative overflow-hidden font-sans">
      <canvas ref={canvasRef} className="hidden" />
      {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" />}

      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-white/5 bg-[#08080c] z-50">
        <button onClick={onBack} className="flex items-center gap-2 text-white/30 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">
          <ArrowLeft size={14} /> Назад
        </button>
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                <Brain size={18} />
            </div>
            <h1 className="text-[13px] font-black italic uppercase tracking-tighter text-white">
                Faceless <span className="text-purple-400">Engine</span>
            </h1>
        </div>
        <div className="flex items-center gap-4">
             {activeStage === 'editor' && !rendering && (
                 <button 
                  onClick={startVideoRender}
                  className="px-6 py-2.5 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 transition-all flex items-center gap-2 shadow-[0_10px_20px_rgba(255,255,255,0.1)]"
                 >
                    Собрать A-Roll <ChevronRight size={14} />
                 </button>
             )}
             <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center overflow-hidden bg-white/5">
                <div className="w-full h-full bg-gradient-to-br from-purple-500/40 to-pink-500/40" />
             </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT: Sidebar / Setup or Inspector */}
        <div className="w-80 border-r border-white/5 bg-[#07070a] flex flex-col p-6 overflow-y-auto">
            <AnimatePresence mode="wait">
                {activeStage === 'setup' && (
                    <motion.div key="setup" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                        <section>
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-4 block">Сценарий Видео</label>
                            <textarea 
                                value={editableScript}
                                onChange={e => setEditableScript(e.target.value)}
                                className="w-full h-64 bg-white/5 border border-white/10 rounded-3xl p-5 text-[12px] text-white/70 focus:border-purple-500/50 transition-all resize-none outline-none leading-relaxed"
                                placeholder="..."
                            />
                        </section>

                        <section>
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-4 block">Голос Озвучки</label>
                            <div className="grid grid-cols-2 gap-2">
                                {voices.slice(0, 4).map(v => (
                                    <button 
                                        key={v.voice_id}
                                        onClick={() => setSelectedVoice(v.voice_id)}
                                        className={`p-3 rounded-2xl border text-left transition-all ${selectedVoice === v.voice_id ? 'border-purple-500/60 bg-purple-500/10' : 'border-white/5 bg-white/5'}`}
                                    >
                                        <p className="text-[10px] font-black">{v.name}</p>
                                        <p className="text-[8px] text-white/30 uppercase">{v.labels?.accent}</p>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <button 
                            onClick={startProduction}
                            disabled={generatingVoice || !editableScript}
                            className="w-full py-5 rounded-[2rem] bg-purple-600 text-white font-black italic uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                        >
                            {generatingVoice ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
                            Начать Генерацию
                        </button>
                        
                        {voiceError && <p className="text-red-400 text-[10px] font-black uppercase">{voiceError}</p>}
                    </motion.div>
                )}

                {activeStage === 'editor' && (
                    <motion.div key="editor" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                        <div className="p-4 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ImageIcon size={20} className="text-purple-400" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-tight">AI Генератор</p>
                                    <p className="text-[8px] text-white/40 uppercase">Все кадры готовы?</p>
                                </div>
                            </div>
                            <button 
                                onClick={generateAllImages} 
                                disabled={generatingImages}
                                className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-30"
                            >
                                {generatingImages ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}
                            </button>
                        </div>

                        {selectedScene ? (
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <Edit3 size={14} className="text-purple-400" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Промпт Сцены</p>
                                </div>
                                <textarea 
                                    value={selectedScene.imagePrompt}
                                    onChange={e => setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, imagePrompt: e.target.value } : s))}
                                    className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] text-white/60 focus:border-purple-500/40 outline-none leading-relaxed"
                                />
                                <button 
                                    onClick={() => regenerateScene(selectedScene.id)}
                                    disabled={selectedScene.generating}
                                    className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {selectedScene.generating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                    Перегенерировать
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-20">
                                <div className="w-12 h-12 rounded-full border-2 border-dashed border-white flex items-center justify-center">
                                    <Layers size={20} />
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-widest">Выберите блок на таймлайне</p>
                            </div>
                        )}

                        <div className="pt-6 border-t border-white/5 space-y-4">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Эффекты TikTok</label>
                            <div className="space-y-2">
                                {(['kenburns', 'zoom_punch', 'glitch'] as PostEffect[]).map(fx => (
                                    <button 
                                        key={fx} 
                                        onClick={() => setSelectedEffects(p => p.includes(fx) ? p.filter(f => f !== fx) : [...p, fx])}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-[10px] uppercase font-black tracking-tight transition-all ${selectedEffects.includes(fx) ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/5 text-white/30'}`}
                                    >
                                        {fx} {selectedEffects.includes(fx) && <Check size={12} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* CENTER: Preview & Timeline */}
        <div className="flex-1 flex flex-col relative bg-[#050508]">
            
            {/* STAGE AREA: Preview */}
            <div className="flex-1 relative flex items-center justify-center p-8 bg-black/40">
                <div className="relative aspect-[9/16] h-full max-h-[75vh] rounded-[2rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5 group">
                    {/* Visual Layer */}
                    {activeScene?.imageUrl ? (
                        <motion.img 
                            key={activeScene.id}
                            initial={{ scale: 1.1, opacity: 0 }}
                            animate={{ scale: 1.02, opacity: 1 }}
                            src={activeScene.imageUrl}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-[#0a0a0f] flex flex-col items-center justify-center space-y-4">
                            {activeScene?.generating ? (
                                <div className="space-y-4 flex flex-col items-center">
                                    <Loader2 className="animate-spin text-purple-400" size={32} />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-400/50">Рисую кадр...</p>
                                </div>
                            ) : (
                                <ImageIcon className="text-white/5" size={48} />
                            )}
                        </div>
                    )}

                    {/* Subtitle Overlay (Manual preview) */}
                    <div className="absolute top-1/2 left-0 right-0 px-8 text-center pointer-events-none">
                         <p className="text-white text-2xl font-black italic uppercase leading-tight drop-shadow-[0_2px_15px_rgba(0,0,0,1)]">
                            {activeScene?.text}
                         </p>
                    </div>

                    {/* Glass Player UI */}
                    <div className="absolute inset-x-4 bottom-6 h-16 rounded-3xl bg-black/40 backdrop-blur-3xl border border-white/10 flex items-center justify-between px-6 opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <button 
                            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                            className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
                        >
                            {isPlayingAudio ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-1" />}
                        </button>
                        <div className="flex-1 mx-6 h-1 rounded-full bg-white/10 relative overflow-hidden">
                             <div className="absolute top-0 left-0 h-full bg-purple-400" style={{ width: `${(currentTime / duration) * 100}%` }} />
                        </div>
                        <p className="text-[10px] font-black text-white/40">{Math.floor(currentTime)}s / {Math.floor(duration)}s</p>
                    </div>
                </div>
            </div>

            {/* TIMELINE AREA */}
            <div className="h-64 bg-[#08080c] border-t border-white/5 flex flex-col overflow-hidden">
                {/* Timeline Header */}
                <div className="px-6 py-3 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase text-purple-400 tracking-widest">
                            <Clock size={12} /> Timeline
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                             {scenes.length} Scenes · CLIP: A-ROLL
                        </div>
                    </div>
                    {generatingImages && (
                        <div className="flex items-center gap-3">
                             <p className="text-[9px] font-black text-white/50 uppercase">Генерация: {imagesProgress}%</p>
                             <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div animate={{ width: `${imagesProgress}%` }} className="h-full bg-purple-500" />
                             </div>
                        </div>
                    )}
                </div>

                {/* Timeline Tracks */}
                <div 
                    ref={timelineRef}
                    className="flex-1 relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] select-none"
                    onClick={handleTimelineClick}
                >
                    {/* Time Scale Brushes */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
                         {Array.from({ length: 20 }).map((_, i) => (
                             <div key={i} className="absolute top-0 bottom-0 border-r border-white" style={{ left: `${(i/20)*100}%` }} />
                         ))}
                    </div>

                    {/* Current Time Needle */}
                    <div className="absolute top-0 bottom-0 w-px bg-white z-40" style={{ left: `${(currentTime/duration)*100}%` }}>
                        <div className="w-2.5 h-2.5 rounded-full bg-white absolute -top-1 -left-1 shadow-[0_0_10px_white]" />
                    </div>

                    <div className="p-4 space-y-2 h-full flex flex-col justify-center">
                        {/* Track 1: Scenes (Images) */}
                        <div className="h-20 relative bg-white/[0.02] rounded-2xl group border border-white/5 overflow-hidden">
                            {scenes.map(s => {
                                const isSelected = selectedSceneId === s.id;
                                const isActive = currentTime >= s.start && currentTime < s.end;
                                return (
                                    <div 
                                        key={s.id}
                                        onClick={(e) => { e.stopPropagation(); setSelectedSceneId(s.id); setCurrentTime(s.start); }}
                                        className={`absolute h-full border-r border-black/20 transition-all cursor-pointer overflow-hidden ${isSelected ? 'z-30 ring-2 ring-purple-500' : 'z-20'} ${isActive ? 'bg-purple-500/20' : 'bg-white/5 hover:bg-white/10'}`}
                                        style={{ 
                                            left: `${(s.start/duration)*100}%`, 
                                            width: `${((s.end - s.start)/duration)*100}%`
                                        }}
                                    >
                                        <div className="w-full h-full flex items-center px-3 gap-3">
                                            {s.imageUrl ? (
                                                <img src={s.imageUrl} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center flex-shrink-0">
                                                    {s.generating ? <Loader2 size={12} className="animate-spin text-purple-400" /> : <ImageIcon size={12} className="text-white/10" />}
                                                </div>
                                            )}
                                            <p className={`text-[8px] font-black uppercase tracking-tighter line-clamp-1 ${isActive ? 'text-purple-400' : 'text-white/20'}`}>{s.text}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Track 2: Subtitles (Simulated) */}
                        <div className="h-10 relative bg-white/[0.01] rounded-xl flex items-center">
                             {scenes.map(s => (
                                 <div 
                                    key={s.id}
                                    className="absolute h-1.5 bg-white/10 rounded-full"
                                    style={{ left: `${(s.start/duration)*100}%`, width: `${((s.end - s.start)/duration)*100 - 0.5}%` }}
                                 />
                             ))}
                             <div className="absolute top-0 bottom-0 flex items-center px-4 pointer-events-none">
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/10">Subtitle Sync Trace</p>
                             </div>
                        </div>

                        {/* Track 3: Audio Wave (Placeholders) */}
                        <div className="h-12 relative flex items-end gap-[1px]">
                             {Array.from({ length: 120 }).map((_, i) => (
                                 <div 
                                    key={i} 
                                    className={`flex-1 rounded-full ${isPlayingAudio ? 'animate-pulse' : ''} ${currentTime >= (i/120)*duration ? 'bg-purple-500' : 'bg-white/5'}`}
                                    style={{ 
                                        height: `${20 + Math.random() * 80}%`,
                                        opacity: 0.3 + (Math.random() * 0.4)
                                    }} 
                                 />
                             ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* RENDER OVERLAY */}
      <AnimatePresence>
          {activeStage === 'rendering' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#050508]/95 backdrop-blur-2xl flex items-center justify-center">
                  <div className="w-full max-w-md p-12 text-center space-y-10">
                        <div className="relative inline-block">
                             <div className="w-32 h-32 rounded-[2rem] bg-purple-500 items-center justify-center flex shadow-[0_0_50px_rgba(168,85,247,0.5)]">
                                 {renderDone ? <Check size={48} className="text-white" /> : <Film size={48} className="text-white animate-pulse" />}
                             </div>
                             {!renderDone && (
                                <svg className="absolute -inset-4 w-40 h-40 transform -rotate-90">
                                    <circle cx="80" cy="80" r="76" stroke="white" strokeWidth="4" fill="transparent" strokeDasharray={477} strokeDashoffset={477 - (477 * renderProgress / 100)} className="text-purple-500 transition-all duration-300" />
                                </svg>
                             )}
                        </div>

                        <div className="space-y-3">
                             <h2 className="text-3xl font-black italic uppercase tracking-tighter">
                                {renderDone ? 'Видео Готово!' : 'Мастер-Рендер'}
                             </h2>
                             <p className="text-[12px] font-black uppercase tracking-widest text-white/30">
                                {renderDone ? 'Процесс завершен. Переходим в монтажку.' : `Склеиваем кадры... ${renderProgress}%`}
                             </p>
                        </div>

                        {renderDone && (
                            <button 
                                onClick={() => onComplete(finalVideoBlob!, transcript)}
                                className="w-full py-6 rounded-[2rem] bg-white text-black font-black italic uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4"
                            >
                                В Монтажку <ArrowRight size={20} />
                            </button>
                        )}
                  </div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
