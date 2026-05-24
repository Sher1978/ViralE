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
import dynamic from 'next/dynamic';

const Spinner = () => (
  <div className="absolute inset-0 z-50 bg-[#050508]/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
    <RefreshCw size={32} className="animate-spin text-purple-500" />
    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Loading Engine...</span>
  </div>
);

const TeleprompterView = dynamic(() => import('./_components/TeleprompterView').then(m => m.TeleprompterView), { ssr: false, loading: Spinner });
const StoryboardGrid = dynamic(() => import('./_components/StoryboardGrid').then(m => m.StoryboardGrid), { ssr: false, loading: Spinner });
const RecordingReview = dynamic(() => import('./_components/RecordingReview').then(m => m.RecordingReview), { ssr: false, loading: Spinner });
const SourcePicker = dynamic(() => import('./_components/SourcePicker').then(m => m.SourcePicker), { ssr: false, loading: Spinner });
const AvatarSelector = dynamic(() => import('./_components/AvatarSelector').then(m => m.AvatarSelector), { ssr: false, loading: Spinner });
const AssemblyProgress = dynamic(() => import('./_components/AssemblyProgress').then(m => m.AssemblyProgress), { ssr: false, loading: Spinner });
const VideoEditor = dynamic(() => import('./_components/VideoEditor').then(m => m.VideoEditor), { ssr: false, loading: Spinner });
const ProductionBranch = dynamic(() => import('./_components/ProductionBranch').then(m => m.ProductionBranch), { ssr: false, loading: Spinner });
const PostRecordBranch = dynamic(() => import('./_components/PostRecordBranch').then(m => m.PostRecordBranch), { ssr: false, loading: Spinner });
const TimelineLab = dynamic(() => import('./_components/TimelineLab').then(m => m.TimelineLab), { ssr: false, loading: Spinner });
const FusionView = dynamic(() => import('./_components/FusionView').then(m => m.FusionView), { ssr: false, loading: Spinner });
const DistributionFactory = dynamic(() => import('./_components/DistributionFactory'), { ssr: false, loading: Spinner });
const KnowledgeLab = dynamic(() => import('@/components/studio/KnowledgeLab'), { ssr: false, loading: Spinner });
const StrategistChat = dynamic(() => import('@/components/studio/StrategistChat').then(m => m.StrategistChat), { ssr: false, loading: Spinner });
const FacelessStudio = dynamic(() => import('@/components/studio/FacelessStudio'), { ssr: false, loading: Spinner });
const AvatarHub = dynamic(() => import('@/components/production/AvatarHub'), { ssr: false, loading: Spinner });
const FusionPreview = dynamic(() => import('./_components/FusionPreview').then(m => m.FusionPreview), { ssr: false, loading: Spinner });

import { BottomNav } from '@/components/layout/BottomNav';



export default function StudioPage() {
  const t = useTranslations('studio');
  const router = useRouter();
  const { id: projectId, locale } = useParams() as { id: string; locale: string };

  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') as any || 'branch';

  const [isPending, startTransition] = React.useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [manifest, setManifest] = useState<ProductionManifest | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'strategy' | 'teleprompter' | 'branch'| 'assembly' | 'knowledge' | 'assets' | 'concept' | 'post_record_branch' | 'timeline_lab' | 'fusion' | 'avatar_hub' | 'fusion_preview'>(initialTab);
  
  const handleTabChange = useCallback((tab: any) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  }, []);
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
  const [recordedSize, setRecordedSize] = useState<number | null>(null);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [showLogConsole, setShowLogConsole] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const addSystemLog = useCallback((msg: string) => {
    console.log(`[STUDIO-LOG] ${msg}`);
    const time = new Date().toLocaleTimeString();
    setSystemLogs(prev => [...prev.slice(-30), `[${time}] ${msg}`]);
  }, []);

  // Background MP4 Normalization States
  const [backgroundMp4Url, setBackgroundMp4Url] = useState<string | null>(null);
  const [isBackgroundConverting, setIsBackgroundConverting] = useState(false);

  // Auto-load backgroundMp4Url if already present in manifest
  useEffect(() => {
    const videoUrl = manifest?.videoUrl || (manifest as any)?.aRollUrl;
    if (videoUrl && !videoUrl.startsWith('blob:') && !videoUrl.includes('.webm')) {
      setBackgroundMp4Url(videoUrl);
    }
  }, [manifest]);

  // Auto-revoke blob URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (lastRecordingUrl && lastRecordingUrl.startsWith('blob:')) {
        console.log('[Studio] Revoking recording blob URL:', lastRecordingUrl);
        try {
          URL.revokeObjectURL(lastRecordingUrl);
        } catch (e) {
          console.warn('[Studio] Revoke failed:', e);
        }
      }
    };
  }, [lastRecordingUrl]);

  const [showRecordingReview, setShowRecordingReview] = useState(false);
  const [scriptOpacity, setScriptOpacity] = useState(0.85);
  const [scriptColor, setScriptColor] = useState('#ffffff');
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showFaceless, setShowFaceless] = useState(false);
  const [isVoiceOnly, setIsVoiceOnly] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [availableAvatars, setAvailableAvatars] = useState<any[]>([]);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isGeneratingFusion, setIsGeneratingFusion] = useState(false);
  const [fusionStatus, setFusionStatus] = useState<'segmenting' | 'processing' | 'stitching' | 'completed' | 'failed'>('segmenting');
  const [fusionProgress, setFusionProgress] = useState(0);
  const [isAssemblingAvatar, setIsAssemblingAvatar] = useState(false);
  const [selectedAvatarPhoto, setSelectedAvatarPhoto] = useState<string | null>(null);
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);
  
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

  // Fusion Engine States
  const [fusionSegments, setFusionSegments] = useState<any[]>([]);
  const [fusedVideoUrl, setFusedVideoUrl] = useState<string | null>(null);
  const [fusionSegmentsCount, setFusionSegmentsCount] = useState(0);
  const [fusionCompletedSegments, setFusionCompletedSegments] = useState(0);
  const [fusionError, setFusionError] = useState<string | null>(null);

  const prompterRef = useRef<HTMLDivElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<any>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollPosRef = useRef(0);
  const recordedBlobRef = useRef<Blob | null>(null);

  const [showLimitModal, setShowLimitModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: '', desc: '', type: 'info' as any });
  const [showAssemblyLauncher, setShowAssemblyLauncher] = useState(false);
  const isMobileRef = useRef(typeof globalThis.navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Honor/i.test((globalThis.navigator as any).userAgent));


  // State Sync Effect (URL Persistence)
  useEffect(() => {
    if (isLoading) return;
    
    if (activeTab === 'concept') {
      router.push(`/app/projects/new/script?projectId=${projectId}`);
      return;
    }

    // Defer URL update to avoid conflict with heavy UI transitions (especially on Android)
    const timeout = setTimeout(() => {
      const win = globalThis as any;
      if (!win.location) return;
      const params = new URLSearchParams(win.location.search);
      params.set('tab', activeTab);
      if (showFaceless) params.set('mode', 'faceless');
      else params.delete('mode');
      
      const currentPath = win.location.pathname;
      const newUrl = `${currentPath}?${params.toString()}`;
      
      try {
        if (win.location.search !== `?${params.toString()}`) {
          win.history.replaceState({ path: newUrl }, '', newUrl);
          console.log('[Studio] Syncing URL:', newUrl);
        }
      } catch (e) {
        console.warn('[Studio] replaceState failed:', e);
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [activeTab, showFaceless, isLoading]);

  // Pre-load the recorded video blob from IndexedDB into recordedBlobRef memory cache
  // This guarantees 100% synchronous Web Share activation on iOS/Android without async fetches!
  useEffect(() => {
    if (!projectId) return;
    
    const prefetchBlob = async () => {
      try {
        addSystemLog('Начало префетча исходного видео из IndexedDB...');
        const cachedBlob = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
        if (cachedBlob instanceof Blob) {
          recordedBlobRef.current = cachedBlob;
          setRecordedSize(cachedBlob.size);
          addSystemLog(`Префетч успешен. Размер файла: ${(cachedBlob.size / (1024 * 1024)).toFixed(2)} MB (${cachedBlob.size} байт). Тип: ${cachedBlob.type}`);
        } else {
          addSystemLog('Префетч: Запись в IndexedDB не найдена (еще нет записанных дублей).');
        }
      } catch (err: any) {
        addSystemLog(`Ошибка префетча из IDB: ${err.message || err}`);
      }
    };

    prefetchBlob();
  }, [projectId, lastRecordingUrl, addSystemLog]);

  // Restore lastRecordingUrl from IndexedDB on page load/mount if it is null
  useEffect(() => {
    if (!projectId || lastRecordingUrl) return;
    
    const restoreFromIDB = async () => {
      try {
        addSystemLog('Восстановление сессии: поиск видеозаписи в IndexedDB...');
        const cachedBlob = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
        if (cachedBlob instanceof Blob) {
          const restoredUrl = URL.createObjectURL(cachedBlob);
          setLastRecordingUrl(restoredUrl);
          recordedBlobRef.current = cachedBlob;
          setRecordedSize(cachedBlob.size);
          addSystemLog(`Сессия восстановлена! Запись загружена: ${(cachedBlob.size / (1024 * 1024)).toFixed(2)} MB. Ссылка: ${restoredUrl}`);
        } else {
          addSystemLog('Восстановление сессии: Записей in IndexedDB не обнаружено.');
        }
      } catch (err: any) {
        addSystemLog(`Ошибка восстановления сессии из IDB: ${err.message || err}`);
      }
    };

    restoreFromIDB();
  }, [projectId, lastRecordingUrl, addSystemLog]);

  // Prevent accidental data loss
  useEffect(() => {
    const handleBeforeUnload = (e: any) => {
      if (activeTab === 'assembly' || activeTab === 'teleprompter' || showFaceless) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const win = globalThis as any;
    win.addEventListener?.('beforeunload', handleBeforeUnload);
    return () => win.removeEventListener?.('beforeunload', handleBeforeUnload);
  }, [activeTab, showFaceless]);

  const handleAvatarSelect = async (photoUrl: string) => {
    setSelectedAvatarPhoto(photoUrl);
    // Update the Master Track in Timeline (we'll need to pass this to TimelineLab)
    handleTabChange('timeline_lab');
  };

  const handleTimelineGeneration = async (timelineSegments: any[]) => {
    setFusionSegments(timelineSegments);
    handleTabChange('fusion');
    setFusionStatus('segmenting');
    setFusionProgress(5);
    
    try {
      // CRITICAL FIX: Prefer the Supabase URL from manifest over lastRecordingUrl.
      // lastRecordingUrl can be a revoked blob URL (revokeObjectURL was called to free RAM
      // before mounting VideoEditor/FFmpeg), which causes 0-byte uploads to process-timeline.
      const manifestVideoUrl = (manifest as any)?.videoUrl || (manifest as any)?.aRollUrl;
      let finalVideoUrl: string | null = null;

      if (manifestVideoUrl && !manifestVideoUrl.startsWith('blob:')) {
        // ✅ Best case: we already have a persisted Supabase/CDN URL
        finalVideoUrl = manifestVideoUrl;
        console.log('[Fusion] Using persisted Supabase URL from manifest:', finalVideoUrl);
      } else if (lastRecordingUrl && !lastRecordingUrl.startsWith('blob:')) {
        // ✅ Supabase URL in state
        finalVideoUrl = lastRecordingUrl;
        console.log('[Fusion] Using Supabase URL from lastRecordingUrl state:', finalVideoUrl);
      } else if (lastRecordingUrl && lastRecordingUrl.startsWith('blob:')) {
        // ⚠️ Blob URL — try to fetch it (only works if not revoked)
        setFusionStatus('segmenting');
        setFusionProgress(10);
        console.log('[Fusion] Attempting to fetch live blob URL for upload...');
        let videoBlob: Blob;
        try {
          const blobRes = await fetch(lastRecordingUrl);
          videoBlob = await blobRes.blob();
        } catch (fetchErr) {
          // Blob was revoked — try to recover from IndexedDB
          console.warn('[Fusion] Blob URL is dead (revoked). Attempting IDB recovery...');
          const idbBlob = await idb.get(`video_file_${projectId}`, 'MediaBuffer').catch(() => null);
          if (!idbBlob || !(idbBlob instanceof Blob)) {
            throw new Error('Исходное видео не найдено. Blob URL был освобождён из памяти и файл недоступен в кэше. Пожалуйста, запишите видео заново.');
          }
          videoBlob = idbBlob;
          console.log(`[Fusion] IDB recovery successful: ${videoBlob.size} bytes`);
        }

        if (videoBlob.size < 1000) {
          throw new Error(`Записанное видео пустое или повреждено (${videoBlob.size} байт). Пожалуйста, запишите видео заново.`);
        }
        
        console.log(`[Fusion] Uploading blob to Supabase. Size: ${videoBlob.size} bytes, type: ${videoBlob.type}`);
        const uploadResult = await renderService.uploadMedia(projectId, videoBlob, 'video');
        if (!uploadResult || !uploadResult.publicUrl) {
          throw new Error('Не удалось загрузить видео в хранилище.');
        }
        finalVideoUrl = uploadResult.publicUrl;
        console.log('[Fusion] Blob uploaded to Supabase:', finalVideoUrl);
        
        // Persist the public URL so future calls don't need to re-upload
        setManifest(prev => {
          if (!prev) return prev;
          const next = { ...prev, videoUrl: finalVideoUrl || '' };
          projectService.updateLatestVersionManifest(projectId, next);
          return next;
        });
        setLastRecordingUrl(finalVideoUrl);
      }

      if (!finalVideoUrl) {
        throw new Error('Не удалось определить источник видео. Попробуйте обновить страницу.');
      }
      
      setFusionProgress(35);
      setFusionStatus('processing');

      const response = await fetch('/api/ai/fal/process-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          videoUrl: finalVideoUrl,
          segments: timelineSegments
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Synthesis failed');
      }

      const data = await response.json();

      if (data.status === 'completed' && data.videoUrl) {
        setFusionStatus('completed');
        setFusionProgress(100);
        setFusedVideoUrl(data.videoUrl); 
        setTimeout(() => handleTabChange('fusion_preview'), 1000);
      } else {
        throw new Error('Synthesis failed to return a result');
      }

    } catch (err: any) {
      console.error('[Fusion] Failed:', err);
      setFusionStatus('failed');
      setFusionError(err.message || 'Unknown error during synthesis');
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
      
      // Safety timeout: if fetching hangs, force stop loading after 3s
      const safetyTimeout = setTimeout(() => {
        setIsLoading(false);
        console.warn('[Studio] loadData timed out, forcing ready state');
      }, 3000);

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
            const loadedManifest = latestVersion.script_data as ProductionManifest;
            setManifest(loadedManifest);
            if (loadedManifest.customScript) setCustomScript(loadedManifest.customScript);
            if (loadedManifest.useCustomScript !== undefined) setUseCustomScript(loadedManifest.useCustomScript);
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
          }
        }

        // 5. Fallback to Manifest videoUrl
        if (!lastRecordingUrl) {
          const m = cachedLocal?.manifest || (latestVersion?.script_data as ProductionManifest);
          if (m?.videoUrl) {
            console.log('[Studio] Recovered video from manifest:', m.videoUrl);
            setLastRecordingUrl(m.videoUrl);
          }
        }

        // 5. ENUMERATE DEVICES (Safely)
        const nav = globalThis.navigator as any;
        if (typeof globalThis.navigator !== 'undefined' && nav?.mediaDevices && nav?.mediaDevices?.enumerateDevices) {
          const devices = await nav.mediaDevices.enumerateDevices();
          const v = devices.filter((d: any) => d.kind === 'videoinput');
          const a = devices.filter((d: any) => d.kind === 'audioinput');
          setVideoDevices(v);
          setAudioDevices(a);
          
          // Initial auto-selection if not set
          if (!selectedVideoDeviceId && v.length > 0) setSelectedVideoDeviceId(v[0].deviceId);
          if (!selectedAudioDeviceId && a.length > 0) setSelectedAudioDeviceId(a[0].deviceId);

          // 🚀 Camera pre-initialization in background removed to prevent camera access prompt on selection screens.
          // Access is requested only when entering the Teleprompter view.
        }

      } catch (err) {
        console.error('Failed to load studio data:', err);
      } finally {
        setIsLoading(false);
        clearTimeout(safetyTimeout);
      }
    }
    loadData();

    // Permissions change listener
    const handleDeviceChange = async () => {
      const nav = globalThis.navigator as any;
      if (!nav || !nav.mediaDevices) return;
      const devices = await nav.mediaDevices.enumerateDevices();
      setVideoDevices(devices.filter((d: any) => d.kind === 'videoinput'));
      setAudioDevices(devices.filter((d: any) => d.kind === 'audioinput'));
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
  }, [projectId]);

  // 📹 Auto-init camera when entering teleprompter
  useEffect(() => {
    if (activeTab === 'teleprompter' && !cameraStream && !isLoading) {
      console.log('[Studio] Auto-initializing camera for teleprompter...');
      initCamera();
    }
    
    // 🛑 Explicitly stop camera hardware when leaving prompter
    if (activeTab !== 'teleprompter' && cameraStream) {
      console.log('[Studio] Stopping camera hardware (Leaving prompter)...');
      stopCamera();
    }
  }, [activeTab, cameraStream, isLoading]);

  const initCamera = async (): Promise<MediaStream | null> => {
    setCameraError(null);
    try {
      console.log('[Studio] initCamera: Starting, isVoiceOnly:', isVoiceOnly);
      
      const nav = globalThis.navigator as any;
      const isMobile = typeof globalThis.navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(nav.userAgent);
      const resMap = {
        '360p': { width: { ideal: 640 }, height: { ideal: 360 } },
        '720p': { width: { ideal: 1280 }, height: { ideal: 720 } },
        '1080p': { width: { ideal: 1920 }, height: { ideal: 1080 } },
        '4k': { width: { ideal: 3840 }, height: { ideal: 2160 } }
      };

      const constraints: any = {
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
        const stream = await nav.mediaDevices.getUserMedia(constraints);
        setCameraStream(stream);
        if (videoPreviewRef.current && !isVoiceOnly) {
          (videoPreviewRef.current as any).srcObject = stream;
        }
        return stream;
      } catch (firstErr: any) {
        console.warn('[Studio] High-res camera init failed, trying basic fallback...', firstErr.name, firstErr.message);
        try {
          const stream = await nav.mediaDevices.getUserMedia({ video: !isVoiceOnly, audio: true });
          setCameraStream(stream);
          if (videoPreviewRef.current && !isVoiceOnly) {
            (videoPreviewRef.current as any).srcObject = stream;
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
      (cameraStream as any).getTracks().forEach((track: any) => {
        track.stop();
        console.log(`[Studio] Stopped track: ${track.kind}`);
      });
      setCameraStream(null);
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
          const nav = globalThis.navigator as any;
          const isMobile = /iPhone|iPad|iPod|Android/i.test(nav ? nav.userAgent : '');
          
          let recorder: any;
          if (isVoiceOnly) {
            const MR = (globalThis as any).MediaRecorder;
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
            const MR = (globalThis as any).MediaRecorder;
            for (const mime of candidateMimes) {
              if (MR && MR.isTypeSupported(mime)) {
                selectedMime = mime;
                break;
              }
            }

            const options: any = {
              videoBitsPerSecond: isMobile ? 1200000 : 2500000
            };
            if (selectedMime) {
              options.mimeType = selectedMime;
              console.log('[Studio] MediaRecorder using video mimeType:', selectedMime);
            } else {
              console.warn('[Studio] No standard video mimeType supported. Letting browser choose default.');
            }

            recorder = new MR(activeStream, options);
          }

          recorder.ondataavailable = (e: any) => { if (e.data.size > 0) localChunks.push(e.data); };
          recorder.onstop = async () => {
            addSystemLog('Запись камеры остановлена. Объединение чанков...');
            const blob = new Blob(localChunks, { type: recorder.mimeType });
            localChunks.length = 0; // Clear chunks to free RAM immediately
            
            addSystemLog(`Файл RAW создан. Размер: ${(blob.size / (1024 * 1024)).toFixed(2)} MB (${blob.size} байт). MIME-тип: ${recorder.mimeType}`);

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
                audioChunks.length = 0; // Clear audio chunks to free RAM immediately
                const audioRecId = `raw_rec_audio_${projectId}_${timestamp}`;
                addSystemLog('Сохранение резервной аудиодорожки в IndexedDB...');
                await idb.set(audioRecId, audioBlob, 'MediaBuffer');
                await idb.set(`pending_audio_${projectId}`, audioRecId, 'ProjectDrafts');
              }
            } catch (e: any) { 
              addSystemLog(`Ошибка сохранения в IndexedDB: ${e.message || e}`);
              console.error('[Studio] IDB Storage error:', e); 
            }

            // Revoke any previous recording URL to prevent double-blob memory leak
            setLastRecordingUrl(prev => {
              if (prev && prev.startsWith('blob:')) {
                addSystemLog(`Отзыв старого Blob URL: ${prev}`);
                URL.revokeObjectURL(prev);
              }
              return null;
            });

            // Create new preview URL only AFTER releasing old one
            const url = URL.createObjectURL(blob);
            setLastRecordingUrl(url);
            addSystemLog(`Создана новая Blob-ссылка превью: ${url}`);
            
            // Start background conversion immediately (runs in background so UI is instant!)
            addSystemLog('Запуск фоновой MP4 нормализации видео...');
            startBackgroundMp4Conversion(blob);

            // Explicitly transition to branch screen
            setActiveTab('post_record_branch');
          };

          // Secondary audio-only recorder for OOM bypass on mobile (only for video mode)
          if (!isVoiceOnly) {
            try {
              let aMime = '';
              const MR = (globalThis as any).MediaRecorder;
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
          (globalThis as any).alert?.(`Ошибка старта записи: ${detail}. Попробуйте перезагрузить страницу.`);
          setIsReading(false);
        }
      }, 3000);
    } catch (err: any) {
      (globalThis as any).alert?.("Ошибка инициализации: " + (err.message || err.name));
    }
  };

  const stopVideoRecording = () => {
    setIsReading(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      const aRec = (globalThis as any)._audioRecorder as any;
      if (aRec && aRec.state !== 'inactive') aRec.stop();
      
      setIsRecordingVideo(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      
      // Release camera when record is done and we're entering review
      stopCamera();
    }
  };

  const startBackgroundMp4Conversion = async (videoBlob: Blob) => {
    if (isBackgroundConverting || backgroundMp4Url) return;
    setIsBackgroundConverting(true);
    console.log('[Studio] Background MP4 upload & normalization started...');
    try {
      // 1. Upload raw WebM to Supabase
      const uploadResult = await renderService.uploadMedia(projectId, videoBlob, 'video');
      if (!uploadResult || !uploadResult.publicUrl) {
        throw new Error('Failed to upload raw video to storage.');
      }
      
      const rawUrl = uploadResult.publicUrl;
      console.log('[Studio] Background raw video uploaded, starting H.264 normalization:', rawUrl);

      // 2. Call normalization API
      const normRes = await fetch('/api/studio/normalize-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: rawUrl, projectId })
      });
      
      if (normRes.ok) {
        const normData = await normRes.json();
        if (normData.publicUrl) {
          console.log('[Studio] Background H.264 MP4 normalization completed:', normData.publicUrl);
          setBackgroundMp4Url(normData.publicUrl);
          
          // Also sync to manifest so it's ready for Avatar Studio
          setManifest(prev => {
            if (!prev) return prev;
            const next = { ...prev, videoUrl: normData.publicUrl || '' };
            projectService.updateLatestVersionManifest(projectId, next);
            return next;
          });
        }
      }
    } catch (err) {
      console.error('[Studio] Background MP4 normalization failed:', err);
    } finally {
      setIsBackgroundConverting(false);
    }
  };

  const downloadBackgroundMp4 = async () => {
    const nav = globalThis.navigator as any;
    const isMobile = typeof globalThis.navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(nav.userAgent);

    if (backgroundMp4Url) {
      console.log('[Studio] Sharing or downloading background MP4:', backgroundMp4Url);
      
      // On mobile devices, share the CDN URL natively to prevent PWA reloads!
      if (isMobile && typeof globalThis.navigator !== 'undefined' && nav.share) {
        try {
          await nav.share({
            url: backgroundMp4Url,
            title: 'Viral Engine H.264 MP4',
            text: 'Here is your compatible H.264 MP4 video!'
          });
          return;
        } catch (err) {
          console.warn('[Studio] Web Share failed for normalized MP4:', err);
        }
      }

      // PC direct download (no target="_blank" to prevent opening new tabs)
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
    if (lastRecordingUrl && lastRecordingUrl.startsWith('blob:')) {
      try {
        (globalThis as any).alert?.("Запуск принудительного кодирования MP4. Пожалуйста, подождите...");
        const response = await fetch(lastRecordingUrl);
        const blob = await response.blob();
        await startBackgroundMp4Conversion(blob);
      } catch (err: any) {
        (globalThis as any).alert?.("Не удалось запустить кодирование: " + err.message);
      }
    } else if (lastRecordingUrl) {
      if (lastRecordingUrl.includes('.webm')) {
        (globalThis as any).alert?.("Запуск конвертации WebM в MP4 на сервере...");
        setIsBackgroundConverting(true);
        try {
          const normRes = await fetch('/api/studio/normalize-recording', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: lastRecordingUrl, projectId })
          });
          if (normRes.ok) {
            const normData = await normRes.json();
            if (normData.publicUrl) {
              setBackgroundMp4Url(normData.publicUrl);
              
              const nav = globalThis.navigator as any;
              if (isMobile && typeof globalThis.navigator !== 'undefined' && nav.share) {
                await nav.share({
                  url: normData.publicUrl,
                  title: 'Viral Engine H.264 MP4',
                });
              } else {
                const doc = (globalThis as any).document;
                if (doc) {
                  const a = doc.createElement('a');
                  a.href = normData.publicUrl;
                  a.download = `ViralEngine_H264_${Date.now()}.mp4`;
                  doc.body.appendChild(a);
                  a.click();
                  doc.body.removeChild(a);
                }
              }
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsBackgroundConverting(false);
        }
      } else {
        const nav = globalThis.navigator as any;
        if (isMobile && typeof globalThis.navigator !== 'undefined' && nav.share) {
          await nav.share({
            url: lastRecordingUrl,
            title: 'Viral Engine H.264 MP4',
          });
        } else {
          const doc = (globalThis as any).document;
          if (doc) {
            const a = doc.createElement('a');
            a.href = lastRecordingUrl;
            a.download = `ViralEngine_H264_${Date.now()}.mp4`;
            doc.body.appendChild(a);
            a.click();
            doc.body.removeChild(a);
          }
        }
      }
    }
  };

  const downloadRawVideo = async () => {
    if (!lastRecordingUrl) return;
    
    if (isSharing) {
      addSystemLog('Предотвращение повторного шеринга: операция уже выполняется.');
      return;
    }
    
    try {
      setIsSharing(true);
      addSystemLog('Запуск скачивания RAW видео...');
      const isTelegram = typeof (globalThis as any).window !== 'undefined' && !!(globalThis as any).Telegram?.WebApp;
      const nav = (globalThis as any).navigator;
      const isMobile = typeof (globalThis as any).navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(nav?.userAgent || '');
      const isiOS = typeof (globalThis as any).navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(nav?.userAgent || '');
      addSystemLog(`Параметры окружения: Мобильный=${isMobile}, iOS=${isiOS}, TelegramWebApp=${isTelegram}`);

      // 1. INSTANT LOCAL DESKTOP DOWNLOAD (0 seconds!)
      if (lastRecordingUrl.startsWith('blob:') && !isMobile && !isTelegram) {
        addSystemLog('Запущено локальное скачивание на ПК из Blob URL...');
        let url = lastRecordingUrl;
        
        // If the current blob URL is broken or invalid, make a fresh one from IDB!
        try {
          const check = await fetch(lastRecordingUrl, { method: 'HEAD' });
          if (!check.ok) throw new Error("Revoked");
        } catch (e) {
          addSystemLog('Упреждающий шаг: Blob URL аннулирован, восстанавливаем из IDB...');
          const cached = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
          if (cached instanceof Blob) {
            url = URL.createObjectURL(cached);
            addSystemLog(`Создана новая Blob-ссылка: ${url}`);
          }
        }

        addSystemLog('Эмуляция клика по ссылке для скачивания...');
        const doc = (globalThis as any).document;
        if (doc) {
          const a = doc.createElement('a');
          a.href = url;
          a.download = `ViralEngine_Raw_${Date.now()}.webm`;
          doc.body.appendChild(a);
          a.click();
          doc.body.removeChild(a);
        }
        addSystemLog('Запрос на скачивание успешно отправлен браузеру ПК.');
        return;
      }

      // 2. INSTANT LOCAL MOBILE WEB SHARE (0 seconds!)
      // iOS / Safari cannot share WebM container files directly via Web Share API (causes silent failures in AVFoundation).
      // Therefore, we bypass this local share block on iOS so it goes straight to server-side H.264 MP4 normalization.
      if (lastRecordingUrl.startsWith('blob:') && isMobile && !isiOS && typeof globalThis.navigator !== 'undefined' && nav.share) {
        try {
          addSystemLog('Попытка мгновенного шеринга файла через Web Share API...');
          let fileBlob = recordedBlobRef.current;
          
          // Fallback to IndexedDB (stable) instead of async fetch (unstable/revoked)
          if (!fileBlob) {
            addSystemLog('Упреждающий шаг: recordedBlobRef пуст, достаем оригинал из IndexedDB...');
            const cached = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
            if (cached instanceof Blob) {
              fileBlob = cached;
              recordedBlobRef.current = cached; // Cache back to ref
            }
          }
          
          if (!fileBlob) {
            throw new Error("Запись не найдена в памяти устройства (IndexedDB)");
          }
          
          // Force video/mp4 MIME type on mobile for 100% native mobile sharing compatibility
          addSystemLog(`Подготовка объекта File. Размер: ${(fileBlob.size / (1024 * 1024)).toFixed(2)} MB. Принудительный тип: video/mp4`);
          const file = new File([fileBlob], `ViralEngine_Raw_${Date.now()}.mp4`, { type: 'video/mp4' });
          
          if (nav.canShare && nav.canShare({ files: [file] })) {
            addSystemLog('Браузер подтвердил возможность передачи файла. Запуск Share Sheet...');
            await nav.share({
              files: [file],
              title: 'Viral Engine Video',
            });
            addSystemLog('Share Sheet успешно закрыт пользователем.');
            return; // Shared instantly!
          } else {
            addSystemLog('Браузер сообщил, что не может поделиться этим типом файла.');
          }
        } catch (shareErr: any) {
          addSystemLog(`Локальный Web Share отклонен или завершился ошибкой: ${shareErr.message || shareErr}`);
          console.warn('[Studio] Synchronous mobile share failed, falling back to server-side flow:', shareErr);
        }
      }

      let downloadUrl = lastRecordingUrl;

      // 3. FALLBACK: Upload to Supabase and run normalization (needed for Telegram WebApp or incompatible platforms)
      if (lastRecordingUrl.startsWith('blob:')) {
        try {
          addSystemLog('Локальный шеринг недоступен. Запуск резервного облачного пути...');
          (globalThis as any).alert?.("Подготовка видео для скачивания... Пожалуйста, подождите несколько секунд, пока файл загружается на сервер.");
          
          let blob = recordedBlobRef.current;
          if (!blob) {
            addSystemLog('Загрузка: Fetching from IndexedDB для резервного аплоада...');
            const cached = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
            if (cached instanceof Blob) {
              blob = cached;
            }
          }
          
          if (!blob) {
            throw new Error("Файл записи не найден в локальном кэше IndexedDB.");
          }
          
          addSystemLog(`Начало загрузки файла (${(blob.size / (1024 * 1024)).toFixed(2)} MB) на Supabase Storage...`);
          const uploadResult = await renderService.uploadMedia(projectId, blob, 'video');
          if (uploadResult && uploadResult.publicUrl) {
            downloadUrl = uploadResult.publicUrl;
            addSystemLog(`Загрузка завершена. URL в облаке: ${downloadUrl}`);
            
            // Sync back to the manifest
            setManifest(prev => {
              if (!prev) return prev;
              const next = { ...prev, videoUrl: downloadUrl || '' };
              projectService.updateLatestVersionManifest(projectId, next);
              return next;
            });
          } else {
            throw new Error("Не удалось сохранить файл на сервере.");
          }
        } catch (err: any) {
          addSystemLog(`Критическая ошибка подготовки видео в облаке: ${err.message}`);
          (globalThis as any).alert?.("Ошибка подготовки видео: " + err.message);
          return;
        }
      }

      // 4. Server-side H.264 (VP8/Opus) to universally compatible H.264 MP4 normalization (only for fallback path)
      if (downloadUrl && downloadUrl.includes('.webm')) {
        try {
          addSystemLog('Файл имеет тип .webm. Запуск транскодирования на сервере в H.264 MP4...');
          const normRes = await fetch('/api/studio/normalize-recording', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: downloadUrl, projectId })
          });
          
          if (normRes.ok) {
            const normData = await normRes.json();
            if (normData.publicUrl) {
              downloadUrl = normData.publicUrl;
              addSystemLog(`Транскодирование успешно! Новый MP4 URL: ${downloadUrl}`);
              
              // Sync back to the manifest
              setManifest(prev => {
                if (!prev) return prev;
                const next = { ...prev, videoUrl: downloadUrl || '' };
                projectService.updateLatestVersionManifest(projectId, next);
                return next;
              });
            }
          } else {
            addSystemLog('Сервер вернул ошибку транскодирования.');
          }
        } catch (normErr: any) {
          addSystemLog(`Ошибка транскодирования: ${normErr.message || normErr}`);
          console.warn('[Studio] H.264 normalization failed, falling back to raw video:', normErr);
        }
      }

      // 5. Telegram WebApp In-App WebView Sandbox Bypass
      const tgWebApp = typeof (globalThis as any).window !== 'undefined' && (globalThis as any).Telegram?.WebApp;
      if (tgWebApp && tgWebApp.openLink) {
        addSystemLog('Обнаружен Telegram WebApp. Открытие ссылки через openLink...');
        tgWebApp.openLink(downloadUrl);
        return;
      }

      // 6. Mobile Fallback path
      if (isMobile) {
        try {
          if (nav.share) {
            addSystemLog('Шеринг облачного файла на мобильном...');
            const response = await fetch(downloadUrl);
            const blob = await response.blob();
            const file = new File([blob], `ViralEngine_Take_${Date.now()}.mp4`, { type: 'video/mp4' });
            
            if (nav.canShare && nav.canShare({ files: [file] })) {
              await nav.share({
                files: [file],
                title: 'Viral Engine Video',
              });
              addSystemLog('Облачный файл успешно расшарен на мобильном.');
              return;
            }
          }
        } catch (shareErr: any) {
          addSystemLog(`Шеринг облачного файла не удался: ${shareErr.message || shareErr}`);
        }

        addSystemLog('Резервный мобильный переход: перенаправление на скачивание CDN...');
        if (typeof (globalThis as any).window !== 'undefined') {
          (globalThis as any).window.location.href = downloadUrl;
        }
        return;
      }

      // 7. Desktop PC Fallback path
      addSystemLog('Эмуляция клика по ссылке для облачного файла на ПК...');
      const doc2 = (globalThis as any).document;
      if (doc2) {
        const a = doc2.createElement('a');
        a.href = downloadUrl;
        a.download = `ViralEngine_Raw_${Date.now()}.mp4`;
        a.target = '_blank';
        doc2.body.appendChild(a);
        a.click();
        doc2.body.removeChild(a);
      }
      addSystemLog('Облачный файл успешно запрошен на ПК.');
    } finally {
      setIsSharing(false);
    }
  };

  const sendRawToTelegram = async () => {
    if (!lastRecordingUrl) return;
    addSystemLog('Начало отправки видео в Telegram...');
    
    let urlToShare = lastRecordingUrl;

    if (lastRecordingUrl.startsWith('blob:')) {
      try {
        addSystemLog('Видео еще не загружено на сервер. Начинаем фоновую загрузку в облако для Telegram...');
        (globalThis as any).alert?.("Загружаем видео в облако для отправки в Telegram... Пожалуйста, подождите несколько секунд.");
        
        let blob = recordedBlobRef.current;
        if (!blob) {
          addSystemLog('Восстановление blob из IndexedDB для загрузки...');
          const cached = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
          if (cached instanceof Blob) {
            blob = cached;
          }
        }
        
        if (!blob) {
          throw new Error("Запись не найдена в локальной памяти.");
        }
        
        const uploadResult = await renderService.uploadMedia(projectId, blob, 'video');
        if (uploadResult && uploadResult.publicUrl) {
          urlToShare = uploadResult.publicUrl;
          addSystemLog(`Видео загружено успешно. URL для шаринга: ${urlToShare}`);
        } else {
          throw new Error("Не удалось загрузить видео на сервер.");
        }
      } catch (err: any) {
        addSystemLog(`Ошибка загрузки для Telegram: ${err.message || err}`);
        (globalThis as any).alert?.("Не удалось подготовить файл для Telegram: " + err.message);
        return;
      }
    }

    // Official Telegram Share Link
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(urlToShare)}&text=${encodeURIComponent('Мое новое видео из Viral Engine!')}`;
    addSystemLog(`Открытие ссылки Telegram Share: ${tgUrl}`);
    
    if (typeof (globalThis as any).window !== 'undefined') {
      (globalThis as any).window.open(tgUrl, '_blank');
    }
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

  const handleFinalExport = async (broll?: any[], subs?: any[], explicitARollUrl?: string | null, subPos?: { x: number, y: number }, subSize?: number, subStyle?: number, showSubtitles?: boolean) => {
    setIsSaving(true);
    try {
      if (!manifest) {
        (globalThis as any).alert?.('Ошибка: манифест проекта не загружен. Попробуйте обновить страницу.');
        return;
      }

      // 🚀 Merge editor state into manifest
      const manifestAny = manifest as any;
      let resolvedARollUrl = 
        (explicitARollUrl && !explicitARollUrl.startsWith('blob:') ? explicitARollUrl : null) ||
        (manifestAny.videoUrl && !manifestAny.videoUrl.startsWith('blob:') ? manifestAny.videoUrl : null) ||
        explicitARollUrl ||
        manifestAny.videoUrl ||
        manifestAny.aRollUrl ||
        manifestAny.segments?.find((s: any) => s.type === 'user_recording' && s.assetUrl)?.assetUrl ||
        manifestAny.segments?.[0]?.assetUrl ||
        null;

      // --- UX FIX: Removed blocking blob URL upload before export ---
      // Local FFmpeg engine reads directly from IndexedDB anyway.
      // Cloud rendering assets (if needed) will be prepared by the delivery page or background sync.
      if (resolvedARollUrl && resolvedARollUrl.startsWith('blob:')) {
        if (backgroundMp4Url && !backgroundMp4Url.startsWith('blob:')) {
          resolvedARollUrl = backgroundMp4Url;
          addSystemLog(`Export: Found pre-normalized cloud MP4. Using: ${resolvedARollUrl}`);
        } else {
          addSystemLog('Export: aRollUrl is a local blob URL. Using local IDB pipeline for export.');
          // We intentionally do NOT upload the 30MB+ blob here to prevent 15+ second UI hangs.
        }
      }

      // Also skip blocking B-Roll uploads for the same reason
      let resolvedBroll = broll || [];
      if (resolvedBroll.length > 0) {
        addSystemLog('Export: B-Roll clips detected. Local IDB pipeline will be used.');
      }

      // Derivce final script text from montage subtitles (requested by user)
      const finalScriptText = subs?.map(s => s.text).join('\n\n') || 
                             manifest.segments?.map(s => s.scriptText).filter(Boolean).join('\n\n') || '';

      const updatedManifest = {
        ...manifest,
        aRollUrl: resolvedARollUrl,
        scriptText: finalScriptText, // Save for distribution
        brollClips: resolvedBroll,
        subtitleClips: subs || [],
        subtitlePos: subPos || (manifest as any).subtitlePos || { x: 0, y: 0 },
        subtitleSize: subSize || (manifest as any).subtitleSize || 25,
        subtitleStyle: subStyle !== undefined ? subStyle : (manifest as any).subtitleStyle || 0,
        showSubtitles: showSubtitles !== undefined ? showSubtitles : true,
        _log_subs_count: subs?.length || 0,
        segments: manifest.segments.map((s: any, i: number) => i === 0 ? { 
          ...s, 
          brollClips: resolvedBroll, 
          subtitleClips: subs || [],
          subtitleStyle: subStyle !== undefined ? subStyle : (manifest as any).subtitleStyle || 0,
          subtitleSize: subSize || (manifest as any).subtitleSize || 25,
          showSubtitles: showSubtitles !== undefined ? showSubtitles : true
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
      
      // тЬЕ Sync local draft for immediate recovery if user comes back
      try {
        const key = `viral_editor_draft_${projectId}`;
        const state = { 
          aRollUrl: resolvedARollUrl, 
          brollClips: broll || [], 
          subtitleClips: subs || [], 
          transcript: manifest.transcript || [], 
          stage: 'editing',
          subtitlePos: subPos || (manifest as any).subtitlePos || { x: 0, y: 0 },
          subtitleSize: subSize || (manifest as any).subtitleSize || 25,
          subtitleStyle: subStyle !== undefined ? subStyle : (manifest as any).subtitleStyle || 0,
          showSubtitles: showSubtitles !== undefined ? showSubtitles : true
        };
        await idb.set(key, state, 'ProjectDrafts');
        console.log('[Studio] Local draft synced for delivery session');
      } catch (e) { console.warn('[Studio] Local draft sync failed:', e); }

      // тЬЕ Invalidate render cache so delivery always re-renders with fresh subtitles
      try {
        if (savedVersion?.id) {
          await idb.delete(`final_render_v3_${projectId}_${savedVersion.id}`, 'MediaBuffer');
        }
        await idb.delete(`final_render_${projectId}`, 'MediaBuffer');
        console.log('[Studio] Render cache invalidated — delivery will re-render with subtitles');
      } catch (e) { /* ignore */ }

      // тЬЕ Final Redirect
      router.push(`/app/projects/new/delivery?projectId=${projectId}`);

    } catch (err: any) {
      console.error('Export failed:', err);
      (globalThis as any).alert?.(`Не удалось сохранить проект: ${err.message}`);
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
            setActiveTab={handleTabChange}
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
            setUseCustomScript={(use) => {
              setUseCustomScript(use);
              setManifest(prev => prev ? { ...prev, useCustomScript: use } : prev);
            }}
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-4 left-4 z-[200] flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md"
              >
                <RefreshCw size={12} className="animate-spin text-purple-400" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Syncing...</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Stage Area */}
          <div className="flex-1 relative overflow-hidden">
            {isPending && (
              <div className="absolute inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                <RefreshCw size={24} className="animate-spin text-purple-500 opacity-50" />
              </div>
            )}

            {activeTab === 'concept' && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-white/20">
                <RefreshCw size={40} className="animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Switching to Idea Lab...</p>
              </div>
            )}
            
            {activeTab === 'branch' && (
              <ProductionBranch
                onSelect={(type) => {
                  startTransition(() => {
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
                  });
                }}
                onBack={() => handleTabChange('concept')}
              />
            )}


            {activeTab === 'teleprompter' && (
                <TeleprompterView 
                  cameraStream={cameraStream}
                  cameraError={cameraError}
                  videoPreviewRef={videoPreviewRef}
                  isVideoMirrored={isVideoMirrored}
                  prompterWidth={prompterWidth}
                  isReading={isReading}
                  countdown={countdown}
                  prompterRef={prompterRef}
                  isMirrored={isMirrored}
                  useCustomScript={useCustomScript}
                  manifest={manifest}
                  customScript={customScript}
                  textSize={textSize}
                  scriptOpacity={scriptOpacity}
                  scriptColor={scriptColor}
                  onScriptUpdate={async (text) => {
                    // 1. Update local states immediately
                    setCustomScript(text);
                    setUseCustomScript(true);
                    
                    // 2. Functional update for manifest to avoid closure traps
                    setManifest(prev => {
                      if (!prev) return prev;
                      const next = { 
                        ...prev, 
                        customScript: text,
                        useCustomScript: true 
                      };
                      
                      // 3. Immediate Cloud Sync for Script Edits (Skip Debounce)
                      if (projectId) {
                        projectService.updateLatestVersionManifest(projectId, next).then(() => {
                          console.log('[Studio] Manual Script Edit Saved');
                        });
                      }
                      
                      return next;
                    });
                  }}
                  onColorChange={(color) => setScriptColor(color)}
                  onBack={() => handleTabChange('branch')}
                  onToggleRecording={isRecordingVideo ? stopVideoRecording : startVideoRecording}
                  onFlipCamera={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                  onTextSizeChange={(size) => setTextSize(size)}
                  onOpacityChange={(op) => setScriptOpacity(op)}
                  scrollSpeed={scrollSpeed}
                  onSpeedChange={(s) => setScrollSpeed(s)}
                  isRecordingVideo={isRecordingVideo}
                  isVoiceOnly={isVoiceOnly}
                  onFinish={stopVideoRecording}
                  recordingTime={recordingTime}
                  t={t}
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

            {activeTab === 'fusion' && (
              <FusionView 
                status={fusionStatus}
                progress={fusionProgress}
                segmentsCount={fusionSegments.length || 1}
                completedSegments={fusionCompletedSegments}
                error={fusionError || undefined}
              />
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
                    // 🚀 OOM PREVENTION: Revoke the in-memory preview blob URL before
                    // mounting VideoEditor (FFmpeg). This frees the raw video from RAM.
                    // VideoEditor will use the Supabase-uploaded URL for playback/processing.
                    setLastRecordingUrl(prev => {
                      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                      return prev; // keep the value so VideoEditor can render its upload-flow
                    });
                    // Give GC 500ms to collect before mounting FFmpeg.wasm
                    setTimeout(() => handleTabChange('assembly'), 500);
                  }}
                  className="w-full max-w-xs py-5 bg-purple-500 rounded-[2rem] text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-purple-500/30 active:scale-95 transition-all"
                >
                  Открыть монтажку →
                </button>
                <button
                  onClick={() => {
                    setShowAssemblyLauncher(false);
                    handleTabChange('teleprompter');
                  }}
                  className="text-white/20 text-xs uppercase tracking-widest font-bold"
                >
                  Записать ещё раз
                </button>
              </motion.div>
            )}

            {activeTab === 'post_record_branch' && lastRecordingUrl && (
              <PostRecordBranch 
                videoUrl={lastRecordingUrl}
                recordedSize={recordedSize}
                onSelect={(option) => {
                  if (option === 'pure') {
                    // Save videoUrl to manifest for persistence
                    setManifest(prev => {
                      if (!prev) return prev;
                      const next = { ...prev, videoUrl: lastRecordingUrl || '' };
                      projectService.updateLatestVersionManifest(projectId, next);
                      return next;
                    });
                    setShowAssemblyLauncher(true);
                  }
                  else if (option === 'animate') handleTabChange('avatar_hub');
                }}
                onRetake={() => {
                   handleTabChange('teleprompter');
                   setTimeout(initCamera, 100);
                }}
                onDownload={downloadRawVideo}
                onDownloadMp4={downloadBackgroundMp4}
                isMp4Converting={isBackgroundConverting}
                mp4Url={backgroundMp4Url}
                onTelegram={sendRawToTelegram}
                t={t}
              />
            )}

            {activeTab === 'timeline_lab' && lastRecordingUrl && (
              <TimelineLab 
                videoUrl={lastRecordingUrl}
                projectId={projectId}
                initialMasterAvatar={selectedAvatarPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2'}
                onGenerate={handleTimelineGeneration}
                onBack={() => handleTabChange('post_record_branch')}
                onDownload={downloadRawVideo}
              />
            )}

            {activeTab === 'assembly' && !showFaceless && (
              <VideoEditor 
                projectId={projectId}
                aRollUrl={manifest?.videoUrl || lastRecordingUrl || ''}
                onBack={async () => {
                  // 🚀 OOM RECOVERY: If the blob URL was revoked to save memory, 
                  // we must restore it from IDB before returning to post_record_branch
                  // to prevent "destroying the source video" (black screen).
                  if (lastRecordingUrl && lastRecordingUrl.startsWith('blob:')) {
                    try {
                      const blob = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
                      if (blob instanceof Blob) {
                        const restoredUrl = URL.createObjectURL(blob);
                        setLastRecordingUrl(restoredUrl);
                      }
                    } catch (e) {
                      console.warn('[Studio] Failed to restore blob for back navigation', e);
                    }
                  }

                  if (fusedVideoUrl && lastRecordingUrl === fusedVideoUrl) {
                    handleTabChange('fusion_preview');
                  } else {
                    handleTabChange('branch');
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
                  router.push(`/app/projects/new/script?projectId=${projectId}`);
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
                      ...prev,
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

            {activeTab === 'avatar_hub' && (
              <AvatarHub 
                projectId={projectId}
                onSelect={(config) => {
                  setSelectedAvatarPhoto(config.photoUrl);
                  handleTabChange('timeline_lab');
                }}
                onBack={() => handleTabChange('post_record_branch')}
              />
            )}

            {activeTab === 'fusion_preview' && fusedVideoUrl && (
              <FusionPreview 
                videoUrl={fusedVideoUrl}
                onRegenerate={() => handleTabChange('timeline_lab')}
                onExportToMontage={() => {
                  setLastRecordingUrl(fusedVideoUrl);
                  handleTabChange('assembly');
                }}
              />
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

      {/* Real-time Diagnostics Log Panel for Mobile Devices */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
        <button
          onClick={() => setShowLogConsole(prev => !prev)}
          className="px-4 py-2.5 rounded-full bg-[#8b5cf6]/90 hover:bg-[#7c3aed] text-white font-black uppercase tracking-widest text-[9px] border border-white/10 backdrop-blur-md shadow-2xl flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          ЛОГИ ({systemLogs.length})
        </button>

        <AnimatePresence>
          {showLogConsole && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="w-[calc(100vw-2rem)] sm:w-[400px] h-[300px] bg-black/95 border border-white/10 rounded-3xl backdrop-blur-2xl shadow-2xl p-4 flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Внутренний Лог Системы</span>
                <button
                  onClick={() => setSystemLogs([])}
                  className="text-[8px] font-black uppercase tracking-widest text-red-400 hover:text-red-300"
                >
                  Очистить
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[9px] text-white/70 select-text custom-scrollbar">
                {systemLogs.length === 0 ? (
                  <p className="text-white/20 italic text-center pt-24">Ленты логов пусты. Сделайте запись для начала...</p>
                ) : (
                  systemLogs.map((log, idx) => (
                    <div key={idx} className="border-l-2 border-purple-500 pl-2 leading-relaxed text-left">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
