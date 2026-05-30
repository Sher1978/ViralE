'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Image as ImageIcon, Film, ChevronRight, Play, Pause,
  RefreshCw, Check, ArrowLeft, ArrowRight, Loader2,
  Sparkles, X, RotateCw, Edit3, Brain,
  Clock, Layers, Wand2, Zap, Star, Plus, Upload, Cpu, FileText
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
  visualStyle?: string;
}

const PREMIUM_VOICES = [
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', accent: 'US', gender: 'F' },
  { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', accent: 'US', gender: 'M' },
  { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', accent: 'UK', gender: 'F' },
  { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', accent: 'UK', gender: 'M' },
  { voice_id: 'IKne3meq5a4f5Ed3mLaP', name: 'Emily', accent: 'AU', gender: 'F' },
];

type PostEffect = 'kenburns' | 'dust' | 'glitch' | 'negative' | 'zoom_punch' | 'flash';
type BottomTab = 'script' | 'inspector' | 'effects';

// ── Main Component ──────────────────────────────────────────────────────────

export default function FacelessStudio({ manifest, onBack, onComplete, onJumpToConcept, projectId, visualStyle }: FacelessStudioProps) {

  const locale = useLocale();
  const [editableScript, setEditableScript] = useState('');

  // App State
  const [activeStage, setActiveStage] = useState<'setup' | 'editor' | 'rendering'>('editor');
  const [activeTab, setActiveTab] = useState<BottomTab>('script');
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // Redesign dialog states
  const [confirmVoiceId, setConfirmVoiceId] = useState<string | null>(null);
  const [showConfirmImages, setShowConfirmImages] = useState(false);

  // Voice state
  const [voices, setVoices] = useState<any[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('EXAVITQu4vr4xnSDxMaL');
  const [defaultVoiceId, setDefaultVoiceId] = useState('EXAVITQu4vr4xnSDxMaL');

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<any | null>(null);

  // Editor State
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);

  const [transcript, setTranscript] = useState<any[]>([]);
  const [generatingImages, setGeneratingImages] = useState(false);

  const [imagesProgress, setImagesProgress] = useState(0);
  const [imageGenError, setImageGenError] = useState<string | null>(null);
  
  // Render state


  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderDone, setRendered] = useState(false);
  const [renderBackgroundUrl, setRenderBackgroundUrl] = useState<string | null>(null);
  const [finalVideoBlob, setFinalVideoBlob] = useState<Blob | null>(null);
  const [selectedEffects, setSelectedEffects] = useState<PostEffect[]>(['kenburns', 'zoom_punch', 'glitch', 'dust', 'flash']);


  const canvasRef = useRef<any>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const renderingRef = useRef(false);
  const audioContextRef = useRef<any | null>(null);
  const audioSourceRef = useRef<any | null>(null);


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
      if (typeof (globalThis as any).window !== 'undefined') {
        (globalThis as any).localStorage?.setItem(`faceless_voice_${projectId}`, selectedVoice);
        (globalThis as any).localStorage?.setItem(`faceless_default_voice_${projectId}`, defaultVoiceId);
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
      setActiveTab('script');
      setSheetExpanded(true);
      generateAllImages(); // Auto-start image generation
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

    const onMouseMove = (moveEvent: any) => {
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
      (globalThis as any).document?.removeEventListener('mousemove', onMouseMove);
      (globalThis as any).document?.removeEventListener('mouseup', onMouseUp);
    };

    (globalThis as any).document?.addEventListener('mousemove', onMouseMove);
    (globalThis as any).document?.addEventListener('mouseup', onMouseUp);
  };

  // ── Stage 1: Generate Voice ──


  const startProductionWithVoice = async (voiceId: string) => {
    setSelectedVoice(voiceId);
    setGeneratingVoice(true);
    setVoiceError(null);
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editableScript, voice_id: voiceId }),
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

      // ── Get Semantic Visual Script ──
      let newScenes: Scene[] = [];
      try {
        const vRes = await fetch('/api/ai/visual-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scriptText: editableScript, locale })
        });
        if (vRes.ok) {
          const vData = await vRes.json();
          if (vData.segments) {
            const perScene = estimatedDur / vData.segments.length;
            newScenes = vData.segments.map((seg: any, i: number) => ({
              id: `scene_${i}_${Date.now()}`,
              text: seg.text,
              start: i * perScene,
              end: (i + 1) * perScene,
              imagePrompt: seg.ai_prompt,
            }));
          }
        }
      } catch (e) {
        console.error('Visual script generation failed, falling back:', e);
      }

      if (newScenes.length === 0) {
        newScenes = buildScenesFromScript(editableScript, estimatedDur);
      }

      setScenes(newScenes);
      setTranscript(newScenes.map(s => ({ text: s.text, start: s.start, end: s.end })));
    } catch (err: any) {
      setVoiceError(err.message || 'Ошибка генерации голоса.');
    } finally {
      setGeneratingVoice(false);
    }
  };

  const startProduction = async () => {
    await startProductionWithVoice(selectedVoice);
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

      // ── Get Semantic Visual Script ──
      let newScenes: Scene[] = [];
      try {
        const vRes = await fetch('/api/ai/visual-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scriptText: editableScript, locale })
        });
        if (vRes.ok) {
          const vData = await vRes.json();
          if (vData.segments) {
            const perScene = estimatedDur / vData.segments.length;
            newScenes = vData.segments.map((seg: any, i: number) => ({
              id: `scene_${i}_${Date.now()}`,
              text: seg.text,
              start: i * perScene,
              end: (i + 1) * perScene,
              imagePrompt: seg.ai_prompt,
            }));
          }
        }
      } catch (e) {
        console.error('Visual script generation failed, falling back:', e);
      }

      if (newScenes.length === 0) {
        newScenes = buildScenesFromScript(editableScript, estimatedDur);
      }

      setScenes(newScenes);
      setTranscript(newScenes.map(s => ({ text: s.text, start: s.start, end: s.end })));

      setActiveStage('editor');
      setActiveTab('script');
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
            body: JSON.stringify({ 
              prompt: updated[i].imagePrompt, 
              visual_style: visualStyle || 'startup_valley', 
              aspect_ratio: '9:16' 
            }),
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
      setImageGenError(err.message || 'Ошибка автогенерации изображений.');
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
          body: JSON.stringify({ 
            prompt: updated[i].imagePrompt, 
            visual_style: visualStyle || 'startup_valley', 
            aspect_ratio: '9:16' 
          }),
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
        body: JSON.stringify({ 
          prompt: updated[idx].imagePrompt, 
          visual_style: visualStyle || 'startup_valley', 
          aspect_ratio: '9:16' 
        }),
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

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = (e.currentTarget as any).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const activeScene = useMemo(() => {
    return scenes.find(s => currentTime >= s.start && currentTime < s.end) || scenes[0] || null;
  }, [scenes, currentTime]);

  const selectedScene = useMemo(() => scenes.find(s => s.id === selectedSceneId) || null, [scenes, selectedSceneId]);

  // ── Render ──
  const startVideoRender = async () => {
    setRendering(true);
    setActiveStage('rendering');
    setRenderProgress(0);
    setRenderBackgroundUrl(scenes[0]?.imageUrl || null);

    const canvas = canvasRef.current!;
    canvas.width = 720; canvas.height = 1280;
    const ctx = canvas.getContext('2d')!;
    const FPS = 24;
    const totalFrames = Math.round(duration * FPS);
    const imgCache: Record<string, HTMLImageElement> = {};

    
    // Assign a random motion style to each scene for variety
    const sceneMotionStyles: Record<string, any> = {};
    const motionTypes = ['zoom_in', 'zoom_out', 'pan_right', 'pan_left', 'diagonal_br', 'diagonal_tr'];
    
    for (const scene of scenes) {
      sceneMotionStyles[scene.id] = motionTypes[Math.floor(Math.random() * motionTypes.length)];
      if (scene.imageUrl) {

        const img = new (globalThis as any).window.Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); img.src = scene.imageUrl!; });
        imgCache[scene.id] = img;
      }
    }
    const stream = canvas.captureStream(FPS);
    
    // ── FIXED AUDIO CAPTURE (Web Audio API) ──
    if (audioRef.current) {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new ((globalThis as any).window.AudioContext || (globalThis as any).window.webkitAudioContext)();
        }
        
        const ctx = audioContextRef.current;
        if (!audioSourceRef.current) {
          audioSourceRef.current = ctx.createMediaElementSource(audioRef.current);
        }
        
        const destination = ctx.createMediaStreamDestination();
        
        // Clear any previous connections
        audioSourceRef.current.disconnect();
        
        // Connect ONLY to the stream destination for recording, NOT to ctx.destination (speakers)
        audioSourceRef.current.connect(destination);

        const audioTrack = destination.stream.getAudioTracks()[0];
        if (audioTrack) stream.addTrack(audioTrack);
        
        if (ctx.state === 'suspended') await ctx.resume();
      } catch (e) {
        console.warn('[Render] Audio capture initialization failed:', e);
      }
    }

    const chunks: Blob[] = [];
    let selectedMime = '';
    const MediaRecorderClass = (globalThis as any).MediaRecorder;
    if (typeof MediaRecorderClass !== 'undefined') {
      const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4', 'video/quicktime'];
      for (const m of candidates) {
        if (MediaRecorderClass.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }
    }

    const options: any = {};
    if (selectedMime) options.mimeType = selectedMime;
    const mr = MediaRecorderClass ? new MediaRecorderClass(stream, options) : null;
    if (mr) mr.ondataavailable = (e: any) => { if (e.data.size > 0) chunks.push(e.data); };
    
    await new Promise<void>(async (resolve) => {
      if (mr) mr.onstop = () => resolve();
      else resolve();
      if (mr) mr.start();
      
      if (audioRef.current) { 
        audioRef.current.currentTime = 0; 
        audioRef.current.muted = false; // MUST be false for WebAudio to capture!
        await audioRef.current.play(); 
      }

      const renderLoop = () => {
        if (!renderingRef.current) return;
        
        const currentTime = audioRef.current?.currentTime || 0;
        if (currentTime >= duration) {
          if (mr) mr.stop();
          else resolve();
          return;
        }

        const scene = scenes.find(s => currentTime >= s.start && currentTime < s.end) || scenes[scenes.length - 1];
        const denom = (scene.end - scene.start) || 1;
        const prog = Math.max(0, Math.min(1, (currentTime - scene.start) / denom));
        const img = imgCache[scene.id];
        
        ctx.clearRect(0, 0, 720, 1280);
        if ((img as any)?.complete) {
          const motion = sceneMotionStyles[scene.id];
          
          // DRAMATICALLY ENHANCED KEN BURNS (2.5x to 3x more dynamic scale and pans)
          let scale = 1.05;
          let tx = 0;
          let ty = 0;

          if (motion === 'zoom_in') scale = 1.05 + prog * 0.35;
          else if (motion === 'zoom_out') scale = 1.40 - prog * 0.35;
          else if (motion === 'pan_right') { tx = -75 + prog * 150; scale = 1.28; }
          else if (motion === 'pan_left') { tx = 75 - prog * 150; scale = 1.28; }
          else if (motion === 'diagonal_br') { tx = -70 + prog * 140; ty = -70 + prog * 140; scale = 1.28; }
          else if (motion === 'diagonal_tr') { tx = -70 + prog * 140; ty = 70 - prog * 140; scale = 1.28; }

          // ⚡ ZOOM PUNCH Transition (First 15% of scene gets dramatic extra zoom that decays)
          if (selectedEffects.includes('zoom_punch') && prog < 0.15) {
            const punchFactor = (0.15 - prog) / 0.15; // 1 to 0
            scale += punchFactor * 0.35; // Extra 35% scale decay
          }

          ctx.save(); 
          ctx.translate(360 + tx, 640 + ty); 
          ctx.scale(scale, scale);
          
          let aspect = (img as any).naturalWidth / (img as any).naturalHeight;
          if (!aspect || isNaN(aspect)) aspect = 9 / 16;
          
          let dw, dh;
          if (aspect < 720 / 1280) { dw = 720; dh = 720 / aspect; } else { dh = 1280; dw = 1280 * aspect; }
          ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
          ctx.restore();

          // 📺 GLITCH Effect (Chromatic splits and displace strips at random frames)
          if (selectedEffects.includes('glitch') && Math.random() < 0.08) {
            ctx.save();
            const shiftX = (Math.random() - 0.5) * 35;
            ctx.translate(shiftX, 0);
            
            // Draw colorful digital artifacts
            ctx.fillStyle = 'rgba(255, 0, 80, 0.4)';
            ctx.fillRect(Math.random() * 720, Math.random() * 1280, Math.random() * 200 + 100, Math.random() * 15 + 5);
            ctx.fillStyle = 'rgba(0, 243, 255, 0.4)';
            ctx.fillRect(Math.random() * 720, Math.random() * 1280, Math.random() * 200 + 100, Math.random() * 15 + 5);
            ctx.restore();
          }

          // 🎞️ RETRO DUST & Scratches Effect
          if (selectedEffects.includes('dust')) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            // Random specks of white dust
            for (let d = 0; d < 8; d++) {
              ctx.beginPath();
              ctx.arc(Math.random() * 720, Math.random() * 1280, Math.random() * 2 + 1, 0, 2 * Math.PI);
              ctx.fill();
            }
            // Random dark dust and scratch lines
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.lineWidth = Math.random() * 1.5 + 0.5;
            for (let s = 0; s < 2; s++) {
              ctx.beginPath();
              const sx = Math.random() * 720;
              const sy = Math.random() * 1280;
              ctx.moveTo(sx, sy);
              ctx.lineTo(sx + (Math.random() - 0.5) * 40, sy + (Math.random() - 0.5) * 40);
              ctx.stroke();
            }
            ctx.restore();
          }

          // ✨ FLASH CUT Transition (Cinematic white overlay at scene junctions fading quickly)
          if (selectedEffects.includes('flash') && prog < 0.20) {
            ctx.save();
            const flashAlpha = ((0.20 - prog) / 0.20) * 0.75; // Starts at 0.75 opacity decay
            ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
            ctx.fillRect(0, 0, 720, 1280);
            ctx.restore();
          }
        } else {
          ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, 720, 1280);
        }

        setRenderProgress(Math.round((currentTime / duration) * 100));
        requestAnimationFrame(renderLoop);
      };
      
      renderingRef.current = true;
      renderLoop();
    });


    const blob = new Blob(chunks, { type: 'video/webm' });
    setFinalVideoBlob(blob);
    setRendering(false);
    setRenderProgress(100);
    setRendered(true);
    if (audioRef.current && audioContextRef.current && audioSourceRef.current) {
      // Reconnect to speakers for preview
      audioSourceRef.current.disconnect();
      audioSourceRef.current.connect(audioContextRef.current.destination);
    }
  };


  // ── Bottom Sheet height ──
  const SHEET_PEEK = 70; // Sleek minimized tab bar
  const SHEET_FULL = '75vh';


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
            if (activeStage === 'rendering') {
              setActiveStage('editor');
            } else if (selectedSceneId || sheetExpanded) {
              setSelectedSceneId(null);
              setSheetExpanded(false);
            } else {
              onBack();
            }
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

        {audioUrl && scenes.some(s => s.imageUrl) && (
          <button
            onClick={startVideoRender}
            className="px-4 py-2 rounded-2xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-purple-500/30"
          >
            A-Roll <ChevronRight size={12} />
          </button>
        )}
        {(!audioUrl || scenes.every(s => !s.imageUrl)) && <div className="w-16" />}
      </div>

      {/* ── MAIN PREVIEW AREA ── */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        style={{ paddingBottom: sheetExpanded ? SHEET_FULL : `${SHEET_PEEK}px` }}
      >
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.08)_0%,transparent_70%)]" />

        {/* ── EDITOR WORKSPACE ── */}
        <div className="relative w-full h-full flex flex-col items-center justify-between p-4 overflow-hidden gap-4">
          {/* Phone frame (takes top space) */}
          <div className="flex-1 relative w-full flex items-center justify-center min-h-0">
            <div className="relative h-full max-h-[440px] aspect-[9/16] rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] bg-[#0a0a0f] group">
              {activeScene?.imageUrl ? (
                <img
                  key={activeScene.id}
                  src={activeScene.imageUrl}
                  className="w-full h-full object-cover animate-in fade-in duration-700"
                  alt="Scene Preview"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
                  {/* Animated guiding steps depending on what is generated */}
                  {generatingVoice ? (
                    <>
                      <Loader2 className="animate-spin text-purple-400" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Генерация озвучки...</p>
                    </>
                  ) : generatingImages ? (
                    <>
                      <Loader2 className="animate-spin text-purple-400 animate-bounce" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Создание AI-кадров ({imagesProgress}%)...</p>
                    </>
                  ) : !audioUrl ? (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl animate-pulse">
                        📢
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50 leading-relaxed">
                        Шаг 1: Выберите голос на таймлайне ниже
                      </p>
                    </>
                  ) : scenes.every(s => !s.imageUrl) ? (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl animate-bounce">
                          🖼️
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-purple-400 leading-relaxed">
                          Шаг 2: Запустите генерацию изображений на таймлайне
                        </p>
                      </>
                  ) : activeScene?.generating ? (
                    <>
                      <Loader2 className="animate-spin text-purple-400" size={24} />
                      <p className="text-[9px] font-black uppercase tracking-widest text-purple-400/60">Идет создание кадра...</p>
                    </>
                  ) : (
                    <ImageIcon className="text-white/5" size={48} />
                  )}
                </div>
              )}

              {/* Gradient vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

              {/* Mini player */}
              {audioUrl && (
                <div className="absolute bottom-3 inset-x-3 h-12 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/10 flex items-center px-4 gap-3 z-20">
                  <button
                    onClick={() => {
                      if (!audioRef.current) return;
                      if (isPlayingAudio) {
                        audioRef.current.pause();
                        setIsPlayingAudio(false);
                      } else {
                        audioRef.current.play().catch((e: any) => console.error('Play error:', e));
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
              )}

              {/* Scene counter badge */}
              {scenes.length > 0 && (
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 z-20">
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                    {scenes.filter(s => s.imageUrl).length}/{scenes.length} кадров
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── PREMIUM MULTI-TRACK TIMELINE (takes bottom space) ── */}
          <div className="w-full bg-[#0a0a0f]/80 backdrop-blur-md border border-white/5 rounded-3xl p-4 flex flex-col gap-3 select-none shrink-0 z-30 shadow-2xl relative max-w-lg mb-14">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/30 flex items-center gap-1">
                <Layers size={10} className="text-purple-400" /> Студия Монтажа Кадров
              </span>
              {audioUrl && (
                <span className="text-[8px] font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {duration.toFixed(1)}s Видео
                </span>
              )}
            </div>

            {/* Tracks Sidebar & Scrollable Timeline Panel */}
            <div className="flex bg-[#020205] border border-white/5 rounded-2xl overflow-hidden relative min-h-[140px]">
              {/* Left column: fixed track labels */}
              <div className="w-20 shrink-0 flex flex-col bg-[#0a0a0f] border-r border-white/5 z-20">
                <div className="h-10 flex items-center justify-center border-b border-white/[0.03] text-[7px] font-black text-white/40 uppercase tracking-widest">Сюжет</div>
                <div className="h-12 flex items-center justify-center border-b border-white/[0.03] text-[7px] font-black text-white/40 uppercase tracking-widest">Голос</div>
                <div className="h-14 flex items-center justify-center text-[7px] font-black text-white/40 uppercase tracking-widest">Кадры</div>
              </div>

              {/* Right column: scrollable tracks area */}
              <div className="flex-1 overflow-x-auto relative scrollbar-none py-1.5" ref={timelineRef}>
                <div 
                  className="h-full relative select-none cursor-pointer" 
                  style={{ width: `${Math.max(280, duration * 10)}px` }}
                  onClick={handleTimelineClick}
                >
                  {/* Track 1: Сюжет */}
                  <div className="h-9 flex items-center gap-1.5 border-b border-white/[0.03] w-full pr-4 select-none">
                    {!audioUrl ? (
                      <div className="w-full h-7 rounded-lg bg-white/[0.01] border border-dashed border-white/5 flex items-center justify-center">
                        <span className="text-[6px] font-black uppercase tracking-wider text-white/10">Ожидание выбора голоса...</span>
                      </div>
                    ) : (
                      scenes.map((s, i) => (
                        <div
                          key={`timeline_text_${s.id}`}
                          onClick={(e) => { e.stopPropagation(); setSelectedSceneId(s.id); setActiveTab('inspector'); setSheetExpanded(true); }}
                          className={`h-7 rounded-lg border px-2 flex items-center justify-center cursor-pointer transition-all shrink-0 relative ${
                            selectedSceneId === s.id
                              ? 'border-purple-500/50 bg-purple-500/10'
                              : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                          }`}
                          style={{ width: `${Math.max(70, (s.end - s.start) * 10)}px` }}
                        >
                          <span className="text-[7.5px] font-bold text-white/50 truncate max-w-full">{s.text}</span>
                          <span className="absolute bottom-0.5 right-1 text-[5px] font-black text-purple-400/30">#{i + 1}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Track 2: Голос */}
                  <div className="h-11 flex items-center gap-2 border-b border-white/[0.03] w-full select-none">
                    {generatingVoice ? (
                      <div className="w-full h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-1 animate-pulse">
                        <Loader2 size={10} className="animate-spin text-emerald-400" />
                        <span className="text-[6.5px] font-black uppercase tracking-widest text-emerald-400">Идет синтез аудио...</span>
                      </div>
                    ) : !audioUrl ? (
                      <div className="flex gap-2 min-w-max pr-4">
                        {PREMIUM_VOICES.map(v => (
                          <button
                            key={v.voice_id}
                            onClick={(e) => { e.stopPropagation(); setConfirmVoiceId(v.voice_id); }}
                            className="px-2.5 py-1 rounded-lg border text-left transition-all active:scale-95 flex items-center gap-1 bg-white/[0.03] border-white/8 hover:bg-purple-500/10 hover:border-purple-500/30"
                          >
                            <span className="text-[10px]">{v.gender === 'F' ? '👩' : '👨'}</span>
                            <div>
                              <p className="text-[7px] font-black text-white leading-none">{v.name}</p>
                              <p className="text-[5px] text-white/30 uppercase font-black mt-0.5">{v.accent}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="h-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-500/30 flex items-center justify-between px-2.5"
                        style={{ width: `${Math.max(280, duration * 10)}px` }}
                      >
                        <div className="flex items-center gap-1">
                          <Mic size={9} className="text-white animate-pulse" />
                          <span className="text-[7.5px] font-black uppercase tracking-widest text-white">
                            Озвучка: {PREMIUM_VOICES.find(v => v.voice_id === selectedVoice)?.name || 'Sarah'}
                          </span>
                        </div>
                        <span className="text-[6px] font-black text-white/40 uppercase tracking-widest">{duration.toFixed(1)}s</span>
                      </div>
                    )}
                  </div>

                  {/* Track 3: Кадры */}
                  <div className="h-13 flex items-center gap-1.5 w-full pr-4 select-none">
                    {!audioUrl ? (
                      <div className="w-full h-9 rounded-lg bg-white/[0.01] border border-white/5 flex items-center justify-center">
                        <span className="text-[6px] font-black uppercase tracking-wider text-white/10">Ожидание аудио...</span>
                      </div>
                    ) : scenes.every(s => !s.imageUrl) && !generatingImages ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowConfirmImages(true); }}
                        className="h-9 w-full rounded-lg bg-purple-600/80 hover:bg-purple-600 border border-purple-500/30 flex items-center justify-center gap-1 active:scale-95 transition-all text-white font-black uppercase tracking-widest text-[7px] shadow-lg shadow-purple-500/20"
                      >
                        <Wand2 size={9} className="animate-bounce text-yellow-300" />
                        ✨ Сгенерировать изображения (Сразу все)
                      </button>
                    ) : (
                      scenes.map((s, i) => (
                        <div
                          key={`timeline_img_${s.id}`}
                          onClick={(e) => { e.stopPropagation(); setSelectedSceneId(s.id); setActiveTab('inspector'); setSheetExpanded(true); }}
                          className={`h-9 rounded-lg border overflow-hidden cursor-pointer relative transition-all shrink-0 ${
                            selectedSceneId === s.id
                              ? 'border-purple-500 ring-1 ring-purple-500/40 bg-purple-500/5'
                              : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                          }`}
                          style={{ width: `${Math.max(70, (s.end - s.start) * 10)}px` }}
                        >
                          {s.imageUrl ? (
                            <img src={s.imageUrl} className="w-full h-full object-cover animate-in fade-in duration-300" alt="" />
                          ) : s.generating ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-purple-500/5 animate-pulse">
                              <Loader2 size={8} className="animate-spin text-purple-400" />
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white/10 gap-0.5 hover:text-purple-400 transition-colors">
                              <ImageIcon size={9} />
                              <span className="text-[5px] font-black uppercase">Создать</span>
                            </div>
                          )}
                          <div className="absolute top-0.5 left-1 px-1 rounded bg-black/70 border border-white/5 text-[5px] font-black text-white/60">
                            #{i + 1}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Pro Playhead line overlay */}
                  {audioUrl && duration > 0 && (
                    <motion.div 
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 shadow-[0_0_10px_rgba(239,68,68,0.8)] pointer-events-none"
                      style={{ left: `${(currentTime / duration) * 100}%` }}
                    >
                      <div className="absolute top-0 -translate-x-1/2 w-3.5 h-5 bg-red-500 rounded-b-md flex items-center justify-center shadow-lg">
                        <div className="w-px h-2.5 bg-white/30 rounded-full" />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM SHEET ── */}
      <motion.div
        initial={false}
        animate={{ height: sheetExpanded ? SHEET_FULL : `${SHEET_PEEK}px` }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 z-40 bg-[#0e0e14]/95 backdrop-blur-2xl rounded-t-[2rem] border-t border-white/8 flex flex-col overflow-hidden"
        style={{ boxShadow: '0 -20px 60px rgba(0,0,0,0.6)' }}
      >
        {/* Drag handle + tab bar */}
        <div className="shrink-0 px-5 pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none">
          <motion.div 
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.05}
            onDragEnd={(_, info) => {
              if (info.offset.y < -30) setSheetExpanded(true);
              if (info.offset.y > 30) setSheetExpanded(false);
            }}
            className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-3 shadow-lg" 
          />

          <div className="flex gap-1">
            {[
              { id: 'script' as BottomTab, label: 'Сценарий', icon: <FileText size={13} /> },
              { id: 'inspector' as BottomTab, label: 'Инспектор', icon: <Edit3 size={13} /> },
              { id: 'effects' as BottomTab, label: 'Эффекты', icon: <Zap size={13} /> },
            ].map(tab => (
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
        </div>

        {/* Sheet content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2">
          <AnimatePresence mode="wait">
            {/* SCRIPT TAB */}
            {activeTab === 'script' && (
              <motion.div key="script" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2 block">Сценарий Видео</label>
                  <textarea
                    value={editableScript}
                    onChange={e => setEditableScript((e.target as any).value)}
                    rows={5}
                    className="w-full bg-white/[0.04] border border-white/8 rounded-2xl p-4 text-[12px] text-white/70 focus:border-purple-500/50 transition-all resize-none outline-none leading-relaxed placeholder:text-white/20 font-medium"
                    placeholder="Вставьте или отредактируйте ваш сценарий..."
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3 block">Текущий Голос</label>
                  <div className="p-4 rounded-2xl border bg-white/[0.03] border-white/8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-lg">
                        {PREMIUM_VOICES.find(v => v.voice_id === selectedVoice)?.gender === 'F' ? '👩' : '👨'}
                      </div>
                      <div>
                        <p className="text-[12px] font-black text-white">{PREMIUM_VOICES.find(v => v.voice_id === selectedVoice)?.name || 'Sarah'}</p>
                        <p className="text-[8px] text-white/40 uppercase tracking-widest font-black mt-0.5">
                          {PREMIUM_VOICES.find(v => v.voice_id === selectedVoice)?.accent || 'US'} · Активный Голос
                        </p>
                      </div>
                    </div>
                    {audioUrl && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-400 uppercase tracking-wider">
                        Активен
                      </span>
                    )}
                  </div>
                </div>

                {voiceError && (
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400 text-[11px] font-black">{voiceError}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* INSPECTOR TAB */}
            {activeTab === 'inspector' && (
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
                        onChange={e => setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, imagePrompt: (e.target as any).value } : s))}
                        rows={3}
                        className="w-full bg-white/[0.04] border border-white/8 rounded-2xl p-4 text-[11px] text-white/60 focus:border-purple-500/40 outline-none leading-relaxed resize-none placeholder:text-white/20 font-medium"
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
                      
                      <label className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/8 text-white/70 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-white/[0.06] justify-center items-center flex">
                        <Upload size={14} />
                        Своё фото
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = (e.target as any).files?.[0];
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
                      <p className="text-[12px] text-white/50 leading-relaxed font-medium">{selectedScene.text}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-4 opacity-30">
                    <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-white/30 flex items-center justify-center">
                      <Layers size={22} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-center">
                      Выберите сцену<br />из таймлайна выше
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* EFFECTS TAB */}
            {activeTab === 'effects' && (
              <motion.div key="effects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3 block">Пост-эффекты TikTok</label>
                  <div className="space-y-2">
                    {(['kenburns', 'zoom_punch', 'glitch', 'dust', 'flash'] as PostEffect[]).map(fx => (
                      <button
                        key={fx}
                        onClick={() => setSelectedEffects(p => p.includes(fx) ? p.filter(f => f !== fx) : [...p, fx])}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all active:scale-[0.98] ${selectedEffects.includes(fx) ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/[0.03] border-white/6 text-white/30'}`}
                      >
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide">
                            {fx === 'kenburns' ? '🎬 Ken Burns' : fx === 'zoom_punch' ? '⚡ Zoom Punch' : fx === 'glitch' ? '📺 Glitch' : fx === 'dust' ? '🎞️ Retro Dust' : '✨ Flash Cut'}
                          </p>
                          <p className="text-[9px] mt-0.5 opacity-60 font-medium">
                            {fx === 'kenburns' ? 'Медленное кинематографичное движение' : fx === 'zoom_punch' ? 'Резкий зум при смене сцены' : fx === 'glitch' ? 'Цифровые артефакты' : fx === 'dust' ? 'Кинематографическая пыль и царапины' : 'Световая вспышка на стыках сцен'}
                          </p>
                        </div>
                        {selectedEffects.includes(fx) && <Check size={16} className="shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={startVideoRender}
                  disabled={!audioUrl || scenes.every(s => !s.imageUrl)}
                  className="w-full py-5 rounded-[1.5rem] bg-white text-black font-black italic uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                >
                  <Film size={18} /> Собрать A-Roll
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── REDESIGN CONFIRMATION DIALOGUES ── */}
      <AnimatePresence>
        {confirmVoiceId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0f0f15] border border-white/10 rounded-[2rem] p-6 max-w-sm w-full text-center space-y-6 shadow-2xl relative z-[160]"
            >
              <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-2xl">
                🎙️
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase text-white">Выбрать голос?</h3>
                <p className="text-[11px] text-white/40 uppercase tracking-widest leading-relaxed">
                  Использовать голос {PREMIUM_VOICES.find(v => v.voice_id === confirmVoiceId)?.name} для озвучки этого ролика?
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmVoiceId(null)}
                  className="flex-1 py-3.5 rounded-xl border border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/60 active:scale-95 transition-all"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    const vid = confirmVoiceId;
                    setConfirmVoiceId(null);
                    startProductionWithVoice(vid);
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
                >
                  Да, озвучить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showConfirmImages && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0f0f15] border border-white/10 rounded-[2rem] p-6 max-w-sm w-full text-center space-y-6 shadow-2xl relative z-[160]"
            >
              <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-2xl">
                🖼️
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase text-white">Генерировать кадры?</h3>
                <p className="text-[11px] text-white/40 uppercase tracking-widest leading-relaxed">
                  Запустить пакетную генерацию изображений для всех сцен видео?
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmImages(false)}
                  className="flex-1 py-3.5 rounded-xl border border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/60 active:scale-95 transition-all"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    setShowConfirmImages(false);
                    generateAllImages();
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
                >
                  Да, запустить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RENDER OVERLAY ── */}
      <AnimatePresence>
        {activeStage === 'rendering' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#050508]/96 backdrop-blur-2xl flex items-center justify-center p-8"
          >
            {/* ── BACKGROUND LAYER ── */}
            {renderBackgroundUrl && (
              <div className="absolute inset-0 z-0">
                <img src={renderBackgroundUrl} className="w-full h-full object-cover blur-[80px] opacity-40 scale-125" alt="" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#050508]/60 via-[#050508]/90 to-[#050508]" />
              </div>
            )}

            <div className="w-full max-w-sm text-center space-y-10 relative z-10">
              {!renderDone && (
                <div className="space-y-6">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_80px_rgba(168,85,247,0.1)]">
                      <Cpu size={48} className="text-purple-400 animate-pulse" />
                    </div>
                    <svg className="absolute -inset-6 w-44 h-44 -rotate-90">
                      <circle cx="88" cy="88" r="82" stroke="rgba(168,85,247,0.1)" strokeWidth="4" fill="transparent" />
                      <circle cx="88" cy="88" r="82" stroke="#a855f7" strokeWidth="4" fill="transparent"
                        strokeDasharray={515} strokeDashoffset={515 - (515 * renderProgress / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-500" />
                    </svg>
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                      Сборка <span className="text-purple-400">Видео</span>
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 animate-pulse">
                      Финальный монтаж сцен · {renderProgress}%
                    </p>
                  </div>

                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[200px] mx-auto">
                    <motion.div 
                      className="h-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                      animate={{ width: `${renderProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {renderDone && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                    <Check size={32} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Готово к экспорту</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-2">Видео собрано в высоком качестве</p>
                  </div>
                </div>
              )}


              {renderDone && finalVideoBlob && (
                <div className="space-y-4">
                  <div className="relative aspect-[9/16] w-full max-w-[240px] mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                    <video 
                      src={URL.createObjectURL(finalVideoBlob)} 
                      controls 
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
                      onClick={() => onComplete(finalVideoBlob!, scenes.map(s => ({ text: s.text, start: s.start, end: s.end })))}

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
