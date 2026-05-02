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

// Atomic Components
import { StudioSidebar } from './_components/StudioSidebar';
import { TeleprompterView } from './_components/TeleprompterView';
import { StoryboardGrid } from './_components/StoryboardGrid';
import { RecordingReview } from './_components/RecordingReview';
import { SourcePicker } from './_components/SourcePicker';
import { VideoEditor } from './_components/VideoEditor';
import { ProductionBranch } from './_components/ProductionBranch';
import DistributionFactory from './_components/DistributionFactory';

// Global Shared Components
import StudioTimeline from '@/components/studio/StudioTimeline';
import KnowledgeLab from '@/components/studio/KnowledgeLab';
import { StrategistChat } from '@/components/studio/StrategistChat';
import FacelessStudio from '@/components/studio/FacelessStudio';

export default function StudioPage() {
  useEffect(() => {
    const handleError = (e: any) => {
      console.error('[Global Error]', e);
      const msg = e.message || 'Unknown Error';
      localStorage.setItem('viral_last_crash', JSON.stringify({
        msg,
        stack: e.error?.stack,
        time: new Date().toISOString()
      }));
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const t = useTranslations('studio');
  const router = useRouter();
  const { id: projectId, locale } = useParams() as { id: string; locale: string };

  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') as any || 'concept';

  const [isLoading, setIsLoading] = useState(true);
  const [studioCrashError, setStudioCrashError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [manifest, setManifest] = useState<ProductionManifest | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'strategy' | 'teleprompter' | 'branch'| 'assembly' | 'knowledge' | 'assets' | 'concept'>(initialTab);
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

  const prompterRef = useRef<HTMLDivElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollPosRef = useRef(0);

  const [showLimitModal, setShowLimitModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: '', desc: '', type: 'info' as any });


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
          router.replace(newUrl, { scroll: false });
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

  //  // ── AUTOSAVE & RECOVERY ──────────────────────────────────────────────
  useEffect(() => {
    if (manifest && projectId) {
      localStorage.setItem(`viral_draft_${projectId}`, JSON.stringify({
        manifest,
        updatedAt: new Date().toISOString()
      }));
    }
  }, [manifest, projectId]);

  // Combined Initial Data Load
  useEffect(() => {
    async function loadData() {
      if (!projectId) return;
      setIsLoading(true);
      try {
        const [profileData, projectData, latestVersion] = await Promise.all([
          profileService.getOrCreateProfile(),
          projectService.getProject(projectId),
          projectService.getLatestVersion(projectId)
        ]);

        setCurrentProfile(profileData);
        setProject(projectData);

        // Check for Local Draft first (Safety Buffer)
        const cached = localStorage.getItem(`viral_draft_${projectId}`);
        if (cached) {
          const { manifest: cachedManifest, updatedAt } = JSON.parse(cached);
          setManifest(cachedManifest);
          if (latestVersion) {
            setCurrentVersionId(latestVersion.id);
          }
          console.log('[Studio] Recovered manifest from local storage', updatedAt);
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

      } catch (err) {
        console.error('Failed to load studio data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [projectId]);

  // Hardware Setup
  const initCamera = async () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      
      const resMap = {
        '360p': { width: 640, height: 360 },
        '720p': { width: 1280, height: 720 },
        '1080p': { width: 1920, height: 1080 },
        '4k': { width: 3840, height: 2160 }
      };
      
      const constraints = { 
        video: { 
          deviceId: selectedVideoDeviceId ? { exact: selectedVideoDeviceId } : undefined,
          facingMode: selectedVideoDeviceId ? undefined : facingMode,
          ...resMap[videoResolution]
        },
        audio: {
          deviceId: selectedAudioDeviceId ? { exact: selectedAudioDeviceId } : undefined
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access failed:', err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Recording Logic
  useEffect(() => {
    if (activeTab === 'teleprompter' && !cameraStream) {
      initCamera();
    }
    
    // Auto-stop camera when leaving the teleprompter tab
    return () => {
      if (activeTab === 'teleprompter') {
         // This runs when activeTab is about to change AWAY from teleprompter
         // stopCamera(); // Wait, cleanup runs on next effect or unmount.
      }
    };
  }, [activeTab, facingMode]);

  // Dedicated cleanup for camera tracks when switching tabs
  useEffect(() => {
    if (activeTab !== 'teleprompter' && cameraStream) {
        stopCamera();
    }
  }, [activeTab, cameraStream]);

  const startVideoRecording = async () => {
    // 1. Force Camera Init if not active
    if (!cameraStream) {
      await initCamera();
    }

    // 2. Start Production Countdown
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

    // 3. Delayed 'Action!' - Sync Recording & Scrolling
    setTimeout(async () => {
      if (!cameraStream) return;
      
      setIsReading(true);
      const localChunks: Blob[] = [];
      const recorder = new MediaRecorder(cameraStream, { 
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm' 
      });
      
      recorder.ondataavailable = (e) => { if (e.data.size > 0) localChunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(localChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setLastRecordingUrl(url);
        setShowRecordingReview(true);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecordingVideo(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    }, 3000);
  };

  const stopVideoRecording = () => {
    setIsReading(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
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

      // 🔥 Merge editor state into manifest
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
        segments: manifest.segments.map((s: any, i: number) => i === 0 ? { 
          ...s, 
          brollClips: broll || [], 
          subtitleClips: subs || [] 
        } : s)
      };

      // ✅ Trigger background distribution asset generation
      fetch('/api/ai/distribution-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptText: finalScriptText, projectId, locale, background: true })
      }).catch(e => console.error('[Studio] Prefetch failed:', e));

      // ✅ Background Save manifest — wait for it to prevent race condition on Delivery page
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
      
      // Note: Draft is preserved for safety in case of render failure

      // ✅ Final Redirect
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
      {/* 🚀 Pro Studio Mainframe - Full Screen Immersion */}
      <div className="flex h-full w-full overflow-hidden">
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

        <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden bg-[#050508]">
          
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
                  locale={locale}
                />

                {manifest && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[110]"
                  >
                    <button
                      onClick={() => ((t: any) => { console.log('[Studio] Switching to tab:', t); setActiveTab(t); })('branch')}
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
                    ((t: any) => { console.log('[Studio] Switching to tab:', t); setActiveTab(t); })('teleprompter');
                  } else if (type === 'faceless') {
                    setShowFaceless(true);
                    setTimeout(() => ((t: any) => { console.log('[Studio] Switching to tab:', t); setActiveTab(t); })('assembly'), 250);
                  }
                }}
                onBack={() => ((t: any) => { console.log('[Studio] Switching to tab:', t); setActiveTab(t); })('concept')}
              />
            )}

            {activeTab === 'teleprompter' && (
              <div className="w-full h-full relative">
                <TeleprompterView 
                   cameraStream={cameraStream}
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
                   onTextSizeChange={setTextSize}
                   scriptColor={scriptColor}
                   onColorChange={setScriptColor}
                   scriptOpacity={scriptOpacity}
                   onOpacityChange={setScriptOpacity}
                   scrollSpeed={scrollSpeed}
                   onSpeedChange={setScrollSpeed}
                   isRecordingVideo={isRecordingVideo}
                    recordingTime={recordingTime}
                    onBack={() => ((t: any) => { console.log('[Studio] Switching to tab:', t); setActiveTab(t); })('branch')}
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
                        setTimeout(() => ((t: any) => { console.log('[Studio] Switching to tab:', t); setActiveTab(t); })('assembly'), 250);
                      }
                   }}
                   t={t}
                />
              </div>
            )}

            {/* Global Recording Review Overlay */}
            <AnimatePresence>
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
                    handleAcceptRecording={async (url) => {
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
                         // Persist to DB so refresh doesn't lose it
                         await projectService.updateLatestVersionManifest(projectId, newManifest);
                      }
                      // 1. Give Android a moment to stop camera and clear memory
                      setTimeout(() => {
                        setShowRecordingReview(false);
                        setTimeout(() => ((t: any) => { console.log('[Studio] Switching to tab:', t); setActiveTab(t); })('assembly'), 250);
                      }, 100);
                    }}
                    manifest={manifest}
                    selectedSegmentId={selectedSegmentId}
                />
              )}
            </AnimatePresence>

            {activeTab === 'assembly' && !showFaceless && (
              <VideoEditor
                manifest={manifest}
                updateSegmentField={updateSegmentField}
                onBack={() => ((t: any) => { console.log('[Studio] Switching to tab:', t); setActiveTab(t); })('branch')}
                onNext={handleFinalExport}
                projectId={projectId}
                onFaceless={() => setShowFaceless(true)}
                isSaving={isSaving}
              />
            )}

            {activeTab === 'assembly' && showFaceless && (
              <FacelessStudio
                projectId={projectId}
                manifest={manifest}
                onBack={() => setShowFaceless(false)}

                onJumpToConcept={() => {
                  setShowFaceless(false);
                  ((t: any) => { console.log('[Studio] Switching to tab:', t); setActiveTab(t); })('concept');
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
                />
              </div>
            )}

            {activeTab === 'knowledge' && (
              <KnowledgeLab profile={currentProfile!} onProfileUpdate={setCurrentProfile} locale={locale} />
            )}
          </div>
        </main>
      </div>



      
      {/* 🛠 DEBUG MONITOR (Visible only for you) */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none p-4 flex flex-col items-center">
        {studioCrashError && (
          <div className="p-4 bg-red-600/90 backdrop-blur-xl border border-red-500 rounded-2xl shadow-2xl text-white max-w-sm w-full pointer-events-auto animate-bounce">
            <h4 className="font-black uppercase text-[10px] tracking-widest mb-1">SYSTEM ERROR CRASH</h4>
            <p className="text-[11px] font-bold">{studioCrashError}</p>
          </div>
        )}
        <div id="viral-debug-console" className="mt-2 text-[8px] font-mono text-cyan-400/30 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
           System Kernel Live...
        </div>
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
    </div>
  );
}