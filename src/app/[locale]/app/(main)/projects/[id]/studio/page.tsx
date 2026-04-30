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

// Global Shared Components
import StudioTimeline from '@/components/studio/StudioTimeline';
import BRollModal from '@/components/studio/BRollPickerModal';
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
  const [isBRollModalOpen, setIsBRollModalOpen] = useState(false);
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
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
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

  // Initial Load
  useEffect(() => {
    async function loadData() {
      try {
        const [proj, profile] = await Promise.all([
          projectService.getProject(projectId),
          profileService.getOrCreateProfile()
        ]);
        
        setProject(proj);
        setCurrentProfile(profile);
        
        const latestVersion = await projectService.getLatestVersion(projectId);
        const modeParam = searchParams.get('mode');

        if (latestVersion) {
          setCurrentVersionId(latestVersion.id);
          if (latestVersion.script_data) {
            const m = latestVersion.script_data as any;
            setManifest(m);
            
            // Restore faceless mode if data exists OR if URL param forced it
            if (m.faceless || modeParam === 'faceless') {
              setShowFaceless(true);
              setActiveTab('assembly');
            }
          }
        }
 else {
          setManifest(createInitialManifest(projectId, uuidv4(), { 
            hook: '' as any, 
            context: '' as any, 
            meat: '' as any, 
            cta: '' as any 
          }));
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

  const handleFinalExport = async (broll?: any[], subs?: any[]) => {
    setIsSaving(true);
    try {
      if (!manifest || !currentVersionId) return;

      // 🔥 Merge editor state into manifest
      const updatedManifest = {
        ...manifest,
        brollClips: broll || [],
        subtitleClips: subs || [],
        // Also update segments to include this info if the renderer uses segments
        segments: manifest.segments.map((s, i) => i === 0 ? { 
          ...s, 
          brollClips: broll || [], 
          subtitleClips: subs || [] 
        } : s)
      };

      await projectService.updateLatestVersionManifest(projectId, updatedManifest);
      
      // Start a real render job here via api
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, versionId: currentVersionId })
      });
      const data = await response.json();
      
      if (data.jobId) {
        // Clear local draft on successful export
        localStorage.removeItem(`viral_editor_draft_${projectId}`);
        router.push(`/app/projects/new/delivery?projectId=${projectId}&jobId=${data.jobId}`);
      } else {
        router.push(`/app/projects/new/delivery?projectId=${projectId}`);
      }
    } catch (err) {
      console.error('Export failed:', err);
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
                if (type === 'record') setActiveTab('teleprompter');
                else if (type === 'faceless') {
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
                      setShowRecordingReview(true);
                      setActiveTab('assembly');
                   }}
                   t={t}
                />
                
                {showRecordingReview && (
                  <div className="absolute inset-x-0 bottom-0 z-[60]">
                    <RecordingReview 
                       showRecordingReview={showRecordingReview}
                       lastRecordingUrl={lastRecordingUrl}
                       currentProfile={currentProfile}
                       downloadRawVideo={downloadRawVideo}
                       sendRawToTelegram={sendRawToTelegram}
                       setShowRecordingReview={setShowRecordingReview}
                       setLastRecordingUrl={setLastRecordingUrl}
                       updateSegmentField={updateSegmentField}
                       setManifest={setManifest}
                       setActiveTab={setActiveTab}
                       manifest={manifest}
                       selectedSegmentId={selectedSegmentId}
                    />
                  </div>
                )}
            </div>
          )}

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

          {activeTab === 'knowledge' && (
            <KnowledgeLab profile={currentProfile!} onProfileUpdate={setCurrentProfile} />
          )}
        </div>
      </main>

      <BRollModal 
        isOpen={isBRollModalOpen} 
        onClose={() => setIsBRollModalOpen(false)} 
        onSelect={(url) => { if (selectedSegmentId) updateSegmentField(selectedSegmentId, 'overlayBroll', url); setIsBRollModalOpen(false); }} 
      />

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