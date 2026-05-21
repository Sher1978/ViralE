'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ProductionManifest } from '@/lib/types/studio';
import { idb } from '@/lib/idb';
import { getFFmpeg } from '@/lib/ffmpeg-delivery';
import { fetchFile } from '@ffmpeg/util';
import { renderService } from '@/lib/services/renderService';

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
  prompt: string;            // ≤3-word search query for Pexels (from search_query)
  visual_prompt?: string;    // Full cinematic prompt for Veo/Runway
  scene_concept?: string;    // Russian scene description for UI display
  anchor_type?: 'Literal' | 'Conceptual' | 'Emotional' | 'Data'; // Trigger category
  startTime: number;
  endTime: number;
  track: number;
  x?: number;
  y?: number;
  scale?: number;
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
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(null);
  
  // Refs for logic
  const transcriptionStartedRef = useRef(false);
  const persistenceLoadedRef = useRef(false);

  // --- PERSISTENCE ---

  useEffect(() => {
    if (!projectId || persistenceLoadedRef.current) return;
    
    // Safety timeout: if IDB is stuck, we still want to show the editor shell
    // Safety timeout: if IDB is stuck, we still want to show the editor shell
    const safetyTimeout = setTimeout(() => {
      if (!persistenceLoadedRef.current) {
        console.warn('[Studio] Persistence recovery timed out, forcing ready state');
        persistenceLoadedRef.current = true;
        setPersistenceLoaded(true);
      }
    }, 2000); // Reduced to 2s for faster recovery

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
      const text = currentBatch.map(w => w.text.trim().toUpperCase()).join(' ');
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
          accent: false
        };
        
        currentBatch.push(wordObj);
        
        const hasTerminalPunctuation = /[.!?]$/.test(p);
        if (hasTerminalPunctuation || currentBatch.length >= 3) {
          flushBatch();
        }
      });
    });
    flushBatch();
    return final;
  };
  const extractAudioNative = async (videoBlob: Blob): Promise<Blob> => {
    console.log('[Studio LOG] Starting extractAudioNative. File size:', (videoBlob.size / (1024 * 1024)).toFixed(2), 'MB, MIME type:', videoBlob.type);
    // Attempt 1: Web Audio API (Fastest — works on all platforms including Chrome Desktop)
    // Previously Chrome Desktop was bypassed here to avoid OOM, but in practice
    // the Web Audio API path is safe for files under 300MB and much faster than
    // loading a 30MB FFmpeg WASM binary. Only skip if file > 300MB.
    try {
      const fileSizeMB = videoBlob.size / (1024 * 1024);
      if (fileSizeMB > 300) {
        throw new Error(`File too large for Web Audio API (${fileSizeMB.toFixed(0)}MB > 300MB), using FFmpeg WASM`);
      }

      console.log('[Studio LOG] Attempt 1: Starting Web Audio API (AudioContext) extraction...');
      
      const t0 = performance.now();
      const arrayBuffer = await videoBlob.arrayBuffer();
      console.log('[Studio LOG] Video blob loaded into ArrayBuffer in', (performance.now() - t0).toFixed(0), 'ms. Size:', arrayBuffer.byteLength, 'bytes');
      
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      const audioContext = new AudioCtx();
      console.log('[Studio LOG] AudioContext created. State:', audioContext.state, 'Sample rate:', audioContext.sampleRate);
      
      console.log('[Studio LOG] Calling decodeAudioData (Warning: this might use substantial memory)...');
      const tDecode = performance.now();
      const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        // Modern browsers return a Promise; older ones use callbacks only.
        // Guard against calling resolve() twice by wrapping in try/catch.
        try {
          const p = audioContext.decodeAudioData(arrayBuffer,
            (buf) => resolve(buf),
            (err) => reject(err || new Error('decodeAudioData callback error'))
          );
          // If it returned a real Promise (modern API), also hook it
          if (p && typeof p.then === 'function') {
            p.then(resolve).catch(reject);
          }
        } catch (e) {
          reject(e);
        }
      });
      console.log('[Studio LOG] decodeAudioData completed in', (performance.now() - tDecode).toFixed(0), 'ms. Buffer duration:', audioBuffer.duration.toFixed(2), 'seconds, Channels:', audioBuffer.numberOfChannels, 'Sample rate:', audioBuffer.sampleRate);
      
      const targetSampleRate = 16000;
      console.log('[Studio LOG] Starting OfflineAudioContext rendering at 16000Hz...');
      const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * targetSampleRate), targetSampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();
      
      const tRender = performance.now();
      const resampledBuffer = await offlineCtx.startRendering();
      console.log('[Studio LOG] Offline rendering completed in', (performance.now() - tRender).toFixed(0), 'ms');
      
      console.log('[Studio LOG] Formating to WAV...');
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
      view.setUint16(20, 1, true); 
      view.setUint16(22, 1, true); 
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
      console.log('[Studio LOG] Attempt 1 (AudioContext) successful! Result size:', (buffer.byteLength / 1024).toFixed(2), 'KB');
      return new Blob([buffer], { type: 'audio/wav' });
    } catch (err: any) {
      console.warn('[Studio LOG] Attempt 1 (AudioContext) failed or was bypassed. Error:', err?.message || err);
      console.log('[Studio LOG] Attempt 2: Starting local FFmpeg WASM extraction fallback...');
      
      // Attempt 2: FFmpeg WASM (Most Reliable)
      try {
        const tFfLoad = performance.now();
        const ffmpeg = await getFFmpeg();
        console.log('[Studio LOG] FFmpeg WASM instance loaded in', (performance.now() - tFfLoad).toFixed(0), 'ms');
        
        const inputName = 'input.mp4';
        const outputName = 'output.wav';
        
        console.log('[Studio LOG] Writing video file to virtual filesystem...');
        await ffmpeg.writeFile(inputName, await fetchFile(videoBlob));
        
        console.log('[Studio LOG] Executing FFmpeg command to extract 16kHz WAV...');
        const tFfExec = performance.now();
        await ffmpeg.exec(['-i', inputName, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', outputName]);
        console.log('[Studio LOG] FFmpeg execution completed in', (performance.now() - tFfExec).toFixed(0), 'ms');
        
        const data = await ffmpeg.readFile(outputName);
        const resultBlob = new Blob([data as any], { type: 'audio/wav' });
        console.log('[Studio LOG] Attempt 2 (FFmpeg WASM) successful! Result size:', (resultBlob.size / 1024).toFixed(2), 'KB');
        return resultBlob;
      } catch (ffErr: any) {
        console.error('[Studio LOG] Attempt 2 (FFmpeg WASM) failed. Error:', ffErr?.message || ffErr);
        throw ffErr;
      }
    }
  };

  const runTranscriptionAndPhrases = useCallback(async (forceFresh = false) => {
    if (!aRollUrl && !rawFile && !manifest?.transcript) {
      console.log('[Studio LOG] runTranscriptionAndPhrases called but no video url or file or transcript available.');
      return;
    }
    setTranscriptionError(null);
    setStageMessage('Анализ аудио...');

    console.log('[Studio LOG] Starting runTranscriptionAndPhrases. Force fresh:', forceFresh);
    console.log('[Studio LOG] Client Info: UserAgent =', navigator.userAgent, 'Platform =', navigator.platform, 'maxTouchPoints =', navigator.maxTouchPoints);

    let words: TranscriptWord[] = [];
    let transcriptionOk = false;

    if (!forceFresh && manifest?.transcript?.length) {
      console.log('[Studio LOG] Using cached manifest transcript segments. Word count:', manifest.transcript.length);
      words = manifest.transcript.map((t: any) => ({ ...t, accent: t.accent || false }));
      transcriptionOk = true;
    } else if (aRollUrl || rawFile) {
      try {
        setStageMessage('Извлечение аудио...');
        let sourceBlob: Blob | null = rawFile;
        console.log('[Studio LOG] Initial sourceBlob from rawFile:', sourceBlob ? `Size = ${(sourceBlob.size / (1024 * 1024)).toFixed(2)} MB` : 'NULL');
        
        if (!sourceBlob && aRollUrl) {
          try {
            console.log('[Studio LOG] No rawFile. Fetching source video blob from aRollUrl:', aRollUrl);
            const resp = await fetch(aRollUrl);
            if (resp.ok) {
              sourceBlob = await resp.blob();
              console.log('[Studio LOG] Fetch from aRollUrl successful. Size:', (sourceBlob.size / (1024 * 1024)).toFixed(2), 'MB');
            }
          } catch (e: any) {
             console.warn('[Studio LOG] Fetch from aRollUrl failed. Error:', e?.message || e, '. Trying recovery from IndexedDB...');
             const recovered = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
             if (recovered instanceof Blob) {
               sourceBlob = recovered;
               console.log('[Studio LOG] Successfully recovered video blob from IndexedDB. Size:', (sourceBlob.size / (1024 * 1024)).toFixed(2), 'MB');
             }
          }
        }
        
        if (!sourceBlob) {
          throw new Error('Не удалось получить файл для анализа. sourceBlob = null');
        }
        if (sourceBlob.size === 0) {
          throw new Error('Файл записи пуст (0 байт). Попробуйте записать еще раз.');
        }

        let audioBlob: Blob | null = null;
        let publicUrl: string | null = null;

        try {
          setStageMessage('Извлечение аудио...');
          audioBlob = await extractAudioNative(sourceBlob);
          
          // Vercel / Serverless body limit is 4.5MB
          if (audioBlob.size > 4.5 * 1024 * 1024) {
            console.warn('[Studio LOG] Audio blob too large for direct POST (size:', (audioBlob.size / (1024 * 1024)).toFixed(2), 'MB > 4.5MB), switching to Cloud Path...');
            setStageMessage('Облачная загрузка (большой файл)...');
            const uploadRes = await renderService.uploadMedia(projectId, audioBlob, 'audio');
            publicUrl = uploadRes.publicUrl;
            console.log('[Studio LOG] Audio blob upload successful. publicUrl:', publicUrl);
          }
        } catch (e: any) {
          console.warn('[Studio LOG] Local audio extraction failed or was bypassed. Falling back to direct full video cloud upload. Error:', e?.message || e);
          setStageMessage('Облачная загрузка (резервный путь)...');
          
          console.log('[Studio LOG] Starting direct full video upload. Video size:', (sourceBlob.size / (1024 * 1024)).toFixed(2), 'MB');
          const tUpload = performance.now();
          const uploadRes = await renderService.uploadMedia(projectId, sourceBlob, 'video');
          publicUrl = uploadRes.publicUrl;
          console.log('[Studio LOG] Full video upload successful in', (performance.now() - tUpload).toFixed(0), 'ms. publicUrl:', publicUrl);
        }

        setStageMessage('AI расшифровка...');
        console.log('[Studio LOG] Preparing FormData for transcribe API...');
        const formData = new FormData();
        if (publicUrl) {
          formData.append('fileUrl', publicUrl);
          console.log('[Studio LOG] FormData: appended fileUrl =', publicUrl);
        } else if (audioBlob) {
          formData.append('file', audioBlob, 'audio.wav');
          console.log('[Studio LOG] FormData: appended local audioBlob. Size =', (audioBlob.size / 1024).toFixed(2), 'KB');
        } else {
          throw new Error('Не удалось подготовить файл для транскрибации (no audioBlob and no publicUrl)');
        }

        console.log('[Studio LOG] Sending POST to /api/ai/transcribe...');
        const tTranscribe = performance.now();
        const res = await fetch('/api/ai/transcribe', { 
          method: 'POST', 
          body: formData 
        });
        console.log('[Studio LOG] Transcribe API response status:', res.status, 'Time taken:', (performance.now() - tTranscribe).toFixed(0), 'ms');
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Ошибка сервера: ${res.status}`);
        }
        const data = await res.json();
        if (data.transcript && data.transcript.length > 0) {
           console.log('[Studio LOG] Transcribe successful! Word count:', data.transcript.length);
           words = data.transcript; 
           transcriptionOk = true; 
        } else {
           throw new Error('AI не обнаружил голос в этом видео. Проверьте звук.');
        }
      } catch (err: any) { 
        console.error('[Studio LOG] Transcription flow failed. Error details:', err);
        setTranscriptionError(err.message || 'Ошибка обработки'); 
        setStageMessage('');
        setStage('transcribing');
        return;
      }
    }

    if (!transcriptionOk || words.length === 0) {
      setStageMessage('');
      setTranscriptionError('Не удалось распознать голос. Попробуйте записать еще раз или загрузить другой файл.');
      return;
    }

    setStageMessage('Генерация субтитров...');
    console.log('[Studio LOG] Formatting transcript segments & karaoke clips...');
    setTranscript(words);
    setSubtitleClips(buildKaraokeClips(words));
    setStage('editing');
    setIsAnalyzingBroll(false); // Disable auto-creation of B-rolls
    setStageMessage('');
    console.log('[Studio LOG] runTranscriptionAndPhrases completed successfully! Transitioned stage to editing.');
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
    const validARollDur = (typeof aRollDuration === 'number' && isFinite(aRollDuration) && aRollDuration > 0) ? aRollDuration : 60;
    const newDuration = Math.max(validARollDur, maxBrollEnd, 60);
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
    voiceoverUrl, setVoiceoverUrl,
    runTranscriptionAndPhrases, setRawFile,
    deleteBroll: (id: string) => setBrollClips(prev => prev.filter(c => c.id !== id))
  };
}
