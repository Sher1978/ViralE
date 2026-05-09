'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Volume2, VolumeX, Type, Film,
  SkipBack, Trash2, ArrowRight, ArrowLeft, X,
  Upload, Sparkles, Loader2, RefreshCw, Check, ChevronRight,
  Mic, FileText, Wand2, Eye, RotateCw, Cpu, Plus
} from 'lucide-react';
import { ProductionManifest } from '@/lib/types/studio';
import BRollModal from '@/components/studio/BRollPickerModal';
import { StudioTimeline } from '@/components/studio/StudioTimeline';
import { storageService } from '@/lib/services/storageService';
import { extractAudioFFmpeg } from '@/lib/ffmpeg-audio';

// тФАтФА Types тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА

type EditorStage = 'empty' | 'transcribing' | 'reviewing_phrases' | 'generating' | 'editing';

interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  accent?: boolean;
}

interface BRollPhrase {
  id: string;
  text: string;
  start: number;
  end: number;
  approved: boolean;
  brollUrl?: string;
}

interface SubtitleClip {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  style: 'minimal' | 'pop' | 'bold';
}

interface BRollClip {
  id: string;
  phraseId?: string;
  url: string;
  label: string;
  prompt: string;
  startTime: number;
  endTime: number;
  track: number;
  offsetX?: number; // -50 to 50 or similar for horizontal shift
}
import { idb } from '@/lib/idb';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

interface VideoEditorProps {
  projectId: string;
  aRollUrl: string;
  onBack: () => void;
  onNext?: (broll: BRollClip[], subs: SubtitleClip[], aRollUrl: string | null) => Promise<void>;
  manifest?: ProductionManifest | null;
  onFaceless?: () => void;
}

// тФАтФА Helper: Mock Transcription тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА

function buildTranscript(manifest: ProductionManifest | null, videoDuration: number): TranscriptWord[] {
  if (!manifest) {
    // Fallback for custom uploads without a script: create a single placeholder word
    return [{ text: "[Редактируйте текст здесь]", start: 0, end: videoDuration }];
  }
  const segments = manifest?.segments?.filter((s: any) => s.scriptText) || [];
  const dur = videoDuration > 0 ? videoDuration : 60;

  if (segments.length === 0) {
    // FALLBACK: Simulate AI recognition if no manifest provided (uploaded video)
    return [
      { text: "Welcome to Viral Engine production.", start: 0, end: dur * 0.2 },
      { text: "This is a demonstration of AI audio analysis.", start: dur * 0.2, end: dur * 0.5 },
      { text: "You can edit these subtitles or swap B-Roll moments.", start: dur * 0.5, end: dur * 0.8 },
      { text: "Start creating your masterpiece now!", start: dur * 0.8, end: dur },
    ];
  }

  const timePerSeg = dur / segments.length;
  return segments.map((s: any, i: number) => ({
    text: s.scriptText,
    start: i * timePerSeg,
    end: (i + 1) * timePerSeg,
  }));
}

function pickAIPhrases(transcript: TranscriptWord[]): BRollPhrase[] {
  if (transcript.length === 0) return [];
  // Pick max 3 phrases across the whole video
  const count = Math.min(transcript.length, 3);
  const step = Math.floor(transcript.length / count);
  return Array.from({ length: count }, (_, i) => {
    const seg = transcript[i * step];
    return {
      id: `phrase_${i}_${Date.now()}`,
      text: seg.text.slice(0, 60),
      start: seg.start,
      end: seg.end,
      approved: true,
    };
  });
}



// тФАтФА B-Roll Preview Sync тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА

const BRollPreview = React.memo(({ url, startTime, currentTime, isPlaying }: { 
  url: string; startTime: number; currentTime: number; isPlaying: boolean;
}) => {
  const vRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = vRef.current;
    if (!v) return;

    // 1. Sync Play/Pause
    if (isPlaying) {
      if (v.paused) v.play().catch(() => {});
    } else {
      if (!v.paused) v.pause();
    }

    // 2. Sync Time (with 150ms tolerance to prevent stuttering)
    const relativeTime = Math.max(0, currentTime - startTime);
    if (Math.abs(v.currentTime - relativeTime) > 0.15) {
      v.currentTime = relativeTime;
    }
  }, [isPlaying, currentTime, startTime]);

  return (
    <video 
      ref={vRef}
      src={url}
      muted
      playsInline
      preload="auto"
      crossOrigin="anonymous"
      className="w-full h-full object-cover relative z-10" 
      onLoadedData={(e) => {
        const target = e.target as HTMLVideoElement;
        target.style.opacity = "1";
        // Initial time sync
        target.currentTime = Math.max(0, currentTime - startTime);
        if (isPlaying) target.play().catch(() => {});
      }}
      style={{ opacity: 0, transition: 'opacity 0.3s ease' }}
    />
  );
});

// тФАтФА Main Component тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА

export const VideoEditor = React.memo(({
  projectId, aRollUrl: propARollUrl, onBack, onNext, manifest: initialManifest, onFaceless
}: VideoEditorProps) => {
  const [manifest, setManifest] = useState<ProductionManifest | null>(initialManifest || null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to extract initial A-Roll
  const getInitialARoll = () => {
    if (propARollUrl) return propARollUrl;
    const rec = initialManifest?.segments?.find((s: any) => s.type === 'user_recording' && s.assetUrl);
    return rec?.assetUrl || initialManifest?.videoUrl || initialManifest?.segments?.[0]?.assetUrl || null;
  };

  const initialUrl = getInitialARoll();

  // Stage machine
  const [stage, setStage] = useState<EditorStage>(initialUrl ? 'transcribing' : 'empty');
  const [stageMessage, setStageMessage] = useState('');

  // Video
  const [aRollUrl, setARollUrl] = useState<string | null>(initialUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [aRollDuration, setARollDuration] = useState(60);
  const [duration, setDuration] = useState(60);
  const [videoSource, setVideoSource] = useState<'teleprompter' | 'upload' | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);

  // Transcript & Subtitles
  const [transcript, setTranscript] = useState<TranscriptWord[]>([]);
  const [subtitleClips, setSubtitleClips] = useState<SubtitleClip[]>([]);

  // B-Roll Phrases (Stage 2)
  const [phrases, setPhrases] = useState<BRollPhrase[]>([]);
  const [phrasePickerOpen, setPhrasePickerOpen] = useState(false);
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null);

  // B-Roll Clips
  const [brollClips, setBrollClips] = useState<BRollClip[]>([]);
  const [brollModalOpen, setBrollModalOpen] = useState(false);
  const [activeBrollPrompt, setActiveBrollPrompt] = useState('');
  const [activeBrollPhraseId, setActiveBrollPhraseId] = useState<string | null>(null);
  const [preFetchedBrolls, setPreFetchedBrolls] = useState<Record<string, any[]>>({}); // Cache for pre-fetched B-rolls
  const [generatingPhraseIds, setGeneratingPhraseIds] = useState<Set<string>>(new Set());
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [pendingBrollPhrases, setPendingBrollPhrases] = useState<BRollPhrase[]>([]);

  // Inspector
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [subtitlePos, setSubtitlePos] = useState({ x: 0, y: 0 }); // Global sub position on video canvas
  const [subtitleSize, setSubtitleSize] = useState(16); // Default font size (reduced 3x from 48)
  const [isAnalyzingBroll, setIsAnalyzingBroll] = useState(false);
  const [subtitleEditorOpen, setSubtitleEditorOpen] = useState(false);
  const [editingSubtitleId, setEditingSubtitleId] = useState<string | null>(null);
  const [subtitleEditText, setSubtitleEditText] = useState('');

  // Drag
  const dragRef = useRef<{
    clipId: string; type: 'broll' | 'sub';
    handle: 'move' | 'start' | 'end';
    startX: number; startY: number; // Added startY for long-press threshold
    origStart: number; origEnd: number;
  } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Guard to prevent double-transcription
  const transcriptionStartedRef = useRef(false);
  const persistenceLoadedRef = useRef(false);

  // тФАтФА Persistence: Save/Load local draft тФАтФА
  useEffect(() => {
    if (!projectId || persistenceLoadedRef.current) return;
    
    async function recoverDraft() {
      const key = `viral_editor_draft_${projectId}`;
      const data = await idb.get(key, 'ProjectDrafts');
      
      if (data) {
        try {
          if (data.subtitleClips) setSubtitleClips(data.subtitleClips);
          if (data.transcript) setTranscript(data.transcript);
          // 🚀 Optimization: Recover stage if we have content. 
          // If we have subtitles, we are definitely in 'editing' stage.
          if (data.subtitleClips && data.subtitleClips.length > 0) {
            setStage('editing');
            transcriptionStartedRef.current = true; // Block auto-transcription
          } else if (data.stage) {
            setStage(data.stage);
          }
          if (data.subtitlePos) setSubtitlePos(data.subtitlePos);
          if (data.subtitleSize) setSubtitleSize(data.subtitleSize);
          if (data.aRollUrl && !data.aRollUrl.startsWith('blob:')) {
            setARollUrl(data.aRollUrl);
          }
        } catch (e) { console.error('Failed to parse draft:', e); }
      }
      
      // RECOVER VIDEO FILE FROM IDB (Independent of JSON draft)
      try {
        const cachedFile = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
        if (cachedFile instanceof Blob) {
          console.log('[Editor] Recovered video file from MediaBuffer');
          const url = URL.createObjectURL(cachedFile);
          setARollUrl(url);
          setRawFile(cachedFile as File);
        }
      } catch (e) { console.error('Failed to recover from IDB:', e); }

      // RECOVER B-ROLLS FROM IDB
      if (data?.brollClips) {
        const restoredClips = await Promise.all(data.brollClips.map(async (clip: BRollClip) => {
          try {
            const blob = await idb.get(`broll_file_${clip.id}`, 'MediaBuffer');
            if (blob instanceof Blob) {
              return { ...clip, url: URL.createObjectURL(blob) };
            }
          } catch (e) { console.warn('Failed to restore B-roll blob:', clip.id); }
          return clip;
        }));
        setBrollClips(restoredClips);
      }
      
      persistenceLoadedRef.current = true;
    }
    
    recoverDraft();
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !persistenceLoadedRef.current) return;
    const key = `viral_editor_draft_${projectId}`;
    const state = { aRollUrl, brollClips, subtitleClips, transcript, stage, subtitlePos, subtitleSize };
    idb.set(key, state, 'ProjectDrafts');
  }, [projectId, aRollUrl, brollClips, subtitleClips, transcript, stage]);

  // Separate effect for heavy file persistence
  useEffect(() => {
    if (!projectId || !rawFile || !persistenceLoadedRef.current) return;
    
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);

    // Only save if it's a new file (we can use name/size as a weak proxy for "same file")
    const saveFile = async () => {
      try {
        const lastSaved = await idb.get(`video_file_info_${projectId}`, 'ProjectDrafts');
        if (lastSaved?.name === rawFile.name && lastSaved?.size === rawFile.size) return;
        
        // 🚀 CRITICAL: On mobile, wait 5 seconds before doing heavy IDB writes
        // This avoids overlapping with transcription/analysis which happens in the first 30s.
        if (isMobile) {
          console.log('[Editor] Mobile: Delaying background file persistence by 5s...');
          await delay(5000);
        }

        console.log('[Editor] Saving new video file to MediaBuffer...');
        await idb.set(`video_file_${projectId}`, rawFile, 'MediaBuffer');
        await idb.set(`video_file_info_${projectId}`, { name: rawFile.name, size: rawFile.size }, 'ProjectDrafts');
      } catch (e) {
        console.error('Failed to cache video file:', e);
      }
    };
    
    saveFile();
  }, [projectId, rawFile]);

  // тФАтФА Auto-transcribe: fires when stage=transcribing AND url is ready тФАтФА
  useEffect(() => {
    if (stage === 'transcribing' && aRollUrl && !transcriptionStartedRef.current) {
      console.log('[VideoEditor] Starting auto-transcription for:', aRollUrl);
      transcriptionStartedRef.current = true;
      runTranscriptionAndPhrases();
    }
  }, [stage, aRollUrl]); // Explicit dependencies




  // тФАтФА Auto-confirm countdown тФА REMOVED (B-Roll Hunter should only open manually) тФАтФА

  // тФАтФА Video sync тФАтФА
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !aRollUrl) return;
    v.src = aRollUrl;
    const onTime = () => setCurrentTime(v.currentTime);
    const onLoad = () => {
      const dur = v.duration > 0 ? v.duration : 60;
      setARollDuration(dur);
    };
    const onEnd = () => setIsPlaying(false);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onLoad);
    v.addEventListener('ended', onEnd);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onLoad);
      v.removeEventListener('ended', onEnd);
    };
  }, [aRollUrl]);

  // тФАтФА Dynamic Duration Calculation тФАтФА
  useEffect(() => {
    const maxBrollEnd = brollClips.length > 0 
      ? Math.max(...brollClips.map(c => c.endTime)) 
      : 0;
    
    // Total duration is defined by A-Roll length or the last B-Roll, whichever is later.
    // We keep a 60s minimum for UI comfort unless assets are longer.
    const newDuration = Math.max(aRollDuration, maxBrollEnd, 60);
    if (Math.abs(newDuration - duration) > 0.1) {
      setDuration(newDuration);
    }
  }, [aRollDuration, brollClips, duration]);

  // тФАтФА Drag listeners тФАтФА
  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current || !timelineRef.current) return;
      const { clipId, type, handle, startX, startY, origStart, origEnd } = dragRef.current;
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

      // Cancel long press if moved significantly
      if (longPressTimerRef.current && (Math.abs(clientX - startX) > 10 || Math.abs(clientY - startY) > 10)) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      const rect = timelineRef.current.getBoundingClientRect();
      const dSec = ((clientX - startX) / rect.width) * duration;
      if (type === 'broll') {
        setBrollClips(prev => {
          const idx = prev.findIndex(c => c.id === clipId);
          if (idx === -1) return prev;
          const next = [...prev];
          const clip = { ...next[idx] };
          const len = origEnd - origStart;

          if (handle === 'move') {
            let ns = Math.max(0, origStart + dSec);
            // Allow extending duration by dragging: limit to a reasonable 10min max
            ns = Math.min(ns, 600 - len); 
            // Collision detection
            const other = prev.filter(c => c.id !== clipId);
            other.forEach(o => {
              if (ns + len > o.startTime && origStart + len <= o.startTime) ns = o.startTime - len;
              if (ns < o.endTime && origStart >= o.endTime) ns = o.endTime;
            });
            clip.startTime = ns;
            clip.endTime = ns + len;
          } else if (handle === 'start') {
            let ns = Math.max(0, Math.min(origStart + dSec, clip.endTime - 0.2));
            const other = prev.filter(c => c.id !== clipId);
            other.forEach(o => { if (ns < o.endTime && origStart >= o.endTime) ns = o.endTime; });
            clip.startTime = ns;
          } else {
            let ne = Math.max(clip.startTime + 0.2, Math.min(600, origEnd + dSec));
            const other = prev.filter(c => c.id !== clipId);
            other.forEach(o => { if (ne > o.startTime && origEnd <= o.startTime) ne = o.startTime; });
            clip.endTime = ne;
          }
          next[idx] = clip;
          return next;
        });
      } else {
        setSubtitleClips(prev => prev.map(c => {
          if (c.id !== clipId) return c;
          if (handle === 'move') { 
            const len = origEnd - origStart; 
            const ns = Math.max(0, Math.min(origStart + dSec, duration - len)); 
            return { ...c, startTime: ns, endTime: ns + len }; 
          }
          if (handle === 'start') return { ...c, startTime: Math.max(0, Math.min(origStart + dSec, c.endTime - 0.2)) };
          return { ...c, endTime: Math.max(c.startTime + 0.2, Math.min(600, origEnd + dSec)) };
        }));
      }
    };
    const up = () => { 
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      dragRef.current = null; 
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  }, [duration]);

  // тФАтФА Core Pipeline: Transcription тЖТ Karaoke Subs тЖТ Auto B-Roll placement тФАтФА
  const buildKaraokeClips = (words: TranscriptWord[]): SubtitleClip[] => {
    const final: SubtitleClip[] = [];
    let currentBatch: TranscriptWord[] = [];

    const flushBatch = () => {
      if (currentBatch.length === 0) return;
      const text = currentBatch.map(w => w.text.trim().toUpperCase().replace(/[.,!?;:]/g, '')).join(' ');
      final.push({
        id: `sub-${final.length}-${Date.now()}`,
        startTime: currentBatch[0].start,
        endTime: currentBatch[currentBatch.length - 1].end,
        text,
        style: 'bold'
      });
      currentBatch = [];
    };

    words.forEach((w) => {
      // Split phrase into words if needed (safety fallback)
      const parts = w.text.trim().split(/\s+/);
      
      parts.forEach((p, pIdx) => {
        const wordObj: TranscriptWord = {
          text: p,
          start: w.start + (pIdx * (w.end - w.start) / parts.length),
          end: w.start + ((pIdx + 1) * (w.end - w.start) / parts.length),
          accent: w.accent
        };

        // Rule 1: If word is accented, it must be ALONE. Flush current batch and then this word.
        if (wordObj.accent) {
          flushBatch();
          currentBatch.push(wordObj);
          flushBatch();
          return;
        }

        // Rule 2: Max 3 words per batch.
        if (currentBatch.length >= 3) {
          flushBatch();
        }

        currentBatch.push(wordObj);
      });
    });

    flushBatch();
    return final;
  };

  // Heartbeat for debugging UI freezes
  const [heartbeat, setHeartbeat] = useState(0);
  useEffect(() => {
    let frame: number;
    const tick = () => {
      setHeartbeat(h => (h + 1) % 100);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // ── Native Audio Extraction (OOM Safe, OfflineAudioContext based) ──
  const extractAudioNative = async (videoBlob: Blob): Promise<Blob> => {
    try {
      setStageMessage('Анализ аудио (Native)...');
      const arrayBuffer = await videoBlob.arrayBuffer();
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Resample to 16kHz Mono natively to keep file size very small (~2MB for 60s)
      setStageMessage('Подготовка аудио (Resampling)...');
      const targetSampleRate = 16000;
      const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * targetSampleRate, targetSampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();
      
      const resampledBuffer = await offlineCtx.startRendering();
      
      setStageMessage('Конвертация в WAV...');
      const length = resampledBuffer.length * 2 + 44;
      const buffer = new ArrayBuffer(length);
      const view = new DataView(buffer);
      
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 32 + resampledBuffer.length * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, targetSampleRate, true);
      view.setUint32(28, targetSampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, resampledBuffer.length * 2, true);
      
      let offset = 44;
      const channelData = resampledBuffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
      
      return new Blob([buffer], { type: 'audio/wav' });
    } catch (err: any) {
      console.error('[WebAudio] Extraction failed:', err.name, err.message);
      throw err;
    }
  };

  const runTranscriptionAndPhrases = async (forceFresh = false) => {
    console.log('[Editor] Starting transcription flow, forceFresh:', forceFresh);
    setStageMessage('Анализ аудио...');
    setTranscriptionError(null);
    setSubtitleClips([]); // CLEAR OLD SUBS
    setTranscript([]);     // CLEAR OLD WORDS
    await delay(400);

    let words: TranscriptWord[] = [];
    let transcriptionOk = false;

    // 1. Check manifest (ONLY if not forceFresh)
    if (!forceFresh && manifest?.transcript && Array.isArray(manifest.transcript) && manifest.transcript.length > 0) {
      console.log('[Editor] Using manifest transcript');
      words = manifest.transcript.map((t: any) => ({
        text: t.text,
        start: t.start,
        end: t.end,
        accent: t.accent || false
      }));
      transcriptionOk = true;
    } else if (aRollUrl || rawFile) {
      try {
        setStageMessage('Извлечение аудио...');
        let sourceBlob: Blob | null = rawFile;
        
        if (!sourceBlob && aRollUrl) {
          try {
            // 1. Try fetching the URL (fastest if blob URL is still valid)
            const resp = await fetch(aRollUrl);
            if (resp.ok) {
              sourceBlob = await resp.blob();
            } else {
              throw new Error(`Fetch status ${resp.status}`);
            }
          } catch (e) {
            console.warn('[Editor] aRollUrl fetch failed, trying IndexedDB backup...', e);
            // 2. Fallback to IDB if fetch failed (common for 404 blob URLs on Pixel/Mobile)
            console.warn('[Editor] aRollUrl is unreachable, scanning IndexedDB for local backup...');
            
            // Try specific keys
            const keysToTry = [
              `video_file_${projectId}`, // Explicit file cache
              await idb.get(`pending_upload_${projectId}`, 'ProjectDrafts'), // Pending session
            ].filter(Boolean);

            for (const key of keysToTry) {
              const recovered = await idb.get(key as string, 'MediaBuffer');
              if (recovered instanceof Blob) {
                sourceBlob = recovered;
                console.log(`[Editor] Recovery successful using key: ${key}`);
                break;
              }
            }

            // LAST RESORT: Search for any recent recording for this project in MediaBuffer
            if (!sourceBlob) {
               console.warn('[Editor] Primary keys failed, deep scanning MediaBuffer...');
               const db = await idb.getDB();
               const tx = db.transaction('MediaBuffer', 'readonly');
               const store = tx.objectStore('MediaBuffer');
               const keys = await new Promise<IDBValidKey[]>((res) => {
                  const req = store.getAllKeys();
                  req.onsuccess = () => res(req.result);
               });
               
               const projectKey = keys.find(k => 
                  typeof k === 'string' && 
                  projectId && 
                  k.includes(projectId) && 
                  k.includes('raw_rec')
               );
               if (projectKey && typeof projectKey === 'string') {
                  sourceBlob = await idb.get(projectKey, 'MediaBuffer');
                  console.log('[Editor] Deep scan recovered blob:', projectKey);
               }
            }
          }
        }

        if (!sourceBlob) throw new Error('Не удалось получить файл');

        console.log(`[Editor] sourceBlob size: ${(sourceBlob.size / 1024 / 1024).toFixed(2)} MB, type: ${sourceBlob.type}`);

        // тФАтФА STEP 1: Attempt to use the parallel audio-only recording to skip FFmpeg completely
        let audioBlob: Blob | null = null;
        try {
          const audioRecId = await idb.get(`pending_audio_${projectId}`, 'ProjectDrafts');
          if (audioRecId && typeof audioRecId === 'string') {
            const rawAudio = await idb.get(audioRecId, 'MediaBuffer');
            if (rawAudio instanceof Blob && rawAudio.size > 0) {
              audioBlob = rawAudio;
              console.log('[Editor] Found parallel audio recording, skipping FFmpeg extraction entirely! Size:', (audioBlob.size/1024).toFixed(0), 'KB');
            }
          }
        } catch (e) {
          console.warn('[Editor] Failed to check for parallel audio:', e);
        }

        const sizeMB = sourceBlob.size / 1024 / 1024;
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
        
        if (isMobile) {
          // 🚀 Give system a full second to breathe after mounting
          await delay(1000);
        }

        if (!audioBlob) {
          // 🚀 CRITICAL OOM BYPASS:
          // Honor/Huawei/Xiaomi often have very strict RAM limits per tab.
          // Bypassing FFmpeg and sending raw file directly to Whisper (up to 60MB)
          // is the ONLY way to avoid "Aw, Snap!"
          if (isMobile) {
            console.log(`[Editor] Mobile (${ua}) detected. Using WebAudio API to avoid OOM.`);
            try {
              audioBlob = await extractAudioNative(sourceBlob);
            } catch (err) {
              console.warn('[Editor] Native Audio Extraction Failed, falling back to uploading full video...', err);
            }
          } else {
            audioBlob = await extractAudioFFmpeg(sourceBlob, {
              onProgress: setStageMessage,
            });
          }
        }

        let formData: FormData | null = new FormData();

        if (audioBlob && audioBlob.size > 0 && formData) {
          const mime = audioBlob.type;
          const ext = mime.includes('mp4') ? 'm4a' : mime.includes('wav') ? 'wav' : 'webm';
          formData.append('file', audioBlob as Blob, `audio.${ext}`);
        } else if (sourceBlob && formData) {
          const sizeMB = sourceBlob.size / 1024 / 1024;
          setStageMessage(`Загрузка видео (${sizeMB.toFixed(1)} MB)...`);
          
          if (sizeMB > 25) {
            throw new Error(`Файл слишком большой (${sizeMB.toFixed(1)}MB). Лимит 25MB.`);
          }

          const mime = sourceBlob.type || 'video/mp4';
          const ext  = mime.includes('webm') ? 'webm' : 'mp4';
          formData.append('file', sourceBlob, `video.${ext}`);
        }

        setStageMessage('AI расшифровка голоса...');

        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 90000);

        try {
          if (!formData) throw new Error('Internal Error: FormData lost');
          
          const res = await fetch('/api/ai/transcribe', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          // 🚀 Memory Optimization: formData is heavy, clear it immediately after fetch
          formData = null;
          sourceBlob = null;
          audioBlob = null;

          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: `Server Error ${res.status}` }));
            throw new Error(err.error || 'Ошибка сервера');
          }

          const data = await res.json();
          if (data.transcript) {
            words = data.transcript;
            transcriptionOk = true;
          }
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          throw fetchErr;
        }
      } catch (err: any) {
        console.error('Transcription flow failed:', err);
        setTranscriptionError(err.message || 'Ошибка расшифровки');
      }
    }

    // 2. Handle failure
    if (!transcriptionOk || words.length === 0) {
      const finalError = transcriptionError || 'Не удалось распознать голос. Попробуйте загрузить видео снова или пропустите анализ.';
      setStageMessage('Ошибка анализа аудио');
      setTranscriptionError(finalError);
      return;
    }

    // 3. Process results
    if (words.length > 0) {
      setStageMessage('Генерация субтитров...');
      await delay(300);
      setTranscript(words);
      const subClips = buildKaraokeClips(words);
      setSubtitleClips(subClips);

      // RELEASE UI: Let the user see the timeline immediately
      setStage('editing');
      setStageMessage('');
      setIsAnalyzingBroll(true);

      try {
        console.log('[Editor] Starting semantic scene analysis...');
        const fullText = words.map(w => w.text).join(' ');
        const vsRes = await fetch('/api/ai/visual-script', {
          method: 'POST',
          body: JSON.stringify({ scriptText: fullText })
        });
        
        if (vsRes.ok) {
          const vsData = await vsRes.json();
          const segments = vsData.segments || [];
          console.log('[Editor] AI Visual Script generated:', segments.length, 'scenes');

          const newPhrases: BRollPhrase[] = [];
          const newBrollClips: BRollClip[] = [];

          let wordIdx = 0;
          // USER RULE: Max 3 B-rolls
          segments.slice(0, 3).forEach((seg: any, sIdx: number) => {
            const segText = (seg.text || '').toLowerCase();
            const segWords = segText.split(/\s+/).filter(Boolean);
            if (segWords.length === 0) return;

            const firstWord = words[wordIdx];
            
            const phrase: BRollPhrase = {
              id: `phrase-${sIdx}-${Date.now()}`,
              text: seg.text,
              start: firstWord?.start || 0,
              // USER RULE: Default duration 3s
              end: (firstWord?.start || 0) + 3,
              approved: true,
              brollUrl: ''
            };
            newPhrases.push(phrase);
            wordIdx = Math.min(words.length - 1, wordIdx + 5); // Advance a bit

            newBrollClips.push({
              id: `br-${phrase.id}`,
              phraseId: phrase.id,
              startTime: phrase.start,
              endTime: phrase.end,
              label: seg.visual_metaphor?.slice(0, 30) + '...' || 'AI Scene',
              url: '',
              prompt: seg.pexels_query || seg.ai_prompt || seg.visual_metaphor || seg.text,
              track: 1
            });
          });

          setPhrases(newPhrases);
          setBrollClips(newBrollClips);
          setPendingBrollPhrases(newPhrases);
        }
      } catch (vsErr) {
        console.error('[Editor] Visual Script generation failed:', vsErr);
      } finally {
        setIsAnalyzingBroll(false);
        setStageMessage('');
      }
    }
    
    setStage('editing');
    setStageMessage('');
  };

  // Background B-Roll pre-fetch effect
  useEffect(() => {
    if (pendingBrollPhrases.length === 0) return;
    
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
    
    // 🚀 CRITICAL OOM FIX: Disable background pre-fetching on mobile.
    // Loading 3+ videos in parallel while editing a main 4K/1080p video 
    // is guaranteed to crash Honor/Huawei devices after ~30s.
    if (isMobile) {
      console.log('[Editor] Mobile detected, skipping background B-roll pre-fetch to save RAM');
      setPendingBrollPhrases([]);
      return;
    }

    const fetchAll = async () => {
      const results = await Promise.allSettled(
        pendingBrollPhrases.map(async (phrase) => {
          const clip = brollClips.find(c => c.phraseId === phrase.id);
          let finalQuery = clip?.prompt || phrase.text;
          
          try {
            const optRes = await fetch('/api/ai/optimize-prompt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ context: finalQuery })
            });
            const optData = await optRes.json();
            if (optData.optimized) finalQuery = optData.optimized;
          } catch (e) {}

          const res = await fetch(`/api/ai/broll-search?query=${encodeURIComponent(finalQuery)}`);
          if (!res.ok) throw new Error('Search failed');
          const data = await res.json();
          return { phraseId: phrase.id, videos: data.videos || [] };
        })
      );

      const newCache: Record<string, any[]> = {};
      const urlMap: Record<string, string> = {};

      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value.videos.length > 0) {
          newCache[r.value.phraseId] = r.value.videos;
          urlMap[r.value.phraseId] = r.value.videos[0].videoUrl;
        }
      });

      setPreFetchedBrolls(prev => ({ ...prev, ...newCache }));
      setBrollClips(prev => prev.map(c =>
        c.phraseId && urlMap[c.phraseId] && !c.url
          ? { ...c, url: urlMap[c.phraseId] }
          : c
      ));
    };

    fetchAll().catch(err => console.error('[BG BRoll] Failed:', err));
    setPendingBrollPhrases([]); 
  }, [pendingBrollPhrases]);

  // тФАтФА Manual B-Roll Hunter (opens modal for a specific phrase) тФАтФА
  const openBRollHunterForClip = (phraseId: string, prompt: string) => {
    setActiveBrollPhraseId(phraseId);
    setActiveBrollPrompt(prompt);
    setBrollModalOpen(true);
  };

  const generateBRoll = async () => {
    const firstEmpty = brollClips.find(c => !c.url);
    if (firstEmpty) {
      openBRollHunterForClip(firstEmpty.phraseId || firstEmpty.id, firstEmpty.prompt);
    }
  };

  const handleBRollSelect = (url: string) => {
    if (activeBrollPhraseId) {
      // 1. Download and Cache B-roll in background
      const brollId = `br_${Date.now()}`;
      
      const downloadAndCache = async (targetUrl: string, clipId: string) => {
        try {
          console.log(`[Editor] Caching B-roll: ${targetUrl}`);
          const res = await fetch(targetUrl);
          const blob = await res.blob();
          await idb.set(`broll_file_${clipId}`, blob);
          const localUrl = URL.createObjectURL(blob);
          
          setBrollClips(prev => prev.map(c => c.id === clipId ? { ...c, url: localUrl } : c));
          console.log(`[Editor] B-roll cached locally: ${clipId}`);
        } catch (e) {
          console.error('[Editor] Failed to cache B-roll:', e);
        }
      };

      setBrollClips(prev => {
        // Find by phraseId OR by the temporary placeholder ID
        const existingIdx = prev.findIndex(c => c.phraseId === activeBrollPhraseId || c.id === `br-${activeBrollPhraseId}`);
        if (existingIdx !== -1) {
          const clipId = prev[existingIdx].id;
          downloadAndCache(url, clipId);
          
          const next = [...prev];
          next[existingIdx] = { ...next[existingIdx], url, track: 0 };
          return next;
        } else {
          // Fallback if not found on timeline yet
          const phrase = phrases.find(p => p.id === activeBrollPhraseId);
          const clipId = brollId;
          downloadAndCache(url, clipId);
          
          const newClip: BRollClip = {
            id: clipId,
            phraseId: activeBrollPhraseId,
            url,
            label: phrase?.text.slice(0, 20) || 'AI Scene',
            prompt: phrase?.text || '',
            startTime: phrase?.start || currentTime,
            endTime: (phrase?.end || currentTime + 3),
            track: 0,
          };
          return [...prev, newClip];
        }
      });
    }
    
    // Always close and cleanup
    setBrollModalOpen(false);
    setActiveBrollPhraseId(null);
    setStage('editing');
  };
  // тФАтФА Video Upload тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setARollUrl(url);
      setRawFile(file);
      idb.set(`video_file_${projectId}`, file); // Save immediately
      setVideoSource('upload');
      setStage('transcribing');
      setTranscriptionError(null);
      transcriptionStartedRef.current = false; // Reset trigger for new file
      runTranscriptionAndPhrases();
    }
  };

  const handleSwapPhrase = (word: TranscriptWord) => {
    if (!editingPhraseId) return;
    setPhrases(prev => prev.map(p => p.id === editingPhraseId ? {
      ...p,
      text: word.text,
      start: word.start,
      end: word.end
    } : p));
    setPhrasePickerOpen(false);
    setEditingPhraseId(null);
  };

  // тФАтФА Helpers тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !aRollUrl) return;
    if (isPlaying) v.pause(); else v.play();
    setIsPlaying(p => !p);
  };

  const startDrag = (e: React.MouseEvent | React.TouchEvent, clipId: string, type: 'broll' | 'sub', handle: 'move' | 'start' | 'end') => {
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const clip = type === 'broll' ? brollClips.find(c => c.id === clipId) : subtitleClips.find(c => c.id === clipId);
    if (!clip) return;
    
    dragRef.current = { 
      clipId, type, handle, 
      startX: clientX, startY: clientY, 
      origStart: clip.startTime, origEnd: clip.endTime 
    };

    // Mobile-first Long Press to Delete (800ms)
    if (handle === 'move') {
      longPressTimerRef.current = setTimeout(() => {
        if (window.confirm('Удалить этот фрагмент?')) {
          if (type === 'broll') setBrollClips(p => p.filter(c => c.id !== clipId));
          else setSubtitleClips(p => p.filter(c => c.id !== clipId));
          dragRef.current = null;
        }
        longPressTimerRef.current = null;
      }, 800);
    }
  };

  const handleTimelineTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current) return;
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    const clamped = Math.max(0, Math.min(t, duration));
    setCurrentTime(clamped);
    if (videoRef.current) videoRef.current.currentTime = clamped;
  }, [duration]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  const selBR = brollClips.find(c => c.id === selectedClipId);
  const selSub = subtitleClips.find(c => c.id === selectedClipId);
  const approvedCount = phrases.filter(p => p.approved).length;
  const allTranscript = transcript.length > 0
    ? transcript
    : buildTranscript(manifest, duration);

  // Phase labels
  const phaseLabels = ['Upload', 'Subtitles', 'B-Roll'];
  const phaseIndex = stage === 'empty' ? 0 : stage === 'transcribing' ? 1 : stage === 'editing' ? 1 : 2;

  // тФАтФА RENDER тФАтФА
  if (!manifest) {
    return (
      <div className="flex-1 bg-black flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] transition-all duration-300" 
            style={{ opacity: 0.3 + (heartbeat % 10) / 10, transform: `scale(${1 + (heartbeat % 5) / 10})` }}
          />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Initialising Production Canvas...</p>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col bg-[#050508] text-white select-none" 
      style={{ height: '100%', maxHeight: '100dvh', position: 'relative' }}
      data-duration={duration}
    >

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
        onChange={handleFileChange} />

      {/* PREMIUM FOUNDATION SELECTION */}
      <AnimatePresence>
        {!aRollUrl && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-[100] bg-[#050508] flex flex-col items-center justify-center px-8"
          >
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="w-full max-w-md relative z-10 space-y-8 text-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <h2 className="text-3xl font-black tracking-tighter uppercase text-white">Choose Foundation</h2>
                <p className="text-xs text-white/40 uppercase tracking-[0.2em] font-medium">How do you want to start this masterpiece?</p>
              </motion.div>

              <div className="grid grid-cols-1 gap-4">
                <motion.button 
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative p-1 rounded-[2rem] bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 overflow-hidden transition-all hover:border-purple-500/40"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 to-blue-600/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative p-8 rounded-[1.9rem] bg-[#0c0c14]/80 backdrop-blur-xl flex flex-col items-center gap-5">
                    <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/20 transition-all">
                      <Upload size={32} className="text-purple-400" />
                    </div>
                    <div className="space-y-1 text-center">
                      <span className="block text-lg font-black uppercase tracking-tight text-white">Upload A-Roll</span>
                      <span className="block text-[10px] text-white/40 uppercase tracking-widest font-bold">Use your own recording</span>
                    </div>
                  </div>
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => onFaceless?.()}
                  className="group relative p-1 rounded-[2rem] bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-white/10 overflow-hidden transition-all hover:border-blue-500/40"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/40 to-emerald-600/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative p-8 rounded-[1.9rem] bg-[#0c0c14]/80 backdrop-blur-xl flex flex-col items-center gap-5">
                    <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
                      <Cpu size={32} className="text-blue-400" />
                    </div>
                    <div className="space-y-1 text-center">
                      <span className="block text-lg font-black uppercase tracking-tight text-white">AI Faceless Mode</span>
                      <span className="block text-[10px] text-white/40 uppercase tracking-widest font-bold">Generated visual sequence</span>
                    </div>
                  </div>
                </motion.button>
              </div>

              <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={onBack}
                className="text-[10px] font-black uppercase text-white/20 tracking-[0.3em] hover:text-white/40 transition-colors"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MVP NAV BAR */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 z-20 bg-[#0a0a14]">

        <button onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
          <ArrowLeft size={12} /> Back
        </button>

        {/* Phase Indicator */}
        <div className="flex items-center gap-1.5">
          {phaseLabels.map((label, i) => (
            <React.Fragment key={label}>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
                i === phaseIndex
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : i < phaseIndex
                    ? 'text-white/30'
                    : 'text-white/10'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${i <= phaseIndex ? 'bg-purple-400' : 'bg-white/10'}`} />
                {label}
              </div>
              {i < phaseLabels.length - 1 && <ChevronRight size={8} className="text-white/10" />}
            </React.Fragment>
          ))}
        </div>

        <button 
          onClick={() => {
            if (!window.confirm('Приступаем к финальной сборке?')) return;
            console.log('[Editor] Exporting project:', projectId, { brollCount: brollClips.length, hasARoll: !!aRollUrl });
            onNext?.(brollClips, subtitleClips, aRollUrl);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-lg shadow-purple-500/30 transition-all hover:bg-purple-400">
          Export <ArrowRight size={12} />
        </button>
      </div>

      {/* тФАтФА VIDEO PREVIEW (Phone Frame) тФАтФА */}
      <div className="relative bg-[#050508] flex items-center justify-center flex-shrink-0"
        style={{ height: '38%' }}>
        
        {/* MVP Video Container */}
        <div className="relative h-full aspect-[9/16] bg-black border border-white/10 z-10">
          {aRollUrl ? (
            <div className="relative w-full h-full">
              <video 
                key={aRollUrl}
                ref={videoRef} 
                muted={isMuted} 
                className="w-full h-full object-cover" 
                playsInline 
                onClick={togglePlay} 
              />
              {/* тФАтФА B-ROLL OVERLAY PREVIEW тФАтФА */}
              {(() => {
                const activeBR = brollClips.find(c => c.url && c.url.length > 5 && currentTime >= c.startTime && currentTime <= c.endTime);
                if (!activeBR) return null;
                return (
                  <div className="absolute inset-0 z-20 bg-black flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f] z-0">
                      <Loader2 className="w-8 h-8 text-purple-500/40 animate-spin" />
                    </div>
                    <BRollPreview 
                      url={activeBR.url}
                      startTime={activeBR.startTime}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                    />
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 w-full h-full p-6 bg-[#0a0a0f]">
              <button onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-3 w-full p-6 rounded-xl bg-white/[0.02] border border-dashed border-white/10 hover:border-purple-500/40 transition-all active:scale-[0.98]">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <Upload size={20} className="text-purple-400" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Upload A-Roll</p>
                </div>
              </button>
            </div>
          )}

          {/* MVP Subtitle Overlay */}
          <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
              {aRollUrl && (() => {
                const activeSub = subtitleClips.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
                if (!activeSub) return null;

                return (
                  <motion.div
                    key="global-subtitle-container"
                    drag
                    dragMomentum={false}
                    onDrag={(e, info) => {
                      setSubtitlePos(prev => ({
                        x: prev.x + info.delta.x,
                        y: prev.y + info.delta.y
                      }));
                    }}
                    className="absolute text-center px-4 w-full z-[100] cursor-move active:cursor-grabbing pointer-events-auto"
                    style={{ bottom: '17%', x: subtitlePos.x, y: subtitlePos.y }}
                  >
                    <div className="flex justify-center px-4">
                      <span 
                        style={{ fontSize: `${subtitleSize}px` }}
                        className="font-[900] leading-[1.0] tracking-tighter text-yellow-400 text-center [text-shadow:0_2px_0_#000] italic uppercase"
                      >
                        {activeSub.text}
                      </span>
                    </div>
                  </motion.div>
                );
              })()}
          </div>
        </div>

      {/* Processing Overlay */}
          {stage === 'transcribing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
              <div className="relative w-14 h-14 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Wand2 size={24} className="text-purple-400 animate-pulse" />
                <div 
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] transition-all duration-300" 
                  style={{ opacity: 0.3 + (heartbeat % 10) / 10, transform: `scale(${1 + (heartbeat % 5) / 10})` }}
                />
              </div>
              <div className="text-center px-8">
                <p className="text-xs font-black text-white uppercase tracking-widest leading-relaxed">{stageMessage}</p>
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-1 justify-center mt-3">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                      ))}
                    </div>
                    {/* Emergency skip after some time */}
                    <button 
                      onClick={() => setStage('editing')}
                      className="mt-4 px-4 py-2 rounded-xl text-white/20 text-[9px] font-bold uppercase tracking-widest hover:text-white/40 transition-colors"
                    >
                      Пропустить анализ
                    </button>
                  </div>
              </div>

            </motion.div>
          )}

        {/* Play/pause + timecode */}
        {aRollUrl && stage !== 'transcribing' && (
          <button onClick={togglePlay}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 shadow-2xl">
            {isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
            <span className="text-[11px] font-black text-white tabular-nums">{fmt(currentTime)} / {fmt(duration)}</span>
          </button>
        )}

        {/* Change video */}
        {aRollUrl && (
          <button onClick={() => fileInputRef.current?.click()}
            className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 active:scale-95 z-20">
            <Upload size={12} className="text-white/50" />
          </button>
        )}
      </div>

      {/* тФАтФА ACTION BAR тФАтФА */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0a12] border-y border-white/5 flex-shrink-0">
        {/* Transport */}
        <button onClick={() => { setCurrentTime(0); if (videoRef.current) videoRef.current.currentTime = 0; }}
          className="p-2.5 rounded-xl bg-white/5 active:scale-95">
          <SkipBack size={15} className="text-white/50" />
        </button>
        <button onClick={togglePlay}
          className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20 active:scale-95">
          {isPlaying ? <Pause size={17} fill="white" /> : <Play size={17} fill="white" className="ml-0.5" />}
        </button>
        <button onClick={() => setIsMuted(m => !m)} className="p-2.5 rounded-xl bg-white/5 active:scale-95">
          {isMuted ? <VolumeX size={15} className="text-white/40" /> : <Volume2 size={15} className="text-white/50" />}
        </button>
        <span className="text-[12px] font-black text-purple-400 tabular-nums tracking-tight">{fmt(currentTime)}<span className="text-white/20">/{fmt(duration)}</span></span>
        
        <div className="flex-1" />

        <button 
          onClick={() => {
            setStage('transcribing');
            transcriptionStartedRef.current = false;
            runTranscriptionAndPhrases(true); // FORCE FRESH
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest hover:text-purple-400 hover:border-purple-500/30 transition-all"
        >
          <Sparkles size={12} /> Refine AI Subtitles
        </button>


        {/* Stage Actions */}
        {(stage === 'editing' || stage === 'empty') && subtitleClips.length === 0 && aRollUrl && (
          <button onClick={() => runTranscriptionAndPhrases(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[11px] font-black uppercase active:scale-95 transition-all">
            <Mic size={14} /> Transcribe
          </button>
        )}

        {stage === 'editing' && subtitleClips.length > 0 && (
          <button onClick={generateBRoll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[11px] font-black uppercase active:scale-95 transition-all">
            <Sparkles size={14} /> B-Roll
          </button>
        )}
      </div>

      {/* NEW MASTER TIMELINE */}
      <StudioTimeline 
        segments={manifest?.segments || []}
        totalDuration={aRollDuration || 60}
        currentTime={currentTime}
        brollClips={brollClips.map(c => ({ 
          id: c.id, 
          type: 'broll', 
          startTime: c.startTime, 
          duration: c.endTime - c.startTime, 
          content: c.url || c.label 
        }))}
        subtitleClips={subtitleClips.map(c => ({ 
          id: c.id, 
          type: 'subtitle', 
          startTime: c.startTime, 
          duration: c.endTime - c.startTime, 
          content: c.text 
        }))}
        activeIndex={0}
        selectedId={selectedClipId}
        onSelect={(type, id) => setSelectedClipId(id)}
        onUpdateOverlay={(type, id, data) => {
          if (type === 'broll') {
            setBrollClips(prev => prev.map(c => {
              if (c.id !== id) return c;
              const ns = data.startTime ?? c.startTime;
              const dur = data.duration ?? (c.endTime - c.startTime);
              return { ...c, startTime: ns, endTime: ns + dur };
            }));
          } else {
            setSubtitleClips(prev => prev.map(c => {
              if (c.id !== id) return c;
              const ns = data.startTime ?? c.startTime;
              const dur = data.duration ?? (c.endTime - c.startTime);
              return { ...c, startTime: ns, endTime: ns + dur };
            }));
          }
        }}
        onDeleteOverlay={(type, id) => {
          if (type === 'broll') setBrollClips(prev => prev.filter(c => c.id !== id));
          else setSubtitleClips(prev => prev.filter(c => c.id !== id));
          setSelectedClipId(null);
          setBrollModalOpen(false);
        }}
        onCreateOverlay={(type, time) => {
          const id = `${type}_${Date.now()}`;
          if (type === 'broll') {
            const newClip = {
              id, phraseId: id, startTime: time, endTime: time + 3, 
              label: 'New Scene', url: '', prompt: 'cinematic shot', track: 1
            };
            setBrollClips(prev => [...prev, newClip]);
            openBRollHunterForClip(id, '');
          } else {
             const newSub: SubtitleClip = { id, text: 'New Text', startTime: time, endTime: time + 2, style: 'minimal' };
             setSubtitleClips(prev => [...prev, newSub]);
          }
          setSelectedClipId(id);
        }}
        onOpenEditor={(type, id) => {
          setSelectedClipId(id);
          if (type === 'broll') {
            const clip = brollClips.find(c => c.id === id);
            if (clip) openBRollHunterForClip(clip.phraseId || clip.id, clip.prompt);
          } else {
            const sub = subtitleClips.find(c => c.id === id);
            if (sub) {
              setEditingSubtitleId(id);
              setSubtitleEditText(sub.text);
              setSubtitleEditorOpen(true);
            }
          }
        }}
        onAddSegment={() => {}}
      />

      {/* SUBTITLE EDITOR MODAL */}
      <AnimatePresence>
        {subtitleEditorOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-[#12121a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-black uppercase tracking-widest text-white/40">Edit Subtitle</h3>
                <button onClick={() => setSubtitleEditorOpen(false)} className="p-2 text-white/20 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <textarea
                value={subtitleEditText}
                onChange={(e) => setSubtitleEditText(e.target.value)}
                className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-purple-500 transition-all resize-none"
                placeholder="Enter text..."
              />

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    if (editingSubtitleId) {
                      setSubtitleClips(prev => prev.map(s => s.id === editingSubtitleId ? { ...s, text: subtitleEditText } : s));
                    }
                    setSubtitleEditorOpen(false);
                  }}
                  className="w-full py-4 bg-purple-500 rounded-2xl text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    if (editingSubtitleId) {
                      setSubtitleClips(prev => prev.filter(s => s.id !== editingSubtitleId));
                      setSelectedClipId(null);
                    }
                    setSubtitleEditorOpen(false);
                  }}
                  className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-black uppercase tracking-widest text-[11px] active:scale-95 transition-all"
                >
                  Delete Subtitle
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MVP PHRASE PICKER */}
      {phrasePickerOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 z-[70] bg-black/90 backdrop-blur-md flex flex-col"
        >
          <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-white/5">
            <div>
              <h3 className="text-[12px] font-black uppercase tracking-widest text-white">Select Phrase</h3>
              <p className="text-[9px] text-white/30 mt-0.5">Tap a line to use as the B-Roll moment</p>
            </div>
            <button onClick={() => { setPhrasePickerOpen(false); setEditingPhraseId(null); }}
              className="p-2.5 rounded-2xl bg-white/5 border border-white/10 active:scale-95">
              <X size={15} className="text-white/60" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
            {transcript.map((word, i) => (
              <button key={i} onClick={() => handleSwapPhrase(word)}
                className="w-full text-left p-4 rounded-2xl bg-white/[0.04] border border-white/8 hover:bg-purple-500/10 hover:border-purple-500/20 active:scale-98 transition-all group">
                <div className="flex items-start gap-4">
                  <span className="text-[10px] font-black text-white/30 tabular-nums pt-0.5 flex-shrink-0">{fmt(word.start)}</span>
                  <span className="text-[13px] text-white/80 leading-snug group-hover:text-white transition-colors">{word.text}</span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* тФАтФА B-ROLL AI MODAL тФАтФА */}
      <BRollModal
        isOpen={brollModalOpen}
        onClose={() => {
          setBrollModalOpen(false);
          setActiveBrollPhraseId(null);
          setStage('editing');
        }}
        onSelect={handleBRollSelect}
        segmentText={activeBrollPrompt}
        projectId={projectId}
        preFetchedResults={activeBrollPhraseId ? preFetchedBrolls[activeBrollPhraseId] : undefined}
        onDelete={() => {
           if (activeBrollPhraseId) {
              const clip = brollClips.find(c => c.phraseId === activeBrollPhraseId || c.id === activeBrollPhraseId);
              if (clip) {
                 setBrollClips(prev => prev.filter(c => c.id !== clip.id));
                 setSelectedClipId(null);
                 setBrollModalOpen(false);
              }
           }
        }}
      />

    </div>
  );
});


