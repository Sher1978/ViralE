'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Plus, Volume2, VolumeX, Type, Film,
  SkipBack, Trash2, ArrowRight, ArrowLeft, X,
  Upload, Sparkles, Loader2, RefreshCw
} from 'lucide-react';
import { ProductionManifest } from '@/lib/types/studio';
import BRollModal from '@/components/studio/BRollPickerModal';

interface BRollClip {
  id: string;
  url: string;
  label: string;
  prompt: string;
  startTime: number;
  endTime: number;
  track: number;
}

interface SubtitleClip {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  style: 'minimal' | 'pop' | 'bold';
}

interface VideoEditorProps {
  manifest: ProductionManifest | null;
  onBack: () => void;
  onNext: () => void;
  updateSegmentField: (id: string, field: string, value: any) => void;
  projectId?: string;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({
  manifest, onBack, onNext, updateSegmentField, projectId
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);

  // A-Roll source
  const [aRollUrl, setARollUrl] = useState<string | null>(null);

  useEffect(() => {
    const recording = manifest?.segments.find(s => s.type === 'user_recording' && s.assetUrl);
    const url = recording?.assetUrl || manifest?.segments[0]?.assetUrl || null;
    if (url) setARollUrl(url);
  }, [manifest]);

  // Ingestion state
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestProgress, setIngestProgress] = useState('');

  // B-Roll modal
  const [brollModalOpen, setBrollModalOpen] = useState(false);
  const [activeClipId, setActiveClipId] = useState<string | null>(null); // which clip is being edited
  const [activeBrollPrompt, setActiveBrollPrompt] = useState('');

  // Timeline clips
  const [brollClips, setBrollClips] = useState<BRollClip[]>(() =>
    (manifest?.segments || []).filter(s => s.overlayBroll).map((s, i) => ({
      id: s.id + '_br', url: s.overlayBroll!,
      label: `B-Roll ${i + 1}`, prompt: s.prompt || '',
      startTime: Math.round(i * (60 / 3)), endTime: Math.round(i * (60 / 3)) + 6,
      track: 0,
    }))
  );

  const [subtitleClips, setSubtitleClips] = useState<SubtitleClip[]>(() =>
    (manifest?.segments || []).filter(s => s.scriptText).map((s, i) => ({
      id: s.id + '_sub', text: s.scriptText,
      startTime: i * 5, endTime: i * 5 + 4,
      style: (s.captionStyle as any) || 'minimal',
    }))
  );

  // Inspector sheet
  const [showSheet, setShowSheet] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Drag
  const dragRef = useRef<{
    clipId: string; type: 'broll' | 'sub';
    handle: 'move' | 'start' | 'end';
    startX: number; origStart: number; origEnd: number;
  } | null>(null);

  // ── Video sync ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !aRollUrl) return;
    v.src = aRollUrl;
    const onTime = () => setCurrentTime(v.currentTime);
    const onLoad = () => setDuration(v.duration > 0 ? v.duration : 30);
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

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !aRollUrl) return;
    if (isPlaying) v.pause(); else v.play();
    setIsPlaying(p => !p);
  };

  // ── Upload & Ingest ──
  const handleVideoUpload = async (file: File) => {
    const localUrl = URL.createObjectURL(file);
    setARollUrl(localUrl);
    setIsPlaying(false);
    setCurrentTime(0);

    // Auto-ingest with AI transcription
    setIsIngesting(true);
    setIngestProgress('Analyzing video with AI...');

    try {
      // Upload to Supabase storage first (simplified: use object URL for now)
      // In production, upload to storage and get public URL
      setIngestProgress('Transcribing speech...');

      // Mock ingest for local blob URLs (real ingest needs hosted video)
      // Extract segments from manifest or create dummy ones for B-roll positioning
      await new Promise(r => setTimeout(r, 1500));
      setIngestProgress('Generating B-Roll prompts...');
      await new Promise(r => setTimeout(r, 1000));

      // Place 3 auto B-roll slots evenly on timeline (will be filled after AI gen)
      // We use manifest segments' prompts if available
      const segmentsWithPrompts = manifest?.segments.filter(s => s.prompt) || [];
      const vid = videoRef.current;
      const totalDur = vid?.duration || 30;

      const autoBrolls: BRollClip[] = [0, 1, 2].map((i) => {
        const start = Math.round((totalDur / 3) * i + 2);
        const seg = segmentsWithPrompts[i];
        return {
          id: `auto_br_${i}_${Date.now()}`,
          url: '', // will be filled after AI generation
          label: `B-Roll ${i + 1}`,
          prompt: seg?.prompt || `cinematic b-roll scene ${i + 1}`,
          startTime: start,
          endTime: Math.min(start + 5, totalDur - 1),
          track: 0,
        };
      });

      setBrollClips(autoBrolls);
      setIngestProgress('Done! 3 B-Roll slots placed.');
      setTimeout(() => { setIsIngesting(false); setIngestProgress(''); }, 1500);

    } catch (err) {
      console.error('Ingest failed:', err);
      setIsIngesting(false);
      setIngestProgress('');
    }
  };

  const openFileDialog = () => fileInputRef.current?.click();

  // ── Timeline scrub ──
  const handleTimelineTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current) return;
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    const clamped = Math.max(0, Math.min(t, duration));
    setCurrentTime(clamped);
    if (videoRef.current) videoRef.current.currentTime = clamped;
  }, [duration]);

  // ── Drag (mouse + touch) ──
  const startDrag = (
    e: React.MouseEvent | React.TouchEvent,
    clipId: string, type: 'broll' | 'sub', handle: 'move' | 'start' | 'end'
  ) => {
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clip = type === 'broll' ? brollClips.find(c => c.id === clipId) : subtitleClips.find(c => c.id === clipId);
    if (!clip) return;
    dragRef.current = { clipId, type, handle, startX: clientX, origStart: clip.startTime, origEnd: clip.endTime };
  };

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

  // ── B-Roll modal handlers ──
  const openBRollGenerator = (clipId?: string) => {
    if (clipId) {
      const clip = brollClips.find(c => c.id === clipId);
      setActiveClipId(clipId);
      setActiveBrollPrompt(clip?.prompt || '');
    } else {
      // New B-roll
      setActiveClipId(null);
      setActiveBrollPrompt('');
    }
    setBrollModalOpen(true);
  };

  const handleBRollSelect = (url: string) => {
    if (activeClipId) {
      // Update existing clip
      setBrollClips(p => p.map(c => c.id === activeClipId ? { ...c, url } : c));
    } else {
      // Add new clip
      const newClip: BRollClip = {
        id: `br_${Date.now()}`, url,
        label: 'B-Roll', prompt: activeBrollPrompt,
        startTime: currentTime,
        endTime: Math.min(currentTime + 5, duration),
        track: 0,
      };
      setBrollClips(p => [...p, newClip]);
    }
    setBrollModalOpen(false);
    setActiveClipId(null);
  };

  const selectClip = (id: string) => {
    setSelectedClipId(id);
    setShowSheet(true);
  };

  const addSubtitle = () => {
    const clip: SubtitleClip = {
      id: `sub_${Date.now()}`, text: 'Your text',
      startTime: currentTime, endTime: Math.min(currentTime + 4, duration),
      style: 'minimal'
    };
    setSubtitleClips(p => [...p, clip]);
    setSelectedClipId(clip.id);
    setShowSheet(true);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  const selBR = brollClips.find(c => c.id === selectedClipId);
  const selSub = subtitleClips.find(c => c.id === selectedClipId);

  return (
    <div className="flex flex-col bg-black text-white select-none" style={{ height: '100%', maxHeight: '100dvh', position: 'relative' }}>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ''; }} />

      {/* ── NAV BAR ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/90 backdrop-blur-md border-b border-white/10 z-20 flex-shrink-0">
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/8 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
          <ArrowLeft size={13} /> Back
        </button>
        <span className="text-[11px] font-black italic uppercase tracking-tighter text-white">
          Video <span className="text-purple-400">Editor</span>
        </span>
        <button onClick={onNext}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-lg shadow-purple-500/30 transition-all">
          Export <ArrowRight size={13} />
        </button>
      </div>

      {/* ── VIDEO PREVIEW ── */}
      <div className="relative bg-black flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ height: '40%' }}>

        {aRollUrl ? (
          <video ref={videoRef} muted={isMuted} className="w-full h-full object-contain" playsInline
            onClick={togglePlay} />
        ) : (
          /* Empty state — tap to upload */
          <button onClick={openFileDialog}
            className="flex flex-col items-center gap-4 w-full h-full justify-center bg-white/[0.02] border-2 border-dashed border-white/10 hover:border-purple-500/40 transition-all active:scale-[0.98]">
            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10">
              <Upload size={28} className="text-white/30" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-white/50 uppercase tracking-widest">Tap to Upload</p>
              <p className="text-[9px] text-white/20 mt-1 font-bold uppercase tracking-widest">A-Roll Source Video</p>
            </div>
          </button>
        )}

        {/* AI Ingestion overlay */}
        <AnimatePresence>
          {isIngesting && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
              <div className="w-14 h-14 rounded-3xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Sparkles size={24} className="text-purple-400 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-white uppercase tracking-widest">{ingestProgress}</p>
                <div className="flex gap-1 justify-center mt-3">
                  {[0,1,2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* B-Roll PiP overlays */}
        {aRollUrl && brollClips
          .filter(c => c.url && currentTime >= c.startTime && currentTime <= c.endTime)
          .map(clip => (
            <motion.div key={clip.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className={`absolute ${clip.track === 0 ? 'top-3 right-3' : 'top-3 left-3'} w-24 h-16 rounded-xl overflow-hidden border-2 ${selectedClipId === clip.id ? 'border-blue-400' : 'border-white/20'} shadow-xl cursor-pointer`}
              onClick={() => selectClip(clip.id)}>
              <video src={clip.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-blue-500/80 rounded text-[6px] font-black uppercase">{clip.label}</div>
            </motion.div>
          ))}

        {/* Subtitle overlay */}
        {aRollUrl && subtitleClips
          .filter(c => currentTime >= c.startTime && currentTime <= c.endTime)
          .map(sub => (
            <div key={sub.id} className={`absolute bottom-4 left-4 right-4 text-center pointer-events-none ${
              sub.style === 'bold' ? 'text-xl font-black text-yellow-400 drop-shadow-[0_2px_8px_rgba(0,0,0,1)]' :
              sub.style === 'pop' ? 'text-base font-black text-white bg-black/70 rounded-xl px-3 py-1 mx-auto inline-block' :
              'text-sm font-semibold text-white/90 drop-shadow-md'
            }`}>{sub.text}</div>
          ))}

        {/* Play/pause tap zone */}
        {aRollUrl && !isIngesting && (
          <button onClick={togglePlay}
            className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
            <div className="px-4 py-2 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 flex items-center gap-2">
              {isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
              <span className="text-[9px] font-black text-white/80">{fmt(currentTime)} / {fmt(duration)}</span>
            </div>
          </button>
        )}

        {/* Change video button */}
        {aRollUrl && (
          <button onClick={openFileDialog}
            className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 active:scale-95 z-20">
            <Upload size={12} className="text-white/50" />
          </button>
        )}
      </div>

      {/* ── TRANSPORT ── */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#0c0c18] border-y border-white/5 flex-shrink-0">
        <button onClick={() => { setCurrentTime(0); if (videoRef.current) videoRef.current.currentTime = 0; }}
          className="p-2 rounded-xl bg-white/5 active:scale-95 transition-all">
          <SkipBack size={14} className="text-white/50" />
        </button>
        <button onClick={togglePlay}
          className="w-10 h-10 rounded-2xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30 active:scale-95 transition-all">
          {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" className="ml-0.5" />}
        </button>
        <button onClick={() => setIsMuted(m => !m)} className="p-2 rounded-xl bg-white/5 active:scale-95">
          {isMuted ? <VolumeX size={14} className="text-white/40" /> : <Volume2 size={14} className="text-white/50" />}
        </button>
        <span className="text-[10px] font-black text-purple-400 tabular-nums ml-1">{fmt(currentTime)}<span className="text-white/20">/{fmt(duration)}</span></span>
        <div className="flex-1" />
        {/* B-Roll button → opens AI generator */}
        <button onClick={() => openBRollGenerator()}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[9px] font-black uppercase active:scale-95 transition-all">
          <Sparkles size={11} /> B-Roll AI
        </button>
        <button onClick={addSubtitle}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase active:scale-95 transition-all">
          <Type size={11} /> Sub
        </button>
      </div>

      {/* ── TIMELINE ── */}
      <div className="flex-1 bg-[#0a0a14] overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-x-auto overflow-y-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex flex-col" style={{ minWidth: `${Math.max(duration * 18, 320)}px`, height: '100%' }}>

            {/* Time ruler - full sync with video */}
            <div ref={timelineRef}
              className="h-6 bg-[#0c0c1c] border-b border-white/5 relative flex-shrink-0 cursor-pointer ml-14"
              style={{ width: `calc(100% - 56px)` }}
              onClick={handleTimelineTap}>
              {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => (
                i <= duration && (
                  <div key={i} className="absolute top-0 flex flex-col items-start"
                    style={{ left: `${(i / duration) * 100}%` }}>
                    <div className={`w-px ${i % 5 === 0 ? 'h-3 bg-white/25' : 'h-1.5 bg-white/10'}`} />
                    {i % 5 === 0 && <span className="text-[6px] text-white/20 font-black ml-0.5">{fmt(i)}</span>}
                  </div>
                )
              ))}
              {/* ── Playhead ── fully synced with video.currentTime */}
              <div className="absolute top-0 bottom-0 pointer-events-none z-20 transition-none"
                style={{ left: `${Math.min((currentTime / duration) * 100, 100)}%` }}>
                <div className="absolute top-0 w-px h-[999px] bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.9)]" style={{ transform: 'translateX(-0.5px)' }} />
                <div className="absolute -top-0 -left-[5px] w-[11px] h-[11px] rounded-full bg-purple-400 border-2 border-purple-200" />
              </div>
            </div>

            {/* A-Roll track */}
            <TrackRow label="A" color="text-emerald-400" onClick={aRollUrl ? undefined : openFileDialog}>
              {aRollUrl ? (
                <div className="absolute inset-y-1 left-0 right-0 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center px-3 overflow-hidden">
                  {/* Waveform visual (decorative) */}
                  <div className="flex gap-0.5 items-center h-4 mr-2 opacity-40">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="w-0.5 bg-emerald-400 rounded-full"
                        style={{ height: `${30 + Math.sin(i * 0.7) * 50}%` }} />
                    ))}
                  </div>
                  <span className="text-[8px] font-black text-emerald-400 truncate">🎥 A-Roll</span>
                </div>
              ) : (
                <div className="absolute inset-y-1 left-0 right-0 rounded-lg border border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-purple-500/40 transition-all">
                  <span className="text-[7px] font-black text-white/20 uppercase">Tap to upload video</span>
                </div>
              )}
            </TrackRow>

            {/* B-Roll 1 track */}
            <TrackRow label="B1" color="text-blue-400">
              {brollClips.filter(c => c.track === 0).map(clip => (
                <TimelineClip key={clip.id} clip={clip} duration={duration}
                  isSelected={selectedClipId === clip.id} color="blue"
                  isEmpty={!clip.url}
                  onSelect={() => {
                    if (!clip.url) { openBRollGenerator(clip.id); }
                    else { selectClip(clip.id); }
                  }}
                  onDragStart={(e, h) => startDrag(e, clip.id, 'broll', h)}
                  onRegenerate={() => openBRollGenerator(clip.id)}
                />
              ))}
            </TrackRow>

            {/* B-Roll 2 track */}
            <TrackRow label="B2" color="text-violet-400">
              {brollClips.filter(c => c.track === 1).map(clip => (
                <TimelineClip key={clip.id} clip={clip} duration={duration}
                  isSelected={selectedClipId === clip.id} color="violet"
                  isEmpty={!clip.url}
                  onSelect={() => {
                    if (!clip.url) openBRollGenerator(clip.id);
                    else selectClip(clip.id);
                  }}
                  onDragStart={(e, h) => startDrag(e, clip.id, 'broll', h)}
                  onRegenerate={() => openBRollGenerator(clip.id)}
                />
              ))}
            </TrackRow>

            {/* Subtitles track */}
            <TrackRow label="TXT" color="text-amber-400">
              {subtitleClips.map(clip => (
                <SubtitleTimelineClip key={clip.id} clip={clip} duration={duration}
                  isSelected={selectedClipId === clip.id}
                  onSelect={() => selectClip(clip.id)}
                  onDragStart={(e, h) => startDrag(e, clip.id, 'sub', h)}
                />
              ))}
            </TrackRow>

          </div>
        </div>
      </div>

      {/* ── BOTTOM SHEET ── */}
      <AnimatePresence>
        {showSheet && (selBR || selSub) && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-50 bg-[#0f0f1e] border-t border-white/10 rounded-t-3xl"
            style={{ maxHeight: '52%' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white/20" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50 mt-2">
                {selBR ? selBR.label : 'Subtitle'}
              </span>
              <div className="flex items-center gap-2 mt-2">
                {selBR && (
                  <button onClick={() => { setBrollModalOpen(true); setActiveClipId(selBR.id); setActiveBrollPrompt(selBR.prompt); setShowSheet(false); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[8px] font-black uppercase active:scale-95">
                    <RefreshCw size={10} /> Re-generate
                  </button>
                )}
                <button onClick={() => setShowSheet(false)} className="p-2 rounded-xl bg-white/5 active:scale-95">
                  <X size={14} className="text-white/40" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 pb-8 space-y-3" style={{ maxHeight: '40%' }}>
              {selBR && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {['startTime', 'endTime'].map(field => (
                      <label key={field}>
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{field === 'startTime' ? 'Start' : 'End'}</span>
                        <input type="number" step="0.1" min="0"
                          value={(selBR as any)[field].toFixed(1)}
                          onChange={e => setBrollClips(p => p.map(c => c.id === selBR.id ? {...c, [field]: parseFloat(e.target.value)||0} : c))}
                          className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {[0,1].map(t => (
                      <button key={t} onClick={() => setBrollClips(p => p.map(c => c.id === selBR.id ? {...c, track: t} : c))}
                        className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase active:scale-95 transition-all ${selBR.track === t ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/30'}`}>
                        Layer {t + 1}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setBrollClips(p => p.filter(c => c.id !== selBR.id)); setSelectedClipId(null); setShowSheet(false); }}
                    className="w-full py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95">
                    <Trash2 size={14} /> Delete Clip
                  </button>
                </>
              )}
              {selSub && (
                <>
                  <textarea value={selSub.text} rows={2}
                    onChange={e => setSubtitleClips(p => p.map(c => c.id === selSub.id ? {...c, text: e.target.value} : c))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    {(['minimal', 'pop', 'bold'] as const).map(s => (
                      <button key={s} onClick={() => setSubtitleClips(p => p.map(c => c.id === selSub.id ? {...c, style: s} : c))}
                        className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase active:scale-95 transition-all ${selSub.style === s ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/30'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['startTime', 'endTime'].map(field => (
                      <label key={field}>
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{field === 'startTime' ? 'Start' : 'End'}</span>
                        <input type="number" step="0.1"
                          value={(selSub as any)[field].toFixed(1)}
                          onChange={e => setSubtitleClips(p => p.map(c => c.id === selSub.id ? {...c, [field]: parseFloat(e.target.value)||0} : c))}
                          className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none"
                        />
                      </label>
                    ))}
                  </div>
                  <button onClick={() => { setSubtitleClips(p => p.filter(c => c.id !== selSub.id)); setSelectedClipId(null); setShowSheet(false); }}
                    className="w-full py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95">
                    <Trash2 size={14} /> Delete
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── B-ROLL AI MODAL ── */}
      <BRollModal
        isOpen={brollModalOpen}
        onClose={() => { setBrollModalOpen(false); setActiveClipId(null); }}
        onSelect={handleBRollSelect}
        segmentText={activeBrollPrompt}
        projectId={projectId}
      />
    </div>
  );
};

// ─── Track Row ───
const TrackRow: React.FC<{ label: string; color: string; children?: React.ReactNode; onClick?: () => void }> = ({ label, color, children, onClick }) => (
  <div className="flex border-b border-white/[0.04]" style={{ height: 36 }} onClick={onClick}>
    <div className="w-14 flex-shrink-0 flex items-center justify-center border-r border-white/[0.04] bg-black/50">
      <span className={`text-[8px] font-black uppercase ${color}`}>{label}</span>
    </div>
    <div className="flex-1 relative">{children}</div>
  </div>
);

// ─── Timeline B-Roll Clip ───
interface TCProps {
  clip: BRollClip; duration: number; isSelected: boolean; color: 'blue' | 'violet';
  isEmpty: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, h: 'move'|'start'|'end') => void;
  onRegenerate: () => void;
}
const TimelineClip: React.FC<TCProps> = ({ clip, duration, isSelected, color, isEmpty, onSelect, onDragStart, onRegenerate }) => {
  const left = `${(clip.startTime / duration) * 100}%`;
  const width = `${((clip.endTime - clip.startTime) / duration) * 100}%`;
  const c = isEmpty
    ? 'bg-white/5 border-white/10 border-dashed text-white/20'
    : color === 'blue'
      ? 'bg-blue-500/25 border-blue-400/50 text-blue-300'
      : 'bg-violet-500/25 border-violet-400/50 text-violet-300';
  return (
    <div className={`absolute inset-y-1 rounded-lg border ${c} ${isSelected && !isEmpty ? 'ring-1 ring-white/40' : ''} flex items-center cursor-pointer touch-none`}
      style={{ left, width, minWidth: 24 }}
      onClick={onSelect}
      onMouseDown={isEmpty ? undefined : e => onDragStart(e, 'move')}
      onTouchStart={isEmpty ? undefined : e => onDragStart(e, 'move')}>
      {!isEmpty && (
        <div className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center"
          onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'start'); }}
          onTouchStart={e => { e.stopPropagation(); onDragStart(e, 'start'); }}>
          <div className="w-0.5 h-3 bg-white/40 rounded-full" />
        </div>
      )}
      <span className="flex-1 text-[7px] font-black truncate px-3 select-none">
        {isEmpty ? <><Sparkles size={8} className="inline mr-1" />Generate</> : clip.label}
      </span>
      {!isEmpty && (
        <div className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center"
          onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'end'); }}
          onTouchStart={e => { e.stopPropagation(); onDragStart(e, 'end'); }}>
          <div className="w-0.5 h-3 bg-white/40 rounded-full" />
        </div>
      )}
    </div>
  );
};

// ─── Subtitle Clip ───
interface SCProps {
  clip: SubtitleClip; duration: number; isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, h: 'move'|'start'|'end') => void;
}
const SubtitleTimelineClip: React.FC<SCProps> = ({ clip, duration, isSelected, onSelect, onDragStart }) => {
  const left = `${(clip.startTime / duration) * 100}%`;
  const width = `${((clip.endTime - clip.startTime) / duration) * 100}%`;
  return (
    <div className={`absolute inset-y-1 rounded-lg border bg-amber-500/20 border-amber-400/40 text-amber-300 ${isSelected ? 'ring-1 ring-white/40' : ''} flex items-center cursor-pointer touch-none`}
      style={{ left, width, minWidth: 24 }}
      onClick={onSelect}
      onMouseDown={e => onDragStart(e, 'move')}
      onTouchStart={e => onDragStart(e, 'move')}>
      <div className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'start'); }}
        onTouchStart={e => { e.stopPropagation(); onDragStart(e, 'start'); }}>
        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
      </div>
      <span className="flex-1 text-[7px] font-black truncate px-3 select-none">{clip.text}</span>
      <div className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'end'); }}
        onTouchStart={e => { e.stopPropagation(); onDragStart(e, 'end'); }}>
        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
      </div>
    </div>
  );
};
