'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Volume2, VolumeX, Type, Film,
  SkipBack, Trash2, ArrowRight, ArrowLeft, X,
  Upload, Sparkles, Loader2, RefreshCw, Check, ChevronRight,
  Mic, FileText, Wand2, Eye, RotateCw
} from 'lucide-react';
import { ProductionManifest } from '@/lib/types/studio';
import BRollModal from '@/components/studio/BRollPickerModal';

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
  url: string;
  label: string;
  prompt: string;
  startTime: number;
  endTime: number;
  track: number;
}

interface VideoEditorProps {
  manifest: ProductionManifest | null;
  onBack: () => void;
  onNext: () => void;
  updateSegmentField: (id: string, field: string, value: any) => void;
  projectId?: string;
}

// ── Helper: Mock Transcription ─────────────────────────────────────────────

function buildTranscript(manifest: ProductionManifest | null, videoDuration: number): TranscriptWord[] {
  const segments = manifest?.segments?.filter((s: any) => s.scriptText) || [];
  if (segments.length === 0) return [];

  const dur = videoDuration > 0 ? videoDuration : 60;
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

export const VideoEditor: React.FC<VideoEditorProps> = ({
  manifest, onBack, onNext, updateSegmentField, projectId
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stage machine
  const [stage, setStage] = useState<EditorStage>('empty');
  const [stageMessage, setStageMessage] = useState('');

  // Video
  const [aRollUrl, setARollUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);
  const [videoSource, setVideoSource] = useState<'teleprompter' | 'upload' | null>(null);

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
  const [generatingPhraseIds, setGeneratingPhraseIds] = useState<Set<string>>(new Set());

  // Inspector
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  // Drag
  const dragRef = useRef<{
    clipId: string; type: 'broll' | 'sub';
    handle: 'move' | 'start' | 'end';
    startX: number; origStart: number; origEnd: number;
  } | null>(null);

  // ── Sync manifest A-Roll (for teleprompter/headless flow) ──
  useEffect(() => {
    const rec = manifest?.segments?.find((s: any) => s.type === 'user_recording' && s.assetUrl);
    const url = rec?.assetUrl || manifest?.segments?.[0]?.assetUrl || null;
    if (url && !aRollUrl) {
      setARollUrl(url);
      setVideoSource('teleprompter');
      setStage('transcribing');
    }
  }, [manifest]);

  // ── Auto-transcribe then auto-select phrases (zero friction) ──
  useEffect(() => {
    if (stage === 'transcribing' && videoSource === 'teleprompter') {
      runTranscriptionAndPhrases();
    }
  }, [stage, videoSource]);

  // Auto-confirm countdown state
  const [autoConfirmSeconds, setAutoConfirmSeconds] = useState(4);
  const autoConfirmRef = useRef<NodeJS.Timeout | null>(null);

  // Start countdown when phrases are shown
  useEffect(() => {
    if (stage === 'reviewing_phrases') {
      setAutoConfirmSeconds(4);
      autoConfirmRef.current = setInterval(() => {
        setAutoConfirmSeconds(prev => {
          if (prev <= 1) {
            clearInterval(autoConfirmRef.current!);
            generateBRoll();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (autoConfirmRef.current) clearInterval(autoConfirmRef.current);
    }
    return () => { if (autoConfirmRef.current) clearInterval(autoConfirmRef.current); };
  }, [stage]);

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

  // ── Stage 1+2: Transcription → Auto Phrase Selection (zero friction) ──

  const runTranscriptionAndPhrases = async () => {
    setStage('transcribing');
    setStageMessage('Analysing audio...');
    await delay(600);
    setStageMessage('Generating subtitles...');
    await delay(500);

    const dur = videoRef.current?.duration || duration;
    const words = buildTranscript(manifest, dur);

    const subs: SubtitleClip[] = words.map((w, i) => ({
      id: `sub_${i}_${Date.now()}`,
      text: w.text,
      startTime: w.start,
      endTime: w.end,
      style: 'minimal' as const,
    }));

    setTranscript(words);
    setSubtitleClips(subs);

    setStageMessage('AI selecting B-Roll moments...');
    await delay(700);

    const picked = pickAIPhrases(words);
    setPhrases(picked);
    setStageMessage('');
    setStage('reviewing_phrases');
  };

  const runTranscription = runTranscriptionAndPhrases;

  // ── Stage 2: Manual trigger (for replay) ──────────────────────────────

  const runPhraseSelection = async () => {
    setStage('transcribing');
    setStageMessage('AI selecting B-Roll moments...');
    await delay(900);
    const picked = pickAIPhrases(transcript.length > 0 ? transcript : buildTranscript(manifest, duration));
    setPhrases(picked);
    setStageMessage('');
    setStage('reviewing_phrases');
  };

  const cancelAutoConfirm = () => {
    if (autoConfirmRef.current) clearInterval(autoConfirmRef.current);
  };

  // ── Phrase Review Actions ───────────────────────────────────────────────

  const removePhrase = (id: string) => {
    setPhrases(prev => prev.filter(p => p.id !== id));
  };

  const openPhrasePicker = (phraseId: string) => {
    setEditingPhraseId(phraseId);
    setPhrasePickerOpen(true);
  };

  const swapPhrase = (word: TranscriptWord) => {
    if (!editingPhraseId) return;
    setPhrases(prev => prev.map(p =>
      p.id === editingPhraseId
        ? { ...p, text: word.text.slice(0, 60), start: word.start, end: word.end }
        : p
    ));
    setPhrasePickerOpen(false);
    setEditingPhraseId(null);
  };

  // ── Stage 3: B-Roll Generation ──────────────────────────────────────────

  const generateBRoll = async () => {
    const approved = phrases.filter(p => p.approved);
    if (approved.length === 0) return;
    setStage('generating');

    for (const phrase of approved) {
      setGeneratingPhraseIds(prev => new Set([...prev, phrase.id]));
      // Open BRoll modal pre-filled with the phrase as the search prompt
      setActiveBrollPrompt(phrase.text);
      setActiveBrollPhraseId(phrase.id);
      setBrollModalOpen(true);
      // Wait for user to select from modal (handled in handleBRollSelect)
      break; // Open one at a time
    }
  };

  const handleBRollSelect = (url: string) => {
    if (activeBrollPhraseId) {
      const phrase = phrases.find(p => p.id === activeBrollPhraseId);
      if (phrase) {
        const newClip: BRollClip = {
          id: `br_${Date.now()}`,
          url,
          label: phrase.text.slice(0, 20) + '...',
          prompt: phrase.text,
          startTime: phrase.start,
          endTime: Math.min(phrase.end, phrase.start + 6),
          track: 0,
        };
        setBrollClips(prev => [...prev, newClip]);
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
    setVideoSource('upload');
    setIsPlaying(false);
    setCurrentTime(0);
    setSubtitleClips([]);
    setBrollClips([]);
    setTranscript([]);
    setStage('transcribing');
    setStageMessage('Detecting audio...');
    await delay(600);
    // For user-uploaded video: use AI transcription (mock)
    if (manifest?.segments?.some((s: any) => s.scriptText)) {
      await runTranscription();
    } else {
      // No script: show manual transcription prompt
      setStageMessage('No script found. Using AI audio analysis...');
      await delay(800);
      setStage('editing');
      setStageMessage('');
    }
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
  return (
    <div className="flex flex-col bg-[#050508] text-white select-none" style={{ height: '100%', maxHeight: '100dvh', position: 'relative' }}>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ''; }} />

      {/* ── NAV BAR ── */}
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

        <button onClick={onNext}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-lg shadow-purple-500/30 transition-all">
          Export <ArrowRight size={12} />
        </button>
      </div>

      {/* ── VIDEO PREVIEW ── */}
      <div className="relative bg-black flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ height: '38%' }}>

        {aRollUrl ? (
          <video ref={videoRef} muted={isMuted} className="w-full h-full object-contain" playsInline onClick={togglePlay} />
        ) : (
          <button onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-3 w-full h-full justify-center bg-white/[0.02] border-2 border-dashed border-white/10 hover:border-purple-500/40 transition-all active:scale-[0.98]">
            <div className="w-14 h-14 rounded-3xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <Upload size={24} className="text-purple-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-white/50 uppercase tracking-widest">Tap to Upload</p>
              <p className="text-[9px] text-white/20 mt-0.5 font-bold uppercase tracking-widest">A-Roll Source Video</p>
            </div>
          </button>
        )}

        {/* Processing Overlay */}
        <AnimatePresence>
          {stage === 'transcribing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
              <div className="w-14 h-14 rounded-3xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Wand2 size={24} className="text-purple-400 animate-pulse" />
              </div>
              <div className="text-center px-8">
                <p className="text-xs font-black text-white uppercase tracking-widest">{stageMessage}</p>
                <div className="flex gap-1 justify-center mt-3">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play/pause + timecode */}
        {aRollUrl && stage !== 'transcribing' && (
          <button onClick={togglePlay}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl bg-black/70 backdrop-blur-sm border border-white/10">
            {isPlaying ? <Pause size={12} fill="white" /> : <Play size={12} fill="white" className="ml-0.5" />}
            <span className="text-[9px] font-black text-white/80 tabular-nums">{fmt(currentTime)} / {fmt(duration)}</span>
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
          className="p-2 rounded-xl bg-white/5 active:scale-95">
          <SkipBack size={13} className="text-white/40" />
        </button>
        <button onClick={togglePlay}
          className="w-9 h-9 rounded-2xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20 active:scale-95">
          {isPlaying ? <Pause size={15} fill="white" /> : <Play size={15} fill="white" className="ml-0.5" />}
        </button>
        <button onClick={() => setIsMuted(m => !m)} className="p-2 rounded-xl bg-white/5 active:scale-95">
          {isMuted ? <VolumeX size={13} className="text-white/30" /> : <Volume2 size={13} className="text-white/40" />}
        </button>
        <span className="text-[10px] font-black text-purple-400 tabular-nums">{fmt(currentTime)}<span className="text-white/20">/{fmt(duration)}</span></span>

        <div className="flex-1" />

        {/* Stage Actions */}
        {(stage === 'editing' || stage === 'empty') && subtitleClips.length === 0 && aRollUrl && (
          <button onClick={runTranscription}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase active:scale-95 transition-all">
            <Mic size={11} /> Transcribe
          </button>
        )}

        {stage === 'editing' && subtitleClips.length > 0 && (
          <button onClick={runPhraseSelection}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[9px] font-black uppercase active:scale-95 transition-all">
            <Sparkles size={11} /> AI B-Roll
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
                    {i % 5 === 0 && <span className="text-[6px] text-white/20 font-black ml-0.5">{fmt(i)}</span>}
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
                  <span className="text-[8px] font-black text-emerald-400 truncate">🎥 A-Roll</span>
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
                  onSelect={() => { setSelectedClipId(clip.id); setShowSheet(true); }}
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

      {/* ── PHRASE REVIEW BANNER (Stage 2) — Compact Auto-Confirm ── */}
      <AnimatePresence>
        {stage === 'reviewing_phrases' && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="absolute inset-x-0 bottom-0 z-[60] bg-[#0d0d1c]/95 backdrop-blur-md border-t border-purple-500/20 px-4 pt-3 pb-4"
          >
            {/* Top row: label + countdown + actions */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-purple-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                  AI B-Roll Moments
                </span>
                <span className="text-[9px] text-white/25">· Edit or auto-confirm</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Auto-confirm countdown */}
                <motion.div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/20"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span className="text-[9px] font-black text-purple-300 tabular-nums">
                    Auto {autoConfirmSeconds}s
                  </span>
                </motion.div>
                <button
                  onClick={() => { cancelAutoConfirm(); setStage('editing'); setPhrases([]); }}
                  className="p-1.5 rounded-xl bg-white/5 active:scale-95"
                >
                  <X size={11} className="text-white/30" />
                </button>
              </div>
            </div>

            {/* Phrase chips */}
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {phrases.map((phrase) => (
                  <motion.div
                    key={phrase.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-2xl px-3 py-2"
                  >
                    <span className="text-[8px] font-black text-purple-400 tabular-nums flex-shrink-0">{fmt(phrase.start)}</span>
                    <p className="flex-1 text-[10px] text-white/70 truncate font-medium">"{phrase.text}"</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { cancelAutoConfirm(); openPhrasePicker(phrase.id); }}
                        className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/15 active:scale-95"
                        title="Swap"
                      >
                        <RotateCw size={10} className="text-blue-400" />
                      </button>
                      <button
                        onClick={() => removePhrase(phrase.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/15 active:scale-95"
                        title="Remove"
                      >
                        <X size={10} className="text-red-400" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Generate now CTA */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { cancelAutoConfirm(); generateBRoll(); }}
              disabled={approvedCount === 0}
              className={`w-full mt-3 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all ${
                approvedCount > 0
                  ? 'bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              <Sparkles size={12} /> Generate Now ({approvedCount})
            </motion.button>
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

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {allTranscript.map((word, i) => (
                <button key={i} onClick={() => swapPhrase(word)}
                  className="w-full text-left p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-purple-500/10 hover:border-purple-500/20 active:scale-98 transition-all group">
                  <div className="flex items-start gap-3">
                    <span className="text-[8px] font-black text-white/20 tabular-nums pt-0.5 flex-shrink-0">{fmt(word.start)}</span>
                    <span className="text-[11px] text-white/70 leading-snug group-hover:text-white transition-colors">{word.text}</span>
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
      />

    </div>
  );
};

// ── Track Row ─────────────────────────────────────────────────────────────

const TrackRow: React.FC<{ label: string; color: string; children?: React.ReactNode; onClick?: () => void }> = ({ label, color, children, onClick }) => (
  <div className="flex border-b border-white/[0.03]" style={{ height: 38 }} onClick={onClick}>
    <div className="w-14 flex-shrink-0 flex items-center justify-center border-r border-white/[0.03] bg-black/40">
      <span className={`text-[8px] font-black uppercase ${color}`}>{label}</span>
    </div>
    <div className="flex-1 relative">{children}</div>
  </div>
);

// ── B-Roll Timeline Clip ──────────────────────────────────────────────────

const BRollTimelineClip: React.FC<{
  clip: BRollClip; duration: number; isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, h: 'move' | 'start' | 'end') => void;
}> = ({ clip, duration, isSelected, onSelect, onDragStart }) => {
  const left = `${(clip.startTime / duration) * 100}%`;
  const width = `${((clip.endTime - clip.startTime) / duration) * 100}%`;
  return (
    <div
      className={`absolute inset-y-1 rounded-lg border bg-blue-500/20 border-blue-400/40 text-blue-300 ${isSelected ? 'ring-1 ring-white/30' : ''} flex items-center cursor-pointer touch-none`}
      style={{ left, width, minWidth: 24 }}
      onClick={onSelect}
      onMouseDown={e => onDragStart(e, 'move')}
      onTouchStart={e => onDragStart(e, 'move')}>
      <div className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'start'); }}
        onTouchStart={e => { e.stopPropagation(); onDragStart(e, 'start'); }}>
        <div className="w-0.5 h-3 bg-white/30 rounded-full" />
      </div>
      <span className="flex-1 text-[7px] font-black truncate px-3 select-none">{clip.label}</span>
      <div className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'end'); }}
        onTouchStart={e => { e.stopPropagation(); onDragStart(e, 'end'); }}>
        <div className="w-0.5 h-3 bg-white/30 rounded-full" />
      </div>
    </div>
  );
};

// ── Subtitle Clip ─────────────────────────────────────────────────────────

const SubtitleTimelineClip: React.FC<{
  clip: SubtitleClip; duration: number; isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, h: 'move' | 'start' | 'end') => void;
}> = ({ clip, duration, isSelected, onSelect, onDragStart }) => {
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
};

// ── Helpers ───────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
