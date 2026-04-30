'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Image as ImageIcon, Film, ChevronRight, Play, Pause,
  RefreshCw, Check, ArrowLeft, ArrowRight, Loader2,
  Sparkles, X, RotateCw, Edit3, Brain,
  Clock, Layers, Wand2, Zap, Star, Plus, Upload
} from 'lucide-react';



import { useLocale } from 'next-intl';
import { ProductionManifest } from '@/lib/types/studio';
import { projectService } from '@/lib/services/projectService';
import { renderService } from '@/lib/services/renderService';



// ── Types ──────────────────────────────────────────────────────────────────

interface Scene {
  id: string;
  text: string;
  start: number;
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
  projectId?: string;
}


type PostEffect = 'kenburns' | 'dust' | 'glitch' | 'negative' | 'zoom_punch';
type BottomTab = 'setup' | 'scenes' | 'inspector';

// ── Main Component ──────────────────────────────────────────────────────────

export default function FacelessStudio({ manifest, onBack, onComplete, onJumpToConcept, projectId }: FacelessStudioProps) {

  const locale = useLocale();
  const [editableScript, setEditableScript] = useState('');

  // App State
  const [activeStage, setActiveStage] = useState<'setup' | 'editor' | 'rendering'>('setup');
  const [activeTab, setActiveTab] = useState<BottomTab>('setup');
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // Voice state
  const [voices, setVoices] = useState<any[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('EXAVITQu4vr4xnSDxMaL');
  const [defaultVoiceId, setDefaultVoiceId] = useState('EXAVITQu4vr4xnSDxMaL');

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
  const [stylePrompt] = useState('cinematic, high quality, dramatic lighting, 4K, consistent visual style');

  const [transcript, setTranscript] = useState<any[]>([]);
  const [generatingImages, setGeneratingImages] = useState(false);

  const [imagesProgress, setImagesProgress] = useState(0);
  const [imageGenError, setImageGenError] = useState<string | null>(null);
  
  // Render state


  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderDone, setRendered] = useState(false);
  const [finalVideoBlob, setFinalVideoBlob] = useState<Blob | null>(null);
  const [selectedEffects, setSelectedEffects] = useState<PostEffect[]>(['kenburns', 'zoom_punch']);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // ── Extract script from manifest ──
  const scriptText = manifest?.segments
    ?.map((s: any) => s.scriptText || s.text || '')
    .filter(Boolean)
    .join(' ') || '';

  const buildScenesFromScript = useCallback((text: string, totalDur: number = 30) => {
    const parts = text.split(/[.!?\n]+/).map(p => p.trim()).filter(p => p.length > 10);
    const limitedParts = parts.slice(0, 10);
    const perScene = totalDur / Math.max(1, limitedParts.length);
    return limitedParts.map((t, i) => ({
      id: `scene_${i}_${Date.now()}`,
      text: t,
      start: i * perScene,
      end: (i + 1) * perScene,
      imagePrompt: t,
    }));

  }, []);


  useEffect(() => {
    if (manifest && (manifest as any).faceless) {
      const f = (manifest as any).faceless;
      if (f.scenes) setScenes(f.scenes);
      if (f.audioUrl) setAudioUrl(f.audioUrl);
      if (f.editableScript) setEditableScript(f.editableScript);
      if (f.selectedVoice) setSelectedVoice(f.selectedVoice);
      if (f.defaultVoiceId) setDefaultVoiceId(f.defaultVoiceId);
      if (f.duration) setDuration(f.duration);
      if (f.activeStage) setActiveStage(f.activeStage);
    } else if (scriptText) {
      setEditableScript(scriptText);
    }
  }, [manifest, scriptText]);

  useEffect(() => {
    if (!projectId || scenes.length === 0) return;
    const saveFacelessData = async () => {
      // Small delay to debounce rapid updates
      await projectService.updateLatestVersionManifest(projectId, {
        ...manifest,
        faceless: {
          scenes,
          audioUrl,
          editableScript,
          selectedVoice,
          defaultVoiceId,
          duration,
          activeStage,
          lastUpdated: Date.now()
        }
      });
      
      // Save voice selection to local storage as fallback
      if (typeof window !== 'undefined') {
        localStorage.setItem(`faceless_voice_${projectId}`, selectedVoice);
        localStorage.setItem(`faceless_default_voice_${projectId}`, defaultVoiceId);
      }
    };
    const timer = setTimeout(saveFacelessData, 1000);
    return () => clearTimeout(timer);
  }, [scenes, audioUrl, editableScript, selectedVoice, defaultVoiceId, duration, activeStage, projectId]);




  useEffect(() => {
    fetch('/api/ai/tts').then(r => r.json()).then(d => {
      if (d.voices) setVoices(d.voices);
    }).catch(() => {});
  }, []);

  const skipVoiceGeneration = async () => {
    setSelectedVoice(defaultVoiceId);
    setGeneratingVoice(true);
    setVoiceError(null);
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editableScript, voice_id: defaultVoiceId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'TTS failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioUrl(url);
      const estimatedDur = Math.max(10, Math.min(60, editableScript.length / 15));
      setDuration(estimatedDur);
      const newScenes = buildScenesFromScript(editableScript, estimatedDur);
      setScenes(newScenes);
      setTranscript(newScenes.map(s => ({ text: s.text, start: s.start, end: s.end })));
      setActiveStage('editor');
      setActiveTab('scenes');
      setSheetExpanded(false);
    } catch (err: any) {
      setVoiceError(err.message || 'Ошибка пропуска озвучки.');
    } finally {
      setGeneratingVoice(false);
    }
  };

  const handleResize = (id: string, edge: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const scene = scenes.find(s => s.id === id);
    if (!scene) return;
    const startStart = scene.start;
    const startEnd = scene.end;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaSeconds = deltaX / 15;
      
      setScenes(prev => prev.map(s => {
        if (s.id !== id) return s;
        if (edge === 'left') {
          const newStart = Math.max(0, Math.min(startEnd - 1, startStart + deltaSeconds));
          return { ...s, start: newStart };
        } else {
          const newEnd = Math.max(startStart + 1, Math.min(60, startEnd + deltaSeconds));
          return { ...s, end: newEnd };
        }

      }));

    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

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
      const estimatedDur = Math.max(10, Math.min(60, editableScript.length / 15));
      setDuration(estimatedDur);
      const newScenes = buildScenesFromScript(editableScript, estimatedDur);
      setScenes(newScenes);
      setTranscript(newScenes.map(s => ({ text: s.text, start: s.start, end: s.end })));
      setActiveStage('editor');
      setActiveTab('scenes');
      setSheetExpanded(false);
    } catch (err: any) {
      setVoiceError(err.message || 'Ошибка генерации голоса.');
    } finally {
      setGeneratingVoice(false);
    }
  };

  const executeFullAutogeneration = async () => {

    setSelectedVoice(defaultVoiceId);
    setGeneratingVoice(true);
    setVoiceError(null);
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editableScript, voice_id: defaultVoiceId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'TTS failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioUrl(url);
      const estimatedDur = Math.max(10, Math.min(60, editableScript.length / 15));
      setDuration(estimatedDur);
      const newScenes = buildScenesFromScript(editableScript, estimatedDur);
      setScenes(newScenes);
      setTranscript(newScenes.map(s => ({ text: s.text, start: s.start, end: s.end })));
      setActiveStage('editor');
      setActiveTab('scenes');
      setSheetExpanded(false);

      // Stage 2: Images automatically
      setGeneratingImages(true);
      setImagesProgress(0);
      setImageGenError(null);
      const updated: Scene[] = [...newScenes];

      let errorCount = 0;
      let lastErrorMsg = '';

      for (let i = 0; i < updated.length; i++) {
        if (updated[i].imageUrl) continue;
        updated[i] = { ...updated[i], generating: true };
        setScenes([...updated]);
        try {
          const resImg = await fetch('/api/ai/image-gen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: updated[i].imagePrompt, style_prefix: stylePrompt, aspect_ratio: '9:16' }),
          });
          const dataImg = await resImg.json();
          if (!resImg.ok) throw new Error(dataImg.error || dataImg.detail || `API Error ${resImg.status}`);
          updated[i] = { ...updated[i], imageUrl: dataImg.url, generating: false };
        } catch (e: any) {
          errorCount++;
          lastErrorMsg = e.message || 'Unknown error';
          updated[i] = { ...updated[i], generating: false };
        }
        setScenes([...updated]);
        setImagesProgress(Math.round(((i + 1) / updated.length) * 100));
      }
      if (errorCount > 0) {
        setImageGenError(`Ошибка генерации (${errorCount} кадров): ${lastErrorMsg}`);
      }
      setGeneratingImages(false);
    } catch (err: any) {
      setVoiceError(err.message || 'Ошибка автогенерации.');
    } finally {
      setGeneratingVoice(false);
    }
  };


  // ── Stage 2: Generate All Images ──
  const generateAllImages = async () => {
    setGeneratingImages(true);
    setImagesProgress(0);
    setImageGenError(null);
    const updated = [...scenes];
    let errorCount = 0;
    let lastErrorMsg = '';

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].imageUrl) continue;
      updated[i] = { ...updated[i], generating: true };
      setScenes([...updated]);
      try {
        const res = await fetch('/api/ai/image-gen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: updated[i].imagePrompt, style_prefix: stylePrompt, aspect_ratio: '9:16' }),
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || data.detail || `API Error ${res.status}`);
        }
        
        updated[i] = { ...updated[i], imageUrl: data.url, generating: false };
      } catch (e: any) {
        errorCount++;
        lastErrorMsg = e.message || 'Unknown error';
        updated[i] = { ...updated[i], generating: false };
      }
      setScenes([...updated]);
      setImagesProgress(Math.round(((i + 1) / updated.length) * 100));
    }

    if (errorCount > 0) {
      setImageGenError(`Ошибка генерации (${errorCount} кадров): ${lastErrorMsg}`);
    }
    setGeneratingImages(false);
  };

  const regenerateScene = async (sceneId: string) => {
    const idx = scenes.findIndex(s => s.id === sceneId);
    if (idx === -1) return;
    const updated = [...scenes];
    updated[idx] = { ...updated[idx], generating: true };
    setScenes(updated);
    setImageGenError(null);
    try {
      const res = await fetch('/api/ai/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: updated[idx].imagePrompt, style_prefix: stylePrompt, aspect_ratio: '9:16' }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.detail || `API Error ${res.status}`);
      }
      
      updated[idx] = { ...updated[idx], imageUrl: data.url, generating: false };
      setScenes([...updated]);
    } catch (e: any) {
      setImageGenError(e.message || 'Ошибка генерации кадра');
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, generating: false } : s));
    }
  };


  // ── Audio sync ──
  useEffect(() => {
    const v = audioRef.current;
    if (!v || !audioUrl) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onLoad = () => { if (v.duration && !isNaN(v.duration)) setDuration(v.duration); };
    const onEnd = () => setIsPlayingAudio(false);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onLoad);
    v.addEventListener('ended', onEnd);
    return () => { v.removeEventListener('timeupdate', onTime); v.removeEventListener('loadedmetadata', onLoad); v.removeEventListener('ended', onEnd); };
  }, [audioUrl]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlayingAudio) { audioRef.current.play(); }
    else { audioRef.current.pause(); }
  }, [isPlayingAudio]);

  const activeScene = useMemo(() => {
    return scenes.find(s => currentTime >= s.start && currentTime < s.end) || scenes[0] || null;
  }, [scenes, currentTime]);

  const selectedScene = useMemo(() => scenes.find(s => s.id === selectedSceneId) || null, [scenes, selectedSceneId]);

  // ── Render ──
  const startVideoRender = async () => {
    setRendering(true);
    setActiveStage('rendering');
    setRenderProgress(0);
    const canvas = canvasRef.current!;
    canvas.width = 720; canvas.height = 1280;
    const ctx = canvas.getContext('2d')!;
    const FPS = 24;
    const totalFrames = Math.round(duration * FPS);
    const frames: ImageData[] = [];
    const imgCache: Record<string, HTMLImageElement> = {};
    for (const scene of scenes) {
      if (scene.imageUrl) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); img.src = scene.imageUrl!; });
        imgCache[scene.id] = img;
      }
    }
    for (let f = 0; f < totalFrames; f++) {
      const time = f / FPS;
      const scene = scenes.find(s => time >= s.start && time < s.end) || scenes[scenes.length - 1];
      const prog = (time - scene.start) / (scene.end - scene.start);
      const img = imgCache[scene.id];
      ctx.clearRect(0, 0, 720, 1280);
      if (img?.complete) {
        const scale = selectedEffects.includes('kenburns') ? 1.05 + prog * 0.1 : 1.05;
        const tx = selectedEffects.includes('kenburns') ? -prog * 30 : 0;
        ctx.save(); ctx.translate(360 + tx, 640); ctx.scale(scale, scale);
        const aspect = img.naturalWidth / img.naturalHeight;
        let dw, dh;
        if (aspect < 720 / 1280) { dw = 720; dh = 720 / aspect; } else { dh = 1280; dw = 1280 * aspect; }
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
      } else {
        ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, 720, 1280);
      }
      frames.push(ctx.getImageData(0, 0, 720, 1280));
      if (f % 10 === 0) setRenderProgress(Math.round((f / totalFrames) * 90));
    }
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = 720; outputCanvas.height = 1280;
    const outCtx = outputCanvas.getContext('2d')!;
    const stream = outputCanvas.captureStream(FPS);
    if (audioRef.current) {
      // @ts-ignore
      const as = audioRef.current?.captureStream?.() || audioRef.current?.mozCaptureStream?.();
      if (as) as.getAudioTracks().forEach((t: any) => stream.addTrack(t));
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
        outCtx.putImageData(frames[fi], 0, 0); fi++;
      }, 1000 / FPS);
    });
    const blob = new Blob(chunks, { type: 'video/webm' });
    setFinalVideoBlob(blob);
    setRendering(false);
    setRenderProgress(100);
    setRendered(true);
  };

  // ── Bottom Sheet height ──
  const SHEET_PEEK = 320; // Increased to fit the integrated strip
  const SHEET_FULL = '85vh';


  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-[#050508] text-white h-screen relative overflow-hidden font-sans select-none">
      <canvas ref={canvasRef} className="hidden" />
      {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" />}

      {/* ── TOP HEADER ── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 z-50 shrink-0">
        <button
          onClick={() => {
            if (activeStage === 'rendering') setActiveStage('editor');
            else if (activeStage === 'editor') setActiveStage('setup');
            else onBack();
          }}
          className="flex items-center gap-1.5 text-white/40 text-[11px] font-black uppercase tracking-widest active:opacity-60"
        >
          <ArrowLeft size={14} /> Назад
        </button>


        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Brain size={14} className="text-purple-400" />
          </div>
          <span className="text-[13px] font-black italic uppercase tracking-tighter">
            Faceless <span className="text-purple-400">Engine</span>
          </span>
        </div>

        {activeStage === 'editor' && (
          <button
            onClick={startVideoRender}
            className="px-4 py-2 rounded-2xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-purple-500/30"
          >
            A-Roll <ChevronRight size={12} />
          </button>
        )}
        {activeStage === 'setup' && <div className="w-16" />}
      </div>

      {/* ── MAIN PREVIEW AREA ── */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        style={{ paddingBottom: sheetExpanded ? SHEET_FULL : `${SHEET_PEEK}px` }}
      >
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.08)_0%,transparent_70%)]" />

        {activeStage === 'setup' ? (
          /* ── SETUP HERO STATE ── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-6 px-6 text-center"
          >
            <div className="w-24 h-24 rounded-[2.5rem] bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_60px_rgba(168,85,247,0.15)]">
              <Film size={36} className="text-purple-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Faceless Studio</h2>
              <p className="text-white/30 text-[12px] font-medium leading-relaxed max-w-xs">
                Синтез голоса, AI-изображения и A-Roll видео — за несколько минут
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
              {[
                { 
                  icon: <Mic size={16} />, 
                  label: 'Голос ИИ', 
                  done: !!audioUrl,
                  onClick: () => {
                    setActiveStage('setup');
                    setActiveTab('setup');
                    setSheetExpanded(true);
                  }
                },
                { 
                  icon: <ImageIcon size={16} />, 
                  label: 'AI Кадры', 
                  done: scenes.length > 0 && scenes.every(s => !!s.imageUrl),
                  onClick: () => {
                    setActiveStage('editor');
                    setActiveTab('scenes');
                    setSheetExpanded(true);
                  }
                },
                { 
                  icon: <Film size={16} />, 
                  label: 'A-Roll', 
                  done: selectedEffects.length > 0,
                  onClick: () => {
                    setActiveStage('editor');
                    setActiveTab('setup');
                    setSheetExpanded(true);
                  }
                },
              ].map((item, i) => (
                <button 
                  key={i} 
                  onClick={item.onClick}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95 border ${
                    item.done 
                      ? 'bg-purple-600 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]' 
                      : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className={item.done ? 'text-white' : 'text-purple-400'}>{item.icon}</div>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${item.done ? 'text-white/80' : 'text-white/30'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>


            <button
              onClick={executeFullAutogeneration}
              disabled={generatingVoice || generatingImages || !editableScript.trim()}
              className="w-full max-w-xs py-4 rounded-full bg-purple-600 text-white text-xs font-black italic uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(168,85,247,0.3)] hover:shadow-[0_20px_50px_rgba(168,85,247,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generatingVoice || generatingImages ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Генерирую ({generatingVoice ? 'Голос' : `${imagesProgress}% Кадры`})...
                </>
              ) : (
                <>
                  АВТОГЕНЕРАЦИЯ <ChevronRight size={16} />
                </>
              )}
            </button>
          </motion.div>

        ) : (
          /* ── EDITOR PREVIEW ── */
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Phone frame */}
            <div className="relative h-full max-h-full aspect-[9/16] rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.9)] bg-[#0a0a0f] group">
              {activeScene?.imageUrl ? (
                <motion.img
                  key={activeScene.id}
                  initial={{ scale: 1.08, opacity: 0 }}
                  animate={{ scale: 1.02, opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  src={activeScene.imageUrl}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  {activeScene?.generating ? (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                        <Loader2 size={24} className="animate-spin text-purple-400" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-purple-400/60">Генерирую кадр...</p>
                    </>
                  ) : (
                    <ImageIcon className="text-white/5" size={48} />
                  )}
                </div>
              )}

              {/* Gradient vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

              {/* Subtitle overlay */}
              {activeScene?.text && (
                <div className="absolute bottom-20 left-0 right-0 px-5 text-center pointer-events-none">
                  <p className="text-white text-[15px] font-black italic leading-snug drop-shadow-[0_2px_12px_rgba(0,0,0,1)]">
                    {activeScene.text.slice(0, 80)}{activeScene.text.length > 80 ? '…' : ''}
                  </p>
                </div>
              )}

              {/* Mini player */}
              <div className="absolute bottom-3 inset-x-3 h-12 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/10 flex items-center px-4 gap-3">
                <button
                  onClick={() => {
                    if (!audioRef.current) return;
                    if (isPlayingAudio) {
                      audioRef.current.pause();
                      setIsPlayingAudio(false);
                    } else {
                      audioRef.current.play().catch(e => console.error('Play error:', e));
                      setIsPlayingAudio(true);
                    }
                  }}
                  className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center shrink-0 active:scale-90 transition-all shadow-lg shadow-purple-500/40"
                >
                  {isPlayingAudio ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
                </button>

                <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-purple-400 transition-all" style={{ width: `${(currentTime / duration) * 100}%` }} />
                </div>
                <span className="text-[9px] font-black text-white/30 shrink-0">
                  {Math.floor(currentTime)}s / {Math.floor(duration)}s
                </span>
              </div>

              {/* Scene counter badge */}
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                  {scenes.filter(s => s.imageUrl).length}/{scenes.length} кадров
                </span>
              </div>
            </div>
          </div>
        )}
      </div>



      {/* ── BOTTOM SHEET ── */}
      <motion.div
        initial={false}
        animate={{ height: sheetExpanded ? SHEET_FULL : `${SHEET_PEEK}px` }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 z-40 bg-[#0e0e14] rounded-t-[2rem] border-t border-white/8 flex flex-col overflow-hidden"
        style={{ boxShadow: '0 -20px 60px rgba(0,0,0,0.6)' }}
      >
        {/* Drag handle + tab bar */}
        <div
          className="shrink-0 px-5 pt-3 pb-1 cursor-pointer touch-none"
          onClick={() => setSheetExpanded(p => !p)}
        >
          <motion.div 
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y < -50) setSheetExpanded(true);
              if (info.offset.y > 50) setSheetExpanded(false);
            }}
            className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-3" 
          />

          <div className="flex gap-1">
            {(activeStage === 'setup'
              ? [{ id: 'setup' as BottomTab, label: 'Настройка', icon: <Sparkles size={13} /> }]
              : [
                  { id: 'scenes' as BottomTab, label: 'Сцены', icon: <Layers size={13} /> },
                  { id: 'inspector' as BottomTab, label: 'Инспектор', icon: <Edit3 size={13} /> },
                  { id: 'setup' as BottomTab, label: 'Эффекты', icon: <Zap size={13} /> },
                ]
            ).map(tab => (
              <button
                key={tab.id}
                onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id); setSheetExpanded(true); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === tab.id && sheetExpanded ? 'bg-purple-500/20 text-purple-400' : 'text-white/30 hover:text-white/60'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}

            {sheetExpanded && (
              <button
                onClick={(e) => { e.stopPropagation(); setSheetExpanded(false); }}
                className="ml-auto p-1.5 rounded-xl text-white/20 hover:text-white/60 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* ── INTEGRATED SCENE STRIP (editor only) ── */}
          {activeStage === 'editor' && (
            <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {/* Generate all button */}
                <button
                  onClick={generateAllImages}
                  disabled={generatingImages}
                  className="shrink-0 w-12 h-16 rounded-xl bg-purple-600/80 border border-purple-500/40 flex flex-col items-center justify-center gap-1 active:scale-90 transition-all disabled:opacity-40"
                >
                  {generatingImages
                    ? <Loader2 size={16} className="animate-spin text-white" />
                    : <Wand2 size={16} className="text-white" />
                  }
                  <span className="text-[6px] font-black uppercase tracking-wider text-white/80">Всё</span>
                </button>

                {scenes.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSceneId(s.id); setCurrentTime(s.start); setActiveTab('inspector'); }}
                    className={`shrink-0 w-12 h-16 rounded-xl overflow-hidden border transition-all relative ${selectedSceneId === s.id ? 'border-purple-400 ring-2 ring-purple-500/50' : 'border-white/10'}`}
                  >
                    {s.imageUrl ? (
                      <img src={s.imageUrl} className="w-full h-full object-cover" alt={`Scene ${i + 1}`} />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        {s.generating
                          ? <Loader2 size={12} className="animate-spin text-purple-400" />
                          : <ImageIcon size={12} className="text-white/20" />
                        }
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5 text-center">
                      <span className="text-[6px] font-black text-white/60">{i + 1}</span>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Mini Timeline below strip */}
              <div ref={timelineRef} className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const time = (x / rect.width) * duration;
                  setCurrentTime(Math.max(0, Math.min(time, duration)));
                  if (audioRef.current) audioRef.current.currentTime = time;
                }}
              >
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" style={{ width: `${(currentTime / duration) * 100}%` }} />
              </div>
            </div>
          )}
        </div>


        {/* Sheet content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2">
          <AnimatePresence mode="wait">
            {/* SETUP TAB */}
            {activeTab === 'setup' && activeStage === 'setup' && (
              <motion.div key="setup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2 block">Сценарий Видео</label>
                  <textarea
                    value={editableScript}
                    onChange={e => setEditableScript(e.target.value)}
                    rows={5}
                    className="w-full bg-white/[0.04] border border-white/8 rounded-2xl p-4 text-[12px] text-white/70 focus:border-purple-500/50 transition-all resize-none outline-none leading-relaxed placeholder:text-white/20"
                    placeholder="Вставьте или отредактируйте ваш сценарий..."
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3 block">Голос Озвучки</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(voices.length > 0 ? voices.slice(0, 4) : [
                      { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', labels: { accent: 'American' } },
                      { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', labels: { accent: 'American' } },
                      { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', labels: { accent: 'English' } },
                      { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', labels: { accent: 'British' } },
                    ]).map(v => (
                      <div
                        key={v.voice_id}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative flex items-center justify-between ${selectedVoice === v.voice_id ? 'border-purple-500/60 bg-purple-500/10 shadow-lg shadow-purple-500/10' : 'border-white/6 bg-white/[0.03]'}`}
                      >
                        <div className="flex-1 cursor-pointer" onClick={() => setSelectedVoice(v.voice_id)}>
                          <p className="text-[11px] font-black">{v.name}</p>
                          <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">{v.labels?.accent}</p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDefaultVoiceId(v.voice_id); }}
                          className={`p-1.5 rounded-xl transition-all active:scale-90 flex items-center justify-center ${defaultVoiceId === v.voice_id ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 'text-white/20 hover:text-white/40'}`}
                        >
                          <Star size={14} fill={defaultVoiceId === v.voice_id ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    ))}

                  </div>
                </div>

                {voiceError && (
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400 text-[11px] font-black">{voiceError}</p>
                  </div>
                )}

                <button
                  onClick={startProduction}
                  disabled={generatingVoice || !editableScript.trim()}
                  className="w-full py-5 rounded-[1.5rem] bg-gradient-to-br from-purple-600 to-purple-700 text-white font-black italic uppercase tracking-widest shadow-xl shadow-purple-500/25 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                >
                  {generatingVoice ? (
                    <><Loader2 size={18} className="animate-spin" /> Генерирую голос...</>
                  ) : (
                    <><Mic size={18} /> Начать Генерацию</>
                  )}
                </button>

                <button
                  onClick={skipVoiceGeneration}
                  disabled={generatingVoice || !editableScript.trim()}
                  className="w-full py-3 rounded-[1rem] border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all mt-2 disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  <Star size={12} className="text-amber-400" fill="currentColor" /> Пропустить и взять голос по умолчанию
                </button>
              </motion.div>

            )}

            {/* SCENES TAB */}
            {activeTab === 'scenes' && activeStage === 'editor' && (
              <motion.div key="scenes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Generate all */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-purple-500/8 border border-purple-500/15">
                  <div>
                    <p className="text-[11px] font-black uppercase">AI Генератор Кадров</p>
                    <p className="text-[9px] text-white/30 mt-0.5">{scenes.filter(s => s.imageUrl).length} из {scenes.length} сгенерировано</p>
                    {generatingImages && (
                      <div className="mt-2 w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div animate={{ width: `${imagesProgress}%` }} className="h-full bg-purple-500 rounded-full" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={generateAllImages}
                    disabled={generatingImages}
                    className="w-11 h-11 rounded-full bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 active:scale-90 transition-all disabled:opacity-40"
                  >
                    {generatingImages ? <Loader2 size={18} className="animate-spin text-white" /> : <RotateCw size={18} className="text-white" />}
                  </button>
                </div>

                {imageGenError && (
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400 text-[11px] font-black">{imageGenError}</p>
                  </div>
                )}


                {/* Scene list */}
                <div className="flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl p-4 overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Многодорожечный таймлайн</span>
                  </div>


                  <div className="relative flex flex-col gap-4 overflow-x-auto pb-3 hide-scrollbar w-full">
                    {/* Track 1: TEXT */}
                    <div className="flex gap-2 items-center min-w-max">
                      <div className="w-20 text-right pr-3 flex items-center justify-end text-[8px] font-black text-white/30 uppercase tracking-[0.2em] border-r border-white/5 h-12">
                        Субтитры
                      </div>
                      {scenes.map((s, i) => (
                        <div 
                          key={`txt_${s.id}`}
                          onClick={() => { setSelectedSceneId(s.id); setActiveTab('inspector'); }}
                          className={`h-12 rounded-xl border p-2 flex items-center cursor-pointer relative select-none transition-all ${selectedSceneId === s.id ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'border-white/5 bg-white/[0.03]'}`}
                          style={{ width: `${Math.max(120, (s.end - s.start) * 18)}px` }}
                        >
                          <p className="text-[9px] font-bold text-white/70 leading-snug line-clamp-2">{s.text}</p>
                          <div className="absolute bottom-1 right-2 text-[7px] font-black text-purple-400/60">{i + 1}</div>
                        </div>
                      ))}
                    </div>

                    {/* Track 2: IMAGES */}
                    <div className="flex gap-2 items-center min-w-max">
                      <div className="w-20 text-right pr-3 flex items-center justify-end text-[8px] font-black text-white/30 uppercase tracking-[0.2em] border-r border-white/5 h-16">
                        Кадры
                      </div>
                      {scenes.map((s, i) => (
                        <div 
                          key={`img_${s.id}`}
                          onClick={() => { setSelectedSceneId(s.id); setActiveTab('inspector'); }}
                          className={`h-16 rounded-xl border overflow-hidden cursor-pointer relative transition-all select-none ${selectedSceneId === s.id ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'border-white/5 bg-white/[0.03]'}`}
                          style={{ width: `${Math.max(120, (s.end - s.start) * 18)}px` }}
                        >
                          {s.imageUrl ? (
                            <img src={s.imageUrl} className="w-full h-full object-cover" alt="" />
                          ) : s.generating ? (
                            <div className="w-full h-full flex items-center justify-center bg-purple-500/5">
                              <Loader2 size={16} className="animate-spin text-purple-400" />
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-white/[0.01] text-white/20 gap-1 hover:text-purple-400 transition-colors">
                              <ImageIcon size={14} />
                              <span className="text-[6px] font-black uppercase tracking-wider">Создать кадр</span>
                            </div>
                          )}

                          <div className="absolute top-1 left-2 px-1.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-[8px] font-black text-white/80 z-20">
                            #{i + 1}
                          </div>

                          <div 
                            className="absolute left-0 top-0 bottom-0 w-2 bg-purple-500/30 hover:bg-purple-500 cursor-ew-resize opacity-0 hover:opacity-100 transition-all z-20" 
                            onMouseDown={(e) => handleResize(s.id, 'left', e)}
                          />
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-2 bg-purple-500/30 hover:bg-purple-500 cursor-ew-resize opacity-0 hover:opacity-100 transition-all z-20" 
                            onMouseDown={(e) => handleResize(s.id, 'right', e)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => {
                        if (duration >= 60) return;
                        const defaultPos = scenes.length + 1;
                        const posStr = window.prompt(`Введите номер новой сцены (от 1 до ${defaultPos}):`, defaultPos.toString());
                        if (posStr === null) return;
                        
                        let pos = parseInt(posStr, 10);
                        if (isNaN(pos) || pos < 1) pos = 1;
                        if (pos > defaultPos) pos = defaultPos;
                        
                        const newS = {
                          id: `scene_${Date.now()}`,
                          text: 'Новая сцена',
                          start: 0,
                          end: 5,
                          imagePrompt: 'Опишите кадр для генерации...',
                        };
                        
                        const updated = [...scenes];
                        updated.splice(pos - 1, 0, newS);
                        
                        let currentStart = 0;
                        const finalScenes = updated.map(s => {
                          const dur = s.end - s.start;
                          const end = Math.min(60, currentStart + dur);
                          const res = { ...s, start: currentStart, end };
                          currentStart = end;
                          return res;
                        });
                        
                        setDuration(currentStart);
                        setScenes(finalScenes);
                      }}
                      className="px-4 py-2 rounded-2xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-purple-500/20 hover:bg-purple-500"
                    >
                      <Plus size={14} /> Добавить Сцену
                    </button>
                  </div>


                </div>

              </motion.div>
            )}

            {/* INSPECTOR TAB */}
            {activeTab === 'inspector' && activeStage === 'editor' && (
              <motion.div key="inspector" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                {selectedScene ? (
                  <>
                    {/* Preview of selected scene */}
                    <div className="relative w-full aspect-[9/16] max-h-48 rounded-2xl overflow-hidden bg-[#0a0a0f] border border-white/8">
                      {selectedScene.imageUrl ? (
                        <img src={selectedScene.imageUrl} className="w-full h-full object-cover" alt="" />
                      ) : selectedScene.generating ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 size={24} className="animate-spin text-purple-400" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon size={32} className="text-white/5" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
                        <span className="text-[8px] font-black text-purple-400 uppercase tracking-wider">
                          {Math.round(selectedScene.start)}с – {Math.round(selectedScene.end)}с
                        </span>
                      </div>
                    </div>

                    {/* Prompt editor */}
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2 flex items-center gap-1.5 block">
                        <Edit3 size={11} /> Промпт сцены
                      </label>
                      <textarea
                        value={selectedScene.imagePrompt}
                        onChange={e => setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, imagePrompt: e.target.value } : s))}
                        rows={3}
                        className="w-full bg-white/[0.04] border border-white/8 rounded-2xl p-4 text-[11px] text-white/60 focus:border-purple-500/40 outline-none leading-relaxed resize-none placeholder:text-white/20"
                        placeholder="Опишите кадр..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => regenerateScene(selectedScene.id)}
                        disabled={selectedScene.generating}
                        className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/8 text-white/70 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                      >
                        {selectedScene.generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Сгенерировать
                      </button>
                      
                      <label className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/8 text-white/70 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-white/[0.06]">
                        <Upload size={14} />
                        Своё фото
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file && projectId) {
                              try {
                                setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, generating: true } : s));
                                const res = await renderService.uploadMedia(projectId, file, 'image');
                                if (res.publicUrl) {
                                  setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, imageUrl: res.publicUrl, generating: false } : s));
                                }
                              } catch (err) {
                                console.error('Upload error:', err);
                                setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, generating: false } : s));
                              }
                            }
                          }}

                        />
                      </label>
                    </div>



                    {imageGenError && (
                      <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                        <p className="text-red-400 text-[11px] font-black">{imageGenError}</p>
                      </div>
                    )}


                    {/* Scene text */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/6">

                      <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">Текст субтитров</p>
                      <p className="text-[12px] text-white/50 leading-relaxed">{selectedScene.text}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-4 opacity-30">
                    <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-white/30 flex items-center justify-center">
                      <Layers size={22} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-center">
                      Выберите сцену<br />из ленты выше
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* EFFECTS TAB */}
            {activeTab === 'setup' && activeStage === 'editor' && (
              <motion.div key="effects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3 block">Пост-эффекты TikTok</label>
                  <div className="space-y-2">
                    {(['kenburns', 'zoom_punch', 'glitch'] as PostEffect[]).map(fx => (
                      <button
                        key={fx}
                        onClick={() => setSelectedEffects(p => p.includes(fx) ? p.filter(f => f !== fx) : [...p, fx])}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all active:scale-[0.98] ${selectedEffects.includes(fx) ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/[0.03] border-white/6 text-white/30'}`}
                      >
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide">
                            {fx === 'kenburns' ? '🎬 Ken Burns' : fx === 'zoom_punch' ? '⚡ Zoom Punch' : '📺 Glitch'}
                          </p>
                          <p className="text-[9px] mt-0.5 opacity-60">
                            {fx === 'kenburns' ? 'Медленное кинематографичное движение' : fx === 'zoom_punch' ? 'Резкий зум при смене сцены' : 'Цифровые артефакты'}
                          </p>
                        </div>
                        {selectedEffects.includes(fx) && <Check size={16} className="shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={startVideoRender}
                  className="w-full py-5 rounded-[1.5rem] bg-white text-black font-black italic uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <Film size={18} /> Собрать A-Roll
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── RENDER OVERLAY ── */}
      <AnimatePresence>
        {activeStage === 'rendering' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#050508]/96 backdrop-blur-2xl flex items-center justify-center p-8"
          >
            <div className="w-full max-w-sm text-center space-y-8">
              <div className="relative inline-block">
                <div className="w-28 h-28 rounded-[2rem] bg-purple-600 flex items-center justify-center shadow-[0_0_60px_rgba(168,85,247,0.5)]">
                  {renderDone ? <Check size={40} className="text-white" /> : <Film size={40} className="text-white animate-pulse" />}
                </div>
                {!renderDone && (
                  <svg className="absolute -inset-4 w-36 h-36 -rotate-90">
                    <circle cx="72" cy="72" r="68" stroke="rgba(168,85,247,0.3)" strokeWidth="3" fill="transparent" />
                    <circle cx="72" cy="72" r="68" stroke="#a855f7" strokeWidth="3" fill="transparent"
                      strokeDasharray={427} strokeDashoffset={427 - (427 * renderProgress / 100)}
                      className="transition-all duration-300" />
                  </svg>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                  {renderDone ? 'Видео Готово!' : 'Рендер...'}
                </h2>
                <p className="text-[12px] font-black uppercase tracking-widest text-white/30 mt-2">
                  {renderDone ? 'Просмотрите результат перед монтажом' : `Склеиваю кадры · ${renderProgress}%`}
                </p>
              </div>

              {renderDone && finalVideoBlob && (
                <div className="space-y-4">
                  <div className="relative aspect-[9/16] w-full max-w-[240px] mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                    <video 
                      src={URL.createObjectURL(finalVideoBlob)} 
                      controls 
                      autoPlay 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex gap-3 max-w-[280px] mx-auto">
                    <button
                      onClick={() => {
                        setRendered(false);
                        setActiveStage('editor');
                      }}
                      className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/8 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeft size={14} /> Редактор
                    </button>

                    <button
                      onClick={() => onComplete(finalVideoBlob!, transcript)}
                      className="flex-1 py-4 rounded-2xl bg-purple-600 text-white font-black italic uppercase text-[10px] tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      В Монтажку <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
