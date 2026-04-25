'use client';

import React from 'react';
import { 
  Dna, Brain, Scissors, Video, Download, 
  Monitor, FileVideo, RefreshCw, Type, Trash2 
} from 'lucide-react';

interface StudioSidebarProps {
  activeTab: 'concept' | 'teleprompter' | 'assembly' | 'knowledge' | 'assets';
  setActiveTab: (tab: any) => void;
  cameraStream: MediaStream | null;
  isRecordingVideo: boolean;
  recordingTime: number;
  facingMode: 'user' | 'environment';
  videoResolution: string;
  videoDevices: MediaDeviceInfo[];
  audioDevices: MediaDeviceInfo[];
  selectedVideoDeviceId: string;
  selectedAudioDeviceId: string;
  initCamera: () => Promise<void>;
  stopCamera: () => void;
  setFacingMode: (mode: any) => void;
  setIsVideoMirrored: (mirrored: boolean) => void;
  isVideoMirrored: boolean;
  setVideoResolution: (res: any) => void;
  setSelectedVideoDeviceId: (id: string) => void;
  setSelectedAudioDeviceId: (id: string) => void;
  useCustomScript: boolean;
  setUseCustomScript: (use: boolean) => void;
  customScript: string;
  setCustomScript: (script: string) => void;
  manifest: any;
  isMirrored: boolean;
  setIsMirrored: (mirrored: boolean) => void;
  scrollSpeed: number;
  setScrollSpeed: (speed: number) => void;
  prompterWidth: number;
  setPrompterWidth: (width: number) => void;
  textSize: 'sm' | 'md' | 'lg';
  setTextSize: (size: any) => void;
  scriptOpacity: number;
  setScriptOpacity: (opacity: number) => void;
  t: (key: string, data?: any) => string;
  currentProfile: any;
}

export const StudioSidebar: React.FC<StudioSidebarProps> = ({
  activeTab,
  setActiveTab,
  cameraStream,
  isRecordingVideo,
  recordingTime,
  facingMode,
  videoResolution,
  videoDevices,
  audioDevices,
  selectedVideoDeviceId,
  selectedAudioDeviceId,
  initCamera,
  stopCamera,
  setFacingMode,
  setIsVideoMirrored,
  isVideoMirrored,
  setVideoResolution,
  setSelectedVideoDeviceId,
  setSelectedAudioDeviceId,
  useCustomScript,
  setUseCustomScript,
  customScript,
  setCustomScript,
  manifest,
  isMirrored,
  setIsMirrored,
  scrollSpeed,
  setScrollSpeed,
  prompterWidth,
  setPrompterWidth,
  textSize,
  setTextSize,
  scriptOpacity,
  setScriptOpacity,
  t,
  currentProfile,
}) => {
  return (
    <aside className="w-80 bg-[#0a0a14] border-r border-white/5 flex flex-col z-20 shadow-2xl">
      <div className="p-8 border-b border-white/5 flex items-center justify-between">
        <h1 className="text-sm font-black tracking-[0.2em] uppercase italic text-white flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
           Viral<span className="text-purple-500">E</span>
        </h1>
        {currentProfile?.tier === 'premium' && (
           <div className="px-2 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-[7px] font-black text-yellow-500 uppercase tracking-widest">PRO</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-8">
        {/* Production Mode Switcher */}
        <div className="space-y-4">
          <label className="text-[9px] font-black uppercase text-white/30 tracking-widest ml-1">Production Pipeline</label>
          <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'concept', icon: Brain, label: '1. Лаборатория идей', desc: 'Смыслы и текст' },
              { id: 'teleprompter', icon: Video, label: '2. Студия Записи', desc: 'Создание A-Roll' },
              { id: 'assembly', icon: Scissors, label: '3. Продакшн', desc: 'Монтаж и B-Roll' },
              { id: 'knowledge', icon: Dna, label: 'Shadow Analytics', desc: 'Настройка ДНК' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-4 p-4 rounded-3xl border transition-all duration-500 text-left ${activeTab === tab.id ? 'bg-purple-500 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)] text-white' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/20'}`}
              >
                <div className={`p-2 rounded-xl ${activeTab === tab.id ? 'bg-white/20' : 'bg-white/5'}`}>
                  <tab.icon size={20} className={activeTab === tab.id ? 'animate-pulse' : ''} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                  <span className="text-[7px] font-bold opacity-40 uppercase">{tab.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'teleprompter' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
             {/* Studio Dashboard for Teleprompter */}
             <div className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[9px] font-black uppercase text-white/30 tracking-widest">Hardware Suite</label>
                  <div className="flex items-center gap-2">
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
                          setFacingMode(facingMode === 'user' ? 'environment' : 'user');
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

                    <div className="space-y-1">
                      <label className="text-[7px] font-black uppercase text-white/20 tracking-widest ml-1">Resolution</label>
                      <div className="grid grid-cols-4 gap-1">
                        {(['360p', '720p', '1080p', '4k'] as const).map(res => {
                          const isLocked = res === '4k' && currentProfile?.tier !== 'premium';
                          return (
                            <button 
                              key={res}
                              disabled={isLocked}
                              onClick={() => { setVideoResolution(res); setTimeout(initCamera, 100); }}
                              className={`py-2 rounded-lg text-[8px] font-black uppercase border transition-all flex items-center justify-center gap-1 ${videoResolution === res ? 'bg-purple-500/20 border-purple-500/40 text-purple-400 shadow-lg shadow-purple-500/10' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'} ${isLocked ? 'opacity-40 cursor-not-allowed bg-black/20' : ''}`}
                            >
                              {res}
                              {isLocked && <Trash2 size={8} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
             </div>

             {/* Script Settings */}
             <div className="space-y-6">
                <div className="space-y-4">
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">{t('teleprompter.scrollPace')}</span>
                  <input 
                    type="range" min="0" max="10" step="0.5"
                    value={scrollSpeed}
                    onChange={(e) => setScrollSpeed(Number(e.target.value))}
                    className="w-full accent-purple-500 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer" 
                  />
                </div>

                <div className="space-y-4">
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Viewport Width</span>
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
                        className={`flex-1 py-3 rounded-xl flex items-center justify-center text-[11px] transition-all border ${textSize === size ? 'bg-purple-500 border-purple-500 font-black text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                      >
                        {size.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-6 border-t border-white/5 p-8">
        <p className="text-[7px] font-bold text-center text-white/5 uppercase tracking-[0.4em]">Viral Engine v3.2</p>
      </div>
    </aside>
  );
};
