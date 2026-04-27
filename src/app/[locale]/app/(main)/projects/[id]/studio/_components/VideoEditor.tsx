'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Volume2, VolumeX, Type, Film,
  SkipBack, Trash2, ArrowRight, ArrowLeft, X, Plus,
  Upload, Sparkles, Loader2, RefreshCw, Check, ChevronRight,
  Mic, FileText, Wand2, Eye, RotateCw, Cpu
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
  accentWord?: string;
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
}

interface VideoEditorProps {
  manifest: ProductionManifest | null;
  onBack: () => void;
  onNext: () => void;
  updateSegmentField: (id: string, field: string, value: any) => void;
  projectId?: string;
  onFaceless?: () => void;
}

// ── Main Component ──────────────────────────────────────────────────────────

export const VideoEditor = React.memo(({
  manifest, onBack, onNext, updateSegmentField, projectId, preFetchedBrolls: parentPreFetched, onFaceless
}: VideoEditorProps & { preFetchedBrolls?: Record<string, any[]> }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitialARoll = () => {
    const rec = manifest?.segments?.find((s: any) => s.type === 'user_recording' && s.assetUrl);
    return rec?.assetUrl || manifest?.videoUrl || manifest?.segments?.[0]?.assetUrl || null;
  };

  const initialUrl = getInitialARoll();
  const [stage, setStage] = useState<EditorStage>(initialUrl ? 'transcribing' : 'empty');
  const [stageMessage, setStageMessage] = useState('');
  const [aRollUrl, setARollUrl] = useState<string | null>(initialUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<TranscriptWord[]>([]);
  const [subtitleClips, setSubtitleClips] = useState<SubtitleClip[]>([]);
  const [phrases, setPhrases] = useState<BRollPhrase[]>([]);
  const [brollClips, setBrollClips] = useState<BRollClip[]>([]);
  const [brollModalOpen, setBrollModalOpen] = useState(false);
  const [activeBrollPrompt, setActiveBrollPrompt] = useState('');
  const [activeBrollPhraseId, setActiveBrollPhraseId] = useState<string | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [subtitlePos, setSubtitlePos] = useState({ x: 0, y: 120 });
  const [subtitleSize, setSubtitleSize] = useState(28);
  const [isSingleWordMode, setIsSingleWordMode] = useState(false);

  const dragRef = useRef<{
    clipId: string; type: 'broll' | 'sub';
    handle: 'move' | 'start' | 'end' | 'preview_move';
    startX: number; startY: number; origStart: number; origEnd: number;
    origPosX: number; origPosY: number;
  } | null>(null);

  const transcriptionStartedRef = useRef(false);

  useEffect(() => {
    const rec = manifest?.segments?.find((s: any) => s.type === 'user_recording' && s.assetUrl);
    const url = rec?.assetUrl || manifest?.videoUrl || manifest?.segments?.[0]?.assetUrl || null;
    if (url && url !== aRollUrl) {
      setARollUrl(url);
      setStage('transcribing');
      transcriptionStartedRef.current = false;
    }
  }, [manifest]);

  useEffect(() => {
    if (stage === 'transcribing' && aRollUrl && !transcriptionStartedRef.current) {
      transcriptionStartedRef.current = true;
      runTranscription();
    }
  });

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !aRollUrl) return;
    v.src = aRollUrl;
    const onTime = () => setCurrentTime(v.currentTime);
    const onLoad = () => setDuration(v.duration || 60);
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

  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current || !timelineRef.current) return;
      const { clipId, type, handle, startX, startY, origStart, origEnd, origPosX, origPosY } = dragRef.current;
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      const rect = timelineRef.current.getBoundingClientRect();
      const dSec = ((clientX - startX) / rect.width) * duration;
      const dX = clientX - startX;
      const dY = clientY - startY;

      if (handle === 'preview_move') {
        if (type === 'sub') setSubtitlePos({ x: origPosX + dX, y: origPosY + dY });
        return;
      }

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

  const runTranscription = async () => {
    setStage('transcribing');
    setStageMessage('Анализ аудио...');
    setTranscriptionError(null);
    try {
       const formData = new FormData();
       if (rawFile) formData.append('file', rawFile);
       else if (aRollUrl) {
         setStageMessage('AI расшифровка...');
         const res = await fetch(aRollUrl);
         const blob = await res.blob();
         formData.append('file', new File([blob], 'video.mp4', { type: 'video/mp4' }));
       }
       const res = await fetch('/api/ai/transcribe', { method: 'POST', body: formData });
       const data = await res.json();
       if (data.transcript) {
         setTranscript(data.transcript);
         const karaoke = buildKaraokeClips(data.transcript);
         setSubtitleClips(karaoke);
         
         setStageMessage('Поиск Би-роллов...');
         // Optimized visual phrasing
         const picked = pickVisualPhrases(data.transcript);
         const brolls: BRollClip[] = [];
         for (const p of picked) {
            const clip: BRollClip = {
               id: `br-${p.id}`,
               phraseId: p.id,
               startTime: p.start,
               endTime: Math.min(p.end, p.start + 4),
               label: p.text.slice(0, 15),
               url: '',
               prompt: p.text,
               track: 1
            };
            brolls.push(clip);
            // Async fetch
            fetch(`/api/ai/broll-search?query=${encodeURIComponent(p.text)}`)
              .then(r => r.json())
              .then(d => {
                if (d.videos?.length) {
                  setBrollClips(prev => prev.map(c => c.id === clip.id ? { ...c, url: d.videos[0].videoUrl } : c));
                }
              });
         }
         setBrollClips(brolls);
       }
    } catch (e: any) { setTranscriptionError(e.message); }
    setStage('editing');
  };

  const buildKaraokeClips = (words: TranscriptWord[]): SubtitleClip[] => {
    const chunks: SubtitleClip[] = [];
    for (let i = 0; i < words.length; i += 4) {
      const slice = words.slice(i, i + 4);
      chunks.push({
        id: `sub_${i}`,
        text: slice.map(w => w.text).join(' '),
        startTime: slice[0].start,
        endTime: slice[slice.length - 1].end,
        style: 'minimal',
        accentWord: slice[slice.length - 1].text
      });
    }
    return chunks;
  };

  const pickVisualPhrases = (words: TranscriptWord[]) => {
    // Pick 3 interesting points
    return [
      { id: 'v1', text: words[Math.floor(words.length*0.2)]?.text || '', start: words[Math.floor(words.length*0.2)]?.start || 0, end: words[Math.floor(words.length*0.2)]?.end || 2 },
      { id: 'v2', text: words[Math.floor(words.length*0.5)]?.text || '', start: words[Math.floor(words.length*0.5)]?.start || 0, end: words[Math.floor(words.length*0.5)]?.end || 2 },
      { id: 'v3', text: words[Math.floor(words.length*0.8)]?.text || '', start: words[Math.floor(words.length*0.8)]?.start || 0, end: words[Math.floor(words.length*0.8)]?.end || 2 },
    ].filter(v => v.text.length > 2);
  };

  const openBRollHunterForClip = (id: string, prompt: string) => {
    const clip = brollClips.find(c => c.id === id);
    setActiveBrollPhraseId(clip?.phraseId || id);
    setActiveBrollPrompt(prompt || clip?.label || '');
    setBrollModalOpen(true);
  };

  const handleBRollSelect = (url: string) => {
    setBrollClips(prev => prev.map(c => 
      (c.id === activeBrollPhraseId || c.phraseId === activeBrollPhraseId || c.id === selectedClipId) 
      ? { ...c, url } : c
    ));
    setBrollModalOpen(false);
  };

  const handleAddBrollManual = (time: number) => {
    const id = `br_new_${Date.now()}`;
    setBrollClips(prev => [...prev, {
      id, url: '', label: 'Manual Clip', prompt: '',
      startTime: time, endTime: Math.min(time + 3, duration), track: 1
    }]);
    setSelectedClipId(id);
    openBRollHunterForClip(id, '');
  };

  const startDrag = (e: any, clipId: string, type: 'broll' | 'sub', handle: 'move' | 'start' | 'end' | 'preview_move') => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const clip = type === 'broll' ? brollClips.find(c => c.id === clipId) : subtitleClips.find(c => c.id === clipId);
    if (!clip) return;
    dragRef.current = {
      clipId, type, handle, startX: clientX, startY: clientY,
      origStart: clip.startTime, origEnd: clip.endTime,
      origPosX: type === 'sub' ? subtitlePos.x : 0,
      origPosY: type === 'sub' ? subtitlePos.y : 0
    };
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause(); else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const fmt = (s: number) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2, '0')}`;

  const selBR = brollClips.find(c => c.id === selectedClipId);
  const selSub = subtitleClips.find(c => c.id === selectedClipId);

  return (
    <div className="flex flex-col bg-black text-white h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-xl"><ArrowLeft size={18}/></button>
        <div className="text-[10px] uppercase font-black tracking-widest text-purple-400">Studio Editor 2.0</div>
        <button onClick={onNext} className="px-4 py-2 bg-purple-500 rounded-xl font-black uppercase text-[10px]">Export</button>
      </div>

      <div className="relative h-[40%] bg-black flex items-center justify-center overflow-hidden">
        {aRollUrl && (
          <div className="relative w-full h-full flex items-center justify-center">
            <video ref={videoRef} className="max-w-full max-h-full z-0" onClick={togglePlay} playsInline />
            
            {/* B-Roll Layer (Z-10) */}
            {(() => {
               const active = brollClips.find(c => c.url && currentTime >= c.startTime && currentTime <= c.endTime);
               if (!active) return null;
               return (
                 <div className={`absolute inset-0 z-10 ${selectedClipId === active.id ? 'ring-2 ring-blue-500' : ''}`}>
                   <video src={active.url} autoPlay muted loop className="w-full h-full object-cover" />
                 </div>
               );
            })()}

            {/* Subtitles (Z-40) */}
            <AnimatePresence>
              {(() => {
                const sub = subtitleClips.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
                if (!sub) return null;
                return (
                  <motion.div
                    onMouseDown={e => startDrag(e, sub.id, 'sub', 'preview_move')}
                    className={`absolute z-40 cursor-move text-center p-2 rounded-2xl ${selectedClipId === sub.id ? 'ring-2 ring-amber-500 bg-black/40' : ''}`}
                    style={{ 
                      transform: `translate(calc(-0% + ${subtitlePos.x}px), calc(-0% + ${subtitlePos.y}px))`,
                      fontSize: `${subtitleSize}px`,
                      fontWeight: 900
                    }}
                  >
                    {sub.text}
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>
        )}
        <div className="absolute bottom-4 flex items-center gap-4 bg-black/60 p-2 rounded-2xl border border-white/10">
          <button onClick={togglePlay}>{isPlaying ? <Pause/> : <Play/>}</button>
          <span className="text-[10px] font-black">{fmt(currentTime)}/{fmt(duration)}</span>
        </div>
      </div>

      <div className="flex-1 bg-[#050510] flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 p-2 px-4 border-b border-white/5">
           <button onClick={runTranscription} className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-black uppercase">Transcription</button>
           {/* ... etc ... */}
        </div>
        
        <div className="flex-1 overflow-auto p-4 space-y-4">
           {/* Timeline placeholder */}
           <div ref={timelineRef} className="space-y-4 relative">
              {/* Subs track */}
              <div className="h-12 bg-white/5 rounded-xl relative flex items-center px-14">
                {subtitleClips.map(c => (
                  <div key={c.id} onClick={() => { setSelectedClipId(c.id); setShowSheet(true); setCurrentTime(c.startTime); if(videoRef.current)videoRef.current.currentTime=c.startTime; }}
                    className={`absolute h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center px-2 text-[8px] font-black uppercase transition-all ${selectedClipId === c.id ? 'ring-2 ring-amber-500' : ''}`}
                    style={{ left: `${(c.startTime/duration)*100}%`, width: `${((c.endTime-c.startTime)/duration)*100}%` }}>{c.text}</div>
                ))}
              </div>
              {/* B-Roll track */}
              <div className="h-16 bg-white/10 rounded-xl relative flex items-center px-14 cursor-crosshair group"
                onClick={e => { const rect=e.currentTarget.getBoundingClientRect(); handleAddBrollManual(((e.clientX-rect.left)/rect.width)*duration); }}>
                <div className="absolute inset-0 flex justify-between px-4 items-center opacity-10 pointer-events-none">
                  {[...Array(10)].map((_,i)=><Plus key={i} size={14}/>)}
                </div>
                {brollClips.map(c => (
                  <div key={c.id} onClick={e => { e.stopPropagation(); setSelectedClipId(c.id); setShowSheet(true); }}
                    className={`absolute h-12 rounded-xl flex items-center justify-center overflow-hidden border ${c.url ? 'bg-blue-500/40 border-blue-400' : 'bg-white/5 border-dashed border-white/20'} ${selectedClipId === c.id ? 'ring-2 ring-blue-500' : ''}`}
                    style={{ left: `${(c.startTime/duration)*100}%`, width: `${((c.endTime-c.startTime)/duration)*100}%` }}>
                      {c.url ? <video src={c.url} className="w-full h-full object-cover opacity-50"/> : <Plus size={16}/>}
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showSheet && (selBR || selSub) && (
          <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} className="absolute bottom-0 inset-x-0 h-[50dvh] bg-[#101020] border-t border-white/10 z-50 rounded-t-3xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div className="text-[10px] font-black uppercase text-purple-400">{selBR ? 'B-Roll Clip' : 'Subtitle'}</div>
              <button onClick={()=>setShowSheet(false)}><X/></button>
            </div>
            {selSub && (
              <div className="space-y-4">
                <textarea value={selSub.text} onChange={e=>setSubtitleClips(p=>p.map(c=>c.id===selSub.id?{...c,text:e.target.value}:c))} className="w-full bg-white/5 p-4 rounded-2xl outline-none"/>
                <div className="flex gap-2">
                  <input type="range" min="10" max="80" value={subtitleSize} onChange={e=>setSubtitleSize(Number(e.target.value))} className="flex-1"/>
                  <span className="text-[10px] font-black">{subtitleSize}px</span>
                </div>
              </div>
            )}
            {selBR && (
               <button onClick={()=>openBRollHunterForClip(selBR.id, '')} className="w-full py-4 bg-blue-500 rounded-2xl font-black uppercase text-[12px]">Change Footage</button>
            )}
            <button onClick={()=>{ if(selBR)setBrollClips(p=>p.filter(c=>c.id!==selBR.id)); if(selSub)setSubtitleClips(p=>p.filter(c=>c.id!==selSub.id)); setShowSheet(false); }} className="w-full py-4 bg-red-500/20 text-red-500 rounded-2xl font-black uppercase text-[12px]">Delete</button>
          </motion.div>
        )}
      </AnimatePresence>

      <BRollModal isOpen={brollModalOpen} onClose={()=>setBrollModalOpen(false)} onSelect={handleBRollSelect} segmentText={activeBrollPrompt} />
    </div>
  );
});

VideoEditor.displayName = 'VideoEditor';
