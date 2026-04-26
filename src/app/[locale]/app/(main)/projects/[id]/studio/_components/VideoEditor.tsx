'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, ChevronLeft, ChevronRight, Plus,
  Volume2, VolumeX, Type, Film, Layers,
  SkipBack, Trash2, ArrowRight, ArrowLeft, X,
  Upload, Check
} from 'lucide-react';
import { ProductionManifest } from '@/lib/types/studio';

interface BRollClip {
  id: string;
  url: string;
  label: string;
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
}

export const VideoEditor: React.FC<VideoEditorProps> = ({
  manifest, onBack, onNext
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  const aRollSegment = manifest?.segments.find(s => s.type === 'user_recording' && s.assetUrl)
    || manifest?.segments[0];
  const aRollUrl = aRollSegment?.assetUrl || null;

  const [brollClips, setBrollClips] = useState<BRollClip[]>(() =>
    (manifest?.segments || []).filter(s => s.overlayBroll).map((s, i) => ({
      id: s.id + '_br',
      url: s.overlayBroll!,
      label: `B-Roll ${i + 1}`,
      startTime: i * 7,
      endTime: i * 7 + 5,
      track: i % 2,
    }))
  );

  const [subtitleClips, setSubtitleClips] = useState<SubtitleClip[]>(() =>
    (manifest?.segments || []).filter(s => s.scriptText).map((s, i) => ({
      id: s.id + '_sub',
      text: s.scriptText,
      startTime: i * 5,
      endTime: i * 5 + 4,
      style: (s.captionStyle as any) || 'minimal',
    }))
  );

  const dragRef = useRef<{
    clipId: string; type: 'broll' | 'sub';
    handle: 'move' | 'start' | 'end';
    startX: number; origStart: number; origEnd: number;
  } | null>(null);

  // Video sync
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onLoad = () => setDuration(v.duration || 30);
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
    if (!v) return;
    if (isPlaying) v.pause(); else v.play();
    setIsPlaying(!isPlaying);
  };

  // Drag (mouse + touch)
  const startDrag = (
    e: React.MouseEvent | React.TouchEvent,
    clipId: string, type: 'broll' | 'sub',
    handle: 'move' | 'start' | 'end'
  ) => {
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clip = type === 'broll'
      ? brollClips.find(c => c.id === clipId)
      : subtitleClips.find(c => c.id === clipId);
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

      const update = (prev: any[]) => prev.map(c => {
        if (c.id !== clipId) return c;
        if (handle === 'move') {
          const len = origEnd - origStart;
          const ns = Math.max(0, origStart + dSec);
          return { ...c, startTime: ns, endTime: Math.min(ns + len, duration) };
        }
        if (handle === 'start') return { ...c, startTime: Math.max(0, Math.min(origStart + dSec, c.endTime - 0.5)) };
        return { ...c, endTime: Math.min(duration, Math.max(origEnd + dSec, c.startTime + 0.5)) };
      });

      if (type === 'broll') setBrollClips(update);
      else setSubtitleClips(update);
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

  const handleTimelineTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current) return;
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    const clamped = Math.max(0, Math.min(t, duration));
    setCurrentTime(clamped);
    if (videoRef.current) videoRef.current.currentTime = clamped;
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  const pct = (t: number) => `${(t / duration) * 100}%`;

  const addBRoll = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*,image/*';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const clip: BRollClip = {
        id: `br_${Date.now()}`, url,
        label: file.name.split('.')[0].slice(0, 12),
        startTime: currentTime,
        endTime: Math.min(currentTime + 5, duration),
        track: 0,
      };
      setBrollClips(p => [...p, clip]);
      setSelectedClipId(clip.id);
      setShowSheet(true);
    };
    input.click();
  };

  const selectClip = (id: string) => {
    setSelectedClipId(id);
    setShowSheet(true);
  };

  const selBR = brollClips.find(c => c.id === selectedClipId);
  const selSub = subtitleClips.find(c => c.id === selectedClipId);

  return (
    <div className="flex flex-col bg-black text-white select-none" style={{ height: '100%', maxHeight: '100dvh' }}>

      {/* ── NAV BAR ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/10 z-20 flex-shrink-0">
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
      <div className="relative bg-black flex items-center justify-center flex-shrink-0"
        style={{ height: '38%' }}>
        {aRollUrl ? (
          <video ref={videoRef} src={aRollUrl} muted={isMuted}
            className="w-full h-full object-contain" playsInline />
        ) : (
          <div className="flex flex-col items-center gap-3 opacity-20">
            <Film size={40} />
            <span className="text-[9px] font-black uppercase tracking-widest">No Source Video</span>
            <button onClick={addBRoll} className="px-4 py-2 rounded-xl bg-white/10 text-white text-[9px] font-black uppercase">
              Upload A-Roll
            </button>
          </div>
        )}

        {/* B-Roll overlays */}
        {brollClips.filter(c => currentTime >= c.startTime && currentTime <= c.endTime).map(clip => (
          <div key={clip.id}
            className={`absolute ${clip.track === 0 ? 'top-2 right-2 w-28 h-16' : 'top-2 left-2 w-28 h-16'} rounded-xl overflow-hidden border-2 ${selectedClipId === clip.id ? 'border-blue-400' : 'border-white/20'} shadow-xl`}>
            <video src={clip.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-blue-500/80 rounded text-[6px] font-black uppercase">{clip.label}</div>
          </div>
        ))}

        {/* Subtitle overlay */}
        {subtitleClips.filter(c => currentTime >= c.startTime && currentTime <= c.endTime).map(sub => (
          <div key={sub.id} className={`absolute bottom-4 left-4 right-4 text-center ${
            sub.style === 'bold' ? 'text-xl font-black text-yellow-400 drop-shadow-[0_2px_8px_rgba(0,0,0,1)]' :
            sub.style === 'pop' ? 'text-base font-black text-white bg-black/70 rounded-xl px-3 py-1' :
            'text-sm font-semibold text-white/90 drop-shadow-md'
          }`}>{sub.text}</div>
        ))}

        {/* Big play button */}
        <button onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
            {isPlaying ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" className="ml-1" />}
          </div>
        </button>

        {/* HUD: time + mute */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          <span className="text-[9px] font-black bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg text-white/60">
            {fmt(currentTime)}/{fmt(duration)}
          </span>
          <button onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-lg bg-black/70 backdrop-blur-sm active:scale-95">
            {isMuted ? <VolumeX size={12} className="text-white/50" /> : <Volume2 size={12} className="text-white/50" />}
          </button>
        </div>
      </div>

      {/* ── TRANSPORT ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#0c0c18] border-y border-white/5 flex-shrink-0">
        <button onClick={() => { setCurrentTime(0); if (videoRef.current) videoRef.current.currentTime = 0; }}
          className="p-2 rounded-xl bg-white/5 active:scale-95"><SkipBack size={14} className="text-white/50" /></button>
        <button onClick={togglePlay}
          className="w-10 h-10 rounded-2xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30 active:scale-95">
          {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" className="ml-0.5" />}
        </button>
        <span className="text-[10px] font-black text-purple-400 tabular-nums">{fmt(currentTime)}</span>
        <div className="flex-1" />
        <button onClick={addBRoll}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase active:scale-95">
          <Plus size={11} /> B-Roll
        </button>
        <button onClick={() => {
          const clip: SubtitleClip = {
            id: `sub_${Date.now()}`, text: 'Your text',
            startTime: currentTime, endTime: Math.min(currentTime + 4, duration),
            style: 'minimal'
          };
          setSubtitleClips(p => [...p, clip]);
          setSelectedClipId(clip.id);
          setShowSheet(true);
        }}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase active:scale-95">
          <Type size={11} /> Sub
        </button>
      </div>

      {/* ── TIMELINE ── */}
      <div className="flex-1 bg-[#0a0a14] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-x-auto overflow-y-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex flex-col" style={{ minWidth: `${Math.max(duration * 18, 300)}px`, height: '100%' }}>

            {/* Time ruler */}
            <div ref={timelineRef}
              className="h-6 bg-[#0c0c1c] border-b border-white/5 relative flex-shrink-0 cursor-pointer ml-14"
              onClick={handleTimelineTap}>
              {Array.from({ length: Math.floor(duration) + 1 }, (_, i) => (
                <div key={i} className="absolute top-0 flex flex-col items-start"
                  style={{ left: `${(i / duration) * 100}%` }}>
                  <div className={`w-px ${i % 5 === 0 ? 'h-3 bg-white/25' : 'h-1.5 bg-white/10'}`} />
                  {i % 5 === 0 && <span className="text-[6px] text-white/20 font-black ml-0.5">{fmt(i)}</span>}
                </div>
              ))}
              {/* Playhead */}
              <div className="absolute top-0 bottom-0 pointer-events-none z-10"
                style={{ left: `${(currentTime / duration) * 100}%` }}>
                <div className="absolute -top-0 left-0 w-0.5 h-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.9)]" />
                <div className="absolute -top-0.5 -left-1.5 w-3 h-3 rounded-full bg-purple-400" />
              </div>
            </div>

            {/* A-Roll track */}
            <MobileTrackRow label="A" color="text-emerald-400">
              <div className="absolute inset-y-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center px-2"
                style={{ left: 0, right: 0 }}>
                <span className="text-[8px] font-black text-emerald-400 truncate">🎥 {aRollSegment?.type === 'user_recording' ? 'Recording' : 'Source'}</span>
              </div>
            </MobileTrackRow>

            {/* B-Roll track 1 */}
            <MobileTrackRow label="B1" color="text-blue-400">
              {brollClips.filter(c => c.track === 0).map(clip => (
                <MobileClip key={clip.id} clip={clip} duration={duration} isSelected={selectedClipId === clip.id}
                  color="blue" onSelect={() => selectClip(clip.id)}
                  onDragStart={(e, h) => startDrag(e, clip.id, 'broll', h)} />
              ))}
            </MobileTrackRow>

            {/* B-Roll track 2 */}
            <MobileTrackRow label="B2" color="text-violet-400">
              {brollClips.filter(c => c.track === 1).map(clip => (
                <MobileClip key={clip.id} clip={clip} duration={duration} isSelected={selectedClipId === clip.id}
                  color="violet" onSelect={() => selectClip(clip.id)}
                  onDragStart={(e, h) => startDrag(e, clip.id, 'broll', h)} />
              ))}
            </MobileTrackRow>

            {/* Subtitles track */}
            <MobileTrackRow label="TXT" color="text-amber-400">
              {subtitleClips.map(clip => (
                <MobileSubClip key={clip.id} clip={clip} duration={duration}
                  isSelected={selectedClipId === clip.id}
                  onSelect={() => selectClip(clip.id)}
                  onDragStart={(e, h) => startDrag(e, clip.id, 'sub', h)} />
              ))}
            </MobileTrackRow>

          </div>
        </div>
      </div>

      {/* ── BOTTOM SHEET (Inspector) ── */}
      <AnimatePresence>
        {showSheet && (selBR || selSub) && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-50 bg-[#0f0f1e] border-t border-white/10 rounded-t-3xl"
            style={{ maxHeight: '55%' }}
          >
            {/* Handle */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50 mt-3">
                {selBR ? `B-Roll — ${selBR.label}` : 'Subtitle'}
              </span>
              <button onClick={() => setShowSheet(false)} className="p-2 rounded-xl bg-white/5 active:scale-95 mt-2">
                <X size={14} className="text-white/40" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 pb-6" style={{ maxHeight: '44%' }}>
              {selBR && (
                <div className="space-y-3">
                  {/* Timing */}
                  <div className="grid grid-cols-2 gap-2">
                    <label>
                      <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Start</span>
                      <input type="number" step="0.1" min="0"
                        value={selBR.startTime.toFixed(1)}
                        onChange={e => setBrollClips(p => p.map(c => c.id === selBR.id ? {...c, startTime: parseFloat(e.target.value)||0} : c))}
                        className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                    </label>
                    <label>
                      <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">End</span>
                      <input type="number" step="0.1" min="0"
                        value={selBR.endTime.toFixed(1)}
                        onChange={e => setBrollClips(p => p.map(c => c.id === selBR.id ? {...c, endTime: parseFloat(e.target.value)||0} : c))}
                        className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                    </label>
                  </div>
                  {/* Track */}
                  <div>
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Layer</span>
                    <div className="flex gap-2 mt-1">
                      {[0, 1].map(t => (
                        <button key={t}
                          onClick={() => setBrollClips(p => p.map(c => c.id === selBR.id ? {...c, track: t} : c))}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 ${selBR.track === t ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-white/30'}`}>
                          B-Roll {t + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Delete */}
                  <button
                    onClick={() => { setBrollClips(p => p.filter(c => c.id !== selBR.id)); setSelectedClipId(null); setShowSheet(false); }}
                    className="w-full py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95">
                    <Trash2 size={14} /> Delete Clip
                  </button>
                </div>
              )}

              {selSub && (
                <div className="space-y-3">
                  <label>
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Text</span>
                    <textarea value={selSub.text} rows={2}
                      onChange={e => setSubtitleClips(p => p.map(c => c.id === selSub.id ? {...c, text: e.target.value} : c))}
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                    />
                  </label>
                  <div>
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Style</span>
                    <div className="flex gap-2 mt-1">
                      {(['minimal', 'pop', 'bold'] as const).map(s => (
                        <button key={s}
                          onClick={() => setSubtitleClips(p => p.map(c => c.id === selSub.id ? {...c, style: s} : c))}
                          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase active:scale-95 transition-all ${selSub.style === s ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/30'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label>
                      <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Start</span>
                      <input type="number" step="0.1"
                        value={selSub.startTime.toFixed(1)}
                        onChange={e => setSubtitleClips(p => p.map(c => c.id === selSub.id ? {...c, startTime: parseFloat(e.target.value)||0} : c))}
                        className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </label>
                    <label>
                      <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">End</span>
                      <input type="number" step="0.1"
                        value={selSub.endTime.toFixed(1)}
                        onChange={e => setSubtitleClips(p => p.map(c => c.id === selSub.id ? {...c, endTime: parseFloat(e.target.value)||0} : c))}
                        className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </label>
                  </div>
                  <button
                    onClick={() => { setSubtitleClips(p => p.filter(c => c.id !== selSub.id)); setSelectedClipId(null); setShowSheet(false); }}
                    className="w-full py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Mini Track Row ───
const MobileTrackRow: React.FC<{ label: string; color: string; children?: React.ReactNode }> = ({ label, color, children }) => (
  <div className="flex border-b border-white/[0.04]" style={{ height: 36 }}>
    <div className={`w-14 flex-shrink-0 flex items-center justify-center border-r border-white/[0.04] bg-black/50`}>
      <span className={`text-[8px] font-black uppercase ${color}`}>{label}</span>
    </div>
    <div className="flex-1 relative">{children}</div>
  </div>
);

// ─── Draggable B-Roll Clip ───
interface MobileClipProps {
  clip: BRollClip; duration: number; isSelected: boolean; color: 'blue' | 'violet';
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, h: 'move'|'start'|'end') => void;
}
const MobileClip: React.FC<MobileClipProps> = ({ clip, duration, isSelected, color, onSelect, onDragStart }) => {
  const left = `${(clip.startTime / duration) * 100}%`;
  const width = `${((clip.endTime - clip.startTime) / duration) * 100}%`;
  const c = color === 'blue'
    ? 'bg-blue-500/25 border-blue-400/50 text-blue-300'
    : 'bg-violet-500/25 border-violet-400/50 text-violet-300';
  return (
    <div className={`absolute inset-y-1 rounded-lg border ${c} ${isSelected ? 'ring-1 ring-white/50' : ''} flex items-center cursor-grab active:cursor-grabbing touch-none`}
      style={{ left, width, minWidth: 20 }}
      onClick={onSelect}
      onMouseDown={e => onDragStart(e, 'move')}
      onTouchStart={e => onDragStart(e, 'move')}>
      {/* Left handle */}
      <div className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'start'); }}
        onTouchStart={e => { e.stopPropagation(); onDragStart(e, 'start'); }}>
        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
      </div>
      <span className="flex-1 text-[7px] font-black truncate px-3 select-none">{clip.label}</span>
      {/* Right handle */}
      <div className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'end'); }}
        onTouchStart={e => { e.stopPropagation(); onDragStart(e, 'end'); }}>
        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
      </div>
    </div>
  );
};

// ─── Draggable Subtitle Clip ───
interface MobileSubProps {
  clip: SubtitleClip; duration: number; isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, h: 'move'|'start'|'end') => void;
}
const MobileSubClip: React.FC<MobileSubProps> = ({ clip, duration, isSelected, onSelect, onDragStart }) => {
  const left = `${(clip.startTime / duration) * 100}%`;
  const width = `${((clip.endTime - clip.startTime) / duration) * 100}%`;
  return (
    <div className={`absolute inset-y-1 rounded-lg border bg-amber-500/20 border-amber-400/40 text-amber-300 ${isSelected ? 'ring-1 ring-white/50' : ''} flex items-center cursor-grab touch-none`}
      style={{ left, width, minWidth: 20 }}
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
