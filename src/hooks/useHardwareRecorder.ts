'use client';

import { useState, useEffect, useRef } from 'react';
import { renderService } from '@/lib/services/renderService';
import { projectService } from '@/lib/services/projectService';
import { idb } from '@/lib/idb';

export interface UseHardwareRecorderOptions {
  projectId: string;
  isVoiceOnly: boolean;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  setManifest: React.Dispatch<React.SetStateAction<any>>;
  addSystemLog: (msg: string) => void;
  setLastRecordingUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setRecordedSize: React.Dispatch<React.SetStateAction<number | null>>;
  videoPreviewRef: React.RefObject<HTMLVideoElement | null>;
  recordedBlobRef: React.MutableRefObject<Blob | null>;
  isLoading?: boolean;
}

export function useHardwareRecorder({
  projectId,
  isVoiceOnly,
  activeTab,
  setActiveTab,
  setManifest,
  addSystemLog,
  setLastRecordingUrl,
  setRecordedSize,
  videoPreviewRef,
  recordedBlobRef,
  isLoading = false
}: UseHardwareRecorderOptions) {
  // Camera & Device States
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isVideoMirrored, setIsVideoMirrored] = useState(true);
  const [videoDevices, setVideoDevices] = useState<any[]>([]);
  const [audioDevices, setAudioDevices] = useState<any[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
  const [videoResolution, setVideoResolution] = useState<'360p' | '720p' | '1080p' | '4k'>('720p');
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [backgroundMp4Url, setBackgroundMp4Url] = useState<string | null>(null);
  const [isBackgroundConverting, setIsBackgroundConverting] = useState(false);

  // Internal Refs
  const mediaRecorderRef = useRef<any>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. ENUMERATE DEVICES (Safely)
  useEffect(() => {
    async function getDevices() {
      const nav = globalThis.navigator as any;
      if (typeof globalThis.navigator !== 'undefined' && nav?.mediaDevices && nav?.mediaDevices?.enumerateDevices) {
        try {
          const devices = await nav.mediaDevices.enumerateDevices();
          const v = devices.filter((d: any) => d.kind === 'videoinput');
          const a = devices.filter((d: any) => d.kind === 'audioinput');
          setVideoDevices(v);
          setAudioDevices(a);
          
          // Initial auto-selection if not set
          if (!selectedVideoDeviceId && v.length > 0) setSelectedVideoDeviceId(v[0].deviceId);
          if (!selectedAudioDeviceId && a.length > 0) setSelectedAudioDeviceId(a[0].deviceId);
        } catch (e) {
          console.warn('[useHardwareRecorder] Enumerate devices failed:', e);
        }
      }
    }
    if (!isLoading && projectId) {
      getDevices();
    }
  }, [projectId, isLoading]);

  // 2. Permissions & Devices change listener
  useEffect(() => {
    const handleDeviceChange = async () => {
      const nav = globalThis.navigator as any;
      if (!nav || !nav.mediaDevices) return;
      try {
        const devices = await nav.mediaDevices.enumerateDevices();
        setVideoDevices(devices.filter((d: any) => d.kind === 'videoinput'));
        setAudioDevices(devices.filter((d: any) => d.kind === 'audioinput'));
      } catch (e) {
        console.warn('[useHardwareRecorder] Device change enumeration failed:', e);
      }
    };
    const navApi = globalThis.navigator as any;
    const hasMediaAPI = typeof globalThis.navigator !== 'undefined' && navApi?.mediaDevices && navApi?.mediaDevices?.addEventListener;
    
    if (hasMediaAPI) {
      navApi.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }
    
    return () => {
      if (hasMediaAPI) {
        navApi.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
    };
  }, []);

  // 3. 📹 Auto-init camera when entering teleprompter
  useEffect(() => {
    let active = true;

    if (activeTab === 'teleprompter' && !cameraStream && !isLoading) {
      console.log('[useHardwareRecorder] Auto-initializing camera for teleprompter...');
      initCamera().then((stream) => {
        if (!active && stream) {
          console.log('[useHardwareRecorder] Component unmounted during camera init, stopping tracks immediately...');
          (stream as any).getTracks().forEach((track: any) => track.stop());
        }
      });
    }
    
    // 🛑 Explicitly stop camera hardware when leaving prompter
    if (activeTab !== 'teleprompter' && cameraStream) {
      console.log('[useHardwareRecorder] Stopping camera hardware (Leaving prompter)...');
      stopCamera();
    }

    return () => {
      active = false;
      console.log('[useHardwareRecorder] Cleanup: stopping camera hardware...');
      stopCamera();
    };
  }, [activeTab, cameraStream, isLoading]);

  // 4. Init Camera helper
  const initCamera = async (): Promise<MediaStream | null> => {
    setCameraError(null);
    try {
      console.log('[useHardwareRecorder] initCamera: Starting, isVoiceOnly:', isVoiceOnly);
      
      const nav = globalThis.navigator as any;
      const isMobile = typeof globalThis.navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(nav.userAgent);
      const resMap = {
        '360p': { width: { ideal: 640 }, height: { ideal: 360 } },
        '720p': { width: { ideal: 1280 }, height: { ideal: 720 } },
        '1080p': { width: { ideal: 1920 }, height: { ideal: 1080 } },
        '4k': { width: { ideal: 3840 }, height: { ideal: 2160 } }
      };

      const resolutionsToTry: ('360p' | '720p' | '1080p' | '4k')[] = [];
      const allResolutions: ('360p' | '720p' | '1080p' | '4k')[] = ['360p', '720p', '1080p', '4k'];
      const currentIndex = allResolutions.indexOf(videoResolution);
      
      // We try the selected resolution first, then progressively lower ones
      for (let i = currentIndex; i >= 0; i--) {
        resolutionsToTry.push(allResolutions[i]);
      }

      let stream: MediaStream | null = null;
      let lastErr: any = null;

      for (const res of resolutionsToTry) {
        const constraints: any = {
          video: isVoiceOnly ? false : {
            deviceId: selectedVideoDeviceId ? { ideal: selectedVideoDeviceId } : undefined,
            facingMode: (isMobile && !selectedVideoDeviceId) ? facingMode : undefined,
            ...resMap[res]
          },
          audio: {
            deviceId: selectedAudioDeviceId ? { ideal: selectedAudioDeviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };

        try {
          console.log(`[useHardwareRecorder] initCamera trying resolution: ${res}`);
          stream = await nav.mediaDevices.getUserMedia(constraints);
          if (stream) {
            if (res !== videoResolution) {
              console.warn(`[useHardwareRecorder] Fell back from requested ${videoResolution} to ${res}`);
              addSystemLog(`Предупреждение: не удалось запустить камеру в ${videoResolution}. Автоматически выбрано разрешение ${res}.`);
              setVideoResolution(res);
            }
            break;
          }
        } catch (e: any) {
          console.warn(`[useHardwareRecorder] Resolution ${res} failed:`, e.name || e.message || e);
          lastErr = e;
        }
      }

      if (stream) {
        setCameraStream(stream);
        if (videoPreviewRef.current && !isVoiceOnly) {
          (videoPreviewRef.current as any).srcObject = stream;
        }
        return stream;
      }

      // If all progressive resolution attempts failed, try a basic fallback
      console.warn('[useHardwareRecorder] All progressive camera resolutions failed, trying basic fallback...');
      try {
        const fallbackStream = await nav.mediaDevices.getUserMedia({ video: !isVoiceOnly, audio: true });
        setCameraStream(fallbackStream);
        if (videoPreviewRef.current && !isVoiceOnly) {
          (videoPreviewRef.current as any).srcObject = fallbackStream;
        }
        return fallbackStream;
      } catch (fallbackErr: any) {
        console.error('[useHardwareRecorder] All camera paths failed:', fallbackErr.name);
        setCameraError(`Camera Error: ${fallbackErr.name}. Try another browser or close other apps.`);
        return null;
      }
    } catch (err: any) {
      console.error('[useHardwareRecorder] Critical camera init error:', err);
      setCameraError(`Critical Error: ${err.message}`);
      return null;
    }
  };

  // 5. Stop Camera helper
  const stopCamera = () => {
    console.log('[useHardwareRecorder] stopCamera: Releasing all hardware resources...');
    if (cameraStream) {
      (cameraStream as any).getTracks().forEach((track: any) => {
        track.stop();
        console.log(`[useHardwareRecorder] Stopped track: ${track.kind}`);
      });
      setCameraStream(null);
    }
    
    // Safety: check video preview element's srcObject directly to stop any active tracks
    if (videoPreviewRef.current && (videoPreviewRef.current as any).srcObject) {
      const activeSrcStream = (videoPreviewRef.current as any).srcObject;
      if (activeSrcStream && typeof activeSrcStream.getTracks === 'function') {
        activeSrcStream.getTracks().forEach((track: any) => {
          track.stop();
          console.log(`[useHardwareRecorder] Stopped track from srcObject: ${track.kind}`);
        });
      }
      (videoPreviewRef.current as any).srcObject = null;
    }
    
    // Safety: scan for any other active streams/tracks and stop them
    const winObj = globalThis as any;
    if (typeof globalThis.navigator !== 'undefined' && winObj._audioRecorder) {
       const aRec = winObj._audioRecorder as any;
       if (aRec.stream) {
          aRec.stream.getTracks().forEach((t: any) => t.stop());
       }
       if (aRec.state !== 'inactive') aRec.stop();
       delete winObj._audioRecorder;
    }

    if (videoPreviewRef.current) {
      (videoPreviewRef.current as any).srcObject = null;
    }
  };

  // 6. Start Video Recording helper
  const startVideoRecording = async () => {
    try {
      let activeStream = cameraStream;
      if (!activeStream || !(activeStream as any).active) {
        activeStream = await initCamera();
      }

      if (!activeStream) {
        const errorMsg = "Камера не запущена. Проверьте разрешения или попробуйте перезагрузить вкладку.";
        (globalThis as any).alert?.(errorMsg);
        return;
      }

      // Start Countdown
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      // Action!
      setTimeout(async () => {
        if (!activeStream) return;
        setIsReading(true);
        const localChunks: Blob[] = [];
        const audioChunks: Blob[] = [];
        
        try {
          const nav = globalThis.navigator as any;
          const isMobile = /iPhone|iPad|iPod|Android/i.test(nav ? nav.userAgent : '');
          
          let recorder: any;
          const MR = (globalThis as any).MediaRecorder;

          if (isVoiceOnly) {
            const aMime = MR?.isTypeSupported?.('audio/webm') ? 'audio/webm' : 'audio/mp4';
            recorder = new MR(activeStream, { mimeType: aMime });
          } else {
            let selectedMime = '';
            const candidateMimes = [
              'video/webm;codecs=vp9,opus',
              'video/webm;codecs=vp8,opus',
              'video/webm',
              'video/mp4;codecs=avc1',
              'video/mp4',
              'video/quicktime'
            ];
            for (const mime of candidateMimes) {
              if (MR && MR.isTypeSupported(mime)) {
                selectedMime = mime;
                break;
              }
            }

            const bitrateMap = {
              '360p': 1200000,   // 1.2 Mbps
              '720p': 4000000,   // 4 Mbps
              '1080p': 8000000,  // 8 Mbps
              '4k': 20000000     // 20 Mbps
            };
            let targetBitrate = bitrateMap[videoResolution as keyof typeof bitrateMap] || 4000000;
            if (isMobile) {
              // Scale down slightly on mobile to save memory and avoid heating and save battery, but keep it high quality
              targetBitrate = Math.round(targetBitrate * 0.75);
            }

            const options: any = {
              videoBitsPerSecond: targetBitrate
            };
            if (selectedMime) {
              options.mimeType = selectedMime;
              console.log('[useHardwareRecorder] MediaRecorder using video mimeType:', selectedMime);
            } else {
              console.warn('[useHardwareRecorder] No standard video mimeType supported. Letting browser choose default.');
            }

            try {
              recorder = new MR(activeStream, options);
            } catch (err: any) {
              console.warn('[useHardwareRecorder] Advanced MediaRecorder creation failed, falling back to default:', err.message);
              recorder = new MR(activeStream);
            }
          }

          const bindRecorderHandlers = (recInstance: any) => {
            recInstance.ondataavailable = (e: any) => { if (e.data.size > 0) localChunks.push(e.data); };
            recInstance.onstop = async () => {
              addSystemLog('Запись камеры остановлена. Объединение чанков...');
              const blob = new Blob(localChunks, { type: recInstance.mimeType });
              localChunks.length = 0; // Clear chunks to free RAM
              
              addSystemLog(`Файл RAW создан. Размер: ${(blob.size / (1024 * 1024)).toFixed(2)} MB (${blob.size} байт). MIME-тип: ${recInstance.mimeType}`);

              // Defensive validation against empty or corrupted recorded blobs
              if (blob.size < 50000 && !isVoiceOnly) {
                addSystemLog(`КРИТИЧЕСКАЯ ОШИБКА: Видео пустое/повреждено (размер ${blob.size} байт). Порог: 50 KB.`);
                (globalThis as any).alert?.("Ошибка: записанное видео пустое или повреждено (размер меньше 50 KB). Пожалуйста, попробуйте сделать запись заново.");
                return;
              }
              if (blob.size < 3000 && isVoiceOnly) {
                addSystemLog(`КРИТИЧЕСКАЯ ОШИБКА: Аудио слишком короткое (размер ${blob.size} байт). Порог: 3 KB.`);
                (globalThis as any).alert?.("Ошибка: записанный звук слишком короткий или поврежден. Пожалуйста, попробуйте записать аудио заново.");
                return;
              }

              recordedBlobRef.current = blob;
              setRecordedSize(blob.size);

              const timestamp = Date.now();
              const recordingId = (isVoiceOnly ? 'raw_audio_' : 'raw_rec_') + projectId + '_' + timestamp;
              
              try {
                addSystemLog(`Сохранение RAW файла в IndexedDB (${recordingId})...`);
                await idb.set(recordingId, blob, 'MediaBuffer');
                if (isVoiceOnly) {
                  await idb.set(`pending_audio_${projectId}`, recordingId, 'ProjectDrafts');
                } else {
                  await idb.set(`pending_upload_${projectId}`, recordingId, 'ProjectDrafts');
                  await idb.set(`video_file_${projectId}`, blob, 'MediaBuffer');
                }
                addSystemLog('Сохранение в IndexedDB выполнено успешно.');
                
                if (!isVoiceOnly && audioChunks.length > 0) {
                  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                  audioChunks.length = 0; // Clear audio chunks to free RAM
                  const audioRecId = `raw_rec_audio_${projectId}_${timestamp}`;
                  addSystemLog('Сохранение резервной аудиодорожки в IndexedDB...');
                  await idb.set(audioRecId, audioBlob, 'MediaBuffer');
                  await idb.set(`pending_audio_${projectId}`, audioRecId, 'ProjectDrafts');
                }
              } catch (e: any) { 
                addSystemLog(`Ошибка сохранения в IndexedDB: ${e.message || e}`);
                console.error('[useHardwareRecorder] IDB Storage error:', e); 
              }

              // Revoke any previous recording URL to prevent double-blob memory leak
              setLastRecordingUrl(prev => {
                if (prev && prev.startsWith('blob:')) {
                  addSystemLog(`Отзыв старого Blob URL: ${prev}`);
                  URL.revokeObjectURL(prev);
                }
                return null;
              });

              // Create new preview URL
              const url = URL.createObjectURL(blob);
              setLastRecordingUrl(url);
              addSystemLog(`Создана новая Blob-ссылка превью: ${url}`);
              
              // Start background conversion immediately
              addSystemLog('Запуск фоновой MP4 нормализации видео...');
              startBackgroundMp4Conversion(blob);

              // Explicitly transition to branch screen
              setActiveTab('post_record_branch');
            };
          };

          bindRecorderHandlers(recorder);

          // Secondary audio-only recorder for OOM bypass on mobile (only for video mode)
          if (!isVoiceOnly) {
            try {
              let aMime = '';
              if (MR) {
                if (MR.isTypeSupported('audio/webm')) aMime = 'audio/webm';
                else if (MR.isTypeSupported('audio/mp4')) aMime = 'audio/mp4';
              }
              const audioOnlyStream = new (globalThis as any).MediaStream((activeStream as any).getAudioTracks());
              const options: any = {
                audioBitsPerSecond: 64000
              };
              if (aMime) options.mimeType = aMime;
              const audioRecorder = new MR(audioOnlyStream, options);
              audioRecorder.ondataavailable = (e: any) => { if (e.data.size > 0) audioChunks.push(e.data); };
              audioRecorder.start(1000);
              (globalThis as any)._audioRecorder = audioRecorder;
            } catch (ae) {
              console.warn('[useHardwareRecorder] Parallel audio recording failed:', ae);
            }
          }

          try {
            console.log('[useHardwareRecorder] Starting MediaRecorder. State:', recorder.state);
            recorder.start(1000);
          } catch (startErr: any) {
            console.warn('[useHardwareRecorder] Failed to start advanced MediaRecorder, trying default fallback:', startErr.message);
            try {
              recorder = new MR(activeStream);
              bindRecorderHandlers(recorder);
              recorder.start(1000);
              console.log('[useHardwareRecorder] Default fallback MediaRecorder started successfully.');
            } catch (fallbackErr: any) {
              console.error('[useHardwareRecorder] All recorder start attempts failed:', fallbackErr);
              throw new Error(`Не удалось запустить запись: ${fallbackErr.message || fallbackErr}`);
            }
          }

          mediaRecorderRef.current = recorder;
          setIsRecordingVideo(true);
          setRecordingTime(0);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
          
        } catch (err: any) {
          console.error('[useHardwareRecorder] MediaRecorder fail:', err);
          const detail = err.name === 'NotReadableError' ? 'Камера занята другим приложением' : (err.message || err.name);
          (globalThis as any).alert?.(`Ошибка старта записи: ${detail}. Попробуйте перезагрузить страницу.`);
          setIsReading(false);
        }
      }, 3000);
    } catch (err: any) {
      (globalThis as any).alert?.("Ошибка инициализации: " + (err.message || err.name));
    }
  };

  // 7. Stop Video Recording helper
  const stopVideoRecording = () => {
    setIsReading(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      const aRec = (globalThis as any)._audioRecorder as any;
      if (aRec && aRec.state !== 'inactive') aRec.stop();
      
      setIsRecordingVideo(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      
      // Release camera when record is done
      stopCamera();
    }
  };

  // 8. Start Background MP4 Conversion helper
  const startBackgroundMp4Conversion = async (videoBlob: Blob) => {
    if (isBackgroundConverting || backgroundMp4Url) return;
    setIsBackgroundConverting(true);
    console.log('[useHardwareRecorder] Background MP4 upload & normalization started...');
    try {
      // 1. Upload raw WebM to Supabase
      const uploadResult = await renderService.uploadMedia(projectId, videoBlob, 'video');
      if (!uploadResult || !uploadResult.publicUrl) {
        throw new Error('Failed to upload raw video to storage.');
      }
      
      const rawUrl = uploadResult.publicUrl;
      console.log('[useHardwareRecorder] Background raw video uploaded, starting H.264 normalization:', rawUrl);

      // 2. Call normalization API
      const normRes = await fetch('/api/studio/normalize-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: rawUrl, projectId })
      });
      
      if (normRes.ok) {
        const normData = await normRes.json();
        if (normData.publicUrl) {
          console.log('[useHardwareRecorder] Background H.264 MP4 normalization completed:', normData.publicUrl);
          setBackgroundMp4Url(normData.publicUrl);
          
          // Also sync to manifest so it's ready for Avatar Studio
          setManifest((prev: any) => {
            if (!prev) return prev;
            const next = { ...prev, videoUrl: normData.publicUrl || '' };
            projectService.updateLatestVersionManifest(projectId, next);
            return next;
          });
        }
      }
    } catch (err) {
      console.error('[useHardwareRecorder] Background MP4 normalization failed:', err);
    } finally {
      setIsBackgroundConverting(false);
    }
  };

  // 9. Download Background MP4 helper
  const downloadBackgroundMp4 = async () => {
    const nav = globalThis.navigator as any;
    const isMobile = typeof globalThis.navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(nav.userAgent);

    if (backgroundMp4Url) {
      console.log('[useHardwareRecorder] Sharing or downloading background MP4:', backgroundMp4Url);
      
      if (isMobile && typeof globalThis.navigator !== 'undefined' && nav.share) {
        try {
          await nav.share({
            url: backgroundMp4Url,
            title: 'Viral Engine H.264 MP4',
            text: 'Here is your compatible H.264 MP4 video!'
          });
          return;
        } catch (err) {
          console.warn('[useHardwareRecorder] Web Share failed for normalized MP4:', err);
        }
      }

      const doc = (globalThis as any).document;
      if (doc) {
        const a = doc.createElement('a');
        a.href = backgroundMp4Url;
        a.download = `ViralEngine_H264_${Date.now()}.mp4`;
        doc.body.appendChild(a);
        a.click();
        doc.body.removeChild(a);
      }
      return;
    }

    if (isBackgroundConverting) {
      (globalThis as any).alert?.("Видео ещё кодируется в фоне для совместимости с iOS/AI. Пожалуйста, подождите еще несколько секунд...");
      return;
    }

    // Fallback if not started
    if (recordedBlobRef.current) {
      try {
        (globalThis as any).alert?.("Запуск принудительного кодирования MP4. Пожалуйста, подождите...");
        await startBackgroundMp4Conversion(recordedBlobRef.current);
      } catch (err: any) {
        (globalThis as any).alert?.("Не удалось запустить кодирование: " + err.message);
      }
    } else {
      (globalThis as any).alert?.("Исходное видео не найдено в памяти.");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  return {
    isRecordingVideo,
    cameraStream,
    facingMode,
    setFacingMode,
    isVideoMirrored,
    setIsVideoMirrored,
    videoDevices,
    audioDevices,
    selectedVideoDeviceId,
    setSelectedVideoDeviceId,
    selectedAudioDeviceId,
    setSelectedAudioDeviceId,
    videoResolution,
    setVideoResolution,
    recordingTime,
    cameraError,
    countdown,
    isReading,
    backgroundMp4Url,
    setBackgroundMp4Url,
    isBackgroundConverting,
    initCamera,
    stopCamera,
    startVideoRecording,
    stopVideoRecording,
    downloadBackgroundMp4
  };
}
