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
import { storageService } from '@/lib/services/storageService';
// FFmpeg isolated

// ── Types ──────────────────────────────────────────────────────────────────

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

interface VideoEditorProps {
  manifest: ProductionManifest | null;
  onBack: () => void;
  onNext?: (broll: BRollClip[], subs: SubtitleClip[], aRollUrl: string | null) => void;
  updateSegmentField: (id: string, field: string, value: any) => void;
  projectId?: string;
  onFaceless?: () => void;
  isSaving?: boolean;
}

// ── Helper: Mock Transcription ─────────────────────────────────────────────

function buildTranscript(manifest: ProductionManifest | null, videoDuration: number): TranscriptWord[] {
  if (!manifest) {
    // Fallback for custom uploads without a script: create a single placeholder word
    return [{ text: "[Редактируйте текст здесь]", start: 0, end: videoDuration }];
  }
  const segments = manifest?.segments?.filter((s: any) => s.scriptText) || [];
  const dur = (isFinite(videoDuration) && videoDuration > 0) ? videoDuration : 60;

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

// ── B-Roll Preview Sync ───────────────────────────────────────────────────

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

// ── Main Component ──────────────────────────────────────────────────────────

export const VideoEditor = React.memo(({
  manifest, onBack, onNext, updateSegmentField, projectId, preFetchedBrolls: parentPreFetched, onFaceless, isSaving
}: VideoEditorProps & { preFetchedBrolls?: Record<string, any[]> }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to extract initial A-Roll
  const getInitialARoll = () => {
    const rec = manifest?.segments?.find((s: any) => s.type === 'user_recording' && s.assetUrl);
    return rec?.assetUrl || manifest?.videoUrl || manifest?.segments?.[0]?.assetUrl || null;
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
  // ── SAFETY GUARD ──────────────────────────────────────────────────────────
  if (!manifest || !projectId) {
    console.warn('[VideoEditor] Waiting for manifest or projectId...', { manifest, projectId });
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#050508] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Syncing Production Hub...</p>
      </div>
    );
  }
  console.log('[VideoEditor] Rendering with project:', projectId);

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

  // ── Persistence: Save/Load local draft ──
  useEffect(() => {
    if (!projectId || persistenceLoadedRef.current) return;
    
    async function recoverDraft() {
      const key = `viral_editor_draft_${projectId}`;
      const saved = localStorage.getItem(key);
      let data: any = null;
      
      if (saved) {
        try {
          data = JSON.parse(saved);
          if (data.subtitleClips) setSubtitleClips(data.subtitleClips);
          if (data.transcript) setTranscript(data.transcript);
          if (data.stage) setStage(data.stage);
          if (data.subtitlePos) setSubtitlePos(data.subtitlePos);
          if (data.subtitleSize) setSubtitleSize(data.subtitleSize);
          if (data.aRollUrl && !data.aRollUrl.startsWith('blob:')) {
            setARollUrl(data.aRollUrl);
          }
        } catch (e) { console.error('Failed to parse draft:', e); }
      }
      
      // RECOVER VIDEO FILE FROM IDB (Independent of localStorage draft)
      try {
        const cachedFile = await idb.get(`video_file_${projectId}`);
        if (cachedFile instanceof Blob) {
          console.log('[Editor] Recovered video file from IndexedDB');
          const url = URL.createObjectURL(cachedFile);
          setARollUrl(url);
          setRawFile(cachedFile as File);
        }
      } catch (e) { console.error('Failed to recover from IDB:', e); }

      // RECOVER B-ROLLS FROM IDB
      if (data?.brollClips) {
        const restoredClips = await Promise.all(data.brollClips.map(async (clip: BRollClip) => {
          try {
            const blob = await idb.get(`broll_file_${clip.id}`);
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
    localStorage.setItem(key, JSON.stringify(state));
  }, [projectId, aRollUrl, brollClips, subtitleClips, transcript, stage]);

  // Separate effect for heavy file persistence
  useEffect(() => {
    if (!projectId || !rawFile || !persistenceLoadedRef.current) return;
    
    // Only save if it's a new file (we can use name/size as a weak proxy for "same file")
    const saveFile = async () => {
      try {
        const lastSaved = await idb.get(`video_file_info_${projectId}`);
        if (lastSaved?.name === rawFile.name && lastSaved?.size === rawFile.size) return;
        
        console.log('[Editor] Saving new video file to IndexedDB...');
        await idb.set(`video_file_${projectId}`, rawFile);
        await idb.set(`video_file_info_${projectId}`, { name: rawFile.name, size: rawFile.size });
      } catch (e) {
        console.error('Failed to cache video file:', e);
      }
    };
    
    saveFile();
  }, [projectId, rawFile]);

  // ── Auto-transcribe: fires when stage=transcribing AND url is ready ──
  useEffect(() => {
    if (stage === 'transcribing' && aRollUrl && !transcriptionStartedRef.current) {
      console.log('[VideoEditor] Starting auto-transcription for:', aRollUrl);
      transcriptionStartedRef.current = true;
      runTranscriptionAndPhrases();
    }
  }, [stage, aRollUrl]); // Explicit dependencies

  // ── Sync manifest A-Roll ──
  useEffect(() => {
    const rec = manifest?.segments?.find((s: any) => s.type === 'user_recording' && s.assetUrl);
    const url = rec?.assetUrl || manifest?.videoUrl || manifest?.segments?.[0]?.assetUrl || null;
    
    if (url && url !== aRollUrl) {
      console.log('[VideoEditor] Manifest updated with new A-Roll:', url);
      setARollUrl(url);
      setStage('transcribing');
      transcriptionStartedRef.current = false; // Reset guard for new URL
    }
  }, [manifest]); 


  // ── Auto-confirm countdown ─ REMOVED (B-Roll Hunter should only open manually) ──

  // ── Video sync ──
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

  // ── Dynamic Duration Calculation ──
  useEffect(() => {
    const maxBrollEnd = brollClips.length > 0 
      ? Math.max(...brollClips.map(c => c.endTime)) 
      : 0;
    
    // Total duration is defined by A-Roll length or the last B-Roll, whichever is later.
    // We keep a 60s minimum for UI comfort unless assets are longer.
    // 🛡️ Safety Guard against NaN/Infinity crashes on Chrome
    const safeARollDuration = isFinite(aRollDuration) ? aRollDuration : 0;
    const safeMaxBrollEnd = isFinite(maxBrollEnd) ? maxBrollEnd : 0;
    const newDuration = Math.max(safeARollDuration, safeMaxBrollEnd, 60);
    if (Math.abs(newDuration - duration) > 0.1) {
      setDuration(newDuration);
    }
  }, [aRollDuration, brollClips, duration]);

  // ── Drag listeners ──
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
            // ENFORCE 3s CAP
            ne = Math.min(ne, clip.startTime + 3);
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

  // ── Core Pipeline: Transcription → Karaoke Subs → Auto B-Roll placement ──
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
        const sourceBlob: Blob | null =
          rawFile ||
          (aRollUrl?.startsWith('blob:')
            ? await fetch(aRollUrl).then(r => r.blob())
            : null);

        if (!sourceBlob) throw new Error('Не удалось получить файл');

        // ── STEP 1: FFmpeg audio extraction (works on iOS HEVC, Android, Desktop)
        // 🔥 Fully dynamic import to prevent bundle bloat and Chrome crashes
        const { extractAudioFFmpeg } = await import('@/lib/ffmpeg-audio');
        const audioBlob = await extractAudioFFmpeg(sourceBlob, {
          onProgress: setStageMessage,
        });

        setStageMessage('AI расшифровка голоса...');
        const formData = new FormData();

        if (audioBlob && audioBlob.size > 0) {
          // Best path: tiny MP3 (~240KB), no size issues
          console.log('[Editor] Sending FFmpeg MP3:', (audioBlob.size / 1024).toFixed(0), 'KB');
          formData.append('file', new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' }));
        } else {
          // FFmpeg failed — send raw file with size guard
          const mime = sourceBlob.type || (rawFile?.name?.endsWith('.mov') ? 'video/quicktime' : 'video/mp4');
          const ext  = mime.includes('quicktime') ? 'video.mov' : 'video.mp4';
          const sizeMB = sourceBlob.size / 1024 / 1024;

          if (sizeMB > 40) {
            throw new Error(
              `Видео слишком большое (${sizeMB.toFixed(0)}MB). ` +
              `Настройки → Камера → Форматы → "Наиболее совместимый" или обрежьте до 45 сек.`
            );
          }
          console.log('[Editor] FFmpeg failed, sending raw file:', sizeMB.toFixed(1), 'MB');
          setStageMessage(`Загрузка на AI (${sizeMB.toFixed(0)}MB)...`);
          formData.append('file', new File([sourceBlob], ext, { type: mime }));
        }

        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 90000);

        try {
          const res = await fetch('/api/ai/transcribe', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

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
      setStageMessage(transcriptionError || 'Ошибка анализа аудио');
      if (!transcriptionError) setTranscriptionError('Не удалось получить текст автоматически.');
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
          segments.forEach((seg: any, sIdx: number) => {
            const segText = (seg.text || '').toLowerCase();
            const segWords = segText.split(/\s+/).filter(Boolean);
            if (segWords.length === 0) return;

            // Find best word match for the segment start/end
            const firstWord = words[wordIdx];
            let lastWord = words[wordIdx];
            
            // Look ahead for the end word of this segment
            const targetEndWord = segWords[segWords.length - 1];
            for (let i = wordIdx; i < Math.min(wordIdx + 20, words.length); i++) {
              if (words[i].text.toLowerCase().includes(targetEndWord)) {
                lastWord = words[i];
                wordIdx = i + 1;
                break;
              }
            }
            // If we didn't find the end word, just use a reasonable chunk
            if (lastWord === firstWord && words.length > wordIdx + 5) {
               lastWord = words[wordIdx + 4];
               wordIdx += 5;
            }

            const phrase: BRollPhrase = {
              id: `phrase-${sIdx}-${Date.now()}`,
              text: seg.text,
              start: firstWord?.start || 0,
              end: lastWord?.end || (firstWord?.start || 0) + 2.5,
              approved: true,
              brollUrl: ''
            };
            newPhrases.push(phrase);

            newBrollClips.push({
              id: `br-${phrase.id}`,
              phraseId: phrase.id,
              startTime: phrase.start,
              endTime: phrase.end,
              label: seg.visual_metaphor?.slice(0, 30) + '...' || 'AI Scene',
              url: '',
              // CRITICAL: Use pexels_query for the hunter, not the full Flux prompt
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

    const fetchAll = async () => {
      const results = await Promise.allSettled(
        pendingBrollPhrases.map(async (phrase) => {
          // Find the clip to get its specific prompt
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

  // ── Manual B-Roll Hunter (opens modal for a specific phrase) ──
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
            endTime: Math.min((phrase?.end || currentTime + 3), (phrase?.start || currentTime) + 3),
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
  // ── Video Upload ────────────────────────────────────────────────────────

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

  // ── Helpers ─────────────────────────────────────────────────────────────

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

  // ── RENDER ───────────────────────────────────────────────────────────────
  if (!manifest) {
    return (
      <div className="flex-1 bg-black flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
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

      {/* ── FOUNDATION SELECTION (Empty State) ── */}
      <AnimatePresence>
        {!aRollUrl && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#050508] flex flex-col px-6 pt-12 pb-10"
          >
            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-[28px] font-black italic tracking-tighter uppercase leading-none mb-3">
                A-ROLL <span className="text-purple-400">FOUNDATION</span>
              </h1>
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.25em] leading-relaxed max-w-[220px] mx-auto">
                Select the primary visual anchor for your production
              </p>
            </div>

            {/* Options */}
            <div className="flex-1 flex flex-col gap-5">
              {/* AI Faceless */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onFaceless?.()}
                className="flex-1 relative rounded-[2.5rem] bg-white/[0.03] border border-white/5 overflow-hidden group"
              >

                <div className="absolute inset-0 bg-purple-500/[0.02] group-hover:bg-purple-500/[0.05] transition-colors" />
                <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(168,85,247,0.15)]">
                    <Cpu size={32} className="text-purple-400" />
                  </div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">AI Faceless</h3>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed max-w-[200px]">
                    Generate cinematic AI avatars or abstract visuals using your expert DNA
                  </p>
                </div>
              </motion.button>

              {/* Upload Media */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 relative rounded-[2.5rem] bg-white/[0.03] border border-white/5 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-cyan-500/[0.02] group-hover:bg-cyan-500/[0.05] transition-colors" />
                <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
                    <Upload size={32} className="text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">Upload Media</h3>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed max-w-[200px]">
                    Import high-quality raw footage recorded on external devices
                  </p>
                </div>
              </motion.button>
            </div>

            {/* Back button */}
            <button 
              onClick={onBack}
              className="mt-8 py-4 rounded-lg bg-white/5 text-white/30 text-[10px] font-black uppercase tracking-[0.3em] active:scale-95 transition-all"
            >
              Cancel Production
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NAV BAR (Only if video loaded) ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 z-20 flex-shrink-0 bg-[#050508]">

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
          disabled={isSaving}
          onClick={() => {
            if (!window.confirm('Приступаем к финальной сборке?')) return;
            onNext?.(brollClips, subtitleClips, aRollUrl);
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-lg shadow-purple-500/30 transition-all hover:bg-purple-400 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Export <ArrowRight size={12} /></>}
        </button>
      </div>

      {/* ── VIDEO PREVIEW (Phone Frame) ── */}
      <div className="relative bg-[#050508] flex items-center justify-center flex-shrink-0"
        style={{ height: '38%' }}>
        
        {/* Phone Frame Container */}
        <div className="relative h-full aspect-[9/16] bg-black overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10">
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
              {/* ── B-ROLL OVERLAY PREVIEW ── */}
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

          {/* Subtitle Overlay – Karaoke Style (Inside Frame) */}
          <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {aRollUrl && (() => {
                const activeSub = subtitleClips.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
                if (!activeSub) return null;

                return (
                  <motion.div
                    key={activeSub.id}
                    drag
                    dragMomentum={false}
                    onDragEnd={(e, info) => {
                      setSubtitlePos(prev => ({
                        x: prev.x + info.offset.x,
                        y: prev.y + info.offset.y
                      }));
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1.0, x: subtitlePos.x, y: subtitlePos.y }}
                    exit={{ opacity: 0, scale: 1.2 }}
                    className="absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none text-center px-4 w-full z-[100]"
                    style={{ bottom: '22%' }}
                  >
                    <div className="flex justify-center px-4">
                      <span 
                        style={{ fontSize: `${subtitleSize}px` }}
                        className="font-[900] leading-[1.0] tracking-tighter text-yellow-400 text-center whitespace-normal break-normal max-w-full [text-shadow:0_4px_0_#000,0_8px_30px_rgba(234,179,8,0.6)] italic uppercase pointer-events-none"
                      >
                        {activeSub.text}
                      </span>
                    </div>
                    {/* Drag Handle Hint */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-[8px] text-white/40 font-black uppercase tracking-widest">Drag to Move</div>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>
        </div>

      {/* Processing Overlay */}
        <AnimatePresence>
          {stage === 'transcribing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
              <div className="w-14 h-14 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Wand2 size={24} className="text-purple-400 animate-pulse" />
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
        </AnimatePresence>

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

      {/* ── ACTION BAR ── */}
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

      {/* ── TIMELINE ── */}
      <div className="flex-1 bg-[#080810] overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-x-auto overflow-y-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex flex-col" style={{ minWidth: `${Math.max(duration * 18, 320)}px`, height: '100%' }}>

            {/* Ruler */}
            <div ref={timelineRef}
              className="h-6 bg-[#0c0c1c] border-b border-white/5 relative flex-shrink-0 cursor-pointer ml-14"
              style={{ width: 'calc(100% - 56px)' }}
              onClick={handleTimelineTap}>
              {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => (
                i <= duration && (
                  <div key={i} className="absolute top-0 flex flex-col items-start"
                    style={{ left: `${(i / duration) * 100}%` }}>
                    <div className={`w-px ${i % 5 === 0 ? 'h-3 bg-white/20' : 'h-1.5 bg-white/8'}`} />
                    {i % 5 === 0 && <span className="text-[9px] text-white/20 font-black ml-0.5">{fmt(i)}</span>}
                  </div>
                )
              ))}
              {/* Playhead */}
              <div className="absolute top-0 bottom-0 pointer-events-none z-20"
                style={{ left: `${Math.min((currentTime / duration) * 100, 100)}%` }}>
                <div className="absolute top-0 w-px h-[999px] bg-purple-400 shadow-[0_0_4px_rgba(168,85,247,0.8)]" style={{ transform: 'translateX(-0.5px)' }} />
                <div className="absolute -top-0 -left-[4px] w-[9px] h-[9px] rounded-full bg-purple-400 border-2 border-purple-200" />
              </div>
            </div>

            {/* A-Roll track */}
            <TrackRow label="A" color="text-emerald-400" onClick={aRollUrl ? undefined : () => fileInputRef.current?.click()}>
              {aRollUrl ? (
                <div className="absolute inset-y-1 left-0 right-0 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center px-3 overflow-hidden">
                  <div className="flex gap-0.5 items-center h-4 mr-2 opacity-30">
                    {Array.from({ length: 22 }).map((_, i) => (
                      <div key={i} className="w-0.5 bg-emerald-400 rounded-full" style={{ height: `${30 + Math.sin(i * 0.7) * 50}%` }} />
                    ))}
                  </div>
                  <span className="text-[11px] font-black text-emerald-400 truncate">🎥 A-Roll</span>
                </div>
              ) : (
                <div className="absolute inset-y-1 left-0 right-0 rounded-lg border border-dashed border-white/8 flex items-center justify-center cursor-pointer hover:border-purple-500/30 transition-all">
                  <span className="text-[7px] font-black text-white/15 uppercase">Tap toolbar to upload</span>
                </div>
              )}
            </TrackRow>

            {/* B-Roll Track */}
            <TrackRow 
              label="B" 
              color="text-blue-400"
              onTimelineClick={(time) => {
                const id = `br_manual_${Date.now()}`;
                // Check if we can fit 5s here without overlap
                const defaultLen = 5;
                const endTime = Math.min(time + defaultLen, 600);
                
                // Prevent creating on top of existing
                const hasOverlap = brollClips.some(c => 
                  (time >= c.startTime && time < c.endTime) ||
                  (endTime > c.startTime && endTime <= c.endTime)
                );
                if (hasOverlap) return;

                const newClip: BRollClip = {
                  id,
                  phraseId: id,
                  startTime: time,
                  endTime: time + 3,
                  label: 'Manual Scene',
                  url: '',
                  prompt: 'cinematic lifestyle shot',
                  track: 1
                };
                setBrollClips(prev => [...prev, newClip].sort((a,b) => a.startTime - b.startTime));
                openBRollHunterForClip(id, '');
              }}
            >
              {isAnalyzingBroll && brollClips.length === 0 && (
                <div className="absolute inset-y-1 left-0 right-0 rounded-lg bg-blue-500/5 border border-dashed border-blue-500/20 flex items-center justify-center overflow-hidden">
                  <motion.div 
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em]">AI Анализ сюжета и подбор сцен...</span>
                  </motion.div>
                </div>
              )}
              {brollClips.map(clip => (
                <BRollTimelineClip key={clip.id} clip={clip} duration={duration}
                  isSelected={selectedClipId === clip.id}
                  onSelect={() => {
                    if (!clip.url) {
                      // Empty placeholder — open hunter immediately
                      openBRollHunterForClip(clip.phraseId || clip.id, clip.prompt);
                    } else {
                      setSelectedClipId(clip.id);
                      setShowSheet(true);
                    }
                  }}
                  onDragStart={(e, h) => startDrag(e, clip.id, 'broll', h)}
                />
              ))}
            </TrackRow>

            {/* Subtitles Track */}
            <TrackRow label="TXT" color="text-amber-400">
              {subtitleClips.map(clip => (
                <SubtitleTimelineClip key={clip.id} clip={clip} duration={duration}
                  isSelected={selectedClipId === clip.id}
                  onSelect={() => { setSelectedClipId(clip.id); setShowSheet(true); }}
                  onDragStart={(e, h) => startDrag(e, clip.id, 'sub', h)}
                />
              ))}
            </TrackRow>

          </div>
        </div>
      </div>

      {/* ── INSPECTOR SHEET ── */}
      <AnimatePresence>
        {showSheet && (selBR || selSub) && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-50 bg-[#0f0f1e] border-t border-white/10 rounded-t-3xl"
            style={{ maxHeight: '45%' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white/15" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-1">
                {selBR ? 'B-Roll Clip' : 'Subtitle'}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => setShowSheet(false)} className="p-2 rounded-xl bg-white/5 active:scale-95">
                  <X size={13} className="text-white/40" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-5 pb-6 space-y-3" style={{ maxHeight: '35%' }}>
              {selSub && (
                <>
                  <textarea value={selSub.text} rows={2}
                    onChange={e => setSubtitleClips(p => p.map(c => c.id === selSub.id ? { ...c, text: e.target.value } : c))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none resize-none" />
                  <div className="flex gap-2">
                    {(['minimal', 'pop', 'bold'] as const).map(s => (
                      <button key={s} onClick={() => setSubtitleClips(p => p.map(c => c.id === selSub.id ? { ...c, style: s } : c))}
                        className={`flex-1 py-2.5 rounded-xl text-[8px] font-black uppercase active:scale-95 transition-all ${selSub.style === s ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/30'}`}>
                        {s}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Text Size</span>
                      <span className="text-[10px] font-black text-amber-400 tabular-nums">{subtitleSize}px</span>
                    </div>
                    <input 
                      type="range" min="24" max="120" step="2"
                      value={subtitleSize}
                      onChange={e => setSubtitleSize(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                  <button onClick={() => { setSubtitleClips(p => p.filter(c => c.id !== selSub.id)); setSelectedClipId(null); setShowSheet(false); }}
                    className="w-full py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95">
                    <Trash2 size={13} /> Delete
                  </button>
                </>
              )}
              {selBR && (
                <>
                  <div className="flex flex-col gap-4 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Manual Crop / Position</span>
                      <span className="text-[10px] font-black text-blue-400 tabular-nums">{(selBR.offsetX || 0) > 0 ? '+' : ''}{selBR.offsetX || 0}%</span>
                    </div>
                    <input 
                      type="range" min="-50" max="50" step="1"
                      value={selBR.offsetX || 0}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setBrollClips(p => p.map(c => c.id === selBR.id ? { ...c, offsetX: val } : c));
                      }}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-[8px] font-black text-white/20 uppercase tracking-widest">
                      <span>Left</span>
                      <span>Center</span>
                      <span>Right</span>
                    </div>
                  </div>

                  <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">{selBR.label}</div>

                  {/* Swap video button */}
                  <button 
                    onClick={() => {
                      setShowSheet(false);
                      openBRollHunterForClip(selBR.phraseId || selBR.id, selBR.prompt);
                    }}
                    className="w-full py-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95">
                    <Film size={13} /> Заменить видео
                  </button>

                  <button onClick={() => { setBrollClips(p => p.filter(c => c.id !== selBR.id)); setSelectedClipId(null); setShowSheet(false); }}
                    className="w-full py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95">
                    <Trash2 size={13} /> Delete Clip
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>





      {/* ── PHRASE PICKER MODAL ── */}
      <AnimatePresence>
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
      </AnimatePresence>

      {/* ── B-ROLL AI MODAL ── */}
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
      />

    </div>
  );
});

// ── Track Row ─────────────────────────────────────────────────────────────

const TrackRow = React.memo(({ label, color, children, onClick, onAdd, onTimelineClick }: { 
  label: string; 
  color: string; 
  children?: React.ReactNode; 
  onClick?: () => void;
  onAdd?: () => void;
  onTimelineClick?: (time: number) => void;
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const isHoldingRef = useRef(false);

  const startHold = (e: React.PointerEvent) => {
    // Only apply 3s hold for B-roll track
    if (label !== 'B' || !onTimelineClick) {
      return;
    }

    isHoldingRef.current = true;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setHoldProgress(0.01);

    const startTime = Date.now();
    const duration = 3000; // 3 seconds as requested

    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    
    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setHoldProgress(progress);

      if (progress >= 1) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
        isHoldingRef.current = false;
        
        // Trigger the action
        if (rowRef.current) {
          const rect = rowRef.current.getBoundingClientRect();
          const x = startPosRef.current.x - rect.left;
          const totalDuration = parseFloat(document.querySelector('[data-duration]')?.getAttribute('data-duration') || '0');
          if (totalDuration > 0) {
            onTimelineClick((x / rect.width) * totalDuration);
          }
        }
        setHoldProgress(0);
      }
    }, 50);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    isHoldingRef.current = false;
    setHoldProgress(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isHoldingRef.current) return;
    const dist = Math.sqrt(Math.pow(e.clientX - startPosRef.current.x, 2) + Math.pow(e.clientY - startPosRef.current.y, 2));
    if (dist > 10) cancelHold(); // Cancel if finger moves too much
  };

  const handleInternalClick = (e: React.MouseEvent) => {
    // For non-B tracks, keep regular click
    if (label === 'B') return; 

    if (!onTimelineClick || !rowRef.current) return;
    const rect = rowRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const duration = parseFloat(document.querySelector('[data-duration]')?.getAttribute('data-duration') || '0');
    if (duration > 0) {
      const time = (x / rect.width) * duration;
      onTimelineClick(time);
    }
  };

  return (
    <div className="flex border-b border-white/[0.04] group/track" style={{ height: 48 }} onClick={onClick}>
      <div className="w-14 flex-shrink-0 flex flex-col items-center justify-center border-r border-white/5 bg-black/40 relative">
        <span className={`text-[11px] font-black uppercase ${color}`}>{label}</span>
        {onAdd && (
          <button 
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors opacity-0 group-hover/track:opacity-100"
          >
            <Plus size={10} className="text-white" />
          </button>
        )}
      </div>
      <div 
        ref={rowRef}
        onClick={handleInternalClick}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerMove={handlePointerMove}
        className="flex-1 relative cursor-crosshair touch-none"
      >
        {/* Hold Progress Indicator */}
        {holdProgress > 0 && (
          <div 
            className="absolute top-0 bottom-0 bg-blue-500/20 border-r-2 border-blue-400 z-[60] pointer-events-none"
            style={{ 
              left: `${((startPosRef.current.x - (rowRef.current?.getBoundingClientRect().left || 0)) / (rowRef.current?.getBoundingClientRect().width || 1)) * 100}%`,
              width: `${holdProgress * 40}px`,
              transition: 'none'
            }}
          >
             <div className="absolute top-1/2 -translate-y-1/2 left-full ml-2 whitespace-nowrap bg-blue-600 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-xl">
               HOLD {Math.ceil(3 - holdProgress * 3)}s
             </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
});

// ── B-Roll Timeline Clip ──────────────────────────────────────────────────

const BRollTimelineClip = React.memo(({ clip, duration, isSelected, onSelect, onDragStart }: {
  clip: BRollClip; duration: number; isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, h: 'move' | 'start' | 'end') => void;
}) => {
  const left = `${(clip.startTime / duration) * 100}%`;
  const width = `${((clip.endTime - clip.startTime) / duration) * 100}%`;
  return (
    <div
      className={`absolute inset-y-1.5 rounded-lg border transition-all ${
        clip.url 
          ? 'bg-blue-600/40 border-blue-400 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
          : 'bg-purple-500/20 border-dashed border-purple-400/50 text-purple-200 animate-pulse'
      } ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''} flex items-center cursor-pointer touch-none z-10`}
      style={{ left, width, minWidth: 28 }}
      onClick={onSelect}
      onMouseDown={e => onDragStart(e, 'move')}
      onTouchStart={e => onDragStart(e, 'move')}>
      <div className="absolute left-0 top-0 bottom-0 w-6 cursor-ew-resize flex items-center justify-center group z-20"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'start'); }}
        onTouchStart={e => { e.stopPropagation(); onDragStart(e, 'start'); }}>
        <div className="w-1 h-5 bg-white/40 group-hover:bg-white rounded-full transition-colors" />
      </div>
      <span className="flex-1 text-[9px] font-black truncate px-6 select-none flex items-center gap-2">
        {!clip.url && <Sparkles size={10} className="text-purple-400 animate-spin-slow" />}
        {clip.url ? clip.label : 'Нажми, чтобы добавить видео'}
      </span>
      <div className="absolute right-0 top-0 bottom-0 w-6 cursor-ew-resize flex items-center justify-center group z-20"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'end'); }}
        onTouchStart={e => { e.stopPropagation(); onDragStart(e, 'end'); }}>
        <div className="w-1 h-5 bg-white/40 group-hover:bg-white rounded-full transition-colors" />
      </div>
    </div>
  );
});

// ── Subtitle Clip ─────────────────────────────────────────────────────────

const SubtitleTimelineClip = React.memo(({ clip, duration, isSelected, onSelect, onDragStart }: {
  clip: SubtitleClip; duration: number; isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, h: 'move' | 'start' | 'end') => void;
}) => {
  const left = `${(clip.startTime / duration) * 100}%`;
  const width = `${((clip.endTime - clip.startTime) / duration) * 100}%`;
  return (
    <div
      className={`absolute inset-y-1 rounded-lg border bg-amber-500/15 border-amber-400/30 text-amber-300 ${isSelected ? 'ring-1 ring-white/30' : ''} flex items-center cursor-pointer touch-none`}
      style={{ left, width, minWidth: 24 }}
      onClick={onSelect}
      onMouseDown={e => onDragStart(e, 'move')}
      onTouchStart={e => onDragStart(e, 'move')}>
      <div className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'start'); }}
        onTouchStart={e => { e.stopPropagation(); onDragStart(e, 'start'); }}>
        <div className="w-0.5 h-3 bg-white/30 rounded-full" />
      </div>
      <span className="flex-1 text-[7px] font-black truncate px-3 select-none">{clip.text}</span>
      <div className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'end'); }}
        onTouchStart={e => { e.stopPropagation(); onDragStart(e, 'end'); }}>
        <div className="w-0.5 h-3 bg-white/30 rounded-full" />
      </div>
    </div>
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
