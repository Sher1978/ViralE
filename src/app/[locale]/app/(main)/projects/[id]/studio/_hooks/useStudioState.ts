'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ProductionManifest } from '@/lib/types/studio';
import { idb } from '@/lib/idb';

// --- TYPES ---

export type EditorStage = 'empty' | 'transcribing' | 'reviewing_phrases' | 'generating' | 'editing';

export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  accent?: boolean;
}

export interface BRollPhrase {
  id: string;
  text: string;
  start: number;
  end: number;
  approved: boolean;
  brollUrl?: string;
}

export interface SubtitleClip {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  style: 'minimal' | 'pop' | 'bold';
}

export interface BRollClip {
  id: string;
  phraseId?: string;
  url: string;
  label: string;
  prompt: string;
  startTime: number;
  endTime: number;
  track: number;
  offsetX?: number;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// --- HELPERS ---

function buildTranscript(manifest: ProductionManifest | null, videoDuration: number): TranscriptWord[] {
  if (!manifest) {
    return [{ text: "[Редактируйте текст здесь]", start: 0, end: videoDuration }];
  }
  const segments = manifest?.segments?.filter((s: any) => s.scriptText) || [];
  const dur = videoDuration > 0 ? videoDuration : 60;

  if (segments.length === 0) {
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

export function useStudioState(projectId: string, initialManifest: ProductionManifest | null, propARollUrl: string | null) {
  const [manifest, setManifest] = useState<ProductionManifest | null>(initialManifest || null);

  useEffect(() => {
    if (initialManifest) setManifest(initialManifest);
  }, [initialManifest]);
  
  // Stage machine
  const initialUrl = propARollUrl || initialManifest?.videoUrl || initialManifest?.segments?.[0]?.assetUrl || null;
  const [stage, setStage] = useState<EditorStage>(initialUrl ? 'transcribing' : 'empty');
  const [stageMessage, setStageMessage] = useState('');

  // Video State
  const [aRollUrl, setARollUrl] = useState<string | null>(initialUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [aRollDuration, setARollDuration] = useState(60);
  const [duration, setDuration] = useState(60);
  const [rawFile, setRawFile] = useState<File | null>(null);

  // Clips State
  const [transcript, setTranscript] = useState<TranscriptWord[]>([]);
  const [subtitleClips, setSubtitleClips] = useState<SubtitleClip[]>([]);
  const [brollClips, setBrollClips] = useState<BRollClip[]>([]);
  const [phrases, setPhrases] = useState<BRollPhrase[]>([]);
  
  // UI State
  const [persistenceLoaded, setPersistenceLoaded] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [isAnalyzingBroll, setIsAnalyzingBroll] = useState(false);
  const [subtitlePos, setSubtitlePos] = useState({ x: 0, y: 0 });
  const [subtitleSize, setSubtitleSize] = useState(25); // Reduced default size 3x (was 80)
  const [subtitleStyle, setSubtitleStyle] = useState<number>(0);
  const [pxPerSecond, setPxPerSecond] = useState(100);
  const [preFetchedBrolls, setPreFetchedBrolls] = useState<Record<string, any[]>>({});
  const [pendingBrollPhrases, setPendingBrollPhrases] = useState<BRollPhrase[]>([]);
  
  // Refs for logic
  const transcriptionStartedRef = useRef(false);
  const persistenceLoadedRef = useRef(false);

  // --- PERSISTENCE ---

  useEffect(() => {
    if (!projectId || persistenceLoadedRef.current) return;
    
    // Safety timeout: if IDB is stuck, we still want to show the editor shell
    const safetyTimeout = setTimeout(() => {
      if (!persistenceLoadedRef.current) {
        console.warn('[Studio] Persistence recovery timed out, forcing ready state');
        setPersistenceLoaded(true);
      }
    }, 3000);

    async function recoverDraft() {
      const key = `viral_editor_draft_${projectId}`;
      let dataToRestore: any = null;
      try {
        const data = await idb.get(key, 'ProjectDrafts');
        dataToRestore = data;
        
        if (data) {
          if (data.subtitleClips) setSubtitleClips(data.subtitleClips);
          if (data.transcript) setTranscript(data.transcript);
          if (data.subtitleClips?.length > 0) {
            setStage('editing');
            transcriptionStartedRef.current = true;
          } else if (data.stage) {
            setStage(data.stage);
          }
          if (data.subtitlePos) setSubtitlePos(data.subtitlePos);
          if (data.subtitleSize) setSubtitleSize(data.subtitleSize || 25);
          if (data.subtitleStyle !== undefined) setSubtitleStyle(data.subtitleStyle);
          if (data.pxPerSecond) setPxPerSecond(data.pxPerSecond);
          if (data.aRollUrl && !data.aRollUrl.startsWith('blob:')) {
            setARollUrl(data.aRollUrl);
          }
        }

        const cachedFile = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
        if (cachedFile instanceof Blob) {
          const url = URL.createObjectURL(cachedFile);
          setARollUrl(url);
          setRawFile(cachedFile as File);
        }
      } catch (err) {
        console.error('[Studio] Persistence recovery failed:', err);
      } finally {
        persistenceLoadedRef.current = true;
        setPersistenceLoaded(true);
        clearTimeout(safetyTimeout);
        
        // Background restoration of heavy assets (B-Rolls)
        if (dataToRestore?.brollClips) {
          const brolls = dataToRestore.brollClips;
          (async () => {
             const restoredClips = await Promise.all(brolls.map(async (clip: BRollClip) => {
               try {
                 const blob = await idb.get(`broll_file_${clip.id}`, 'MediaBuffer');
                 if (blob instanceof Blob) return { ...clip, url: URL.createObjectURL(blob) };
               } catch (e) {}
               return clip;
             }));
             setBrollClips(restoredClips);
          })();
        }
      }
    }
    
    recoverDraft();
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !persistenceLoadedRef.current) return;
    const key = `viral_editor_draft_${projectId}`;
    const state = { aRollUrl, brollClips, subtitleClips, transcript, stage, subtitlePos, subtitleSize, subtitleStyle, pxPerSecond };
    idb.set(key, state, 'ProjectDrafts');
  }, [projectId, aRollUrl, brollClips, subtitleClips, transcript, stage, subtitlePos, subtitleSize, subtitleStyle, pxPerSecond]);

  // Heavy file persistence
  useEffect(() => {
    if (!projectId || !rawFile || !persistenceLoadedRef.current) return;
    const saveFile = async () => {
      try {
        const lastSaved = await idb.get(`video_file_info_${projectId}`, 'ProjectDrafts');
        if (lastSaved?.name === rawFile.name && lastSaved?.size === rawFile.size) return;
        
        await idb.set(`video_file_${projectId}`, rawFile, 'MediaBuffer');
        await idb.set(`video_file_info_${projectId}`, { name: rawFile.name, size: rawFile.size }, 'ProjectDrafts');
      } catch (e) { console.error('Failed to cache video file:', e); }
    };
    saveFile();
  }, [projectId, rawFile]);

  // --- TRANSCRIPTION LOGIC ---

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
      const parts = w.text.trim().split(/\s+/);
      parts.forEach((p, pIdx) => {
        const wordObj: TranscriptWord = {
          text: p,
          start: w.start + (pIdx * (w.end - w.start) / parts.length),
          end: w.start + ((pIdx + 1) * (w.end - w.start) / parts.length),
          accent: w.accent
        };
        if (wordObj.accent) { flushBatch(); currentBatch.push(wordObj); flushBatch(); return; }
        if (currentBatch.length >= 3) flushBatch();
        currentBatch.push(wordObj);
      });
    });
    flushBatch();
    return final;
  };

  const extractAudioNative = async (videoBlob: Blob): Promise<Blob> => {
    try {
      const arrayBuffer = await videoBlob.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Attempt to decode. If this fails (e.g. unsupported codec in browser), it will throw.
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Use 16kHz mono (standard for Whisper/AI)
      const targetSampleRate = 16000;
      const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * targetSampleRate), targetSampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();
      const resampledBuffer = await offlineCtx.startRendering();
      
      const length = resampledBuffer.length * 2 + 44;
      const buffer = new ArrayBuffer(length);
      const view = new DataView(buffer);
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + resampledBuffer.length * 2, true);
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
    } catch (err) {
      console.error('[Studio] Native extraction failed:', err);
      throw err; // Let the caller handle fallback
    }
  };

  const runTranscriptionAndPhrases = useCallback(async (forceFresh = false) => {
    if (!aRollUrl && !rawFile && !manifest?.transcript) return;
    setTranscriptionError(null);
    setStageMessage('Анализ аудио...');

    let words: TranscriptWord[] = [];
    let transcriptionOk = false;

    if (!forceFresh && manifest?.transcript?.length) {
      words = manifest.transcript.map((t: any) => ({ ...t, accent: t.accent || false }));
      transcriptionOk = true;
    } else if (aRollUrl || rawFile) {
      try {
        setStageMessage('Извлечение аудио...');
        let sourceBlob: Blob | null = rawFile;
        if (!sourceBlob && aRollUrl) {
          try {
            const resp = await fetch(aRollUrl);
            if (resp.ok) sourceBlob = await resp.blob();
          } catch (e) {
             const recovered = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
             if (recovered instanceof Blob) sourceBlob = recovered;
          }
        }
        if (!sourceBlob) throw new Error('Не удалось получить файл для анализа');
        if (sourceBlob.size === 0) throw new Error('Файл записи пуст. Попробуйте записать еще раз.');

        let audioBlob: Blob;
        try {
          setStageMessage('Извлечение аудио...');
          audioBlob = await extractAudioNative(sourceBlob);
        } catch (e) {
          console.warn('[Studio] Native audio extraction failed, falling back to full file upload:', e);
          audioBlob = sourceBlob;
        }

        setStageMessage('AI расшифровка...');
        console.log(`[Studio] Sending to transcribe. Size: ${(audioBlob.size / 1024 / 1024).toFixed(2)}MB, Type: ${audioBlob.type}`);
        
        // Vercel / Serverless body limit is typically 4.5MB
        if (audioBlob.size > 4.5 * 1024 * 1024) {
          throw new Error('Файл слишком велик для обработки. Попробуйте укоротить видео до 2 минут.');
        }

        const formData = new FormData();
        formData.append('file', audioBlob, audioBlob === sourceBlob ? 'video.mp4' : 'audio.wav');
        
        const res = await fetch('/api/ai/transcribe', { method: 'POST', body: formData });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Ошибка сервера: ${res.status}`);
        }
        const data = await res.json();
        if (data.transcript && data.transcript.length > 0) {
           words = data.transcript; 
           transcriptionOk = true; 
        } else {
           throw new Error('AI не обнаружил голос в этом видео. Проверьте звук.');
        }
      } catch (err: any) { 
        console.error('[Studio] Transcription flow failed:', err);
        setTranscriptionError(err.message || 'Ошибка обработки'); 
        setStageMessage('');
        return;
      }
    }

    if (!transcriptionOk || words.length === 0) {
      setStageMessage('');
      setTranscriptionError('Не удалось распознать голос. Попробуйте записать еще раз или загрузить другой файл.');
      return;
    }

    setStageMessage('Генерация субтитров...');
    setTranscript(words);
    setSubtitleClips(buildKaraokeClips(words));
    setStage('editing');
    setIsAnalyzingBroll(false); // Disable auto-creation of B-rolls
    setStageMessage('');
  }, [aRollUrl, rawFile, manifest, projectId, transcriptionError]);

  useEffect(() => {
    if (stage === 'transcribing' && aRollUrl && !transcriptionStartedRef.current) {
      transcriptionStartedRef.current = true;
      runTranscriptionAndPhrases();
    }
  }, [stage, aRollUrl, runTranscriptionAndPhrases]);

  // Duration sync
  useEffect(() => {
    const maxBrollEnd = brollClips.length > 0 ? Math.max(...brollClips.map(c => c.endTime)) : 0;
    const newDuration = Math.max(aRollDuration, maxBrollEnd, 60);
    if (Math.abs(newDuration - duration) > 0.1) setDuration(newDuration);
  }, [aRollDuration, brollClips, duration]);

  return {
    persistenceLoaded,
    stage, setStage, stageMessage, setStageMessage,
    aRollUrl, setARollUrl, isPlaying, setIsPlaying, isMuted, setIsMuted,
    currentTime, setCurrentTime, aRollDuration, setARollDuration, duration,
    transcript, setTranscript, subtitleClips, setSubtitleClips,
    brollClips, setBrollClips, phrases, setPhrases,
    transcriptionError, setTranscriptionError, isAnalyzingBroll,
    subtitlePos, setSubtitlePos, subtitleSize, setSubtitleSize,
    subtitleStyle, setSubtitleStyle, pxPerSecond, setPxPerSecond,
    preFetchedBrolls, setPreFetchedBrolls, pendingBrollPhrases, setPendingBrollPhrases,
    runTranscriptionAndPhrases, setRawFile,
    deleteBroll: (id: string) => setBrollClips(prev => prev.filter(c => c.id !== id))
  };
}
