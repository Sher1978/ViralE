'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { 
  Play, Pause, SkipForward, SkipBack, 
  Settings2, Wand2, RefreshCw, Plus, 
  Trash2, ChevronRight, Layers, Layout,
  Brain, Lock
} from 'lucide-react';
import { projectService, Project, ProjectVersion } from '@/lib/services/projectService';
import { renderService, RenderJob } from '@/lib/services/renderService';
import { profileService, Profile } from '@/lib/services/profileService';
import { ProductionManifest, SceneSegment, SegmentType, AnimationStyle, AvatarProvider } from '@/lib/types/studio';
import { createInitialManifest } from '@/lib/studio-utils';
import { v4 as uuidv4 } from 'uuid';
import KnowledgeLab from '@/components/studio/KnowledgeLab';

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
  const [activeTab, setActiveTab] = useState<'layout' | 'assets' | 'settings' | 'knowledge'>('layout');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [heygenKey, setHeygenKey] = useState('');
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

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
          setHeygenKey(profile.user_api_keys?.heygen || '');
          
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

  // Load project settings (Telegram)
  useEffect(() => {
    if (project?.config_json?.telegram_chat_id) {
      setTelegramChatId(project.config_json.telegram_chat_id);
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

  const regenerateSegment = async (segmentId: string) => {
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
            s.id === segmentId ? { ...s, status: 'rendering' } : s
          )
        };
      });

      // 2. Trigger API call
      const response = await fetch(`/api/studio/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          segmentId,
          segmentType: segment.type,
          segmentData: segment
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
                      status: jobStatus.status === 'completed' ? 'ready' : 'error',
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
      const updatedKeys = { ...currentProfile.user_api_keys, heygen: key };
      await profileService.updateProfile(currentProfile.id, { user_api_keys: updatedKeys });
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
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mr-4">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Cloud Sync Active</span>
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

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Assets/Library */}
        <aside className="w-16 border-r border-white/5 flex flex-col items-center py-8 gap-8 bg-[#0a0a14]">
          <button 
            onClick={() => setActiveTab('layout')}
            className={`p-3 rounded-2xl transition-all group relative ${activeTab === 'layout' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
          >
            <Layout size={20}/>
            <span className="absolute left-full ml-4 px-2 py-1 bg-purple-500 text-[8px] font-black uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">Layout</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('knowledge')}
            className={`p-3 rounded-2xl transition-all group relative ${activeTab === 'knowledge' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
          >
            <Brain size={20}/>
            {(!currentProfile?.synthetic_training_data) && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-[#0a0a14]">
                <Lock size={8} className="text-white" />
              </div>
            )}
            <span className="absolute left-full ml-4 px-2 py-1 bg-purple-500 text-[8px] font-black uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">Knowledge Lab</span>
          </button>
          <button 
            onClick={() => setActiveTab('assets')}
            className={`p-3 rounded-2xl transition-all group relative ${activeTab === 'assets' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
          >
            <Layers size={20}/>
            <span className="absolute left-full ml-4 px-2 py-1 bg-white/10 text-[8px] font-black uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">Assets</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`p-3 rounded-2xl transition-all group relative ${activeTab === 'settings' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
          >
            <Settings2 size={20}/>
            <span className="absolute left-full ml-4 px-2 py-1 bg-white/10 text-[8px] font-black uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">Settings</span>
          </button>
        </aside>

        {/* Assets Library Drawer */}
        {activeTab === 'assets' && (
          <aside className="w-72 border-r border-white/5 bg-[#0a0a14] flex flex-col p-6 animate-slide-in-left overflow-y-auto">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-400 mb-6">B-Roll Library</h3>
            <div className="grid grid-cols-1 gap-4">
              {libraryAssets.map(asset => (
                <div 
                  key={asset.id} 
                  onClick={() => selectAssetForSegment(asset.url)}
                  className="aspect-video rounded-2xl bg-white/5 border border-white/10 overflow-hidden group cursor-pointer hover:border-purple-500/50 transition-all relative"
                >
                  <div className="w-full h-full bg-cover bg-center opacity-40 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `url('${asset.url}')` }} />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-[8px] font-black uppercase bg-purple-500 px-2 py-1 rounded">Apply Scene</span>
                  </div>
                  <div className="p-3 bg-black/40 backdrop-blur-sm -mt-12 relative z-10 flex justify-between items-center">
                    <span className="text-[8px] font-black uppercase truncate w-32">{asset.name}</span>
                    <Plus size={12} className="text-purple-400" />
                  </div>
                </div>
              ))}
              <button className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-[9px] font-black uppercase text-white/20 hover:border-purple-500/20 hover:text-purple-500/40 transition-all">
                Search External
              </button>
            </div>
          </aside>
        )}

        {/* Settings Table Drawer */}
        {activeTab === 'settings' && (
          <aside className="w-72 border-r border-white/5 bg-[#0a0a14] flex flex-col p-6 animate-slide-in-left overflow-y-auto">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-400 mb-6">Studio Settings</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/30 tracking-widest ml-1">Telegram Chat ID</label>
                <input 
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => updateTelegramId(e.target.value)}
                  placeholder="e.g. 12345678"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white/60 focus:outline-none focus:border-purple-500/50"
                />
                <p className="text-[8px] text-white/20 font-bold uppercase tracking-tight">Used for final production delivery</p>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <h4 className="text-[10px] font-black uppercase text-purple-400 tracking-[0.2em]">External Connections</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[9px] font-black uppercase text-white/30 tracking-widest">HeyGen API Key</label>
                    <span className="text-[8px] font-bold text-blue-400 uppercase tracking-tighter cursor-help" title="Required for personal custom avatars">SaaS Policy</span>
                  </div>
                  <input 
                    type="password"
                    value={heygenKey}
                    onChange={(e) => updateHeygenKey(e.target.value)}
                    placeholder="sk_v2_..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white/60 focus:outline-none focus:border-blue-500/50"
                  />
                  <p className="text-[8px] text-white/20 font-bold leading-relaxed uppercase tracking-tight">
                    {heygenKey ? '✅ Personal key connected' : '⚠️ Using platform default (Stock only)'}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Knowledge Lab Drawer */}
        {activeTab === 'knowledge' && currentProfile && (
          <KnowledgeLab 
            profile={currentProfile} 
            onProfileUpdate={(updated) => setCurrentProfile(updated)} 
          />
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
              </div>

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
                  style={{ width: `${(activeIndex / (manifest?.segments.length || 1)) * 100}%` }}
                />
              </div>
            </div>
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
                        {segment.status === 'ready' ? '✅ Ready' : segment.status === 'rendering' ? '⏳ Rendering' : '🟠 Pending'}
                      </p>
                      <span className="text-[8px] font-black text-white/20 uppercase">S{index + 1}</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className={`h-full transition-all duration-[3000ms] ${segment.status === 'ready' ? 'bg-green-500/50 w-full' : segment.status === 'rendering' ? 'bg-purple-500 w-1/2 animate-shimmer' : 'bg-white/10 w-0'}`} />
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
        <aside className="w-80 border-l border-white/5 bg-[#0a0a14] flex flex-col overflow-y-auto z-30">
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
                <button 
                  onClick={() => regenerateSegment(selectedSegment.id)}
                  disabled={!!isRegenerating}
                  className="w-full py-5 rounded-[2rem] bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:shadow-[0_0_30px_rgba(147,51,234,0.4)] transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isRegenerating === selectedSegment.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 size={16}/>
                  )}
                  {isRegenerating === selectedSegment.id ? 'Regenerating...' : 'Regenerate Scene'}
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
      </div>


      <style jsx global>{`
        @keyframes kenburns {
          from { transform: scale(1) translate(0, 0); }
          to { transform: scale(1.1) translate(-1%, -1%); }
        }
        .animate-ken-burns {
          animation: kenburns 10s ease infinite alternate;
        }
      `}</style>
    </div>
  );
}
