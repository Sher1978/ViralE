'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { 
  Play, Pause, SkipForward, SkipBack, 
  Settings2, Wand2, RefreshCw, Plus, X,
  Trash2, ChevronRight, Layers, Layout,
  Brain, Lock, Monitor, MessageSquare,
  Scissors, Type, Sliders, CheckCircle2, FileVideo, Film, Zap, Sparkles, Search, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { projectService, Project, ProjectVersion } from '@/lib/services/projectService';
import { renderService, RenderJob } from '@/lib/services/renderService';
import { profileService, Profile } from '@/lib/services/profileService';
import { ProductionManifest, SceneSegment, SegmentType, AnimationStyle, AvatarProvider } from '@/lib/types/studio';
import { createInitialManifest } from '@/lib/studio-utils';
import { v4 as uuidv4 } from 'uuid';
import KnowledgeLab from '@/components/studio/KnowledgeLab';
import StudioPreview from '@/components/studio/StudioPreview';
import StudioTimeline from '@/components/studio/StudioTimeline';
import StudioToolbar from '@/components/studio/StudioToolbar';
import BRollPickerModal from '@/components/studio/BRollPickerModal';
import { StrategistChat } from '@/components/studio/StrategistChat';
import UpsellPrompt from '@/components/studio/UpsellPrompt';

export default function StudioPage() {
  const t = useTranslations('studio');
  const router = useRouter();
  const { id: projectId, locale } = useParams() as { id: string; locale: string };

  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [manifest, setManifest] = useState<ProductionManifest | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'style' | 'assets' | 'settings' | 'knowledge' | 'teleprompter' | 'assembly' | 'concept'>('concept');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [heygenKey, setHeygenKey] = useState('');
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  
  // Teleprompter States
  const [isReading, setIsReading] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2); // 1-10 scale
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [isMirrored, setIsMirrored] = useState(false); // Horizontal flip
  const [countdown, setCountdown] = useState<number | null>(null);
  const [prompterWidth, setPrompterWidth] = useState(600); // px
  const [customScript, setCustomScript] = useState<string>('');
  const [useCustomScript, setUseCustomScript] = useState<boolean>(false);
  const [isFullscreenPrompter, setIsFullscreenPrompter] = useState(false);
  const [lastRecordingUrl, setLastRecordingUrl] = useState<string | null>(null);
  const [showRecordingReview, setShowRecordingReview] = useState(false);
  const [scriptOpacity, setScriptOpacity] = useState(0.85);
  const [captionStyle, setCaptionStyle] = useState<string>('viral_yellow');
  const [isBrollCycling, setIsBrollCycling] = useState<string | null>(null);
  const [isBRollModalOpen, setIsBRollModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Upsell States
  const [showStrategistUpsell, setShowStrategistUpsell] = useState(true);
  const [showBrollUpsell, setShowBrollUpsell] = useState(true);
  const [showStyleUpsell, setShowStyleUpsell] = useState(true);

  
  // Camera & Recording States
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isVideoMirrored, setIsVideoMirrored] = useState(true);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
  const [videoResolution, setVideoResolution] = useState<'360p' | '720p' | '1080p'>('720p');
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  
  const prompterRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);

  // Assembly States
  const [clarifyingPrompts, setClarifyingPrompts] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadStudioData() {
      if (!projectId) return;
      try {
        const proj = await projectService.getProject(projectId);
        setProject(proj);

        // 1. Try to load from dedicated manifest table
        const latestManifest = await renderService.getLatestManifest(projectId);
        if (latestManifest) {
          setManifest(latestManifest);
        } else {
          // 2. Fallback to initializing from script data
          const version = await projectService.getLatestVersion(projectId);
          if (version?.script_data) {
            const initial = createInitialManifest(projectId, version.id, version.script_data);
            setManifest(initial);
          }
        }
      } catch (err) {
        console.error('Studio load failed:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStudioData();

    async function loadProfile() {
      try {
        const profile = await profileService.ensureProfile();
        if (profile) {
          setCurrentProfile(profile);
          setHeygenKey(profile.heygen_api_key || '');
          
          // Force Knowledge Lab if DNA is missing
          if (!profile.synthetic_training_data) {
            setActiveTab('knowledge');
          }
        }
      } catch (err) {
        console.error('Profile load failed:', err);
      }
    }
    loadProfile();

    // Load library assets
    async function loadLibrary() {
      try {
        const res = await fetch('/api/studio/library');
        const data = await res.json();
        if (data.success) setLibraryAssets(data.assets);
      } catch (err) {
        console.error('Library load failed:', err);
      }
    }
    loadLibrary();
  }, [projectId]);

  // Load project settings (Telegram & Style)
  useEffect(() => {
    if (project?.config_json?.telegram_chat_id) {
      setTelegramChatId(project.config_json.telegram_chat_id);
    }
    if (project?.config_json?.caption_style) {
      setCaptionStyle(project.config_json.caption_style);
    }
  }, [project]);

  const [activeIndex, setActiveIndex] = useState(0);

  // Simple sequencing logic for "Variant B"
  useEffect(() => {
    if (!isPlaying || !manifest) return;

    const currentSegment = manifest.segments[activeIndex];
    const duration = currentSegment.duration || 5;

    const timer = setTimeout(() => {
      if (activeIndex < manifest.segments.length - 1) {
        setActiveIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
        setActiveIndex(0);
      }
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [isPlaying, activeIndex, manifest]);

  // Populate Devices
  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const v = devices.filter(d => d.kind === 'videoinput');
        const a = devices.filter(d => d.kind === 'audioinput');
        setVideoDevices(v);
        setAudioDevices(a);
        if (v.length > 0 && !selectedVideoDeviceId) setSelectedVideoDeviceId(v[0].deviceId);
        if (a.length > 0 && !selectedAudioDeviceId) setSelectedAudioDeviceId(a[0].deviceId);
      } catch (err) {
        console.error('Error listing devices:', err);
      }
    }
    getDevices();
    // Listen for device changes
    navigator.mediaDevices.ondevicechange = getDevices;
    return () => {
      navigator.mediaDevices.ondevicechange = null;
    };
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);

  // Debounced Autosave Logic
  useEffect(() => {
    if (!manifest || isLoading) return;
    
    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        await renderService.saveManifest(projectId, manifest);
      } catch (err) {
        console.error('Autosave failed:', err);
      } finally {
        setIsSaving(false);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeout);
  }, [manifest, projectId, isLoading]);

  // Professional Teleprompter Scroll Logic (Double-buffered for smoothness)
  useEffect(() => {
    if (!isReading || countdown !== null) return;

    let lastTime = performance.now();
    let frameId: number;

    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      if (prompterRef.current) {
        // Calculate scroll increment based on speed and frame time
        // speed 1-10, where 2 is "normal" reading speed
        const pixelsPerMs = (scrollSpeed * 0.05); 
        scrollPosRef.current += pixelsPerMs * delta;
        
        prompterRef.current.scrollTop = scrollPosRef.current;
      }
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isReading, scrollSpeed, countdown]);

  // Teleprompter Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'teleprompter') return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        toggleReading();
      }
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        setScrollSpeed(prev => Math.min(10, prev + 0.5));
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        setScrollSpeed(prev => Math.max(0, prev - 0.5));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReading, activeTab]);

  const toggleReading = () => {
    if (isReading) {
      setIsReading(false);
      setCountdown(null);
    } else {
      // Start countdown
      setCountdown(3);
    }
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      setIsReading(true);
      scrollPosRef.current = 0;
      if (prompterRef.current) prompterRef.current.scrollTop = 0;
      
      // Start Video Recording if in Camera mode
      if (cameraStream) {
        startVideoRecording();
      }
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, cameraStream]);

  const initCamera = async () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      
      const resMap = {
        '360p': { width: 640, height: 360 },
        '720p': { width: 1280, height: 720 },
        '1080p': { width: 1920, height: 1080 }
      };
      
      const constraints: MediaStreamConstraints = { 
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
      alert('Camera access denied or hardware busy. Please check browser permissions and device connections.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const startVideoRecording = () => {
    if (!cameraStream) return;
    
    // Use a local array to avoid state closure issues
    const localChunks: Blob[] = [];
    const recorder = new MediaRecorder(cameraStream, { 
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
        ? 'video/webm;codecs=vp9,opus' 
        : 'video/webm' 
    });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        localChunks.push(e.data);
        setRecordedChunks(prev => [...prev, e.data]);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(localChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setLastRecordingUrl(url);
      setShowRecordingReview(true);
      setIsFullscreenPrompter(false);
    };

    recorder.start(1000); // Collect data every second
    mediaRecorderRef.current = recorder;
    setIsRecordingVideo(true);
    setRecordingTime(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecordingVideo(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const toggleReadingWithCamera = () => {
    if (isReading || isRecordingVideo) {
      setIsReading(false);
      stopVideoRecording();
      setCountdown(null);
      setIsFullscreenPrompter(false);
    } else {
      setCountdown(3);
      setIsFullscreenPrompter(true);
    }
  };

  const saveManifestManually = async () => {
    if (!manifest || !project) return;
    setIsSaving(true);
    try {
      await renderService.saveManifest(projectId, manifest, `User Save ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.error('Manual save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const regenerateSegment = async (segmentId: string, customPrompt?: string) => {
    const segment = manifest?.segments.find(s => s.id === segmentId);
    if (!segment) return;

    setIsRegenerating(segmentId);
    try {
      // 1. Mark segment as rendering in UI immediately
      setManifest(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          segments: prev.segments.map(s => 
            s.id === segmentId ? { 
              ...s, 
              status: 'rendering',
              prompt: customPrompt ? `${s.prompt} [CLARIFICATION: ${customPrompt}]` : s.prompt 
            } : s
          )
        };
      });

      const updatedSegment = {
        ...segment,
        prompt: customPrompt ? `${segment.prompt} [CLARIFICATION: ${customPrompt}]` : segment.prompt
      };

      // 2. Trigger API call
      const response = await fetch(`/api/studio/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          segmentId,
          segmentType: segment.type,
          segmentData: {
            ...segment,
            prompt: customPrompt ? `${segment.prompt} [CLARIFICATION: ${customPrompt}]` : segment.prompt
          }
        })
      });

      if (!response.ok) throw new Error('Regeneration request failed');
      const data = await response.json();
      
      console.log('Regeneration triggered:', data.jobId);
      
      // 3. Start Polling for this job
      if (data.jobId) {
        const pollInterval = setInterval(async () => {
          try {
            const jobStatus = await renderService.getJobStatus(data.jobId);
            if (jobStatus && (jobStatus.status === 'completed' || jobStatus.status === 'failed')) {
              clearInterval(pollInterval);
              
              setManifest(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  segments: prev.segments.map(s => 
                    s.id === segmentId ? { 
                      ...s, 
                      status: jobStatus.status === 'completed' ? 'completed' : 'error',
                      assetUrl: jobStatus.output_url || s.assetUrl 
                    } : s
                  )
                };
              });
            }
          } catch (pollErr) {
            console.error('Job polling failed:', pollErr);
          }
        }, 3000); // Poll every 3s
      }
      
    } catch (err) {
      console.error('Regeneration failed:', err);
      // Revert status
      setManifest(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          segments: prev.segments.map(s => 
            s.id === segmentId ? { ...s, status: 'error' } : s
          )
        };
      });
    } finally {
      setIsRegenerating(null);
    }
  };

  const addSegment = (type: SegmentType = 'animated_still') => {
    if (!manifest) return;
    const newSegment: SceneSegment = {
      id: uuidv4(),
      type: type,
      scriptText: 'New Scene Text',
      prompt: 'New scene visual description',
      status: 'pending',
      animationStyle: 'zoom-in',
      duration: 5
    };
    
    setManifest(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        segments: [...prev.segments, newSegment]
      };
    });
    setSelectedSegmentId(newSegment.id);
  };

  const deleteSegment = (id: string) => {
    if (!manifest) return;
    setManifest(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        segments: prev.segments.filter(s => s.id !== id)
      };
    });
    if (selectedSegmentId === id) setSelectedSegmentId(null);
  };

  const duplicateSegment = (id: string) => {
    const segment = manifest?.segments.find(s => s.id === id);
    if (!segment || !manifest) return;
    
    const newSegment = { ...segment, id: uuidv4() };
    const index = manifest.segments.findIndex(s => s.id === id);
    
    setManifest(prev => {
      if (!prev) return prev;
      const newSegments = [...prev.segments];
      newSegments.splice(index + 1, 0, newSegment);
      return { ...prev, segments: newSegments };
    });
    setSelectedSegmentId(newSegment.id);
  };

  const fetchBrollForCurrentSegment = async () => {
    if (!selectedSegmentId || !manifest) return;
    setIsBrollCycling(selectedSegmentId);
    try {
      const segment = manifest.segments.find(s => s.id === selectedSegmentId);
      if (!segment) return;

      const tags = [segment.prompt?.split(' ')[0] || 'dynamic'];
      const suggestions = await renderService.getBrollSuggestions(tags);
      
      setManifest({
        ...manifest,
        segments: manifest.segments.map(s => 
          s.id === selectedSegmentId 
            ? { 
                ...s, 
                brollSuggestions: suggestions, 
                currentBrollIndex: 0,
                assetUrl: suggestions[0] || s.assetUrl,
                status: 'completed'
              } 
            : s
        )
      });
    } catch (err) {
      console.error('B-roll fetch failed:', err);
    } finally {
      setIsBrollCycling(null);
    }
  };

  const cycleBroll = () => {
    if (!selectedSegmentId || !manifest) return;
    const segment = manifest.segments.find(s => s.id === selectedSegmentId);
    if (!segment || !segment.brollSuggestions || segment.brollSuggestions.length === 0) {
      fetchBrollForCurrentSegment();
      return;
    }

    const nextIndex = ((segment.currentBrollIndex || 0) + 1) % segment.brollSuggestions.length;
    
    setManifest({
      ...manifest,
      segments: manifest.segments.map(s => 
        s.id === selectedSegmentId 
          ? { 
              ...s, 
              currentBrollIndex: nextIndex,
              assetUrl: segment.brollSuggestions![nextIndex] 
            } 
          : s
      )
    });
  };

  const handleFinalExport = async () => {
    if (!manifest || !project) return;
    setIsSaving(true);
    try {
      await renderService.saveManifest(projectId, manifest, `Final Export ${new Date().toLocaleDateString()}`);
      
      const version = await projectService.getLatestVersion(projectId);
      if (version) {
        await renderService.triggerStudioRender(projectId, version.id, manifest, {
          includeMarketingPackage: true
        });
        alert('Master Render Started! Check Telegram for your video + Instagram marketing package (6 images + cover + SEO description).');
        router.push(`/${locale}/app/projects`);
      }
    } catch (err) {
      console.error('Final export failed:', err);
      alert('Export failed. Check connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectAssetForSegment = (assetUrl: string) => {
    if (!selectedSegmentId || !manifest) return;
    setManifest(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        segments: prev.segments.map(s => 
          s.id === selectedSegmentId ? { ...s, assetUrl: assetUrl } : s
        )
      };
    });
  };

  const selectOverlayForSegment = (assetUrl: string) => {
    if (!selectedSegmentId || !manifest) return;
    setManifest(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        segments: prev.segments.map(s => 
          s.id === selectedSegmentId ? { ...s, overlayBroll: assetUrl } : s
        )
      };
    });
  };

  const updateSegmentField = (id: string, field: string, value: any) => {
    if (!manifest) return;
    setManifest(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        segments: prev.segments.map(s => 
          s.id === id ? { ...s, [field]: value } : s
        )
      };
    });
  };

  const updateAnimationStyle = (style: AnimationStyle) => {
    if (!selectedSegmentId || !manifest) return;
    setManifest(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        segments: prev.segments.map(s => 
          s.id === selectedSegmentId ? { ...s, animationStyle: style } : s
        )
      };
    });
  };

  const updateCaptionStyle = async (style: string) => {
    setCaptionStyle(style);
    if (!project) return;
    try {
      const updatedConfig = { ...project.config_json, caption_style: style };
      await projectService.updateProject(projectId, { config_json: updatedConfig });
    } catch (err) {
      console.error('Failed to update caption style:', err);
    }
  };

  const updateTelegramId = async (id: string) => {
    setTelegramChatId(id);
    if (!project) return;
    try {
      const updatedConfig = { ...project.config_json, telegram_chat_id: id };
      await projectService.updateProject(projectId, { config_json: updatedConfig });
    } catch (err) {
      console.error('Failed to update telegram ID:', err);
    }
  };

  const updateHeygenKey = async (key: string) => {
    setHeygenKey(key);
    if (!currentProfile) return;
    try {
      await profileService.updateProfile(currentProfile.id, { heygen_api_key: key });
    } catch (err) {
      console.error('Failed to update HeyGen key:', err);
    }
  };

  const triggerFinalRender = async () => {
    if (!manifest || !project) return;
    setIsSaving(true);
    try {
      const version = await projectService.getLatestVersion(projectId);
      if (!version) throw new Error('Version not found');

      await renderService.triggerStudioRender(projectId, version.id, manifest);
      router.push(`/${locale}/app/projects/${projectId}?tab=delivery`);
    } catch (err) {
      console.error('Final render trigger failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const currentSegment = manifest?.segments[activeIndex] || null;
  const selectedSegment = manifest?.segments.find(s => s.id === selectedSegmentId) || null;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#05050a] space-y-4">
      <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Initializing Studio Architecture...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#05050a] text-white overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a14] z-50">
        <div className="flex items-center gap-4 pl-10">
          <div>
            <h1 className="text-sm font-black tracking-tight uppercase leading-none mb-1">
              Viral Studio <span className="text-white/20 mx-1">/</span> <span className="text-white/60">{project?.title}</span>
            </h1>
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Workspace ID: {projectId?.substring(0,8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'teleprompter' && (
            <button 
              onClick={() => setIsFullscreenPrompter(!isFullscreenPrompter)}
              className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${isFullscreenPrompter ? 'bg-purple-500 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
            >
              <Monitor size={14} /> {isFullscreenPrompter ? 'Exit Focus' : 'Focus Mode'}
            </button>
          )}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mr-4">
            <div className={`w-1.5 h-1.5 rounded-full ${isRecordingVideo ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-green-500'} animate-pulse`} />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{isRecordingVideo ? 'Live Recording' : 'Cloud Sync Active'}</span>
          </div>
          <button 
            onClick={saveManifestManually}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button 
            onClick={triggerFinalRender}
            className="px-6 py-2 rounded-xl bg-purple-500 text-[10px] font-black uppercase tracking-widest hover:bg-purple-400 transition-all shadow-lg shadow-purple-500/20 active:scale-95"
          >
            Export Final
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Top Section: Visual Preview */}
        {activeTab !== 'concept' && (
          <StudioPreview 
            currentSegment={currentSegment}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onNext={() => setActiveIndex(prev => Math.min((manifest?.segments.length || 1) - 1, prev + 1))}
            onPrev={() => setActiveIndex(prev => Math.max(0, prev - 1))}
          />
        )}

        {/* Concept Phase: Brainstorming & Ideation */}
        {activeTab === 'concept' && (
           <div className="flex-1 flex flex-col bg-[#05050a] p-4 md:p-8 overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <div className="flex items-center gap-3 mb-1">
                       <span className="px-2 py-0.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-[8px] font-black uppercase tracking-widest animate-pulse">Stage 0: Conceptualization</span>
                    </div>
                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                       <Brain size={28} className="text-yellow-400" />
                       Sherlock <span className="text-yellow-400">Strategist</span>
                    </h2>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">AI-Powered Content Blueprinting</p>
                 </div>
                 <button 
                  onClick={() => setActiveTab('teleprompter')}
                  className="px-6 py-3 rounded-2xl bg-yellow-400 text-black font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-yellow-400/10 flex items-center gap-2"
                >
                  Start Production <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                 {/* Chat/Strategy Area */}
                 <div className="lg:col-span-2 relative bg-white/2 rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent z-0" />
                    <div className="relative z-10 flex-1 flex flex-col">
                       {currentProfile && (
                         <div className="flex-1 p-4">
                            <StrategistChat 
                              projectId={projectId}
                              userId={currentProfile.id}
                              manifest={manifest || undefined}
                              setManifest={(m) => setManifest(m as ProductionManifest)}
                              onApplySuggestion={(text) => {
                                 // Logic to apply a hook or headline to the manifest
                                 if (manifest) {
                                    const updated = { ...manifest };
                                    if (updated.segments.length > 0) {
                                       updated.segments[0].scriptText = text;
                                       setManifest(updated);
                                    }
                                 }
                              }}
                            />
                         </div>
                       )}
                    </div>
                 </div>

                 {/* Current Blueprint Summary */}
                 <div className="hidden lg:flex flex-col gap-4">
                    <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10">
                       <h3 className="text-[10px] font-black uppercase text-white/40 mb-4 tracking-widest underline decoration-yellow-500 underline-offset-8">Blueprint Summary</h3>
                       <div className="space-y-4">
                          <div>
                             <p className="text-[10px] font-bold text-white/60 mb-1">Target Hook</p>
                             <p className="text-sm font-medium italic">"{manifest?.segments[0]?.scriptText?.substring(0, 100)}..."</p>
                          </div>
                          <div>
                             <p className="text-[10px] font-bold text-white/60 mb-1">Estimated Viral Score</p>
                             <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full w-[85%] bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                             </div>
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex-1 p-6 rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent border border-white/10 overflow-y-auto">
                       <h3 className="text-[10px] font-black uppercase text-white/40 mb-4 tracking-widest">Scene Logic</h3>
                       <div className="space-y-4">
                          {manifest?.segments.map((s, i) => (
                             <div key={s.id} className="flex gap-3">
                                <span className="text-[10px] font-black text-yellow-500/40">{i+1}</span>
                                <p className="text-[11px] text-white/50 leading-relaxed italic">{s.scriptText?.substring(0, 60)}...</p>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {/* Middle Section: Interactive Timeline */}
        {activeTab !== 'concept' && (
          <div className="bg-[#05050a]">
            <StudioTimeline 
              segments={manifest?.segments || []}
              activeIndex={activeIndex}
              selectedId={selectedSegmentId}
              onSelect={(id, index) => {
                setActiveIndex(index);
                setSelectedSegmentId(id);
              }}
              onAdd={() => addSegment()}
            />
          </div>
        )}

        {/* Bottom Section: Tool Context or Primary UI */}
        {activeTab === 'assembly' && (
          <div className="flex flex-col gap-4 p-6 bg-[#0a0a14] border-t border-white/5 max-h-[30vh] overflow-y-auto">
             <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Scene Breakdown</h3>
                <button 
                  onClick={() => setIsBRollModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase flex items-center gap-2"
                >
                  <Plus size={14} /> Add B-Roll
                </button>
             </div>
             {manifest?.segments.map((s, idx) => (
                <div 
                  key={s.id}
                  onClick={() => {
                    setActiveIndex(idx);
                    setSelectedSegmentId(s.id);
                  }}
                  className={`p-4 rounded-2xl border transition-all ${activeIndex === idx ? 'bg-white/5 border-purple-500/50 shadow-lg' : 'bg-transparent border-white/5 opacity-40'}`}
                >
                   <p className="text-xs font-medium text-white/80 italic">"{s.scriptText?.substring(0, 50)}..."</p>
                </div>
             ))}
          </div>
        )}

        {activeTab === 'teleprompter' && (
           <div className="absolute inset-0 bg-black z-[70] flex flex-col p-4 md:p-8 overflow-hidden">
              {/* Header with Step indicator */}
              <div className="flex justify-between items-center mb-8">
                 <button onClick={() => setActiveTab('assembly')} className="p-3 rounded-2xl bg-white/5 text-white/40"><X size={24} /></button>
                 <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                       <span className="text-[8px] font-black uppercase text-purple-400">Step 1</span>
                    </div>
                    <h2 className="text-sm font-black uppercase">Content Blueprint</h2>
                 </div>
                 <div className="w-12" /> {/* Spacer */}
              </div>

              {!isReading && !isRecordingVideo && !isGenerating ? (
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                   {/* Script Source Choice */}
                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setUseCustomScript(false)}
                        className={`p-6 rounded-[2rem] border transition-all flex flex-col items-center gap-3 ${!useCustomScript ? 'bg-purple-500/10 border-purple-500 shadow-lg' : 'bg-white/5 border-white/5 opacity-40'}`}
                      >
                         <MessageSquare size={24} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Use AI Script</span>
                      </button>
                      <button 
                        onClick={() => setUseCustomScript(true)}
                        className={`p-6 rounded-[2rem] border transition-all flex flex-col items-center gap-3 ${useCustomScript ? 'bg-purple-500/10 border-purple-500 shadow-lg' : 'bg-white/5 border-white/5 opacity-40'}`}
                      >
                         <Type size={24} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Paste Own</span>
                      </button>
                   </div>

                   {/* Script Preview/Edit Area */}
                   <div className="flex-1 bg-white/2 rounded-[2rem] border border-white/5 p-6 flex flex-col gap-4 overflow-hidden">
                      <div className="flex items-center justify-between">
                         <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">Script Editor</span>
                         {!useCustomScript && (
                            <button className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors">
                               <RefreshCw size={14} />
                               <span className="text-[8px] font-black uppercase">Regenerate</span>
                            </button>
                         )}
                      </div>
                      
                      <textarea 
                        value={useCustomScript ? customScript : manifest?.segments[activeIndex]?.scriptText || ''}
                        onChange={(e) => useCustomScript ? setCustomScript(e.target.value) : updateSegmentField(selectedSegmentId || '', 'scriptText', e.target.value)}
                        placeholder="Paste your script here or let AI generate one..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-lg md:text-xl font-medium leading-relaxed italic placeholder:text-white/10 resize-none custom-scrollbar"
                      />
                   </div>

                   {/* Action Choice: Record or Avatar */}
                   <div className="flex flex-col gap-4">
                      <p className="text-center text-[8px] font-black uppercase text-white/20 tracking-[0.3em]">Production Method</p>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => {
                            initCamera();
                            setIsFullscreenPrompter(true);
                            toggleReading();
                          }}
                          className="flex-1 h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                        >
                          <Monitor size={18} />
                          Record Myself
                        </button>
                        <button 
                          onClick={() => {
                            // Logic to switch to Avatar generation
                            setActiveTab('settings');
                            alert('Switching to AI Avatar Engine. Update your HeyGen/Vapi settings to begin synthesis.');
                          }}
                          className="flex-1 h-16 rounded-2xl bg-purple-600 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-purple-500 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-purple-500/20"
                        >
                          <Brain size={18} />
                          AI Avatar
                        </button>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                   {/* Active Prompter View */}
                   <div className="flex justify-center items-center mb-8 gap-12">
                      <div className="flex items-center gap-4">
                         <button onClick={() => setScrollSpeed(prev => Math.max(0.5, prev - 0.5))} className="p-3 bg-white/5 rounded-2xl text-white/40"><SkipBack size={20} /></button>
                         <span className="text-2xl font-black text-purple-500 min-w-[60px] text-center">{scrollSpeed.toFixed(1)}x</span>
                         <button onClick={() => setScrollSpeed(prev => Math.min(10, prev + 0.5))} className="p-3 bg-white/5 rounded-2xl text-white/40"><SkipForward size={20} /></button>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30">
                         <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                         <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">REC {recordingTime}s</span>
                      </div>
                   </div>

                   <div className="flex-1 overflow-hidden flex flex-col items-center justify-center relative">
                      {/* Visual Center Marker */}
                      <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-purple-500/20 z-0" />
                      
                      <div 
                        ref={prompterRef}
                        className="w-full max-w-2xl text-center overflow-y-auto no-scrollbar relative z-10"
                        style={{ 
                          fontSize: textSize === 'lg' ? '3.5rem' : textSize === 'md' ? '2.5rem' : '1.5rem', 
                          maxHeight: '60vh',
                          paddingTop: '30vh',
                          paddingBottom: '30vh' 
                        }}
                      >
                         <p className="font-bold leading-tight uppercase tracking-tighter text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                            {useCustomScript ? customScript : manifest?.segments[activeIndex]?.scriptText || "Ready to record..."}
                         </p>
                      </div>
                   </div>

                   <div className="flex justify-center p-8 gap-8">
                      <button 
                        onClick={toggleReading}
                        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all ${isReading ? 'bg-red-500' : 'bg-white text-black'}`}
                      >
                        {isReading ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                      </button>
                      <button 
                        onClick={() => {
                          stopVideoRecording();
                          setIsReading(false);
                          setActiveTab('assembly');
                        }}
                        className="w-20 h-20 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                      >
                         <CheckCircle2 size={32} />
                      </button>
                   </div>
                </div>
              )}
           </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="absolute inset-0 bg-[#05050a] z-[60] p-6 overflow-y-auto">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black uppercase tracking-tight">Digital DNA Vault</h2>
                <button onClick={() => setActiveTab('assembly')} className="p-3 bg-white/5 rounded-2xl"><X size={20} /></button>
             </div>
             {currentProfile && (
               <KnowledgeLab 
                 profile={currentProfile} 
                 onProfileUpdate={(updated) => setCurrentProfile(updated)} 
               />
             )}
          </div>
        )}

        {/* Global Modal Overlays */}
        <BRollPickerModal 
          isOpen={isBRollModalOpen}
          onClose={() => setIsBRollModalOpen(false)}
          onSelect={(url) => {
            selectAssetForSegment(url);
            setIsBRollModalOpen(false);
          }}
          segmentText={selectedSegment?.scriptText}
        />

        {/* Bottom Toolbar */}
        <StudioToolbar 
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          onExport={handleFinalExport}
        />
      </div>

        {/* Assets Library Drawer */}
        {/* Teleprompter Drawer */}
        {activeTab === 'teleprompter' && (
          <aside className={`w-80 border-r border-white/5 bg-[#0a0a14] flex flex-col p-6 transition-all duration-700 overflow-hidden relative z-50 ${isFullscreenPrompter ? '-translate-x-80 opacity-0' : 'animate-slide-in-left opacity-100'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-lg shadow-purple-500/5">
                  <Monitor size={18} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">Viral Studio</h3>
                  <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.4em] mt-1 pulse">Industrial Console</p>
                </div>
              </div>
            
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-none space-y-8">
              {/* Camera Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Camera Module</span>
                  <div className="flex gap-2">
                    {cameraStream ? (
                      <button 
                        onClick={stopCamera}
                        className="px-3 py-1 rounded-lg bg-red-500/10 text-red-500 text-[8px] font-black uppercase border border-red-500/20"
                      >
                        Disable
                      </button>
                    ) : (
                      <button 
                        onClick={initCamera}
                        className="px-3 py-1 rounded-lg bg-green-500/10 text-green-500 text-[8px] font-black uppercase border border-green-500/20"
                      >
                        Enable
                      </button>
                    )}
                  </div>
                </div>
                
                {cameraStream && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => {
                          setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
                          setTimeout(initCamera, 100);
                        }}
                        className="py-3 rounded-2xl border border-white/5 bg-white/5 text-[8px] font-black uppercase text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2 shadow-inner"
                      >
                        <RefreshCw size={10} /> Flip Lens
                      </button>
                      <button 
                        onClick={() => setIsVideoMirrored(!isVideoMirrored)}
                        className={`py-3 rounded-2xl border transition-all text-[8px] font-black uppercase flex items-center justify-center gap-2 ${isVideoMirrored ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/10' : 'bg-white/5 border-white/5 text-white/40 shadow-inner'}`}
                      >
                        {isVideoMirrored ? 'Mirror ON' : 'Mirror OFF'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl border border-white/5 bg-black/40 shadow-inner">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${isRecordingVideo ? 'bg-red-500 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`} />
                        <span className="text-[8px] font-black uppercase text-white/60 tracking-[0.2em]">{isRecordingVideo ? 'Recording' : 'Standby'}</span>
                      </div>
                      <span className="font-mono text-[9px] font-black text-white/30 tracking-widest tabular-nums">
                        {isRecordingVideo ? `${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}` : (facingMode === 'user' ? 'Front' : 'Rear')}
                      </span>
                    </div>

                    {/* Advanced Hardware Selectors */}
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-[7px] font-black uppercase text-white/20 tracking-widest ml-1">Video Source</label>
                        <select 
                          value={selectedVideoDeviceId}
                          onChange={(e) => { setSelectedVideoDeviceId(e.target.value); setTimeout(initCamera, 100); }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[9px] text-white/60 focus:outline-none"
                        >
                          {videoDevices.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,4)}`}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[7px] font-black uppercase text-white/20 tracking-widest ml-1">Audio Source</label>
                        <select 
                          value={selectedAudioDeviceId}
                          onChange={(e) => { setSelectedAudioDeviceId(e.target.value); setTimeout(initCamera, 100); }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[9px] text-white/60 focus:outline-none"
                        >
                          {audioDevices.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0,4)}`}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[7px] font-black uppercase text-white/20 tracking-widest ml-1">Resolution</label>
                        <div className="grid grid-cols-3 gap-1">
                          {(['360p', '720p', '1080p'] as const).map(res => (
                            <button 
                              key={res}
                              onClick={() => { setVideoResolution(res); setTimeout(initCamera, 100); }}
                              className={`py-1 rounded-lg text-[8px] font-black uppercase border transition-all ${videoResolution === res ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' : 'bg-white/5 border-white/5 text-white/40'}`}
                            >
                              {res}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Script Source Switch */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Script Source</span>
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    <button 
                      onClick={() => setUseCustomScript(false)}
                      className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${!useCustomScript ? 'bg-purple-500 text-white' : 'text-white/30 hover:text-white/60'}`}
                    >
                      Studio
                    </button>
                    <button 
                      onClick={() => setUseCustomScript(true)}
                      className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${useCustomScript ? 'bg-purple-500 text-white' : 'text-white/30 hover:text-white/60'}`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {useCustomScript ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="relative">
                      <textarea 
                        value={customScript}
                        onChange={(e) => setCustomScript(e.target.value)}
                        placeholder="Paste your script here..."
                        className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-4 text-[11px] text-white/70 focus:outline-none focus:border-purple-500/50 resize-none scrollbar-none font-medium leading-loose shadow-inner"
                      />
                      <div className="absolute top-2 right-2 flex gap-1 opacity-20 hover:opacity-100 transition-opacity">
                         <Type size={12} className="text-white/40" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const fullScript = manifest?.segments.map(s => s.scriptText).join('\n\n') || '';
                          setCustomScript(fullScript);
                        }}
                        className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-[8px] font-black uppercase text-white/40 hover:bg-white/10 hover:text-white transition-all shadow-sm"
                      >
                        Import Studio Path
                      </button>
                      <button 
                        onClick={() => setCustomScript('')}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:bg-red-500/10 hover:text-red-500 transition-all shadow-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-white/5 text-center shadow-inner">
                    <p className="text-[9px] font-black text-purple-400/80 uppercase tracking-[0.2em] leading-loose">
                      AI Storyboard Sync Active<br/>
                      <span className="text-[7px] text-white/20 font-bold uppercase tracking-widest">{manifest?.segments.length || 0} Production Nodes Loaded</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Glass Mirror (Text)</span>
                  <button 
                    onClick={() => setIsMirrored(!isMirrored)}
                    className={`p-2 rounded-xl border transition-all ${isMirrored ? 'bg-purple-500/20 border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-white/5 border-white/5 text-white/20'}`}
                  >
                    <RefreshCw size={12} className={isMirrored ? 'rotate-180 transition-transform duration-500' : ''} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">{t('teleprompter.scrollPace')}</span>
                  <span className="text-[9px] font-black text-purple-400">{scrollSpeed}x</span>
                </div>
                <input 
                  type="range" min="0" max="10" step="0.5"
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(Number(e.target.value))}
                  className="w-full accent-purple-500 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer" 
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Viewport Width</span>
                  <span className="text-[9px] font-black text-blue-400">{prompterWidth}px</span>
                </div>
                <input 
                  type="range" min="400" max="1200" step="10"
                  value={prompterWidth}
                  onChange={(e) => setPrompterWidth(Number(e.target.value))}
                  className="w-full accent-blue-500 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer" 
                />
              </div>

              <div className="space-y-4">
                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">{t('teleprompter.textSize')}</span>
                <div className="flex gap-2">
                  {(['sm', 'md', 'lg'] as const).map(size => (
                    <button 
                      key={size}
                      onClick={() => setTextSize(size)}
                      className={`flex-1 py-3 rounded-xl flex items-center justify-center text-[11px] transition-all border ${textSize === size ? 'bg-purple-500 border-purple-500 font-black text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                    >
                      {size.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Script Opacity</span>
                  <span className="text-[9px] font-black text-purple-400">{Math.round(scriptOpacity * 100)}%</span>
                </div>
                <input 
                  type="range" min="0.1" max="1" step="0.05"
                  value={scriptOpacity}
                  onChange={(e) => setScriptOpacity(Number(e.target.value))}
                  className="w-full accent-purple-500 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer" 
                />
              </div>
              {showStrategistUpsell && (
                <div className="pt-4 border-t border-white/5">
                  <UpsellPrompt 
                    type="strategist"
                    title="Need a better script?"
                    message="Our AI Strategist can blueprint your entire video logic for maximum retention."
                    actionLabel="Open Strategist"
                    onAction={() => setActiveTab('concept')}
                    onClose={() => setShowStrategistUpsell(false)}
                  />
                </div>
              )}
            </div>

            <div className="pt-8 border-t border-white/5 space-y-4">

              <button 
                onClick={toggleReadingWithCamera}
                className={`w-full py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl relative overflow-hidden group/read ${
                  isReading || isRecordingVideo
                  ? 'bg-red-500 text-white border border-red-500 animate-pulse' 
                  : 'bg-gradient-to-r from-red-600 to-purple-600 text-white'
                }`}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/read:opacity-100 transition-opacity" />
                {isReading || isRecordingVideo ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                    FINISH RECORDING
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_white]" />
                    START RECORDING
                  </>
                )}
              </button>
              <p className="text-[7px] font-bold text-center text-white/10 uppercase tracking-[0.4em]">SYNCED CAMERA + SCRIPT SCROLL</p>
            </div>
          </aside>
        )}



        {/* Assembly / Editor Drawer */}
        {activeTab === 'assembly' && (
          <aside className="w-80 border-r border-white/5 bg-[#0a0a14] flex flex-col p-6 animate-slide-in-left overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">{t('assembly.title')}</h3>
              <Scissors size={16} className="text-purple-400/50" />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-none space-y-4">
              {manifest?.segments.map((s, idx) => (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedSegmentId(s.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group/card ${selectedSegmentId === s.id ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/5 overflow-hidden flex-none relative">
                       {s.assetUrl ? (
                         s.type.includes('avatar') ? (
                            <video src={s.assetUrl} className="w-full h-full object-cover opacity-50" muted />
                         ) : (
                            <div className="w-full h-full bg-cover bg-center opacity-50" style={{ backgroundImage: `url('${s.assetUrl}')` }} />
                         )
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-white/10">
                            <Monitor size={16} />
                         </div>
                       )}
                       {s.status === 'rendering' && (
                         <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                            <RefreshCw size={12} className="animate-spin text-purple-400" />
                         </div>
                       )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">S{idx + 1}</span>
                        {s.status === 'completed' ? <CheckCircle2 size={10} className="text-green-500/50" /> : <div className="w-1.5 h-1.5 rounded-full bg-orange-500/50" />}
                      </div>
                      <p className="text-[10px] font-bold text-white/60 truncate uppercase tracking-tight">{s.type.replace('_', ' ')}</p>
                      <p className="text-[9px] text-white/30 line-clamp-2 mt-1 italic">"{s.prompt?.substring(0, 40)}..."</p>
                    </div>
                  </div>
                  
                  {selectedSegmentId === s.id && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3 animate-in fade-in slide-in-from-top-1">
                      <textarea
                        value={clarifyingPrompts[s.id] || ''}
                        onChange={(e) => setClarifyingPrompts(prev => ({ ...prev, [s.id]: e.target.value }))}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={t('assembly.clarifyingPromptPlaceholder')}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-[10px] text-white/60 focus:outline-none focus:border-purple-500/50 h-16 resize-none"
                      />
                      <button 
                        onClick={(e) => { e.stopPropagation(); regenerateSegment(s.id, clarifyingPrompts[s.id]); }}
                        disabled={!!isRegenerating}
                        className="w-full py-2 rounded-xl bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-purple-400 transition-all flex items-center justify-center gap-2"
                      >
                         <RefreshCw size={10} className={isRegenerating === s.id ? 'animate-spin' : ''} />
                         {t('assembly.regenerateBtn')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
                  {t('assembly.scenesCount', { n: manifest?.segments.length ?? 0 })}
                </div>
                <button 
                  onClick={() => addSegment('animated_still')}
                  className="p-2 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all"
                >
                  <Plus size={16} />
                </button>
              </div>

              <button 
                onClick={handleFinalExport}
                disabled={isSaving}
                className="w-full py-5 rounded-[2rem] bg-gradient-to-r from-purple-600 via-fuchsia-600 to-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:shadow-[0_0_30px_rgba(147,51,234,0.3)] transition-all shadow-xl active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 size={16} /> Export Final Production
              </button>
              <p className="text-[7px] font-bold text-center text-white/20 uppercase tracking-[0.3em]">INCLUDES INSTAGRAM MARKETING PACKAGE</p>
            </div>
          </aside>
        )}

        {activeTab === 'assets' && (
          <aside className={`w-80 border-r border-white/5 bg-[#0a0a14] flex flex-col p-6 animate-slide-in-left overflow-y-auto transition-all ${isFullscreenPrompter ? '-translate-x-80 opacity-0' : 'opacity-100'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">Production Assets</h3>
              <div className="flex gap-2">
                <button title="Giphy" className="p-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20"><Zap size={14}/></button>
                <button title="Mixkit" className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20"><Film size={14}/></button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                 <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">AI Scene Generator</p>
                 <button 
                  onClick={() => {/* Trigger Veo 3 Job */}}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-2"
                 >
                   <Sparkles size={16} /> Generate with Veo 3
                 </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {libraryAssets.map(asset => (
                  <div 
                    key={asset.id} 
                    className="aspect-video rounded-2xl bg-white/5 border border-white/10 overflow-hidden group cursor-pointer hover:border-purple-500/50 transition-all relative"
                  >
                    <div className="w-full h-full bg-cover bg-center opacity-40 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `url('${asset.url}')` }} />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                        onClick={() => selectAssetForSegment(asset.url)}
                        className="text-[8px] font-black uppercase bg-purple-500 px-3 py-2 rounded-xl"
                       >
                         Apply Take
                       </button>
                    </div>
                    <div className="p-3 bg-black/60 backdrop-blur-sm -mt-12 relative z-10 flex justify-between items-center border-t border-white/5">
                      <span className="text-[8px] font-black uppercase truncate w-32 tracking-wider">{asset.name}</span>
                      <button 
                        onClick={() => {/* Cycle Source Trigger */}}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
                      >
                        <RefreshCw size={12} className="text-purple-400" />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 space-y-3">
                  <h4 className="text-[8px] font-black uppercase text-white/20 tracking-widest ml-1">Automated B-Roll Pipeline</h4>
                  <button 
                    onClick={cycleBroll}
                    disabled={!!isBrollCycling}
                    className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-[9px] font-black uppercase text-white/30 hover:border-purple-500/30 hover:text-purple-400 transition-all flex items-center justify-center gap-2 group"
                  >
                    {isBrollCycling ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Search size={14} className="group-hover:scale-110 transition-transform" />
                    )} 
                    {isBrollCycling ? 'Cycling Stock...' : 'Cycle Giphy/Mixkit Stock'}
                  </button>
                  <p className="text-[7px] text-center text-white/10 font-bold uppercase tracking-widest leading-relaxed">
                    Swipe or click to cycle through<br/>emotion-matched premium clips
                  </p>

                  {showBrollUpsell && (
                    <div className="pt-4 border-t border-white/5">
                      <UpsellPrompt 
                        type="broll"
                        title="Pro Stock Library"
                        message="Get access to 4K cinematic stock footage and custom AI-generated B-roll."
                        actionLabel="Upgrade Library"
                        onAction={() => alert('Upgrade to Premium to unlock 4K Stock Library')}
                        onClose={() => setShowBrollUpsell(false)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

        )}

                {/* Caption Style Drawer */}
        {activeTab === 'style' && (
          <aside className={`w-80 border-r border-white/5 bg-[#0a0a14] flex flex-col p-6 animate-slide-in-left overflow-y-auto transition-all ${isFullscreenPrompter ? '-translate-x-80 opacity-0' : 'opacity-100'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-2xl bg-pink-500/10 border border-pink-500/20 shadow-lg shadow-pink-500/5">
                <Type size={18} className="text-pink-400" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-pink-400">Caption Style</h3>
                <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.4em] mt-1">Engine V3.2</p>
              </div>
            </div>
            
            <div className="space-y-8 flex-1">
              <div className="space-y-4">
                <label className="text-[9px] font-black uppercase text-white/30 tracking-widest ml-1">Caption Engine (8 Styles)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'viral_yellow', name: 'Viral Yellow' },
                    { id: 'minimal_white', name: 'Minimalist' },
                    { id: 'neon_glitch', name: 'Cyber Neon' },
                    { id: 'serif_doc', name: 'Documentary' },
                    { id: 'pop_bounce', name: 'Pop Bounce' },
                    { id: 'boxed_black', name: 'Boxed Bold' },
                    { id: 'cine_overlay', name: 'Cinematic' },
                    { id: 'typing_mono', name: 'Console Mono' },
                  ].map(style => (
                    <button 
                      key={style.id}
                      onClick={() => updateCaptionStyle(style.id)}
                      className={`py-3 px-2 rounded-xl text-[8px] font-black uppercase border transition-all ${captionStyle === style.id ? 'bg-pink-500 border-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>

              {showStyleUpsell && (
                <div className="pt-4 border-t border-white/5">
                  <UpsellPrompt 
                    type="premium"
                    title="Premium Viral Styles"
                    message="Unlock custom branding, auto-emojis, and dynamic subtitle tracking."
                    actionLabel="Get Pro Styles"
                    onAction={() => alert('Upgrade to unlock premium captions')}
                    onClose={() => setShowStyleUpsell(false)}
                  />
                </div>
              )}
            </div>
            
            <div className="pt-6 border-t border-white/5">
               <p className="text-[7px] font-bold text-center text-white/5 uppercase tracking-[0.4em]">Engine: V3 Caption Renderer</p>
            </div>
          </aside>
        )}

                {/* Knowledge Lab & Project Settings */}
        {activeTab === 'knowledge' && currentProfile && (
          <div className="flex h-full overflow-hidden animate-slide-in-left">
            <KnowledgeLab 
              profile={currentProfile} 
              onProfileUpdate={(updated) => setCurrentProfile(updated)} 
            />
            
            <aside className="w-80 border-l border-white/5 bg-[#0a0a14] flex flex-col p-6 overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-2xl bg-green-500/10 border border-green-500/20 shadow-lg shadow-green-500/5">
                  <Settings2 size={18} className="text-green-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-green-400">Project Config</h3>
                  <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.4em] mt-1">Deep DNA Config</p>
                </div>
              </div>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[9px] font-black uppercase text-white/30 tracking-widest ml-1">Telegram Integration</label>
                  <div className="space-y-2">
                    <p className="text-[8px] text-white/20 uppercase font-black tracking-widest ml-1 text-right">Recipient ID</p>
                    <input 
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => updateTelegramId(e.target.value)}
                      placeholder="e.g. 12345678"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white/60 focus:outline-none focus:border-green-500/50 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                  <label className="text-[9px] font-black uppercase text-white/30 tracking-widest ml-1">Export Channels</label>
                  <div className="flex flex-col gap-2">
                    <button className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                          <Monitor size={14} className="text-blue-400" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-white/60">Google Drive</span>
                      </div>
                      <span className="text-[8px] font-bold text-green-500 uppercase">Linked</span>
                    </button>
                    <button className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                          <FileVideo size={14} className="text-purple-400" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-white/60">Telegram Bot</span>
                      </div>
                      <span className="text-[8px] font-bold text-white/20 uppercase">Auto</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto pt-6 border-t border-white/5">
                <p className="text-[7px] font-bold text-center text-white/5 uppercase tracking-[0.4em]">Viral Engine v3.14</p>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-[#05050a]">
          {/* Glass background effects */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

          {/* Hard Lock Overlay for Missing DNA */}
          {!currentProfile?.synthetic_training_data && activeTab !== 'knowledge' && (
            <div className="absolute inset-0 z-[100] backdrop-blur-md bg-black/60 flex items-center justify-center p-12">
              <div className="max-w-md w-full bg-[#0a0a14] border border-red-500/20 rounded-[2.5rem] p-10 text-center shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                  <Lock className="text-red-500" size={32} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight mb-4">Studio Hard Locked</h2>
                <p className="text-[11px] font-bold text-white/40 leading-relaxed uppercase tracking-widest mb-8">
                  Your Digital DNA matrix is empty. High-fidelity rendering and script mirroring require a pre-configured Knowledge Base.
                </p>
                <button 
                  onClick={() => setActiveTab('knowledge')}
                  className="w-full py-5 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/90 transition-all flex items-center justify-center gap-3"
                >
                  <Brain size={16} /> Configure Digital DNA
                </button>
              </div>
            </div>
          )}

          {/* Player Container */}
          <div className="flex-1 flex items-center justify-center p-12 z-10">
            {activeTab === 'teleprompter' ? (
              <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden rounded-[3rem] border border-white/5">
                {/* Camera Layer */}
                {cameraStream && (
                  <div className="absolute inset-0 z-0">
                    <video 
                      ref={videoPreviewRef}
                      autoPlay 
                      muted 
                      playsInline
                      className={`w-full h-full object-cover opacity-60 transition-transform duration-500 ${isVideoMirrored ? 'scale-x-[-1]' : ''}`}
                    />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                  </div>
                )}
                
                {/* Industry Reading Indicators */}
                <div className="absolute top-[30%] left-0 right-0 z-20 pointer-events-none">
                  {/* Focus Marker Arrows */}
                  <div className="absolute left-8 -translate-y-1/2 flex items-center gap-4">
                    <ChevronRight size={48} className="text-purple-500 animate-pulse drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                  </div>
                  <div className="absolute right-8 -translate-y-1/2 flex items-center gap-4 rotate-180">
                    <ChevronRight size={48} className="text-purple-500 animate-pulse drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                  </div>
                  
                  {/* Central Reading Guide */}
                  <div className="mx-auto h-[100px] border-y border-white/5 bg-white/[0.02] flex items-center justify-center transition-all duration-700"
                       style={{ maxWidth: `${prompterWidth + 100}px` }}>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="absolute top-0 right-0 p-8 flex items-center gap-3">
                   <div className={`w-3 h-3 rounded-full ${isReading ? 'bg-red-500 animate-pulse box-content border-4 border-red-500/20' : 'bg-white/10'}`} />
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                     {isReading ? 'On Air - Professional Mode' : 'Ready'}
                   </span>
                </div>

                {/* Countdown Overlay */}
                <AnimatePresence>
                  {countdown !== null && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 2 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl"
                    >
                      <div className="relative">
                        <span className="text-[12rem] font-black italic text-transparent bg-clip-text bg-gradient-to-br from-purple-400 via-white to-blue-500 drop-shadow-[0_0_50px_rgba(168,85,247,0.8)]">
                          {countdown}
                        </span>
                        <div className="absolute -inset-20 border-2 border-white/10 rounded-full animate-ping opacity-20" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* The Scrolling Canvas */}
                <div 
                  ref={prompterRef}
                  className={`w-full h-full overflow-y-auto scrollbar-none transition-transform duration-700 ${isMirrored ? 'scale-x-[-1]' : ''}`}
                  style={{
                    paddingTop: '30vh',
                    paddingBottom: '60vh'
                  }}
                >
                  <div 
                    className="mx-auto space-y-48 transition-all duration-700 ease-out px-12"
                    style={{ maxWidth: `${prompterWidth}px` }}
                  >
                    {!useCustomScript ? (
                      manifest?.segments.map((s, idx) => (
                        <div key={s.id} className="space-y-12 text-center group cursor-default">
                          <div className="flex items-center justify-center gap-6 opacity-20 group-hover:opacity-100 transition-opacity">
                            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-purple-500/50" />
                            <span className="text-[12px] font-black uppercase text-purple-500 tracking-[0.5em]">{t('teleprompter.sceneLabel', { n: idx + 1 })}</span>
                            <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-purple-500/50" />
                          </div>
                          <p className={`font-black leading-[1.2] transition-all duration-500 drop-shadow-2xl tracking-tight ${
                            textSize === 'sm' ? 'text-4xl' : textSize === 'lg' ? 'text-8xl' : 'text-6xl'
                          }`} style={{ 
                            color: `rgba(255, 255, 255, ${isReading ? scriptOpacity : 0.2})` 
                          }}>
                            {s.scriptText || '---'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="space-y-12 text-center">
                         <div className="flex items-center justify-center gap-6 opacity-40">
                            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-blue-500/50" />
                            <span className="text-[12px] font-black uppercase text-blue-500 tracking-[0.5em]">Custom Script Mode</span>
                            <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-blue-500/50" />
                          </div>
                        <p className={`font-black leading-[1.2] transition-all duration-500 drop-shadow-2xl tracking-tight whitespace-pre-wrap ${
                          textSize === 'sm' ? 'text-4xl' : textSize === 'lg' ? 'text-8xl' : 'text-6xl'
                        }`} style={{ 
                          color: `rgba(255, 255, 255, ${isReading ? scriptOpacity : 0.2})` 
                        }}>
                          {customScript || 'PASTE SCRIPT IN CONSOLE'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fade Overlays */}
                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[#05050a] via-[#05050a]/80 to-transparent pointer-events-none z-10" />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#05050a] via-[#05050a]/80 to-transparent pointer-events-none z-10" />
              </div>
            ) : (
              <div className="relative aspect-[9/16] h-full max-h-[75vh] bg-[#0d0d1a] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group">
              
              {/* Actual Content Layer */}
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                {currentSegment ? (
                  currentSegment.type.includes('avatar') ? (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                      {currentSegment.assetUrl ? (
                         <video 
                           src={currentSegment.assetUrl} 
                           autoPlay 
                           muted 
                           loop 
                           className="w-full h-full object-cover"
                         />
                      ) : (
                        <>
                          <div className="w-20 h-20 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Loading AI Avatar...</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full relative overflow-hidden">
                      <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] scale-110 group-hover:scale-125" 
                        style={{ 
                          backgroundImage: `url('${currentSegment.assetUrl || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop'}')`,
                          animation: 'kenburns 10s infinite alternate' 
                        }} 
                      />
                      {currentSegment.overlayBroll && (
                        <div className="absolute inset-0 z-20 mix-blend-screen opacity-50">
                           <video src={currentSegment.overlayBroll} autoPlay muted loop className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                    </div>
                  )
                ) : (
                  <Play size={48} className="text-white/10" />
                )}

              {/* Player Overlay Controls */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 scale-110 transition-all hover:scale-125 hover:bg-white/20 shadow-2xl"
                 >
                  {isPlaying ? <Pause fill="white" size={32} /> : <Play fill="white" size={32} className="ml-1" />}
                 </button>
              </div>

              {/* Progress Bar (Integrated into Phone UI) */}
              <div className="absolute bottom-8 left-8 right-8 h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: (activeIndex / Math.max(1, manifest?.segments.length || 1)) * 100 + "%" }}
                />
              </div>
            </div>
          </div>
        )
      }
    </div>

          {/* Timeline Area */}
          <div className="h-72 border-t border-white/5 bg-[#0a0a14]/80 backdrop-blur-3xl p-6 flex flex-col z-20">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-white/40">
                <span>00:00 / {manifest?.totalDuration}s</span>
                <div className="flex items-center gap-1">
                  <SkipBack size={14} className="hover:text-white cursor-pointer"/>
                  <Play size={14} className="hover:text-white cursor-pointer"/>
                  <SkipForward size={14} className="hover:text-white cursor-pointer"/>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => addSegment('broll')}
                  className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1 hover:text-purple-300 transition-colors"
                >
                  <Plus size={14}/> Add Scene
                </button>
              </div>
            </div>

            {/* Scrolling Timeline */}
            <div className="flex-1 overflow-x-auto flex gap-3 pb-2 scrollbar-thin scrollbar-thumb-white/10 px-2 items-center">
              {manifest?.segments.map((segment, index) => (
                <div 
                  key={segment.id}
                  onClick={() => setSelectedSegmentId(segment.id)}
                  className={`flex-none w-48 rounded-2xl border transition-all cursor-pointer overflow-hidden flex flex-col group/item relative ${
                    selectedSegmentId === segment.id 
                    ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.1)]' 
                    : 'border-white/5 bg-white/5 hover:border-white/20'
                  } ${activeIndex === index ? 'ring-2 ring-purple-500/50' : ''}`}
                >
                  <div className="h-24 bg-black/40 flex items-center justify-center text-[10px] font-black text-white/20 uppercase tracking-widest text-center px-4 relative">
                    {activeIndex === index && isPlaying && (
                      <div className="absolute inset-0 bg-purple-500/10 animate-pulse flex items-center justify-center">
                        <div className="w-1 h-8 bg-purple-500/40 rounded-full mx-0.5 animate-bounce [animation-delay:-0.2s]" />
                        <div className="w-1 h-12 bg-purple-500/40 rounded-full mx-0.5 animate-bounce" />
                        <div className="w-1 h-8 bg-purple-500/40 rounded-full mx-0.5 animate-bounce [animation-delay:-0.4s]" />
                      </div>
                    )}
                    <span className="relative z-10">
                      {segment.type === 'intro_avatar' && "👤 Avatar Intro"}
                      {segment.type === 'outro_avatar' && "👤 Avatar Outro"}
                      {segment.type === 'animated_still' && "🖼️ Story Visual"}
                      {segment.type === 'broll' && "📹 Dynamic B-Roll"}
                    </span>

                    {/* Quick Actions Overlay */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity z-20">
                      <button 
                        onClick={(e) => { e.stopPropagation(); duplicateSegment(segment.id); }}
                        className="p-1.5 bg-black/60 rounded-lg hover:bg-purple-500/40 border border-white/5 transition-all"
                        title="Duplicate"
                      >
                        <Layers size={10} className="text-white/60" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteSegment(segment.id); }}
                        className="p-1.5 bg-black/60 rounded-lg hover:bg-red-500/40 border border-white/5 transition-all"
                        title="Delete"
                      >
                        <Trash2 size={10} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-black/20">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">
                        {segment.status === 'completed' ? '✅ Ready' : segment.status === 'rendering' ? '⏳ Rendering' : '🟠 Pending'}
                      </p>
                      <span className="text-[8px] font-black text-white/20 uppercase">S{index + 1}</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className={`h-full transition-all duration-[3000ms] ${segment.status === 'completed' ? 'bg-green-500/50 w-full' : segment.status === 'rendering' ? 'bg-purple-500 w-1/2 animate-shimmer' : 'bg-white/10 w-0'}`} />
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Add Scene Tile */}
              <button 
                onClick={() => addSegment('animated_still')}
                className="flex-none w-32 h-32 rounded-2xl border border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/50 transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={20} className="text-white/40 group-hover:text-purple-400" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/40">Add Scene</span>
              </button>
            </div>
          </div>
        </main>

        {/* Inspector Panel */}
        <aside className={`w-80 border-l border-white/5 bg-[#0a0a14] flex flex-col transition-all duration-700 overflow-y-auto z-30 ${isFullscreenPrompter ? 'translate-x-80 opacity-0' : 'opacity-100'}`}>
          {selectedSegment ? (
            <div className="p-8 space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">Inspector</h3>
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-white/5 text-white/40 uppercase tracking-widest">
                  {selectedSegment.id.substring(0,4)}
                </span>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-white/30 tracking-widest ml-1">Visual Prompt</label>
                  <textarea 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white/60 focus:outline-none focus:border-purple-500/50 min-h-[100px] leading-relaxed resize-none transition-all"
                    value={selectedSegment.prompt}
                    onChange={(e) => updateSegmentField(selectedSegment.id, 'prompt', e.target.value)}
                    placeholder="Describe the visual content..."
                  />
                </div>

                {(selectedSegment.type === 'intro_avatar' || selectedSegment.type === 'outro_avatar' || selectedSegment.type === 'broll') && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black uppercase text-white/30 tracking-widest ml-1">Spoken Script</label>
                    <textarea 
                      className="w-full bg-purple-500/5 border border-purple-500/20 rounded-2xl p-4 text-xs text-purple-100/70 focus:outline-none focus:border-purple-500/50 min-h-[100px] leading-relaxed resize-none transition-all"
                      value={selectedSegment.scriptText}
                      onChange={(e) => updateSegmentField(selectedSegment.id, 'scriptText', e.target.value)}
                      placeholder="What should the AI say?"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-white/30 tracking-widest ml-1">Animation Engine</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['zoom-in', 'zoom-out', 'glitch', 'pan-right'] as AnimationStyle[]).map(style => (
                      <button 
                        key={style} 
                        onClick={() => updateAnimationStyle(style)}
                        className={`p-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedSegment.animationStyle === style ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                      >
                        {style.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedSegment.type.includes('avatar') && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/30 tracking-widest ml-1">AI Provider</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['heygen', 'higgsfield'] as AvatarProvider[]).map(provider => (
                          <button 
                            key={provider} 
                            onClick={() => updateSegmentField(selectedSegment.id, 'provider', provider)}
                            className={`p-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedSegment.provider === provider || (!selectedSegment.provider && provider === 'heygen') ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                          >
                            {provider}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedSegment.provider === 'higgsfield' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-white/30 tracking-widest ml-1">Higgsfield Model</label>
                        <select 
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold uppercase text-white/60 focus:outline-none focus:border-purple-500/50"
                          value={selectedSegment.modelId || 'kling-3.0'}
                          onChange={(e) => updateSegmentField(selectedSegment.id, 'modelId', e.target.value)}
                        >
                          <option value="kling-3.0">Kling 3.0 (Cinematic)</option>
                          <option value="nano-banana">Nano Banana (Fast)</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="pt-8 border-t border-white/5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Refine Output</label>
                    <span className="text-[8px] font-bold text-purple-400/50 uppercase tracking-tighter">AI Precision</span>
                  </div>
                  <div className="relative group">
                    <textarea 
                      className="w-full bg-purple-600/5 border border-purple-500/20 rounded-2xl p-4 text-[11px] text-white/80 focus:outline-none focus:border-purple-500/50 min-h-[80px] leading-relaxed resize-none transition-all placeholder:text-white/10"
                      placeholder="Add specific instructions: 'Make it sunnier', 'Add more neon', 'Zoom slower'..."
                      value={selectedSegment.refinementPrompt || ''}
                      onChange={(e) => updateSegmentField(selectedSegment.id, 'refinementPrompt', e.target.value)}
                    />
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Brain size={12} className="text-purple-500/30" />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => regenerateSegment(selectedSegment.id)}
                  disabled={!!isRegenerating}
                  className="w-full py-5 rounded-[2rem] bg-gradient-to-r from-purple-600 via-fuchsia-600 to-blue-600 text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:shadow-[0_0_40px_rgba(147,51,234,0.3)] transition-all shadow-lg active:scale-95 disabled:opacity-50 relative overflow-hidden group/btn"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  {isRegenerating === selectedSegment.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 size={16} className="group-hover/btn:rotate-12 transition-transform" />
                  )}
                  {isRegenerating === selectedSegment.id ? 'Synthesizing...' : selectedSegment.refinementPrompt ? 'Synthesize Refinement' : 'Regenerate Scene'}
                </button>
                <div className="flex items-center justify-center gap-3 mt-4 text-[10px] font-black uppercase tracking-widest text-white/20">
                  <span>Balance: 420 CR</span>
                  <div className="w-1 h-1 rounded-full bg-white/10" />
                  <span className="text-purple-400/60">
                    Cost: {selectedSegment.provider === 'higgsfield' ? '15' : '50'} CR
                  </span>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase text-white/30 tracking-widest ml-1">B-Roll / Overlays</h4>
                  <Plus size={14} className="text-purple-400 cursor-pointer" onClick={() => setActiveTab('assets')} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedSegment.overlayBroll ? (
                    <div className="aspect-video rounded-2xl bg-white/5 border border-purple-500/20 overflow-hidden relative group">
                      <video src={selectedSegment.overlayBroll} autoPlay muted loop className="w-full h-full object-cover" />
                      <button 
                        onClick={() => selectOverlayForSegment('')}
                        className="absolute top-2 right-2 p-1 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                         <Trash2 size={10} className="text-red-400" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => setActiveTab('assets')}
                      className="aspect-video rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center group hover:border-purple-500/30 transition-all cursor-pointer"
                    >
                      <Plus size={20} className="text-white/10 group-hover:text-purple-500/40 transition-all"/>
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={() => deleteSegment(selectedSegment.id)}
                className="w-full py-4 text-red-500/40 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-all mt-12 bg-red-500/5 rounded-2xl border border-red-500/10 hover:border-red-500/20"
              >
                Delete Scene Segment
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-[2.5rem] bg-white/5 flex items-center justify-center mb-6 relative">
                 <div className="absolute inset-0 bg-purple-500/10 blur-xl rounded-full" />
                 <Layout size={32} className="text-white/10 relative z-10"/>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Select Scene to Inspect</p>
            </div>
          )}
        </aside>


      <style jsx global>{`
        @keyframes kenburns {
          from { transform: scale(1) translate(0, 0); }
          to { transform: scale(1.1) translate(-1%, -1%); }
        }
        .animate-ken-burns {
          animation: kenburns 10s ease infinite alternate;
        }
      `}</style>

      {/* Recording Review Overlay */}
      <AnimatePresence>
        {showRecordingReview && lastRecordingUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-12"
          >
            <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-[#0a0a14] border border-white/10 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
               <div className="absolute inset-0 bg-purple-500/5 animate-pulse pointer-events-none" />
               
               {/* Preview Section */}
               <div className="space-y-6">
                 <div className="aspect-[9/16] rounded-3xl bg-black border border-white/5 overflow-hidden shadow-2xl relative group">
                   <video 
                     src={lastRecordingUrl} 
                     controls 
                     autoPlay 
                     className="w-full h-full object-cover"
                   />
                   <div className="absolute top-6 left-6 p-3 rounded-xl bg-purple-500/80 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                      Draft Recording
                   </div>
                 </div>
               </div>

               {/* Action Section */}
               <div className="space-y-12">
                 <div className="space-y-4">
                   <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Review Take</h2>
                   <p className="text-sm font-medium text-white/40 leading-relaxed uppercase tracking-widest">
                     Your professional studio capture is ready. Choose how to proceed with this file.
                   </p>
                 </div>

                 <div className="space-y-4">
                   <button 
                     onClick={() => {
                        const a = document.createElement('a');
                        a.href = lastRecordingUrl;
                        a.download = `studio_take_${new Date().getTime()}.webm`;
                        a.click();
                     }}
                     className="w-full py-5 rounded-2xl bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/90 transition-all flex items-center justify-center gap-3 shadow-xl"
                   >
                     <Download size={18} /> Export Take Locally
                   </button>

                   <div className="grid grid-cols-2 gap-4">
                     <button 
                        onClick={() => {
                          if (selectedSegmentId && manifest) {
                            setManifest({
                              ...manifest,
                              segments: manifest.segments.map(s => 
                                s.id === selectedSegmentId ? { ...s, assetUrl: lastRecordingUrl, status: 'completed' } : s
                              )
                            });
                            setShowRecordingReview(false);
                          } else {
                            alert('Please select a scene in the Assembly tab first.');
                          }
                        }}
                        className="py-5 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[9px] font-black uppercase tracking-widest hover:bg-purple-500/30 transition-all flex items-center justify-center gap-2"
                     >
                       <Plus size={16} /> Apply to Scene
                     </button>
                     <button 
                        onClick={() => {
                          setLastRecordingUrl(null);
                          setShowRecordingReview(false);
                        }}
                        className="py-5 rounded-2xl bg-white/5 border border-white/5 text-white/40 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center justify-center gap-2"
                     >
                       <Trash2 size={16} /> Discard Take
                     </button>
                   </div>
                 </div>

                 <div className="pt-8 border-t border-white/5">
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                       <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                          <Monitor size={18} className="text-purple-400" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase text-white/60 tracking-wider">Target Resolution</p>
                          <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{videoResolution} ({videoResolution === '1080p' ? '1920x1080' : videoResolution === '720p' ? '1280x720' : '640x360'})</p>
                       </div>
                    </div>
                 </div>
               </div>

               {/* Close Button */}
               <button 
                 onClick={() => setShowRecordingReview(false)}
                 className="absolute top-8 right-8 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white"
               >
                 <X size={24} />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

}