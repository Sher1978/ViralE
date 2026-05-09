'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  ArrowLeft, Cpu, Upload, Loader2, Sparkles, Wand2, SkipBack, Play, Pause, VolumeX, Volume2, Mic 
} from 'lucide-react';

import { ProductionManifest } from '@/lib/types/studio';
import { idb } from '@/lib/idb';
import { StudioTimeline } from '@/components/studio/StudioTimeline';

// Modular Refactor
import { useStudioState, BRollClip, SubtitleClip, TranscriptWord } from '../_hooks/useStudioState';
import { StudioViewport } from './StudioViewport';
import { StudioActionBar } from './StudioActionBar';
import { StudioModals } from './StudioModals';

interface VideoEditorProps {
  projectId: string;
  aRollUrl: string;
  onBack: () => void;
  onNext?: (broll: BRollClip[], subs: SubtitleClip[], aRollUrl: string | null) => Promise<void>;
  manifest?: ProductionManifest | null;
  onFaceless?: () => void;
}

export const VideoEditor = React.memo(({
  projectId, aRollUrl: propARollUrl, onBack, onNext, manifest: initialManifest, onFaceless
}: VideoEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    stage, setStage, stageMessage, setStageMessage,
    aRollUrl, setARollUrl, isPlaying, setIsPlaying, isMuted, setIsMuted,
    currentTime, setCurrentTime, aRollDuration, setARollDuration, duration,
    transcript, setTranscript, subtitleClips, setSubtitleClips,
    brollClips, setBrollClips, phrases, setPhrases,
    transcriptionError, setTranscriptionError, isAnalyzingBroll,
    subtitlePos, setSubtitlePos, subtitleSize, setSubtitleSize,
    preFetchedBrolls, setPreFetchedBrolls, pendingBrollPhrases, setPendingBrollPhrases,
    runTranscriptionAndPhrases, setRawFile
  } = useStudioState(projectId, initialManifest || null, propARollUrl);

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [subtitleEditorOpen, setSubtitleEditorOpen] = useState(false);
  const [editingSubtitleId, setEditingSubtitleId] = useState<string | null>(null);
  const [subtitleEditText, setSubtitleEditText] = useState('');
  const [phrasePickerOpen, setPhrasePickerOpen] = useState(false);
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null);
  const [brollModalOpen, setBrollModalOpen] = useState(false);
  const [activeBrollPrompt, setActiveBrollPrompt] = useState('');
  const [activeBrollPhraseId, setActiveBrollPhraseId] = useState<string | null>(null);

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

  // --- ACTIONS ---

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || !aRollUrl) return;
    if (isPlaying) v.pause(); else v.play();
    setIsPlaying(p => !p);
  }, [isPlaying, aRollUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

  const handleBRollSelect = (url: string, label?: string) => {
    if (activeBrollPhraseId) {
      const brollId = `br_${Date.now()}`;
      const downloadAndCache = async (targetUrl: string, clipId: string) => {
        try {
          const res = await fetch(targetUrl);
          const blob = await res.blob();
          await idb.set(`broll_file_${clipId}`, blob);
          const localUrl = URL.createObjectURL(blob);
          setBrollClips(prev => prev.map(c => c.id === clipId ? { ...c, url: localUrl } : c));
        } catch (e) { console.error('[Editor] B-roll cache failed:', e); }
      };

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

  const handleSwapPhrase = (word: TranscriptWord) => {
    if (!editingPhraseId) return;
    setPhrases(prev => prev.map(p => p.id === editingPhraseId ? {
      ...p, text: word.text, start: word.start, end: word.end
    } : p));
    setPhrasePickerOpen(false);
    setEditingPhraseId(null);
  };

  // Phase labels
  const phaseLabels = ['Upload', 'Subtitles', 'B-Roll'];
  const phaseIndex = stage === 'empty' ? 0 : stage === 'transcribing' ? 1 : stage === 'editing' ? 1 : 2;

  if (!initialManifest && !aRollUrl && stage === 'empty') {
    return (
      <div className="flex-1 bg-black flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Initialising Production Canvas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#050508] text-white select-none h-full max-h-[100dvh] relative">
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />

      {/* FOUNDATION SELECTION */}
      <AnimatePresence>
        {!aRollUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-[#050508] flex flex-col items-center justify-center px-8">
            <div className="w-full max-w-md space-y-8 text-center">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Choose Foundation</h2>
              <div className="grid gap-4">
                <button onClick={() => fileInputRef.current?.click()} className="p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-purple-500 transition-all flex flex-col items-center gap-4">
                  <Upload size={32} />
                  <div>
                    <span className="block font-black uppercase">Upload A-Roll</span>
                    <span className="text-[10px] text-white/40 uppercase">Use your own recording</span>
                  </div>
                </button>
                <button onClick={() => onFaceless?.()} className="p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-blue-500 transition-all flex flex-col items-center gap-4">
                  <Cpu size={32} />
                  <div>
                    <span className="block font-black uppercase">AI Faceless Mode</span>
                    <span className="text-[10px] text-white/40 uppercase">Generated visual sequence</span>
                  </div>
                </button>
              </div>
              <button onClick={onBack} className="text-[10px] font-black uppercase text-white/20 tracking-widest">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAV BAR */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a14]">
        <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-[10px] font-black uppercase tracking-widest">
          <ArrowLeft size={12} /> Back
        </button>
        <div className="flex gap-1.5">
          {phaseLabels.map((label, i) => (
            <div key={label} className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${i === phaseIndex ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-white/30'}`}>
              {label}
            </div>
          ))}
        </div>
        <button onClick={() => onNext?.(brollClips, subtitleClips, aRollUrl)} className="px-5 py-2 rounded-lg bg-purple-500 text-[10px] font-black uppercase tracking-widest">
          Export
        </button>
      </div>

      {/* VIEWPORT */}
      <StudioViewport 
        videoRef={videoRef} aRollUrl={aRollUrl} isMuted={isMuted} isPlaying={isPlaying} currentTime={currentTime} togglePlay={togglePlay}
        brollClips={brollClips} subtitleClips={subtitleClips} subtitlePos={subtitlePos} setSubtitlePos={setSubtitlePos} subtitleSize={subtitleSize}
        onUploadClick={() => fileInputRef.current?.click()}
        stage={stage} stageMessage={stageMessage} transcriptionError={transcriptionError} heartbeat={heartbeat}
        runTranscriptionAndPhrases={runTranscriptionAndPhrases} setStage={setStage} setTranscriptionError={setTranscriptionError} setStageMessage={setStageMessage}
      />

      {/* ACTION BAR */}
      <StudioActionBar 
        isPlaying={isPlaying} isMuted={isMuted} currentTime={currentTime} duration={duration} togglePlay={togglePlay} setCurrentTime={setCurrentTime} setIsMuted={setIsMuted} videoRef={videoRef}
        stage={stage} subtitleClips={subtitleClips} aRollUrl={aRollUrl}
        onRefineSubtitles={() => { setStage('transcribing'); runTranscriptionAndPhrases(true); }}
        onTranscribe={() => runTranscriptionAndPhrases(true)}
        onGenerateBRoll={() => {
          const firstEmpty = brollClips.find(c => !c.url);
          if (firstEmpty) openBRollHunterForClip(firstEmpty.phraseId || firstEmpty.id, firstEmpty.prompt);
        }}
      />

      {/* TIMELINE */}
      <StudioTimeline 
        segments={initialManifest?.segments || []}
        totalDuration={duration}
        currentTime={currentTime}
        brollClips={brollClips.map(c => ({ id: c.id, type: 'broll', startTime: c.startTime, duration: c.endTime - c.startTime, content: c.url || c.label }))}
        subtitleClips={subtitleClips.map(c => ({ id: c.id, type: 'subtitle', startTime: c.startTime, duration: c.endTime - c.startTime, content: c.text }))}
        activeIndex={0} selectedId={selectedClipId}
        onSelect={(type, id) => setSelectedClipId(id)}
        onUpdateOverlay={(type, id, data) => {
          if (type === 'broll') {
            setBrollClips(prev => prev.map(c => c.id === id ? { ...c, startTime: data.startTime ?? c.startTime, endTime: (data.startTime ?? c.startTime) + (data.duration ?? (c.endTime - c.startTime)) } : c));
          } else {
            setSubtitleClips(prev => prev.map(c => c.id === id ? { ...c, startTime: data.startTime ?? c.startTime, endTime: (data.startTime ?? c.startTime) + (data.duration ?? (c.endTime - c.startTime)) } : c));
          }
        }}
        onDeleteOverlay={(type, id) => {
          if (type === 'broll') setBrollClips(prev => prev.filter(c => c.id !== id));
          else setSubtitleClips(prev => prev.filter(c => c.id !== id));
          setSelectedClipId(null);
        }}
        onCreateOverlay={(type, time) => {
          const id = `${type}_${Date.now()}`;
          if (type === 'broll') {
            setBrollClips(prev => [...prev, { id, phraseId: id, startTime: time, endTime: time + 3, label: 'New Scene', url: '', prompt: 'cinematic shot', track: 1 }]);
            openBRollHunterForClip(id, 'cinematic shot');
          } else {
            setSubtitleClips(prev => [...prev, { id, text: 'New Text', startTime: time, endTime: time + 2, style: 'minimal' }]);
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
            if (sub) { setEditingSubtitleId(id); setSubtitleEditText(sub.text); setSubtitleEditorOpen(true); }
          }
        }}
        onSeek={(time) => {
          setCurrentTime(time);
          if (videoRef.current) videoRef.current.currentTime = time;
        }}
      />

      {/* MODALS */}
      <StudioModals 
        subtitleEditorOpen={subtitleEditorOpen} setSubtitleEditorOpen={setSubtitleEditorOpen} subtitleEditText={subtitleEditText} setSubtitleEditText={setSubtitleEditText} editingSubtitleId={editingSubtitleId} setSubtitleClips={setSubtitleClips} setSelectedClipId={setSelectedClipId}
        phrasePickerOpen={phrasePickerOpen} setPhrasePickerOpen={setPhrasePickerOpen} setEditingPhraseId={setEditingPhraseId} transcript={transcript} handleSwapPhrase={handleSwapPhrase}
        brollModalOpen={brollModalOpen} setBrollModalOpen={setBrollModalOpen} setActiveBrollPhraseId={setActiveBrollPhraseId} setStage={setStage} handleBRollSelect={handleBRollSelect} activeBrollPrompt={activeBrollPrompt} projectId={projectId} preFetchedBrolls={preFetchedBrolls} activeBrollPhraseId={activeBrollPhraseId} brollClips={brollClips} setBrollClips={setBrollClips}
      />
    </div>
  );
});
