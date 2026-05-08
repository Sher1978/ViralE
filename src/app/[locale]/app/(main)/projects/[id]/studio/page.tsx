'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { PremiumLimitModal } from '@/components/ui/PremiumLimitModal';
import { 
  Plus, CheckCircle2, Lock, Scissors, RefreshCw, Wand2, Brain, Monitor, FileVideo, Download, X, Layout, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { projectService, Project } from '@/lib/services/projectService';
import { renderService } from '@/lib/services/renderService';
import { profileService, Profile } from '@/lib/services/profileService';
import { ProductionManifest, AnimationStyle, AvatarProvider } from '@/lib/types/studio';
import { createInitialManifest } from '@/lib/studio-utils';
import { v4 as uuidv4 } from 'uuid';
import { idb } from '@/lib/idb';

// Atomic Components
import { StudioSidebar } from './_components/StudioSidebar';
import { TeleprompterView } from './_components/TeleprompterView';
import { StoryboardGrid } from './_components/StoryboardGrid';
import { RecordingReview } from './_components/RecordingReview';
import { SourcePicker } from './_components/SourcePicker';
import { AvatarSelector } from './_components/AvatarSelector';
import { AssemblyProgress } from './_components/AssemblyProgress';
import dynamic from 'next/dynamic';
const VideoEditor = dynamic(() => import('./_components/VideoEditor').then(m => m.VideoEditor), { ssr: false });
import { ProductionBranch } from './_components/ProductionBranch';
import { PostRecordBranch } from './_components/PostRecordBranch';
import { PostRecordBranch } from './_components/PostRecordBranch';
import { TimelineLab } from './_components/TimelineLab';
import { FusionView } from './_components/FusionView';
import { BottomNav } from '@/components/layout/BottomNav';
import DistributionFactory from './_components/DistributionFactory';

// Global Shared Components

import KnowledgeLab from '@/components/studio/KnowledgeLab';
import { StrategistChat } from '@/components/studio/StrategistChat';
import FacelessStudio from '@/components/studio/FacelessStudio';

export default function StudioPage() {
  const t = useTranslations('studio');
  const router = useRouter();
  const { id: projectId, locale } = useParams() as { id: string; locale: string };

  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') as any || 'concept';

  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [manifest, setManifest] = useState<ProductionManifest | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'strategy' | 'teleprompter' | 'branch'| 'assembly' | 'knowledge' | 'assets' | 'concept' | 'post_record_branch'>(initialTab);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  
  // Teleprompter States
  const [isReading, setIsReading] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg'>('sm');
  const [isMirrored, setIsMirrored] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [prompterWidth, setPrompterWidth] = useState(600);
  const [customScript, setCustomScript] = useState<string>('');
  const [useCustomScript, setUseCustomScript] = useState<boolean>(false);
  const [lastRecordingUrl, setLastRecordingUrl] = useState<string | null>(null);
  const [showRecordingReview, setShowRecordingReview] = useState(false);
  const [scriptOpacity, setScriptOpacity] = useState(0.85);
  const [scriptColor, setScriptColor] = useState('#ffffff');
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showFaceless, setShowFaceless] = useState(false);
  const [isVoiceOnly, setIsVoiceOnly] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isAssemblingAvatar, setIsAssemblingAvatar] = useState(false);
  const [selectedAvatarPhoto, setSelectedAvatarPhoto] = useState<string | null>(null);
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);
  
  // Camera & Device States
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isVideoMirrored, setIsVideoMirrored] = useState(true);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
  const [videoResolution, setVideoResolution] = useState<'360p' | '720p' | '1080p' | '4k'>('720p');
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Fusion Engine States
  const [fusionStatus, setFusionStatus] = useState<'segmenting' | 'processing' | 'stitching' | 'completed' | 'failed'>('segmenting');
  const [fusionProgress, setFusionProgress] = useState(0);
  const [fusionSegmentsCount, setFusionSegmentsCount] = useState(0);
  const [fusionCompletedSegments, setFusionCompletedSegments] = useState(0);
  const [fusionError, setFusionError] = useState<string | null>(null);

  const prompterRef = useRef<HTMLDivElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollPosRef = useRef(0);

  const [showLimitModal, setShowLimitModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: '', desc: '', type: 'info' as any });
  const [showAssemblyLauncher, setShowAssemblyLauncher] = useState(false);
  const isMobileRef = useRef(typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Honor/i.test(navigator.userAgent));


  // State Sync Effect (URL Persistence)
  useEffect(() => {
    if (isLoading) return;
    
    // Defer URL update to avoid conflict with heavy UI transitions (especially on Android)
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      params.set('tab', activeTab);
      if (showFaceless) params.set('mode', 'faceless');
      else params.delete('mode');
      
      const currentPath = window.location.pathname;
      const newUrl = `${currentPath}?${params.toString()}`;
      
      try {
        if (window.location.search !== `?${params.toString()}`) {
          window.history.replaceState({ path: newUrl }, '', newUrl);
          console.log('[Studio] Syncing URL:', newUrl);
        }
      } catch (e) {
        console.warn('[Studio] replaceState failed:', e);
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [activeTab, showFaceless, isLoading]);

  // Prevent accidental data loss
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeTab === 'assembly' || activeTab === 'teleprompter' || showFaceless) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeTab, showFaceless]);

  const handleAvatarSelect = async (photoUrl: string, avatarId?: string, avatarType?: string) => {
    setSelectedAvatarPhoto(photoUrl);
    setShowAvatarSelector(false);
    setActiveTab('timeline_lab');
  };

    try {
      // 1. Get the recorded audio from IDB
      const audioRecId = await idb.get(`pending_audio_${projectId}`, 'ProjectDrafts');
      if (!audioRecId) throw new Error('Audio recording not found');
      
      const audioBlob = await idb.get(audioRecId, 'MediaBuffer');
      if (!audioBlob) throw new Error('Audio blob not found');

      // 2. Upload audio to Supabase first to bypass Vercel 4.5MB limit
      const { publicUrl: audioUrl } = await renderService.uploadMedia(projectId, audioBlob as Blob, 'audio');
      if (!audioUrl) throw new Error('Failed to upload audio to storage');

      // 3. Call HeyGen proxy API
      const res = await fetch('/api/ai/heygen/talking-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl,
          photoUrl,
          avatarId,
          avatarType,
          projectId
        })
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[HeyGen] API Error:', text);
        throw new Error(`API Error: ${res.status}. ${text.slice(0, 50)}`);
      }

      const data = await res.json();
      const { taskId, error } = data;
      if (error) throw new Error(error);

      // 3. Polling for result
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes (every 10s)
      
      const poll = async () => {
        try {
          const statusRes = await fetch(`/api/ai/heygen/talking-photo?taskId=${taskId}`);
          if (!statusRes.ok) throw new Error(`Polling error: ${statusRes.status}`);
          
          const statusData = await statusRes.json();
          
          if (statusData.status === 'completed' && statusData.videoUrl) {
            setLastRecordingUrl(statusData.videoUrl);
            
            if (manifest) {
              const segmentId = selectedSegmentId || manifest?.segments[0]?.id || '';
              const newManifest = {
                 ...manifest,
                 videoUrl: statusData.videoUrl,
                 segments: manifest.segments.map((s: any) => 
                    s.id === segmentId ? { ...s, assetUrl: statusData.videoUrl, type: 'user_recording' } : s
                 )
              };
              setManifest(newManifest);
              await projectService.updateLatestVersionManifest(projectId, newManifest);
            }

            setIsGeneratingAvatar(false);
            setIsAssemblingAvatar(false);
            setTimeout(() => setActiveTab('assembly'), 200);
            return;
          }

          if (statusData.status === 'failed') {
            throw new Error('HeyGen generation failed');
          }

          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 10000);
          } else {
            throw new Error('HeyGen timeout');
          }
        } catch (e: any) {
          console.error('Polling error:', e);
          setIsGeneratingAvatar(false);
          setIsAssemblingAvatar(false);
          alert('Ошибка при генерации: ' + e.message);
        }
      };

      poll();

    } catch (e: any) {
      console.error('Avatar generation failed:', e);
      setIsGeneratingAvatar(false);
      setIsAssemblingAvatar(false);
      alert('Ошибка: ' + e.message);
    }
  };

  const handleGenerateFusion = async (timelineSegments: any[]) => {
    setActiveTab('fusion');
    setFusionStatus('segmenting');
    setFusionProgress(10);
    setFusionSegmentsCount(timelineSegments.length);
    setFusionCompletedSegments(0);
    setFusionError(null);

    try {
      // 1. Prepare segments (ensure we have URLs)
      // For now, we assume lastRecordingUrl is already uploaded to Supabase or IDB.
      // We'll need a real API call here.
      const res = await fetch('/api/ai/fal/process-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          videoUrl: lastRecordingUrl,
          segments: timelineSegments
        })
      });

      if (!res.ok) throw new Error(`Fusion API error: ${res.status}`);

      // 2. Simple polling or stream would go here. For now, simulated progress logic:
      setFusionStatus('processing');
      setFusionProgress(30);

      // We'll replace this simulation with real SSE or polling in the next step
      const simulatedSteps = async () => {
        for (let i = 0; i <= timelineSegments.length; i++) {
          setFusionCompletedSegments(i);
          setFusionProgress(30 + (i / timelineSegments.length) * 50);
          await new Promise(r => setTimeout(r, 2000));
        }
        setFusionStatus('stitching');
        setFusionProgress(90);
        await new Promise(r => setTimeout(r, 3000));
        setFusionStatus('completed');
        setFusionProgress(100);
        
        // Auto-transition to montage
        setTimeout(() => setActiveTab('assembly'), 1500);
      };

      simulatedSteps();

    } catch (err: any) {
      console.error('[Fusion] Failed:', err);
      setFusionStatus('failed');
      setFusionError(err.message);
    }
  };

  // тЬТ AUTOSAVE & RECOVERY (IndexedDB + Cloud Sync) тЬТ
  useEffect(() => {
    if (manifest && projectId && !isLoading) {
      // 1. Instant local backup
      idb.set(`viral_draft_${projectId}`, {
        manifest,
        updatedAt: new Date().toISOString()
      }, 'ProjectDrafts');

      // 2. Debounced Cloud Sync
      const timer = setTimeout(async () => {
        try {
          setIsSaving(true);
          await projectService.updateLatestVersionManifest(projectId, manifest);
          setIsSaving(false);
          console.log('[Studio] Cloud Sync Complete');
        } catch (e) {
          console.error('[Studio] Cloud Sync Failed:', e);
          setIsSaving(false);
        }
      }, 3000); // 3 second debounce

      return () => clearTimeout(timer);
    }
  }, [manifest, projectId, isLoading]);

  // Combined Initial Data Load
  useEffect(() => {
    async function loadData() {
      if (!projectId) return;
      setIsLoading(true);
      try {
        const [profileData, projectData, latestVersion, cachedLocal] = await Promise.all([
          profileService.getOrCreateProfile(),
          projectService.getProject(projectId),
          projectService.getLatestVersion(projectId),
          idb.get(`viral_draft_${projectId}`, 'ProjectDrafts')
        ]);

        setCurrentProfile(profileData);
        setProject(projectData);

        // Check for Local Draft first (Safety Buffer)
        if (cachedLocal) {
          const { manifest: cachedManifest, updatedAt } = cachedLocal;
          setManifest(cachedManifest);
          if (latestVersion) {
            setCurrentVersionId(latestVersion.id);
          }
          console.log('[Studio] Recovered manifest from IndexedDB', updatedAt);
        } else if (latestVersion) {
          setCurrentVersionId(latestVersion.id);
          if (latestVersion.script_data) {
            setManifest(latestVersion.script_data as ProductionManifest);
          } else {
            setManifest(createInitialManifest(projectId, latestVersion.id, { hook: '', context: '', meat: '', cta: '' }));
          }
        } else {
          setManifest(createInitialManifest(projectId, uuidv4(), { hook: '', context: '', meat: '', cta: '' }));
        }

        // 4. RECOVER PENDING VIDEO RECORDING
        const pendingRecId = await idb.get(`pending_upload_${projectId}`, 'ProjectDrafts');
        if (pendingRecId) {
          const blob = await idb.get(pendingRecId, 'MediaBuffer');
          if (blob instanceof Blob) {
            console.log('[Studio] Recovered pending recording from crash:', pendingRecId);
            const url = URL.createObjectURL(blob);
            setLastRecordingUrl(url);
            setShowRecordingReview(true);
          }
        }

        // 5. ENUMERATE DEVICES
        const devices = await navigator.mediaDevices.enumerateDevices();
        const v = devices.filter(d => d.kind === 'videoinput');
        const a = devices.filter(d => d.kind === 'audioinput');
        setVideoDevices(v);
        setAudioDevices(a);
        
        // Initial auto-selection if not set
        if (!selectedVideoDeviceId && v.length > 0) setSelectedVideoDeviceId(v[0].deviceId);
        if (!selectedAudioDeviceId && a.length > 0) setSelectedAudioDeviceId(a[0].deviceId);

      } catch (err) {
        console.error('Failed to load studio data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    // Permissions change listener
    const handleDeviceChange = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
      setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  }, [projectId]);

  // 📹 Auto-init camera when entering teleprompter
  useEffect(() => {
    if (activeTab === 'teleprompter' && !cameraStream && !isLoading) {
      console.log('[Studio] Auto-initializing camera for teleprompter...');
      initCamera();
    }
    
    // 🚀 Auto-stop camera when leaving recording studio to save RAM/CPU
    if (activeTab === 'assembly' || activeTab === 'assets' || activeTab === 'concept') {
      console.log(`[Studio] Leaving recording tab (${activeTab}), releasing hardware...`);
      stopCamera();
    }
  }, [activeTab, cameraStream, isLoading]);

  const initCamera = async (): Promise<MediaStream | null> => {
    setCameraError(null);
    try {
      console.log('[Studio] initCamera: Starting, isVoiceOnly:', isVoiceOnly);
      
      const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const resMap = {
        '360p': { width: { ideal: 640 }, height: { ideal: 360 } },
        '720p': { width: { ideal: 1280 }, height: { ideal: 720 } },
        '1080p': { width: { ideal: 1920 }, height: { ideal: 1080 } },
        '4k': { width: { ideal: 3840 }, height: { ideal: 2160 } }
      };

      const constraints: MediaStreamConstraints = {
        video: isVoiceOnly ? false : {
          deviceId: selectedVideoDeviceId ? { ideal: selectedVideoDeviceId } : undefined,
          facingMode: (isMobile && !selectedVideoDeviceId) ? facingMode : undefined,
          ...resMap[videoResolution as keyof typeof resMap]
        },
        audio: {
          deviceId: selectedAudioDeviceId ? { ideal: selectedAudioDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setCameraStream(stream);
        if (videoPreviewRef.current && !isVoiceOnly) {
          videoPreviewRef.current.srcObject = stream;
        }
        return stream;
      } catch (firstErr: any) {
        console.warn('[Studio] High-res camera init failed, trying basic fallback...', firstErr.name, firstErr.message);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: !isVoiceOnly, audio: true });
          setCameraStream(stream);
          if (videoPreviewRef.current && !isVoiceOnly) {
            videoPreviewRef.current.srcObject = stream;
          }
          return stream;
        } catch (secondErr: any) {
          console.error('[Studio] All camera paths failed:', secondErr.name);
          setCameraError(`Camera Error: ${secondErr.name}. Try another browser or close other apps.`);
          return null;
        }
      }
    } catch (err: any) {
      console.error('Critical camera init error:', err);
      setCameraError(`Critical Error: ${err.message}`);
      return null;
    }
  };

  const stopCamera = () => {
    console.log('[Studio] stopCamera: Releasing all hardware resources...');
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
        console.log(`[Studio] Stopped track: ${track.kind}`);
      });
      setCameraStream(null);
    }
    
    // Safety: scan for any other active streams/tracks and stop them
    if (typeof navigator !== 'undefined' && (window as any)._audioRecorder) {
       const aRec = (window as any)._audioRecorder as MediaRecorder;
       if (aRec.stream) {
          aRec.stream.getTracks().forEach(t => t.stop());
       }
       if (aRec.state !== 'inactive') aRec.stop();
       delete (window as any)._audioRecorder;
    }

    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  };

  const startVideoRecording = async () => {
    try {
      let activeStream = cameraStream;
      if (!activeStream || !activeStream.active) {
        activeStream = await initCamera();
      }

      if (!activeStream) {
        const errorMsg = "Камера не запущена. Проверьте разрешения или попробуйте перезагрузить вкладку.";
        alert(errorMsg);
        return;
      }

      // 2. Start Countdown
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

      // 3. Action!
      setTimeout(async () => {
        if (!activeStream) return;
        setIsReading(true);
        const localChunks: Blob[] = [];
        const audioChunks: Blob[] = [];
        
        try {
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          
          let recorder: MediaRecorder;
          if (isVoiceOnly) {
            const aMime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
            recorder = new MediaRecorder(activeStream, { mimeType: aMime });
          } else {
            recorder = new MediaRecorder(activeStream, { 
              mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm',
              videoBitsPerSecond: isMobile ? 2500000 : 5000000
            });
          }

          recorder.ondataavailable = (e) => { if (e.data.size > 0) localChunks.push(e.data); };
          recorder.onstop = async () => {
            const blob = new Blob(localChunks, { type: recorder.mimeType });
            const timestamp = Date.now();
            const recordingId = (isVoiceOnly ? 'raw_audio_' : 'raw_rec_') + projectId + '_' + timestamp;
            
            try {
              await idb.set(recordingId, blob, 'MediaBuffer');
              if (isVoiceOnly) {
                await idb.set(`pending_audio_${projectId}`, recordingId, 'ProjectDrafts');
              } else {
                await idb.set(`pending_upload_${projectId}`, recordingId, 'ProjectDrafts');
              }
              
              if (!isVoiceOnly && audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioRecId = `raw_rec_audio_${projectId}_${timestamp}`;
                await idb.set(audioRecId, audioBlob, 'MediaBuffer');
                await idb.set(`pending_audio_${projectId}`, audioRecId, 'ProjectDrafts');
              }
            } catch (e) { console.error('[Studio] IDB Storage error:', e); }

            const url = URL.createObjectURL(blob);
            setLastRecordingUrl(url);
            setActiveTab('post_record_branch');
          };

          // Secondary audio-only recorder for OOM bypass on mobile (only for video mode)
          if (!isVoiceOnly) {
            try {
              const aMime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
              const audioOnlyStream = new MediaStream(activeStream.getAudioTracks());
              const audioRecorder = new MediaRecorder(audioOnlyStream, { 
                mimeType: aMime,
                audioBitsPerSecond: 64000 
              });
              audioRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
              audioRecorder.start(1000);
              (window as any)._audioRecorder = audioRecorder;
            } catch (ae) {
              console.warn('[Studio] Parallel audio recording failed:', ae);
            }
          }

          recorder.start(1000);
          mediaRecorderRef.current = recorder;
          setIsRecordingVideo(true);
          setRecordingTime(0);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
          
        } catch (err: any) {
          console.error('[Studio] MediaRecorder fail:', err);
          const detail = err.name === 'NotReadableError' ? 'Камера занята другим приложением' : (err.message || err.name);
          alert(`Ошибка старта записи: ${detail}. Попробуйте перезагрузить страницу.`);
          setIsReading(false);
        }
      }, 3000);
    } catch (err: any) {
      alert("Ошибка инициализации: " + (err.message || err.name));
    }
  };

  const stopVideoRecording = () => {
    setIsReading(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      const aRec = (window as any)._audioRecorder as MediaRecorder;
      if (aRec && aRec.state !== 'inactive') aRec.stop();
      
      setIsRecordingVideo(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      
      // Release camera when record is done and we're entering review
      stopCamera();
    }
  };

  const downloadRawVideo = () => {
    if (!lastRecordingUrl) return;
    const a = document.createElement('a');
    a.href = lastRecordingUrl;
    a.download = `ViralEngine_Raw_${Date.now()}.webm`;
    a.click();
  };

  const sendRawToTelegram = async () => {
    // Basic implementation placeholder
    alert('Sending to Telegram...');
  };

  // Manifest Handlers - Memoized to prevent cascade re-renders
  const updateSegmentField = useCallback((id: string, field: string, value: any) => {
     setManifest(prev => {
       if (!prev) return prev;
       return {
         ...prev,
         segments: prev.segments.map(s => s.id === id ? { ...s, [field]: value } : s)
       };
     });
  }, []);

  const addSegment = (type: any = 'broll') => {
    if (!manifest) return;
    const newSegment = {
      id: uuidv4(),
      type: type,
      prompt: '',
      scriptText: '',
      status: 'pending' as any,
      animationStyle: 'zoom-in' as any
    };
    setManifest({ ...manifest, segments: [...manifest.segments, newSegment] });
  };

  const deleteSegment = (id: string) => {
    if (!manifest) return;
    setManifest({ ...manifest, segments: manifest.segments.filter(s => s.id !== id) });
  };

  const regenerateSegment = async (id: string) => {
    setIsRegenerating(id);
    try {
      // Mock logic for now
      await new Promise(r => setTimeout(r, 2000));
    } finally {
      setIsRegenerating(null);
    }
  };

  const handleFinalExport = async (broll?: any[], subs?: any[], explicitARollUrl?: string | null) => {
    setIsSaving(true);
    try {
      if (!manifest) {
        alert('Ошибка: манифест проекта не загружен. Попробуйте обновить страницу.');
        return;
      }

      // ЁЯФе Merge editor state into manifest
      const manifestAny = manifest as any;
      const resolvedARollUrl = 
        explicitARollUrl ||
        manifestAny.aRollUrl ||
        manifestAny.segments?.find((s: any) => s.type === 'user_recording' && s.assetUrl)?.assetUrl ||
        manifestAny.segments?.[0]?.assetUrl ||
        null;

      // Derivce final script text from montage subtitles (requested by user)
      const finalScriptText = subs?.map(s => s.text).join('\n\n') || 
                             manifest.segments?.map(s => s.scriptText).filter(Boolean).join('\n\n') || '';

      const updatedManifest = {
        ...manifest,
        aRollUrl: resolvedARollUrl,
        scriptText: finalScriptText, // Save for distribution
        brollClips: broll || [],
        subtitleClips: subs || [],
        _log_subs_count: subs?.length || 0,
        segments: manifest.segments.map((s: any, i: number) => i === 0 ? { 
          ...s, 
          brollClips: broll || [], 
          subtitleClips: subs || [] 
        } : s)
      };

      // тЬЕ Trigger background distribution asset generation
      fetch('/api/ai/distribution-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptText: finalScriptText, projectId, locale, background: true })
      }).then(res => res.json()).then(async assets => { if (assets && !assets.error) { await projectService.updateLatestVersionManifest(projectId, { ...updatedManifest, distributionAssets: assets }); } }).catch(e => console.error('[Studio] Prefetch failed:', e));

      // тЬЕ Background Save manifest тАФ wait for it to prevent race condition on Delivery page
      let savedVersion = null;
      if (currentVersionId) {
        savedVersion = await projectService.updateVersion(currentVersionId, { script_data: updatedManifest });
      } else {
        savedVersion = await projectService.updateLatestVersionManifest(projectId, updatedManifest);
      }

      if (!savedVersion) {
        savedVersion = await projectService.createVersion({
          projectId,
          scriptData: updatedManifest,
          versionLabel: 'Initial Export'
        });
      }
      
      // тЬЕ Invalidate render cache so delivery always re-renders with fresh subtitles
      try {
        await idb.delete(`final_render_${projectId}`, 'MediaBuffer');
        console.log('[Studio] Render cache invalidated — delivery will re-render with subtitles');
      } catch (e) { /* ignore */ }

      // тЬЕ Final Redirect
      router.push(`/app/projects/new/delivery?projectId=${projectId}`);

    } catch (err: any) {
      console.error('Export failed:', err);
      alert(`Не удалось сохранить проект: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- RENDER ---
  if (isLoading) return <div className="h-screen bg-[#05050a] flex items-center justify-center text-white/20 uppercase tracking-widest text-[10px] animate-pulse">Syncing Studio...</div>;

  const selectedSegment = manifest?.segments.find(s => s.id === selectedSegmentId);

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden font-sans relative">
      {/* ЁЯЪА Pro Studio Mainframe - Full Screen Immersion */}
      <div className="flex h-full w-full overflow-hidden">
        {(!isMobileRef.current || activeTab !== 'assembly') && (
          <StudioSidebar 
            activeTab={activeTab as any}
            setActiveTab={setActiveTab}
            cameraStream={cameraStream}
            isRecordingVideo={isRecordingVideo}
            recordingTime={recordingTime}
            facingMode={facingMode}
            videoResolution={videoResolution}
            videoDevices={videoDevices}
            audioDevices={audioDevices}
            selectedVideoDeviceId={selectedVideoDeviceId}
            selectedAudioDeviceId={selectedAudioDeviceId}
            initCamera={initCamera}
            stopCamera={stopCamera}
            setFacingMode={setFacingMode}
            setIsVideoMirrored={setIsVideoMirrored}
            isVideoMirrored={isVideoMirrored}
            setVideoResolution={setVideoResolution}
            setSelectedVideoDeviceId={setSelectedVideoDeviceId}
            setSelectedAudioDeviceId={setSelectedAudioDeviceId}
            useCustomScript={useCustomScript}
            setUseCustomScript={setUseCustomScript}
            customScript={customScript}
            setCustomScript={setCustomScript}
            manifest={manifest}
            isMirrored={isMirrored}
            setIsMirrored={setIsMirrored}
            scrollSpeed={scrollSpeed}
            setScrollSpeed={setScrollSpeed}
            prompterWidth={prompterWidth}
            setPrompterWidth={setPrompterWidth}
            textSize={textSize}
            setTextSize={setTextSize}
            scriptOpacity={scriptOpacity}
            setScriptOpacity={setScriptOpacity}
            t={t}
            currentProfile={currentProfile}
          />
        )}

        <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden bg-[#050508]">
          {/* Persistence Status Indicator */}
          <AnimatePresence>
            {isSaving && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-4 right-4 z-[200] flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md"
              >
                <RefreshCw size={12} className="animate-spin text-purple-400" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Syncing...</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Stage Area */}
          <div className="flex-1 relative overflow-hidden">
            {activeTab === 'concept' && (
              <div className="max-w-4xl mx-auto h-full relative">
                <StrategistChat 
                  projectId={projectId}
                  userId={currentProfile?.id || ''}
                  manifest={manifest || undefined} 
                  setManifest={(m) => setManifest(m)} 
                  containerClassName="relative h-full"
                />

                {manifest && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[110]"
                  >
                    <button
                      onClick={() => setActiveTab('branch')}
                      className="flex items-center gap-3 px-8 py-4 rounded-[2rem] bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black italic uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(168,85,247,0.4)] hover:shadow-[0_20px_50px_rgba(168,85,247,0.6)] active:scale-95 transition-all group"
                    >
                      ПЕРЕЙТИ К ПРОДАКШНУ <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                )}
              </div>
            )}
            
            {activeTab === 'branch' && (
              <ProductionBranch
                onSelect={(type) => {
                  if (type === 'record') {
                    setShowFaceless(false);
                    setIsVoiceOnly(false);
                    setActiveTab('teleprompter');
                  } else if (type === 'voice-master') {
                    setShowFaceless(false);
                    setIsVoiceOnly(true);
                    setActiveTab('teleprompter');
                  } else if (type === 'faceless') {
                    setShowFaceless(true);
                    setIsVoiceOnly(false);
                    setActiveTab('assembly');
                  }
                }}
                onBack={() => setActiveTab('concept')}
              />
            )}

            {activeTab === 'teleprompter' && (
                   onColorChange={setScriptColor}
                   scriptOpacity={scriptOpacity}
                   onOpacityChange={setScriptOpacity}
                   scrollSpeed={scrollSpeed}
                   onSpeedChange={setScrollSpeed}
                   isRecordingVideo={isRecordingVideo}
                   isVoiceOnly={isVoiceOnly}
                    recordingTime={recordingTime}
                    onBack={() => setActiveTab('branch')}
                    onToggleRecording={isRecordingVideo ? stopVideoRecording : startVideoRecording}
                   onFlipCamera={() => setIsMirrored(!isMirrored)}
                   onScriptUpdate={async (newText) => {
                     if (!manifest) return;
                     const segments = newText.split('\n\n').map((text, i) => ({
                       ...(manifest.segments[i] || { id: uuidv4(), type: 'broll' }),
                       scriptText: text
                     }));
                     const updatedManifest = { ...manifest, segments };
                     setManifest(updatedManifest);
                     await projectService.updateLatestVersionManifest(projectId, updatedManifest);
                   }}
                   onFinish={() => {
                      if (lastRecordingUrl) {
                        setShowRecordingReview(true);
                      } else {
                        setActiveTab('assembly');
                      }
                   }}
                   t={t}
                />
              </div>
            )}

            {/* Global Recording Review Overlay (No AnimatePresence for OOM safety) */}
            {showRecordingReview && (
               <RecordingReview 
                  showRecordingReview={showRecordingReview}
                    lastRecordingUrl={lastRecordingUrl}
                    currentProfile={currentProfile}
                    downloadRawVideo={downloadRawVideo}
                    sendRawToTelegram={sendRawToTelegram}
                    setShowRecordingReview={setShowRecordingReview}
                    setLastRecordingUrl={setLastRecordingUrl}
                    updateSegmentField={updateSegmentField}
                    isVoiceOnly={isVoiceOnly}
                    handleAcceptRecording={async (url) => {
                       if (isVoiceOnly) {
                          setShowRecordingReview(false);
                          setShowAvatarSelector(true);
                          return;
                       }
                       try {
                         if (manifest) {
                            const segmentId = selectedSegmentId || manifest?.segments[0]?.id || '';
                            const newManifest = {
                               ...manifest,
                               videoUrl: url,
                               segments: manifest.segments.map((s: any) => 
                                  s.id === segmentId ? { ...s, assetUrl: url, type: 'user_recording' } : s
                               )
                            };
                            setManifest(newManifest);
                            await projectService.updateLatestVersionManifest(projectId, newManifest);
                         }
                       } catch (e) { console.error('Failed to prepare video for editor:', e); }

                       await idb.delete(`pending_upload_${projectId}`, 'ProjectDrafts');
                       setShowRecordingReview(false);
                        
                       // 🚀 Stop camera with delay to ensure GPU memory is released before Editor mounts
                       setTimeout(() => stopCamera(), 500);

                       if (isMobileRef.current) {
                         setShowAssemblyLauncher(true);
                       } else {
                         setTimeout(() => setActiveTab('assembly'), 200);
                       }
                     }}
                    onDiscard={async () => {
                      await idb.delete(`pending_upload_${projectId}`, 'ProjectDrafts');
                      setShowRecordingReview(false);
                      setLastRecordingUrl(null);
                    }}
                    manifest={manifest}
                    selectedSegmentId={selectedSegmentId}
                />
              )}

            {showAvatarSelector && (
              <AvatarSelector 
                isOpen={showAvatarSelector}
                onClose={() => setShowAvatarSelector(false)}
                onSelect={handleAvatarSelect}
                isGenerating={isGeneratingAvatar}
                projectId={projectId}
              />
            )}

            {isAssemblingAvatar && (
               <AssemblyProgress photoUrl={selectedAvatarPhoto || ''} />
            )}

            {/* Mobile Assembly Launcher - lightweight buffer before FFmpeg loads */}
            {showAssemblyLauncher && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 bg-[#050508] flex flex-col items-center justify-center gap-8 p-10"
              >
                <div className="w-20 h-20 rounded-3xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Scissors size={32} className="text-purple-400" />
                </div>
                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Запись сохранена!</h2>
                  <p className="text-sm text-white/40 leading-relaxed">Запись сохранена в памяти устройства.<br/>Нажми кнопку, чтобы открыть монтажку.</p>
                </div>
                <button
                  onClick={() => {
                    setShowAssemblyLauncher(false);
                    // Small delay to let GC run before mounting FFmpeg
                    setTimeout(() => setActiveTab('assembly'), 300);
                  }}
                  className="w-full max-w-xs py-5 bg-purple-500 rounded-[2rem] text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-purple-500/30 active:scale-95 transition-all"
                >
                  Открыть монтажку →
                </button>
                <button
                  onClick={() => {
                    setShowAssemblyLauncher(false);
                    setActiveTab('teleprompter');
                  }}
                  className="text-white/20 text-xs uppercase tracking-widest font-bold"
                >
                  Записать ещё раз
                </button>
              </motion.div>
            )}

            {activeTab === 'assembly' && !showFaceless && (
              <VideoEditor 
                projectId={projectId}
                aRollUrl={lastRecordingUrl || ''}
                onBack={() => {
                  if (isMobileRef.current) {
                    setActiveTab('teleprompter');
                  } else {
                    setActiveTab('branch');
                  }
                }}
                onNext={handleFinalExport}
                manifest={manifest}
                onFaceless={() => setShowFaceless(true)}
              />
            )}

            {activeTab === 'assembly' && showFaceless && (
              <FacelessStudio
                projectId={projectId}
                manifest={manifest}
                onBack={() => setShowFaceless(false)}

                onJumpToConcept={() => {
                  setShowFaceless(false);
                  setActiveTab('concept');
                }}
                onComplete={(videoBlob, transcriptData) => {
                  const localUrl = URL.createObjectURL(videoBlob);
                  setManifest(prev => prev ? {
                    ...prev,
                    videoUrl: localUrl,
                    transcript: transcriptData, // Use scene-based timings as initial transcript
                    segments: prev.segments?.map((s, i) =>
                      i === 0 ? { ...s, assetUrl: localUrl, type: 'user_recording' } : s
                    ) || prev.segments,
                  } : prev);
                  setShowFaceless(false);
                  renderService.uploadMedia(projectId, videoBlob, 'video').then(res => {
                    if (res.publicUrl) {
                      setManifest(prev => {
                        if (!prev) return prev;
                        const next = {
                          videoUrl: res.publicUrl,
                          segments: prev.segments?.map((s, i) => i === 0 ? { ...s, assetUrl: res.publicUrl } : s) || prev.segments,
                        };
                        projectService.updateLatestVersionManifest(projectId, next);
                        return next;
                      });
                    }
                  });
                }}
              />
            )}

            {activeTab === 'assets' && (
              <div className="max-w-6xl mx-auto h-full p-10">
                <DistributionFactory 
                  manifest={manifest}
                  scriptText={(manifest as any)?.scriptText || manifest?.segments?.map(s => s.scriptText).filter(Boolean).join('\n\n') || ''}
                  projectId={projectId}
                  locale={locale}
                  onUpdateManifest={(newManifest) => {
                    setManifest(newManifest);
                    projectService.updateLatestVersionManifest(projectId, newManifest);
                  }}
                />
              </div>
            )}

            {activeTab === 'knowledge' && (
              <KnowledgeLab profile={currentProfile!} onProfileUpdate={setCurrentProfile} />
            )}
          </div>
        </main>
      </div>



      <PremiumLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        title={modalConfig.title}
        description={modalConfig.desc}
        type={modalConfig.type}
        locale={locale}
        balance={currentProfile?.credits_balance}
      />

      {/* тЬЕ Mobile Bottom Navigation (Visible only on Level 1 & 2) */}
      <AnimatePresence>
        {isMobileRef.current && (activeTab === 'concept' || activeTab === 'branch') && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden"
          >
            <BottomNav />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
