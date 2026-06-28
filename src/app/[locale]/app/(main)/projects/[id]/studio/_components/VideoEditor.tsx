'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  ArrowLeft, Cpu, Upload, Loader2, Sparkles, Wand2, SkipBack, Play, Pause, VolumeX, Volume2, Mic, Zap,
  Music, Type, Sliders, PlayCircle, Pencil, Clock, Trash2, X
} from 'lucide-react';

import { ProductionManifest } from '@/lib/types/studio';
import { idb } from '@/lib/idb';

// Modular Components (Edits Style)
import { useStudioState, BRollClip, SubtitleClip, TranscriptWord, WhiteboardClip } from '../_hooks/useStudioState';
import { EditorTopBar } from './EditorTopBar';
import { StudioViewport } from './StudioViewport';
import { StudioActionBar } from './StudioActionBar';
import { EditorTimeline } from './EditorTimeline';
import { EditorToolDrawer } from './EditorToolDrawer';
import { EditorCaptionEditor } from './EditorCaptionEditor';
import { CaptionStyleSelector } from './CaptionStyleSelector';
import { StudioModals } from './StudioModals';
import BRollEditorModal, { BRollClipMeta } from '@/components/studio/BRollEditorModal';

interface VideoEditorProps {
  projectId: string;
  aRollUrl: string;
  onBack: () => void;
  onNext?: (
    broll: BRollClip[],
    subs: SubtitleClip[],
    aRollUrl: string | null,
    subPos?: { x: number, y: number },
    subSize?: number,
    subStyle?: number,
    showSubtitles?: boolean,
    subColor?: string,
    subBgColor?: string,
    whiteboard?: WhiteboardClip[],
    aRollSpeed?: number
  ) => Promise<void>;
  manifest?: ProductionManifest | null;
  onFaceless?: () => void;
}

export const VideoEditor = React.memo(({
  projectId, aRollUrl: propARollUrl, onBack, onNext, manifest, onFaceless
}: VideoEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    persistenceLoaded,
    stage, setStage, stageMessage, setStageMessage,
    aRollUrl, setARollUrl, isPlaying, setIsPlaying, isMuted, setIsMuted,
    currentTime, setCurrentTime, aRollDuration, setARollDuration, duration,
    transcript, setTranscript, subtitleClips, setSubtitleClips,
    brollClips, setBrollClips, phrases, setPhrases,
    whiteboardClips, setWhiteboardClips, deleteWhiteboardClip,
    aRollSpeed, setARollSpeed, splitSegmentAtTime,
    transcriptionError, setTranscriptionError, isAnalyzingBroll,
    subtitlePos, setSubtitlePos, subtitleSize, setSubtitleSize, subtitleStyle, setSubtitleStyle, showSubtitles, setShowSubtitles, pxPerSecond, setPxPerSecond,
    subtitleColor, setSubtitleColor, subtitleBgColor, setSubtitleBgColor,
    preFetchedBrolls, setPreFetchedBrolls, pendingBrollPhrases, setPendingBrollPhrases,
    voiceoverUrl, setVoiceoverUrl,
    runTranscriptionAndPhrases, setRawFile, deleteBroll,
    manifest: activeManifest, setManifest
  } = useStudioState(projectId, manifest || null, propARollUrl);

  const [selectedClip, setSelectedClip] = useState<{ id: string; type: 'aroll' | 'broll' | 'whiteboard' | 'subtitle'; } | null>(null);

  const handleSplitSelected = useCallback(() => {
    if (!selectedClip) return;
    
    if (selectedClip.type === 'aroll' || selectedClip.type === 'subtitle') {
      splitSegmentAtTime(currentTime);
      setSelectedClip(null);
    } else if (selectedClip.type === 'broll') {
      setBrollClips(prev => {
        const target = prev.find(c => c.id === selectedClip.id);
        if (!target || currentTime <= target.startTime || currentTime >= target.endTime) return prev;
        
        const b1 = {
          ...target,
          id: `${target.id}_split1_${Date.now()}`,
          endTime: currentTime
        };
        
        const b2 = {
          ...target,
          id: `${target.id}_split2_${Date.now()}`,
          phraseId: `${target.phraseId || target.id}_split2_${Date.now()}`,
          startTime: currentTime
        };
        
        return [...prev.filter(c => c.id !== selectedClip.id), b1, b2].sort((x, y) => x.startTime - y.startTime);
      });
      setSelectedClip(null);
    } else if (selectedClip.type === 'whiteboard') {
      setWhiteboardClips(prev => {
        const target = prev.find(c => c.id === selectedClip.id);
        if (!target || currentTime <= target.startTime || currentTime >= target.endTime) return prev;
        
        const w1 = {
          ...target,
          id: `${target.id}_split1_${Date.now()}`,
          endTime: currentTime
        };
        
        const w2 = {
          ...target,
          id: `${target.id}_split2_${Date.now()}`,
          startTime: currentTime
        };
        
        return [...prev.filter(c => c.id !== selectedClip.id), w1, w2].sort((x, y) => x.startTime - y.startTime);
      });
      setSelectedClip(null);
    }
  }, [selectedClip, currentTime, splitSegmentAtTime, setBrollClips, setWhiteboardClips]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedClip) return;
    
    if (selectedClip.type === 'aroll') {
      const segmentIdx = activeManifest?.segments?.findIndex((s: any) => s.id === selectedClip.id);
      if (segmentIdx === undefined || segmentIdx === -1) return;
      
      const segmentToDelete = activeManifest!.segments[segmentIdx];
      const durationToRemove = segmentToDelete.duration || 4.0;
      
      let accum = 0;
      for (let i = 0; i < segmentIdx; i++) {
        accum += activeManifest!.segments[i].duration || 4.0;
      }
      const startTime = accum;
      const endTime = accum + durationToRemove;
      
      setManifest((prev: any) => {
        if (!prev || !prev.segments) return prev;
        return {
          ...prev,
          segments: prev.segments.filter((s: any) => s.id !== selectedClip.id)
        };
      });
      
      setSubtitleClips(prev => 
        prev.filter(c => !(c.startTime >= startTime - 0.1 && c.endTime <= endTime + 0.1))
            .map(c => {
              if (c.startTime >= endTime - 0.1) {
                return { ...c, startTime: c.startTime - durationToRemove, endTime: c.endTime - durationToRemove };
              }
              return c;
            })
      );
      
      setBrollClips(prev => 
        prev.filter(c => !(c.startTime >= startTime - 0.1 && c.endTime <= endTime + 0.1))
            .map(c => {
              if (c.startTime >= endTime - 0.1) {
                return { ...c, startTime: c.startTime - durationToRemove, endTime: c.endTime - durationToRemove };
              }
              return c;
            })
      );
      
      setWhiteboardClips(prev => 
        prev.filter(c => !(c.startTime >= startTime - 0.1 && c.endTime <= endTime + 0.1))
            .map(c => {
              if (c.startTime >= endTime - 0.1) {
                return { ...c, startTime: c.startTime - durationToRemove, endTime: c.endTime - durationToRemove };
              }
              return c;
            })
      );
    } else if (selectedClip.type === 'broll') {
      deleteBroll(selectedClip.id);
    } else if (selectedClip.type === 'whiteboard') {
      deleteWhiteboardClip(selectedClip.id);
    } else if (selectedClip.type === 'subtitle') {
      setSubtitleClips(prev => prev.filter(c => c.id !== selectedClip.id));
    }
    
    setSelectedClip(null);
  }, [selectedClip, activeManifest, setManifest, setSubtitleClips, setBrollClips, setWhiteboardClips, deleteBroll, deleteWhiteboardClip]);

  // Sync HTML5 video playback rate with A-roll speed factor
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      (v as any).playbackRate = aRollSpeed;
    }
  }, [aRollSpeed, isPlaying, aRollUrl]);

  const [activeTool, setActiveTool] = useState<'captions' | 'broll' | 'whiteboard' | 'audio' | 'style' | 'voice' | 'filters' | 'text' | null>(null);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [subtitleEditorOpen, setSubtitleEditorOpen] = useState(false);
  const [editingSubtitleId, setEditingSubtitleId] = useState<string | null>(null);
  const [subtitleEditText, setSubtitleEditText] = useState('');
  const [phrasePickerOpen, setPhrasePickerOpen] = useState(false);
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null);
  const [brollModalOpen, setBrollModalOpen] = useState(false);
  const [activeBrollPrompt, setActiveBrollPrompt] = useState('');
  const [activeBrollPhraseId, setActiveBrollPhraseId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-Broll States
  const [isAutoGeneratingBroll, setIsAutoGeneratingBroll] = useState(false);
  const [editingBrollClip, setEditingBrollClip] = useState<BRollClipMeta | null>(null);
  const [autoGenProgress, setAutoGenProgress] = useState('');

  // Auto-Whiteboard States
  const [isAutoGeneratingWhiteboard, setIsAutoGeneratingWhiteboard] = useState(false);
  const [editingWhiteboardClipId, setEditingWhiteboardClipId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const editingWhiteboardClip = useMemo(() => {
    if (!editingWhiteboardClipId) return null;
    const clip = whiteboardClips.find(c => c.id === editingWhiteboardClipId);
    if (!clip) return null;
    const wordsInRange = transcript.filter(w => {
      return (w.start >= clip.startTime - 0.2 && w.start <= clip.endTime + 0.2) ||
             (w.end >= clip.startTime - 0.2 && w.end <= clip.endTime + 0.2) ||
             (w.start <= clip.startTime && w.end >= clip.endTime);
    });
    const spokenText = wordsInRange.map(w => w.text).join(' ').trim();
    return { ...clip, spokenText };
  }, [editingWhiteboardClipId, whiteboardClips, transcript]);

  // --- ACTIONS ---

  const downloadAndCache = useCallback(async (targetUrl: string, clipId: string) => {
    try {
      const res = await fetch(targetUrl);
      const blob = await res.blob();
      await idb.set(`broll_file_${clipId}`, blob);
      const localUrl = URL.createObjectURL(blob);
      setBrollClips(prev => prev.map(c => c.id === clipId ? { ...c, url: localUrl } : c));
    } catch (e) { console.error('[Editor] B-roll cache failed:', e); }
  }, [setBrollClips]);

  const handleAutoGenerateBrolls = async () => {
    if (subtitleClips.length === 0) return;
    setIsAutoGeneratingBroll(true);
    setAutoGenProgress('Анализ текста...');
    try {
      const res = await fetch('/api/ai/auto-broll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitles: subtitleClips })
      });
      if (!res.ok) throw new Error('API failed');

      const data = await res.json();
      const brolls = data.brolls || [];

      if (brolls.length === 0) {
        (globalThis as any).alert('ИИ не нашёл подходящих моментов. Попробуйте записать более динамичное видео.');
        setIsAutoGeneratingBroll(false);
        return;
      }

      const parseTimestamp = (ts: any): number => {
        if (typeof ts === 'number') return ts;
        if (!ts) return 0;
        const str = String(ts).trim();
        const parts = str.split(':');
        // Supports "MM:SS.mmm", "HH:MM:SS", plain seconds
        if (parts.length === 2) return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
        if (parts.length === 3) return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
        return parseFloat(str) || 0;
      };

      // Place placeholders — no stock fetch; user confirms via double-tap on timeline
      const ts = Date.now();
      const placeholders = brolls.map((pb: any, index: number) => {
        const id = `br_${ts}_${index}`;
        // Prefer new fields, fall back to old field names for compatibility
        const searchQ     = pb.search_query    || pb.broll_topic || pb.scene_concept || 'cinematic shot';
        const visualP     = pb.visual_prompt   || pb.broll_topic || '';
        const sceneC      = pb.scene_concept   || pb.broll_topic || 'AI Scene';
        const anchorT     = pb.anchor_type     || undefined;
        const startTime   = parseTimestamp(pb.time_start || pb.timestamp_start);
        const endTime     = parseTimestamp(pb.time_end   || pb.timestamp_end);

        return {
          id,
          phraseId:     id,
          url:          '',
          label:        sceneC.slice(0, 24),
          prompt:       searchQ.split(/\s+/).slice(0, 3).join(' '), // ≤3 words for Pexels
          visual_prompt: visualP,
          scene_concept: sceneC,
          anchor_type:   anchorT,
          startTime,
          endTime,
          track: 1
        };
      });

      setBrollClips(placeholders);
      setAutoGenProgress('');
      setIsAutoGeneratingBroll(false);
      setStage('editing');
    } catch (err: any) {
      console.error('[Auto-Broll] Failed:', err);
      (globalThis as any).alert(`Ошибка автогенерации B-roll: ${err.message || err}`);
      setIsAutoGeneratingBroll(false);
    }
  };

  const handleAutoGenerateWhiteboards = async () => {
    if (subtitleClips.length === 0) return;
    setIsAutoGeneratingWhiteboard(true);
    setAutoGenProgress('Анализ текста...');
    try {
      const res = await fetch('/api/ai/auto-whiteboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitles: subtitleClips })
      });
      if (!res.ok) throw new Error('API failed');

      const data = await res.json();
      const clips = data.clips || [];

      if (clips.length === 0) {
        (globalThis as any).alert('ИИ не нашёл подходящих моментов. Попробуйте записать более содержательное видео.');
        setIsAutoGeneratingWhiteboard(false);
        return;
      }

      const parseTimestamp = (ts: any): number => {
        if (typeof ts === 'number') return ts;
        if (!ts) return 0;
        const str = String(ts).trim();
        const parts = str.split(':');
        if (parts.length === 2) return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
        if (parts.length === 3) return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
        return parseFloat(str) || 0;
      };

      const ts = Date.now();
      const rawPlaceholders = clips.map((pc: any, index: number) => {
        const id = `wb_${ts}_${index}`;
        const prompt = pc.prompt || 'simple line art drawing';
        const label = pc.label || 'Whiteboard Clip';
        const startTime = parseTimestamp(pc.time_start || pc.timestamp_start);
        const endTime = parseTimestamp(pc.time_end || pc.timestamp_end);

        return {
          id,
          url: '',
          label: label.slice(0, 24),
          prompt,
          startTime,
          endTime,
          track: 2,
          status: 'pending'
        };
      });

      // Resolve overlaps on generated placeholders to prevent timeline stacking
      const placeholders = rawPlaceholders.sort((a: any, b: any) => a.startTime - b.startTime);
      for (let i = 0; i < placeholders.length; i++) {
        const current = placeholders[i];
        if (current.startTime < 0) current.startTime = 0;
        if (current.endTime <= current.startTime) current.endTime = current.startTime + 3.0;
        
        if (i < placeholders.length - 1) {
          const next = placeholders[i + 1];
          if (current.endTime > next.startTime) {
            if (next.startTime - current.startTime >= 2.0) {
              current.endTime = next.startTime;
            } else {
              next.startTime = current.endTime;
              next.endTime = Math.max(next.endTime, next.startTime + 2.0);
            }
          }
        }
      }

      setWhiteboardClips(placeholders);
      setAutoGenProgress('');
      setIsAutoGeneratingWhiteboard(false);
      setStage('editing');

      // Trigger actual whiteboard background video generation for each placeholder
      placeholders.forEach(async (clip: any) => {
        try {
          setWhiteboardClips(prev => prev.map(c => c.id === clip.id ? { ...c, status: 'generating' } : c));
          const res = await fetch('/api/ai/whiteboard-gen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clipId: clip.id,
              projectId,
              prompt: clip.prompt,
              duration: clip.endTime - clip.startTime,
              speed: 1.0
            })
          });
          if (!res.ok) throw new Error('API failed');
          const data = await res.json();
          setWhiteboardClips(prev => prev.map(c => c.id === clip.id ? {
            ...c,
            url: data.videoUrl,
            imageUrl: data.imageUrl,
            status: 'completed'
          } : c));
        } catch (err) {
          console.error(`[Auto-Whiteboard] Background gen failed for clip ${clip.id}:`, err);
          setWhiteboardClips(prev => prev.map(c => c.id === clip.id ? { ...c, status: 'failed' } : c));
        }
      });
    } catch (err: any) {
      console.error('[Auto-Whiteboard] Failed:', err);
      (globalThis as any).alert(`Ошибка автогенерации Whiteboard: ${err.message || err}`);
      setIsAutoGeneratingWhiteboard(false);
    }
  };


  const togglePlay = useCallback(() => {
    const v = videoRef.current as any;
    if (!v || !aRollUrl) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [aRollUrl]);

  const onSeek = useCallback((time: number) => {
    setCurrentTime(time);
    const v = videoRef.current as any;
    if (v) {
        v.currentTime = time;
    }
  }, [setCurrentTime]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target as any).files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setARollUrl(url);
      setRawFile(file);
      idb.set(`video_file_${projectId}`, file);
      setStage('transcribing');
      setTranscriptionError(null);
      runTranscriptionAndPhrases(true);
    }
  };

  const openBRollHunterForClip = (phraseId: string, prompt: string) => {
    setActiveBrollPhraseId(phraseId);
    setActiveBrollPrompt(prompt);
    setBrollModalOpen(true);
  };

  const handleCaptionClick = useCallback((id: string) => {
    setSelectedCaptionId(id);
    setActiveTool('captions');
  }, []);

  const handleBRollSelect = (url: string, label?: string) => {
    if (activeBrollPhraseId) {
      const brollId = `br_${Date.now()}`;

      setBrollClips(prev => {
        const existingIdx = prev.findIndex(c => c.phraseId === activeBrollPhraseId || c.id === `br-${activeBrollPhraseId}`);
        if (existingIdx !== -1) {
          const clipId = prev[existingIdx].id;
          downloadAndCache(url, clipId);
          const next = [...prev];
          next[existingIdx] = { ...next[existingIdx], url, track: 0 };
          return next;
        } else {
          const phrase = phrases.find(p => p.id === activeBrollPhraseId);
          const clipId = brollId;
          downloadAndCache(url, clipId);
          return [...prev, {
            id: clipId, phraseId: activeBrollPhraseId, url,
            label: label || phrase?.text.slice(0, 20) || 'AI Scene',
            prompt: phrase?.text || '',
            startTime: phrase?.start || currentTime,
            endTime: (phrase?.end || currentTime + 3),
            track: 0,
          }];
        }
      });
    }
    setBrollModalOpen(false);
    setActiveBrollPhraseId(null);
    setStage('editing');
  };

  const handleBrollPromptSelect = useCallback((clipId: string, videoUrl: string, label?: string, speed?: number) => {
    setBrollClips(prev => prev.map(c => {
      if (c.id !== clipId) return c;
      downloadAndCache(videoUrl, clipId);
      return { ...c, url: videoUrl, label: label?.slice(0, 20) || c.label, speed: speed || c.speed || 1.0 };
    }));
  }, [downloadAndCache, setBrollClips]);

  const startRecording = async () => {
    try {
      const nav = globalThis.navigator as any;
      if (!nav || !nav.mediaDevices) return;
      const stream = await nav.mediaDevices.getUserMedia({ audio: true });
      const mr = new (globalThis as any).MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e: any) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setVoiceoverUrl(url);
        setIsMuted(true);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch (err) {
      console.error('Recording failed:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSwapPhrase = (word: TranscriptWord) => {
    if (!editingPhraseId) return;
    setPhrases(prev => prev.map(p => p.id === editingPhraseId ? {
      ...p, text: word.text, start: word.start, end: word.end
    } : p));
    setPhrasePickerOpen(false);
    setEditingPhraseId(null);
  };

  if (!persistenceLoaded) {
    return (
      <div className="flex-1 bg-[#05050a] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="relative z-10 flex flex-col items-center gap-8">
          <div className="w-24 h-24 rounded-[2.5rem] bg-white/[0.03] border border-white/10 flex items-center justify-center relative">
            <Zap size={48} className="text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
            Viral <span className="text-purple-500">Engine</span>
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-black text-white h-full max-h-[100dvh] relative overflow-hidden select-none">
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />

      {/* FOUNDATION SELECTION */}
      <AnimatePresence>
        {!aRollUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-[#050508] flex flex-col items-center justify-center px-8">
            <div className="w-full max-w-md space-y-8 text-center">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Choose Foundation</h2>
              <div className="grid gap-4">
                <button onClick={() => (fileInputRef.current as any)?.click()} className="p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-purple-500 transition-all flex flex-col items-center gap-4">
                  <Upload size={32} />
                  <span className="block font-black uppercase">Upload A-Roll</span>
                </button>
                <button onClick={() => onFaceless?.()} className="p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-blue-500 transition-all flex flex-col items-center gap-4">
                  <Cpu size={32} />
                  <span className="block font-black uppercase">AI Faceless Mode</span>
                </button>
              </div>
              <button onClick={onBack} className="text-[10px] font-black uppercase text-white/20 tracking-widest">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EditorTopBar 
        onBack={onBack} 
        isExporting={isExporting}
        onExport={async () => {
          if (isExporting) return;
          setIsExporting(true);
          try {
            await onNext?.(
              brollClips,
              subtitleClips,
              aRollUrl,
              subtitlePos,
              subtitleSize,
              subtitleStyle,
              showSubtitles,
              subtitleColor,
              subtitleBgColor,
              whiteboardClips,
              aRollSpeed
            );
          } catch (e) {
            console.error('[VideoEditor] Export failed:', e);
          } finally {
            setIsExporting(false);
          }
        }} 
      />

      {/* 2. Video Preview (Viewport) */}
      <StudioViewport 
        videoRef={videoRef} aRollUrl={aRollUrl} isMuted={isMuted} isPlaying={isPlaying} setIsPlaying={setIsPlaying} currentTime={currentTime} togglePlay={togglePlay}
        setCurrentTime={setCurrentTime} setARollDuration={setARollDuration}
        brollClips={brollClips} whiteboardClips={whiteboardClips} setBrollClips={setBrollClips} subtitleClips={subtitleClips} subtitlePos={subtitlePos} setSubtitlePos={setSubtitlePos} subtitleSize={subtitleSize} setSubtitleSize={setSubtitleSize}
        onUploadClick={() => (fileInputRef.current as any)?.click()}
        stage={stage} stageMessage={stageMessage} transcriptionError={transcriptionError} heartbeat={0}
        runTranscriptionAndPhrases={runTranscriptionAndPhrases} setStage={setStage} setTranscriptionError={setTranscriptionError} setStageMessage={setStageMessage}
        subtitleStyle={subtitleStyle}
        showSubtitles={showSubtitles}
        voiceoverUrl={voiceoverUrl}
        subtitleColor={subtitleColor}
        subtitleBgColor={subtitleBgColor}
      />


      <StudioActionBar 
        isPlaying={isPlaying}
        isMuted={isMuted}
        currentTime={currentTime}
        duration={duration}
        togglePlay={togglePlay}
        onSeek={onSeek}
        setIsMuted={setIsMuted}
        onSplit={handleSplitSelected}
        selectedClip={selectedClip}
        onDeleteSelected={handleDeleteSelected}
      />


      <EditorTimeline 
        totalDuration={duration}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onSeek={onSeek}
        onScrollStart={() => { if (isPlaying) togglePlay(); }}
        aRollUrl={aRollUrl}
        onSplitSegment={splitSegmentAtTime}
        arollSegments={activeManifest?.segments?.map((s: any, idx: number) => {
            const start = activeManifest.segments.slice(0, idx).reduce((acc: number, curr: any) => acc + (curr.duration || 4.0), 0);
            return {
                id: s.id,
                startTime: start,
                duration: s.duration || 4.0,
                content: s.scriptText || 'А-ролл'
            };
        }) || []}
        selectedClipId={selectedClip?.id || null}
        onSelectClip={(id, type) => {
          if (!id) setSelectedClip(null);
          else setSelectedClip({ id, type });
        }}
        brollClips={brollClips.map(c => ({ id: c.id, type: 'broll', startTime: c.startTime, duration: c.endTime - c.startTime, content: c.url }))}
        subtitleClips={subtitleClips.map(c => ({ id: c.id, type: 'subtitle', startTime: c.startTime, duration: (c.endTime - c.startTime) || 0.5, content: c.text }))}
        whiteboardClips={whiteboardClips.map(c => ({ id: c.id, type: 'whiteboard', startTime: c.startTime, duration: c.endTime - c.startTime, content: c.url }))}
        onCreateBroll={(time) => {
            const id = `br_${Date.now()}`;
            setBrollClips(prev => [...prev, { id, phraseId: id, startTime: time, endTime: time + 3, label: 'New Scene', url: '', prompt: 'cinematic shot', track: 1 }]);
            openBRollHunterForClip(id, 'cinematic shot');
        }}
        onCreateWhiteboard={(time) => {
            const id = `wb_${Date.now()}`;
            const matchingSubs = subtitleClips.filter(c => time >= c.startTime && time <= c.endTime);
            const defaultPrompt = matchingSubs.map(s => s.text).join(' ') || 'simple line art drawing';
            setWhiteboardClips(prev => [...prev, { 
                id, 
                startTime: time, 
                endTime: time + 4, 
                label: 'Скетч вручную', 
                url: '', 
                prompt: defaultPrompt,
                track: 2,
                status: 'pending'
            }]);
            setEditingWhiteboardClipId(id);
        }}
        onCaptionClick={handleCaptionClick}
        onSubtitleTrackClick={() => setActiveTool('captions')}
        pxPerSecond={pxPerSecond}
        onPxPerSecondChange={setPxPerSecond}
        onBrollMove={(id, newStart) => {
            setBrollClips(prev => {
                const clip = prev.find(c => c.id === id);
                if (!clip) return prev;
                const duration = clip.endTime - clip.startTime;
                let finalStart = newStart;
                
                // Collision detection
                prev.forEach(other => {
                    if (other.id === id) return;
                    
                    // If moving forward and hitting someone
                    if (finalStart < other.endTime && finalStart + duration > other.startTime) {
                        // Determine which side we hit
                        if (clip.startTime >= other.endTime) {
                            finalStart = other.endTime; // Snap to right
                        } else if (clip.startTime + duration <= other.startTime) {
                            finalStart = other.startTime - duration; // Snap to left
                        }
                    }
                });

                return prev.map(c => c.id === id ? { ...c, startTime: finalStart, endTime: finalStart + duration } : c);
            });
        }}
        onBrollResize={(id, newDur) => {
            setBrollClips(prev => {
                const clip = prev.find(c => c.id === id);
                if (!clip) return prev;
                let finalDur = newDur;

                // Collision detection for resize (right edge)
                prev.forEach(other => {
                    if (other.id === id) return;
                    if (clip.startTime < other.startTime && clip.startTime + finalDur > other.startTime) {
                        finalDur = other.startTime - clip.startTime;
                    }
                });

                return prev.map(c => c.id === id ? { ...c, endTime: c.startTime + finalDur } : c);
            });
        }}
        onBrollLongPress={(id) => {
            const clip = brollClips.find(c => c.id === id);
            if (clip) {
              const wordsInRange = transcript.filter(w => {
                return (w.start >= clip.startTime - 0.2 && w.start <= clip.endTime + 0.2) ||
                       (w.end >= clip.startTime - 0.2 && w.end <= clip.endTime + 0.2) ||
                       (w.start <= clip.startTime && w.end >= clip.endTime);
              });
              const spokenText = wordsInRange.map(w => w.text).join(' ').trim();
              console.log('[VideoEditor] Spoken words in timeline B-roll time range:', spokenText);

              setEditingBrollClip({
                id: clip.id,
                label: clip.label,
                startTime: clip.startTime,
                endTime: clip.endTime,
                prompt: clip.prompt,
                visual_prompt: clip.visual_prompt,
                url: clip.url,
                spoken_text: spokenText
              });
            }
        }}
        onDeleteBroll={deleteBroll}
        onWhiteboardMove={(id, newStart) => {
            setWhiteboardClips(prev => {
                const clip = prev.find(c => c.id === id);
                if (!clip) return prev;
                const duration = clip.endTime - clip.startTime;
                let finalStart = newStart;
                
                prev.forEach(other => {
                    if (other.id === id) return;
                    if (finalStart < other.endTime && finalStart + duration > other.startTime) {
                        if (clip.startTime >= other.endTime) {
                            finalStart = other.endTime;
                        } else if (clip.startTime + duration <= other.startTime) {
                            finalStart = other.startTime - duration;
                        }
                    }
                });

                return prev.map(c => c.id === id ? { ...c, startTime: finalStart, endTime: finalStart + duration } : c);
            });
        }}
        onWhiteboardResize={(id, newDur) => {
            setWhiteboardClips(prev => {
                const clip = prev.find(c => c.id === id);
                if (!clip) return prev;
                let finalDur = newDur;

                prev.forEach(other => {
                    if (other.id === id) return;
                    if (clip.startTime < other.startTime && clip.startTime + finalDur > other.startTime) {
                        finalDur = other.startTime - clip.startTime;
                    }
                });

                return prev.map(c => c.id === id ? { ...c, endTime: c.startTime + finalDur } : c);
            });
        }}
        onWhiteboardLongPress={(id) => {
            setEditingWhiteboardClipId(id);
        }}
        onDeleteWhiteboard={deleteWhiteboardClip}
      />

      {/* 5. Tool Drawer */}
      <EditorToolDrawer 
        activeTool={activeTool as any}
        onToolSelect={(tool) => {
            setActiveTool(tool as any);
            if (tool !== 'captions') setSelectedCaptionId(null);
        }}
        onClose={() => {
            setActiveTool(null);
            setSelectedCaptionId(null);
        }}
      >
        {activeTool === 'captions' && (
            <CaptionStyleSelector 
                currentStyle={subtitleStyle}
                onSelect={(idx) => {
                    setSubtitleStyle(idx);
                }}
                onClose={() => setActiveTool(null)}
                subtitleColor={subtitleColor}
                setSubtitleColor={setSubtitleColor}
                subtitleBgColor={subtitleBgColor}
                setSubtitleBgColor={setSubtitleBgColor}
            />
        )}
        {activeTool === 'text' && (
            <EditorCaptionEditor 
                subtitleClips={subtitleClips}
                setSubtitleClips={setSubtitleClips}
                currentTime={currentTime}
                onSeek={onSeek}
                onClose={() => {
                    setActiveTool(null);
                    setSelectedCaptionId(null);
                }}
                initialSelectedId={selectedCaptionId}
            />
        )}
        {activeTool === 'broll' && (
            <div className="flex flex-col gap-3 py-4">
                {/* ── AUTO-GENERATE BROLLS ── */}
                <button
                    id="auto-generate-broll-btn"
                    disabled={isAutoGeneratingBroll || subtitleClips.length === 0}
                    onClick={handleAutoGenerateBrolls}
                    className={`w-full relative overflow-hidden rounded-3xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                        isAutoGeneratingBroll
                            ? 'py-5 bg-indigo-600/80'
                            : 'py-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 shadow-xl shadow-purple-900/40 hover:shadow-purple-500/30'
                    }`}
                >
                    {!isAutoGeneratingBroll && (
                        <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] pointer-events-none"
                        />
                    )}
                    {isAutoGeneratingBroll ? (
                        <>
                            <div className="flex items-center gap-3">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                >
                                    <Sparkles size={20} className="text-white/80" />
                                </motion.div>
                                <span className="text-[11px] font-black uppercase tracking-widest text-white/90">
                                    {autoGenProgress || 'Генерация...'}
                                </span>
                            </div>
                            <div className="flex gap-1.5 mt-0.5">
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={i}
                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                                        className="w-1.5 h-1.5 rounded-full bg-white/60"
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <Wand2 size={20} className="text-white" />
                                <span className="text-[13px] font-black uppercase tracking-widest text-white">
                                    Сгенерировать Б-ролл
                                </span>
                            </div>
                            <span className="text-[9px] text-white/50 font-bold uppercase tracking-[0.2em]">
                                ИИ-режиссёр выберет моменты из субтитров
                            </span>
                        </>
                    )}
                </button>

                {/* ── GENERATED CLIPS LIST ── */}
                {brollClips.length > 0 && (
                    <div className="space-y-1.5">
                        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/25 px-1 pt-1">
                            Б-ролл на таймлайне ({brollClips.length})
                        </p>
                        <div className="space-y-2 max-h-44 overflow-y-auto no-scrollbar">
                            {brollClips.map((clip) => (
                                <div
                                    key={clip.id}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] group"
                                >
                                    {/* Thumbnail */}
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex-shrink-0 overflow-hidden border border-white/8">
                                        {clip.url ? (
                                            <video
                                                src={clip.url}
                                                muted
                                                playsInline
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Sparkles size={14} className="text-purple-400/50 animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black text-white/80 truncate leading-tight">
                                            {clip.label}
                                        </p>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Clock size={8} className="text-white/25" />
                                            <span className="text-[8px] text-white/30 font-bold tabular-nums">
                                                {clip.startTime.toFixed(1)}s – {clip.endTime.toFixed(1)}s
                                            </span>
                                        </div>
                                    </div>
                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {/* Edit button */}
                                        <button
                                            onClick={() => {
                                                const wordsInRange = transcript.filter(w => {
                                                    return (w.start >= clip.startTime - 0.2 && w.start <= clip.endTime + 0.2) ||
                                                           (w.end >= clip.startTime - 0.2 && w.end <= clip.endTime + 0.2) ||
                                                           (w.start <= clip.startTime && w.end >= clip.endTime);
                                                });
                                                const spokenText = wordsInRange.map(w => w.text).join(' ').trim();
                                                console.log('[VideoEditor] Spoken words in sidebar B-roll time range:', spokenText);

                                                setEditingBrollClip({
                                                    id: clip.id,
                                                    label: clip.label,
                                                    startTime: clip.startTime,
                                                    endTime: clip.endTime,
                                                    prompt: clip.prompt,
                                                    visual_prompt: clip.visual_prompt,
                                                    url: clip.url,
                                                    spoken_text: spokenText
                                                });
                                            }}
                                            className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 active:scale-90 transition-all hover:bg-purple-500/20"
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        {/* Delete button */}
                                        <button
                                            onClick={() => {
                                                if ((globalThis as any).confirm?.('Вы уверены, что хотите удалить этот Б-ролл?')) {
                                                    deleteBroll(clip.id);
                                                }
                                            }}
                                            className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 active:scale-90 transition-all hover:bg-red-500/20"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── MANUAL SINGLE HUNT ── */}
                <button 
                    onClick={() => {
                        const firstEmpty = brollClips.find(c => !c.url);
                        if (firstEmpty) openBRollHunterForClip(firstEmpty.phraseId || firstEmpty.id, firstEmpty.prompt);
                        else {
                            const id = `br_${Date.now()}`;
                            setBrollClips(prev => [...prev, { id, phraseId: id, startTime: currentTime, endTime: currentTime + 3, label: 'AI Moment', url: '', prompt: 'cinematic shot', track: 1 }]);
                            openBRollHunterForClip(id, 'cinematic shot');
                        }
                    }}
                    className="w-full py-5 bg-purple-500/10 border border-purple-500/20 rounded-3xl flex flex-col items-center gap-1.5 shadow-lg shadow-purple-500/10 active:scale-95 transition-all hover:bg-purple-500/15"
                >
                    <Sparkles size={20} className="text-purple-400" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-purple-400">Найти Сцену</span>
                    <span className="text-[9px] text-white/30 font-bold uppercase tracking-[0.15em]">Один клип вручную</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                    <button className="p-5 bg-white/5 border border-white/5 rounded-3xl flex flex-col items-center gap-2 opacity-40">
                        <Upload size={18} />
                        <span className="text-[9px] font-bold uppercase">Загрузить</span>
                    </button>
                    <button 
                        onClick={() => setActiveTool(null)}
                        className="p-5 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center gap-2 text-white/50 active:scale-95 transition-all hover:text-white hover:bg-white/8"
                    >
                        <Zap size={18} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Закрыть</span>
                    </button>
                </div>
            </div>
        )}
        {activeTool === 'whiteboard' && (
            <div className="flex flex-col gap-3 py-4">
                {/* ── AUTO-GENERATE WHITEBOARDS ── */}
                <button
                    id="auto-generate-whiteboard-btn"
                    disabled={isAutoGeneratingWhiteboard || subtitleClips.length === 0}
                    onClick={handleAutoGenerateWhiteboards}
                    className={`w-full relative overflow-hidden rounded-3xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                        isAutoGeneratingWhiteboard
                            ? 'py-5 bg-purple-600/80'
                            : 'py-6 bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 shadow-xl shadow-purple-900/40 hover:shadow-purple-500/30'
                    }`}
                >
                    {!isAutoGeneratingWhiteboard && (
                        <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] pointer-events-none"
                        />
                    )}
                    {isAutoGeneratingWhiteboard ? (
                        <>
                            <div className="flex items-center gap-3">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                >
                                    <Sparkles size={20} className="text-white/80" />
                                </motion.div>
                                <span className="text-[11px] font-black uppercase tracking-widest text-white/90">
                                    {autoGenProgress || 'Анализ...'}
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <Wand2 size={20} className="text-white" />
                                <span className="text-[13px] font-black uppercase tracking-widest text-white">
                                    Создать Whiteboard
                                </span>
                            </div>
                            <span className="text-[9px] text-white/50 font-bold uppercase tracking-[0.2em]">
                                ИИ разобьет сценарий на рисованные сцены
                            </span>
                        </>
                    )}
                </button>

                {/* ── WHITEBOARD CLIPS LIST ── */}
                {whiteboardClips.length > 0 && (
                    <div className="space-y-1.5">
                        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/25 px-1 pt-1">
                            Рисунки на таймлайне ({whiteboardClips.length})
                        </p>
                        <div className="space-y-2 max-h-44 overflow-y-auto no-scrollbar">
                            {whiteboardClips.map((clip) => (
                                <div
                                    key={clip.id}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] group"
                                >
                                    {/* Thumbnail / Status */}
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex-shrink-0 overflow-hidden border border-white/8 flex items-center justify-center">
                                        {clip.imageUrl ? (
                                            <img
                                                src={clip.imageUrl}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : clip.status === 'generating' ? (
                                            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                        ) : (
                                            <Pencil size={14} className="text-purple-400/50" />
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black text-white/80 truncate leading-tight">
                                            {clip.label}
                                        </p>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Clock size={8} className="text-white/25" />
                                            <span className="text-[8px] text-white/30 font-bold tabular-nums">
                                                {clip.startTime.toFixed(1)}s – {clip.endTime.toFixed(1)}s
                                            </span>
                                        </div>
                                    </div>
                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {/* Edit button */}
                                        <button
                                            onClick={() => {
                                                setEditingWhiteboardClipId(clip.id);
                                            }}
                                            className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 active:scale-90 transition-all hover:bg-purple-500/20"
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        {/* Delete button */}
                                        <button
                                            onClick={() => {
                                                if ((globalThis as any).confirm?.('Вы уверены, что хотите удалить этот скетч?')) {
                                                    deleteWhiteboardClip(clip.id);
                                                }
                                            }}
                                            className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 active:scale-90 transition-all hover:bg-red-500/20"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── MANUAL WHITEBOARD ADD ── */}
                <button 
                    onClick={() => {
                        const id = `wb_${Date.now()}`;
                        const matchingSubs = subtitleClips.filter(c => currentTime >= c.startTime && currentTime <= c.endTime);
                        const defaultPrompt = matchingSubs.map(s => s.text).join(' ') || 'simple line art drawing';
                        setWhiteboardClips(prev => [...prev, { 
                            id, 
                            startTime: currentTime, 
                            endTime: currentTime + 4, 
                            label: 'Скетч вручную', 
                            url: '', 
                            prompt: defaultPrompt,
                            track: 2,
                            status: 'pending'
                        }]);
                        setEditingWhiteboardClipId(id);
                    }}
                    className="w-full py-5 bg-purple-500/10 border border-purple-500/20 rounded-3xl flex flex-col items-center gap-1.5 shadow-lg shadow-purple-500/10 active:scale-95 transition-all hover:bg-purple-500/15"
                >
                    <Pencil size={20} className="text-purple-400" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-purple-400">Добавить скетч вручную</span>
                    <span className="text-[9px] text-white/30 font-bold uppercase tracking-[0.15em]">В текущее время</span>
                </button>
            </div>
        )}
        {(activeTool === 'filters') && (
            <div className="space-y-6 py-4 px-2 select-none">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Скорость видео спикера (A-Roll Speed)</label>
                        <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-black tabular-nums">
                            {aRollSpeed.toFixed(2)}x
                        </span>
                    </div>
                    
                    {/* Range Slider container */}
                    <div className="relative flex items-center h-12 bg-white/[0.02] border border-white/5 rounded-2xl px-4">
                        <input 
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.05"
                            value={aRollSpeed}
                            onChange={(e) => setARollSpeed(Number((e.target as any).value))}
                            className="w-full h-1 accent-purple-500 bg-white/10 rounded-lg cursor-pointer"
                        />
                    </div>
                </div>

                {/* Preset Chips */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Быстрый выбор</label>
                    <div className="flex flex-wrap gap-2">
                        {[1.0, 1.1, 1.15, 1.25, 1.5, 2.0].map((preset) => {
                            const isActive = Math.abs(aRollSpeed - preset) < 0.01;
                            return (
                                <button
                                    key={preset}
                                    onClick={() => setARollSpeed(preset)}
                                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all border ${
                                        isActive 
                                            ? 'bg-purple-500 border-purple-400/30 text-white shadow-lg shadow-purple-500/20' 
                                            : 'bg-white/[0.03] border-white/5 text-white/40 hover:text-white/60 hover:bg-white/[0.05]'
                                    }`}
                                >
                                    {preset === 1.0 ? '1.0x (Обычная)' : `${preset.toFixed(2)}x`}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}
      </EditorToolDrawer>

      {/* 6. Modals (Persistent) */}
      <StudioModals 
        subtitleEditorOpen={subtitleEditorOpen} setSubtitleEditorOpen={setSubtitleEditorOpen} subtitleEditText={subtitleEditText} setSubtitleEditText={setSubtitleEditText} editingSubtitleId={editingSubtitleId} setSubtitleClips={setSubtitleClips} setSelectedClipId={setSelectedClipId}
        phrasePickerOpen={phrasePickerOpen} setPhrasePickerOpen={setPhrasePickerOpen} setEditingPhraseId={setEditingPhraseId} transcript={transcript} handleSwapPhrase={handleSwapPhrase}
        brollModalOpen={brollModalOpen} setBrollModalOpen={setBrollModalOpen} setActiveBrollPhraseId={setActiveBrollPhraseId} setStage={setStage} handleBRollSelect={handleBRollSelect} activeBrollPrompt={activeBrollPrompt} projectId={projectId} preFetchedBrolls={preFetchedBrolls} activeBrollPhraseId={activeBrollPhraseId} brollClips={brollClips} setBrollClips={setBrollClips}
      />

      {/* 7. B-Roll Editor — opens on double-tap of timeline clip */}
      <BRollEditorModal
        clip={editingBrollClip}
        isOpen={editingBrollClip !== null}
        onClose={() => setEditingBrollClip(null)}
        onSelect={handleBrollPromptSelect}
        onDelete={deleteBroll}
      />

      {/* 8. Whiteboard Editor Modal */}
      <AnimatePresence>
        {editingWhiteboardClip && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg rounded-[2.5rem] bg-[#0c0c14] border border-white/10 p-8 space-y-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setEditingWhiteboardClipId(null)}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Настройка скетча (Whiteboard)</h3>
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Whiteboard Animation Node</p>
              </div>

              {/* SKETCH PREVIEW CONTAINER */}
              <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden bg-white/5 flex flex-col items-center justify-center border border-white/10 relative group/preview">
                {editingWhiteboardClip.url ? (
                  <video 
                    src={editingWhiteboardClip.url}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : editingWhiteboardClip.imageUrl ? (
                  <img 
                    src={editingWhiteboardClip.imageUrl} 
                    className="w-full h-full object-contain"
                    alt="Whiteboard sketch preview"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                    {editingWhiteboardClip.status === 'generating' ? (
                      <>
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        <p className="text-xs text-purple-300 font-bold uppercase tracking-wider animate-pulse">ИИ генерирует скетч...</p>
                        <p className="text-[10px] text-white/30 font-medium">Это займет около 10-15 секунд</p>
                      </>
                    ) : editingWhiteboardClip.status === 'failed' ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                          <span className="text-red-400 font-black text-sm">!</span>
                        </div>
                        <p className="text-xs text-red-400 font-bold uppercase tracking-wider">Ошибка генерации</p>
                        <p className="text-[10px] text-white/30 font-medium">Попробуйте изменить промпт и перегенерировать</p>
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-8 h-8 text-purple-400/50 animate-spin" />
                        <p className="text-xs text-purple-300/80 font-bold uppercase tracking-wider">Скетч в очереди...</p>
                        <p className="text-[10px] text-white/30 font-medium">Генерация начнется через мгновение</p>
                      </>
                    )}
                  </div>
                )}
                {(editingWhiteboardClip.url || editingWhiteboardClip.imageUrl) && (
                  <span className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 text-white text-[8px] font-black uppercase tracking-widest pointer-events-none">
                    Preview
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Речевой контекст (субтитры)</label>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-white/70 leading-relaxed italic">
                    "{editingWhiteboardClip.spokenText || 'Контекст отсутствует'}"
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/40">ИИ Промпт для скетча</label>
                  <textarea 
                    readOnly
                    value={editingWhiteboardClip.prompt}
                    className="w-full p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-white/50 focus:outline-none resize-none h-20"
                  />
                </div>

                 <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Уточнения пользователя (дополнение к промпту)</label>
                  <textarea 
                    value={editingWhiteboardClip.userPromptAddition || ''}
                    onChange={(e) => {
                      const val = (e.target as any).value;
                      setWhiteboardClips(prev => prev.map(c => c.id === editingWhiteboardClip.id ? { ...c, userPromptAddition: val } : c));
                    }}
                    placeholder="Например: добавь изображение ракеты на фоне, сделай контуры жирнее..."
                    className="w-full p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-white/20 focus:border-purple-500 focus:outline-none resize-none h-20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Скорость анимации рисования</label>
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold tabular-nums">
                      {(editingWhiteboardClip.speed || 1.0).toFixed(2)}x
                    </span>
                  </div>
                  <div className="relative flex items-center h-10 bg-white/[0.02] border border-white/5 rounded-2xl px-4">
                    <input 
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={editingWhiteboardClip.speed || 1.0}
                      onChange={(e) => {
                        const val = Number((e.target as any).value);
                        setWhiteboardClips(prev => prev.map(c => c.id === editingWhiteboardClip.id ? { ...c, speed: val } : c));
                      }}
                      className="w-full h-1 accent-purple-500 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  onClick={async () => {
                    const clipId = editingWhiteboardClip.id;
                    const finalPrompt = `${editingWhiteboardClip.prompt}${editingWhiteboardClip.userPromptAddition ? `, user addition: ${editingWhiteboardClip.userPromptAddition}` : ''}`;
                    const clipSpeed = editingWhiteboardClip.speed || 1.0;
                    
                    setWhiteboardClips(prev => prev.map(c => c.id === clipId ? { 
                      ...c, 
                      userPromptAddition: editingWhiteboardClip.userPromptAddition,
                      speed: clipSpeed,
                      status: 'generating'
                    } : c));
                    
                    setEditingWhiteboardClipId(null);
                    
                    try {
                      const res = await fetch('/api/ai/whiteboard-gen', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          clipId,
                          projectId,
                          prompt: finalPrompt,
                          duration: editingWhiteboardClip.endTime - editingWhiteboardClip.startTime,
                          speed: clipSpeed
                        })
                      });
                      if (!res.ok) throw new Error('Generation failed');
                      const data = await res.json();
                      
                      setWhiteboardClips(prev => prev.map(c => c.id === clipId ? {
                        ...c,
                        url: data.videoUrl,
                        imageUrl: data.imageUrl,
                        speed: clipSpeed,
                        status: 'completed'
                      } : c));
                    } catch (err) {
                      console.error('Whiteboard gen failed:', err);
                      setWhiteboardClips(prev => prev.map(c => c.id === clipId ? { ...c, status: 'failed' } : c));
                    }
                  }}
                  className="flex-1 py-4 bg-purple-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all text-white flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} /> Перегенерировать
                </button>
                <button 
                  onClick={() => {
                    deleteWhiteboardClip(editingWhiteboardClip.id);
                    setEditingWhiteboardClipId(null);
                  }}
                  className="px-6 py-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
