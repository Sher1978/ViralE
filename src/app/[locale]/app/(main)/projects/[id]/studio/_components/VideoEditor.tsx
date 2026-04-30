'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Volume2, VolumeX, Type, Film,
  SkipBack, Trash2, ArrowRight, ArrowLeft, X,
  Upload, Sparkles, Loader2, RefreshCw, Check, ChevronRight,
  Mic, FileText, Wand2, Eye, RotateCw, Cpu
} from 'lucide-react';
import { ProductionManifest } from '@/lib/types/studio';
import BRollModal from '@/components/studio/BRollPickerModal';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// ── Types ──────────────────────────────────────────────────────────────────

type EditorStage = 'empty' | 'transcribing' | 'reviewing_phrases' | 'generating' | 'editing';

interface TranscriptWord {
  text: string;
  start: number;
  end: number;
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

interface VideoEditorProps {
  manifest: ProductionManifest | null;
  onBack: () => void;
  onNext: (broll?: BRollClip[], subs?: SubtitleClip[]) => void;
  updateSegmentField: (id: string, field: string, value: any) => void;
  projectId?: string;
  onFaceless?: () => void;
}

// ── Helper: Mock Transcription ─────────────────────────────────────────────

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
  // Pick 2-3 phrases from middle 25%-85% of the video
  const start = Math.floor(transcript.length * 0.25);
  const end = Math.floor(transcript.length * 0.85);
  const pool = transcript.slice(start, end);
  const count = Math.min(pool.length, pool.length >= 3 ? 3 : 2);
  const step = Math.floor(pool.length / count);
  return Array.from({ length: count }, (_, i) => {
    const seg = pool[i * step];
    return {
      id: `phrase_${i}_${Date.now()}`,
      text: seg.text.slice(0, 60),
      start: seg.start,
      end: seg.end,
      approved: true,
    };
  });
}

// ── Main Component ──────────────────────────────────────────────────────────

export const VideoEditor = React.memo(({
  manifest, onBack, onNext, updateSegmentField, projectId, preFetchedBrolls: parentPreFetched, onFaceless
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

  // Inspector
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [subtitlePos, setSubtitlePos] = useState({ x: 0, y: 120 }); // Global sub position on video canvas

  // Drag
  const dragRef = useRef<{
    clipId: string; type: 'broll' | 'sub';
    handle: 'move' | 'start' | 'end';
    startX: number; origStart: number; origEnd: number;
  } | null>(null);

  // Guard to prevent double-transcription
  const transcriptionStartedRef = useRef(false);
  const persistenceLoadedRef = useRef(false);

  // ── Persistence: Save/Load local draft ──
  useEffect(() => {
    if (!projectId || persistenceLoadedRef.current) return;
    const key = `viral_editor_draft_${projectId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.aRollUrl) setARollUrl(data.aRollUrl);
        if (data.brollClips) setBrollClips(data.brollClips);
        if (data.subtitleClips) setSubtitleClips(data.subtitleClips);
        if (data.transcript) setTranscript(data.transcript);
        if (data.stage) setStage(data.stage);
        console.log('[Editor] Restored draft state from local storage');
      } catch (e) {
        console.error('Failed to restore draft:', e);
      }
    }
    persistenceLoadedRef.current = true;
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !aRollUrl || !persistenceLoadedRef.current) return;
    const key = `viral_editor_draft_${projectId}`;
    const state = { aRollUrl, brollClips, subtitleClips, transcript, stage };
    localStorage.setItem(key, JSON.stringify(state));
  }, [projectId, aRollUrl, brollClips, subtitleClips, transcript, stage]);

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
      setDuration(dur);
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

  // ── Drag listeners ──
  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current || !timelineRef.current) return;
      const { clipId, type, handle, startX, origStart, origEnd } = dragRef.current;
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const rect = timelineRef.current.getBoundingClientRect();
      const dSec = ((clientX - startX) / rect.width) * duration;
      const upd = (prev: any[]) => prev.map(c => {
        if (c.id !== clipId) return c;
        if (handle === 'move') { const len = origEnd - origStart; const ns = Math.max(0, origStart + dSec); return { ...c, startTime: ns, endTime: Math.min(ns + len, duration) }; }
        if (handle === 'start') return { ...c, startTime: Math.max(0, Math.min(origStart + dSec, c.endTime - 0.5)) };
        return { ...c, endTime: Math.min(duration, Math.max(origEnd + dSec, c.startTime + 0.5)) };
      });
      if (type === 'broll') setBrollClips(upd); else setSubtitleClips(upd);
    };
    const up = () => { dragRef.current = null; };
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
    const CHUNK_SIZE = 4;
    const chunks: SubtitleClip[] = [];
    let i = 0;
    const ts = Date.now();
    while (i < words.length) {
      const slice = words.slice(i, i + CHUNK_SIZE);
      const text = slice.map(w => w.text).join(' ');
      chunks.push({
        id: `sub_${i}_${ts}`,
        text,
        startTime: slice[0].start,
        endTime: slice[slice.length - 1].end,
        style: 'minimal' as const,
        // Store accent word (last) for overlay highlight
        accentWord: slice[slice.length - 1].text,
      } as any);
      i += CHUNK_SIZE;
    }
    return chunks;
  };

  const extractAudioOnly = async (blob: Blob): Promise<Blob> => {
    try {
      setStageMessage('Инициализация аудио-мотора...');
      const ffmpeg = new FFmpeg();
      
      // Load FFmpeg from CDN (stable version for v0.12)
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      setStageMessage('Извлечение звуковой дорожки...');
      const inputFileName = 'input_video';
      const outputFileName = 'output_audio.mp3';

      await ffmpeg.writeFile(inputFileName, await fetchFile(blob));
      
      // Extract audio to mp3 (mono, 44k, 64kbps is enough for transcription and small enough)
      await ffmpeg.exec(['-i', inputFileName, '-vn', '-acodec', 'libmp3lame', '-ac', '1', '-ar', '44100', '-b:a', '64k', outputFileName]);
      
      const data = await ffmpeg.readFile(outputFileName);
      // @ts-ignore - Handle potential Uint8Array/SharedArrayBuffer issues in Next.js build
      return new Blob([data], { type: 'audio/mp3' });
    } catch (e) {
      console.warn('[FFmpeg] Audio extraction failed, using original file:', e);
      return blob; // Fallback to original blob
    }
  };

  const runTranscriptionAndPhrases = async () => {
    setStageMessage('Анализ аудио...');
    setTranscriptionError(null);
    await delay(400);

    const dur = videoRef.current?.duration || duration;
    let words: TranscriptWord[] = [];
    let transcriptionOk = false;

    // 🔥 Optimization: If we already have a transcript (from Faceless Studio), use it!
    if (manifest?.transcript && Array.isArray(manifest.transcript)) {
      console.log('[Editor] Using pre-existing transcript from manifest');
      words = manifest.transcript.map((t: any) => ({
        text: t.text,
        start: t.start,
        end: t.end
      }));
      transcriptionOk = true;
    } else if (aRollUrl || rawFile) {
      setStageMessage('Извлечение аудио...');
      try {
        const formData = new FormData();
        let audioToTranscribe: Blob | null = null;
        
        // ── Step: Extract Audio to avoid 4.5MB payload limit ──
        try {
          const sourceBlob = rawFile || (aRollUrl?.startsWith('blob:') ? await fetch(aRollUrl).then(r => r.blob()) : null);
          if (sourceBlob) {
            audioToTranscribe = await extractAudioOnly(sourceBlob);
          }
        } catch (e) {
          console.warn('Advanced audio extraction failed, falling back to raw file:', e);
        }

        setStageMessage('AI расшифровка голоса...');
        if (audioToTranscribe) {
          formData.append('file', new File([audioToTranscribe], 'audio.wav', { type: 'audio/wav' }));
        } else if (rawFile) {
          formData.append('file', rawFile);
        } else if (aRollUrl) {
          const res = await fetch(aRollUrl);
          const blob = await res.blob();
          formData.append('file', new File([blob], 'video.mp4', { type: 'video/mp4' }));
        }

        // ── Fetch with Timeout ──
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        try {
          const res = await fetch('/api/ai/transcribe', { 
            method: 'POST', 
            body: formData,
            signal: controller.signal 
          });
          clearTimeout(timeoutId);
          
          // Robust check for JSON response
          const contentType = res.headers.get('content-type');
          const isJson = contentType && contentType.includes('application/json');

          if (!res.ok) {
            if (isJson) {
              const err = await res.json();
              throw new Error(err.error || `Server error (${res.status})`);
            } else {
              if (res.status === 413) throw new Error('Файл слишком велик для анализа. Попробуйте видео покороче.');
              throw new Error(`Ошибка сервера (${res.status}). Пожалуйста, попробуйте позже.`);
            }
          }

          if (!isJson) {
            throw new Error('Сервер вернул некорректный ответ. Попробуйте еще раз.');
          }

          const data = await res.json();

          if (data.transcript && data.transcript.length > 0) {
            words = data.transcript;
            transcriptionOk = true;
          }
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          if (fetchErr.name === 'AbortError') {
            throw new Error('Превышено время ожидания. Попробуйте файл поменьше или повторите позже.');
          }
          throw fetchErr;
        }
      } catch (err: any) {
        console.error('Transcription failed:', err);
        let msg = err.message || 'Ошибка расшифровки';
        if (msg.includes('Unexpected token') || msg.includes('is not valid JSON')) {
          msg = 'Ошибка формата данных. Попробуйте загрузить видео повторно.';
        }
        setTranscriptionError(msg);
      }
    }

    // If transcription failed — show error and stay in transcribing stage
    if (!transcriptionOk || words.length === 0) {
      setStageMessage(transcriptionError || 'Ошибка анализа аудио');
      // Force error state if it's somehow missing
      if (!transcriptionError) setTranscriptionError('Не удалось получить текст автоматически.');
      return;
    }


    // Build karaoke-style subtitle clips
    setStageMessage('Генерация субтитров...');
    await delay(300);
    const karaokeClips = buildKaraokeClips(words);
    setTranscript(words);
    setSubtitleClips(karaokeClips);

    // Pick B-Roll anchor phrases
    setStageMessage('Расстановка Б-ролла...');
    await delay(400);
    const picked = pickAIPhrases(words);
    setPhrases(picked);

    // Place B-Roll timeline placeholders immediately (no modal)
    const brollPlaceholders: BRollClip[] = picked.map(p => ({
      id: `br-${p.id}`,
      phraseId: p.id,
      startTime: p.start,
      endTime: Math.min(p.end, p.start + 5),
      label: p.text.slice(0, 24) + (p.text.length > 24 ? '…' : ''),
      url: '', // Will be filled when user taps to pick
      prompt: p.text,
      track: 1,
    }));
    setBrollClips(brollPlaceholders);

    // 🔥 Background auto-fetch best B-Roll and attach to placeholders
    picked.forEach(async (phrase) => {
      try {
        const res = await fetch(`/api/ai/broll-search?query=${encodeURIComponent(phrase.text)}`);
        const data = await res.json();
        if (data.videos && data.videos.length > 0) {
          const bestUrl = data.videos[0].url || data.videos[0].video_files?.[0]?.link || '';
          setPreFetchedBrolls(prev => ({ ...prev, [phrase.id]: data.videos }));
          // Auto-attach the first result to the timeline placeholder
          if (bestUrl) {
            setBrollClips(prev => prev.map(c =>
              c.phraseId === phrase.id ? { ...c, url: bestUrl } : c
            ));
          }
        }
      } catch (err) {
        console.error('BG BRoll fetch failed:', err);
      }
    });

    setStageMessage('');
    setStage('editing'); // Go straight to editing — no intermediate "review phrases" screen
  };

  const runTranscription = runTranscriptionAndPhrases;

  // ── Manual B-Roll Hunter (opens modal for a specific phrase) ──
  const openBRollHunterForClip = (phraseId: string, prompt: string) => {
    setActiveBrollPhraseId(phraseId);
    setActiveBrollPrompt(prompt);
    setBrollModalOpen(true);
  };

  // ── Manual B-Roll generation (kept for toolbar button) ──
  const generateBRoll = async () => {
    // Just opens hunter for first un-filled phrase, or nothing if all set
    const firstEmpty = brollClips.find(c => !c.url);
    if (firstEmpty) {
      openBRollHunterForClip(firstEmpty.phraseId || firstEmpty.id, firstEmpty.prompt);
    }
  };

  const handleBRollSelect = (url: string) => {
    if (activeBrollPhraseId) {
      const phrase = phrases.find(p => p.id === activeBrollPhraseId);
      if (phrase) {
        setBrollClips(prev => {
          const existingIdx = prev.findIndex(c => c.id === `br-${activeBrollPhraseId}`);
          if (existingIdx !== -1) {
            // Update placeholder
            const next = [...prev];
            next[existingIdx] = { ...next[existingIdx], url, track: 0 };
            return next;
          } else {
            // Fallback: Create new if not found
            const newClip: BRollClip = {
              id: `br_${Date.now()}`,
              url,
              label: phrase.text.slice(0, 20) + '...',
              prompt: phrase.text,
              startTime: phrase.start,
              endTime: Math.min(phrase.end, phrase.start + 6),
              track: 0,
            };
            return [...prev, newClip];
          }
        });
        setGeneratingPhraseIds(prev => { const n = new Set(prev); n.delete(activeBrollPhraseId!); return n; });

        // Check if more approved phrases need BRoll
        const remaining = phrases.filter(p =>
          p.approved &&
          p.id !== activeBrollPhraseId &&
          !brollClips.some(c => c.prompt === p.text)
        );
        if (remaining.length > 0) {
          const next = remaining[0];
          setActiveBrollPrompt(next.text);
          setActiveBrollPhraseId(next.id);
          setBrollModalOpen(true);
          return;
        }
      }
    }
    setBrollModalOpen(false);
    setActiveBrollPhraseId(null);
    setStage('editing');
    setPhrases([]);
  };

  // ── Video Upload ────────────────────────────────────────────────────────

  const handleVideoUpload = async (file: File) => {
    const localUrl = URL.createObjectURL(file);
    setARollUrl(localUrl);
    setRawFile(file);
    setVideoSource('upload');
    setIsPlaying(false);
    setCurrentTime(0);
    setSubtitleClips([]);
    setBrollClips([]);
    setTranscript([]);
    setStage('transcribing');
    setStageMessage('Detecting audio...');
    await delay(600);
    // Always run transcription (if manifest exists it uses it, else uses fallback AI mock)
    await runTranscription();
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
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clip = type === 'broll' ? brollClips.find(c => c.id === clipId) : subtitleClips.find(c => c.id === clipId);
    if (!clip) return;
    dragRef.current = { clipId, type, handle, startX: clientX, origStart: clip.startTime, origEnd: clip.endTime };
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
    <div className="flex flex-col bg-[#050508] text-white select-none" style={{ height: '100%', maxHeight: '100dvh', position: 'relative' }}>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ''; }} />

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
              className="mt-8 py-4 rounded-2xl bg-white/5 text-white/30 text-[10px] font-black uppercase tracking-[0.3em] active:scale-95 transition-all"
            >
              Cancel Production
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NAV BAR (Only if video loaded) ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 z-20 flex-shrink-0 bg-[#050508]">

        <button onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
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
            console.log('[Editor] Exporting project:', projectId, { brollCount: brollClips.length });
            onNext?.(brollClips, subtitleClips);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-lg shadow-purple-500/30 transition-all hover:bg-purple-400">
          Export <ArrowRight size={12} />
        </button>
      </div>

      {/* ── VIDEO PREVIEW ── */}
      <div className="relative bg-black flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ height: '38%' }}>

        {aRollUrl ? (
          <div className="relative w-full h-full">
            <video 
              key={aRollUrl}
              ref={videoRef} 
              muted={isMuted} 
              className="w-full h-full object-contain" 
              playsInline 
              onClick={togglePlay} 
            />
            {/* ── B-ROLL OVERLAY PREVIEW ── */}
            {(() => {
              const activeBR = brollClips.find(c => c.url && currentTime >= c.startTime && currentTime <= c.endTime);
              if (!activeBR) return null;
              return (
                <div className="absolute inset-0 z-10 bg-black">
                   <video 
                     src={activeBR.url}
                     autoPlay
                     muted
                     loop
                     playsInline
                     className="w-full h-full object-cover"
                     style={{ 
                       objectPosition: `${50 + (activeBR.offsetX || 0)}% 50%` 
                     }}
                   />
                   {/* Label */}
                   <div className="absolute top-4 left-4 px-2 py-1 bg-blue-600/80 rounded text-[8px] font-black uppercase tracking-widest text-white">
                      B-Roll Active
                   </div>
                </div>
              );
            })()}
          </div>
        ) : (

          <div className="flex flex-col items-center justify-center gap-4 w-full h-full p-6">
            {/* Upload Own Video */}
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-4 w-full px-6 py-5 rounded-2xl bg-white/[0.03] border-2 border-dashed border-white/10 hover:border-purple-500/40 transition-all active:scale-[0.98]">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 flex-shrink-0">
                <Upload size={20} className="text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-black text-white/60 uppercase tracking-widest">Загрузить видео</p>
                <p className="text-[9px] text-white/20 mt-0.5 font-bold uppercase tracking-widest">A-Roll · Своя съёмка</p>
              </div>
            </button>
            {/* AI Faceless */}
            {onFaceless && (
              <button onClick={onFaceless}
                className="flex items-center gap-4 w-full px-6 py-5 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30 hover:border-purple-500/60 transition-all active:scale-[0.98]">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-black text-purple-300 uppercase tracking-widest">AI Faceless</p>
                  <p className="text-[9px] text-white/30 mt-0.5 font-bold uppercase tracking-widest">Генерация картинок + анимация</p>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Subtitle Overlay – Karaoke Style */}
        <AnimatePresence mode="wait">
          {aRollUrl && stage !== 'transcribing' && (() => {
            const activeSub = subtitleClips.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
            if (!activeSub) return null;
            const accentWord = (activeSub as any).accentWord || '';
            const words = activeSub.text.split(' ');
            return (
              <motion.div
                drag
                dragMomentum={false}
                dragConstraints={{ left: -150, right: 150, top: -200, bottom: 200 }}
                onDragEnd={(e, info) => setSubtitlePos(p => ({ x: p.x + info.offset.x, y: p.y + info.offset.y }))}
                key={`${activeSub.id}-${activeSub.style}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, x: subtitlePos.x }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute z-30 pointer-events-auto cursor-move select-none text-center px-4 max-w-[90%] left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bottom-14"
                style={{ top: `calc(50% + ${subtitlePos.y}px)` }}
              >
                {activeSub.style === 'minimal' && (
                  <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
                    {words.map((word, wi) => (
                      <span
                        key={wi}
                        className={`text-[22px] font-black leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,1)] tracking-tight transition-all duration-150 ${
                          word === accentWord
                            ? 'text-amber-400 scale-110 inline-block [text-shadow:0_0_20px_rgba(245,158,11,0.8)]'
                            : 'text-white'
                        }`}
                      >{word}</span>
                    ))}
                  </div>
                )}
                {activeSub.style === 'pop' && (
                  <span className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xl font-black italic uppercase tracking-tighter shadow-[0_0_30px_rgba(168,85,247,0.8)] border border-purple-400/50">
                    {activeSub.text}
                  </span>
                )}
                {activeSub.style === 'bold' && (
                  <div className="flex flex-wrap justify-center gap-x-2">
                    {words.map((word, wi) => (
                      <span key={wi} className={`text-3xl font-black uppercase tracking-tighter italic drop-shadow-[0_4px_0_rgba(0,0,0,1)] ${word === accentWord ? 'text-amber-400' : 'text-white'}`}>
                        {word}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Processing Overlay */}
        <AnimatePresence>
          {stage === 'transcribing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
              <div className="w-14 h-14 rounded-3xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Wand2 size={24} className="text-purple-400 animate-pulse" />
              </div>
              <div className="text-center px-8">
                <p className="text-xs font-black text-white uppercase tracking-widest leading-relaxed">{stageMessage}</p>
                {transcriptionError ? (
                  <div className="mt-5 space-y-4">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                      <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest leading-tight">
                        {transcriptionError}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <button 
                        onClick={() => {
                          setTranscriptionError(null);
                          transcriptionStartedRef.current = false;
                          runTranscriptionAndPhrases();
                        }}
                        className="w-full px-6 py-3 rounded-2xl bg-purple-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-purple-600 transition-all active:scale-95 shadow-lg shadow-purple-500/20"
                      >
                        Повторить попытку
                      </button>
                      <button 
                        onClick={() => {
                          console.log('[VideoEditor] Using draft fallback...');
                          const fallback = buildTranscript(manifest, duration);
                          const karaokeClips = buildKaraokeClips(fallback);
                          const picked = pickAIPhrases(fallback);
                          
                          setTranscript(fallback);
                          setSubtitleClips(karaokeClips);
                          setPhrases(picked);
                          
                          // Place B-Roll placeholders
                          const brollPlaceholders: BRollClip[] = picked.map(p => ({
                            id: `br-${p.id}`,
                            phraseId: p.id,
                            startTime: p.start,
                            endTime: p.end,
                            label: p.text.substring(0, 20) + '...',
                            status: 'pending'
                          }));
                          setBrollClips(brollPlaceholders);
                          
                          setStage('editing');
                        }}
                        className="w-full px-6 py-3 rounded-2xl bg-white/10 border border-white/20 text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95"
                      >
                        {manifest ? 'Использовать черновик' : 'Продолжить без текста'}
                      </button>
                    </div>
                    <p className="text-[9px] text-white/30 uppercase tracking-widest leading-relaxed">
                      {manifest 
                        ? 'AI-анализ не удался. Вы можете повторить или продолжить с текстом из сценария.' 
                        : 'AI-анализ не удался. Вы можете повторить или продолжить монтаж вручную.'}
                    </p>
                  </div>
                ) : (
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
                )}
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Play/pause + timecode */}
        {aRollUrl && stage !== 'transcribing' && (
          <button onClick={togglePlay}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 shadow-2xl">
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
          className="w-10 h-10 rounded-2xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20 active:scale-95">
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
            runTranscription();
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest hover:text-purple-400 hover:border-purple-500/30 transition-all"
        >
          <Sparkles size={12} /> Refine AI Subtitles
        </button>


        {/* Stage Actions */}
        {(stage === 'editing' || stage === 'empty') && subtitleClips.length === 0 && aRollUrl && (
          <button onClick={runTranscription}
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
            <TrackRow label="B" color="text-blue-400">
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
                  <button onClick={() => { setSubtitleClips(p => p.filter(c => c.id !== selSub.id)); setSelectedClipId(null); setShowSheet(false); }}
                    className="w-full py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95">
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

const TrackRow = React.memo(({ label, color, children, onClick }: { label: string; color: string; children?: React.ReactNode; onClick?: () => void }) => (
  <div className="flex border-b border-white/[0.04]" style={{ height: 48 }} onClick={onClick}>
    <div className="w-14 flex-shrink-0 flex items-center justify-center border-r border-white/5 bg-black/40">
      <span className={`text-[11px] font-black uppercase ${color}`}>{label}</span>
    </div>
    <div className="flex-1 relative">{children}</div>
  </div>
));

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
        clip.url ? 'bg-blue-500/20 border-blue-400/40 text-blue-300' : 'bg-white/5 border-dashed border-white/20 text-white/30'
      } ${isSelected ? 'ring-2 ring-white/40' : ''} flex items-center cursor-pointer touch-none`}
      style={{ left, width, minWidth: 28 }}
      onClick={onSelect}
      onMouseDown={e => onDragStart(e, 'move')}
      onTouchStart={e => onDragStart(e, 'move')}>
      <div className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'start'); }}
        onTouchStart={e => { e.stopPropagation(); onDragStart(e, 'start'); }}>
        <div className="w-0.5 h-4 bg-white/40 rounded-full" />
      </div>
      <span className="flex-1 text-[9px] font-black truncate px-3 select-none flex items-center gap-2">
        {!clip.url && <Sparkles size={10} className="text-purple-400" />}
        {clip.label}
      </span>
      <div className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'end'); }}
        onTouchStart={e => { e.stopPropagation(); onDragStart(e, 'end'); }}>
        <div className="w-0.5 h-4 bg-white/40 rounded-full" />
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
