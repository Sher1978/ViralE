'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  ArrowLeft, Cpu, Upload, Loader2, Sparkles, Wand2, SkipBack, Play, Pause, VolumeX, Volume2, Mic, Zap,
  Music, Type, Sliders, PlayCircle
} from 'lucide-react';

import { ProductionManifest } from '@/lib/types/studio';
import { idb } from '@/lib/idb';

// Modular Components (Edits Style)
import { useStudioState, BRollClip, SubtitleClip, TranscriptWord } from '../_hooks/useStudioState';
import { EditorTopBar } from './EditorTopBar';
import { StudioViewport } from './StudioViewport';
import { StudioActionBar } from './StudioActionBar';
import { EditorTimeline } from './EditorTimeline';
import { EditorToolDrawer } from './EditorToolDrawer';
import { EditorCaptionEditor } from './EditorCaptionEditor';
import { CaptionStyleSelector } from './CaptionStyleSelector';
import { StudioModals } from './StudioModals';

interface VideoEditorProps {
  projectId: string;
  aRollUrl: string;
  onBack: () => void;
  onNext?: (broll: BRollClip[], subs: SubtitleClip[], aRollUrl: string | null, subPos?: { x: number, y: number }, subSize?: number, subStyle?: number) => Promise<void>;
  manifest?: ProductionManifest | null;
  onFaceless?: () => void;
}

export const VideoEditor = React.memo(({
  projectId, aRollUrl: propARollUrl, onBack, onNext, manifest: initialManifest, onFaceless
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
    transcriptionError, setTranscriptionError, isAnalyzingBroll,
    subtitlePos, setSubtitlePos, subtitleSize, setSubtitleSize, subtitleStyle, setSubtitleStyle, pxPerSecond, setPxPerSecond,
    preFetchedBrolls, setPreFetchedBrolls, pendingBrollPhrases, setPendingBrollPhrases,
    runTranscriptionAndPhrases, setRawFile, deleteBroll
  } = useStudioState(projectId, initialManifest || null, propARollUrl);

  const [activeTool, setActiveTool] = useState<'captions' | 'broll' | 'audio' | 'style' | 'voice' | 'filters' | 'text' | null>(null);
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

  // --- ACTIONS ---

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || !aRollUrl) return;
    if (isPlaying) v.pause(); else v.play();
    setIsPlaying(p => !p);
  }, [isPlaying, aRollUrl]);

  const onSeek = useCallback((time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
        videoRef.current.currentTime = time;
    }
  }, [setCurrentTime]);

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

  const handleCaptionClick = useCallback((id: string) => {
    setSelectedCaptionId(id);
    setActiveTool('captions');
  }, []);

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
                <button onClick={() => fileInputRef.current?.click()} className="p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-purple-500 transition-all flex flex-col items-center gap-4">
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
        onExport={() => onNext?.(brollClips, subtitleClips, aRollUrl, subtitlePos, subtitleSize, subtitleStyle)} 
      />

      {/* 2. Video Preview (Viewport) */}
      <StudioViewport 
        videoRef={videoRef} aRollUrl={aRollUrl} isMuted={isMuted} isPlaying={isPlaying} currentTime={currentTime} togglePlay={togglePlay}
        setCurrentTime={setCurrentTime} setARollDuration={setARollDuration}
        brollClips={brollClips} subtitleClips={subtitleClips} subtitlePos={subtitlePos} setSubtitlePos={setSubtitlePos} subtitleSize={subtitleSize} setSubtitleSize={setSubtitleSize}
        onUploadClick={() => fileInputRef.current?.click()}
        stage={stage} stageMessage={stageMessage} transcriptionError={transcriptionError} heartbeat={0}
        runTranscriptionAndPhrases={runTranscriptionAndPhrases} setStage={setStage} setTranscriptionError={setTranscriptionError} setStageMessage={setStageMessage}
        subtitleStyle={subtitleStyle}
      />


      <StudioActionBar 
        isPlaying={isPlaying}
        isMuted={isMuted}
        currentTime={currentTime}
        duration={duration}
        togglePlay={togglePlay}
        onSeek={onSeek}
        setIsMuted={setIsMuted}
      />

      <EditorTimeline 
        totalDuration={duration}
        currentTime={currentTime}
        onSeek={onSeek}
        aRollUrl={aRollUrl}
        brollClips={brollClips.map(c => ({ id: c.id, type: 'broll', startTime: c.startTime, duration: c.endTime - c.startTime }))}
        subtitleClips={subtitleClips.map(c => ({ id: c.id, type: 'subtitle', startTime: c.startTime, duration: (c.endTime - c.startTime) || 0.5, content: c.text }))}
        onCreateBroll={(time) => {
            const id = `br_${Date.now()}`;
            setBrollClips(prev => [...prev, { id, phraseId: id, startTime: time, endTime: time + 3, label: 'New Scene', url: '', prompt: 'cinematic shot', track: 1 }]);
            openBRollHunterForClip(id, 'cinematic shot');
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
            if (clip) openBRollHunterForClip(clip.phraseId || clip.id, clip.prompt);
        }}
        onDeleteBroll={deleteBroll}
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
            <div className="flex flex-col gap-4 py-4">
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
                    className="w-full py-6 bg-purple-500 rounded-3xl flex flex-col items-center gap-2 shadow-xl shadow-purple-500/20 active:scale-95 transition-all"
                >
                    <Sparkles size={24} />
                    <span className="text-[12px] font-black uppercase tracking-widest">Find AI Scenes</span>
                </button>
                <div className="grid grid-cols-2 gap-3">
                    <button className="p-6 bg-white/5 border border-white/5 rounded-3xl flex flex-col items-center gap-2 opacity-40">
                        <Upload size={20} />
                        <span className="text-[10px] font-bold uppercase">Manual Upload</span>
                    </button>
                    <button className="p-6 bg-white/5 border border-white/5 rounded-3xl flex flex-col items-center gap-2 opacity-40">
                        <Sliders size={20} />
                        <span className="text-[10px] font-bold uppercase">Settings</span>
                    </button>
                </div>
            </div>
        )}
        {(activeTool === 'audio' || activeTool === 'voice' || activeTool === 'filters' || activeTool === 'text') && (
            <div className="flex flex-col items-center justify-center h-40 gap-4 opacity-20">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center">
                    <Sliders size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Coming Soon</span>
            </div>
        )}
      </EditorToolDrawer>

      {/* 6. Modals (Persistent) */}
      <StudioModals 
        subtitleEditorOpen={subtitleEditorOpen} setSubtitleEditorOpen={setSubtitleEditorOpen} subtitleEditText={subtitleEditText} setSubtitleEditText={setSubtitleEditText} editingSubtitleId={editingSubtitleId} setSubtitleClips={setSubtitleClips} setSelectedClipId={setSelectedClipId}
        phrasePickerOpen={phrasePickerOpen} setPhrasePickerOpen={setPhrasePickerOpen} setEditingPhraseId={setEditingPhraseId} transcript={transcript} handleSwapPhrase={handleSwapPhrase}
        brollModalOpen={brollModalOpen} setBrollModalOpen={setBrollModalOpen} setActiveBrollPhraseId={setActiveBrollPhraseId} setStage={setStage} handleBRollSelect={handleBRollSelect} activeBrollPrompt={activeBrollPrompt} projectId={projectId} preFetchedBrolls={preFetchedBrolls} activeBrollPhraseId={activeBrollPhraseId} brollClips={brollClips} setBrollClips={setBrollClips}
      />
    </div>
  );
});
