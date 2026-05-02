'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter, usePathname } from '@/navigation';
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
  const t = useTranslations('studio');
  const router = useRouter();
  const { id: projectId, locale } = useParams() as { id: string; locale: string };
  const pathname = usePathname();

  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') as any || 'concept';

  const [isLoading, setIsLoading] = useState(true);
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
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    if (showFaceless) params.set('mode', 'faceless');
    else params.delete('mode');
    
    const newUrl = `${pathname}?${params.toString()}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
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
      // Resolve A-Roll URL: use explicit one if provided, otherwise check manifest
      const manifestAny = manifest as any;
      const resolvedARollUrl = 
        explicitARollUrl ||
        manifestAny.aRollUrl ||
        manifestAny.segments?.find((s: any) => s.type === 'user_recording' && s.assetUrl)?.assetUrl ||
        manifestAny.segments?.[0]?.assetUrl ||
        null;

      const updatedManifest = {
        ...manifest,
        aRollUrl: resolvedARollUrl,  // explicitly store for Delivery page
        brollClips: broll || [],
        subtitleClips: subs || [],
        segments: manifest.segments.map((s: any, i: number) => i === 0 ? { 
          ...s, 
          brollClips: broll || [], 
          subtitleClips: subs || [] 
        } : s)
      };

      // ✅ INSTANT TRANSITION
      // We push to the delivery page immediately. The save happens in the background
      // and the delivery page will also try to fetch the latest version.
      router.push(`/app/projects/new/delivery?projectId=${projectId}`);

      // ✅ Background Save manifest — ensure at least one version exists
      const saveTask = async () => {
        let savedVersion = null;
        if (currentVersionId) {
          savedVersion = await projectService.updateVersion(currentVersionId, { script_data: updatedManifest });
        } else {
          savedVersion = await projectService.updateLatestVersionManifest(projectId, updatedManifest);
        }

        if (!savedVersion) {
          console.log('[Studio] No existing version found, creating initial version');
          savedVersion = await projectService.createVersion({
            projectId,
            scriptData: updatedManifest,
            versionLabel: 'Initial Export'
          });
        }
        // Clear local draft after successful background save
        localStorage.removeItem(`viral_editor_draft_${projectId}`);
      };

      saveTask().catch(e => console.error('[Studio] Background save failed:', e));

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
      <main className="w-full h-full relative flex flex-col">
        
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
                  setActiveTab('teleprompter');
                } else if (type === 'faceless') {
                  setShowFaceless(true);
                  setActiveTab('assembly');
                }
              }}
              onBack={() => setActiveTab('concept')}
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
                    setShowRecordingReview(false);
                    setActiveTab('assembly');
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
              onBack={() => setActiveTab('branch')}
              onNext={handleFinalExport}
              projectId={projectId}
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
                scriptText={manifest?.segments?.map(s => s.scriptText).filter(Boolean).join('\n\n') || ''}
                projectId={projectId}
                locale={locale}
              />
            </div>
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeLab profile={currentProfile!} onProfileUpdate={setCurrentProfile} />
          )}
        </div>
      </main>



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