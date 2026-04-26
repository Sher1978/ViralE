'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, ChevronLeft, ChevronRight, Plus, Scissors,
  Volume2, VolumeX, Maximize2, Type, Film, Layers,
  SkipBack, SkipForward, Trash2, ArrowRight, ArrowLeft,
  AlignLeft, AlignCenter, Bold, Upload
} from 'lucide-react';
import { ProductionManifest, SceneSegment } from '@/lib/types/studio';

interface BRollClip {
  id: string;
  url: string;
  label: string;
  startTime: number; // seconds on timeline
  endTime: number;
  track: number; // 0 or 1 (two b-roll tracks)
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

const TIMELINE_DURATION = 60; // seconds total view
const PX_PER_SEC = 20; // pixels per second

export const VideoEditor: React.FC<VideoEditorProps> = ({
  manifest, onBack, onNext, updateSegmentField
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'broll' | 'subtitles' | 'layers'>('broll');

  // Primary A-Roll source
  const aRollSegment = manifest?.segments.find(s => s.type === 'user_recording' && s.assetUrl)
    || manifest?.segments[0];
  const aRollUrl = aRollSegment?.assetUrl || null;

  // B-Roll clips state (built from manifest)
  const [brollClips, setBrollClips] = useState<BRollClip[]>(() => {
    if (!manifest) return [];
    return manifest.segments
      .filter(s => s.overlayBroll)
      .map((s, i) => ({
        id: s.id + '_broll',
        url: s.overlayBroll!,
        label: `B-Roll ${i + 1}`,
        startTime: i * 8,
        endTime: i * 8 + 6,
        track: i % 2,
      }));
  });

  // Subtitle clips
  const [subtitleClips, setSubtitleClips] = useState<SubtitleClip[]>(() => {
    if (!manifest) return [];
    return manifest.segments
      .filter(s => s.scriptText)
      .map((s, i) => ({
        id: s.id + '_sub',
        text: s.scriptText,
        startTime: i * 6,
        endTime: i * 6 + 5,
        style: (s.captionStyle as any) || 'minimal',
      }));
  });

  // Drag state
  const dragRef = useRef<{
    clipId: string;
    type: 'broll' | 'subtitle';
    handle: 'move' | 'start' | 'end';
    startX: number;
    origStart: number;
    origEnd: number;
  } | null>(null);

  // Playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => setCurrentTime(video.currentTime);
    const onLoaded = () => setDuration(video.duration || 60);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onLoaded);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [aRollUrl]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) { v.pause(); } else { v.play(); }
    setIsPlaying(!isPlaying);
  };

  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = t;
    setCurrentTime(t);
  };

  // Timeline scrub
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const t = (x / rect.width) * duration;
    seekTo(Math.max(0, Math.min(t, duration)));
  };

  // Drag handlers for B-Roll clips
  const startDrag = (
    e: React.MouseEvent,
    clipId: string,
    type: 'broll' | 'subtitle',
    handle: 'move' | 'start' | 'end'
  ) => {
    e.stopPropagation();
    const clip = type === 'broll'
      ? brollClips.find(c => c.id === clipId)
      : subtitleClips.find(c => c.id === clipId);
    if (!clip) return;
    dragRef.current = {
      clipId, type, handle,
      startX: e.clientX,
      origStart: clip.startTime,
      origEnd: clip.endTime,
    };
    setSelectedClipId(clipId);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current || !timelineRef.current) return;
      const { clipId, type, handle, startX, origStart, origEnd } = dragRef.current;
      const rect = timelineRef.current.getBoundingClientRect();
      const dx = e.clientX - startX;
      const dSec = (dx / rect.width) * duration;

      if (type === 'broll') {
        setBrollClips(prev => prev.map(c => {
          if (c.id !== clipId) return c;
          if (handle === 'move') {
            const len = origEnd - origStart;
            const ns = Math.max(0, origStart + dSec);
            return { ...c, startTime: ns, endTime: ns + len };
          }
          if (handle === 'start') return { ...c, startTime: Math.max(0, Math.min(origStart + dSec, c.endTime - 0.5)) };
          return { ...c, endTime: Math.min(duration, Math.max(origEnd + dSec, c.startTime + 0.5)) };
        }));
      } else {
        setSubtitleClips(prev => prev.map(c => {
          if (c.id !== clipId) return c;
          if (handle === 'move') {
            const len = origEnd - origStart;
            const ns = Math.max(0, origStart + dSec);
            return { ...c, startTime: ns, endTime: ns + len };
          }
          if (handle === 'start') return { ...c, startTime: Math.max(0, Math.min(origStart + dSec, c.endTime - 0.5)) };
          return { ...c, endTime: Math.min(duration, Math.max(origEnd + dSec, c.startTime + 0.5)) };
        }));
      }
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [duration]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const timeToPercent = (t: number) => (t / duration) * 100;

  const selectedBRoll = brollClips.find(c => c.id === selectedClipId);
  const selectedSub = subtitleClips.find(c => c.id === selectedClipId);

  // Add new broll from file
  const handleUploadBRoll = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*,image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const newClip: BRollClip = {
        id: `broll_${Date.now()}`,
        url,
        label: file.name.split('.')[0],
        startTime: currentTime,
        endTime: Math.min(currentTime + 5, duration),
        track: 0,
      };
      setBrollClips(prev => [...prev, newClip]);
      setSelectedClipId(newClip.id);
    };
    input.click();
  };

  return (
    <div className="flex-1 flex flex-col bg-[#080810] text-white overflow-hidden animate-in fade-in duration-500">
      
      {/* === TOP NAV === */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-black/40 backdrop-blur-md z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="text-center">
          <h2 className="text-sm font-black uppercase italic tracking-tighter text-white">
            Video <span className="text-purple-400">Editor</span>
          </h2>
          <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Timeline Assembly</p>
        </div>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-purple-500/20"
        >
          Export <ArrowRight size={14} />
        </button>
      </div>

      {/* === MAIN AREA (Preview + Properties) === */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Video Preview */}
        <div className="flex flex-col flex-1 overflow-hidden">
          
          {/* Video Preview */}
          <div className="relative bg-black flex items-center justify-center" style={{ height: '55%' }}>
            {aRollUrl ? (
              <video
                ref={videoRef}
                src={aRollUrl}
                muted={isMuted}
                className="h-full w-auto max-w-full object-contain"
                onClick={togglePlay}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 opacity-20">
                <Film size={48} />
                <span className="text-[10px] font-black uppercase tracking-widest">No A-Roll Source</span>
              </div>
            )}

            {/* B-Roll overlay preview */}
            {brollClips.map(clip => {
              if (currentTime < clip.startTime || currentTime > clip.endTime) return null;
              return (
                <motion.div
                  key={clip.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`absolute ${clip.track === 0 ? 'inset-4 bottom-1/3' : 'inset-4 top-1/3'} rounded-2xl overflow-hidden border-2 ${selectedClipId === clip.id ? 'border-blue-400' : 'border-white/20'} shadow-2xl`}
                >
                  <video src={clip.url} autoPlay loop muted className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500 rounded-lg text-[7px] font-black uppercase">{clip.label}</div>
                </motion.div>
              );
            })}

            {/* Subtitle overlay */}
            {subtitleClips.map(sub => {
              if (currentTime < sub.startTime || currentTime > sub.endTime) return null;
              return (
                <div key={sub.id} className={`absolute bottom-8 left-0 right-0 px-6 text-center pointer-events-none ${
                  sub.style === 'bold' ? 'text-3xl font-black text-yellow-400 drop-shadow-[0_2px_8px_rgba(0,0,0,1)]' :
                  sub.style === 'pop' ? 'text-2xl font-black text-white bg-black/60 rounded-xl px-4 py-2 inline-block mx-auto' :
                  'text-xl font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]'
                }`}>
                  {sub.text}
                </div>
              );
            })}

            {/* Play overlay */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-all group"
              >
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform border border-white/30">
                  <Play size={28} className="text-white ml-1" fill="white" />
                </div>
              </button>
            )}

            {/* Time + mute overlay */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <span className="text-[9px] font-black bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-white/70">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md hover:bg-black/80 transition-all">
                {isMuted ? <VolumeX size={12} className="text-white/60" /> : <Volume2 size={12} className="text-white/60" />}
              </button>
            </div>
          </div>

          {/* === TIMELINE === */}
          <div className="flex-1 bg-[#0c0c18] border-t border-white/5 overflow-hidden flex flex-col">
            
            {/* Transport controls */}
            <div className="flex items-center gap-4 px-4 py-2 border-b border-white/5">
              <button onClick={() => seekTo(0)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"><SkipBack size={14} /></button>
              <button onClick={togglePlay} className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center hover:bg-purple-400 transition-all">
                {isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
              </button>
              <button onClick={() => seekTo(duration)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"><SkipForward size={14} /></button>
              <div className="h-4 w-px bg-white/10 mx-1" />
              <span className="text-[9px] font-black text-purple-400 tracking-widest">{formatTime(currentTime)}</span>
              <div className="flex-1" />
              <button onClick={handleUploadBRoll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[8px] font-black uppercase tracking-widest hover:bg-blue-500/30 transition-all">
                <Plus size={10} /> Add B-Roll
              </button>
              <button onClick={() => setSubtitleClips(prev => [...prev, {
                id: `sub_${Date.now()}`, text: 'New subtitle',
                startTime: currentTime, endTime: Math.min(currentTime + 4, duration), style: 'minimal'
              }])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[8px] font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-all">
                <Type size={10} /> Add Sub
              </button>
            </div>

            {/* Timeline scroll area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
              <div className="relative" style={{ minWidth: `${duration * PX_PER_SEC + 80}px`, height: '100%' }}>
                
                {/* Ruler */}
                <div
                  ref={timelineRef}
                  className="h-7 bg-[#0e0e1e] border-b border-white/5 relative cursor-crosshair flex-shrink-0 ml-16"
                  onClick={handleTimelineClick}
                  style={{ width: `${duration * PX_PER_SEC}px` }}
                >
                  {Array.from({ length: Math.floor(duration) + 1 }, (_, i) => (
                    <div key={i} className="absolute top-0 flex flex-col items-center" style={{ left: `${i * PX_PER_SEC}px` }}>
                      <div className="w-px h-2 bg-white/20" />
                      {i % 5 === 0 && <span className="text-[7px] text-white/20 font-black mt-0.5">{formatTime(i)}</span>}
                    </div>
                  ))}
                  {/* Playhead */}
                  <div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: `${timeToPercent(currentTime)}%` }}>
                    <div className="w-0.5 h-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,1)]" />
                  </div>
                </div>

                {/* Track rows */}
                <div className="flex flex-col" style={{ marginLeft: 0 }}>
                  {/* A-Roll Track */}
                  <TrackRow label="A-Roll" color="emerald" icon={<Film size={10} />}>
                    <div
                      className="absolute top-1 bottom-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 overflow-hidden flex items-center px-2"
                      style={{ left: 0, width: `${timeToPercent(duration)}%` }}
                    >
                      <span className="text-[8px] font-black text-emerald-400 uppercase truncate">
                        {aRollSegment?.type === 'user_recording' ? '🎥 Your Recording' : '📦 Source Video'}
                      </span>
                    </div>
                  </TrackRow>

                  {/* B-Roll Track 0 */}
                  <TrackRow label="B-Roll 1" color="blue" icon={<Layers size={10} />}>
                    {brollClips.filter(c => c.track === 0).map(clip => (
                      <BRollClipUI
                        key={clip.id}
                        clip={clip}
                        duration={duration}
                        isSelected={selectedClipId === clip.id}
                        onSelect={() => setSelectedClipId(clip.id)}
                        onDragStart={(e, handle) => startDrag(e, clip.id, 'broll', handle)}
                        onDelete={() => setBrollClips(p => p.filter(c => c.id !== clip.id))}
                        color="blue"
                      />
                    ))}
                  </TrackRow>

                  {/* B-Roll Track 1 */}
                  <TrackRow label="B-Roll 2" color="violet" icon={<Layers size={10} />}>
                    {brollClips.filter(c => c.track === 1).map(clip => (
                      <BRollClipUI
                        key={clip.id}
                        clip={clip}
                        duration={duration}
                        isSelected={selectedClipId === clip.id}
                        onSelect={() => setSelectedClipId(clip.id)}
                        onDragStart={(e, handle) => startDrag(e, clip.id, 'broll', handle)}
                        onDelete={() => setBrollClips(p => p.filter(c => c.id !== clip.id))}
                        color="violet"
                      />
                    ))}
                  </TrackRow>

                  {/* Subtitles Track */}
                  <TrackRow label="Subtitles" color="amber" icon={<Type size={10} />}>
                    {subtitleClips.map(clip => (
                      <SubtitleClipUI
                        key={clip.id}
                        clip={clip}
                        duration={duration}
                        isSelected={selectedClipId === clip.id}
                        onSelect={() => setSelectedClipId(clip.id)}
                        onDragStart={(e, handle) => startDrag(e, clip.id, 'subtitle', handle)}
                        onDelete={() => setSubtitleClips(p => p.filter(c => c.id !== clip.id))}
                      />
                    ))}
                  </TrackRow>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Properties Panel */}
        <div className="w-72 border-l border-white/5 bg-black/60 backdrop-blur-xl flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
              {selectedBRoll ? 'B-Roll Properties' : selectedSub ? 'Subtitle Properties' : 'Clip Inspector'}
            </h3>
          </div>

          {selectedBRoll && (
            <div className="p-4 space-y-4">
              <div className="aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
                <video src={selectedBRoll.url} muted loop autoPlay className="w-full h-full object-cover" />
              </div>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Label</span>
                  <input
                    value={selectedBRoll.label}
                    onChange={e => setBrollClips(p => p.map(c => c.id === selectedBRoll.id ? {...c, label: e.target.value} : c))}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Start</span>
                    <input type="number" step="0.1" min="0"
                      value={selectedBRoll.startTime.toFixed(1)}
                      onChange={e => setBrollClips(p => p.map(c => c.id === selectedBRoll.id ? {...c, startTime: parseFloat(e.target.value)} : c))}
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">End</span>
                    <input type="number" step="0.1" min="0"
                      value={selectedBRoll.endTime.toFixed(1)}
                      onChange={e => setBrollClips(p => p.map(c => c.id === selectedBRoll.id ? {...c, endTime: parseFloat(e.target.value)} : c))}
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                  </label>
                </div>
                <div>
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Track</span>
                  <div className="flex gap-2 mt-1">
                    {[0, 1].map(t => (
                      <button key={t} onClick={() => setBrollClips(p => p.map(c => c.id === selectedBRoll.id ? {...c, track: t} : c))}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${selectedBRoll.track === t ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>
                        Layer {t + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setBrollClips(p => p.filter(c => c.id !== selectedBRoll.id)); setSelectedClipId(null); }}
                  className="w-full py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
                  <Trash2 size={12} /> Delete Clip
                </button>
              </div>
            </div>
          )}

          {selectedSub && (
            <div className="p-4 space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 min-h-[80px] flex items-center justify-center">
                <span className={`text-center ${
                  selectedSub.style === 'bold' ? 'text-lg font-black text-yellow-400' :
                  selectedSub.style === 'pop' ? 'text-base font-black text-white' :
                  'text-sm font-medium text-white/80'
                }`}>{selectedSub.text}</span>
              </div>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Text</span>
                  <textarea value={selectedSub.text} rows={3}
                    onChange={e => setSubtitleClips(p => p.map(c => c.id === selectedSub.id ? {...c, text: e.target.value} : c))}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-purple-500 focus:outline-none resize-none"
                  />
                </label>
                <div>
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Style</span>
                  <div className="flex gap-2 mt-1">
                    {(['minimal', 'pop', 'bold'] as const).map(s => (
                      <button key={s} onClick={() => setSubtitleClips(p => p.map(c => c.id === selectedSub.id ? {...c, style: s} : c))}
                        className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${selectedSub.style === s ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Start</span>
                    <input type="number" step="0.1" min="0"
                      value={selectedSub.startTime.toFixed(1)}
                      onChange={e => setSubtitleClips(p => p.map(c => c.id === selectedSub.id ? {...c, startTime: parseFloat(e.target.value)} : c))}
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">End</span>
                    <input type="number" step="0.1" min="0"
                      value={selectedSub.endTime.toFixed(1)}
                      onChange={e => setSubtitleClips(p => p.map(c => c.id === selectedSub.id ? {...c, endTime: parseFloat(e.target.value)} : c))}
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                  </label>
                </div>
                <button onClick={() => { setSubtitleClips(p => p.filter(c => c.id !== selectedSub.id)); setSelectedClipId(null); }}
                  className="w-full py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          )}

          {!selectedBRoll && !selectedSub && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3 opacity-30">
              <Scissors size={32} />
              <p className="text-[9px] font-black uppercase tracking-widest text-center">Click a clip on the timeline to edit its properties</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// === Sub-components ===

const TrackRow: React.FC<{ label: string; color: string; icon: React.ReactNode; children?: React.ReactNode }> = ({ label, color, icon, children }) => (
  <div className="flex h-12 border-b border-white/[0.04]">
    <div className="w-16 flex-shrink-0 flex items-center justify-center gap-1.5 border-r border-white/[0.04] bg-black/40">
      <span className={`text-${color}-400 opacity-60`}>{icon}</span>
      <span className={`text-[7px] font-black text-${color}-400 opacity-40 uppercase`}>{label}</span>
    </div>
    <div className="flex-1 relative bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
      {children}
    </div>
  </div>
);

interface ClipProps {
  clip: BRollClip;
  duration: number;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent, handle: 'move' | 'start' | 'end') => void;
  onDelete: () => void;
  color: 'blue' | 'violet';
}

const BRollClipUI: React.FC<ClipProps> = ({ clip, duration, isSelected, onSelect, onDragStart, onDelete, color }) => {
  const left = (clip.startTime / duration) * 100;
  const width = ((clip.endTime - clip.startTime) / duration) * 100;
  const colors = color === 'blue'
    ? 'bg-blue-500/25 border-blue-500/50 text-blue-300'
    : 'bg-violet-500/25 border-violet-500/50 text-violet-300';

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-xl border ${colors} ${isSelected ? 'ring-1 ring-white/40 shadow-lg' : ''} flex items-center overflow-hidden cursor-grab active:cursor-grabbing group`}
      style={{ left: `${left}%`, width: `${width}%`, minWidth: 24 }}
      onClick={onSelect}
      onMouseDown={e => onDragStart(e, 'move')}
    >
      {/* Start handle */}
      <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-l-xl flex items-center justify-center"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'start'); }}>
        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
      </div>
      <span className="flex-1 text-[7px] font-black uppercase px-3 truncate select-none">{clip.label}</span>
      {isSelected && (
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          className="absolute right-1 opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all">
          <Trash2 size={8} />
        </button>
      )}
      {/* End handle */}
      <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-r-xl flex items-center justify-center"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'end'); }}>
        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
      </div>
    </div>
  );
};

interface SubProps {
  clip: SubtitleClip;
  duration: number;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent, handle: 'move' | 'start' | 'end') => void;
  onDelete: () => void;
}

const SubtitleClipUI: React.FC<SubProps> = ({ clip, duration, isSelected, onSelect, onDragStart, onDelete }) => {
  const left = (clip.startTime / duration) * 100;
  const width = ((clip.endTime - clip.startTime) / duration) * 100;
  return (
    <div
      className={`absolute top-1 bottom-1 rounded-xl border bg-amber-500/20 border-amber-500/40 text-amber-300 ${isSelected ? 'ring-1 ring-white/40' : ''} flex items-center overflow-hidden cursor-grab active:cursor-grabbing group`}
      style={{ left: `${left}%`, width: `${width}%`, minWidth: 24 }}
      onClick={onSelect}
      onMouseDown={e => onDragStart(e, 'move')}
    >
      <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-l-xl flex items-center justify-center"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'start'); }}>
        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
      </div>
      <span className="flex-1 text-[7px] font-black px-3 truncate select-none">{clip.text}</span>
      <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-r-xl flex items-center justify-center"
        onMouseDown={e => { e.stopPropagation(); onDragStart(e, 'end'); }}>
        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
      </div>
    </div>
  );
};
