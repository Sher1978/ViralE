'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { PremiumLimitModal } from '@/components/ui/PremiumLimitModal';
import { 
  Plus, CheckCircle2, Lock, Scissors, RefreshCw, Wand2, Brain, Monitor, FileVideo, Download, X, Layout
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

// Global Shared Components
import StudioTimeline from '@/components/studio/StudioTimeline';
import BRollModal from '@/components/studio/BRollPickerModal';
import KnowledgeLab from '@/components/studio/KnowledgeLab';
import { StrategistChat } from '@/components/studio/StrategistChat';

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
  const [activeTab, setActiveTab] = useState<'strategy' | 'teleprompter' | 'assembly' | 'knowledge' | 'assets' | 'concept' | 'branch'>(initialTab);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  
  // Teleprompter States
  const [isReading, setIsReading] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [isMirrored, setIsMirrored] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [prompterWidth, setPrompterWidth] = useState(600);
  const [customScript, setCustomScript] = useState<string>('');
  const [useCustomScript, setUseCustomScript] = useState<boolean>(false);
  const [lastRecordingUrl, setLastRecordingUrl] = useState<string | null>(null);
  const [showRecordingReview, setShowRecordingReview] = useState(false);
    const [scriptColor, setScriptColor] = useState('#ffffff');
  const prompterDivRef = useRef<HTMLDivElement>(null);
  const [scriptOpacity, setScriptOpacity] = useState(0.85);
  const [isBRollModalOpen, setIsBRollModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
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
        if (latestVersion && latestVersion.script_data) {
          setManifest(latestVersion.script_data as any);
        } else {
          setManifest(createInitialManifest(projectId, uuidv4(), { hook: '', body: '', callToAction: '' }));
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
  const startVideoRecording = () => {
    if (!cameraStream) return;
    const localChunks: Blob[] = [];
          // 🚀 Smart MimeType selection for Cross-Platform compatibility (iPhone vs Android/PC)
      const supportedMimeTypes = [
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
      const mimeType = supportedMimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      
      console.log('[Studio] Initializing MediaRecorder with mimeType:', mimeType || 'browser default');
      
      const recorder = mimeType 
        ? new MediaRecorder(cameraStream, { mimeType })
        : new MediaRecorder(cameraStream);
    
    recorder.ondataavailable = (e) => { if (e.data.size > 0) localChunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(localChunks, { type: recorder.mimeType || 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setLastRecordingUrl(url);
      setShowRecordingReview(true);
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecordingVideo(true);
    setRecordingTime(0);
    recordingTimerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecordingVideo(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
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

  // Manifest Handlers
  const updateSegmentField = (id: string, field: string, value: any) => {
     if (!manifest) return;
     setManifest({
       ...manifest,
       segments: manifest.segments.map(s => s.id === id ? { ...s, [field]: value } : s)
     });
  };

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

  const handleFinalExport = async () => {
    setIsSaving(true);
    try {
      await renderService.saveManifest(projectId, manifest!);
      router.push(`/app/projects/${projectId}/render`);
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
    <div className="flex h-screen bg-[#05050a] text-white overflow-hidden font-sans">
      <StudioSidebar 
        activeTab={activeTab as any}
        setActiveTab={setActiveTab as any}
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

      <main className="flex-1 flex flex-col overflow-hidden relative bg-[#05050a]">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
        
        {/* Production Stage Rendering */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'concept' && (
            <StrategistChat 
              projectId={projectId}
              userId={currentProfile?.id || ''}
              manifest={manifest || undefined} 
              setManifest={(m) => setManifest(m)} 
            />
          )}
          
          {activeTab === 'teleprompter' && (
            <div className="flex-1 flex items-center justify-center p-12 z-10 relative">
                <TeleprompterView
                    cameraStream={cameraStream}
                    videoPreviewRef={videoPreviewRef}
                    isVideoMirrored={isVideoMirrored}
                    prompterWidth={prompterWidth}
                    isReading={isReading}
                    countdown={countdown}
                    prompterRef={prompterDivRef}
                    isMirrored={isMirrored}
                    useCustomScript={useCustomScript}
                    manifest={manifest}
                    customScript={customScript}
                    textSize={textSize}
                    scriptOpacity={scriptOpacity}
                    scriptColor={scriptColor}
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
                    onColorChange={setScriptColor}
                    onBack={() => {
                      router.push(`/app/projects/new/script?projectId=${projectId}`);
                    }}
                    onToggleRecording={isRecordingVideo ? stopVideoRecording : startVideoRecording}
                    onFlipCamera={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    onTextSizeChange={setTextSize}
                    onOpacityChange={setScriptOpacity}
                    scrollSpeed={scrollSpeed}
                    onSpeedChange={setScrollSpeed}
                    isRecordingVideo={isRecordingVideo}
                    onFinish={() => {
                       if (lastRecordingUrl) {
                         setShowRecordingReview(true);
                       } else {
                         setActiveTab('assembly');
                       }
                    }}
                    recordingTime={recordingTime}
                    t={t}
                 />
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
                       await projectService.updateLatestVersionManifest(projectId, newManifest);
                    }
                    setShowRecordingReview(false);
                    setTimeout(() => setActiveTab('assembly'), 100);
                  }}
                  manifest={manifest}
                  selectedSegmentId={selectedSegmentId}
               />
            </div>
          )}

          {activeTab === 'assembly' && (
            <StoryboardGrid 
              manifest={manifest}
              selectedSegmentId={selectedSegmentId}
              setSelectedSegmentId={setSelectedSegmentId}
              isRegenerating={isRegenerating}
              regenerateSegment={regenerateSegment}
              deleteSegment={deleteSegment}
              updateSegmentField={updateSegmentField}
              addSegment={addSegment}
              handleFinalExport={handleFinalExport}
              setIsBRollModalOpen={setIsBRollModalOpen}
            />
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeLab profile={currentProfile!} onProfileUpdate={setCurrentProfile} />
          )}
        </div>

        {/* Global Timeline */}
        {activeTab !== 'concept' && activeTab !== 'knowledge' && (
          <StudioTimeline 
            segments={manifest?.segments || []} 
            activeIndex={activeIndex} 
            selectedId={selectedSegmentId} 
            onSelect={(id, idx) => { setSelectedSegmentId(id); setActiveIndex(idx); }}
            onAdd={() => addSegment()}
          />
        )}
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
