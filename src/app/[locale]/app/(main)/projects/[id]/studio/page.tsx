'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { PremiumLimitModal } from '@/components/ui/PremiumLimitModal';
import { 
  Plus, CheckCircle2, Lock, Scissors, RefreshCw, Wand2, Brain, Monitor, FileVideo, Download, X, Layout, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { projectService, Project } from '@/lib/services/projectService';
import { renderService } from '@/lib/services/renderService';
import { profileService, Profile } from '@/lib/services/profileService';
import { ProductionManifest, AnimationStyle, AvatarProvider } from '@/lib/types/studio';
import { createInitialManifest } from '@/lib/studio-utils';
import { v4 as uuidv4 } from 'uuid';
import { idb } from '@/lib/idb';

// Atomic Components
import { StudioSidebar } from './_components/StudioSidebar';
import { useHardwareRecorder } from '@/hooks/useHardwareRecorder';
import { useStudioExport } from './_hooks/useStudioExport';
import { useTimelineSynthesis } from './_hooks/useTimelineSynthesis';
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
const FacelessStudio = dynamic(() => import('@/components/studio/FacelessStudio'), { ssr: false, loading: Spinner });
const AvatarHub = dynamic(() => import('@/components/production/AvatarHub'), { ssr: false, loading: Spinner });
const FusionPreview = dynamic(() => import('./_components/FusionPreview').then(m => m.FusionPreview), { ssr: false, loading: Spinner });
const HeyGenAvatarFlow = dynamic(() => import('@/components/studio/HeyGenAvatarFlow'), { ssr: false, loading: Spinner });
const ScriptEditorView = dynamic(() => import('./_components/ScriptEditorView').then(m => m.ScriptEditorView), { ssr: false, loading: Spinner });

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
  const [activeTab, setActiveTab] = useState<'strategy' | 'teleprompter' | 'branch' | 'script_editor' | 'assembly' | 'knowledge' | 'assets' | 'concept' | 'post_record_branch' | 'timeline_lab' | 'fusion' | 'avatar_hub' | 'fusion_preview' | 'heygen_avatar'>(initialTab);
  
  const handleTabChange = useCallback((tab: any) => {
    setActiveTab(tab);
  }, []);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  
  // Teleprompter States
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg'>('sm');
  const [isMirrored, setIsMirrored] = useState(false);
  const [prompterWidth, setPrompterWidth] = useState(600);
  const [customScript, setCustomScript] = useState<string>('');
  const [useCustomScript, setUseCustomScript] = useState<boolean>(false);
  const [lastRecordingUrl, setLastRecordingUrl] = useState<string | null>(null);
  const [recordedSize, setRecordedSize] = useState<number | null>(null);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [showLogConsole, setShowLogConsole] = useState(false);

  const addSystemLog = useCallback((msg: string) => {
    console.log(`[STUDIO-LOG] ${msg}`);
    const time = new Date().toLocaleTimeString();
    setSystemLogs(prev => [...prev.slice(-30), `[${time}] ${msg}`]);
  }, []);

  const [showRecordingReview, setShowRecordingReview] = useState(false);
  const [scriptOpacity, setScriptOpacity] = useState(0.85);
  const [scriptColor, setScriptColor] = useState('#ffffff');
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [showFaceless, setShowFaceless] = useState(false);
  const [isVoiceOnly, setIsVoiceOnly] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [availableAvatars, setAvailableAvatars] = useState<any[]>([]);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isAssemblingAvatar, setIsAssemblingAvatar] = useState(false);
  const [selectedAvatarPhoto, setSelectedAvatarPhoto] = useState<string | null>(null);
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);

  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>(() => {
    const initialKey = initialTab === 'assembly' 
      ? (showFaceless ? 'assembly_faceless' : 'assembly_editor')
      : initialTab;
    return { [initialKey]: true };
  });

  useEffect(() => {
    const key = activeTab === 'assembly'
      ? (showFaceless ? 'assembly_faceless' : 'assembly_editor')
      : activeTab;
    setVisitedTabs(prev => prev[key] ? prev : { ...prev, [key]: true });
  }, [activeTab, showFaceless]);

  const prompterRef = useRef<HTMLDivElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const scrollPosRef = useRef(0);
  const recordedBlobRef = useRef<Blob | null>(null);

  // Hardware Recorder Hook Integration
  const {
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
  } = useHardwareRecorder({
    projectId,
    isVoiceOnly,
    activeTab,
    setActiveTab: handleTabChange,
    setManifest,
    addSystemLog,
    setLastRecordingUrl,
    setRecordedSize,
    videoPreviewRef,
    recordedBlobRef,
    isLoading
  });

  // Studio Export Hook Integration
  const {
    isSaving,
    setIsSaving,
    isSharing,
    downloadRawVideo,
    sendRawToTelegram,
    handleFinalExport
  } = useStudioExport({
    projectId,
    locale,
    currentVersionId,
    manifest,
    setManifest,
    lastRecordingUrl,
    setLastRecordingUrl,
    recordedBlobRef,
    recordedSize,
    setRecordedSize,
    backgroundMp4Url,
    addSystemLog
  });

  // Timeline Fusion Synthesis Integration
  const {
    fusionSegments,
    setFusionSegments,
    fusedVideoUrl,
    setFusedVideoUrl,
    fusionStatus,
    setFusionStatus,
    fusionProgress,
    setFusionProgress,
    fusionCompletedSegments,
    fusionError,
    setFusionError,
    handleTimelineGeneration
  } = useTimelineSynthesis({
    projectId,
    manifest,
    setManifest,
    lastRecordingUrl,
    setLastRecordingUrl,
    handleTabChange
  });

  // Auto-load backgroundMp4Url if already present in manifest
  useEffect(() => {
    const videoUrl = manifest?.videoUrl || (manifest as any)?.aRollUrl;
    if (videoUrl && !videoUrl.startsWith('blob:') && !videoUrl.includes('.webm')) {
      setBackgroundMp4Url(videoUrl);
    }
  }, [manifest, setBackgroundMp4Url]);

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
            const loadedManifest = latestVersion.script_data as any;
            if (loadedManifest.segments) {
              setManifest(loadedManifest);
              if (loadedManifest.customScript) setCustomScript(loadedManifest.customScript);
              if (loadedManifest.useCustomScript !== undefined) setUseCustomScript(loadedManifest.useCustomScript);
            } else {
              // It is raw script data! Convert it to a manifest on the fly.
              const activeScript = loadedManifest.evergreen || loadedManifest;
              setManifest(createInitialManifest(projectId, latestVersion.id, activeScript));
            }
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

      } catch (err) {
        console.error('Failed to load studio data:', err);
      } finally {
        setIsLoading(false);
        clearTimeout(safetyTimeout);
      }
    }
    loadData();
  }, [projectId]);



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



  // --- RENDER ---
  if (isLoading) {
    return (
      <div className="h-[100dvh] w-screen bg-[#050508] text-white flex overflow-hidden font-sans select-none">
        {/* Left Sidebar Skeleton */}
        <div className="w-20 lg:w-64 bg-[#0a0a0f] border-r border-white/5 flex flex-col items-center lg:items-stretch p-4 lg:p-6 space-y-8 shrink-0">
          {/* Logo/Brand pulsing slot */}
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Brain size={18} className="text-purple-400/55" />
            </div>
            <div className="hidden lg:block space-y-1.5">
              <div className="h-3 w-24 bg-white/10 rounded-md" />
              <div className="h-2 w-12 bg-white/5 rounded-md" />
            </div>
          </div>

          {/* Navigation Slots */}
          <div className="flex-1 space-y-4 w-full pt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.01] border border-white/[0.02] animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-5 h-5 rounded-lg bg-white/5 shrink-0" />
                <div className="hidden lg:block h-2.5 bg-white/10 rounded-md w-2/3" />
              </div>
            ))}
          </div>

          {/* Bottom Profile Slot */}
          <div className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-white/5 shrink-0" />
            <div className="hidden lg:block space-y-1.5 flex-1">
              <div className="h-2 w-16 bg-white/10 rounded-md" />
              <div className="h-1.5 w-10 bg-white/5 rounded-md" />
            </div>
          </div>
        </div>

        {/* Main Content Area Skeleton */}
        <div className="flex-1 flex flex-col overflow-hidden bg-black relative">
          {/* Top Header Row */}
          <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between shrink-0 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-4 w-32 bg-white/10 rounded-md" />
              <span className="text-white/10">/</span>
              <div className="h-3 w-16 bg-white/5 rounded-md" />
            </div>
            <div className="w-20 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20" />
          </div>

          {/* Dynamic Main Workspace Simulation */}
          <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
            {/* Sleek Gradient Glowing Backdrop */}
            <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-purple-600/10 to-pink-600/10 blur-[100px] animate-pulse" />

            {/* Central Premium Loader */}
            <div className="relative z-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.1)] relative">
                <RefreshCw size={24} className="animate-spin text-purple-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50 animate-pulse">Инициализация Студии</h3>
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-400/60">Синхронизация данных проекта...</p>
              </div>
            </div>
          </div>

          {/* Simulated Timeline Track Bar */}
          <div className="h-44 bg-[#0a0a0f]/40 border-t border-white/5 p-6 flex flex-col gap-4 shrink-0">
            <div className="flex justify-between items-center">
              <div className="h-3 w-28 bg-white/10 rounded-md animate-pulse" />
              <div className="h-3 w-16 bg-white/5 rounded-md animate-pulse" />
            </div>
            <div className="flex gap-4 overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 flex-1 rounded-2xl bg-white/[0.01] border border-white/[0.02] flex items-center justify-center animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
                  <div className="w-8 h-8 rounded-lg bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedSegment = manifest?.segments.find(s => s.id === selectedSegmentId);

  return (
    <div className="h-[100dvh] w-screen bg-black text-white overflow-hidden font-sans relative">
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
            
            {visitedTabs['script_editor'] && (
              <div className={activeTab === 'script_editor' ? 'h-full w-full' : 'hidden'}>
                <ScriptEditorView
                  scriptText={customScript || manifest?.customScript || manifest?.segments?.map((s: any) => s.scriptText || s.text || '').filter(Boolean).join('\n\n') || ''}
                  onSave={async (text) => {
                    setCustomScript(text);
                    setUseCustomScript(true);
                    setManifest(prev => {
                      if (!prev) return prev;
                      const next = {
                        ...prev,
                        customScript: text,
                        useCustomScript: true
                      };
                      if (projectId) {
                        projectService.updateLatestVersionManifest(projectId, next);
                      }
                      return next;
                    });
                  }}
                  onNext={() => handleTabChange('branch')}
                  onBack={() => handleTabChange('concept')}
                  locale={locale}
                />
              </div>
            )}

            {visitedTabs['branch'] && (
              <div className={activeTab === 'branch' ? 'h-full w-full' : 'hidden'}>
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
                    } else if (type === 'heygen-avatar') {
                      setShowFaceless(false);
                      setIsVoiceOnly(false);
                      handleTabChange('heygen_avatar');
                    }
                  }}
                  onBack={() => handleTabChange('concept')}
                />
              </div>
            )}

            {/* HeyGen Avatar Flow */}
            {visitedTabs['heygen_avatar'] && (
              <div className={activeTab === 'heygen_avatar' ? 'h-full w-full' : 'hidden'}>
                <HeyGenAvatarFlow
                  manifest={manifest}
                  projectId={projectId}
                  onBack={() => handleTabChange('branch')}
                  onSendToMontage={(videoUrl) => {
                    // Save as A-Roll in manifest
                    setManifest(prev => prev ? { ...prev, aRollUrl: videoUrl, videoUrl } : prev);
                    setLastRecordingUrl(videoUrl);
                    addSystemLog(`[HeyGen] A-Roll сохранён: ${videoUrl}`);
                    // Go to video editor
                    handleTabChange('assembly');
                  }}
                />
              </div>
            )}

            {visitedTabs['teleprompter'] && (
              <div className={activeTab === 'teleprompter' ? 'h-full w-full' : 'hidden'}>
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
                  audioDevices={audioDevices}
                  selectedAudioDeviceId={selectedAudioDeviceId}
                  onAudioDeviceChange={(id) => {
                    setSelectedAudioDeviceId(id);
                    stopCamera();
                    setTimeout(() => initCamera(), 100);
                  }}
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
              </div>
            )}

            {visitedTabs['fusion'] && (
              <div className={activeTab === 'fusion' ? 'h-full w-full' : 'hidden'}>
                <FusionView 
                  status={fusionStatus}
                  progress={fusionProgress}
                  segmentsCount={fusionSegments.length || 1}
                  completedSegments={fusionCompletedSegments}
                  error={fusionError || undefined}
                />
              </div>
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

            {visitedTabs['post_record_branch'] && lastRecordingUrl && (
              <div className={activeTab === 'post_record_branch' ? 'h-full w-full' : 'hidden'}>
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
              </div>
            )}

            {visitedTabs['timeline_lab'] && lastRecordingUrl && (
              <div className={activeTab === 'timeline_lab' ? 'h-full w-full' : 'hidden'}>
                <TimelineLab 
                  videoUrl={lastRecordingUrl}
                  projectId={projectId}
                  initialMasterAvatar={selectedAvatarPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2'}
                  onGenerate={handleTimelineGeneration}
                  onBack={() => handleTabChange('post_record_branch')}
                  onDownload={downloadRawVideo}
                />
              </div>
            )}

            {visitedTabs['assembly_editor'] && (
              <div className={activeTab === 'assembly' && !showFaceless ? 'h-full w-full' : 'hidden'}>
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
              </div>
            )}


            {visitedTabs['assembly_faceless'] && (
              <div className={activeTab === 'assembly' && showFaceless ? 'h-full w-full' : 'hidden'}>
                <FacelessStudio
                  projectId={projectId}
                  manifest={manifest}
                  visualStyle={currentProfile?.visual_style || 'startup_valley'}
                  onBack={() => setShowFaceless(false)}

                  onJumpToConcept={() => {
                    setShowFaceless(false);
                    router.push(`/app/projects/new/script?projectId=${projectId}`);
                  }}
                  onComplete={(videoBlob, transcriptData, scenesList) => {
                    const localUrl = URL.createObjectURL(videoBlob);
                    
                    // Persist generated faceless video to IndexedDB so it's loaded in the montage editor
                    idb.set(`video_file_${projectId}`, videoBlob, 'MediaBuffer').catch(e => {
                      console.error('[Studio] Failed to save faceless video to IndexedDB:', e);
                    });
                    
                    setLastRecordingUrl(localUrl);
                    
                    setManifest(prev => {
                      if (!prev) return prev;
                      
                      const updatedSegments = prev.segments?.map((s, i) => {
                        const scene = scenesList?.[i];
                        return {
                          ...s,
                          assetUrl: scene?.imageUrl || s.assetUrl,
                          prompt: scene?.imagePrompt || s.prompt,
                          scriptText: scene?.text || s.scriptText,
                          status: (scene?.imageUrl ? 'completed' : s.status) as any,
                        };
                      }) || prev.segments;

                      return {
                        ...prev,
                        videoUrl: localUrl,
                        faceless_imported: true,
                        transcript: transcriptData, // Use scene-based timings as initial transcript
                        segments: updatedSegments,
                      };
                    });
                    setShowFaceless(false);
                    renderService.uploadMedia(projectId, videoBlob, 'video').then(res => {
                      if (res.publicUrl) {
                        setManifest(prev => {
                          if (!prev) return prev;
                          
                          const updatedSegments = prev.segments?.map((s, i) => {
                            const scene = scenesList?.[i];
                            return {
                              ...s,
                              assetUrl: scene?.imageUrl || s.assetUrl,
                              prompt: scene?.imagePrompt || s.prompt,
                              scriptText: scene?.text || s.scriptText,
                              status: (scene?.imageUrl ? 'completed' : s.status) as any,
                            };
                          }) || prev.segments;

                          const next = {
                            ...prev,
                            videoUrl: res.publicUrl,
                            faceless_imported: true,
                            segments: updatedSegments,
                          };
                          projectService.updateLatestVersionManifest(projectId, next);
                          return next;
                        });
                      }
                    });
                  }}
                />
              </div>
            )}


            {visitedTabs['assets'] && (
              <div className={activeTab === 'assets' ? 'h-full w-full' : 'hidden'}>
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
              </div>
            )}


            {visitedTabs['avatar_hub'] && (
              <div className={activeTab === 'avatar_hub' ? 'h-full w-full' : 'hidden'}>
                <AvatarHub 
                  projectId={projectId}
                  currentProfile={currentProfile}
                  onSelect={(config) => {
                    setSelectedAvatarPhoto(config.photoUrl);
                    handleTabChange('timeline_lab');
                  }}
                  onBack={() => handleTabChange('post_record_branch')}
                />
              </div>
            )}


            {visitedTabs['fusion_preview'] && fusedVideoUrl && (
              <div className={activeTab === 'fusion_preview' ? 'h-full w-full' : 'hidden'}>
                <FusionPreview 
                  videoUrl={fusedVideoUrl}
                  onRegenerate={() => handleTabChange('timeline_lab')}
                  onExportToMontage={() => {
                    setLastRecordingUrl(fusedVideoUrl);
                    handleTabChange('assembly');
                  }}
                />
              </div>
            )}


            {visitedTabs['knowledge'] && (
              <div className={activeTab === 'knowledge' ? 'h-full w-full' : 'hidden'}>
                <KnowledgeLab profile={currentProfile!} onProfileUpdate={setCurrentProfile} />
              </div>
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
