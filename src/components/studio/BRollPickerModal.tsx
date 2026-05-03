'use client';

import React, { useState, useEffect, useRef } from 'react';
import { veoService } from '@/lib/services/veoService';
import { 
  X, Search, Sparkles, Film, 
  RefreshCcw, ArrowRight, Video, Play, Upload
} from 'lucide-react';

interface VideoItem {
  id: string;
  source: 'stock' | 'movie' | 'ai' | 'giphy';
  title?: string;
  previewUrl: string;
  videoUrl: string;
  tags?: string[];
}

interface BRollPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  segmentText?: string;
  emotionTags?: string[];
  projectId?: string;
  preFetchedResults?: any[];
}

const BRollPickerModal: React.FC<BRollPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  segmentText,
  emotionTags = ['cinematic', 'dynamic', 'hollywood'],
  projectId,
  preFetchedResults
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState(segmentText || '');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const loaderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⚡ AUTO-OPTIMIZE & SEARCH ON OPEN
  useEffect(() => {
    if (isOpen) {
      if (preFetchedResults && preFetchedResults.length > 0) {
        setVideos(preFetchedResults);
      } else {
        handleOptimizePrompt();
      }
    }
  }, [isOpen]);

  // Trigger search when searchQuery changes from optimization
  useEffect(() => {
    if (isOpen && searchQuery && searchQuery !== segmentText) {
      handleSearch();
    }
  }, [searchQuery]);

  // Reset loader on previewVideo change
  useEffect(() => {
    if (previewVideo) {
      setIsVideoLoading(true);
      // iOS Safari fallback: force-hide loader after 4 seconds no matter what
      loaderTimeoutRef.current = setTimeout(() => {
        setIsVideoLoading(false);
      }, 4000);
    } else {
      if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
    }
    return () => {
      if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
    };
  }, [previewVideo]);

  const handleSearch = async (queryOverride?: string) => {
    const query = queryOverride || searchQuery;
    if (!query) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/ai/broll-search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOptimizePrompt = async () => {
    if (!segmentText) return;
    setIsOptimizing(true);
    try {
      const res = await fetch('/api/ai/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: segmentText })
      });
      const data = await res.json();
      if (data.optimized) {
        setSearchQuery(data.optimized);
      } else {
        handleSearch(segmentText);
      }
    } catch (err) {
      console.error('Optimization failed', err);
      handleSearch(segmentText);
    } finally {
      setIsOptimizing(false);
    }
  };

  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local loading state
    setIsSearching(true);
    try {
      const localUrl = URL.createObjectURL(file);
      // We can also upload to server if needed, but local is faster for editing
      // onSelect will handle the URL
      onSelect(localUrl);
      onClose();
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  const handleGenerateAI = async () => {
    if (!segmentText) return;
    setIsGenerating(true);
    const tempId = `ai-temp-${Date.now()}`;
    
    // Add a placeholder to the list
    setVideos(prev => [{
      id: tempId,
      source: 'ai',
      title: 'Synthesizing scene...',
      previewUrl: '', // Will show loading state
      videoUrl: ''
    }, ...prev]);

    try {
      const res = await fetch('/api/ai/generate-broll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: searchQuery || segmentText })
      });
      const data = await res.json();
      if (!data.jobId) throw new Error(data.error || 'Failed to start generation');

      const jobId = data.jobId;
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch(`/api/ai/generate-broll?jobId=${jobId}`);
          const { status, url } = await statusRes.json();
          
          if (status === 'completed' && url) {
            clearInterval(poll);
            setIsGenerating(false);
            // Replace placeholder with real result
            setVideos(prev => prev.map(v => v.id === tempId ? {
              ...v,
              id: jobId,
              title: 'AI Result',
              previewUrl: url,
              videoUrl: url
            } : v));
          } else if (status === 'failed' || attempts > 40) { // Increase timeout to 2 mins
            clearInterval(poll);
            setIsGenerating(false);
            setVideos(prev => prev.filter(v => v.id !== tempId));
            alert('AI Synthesis failed or timed out. Please try a different prompt.');
          }
        } catch (pollErr) {
          console.error('Polling failed', pollErr);
        }
      }, 3000);
    } catch (error: any) {
      console.error("Generation failed", error);
      setIsGenerating(false);
      setVideos(prev => prev.filter(v => v.id !== tempId));
      alert(`Generation failed: ${error.message}`);
    }
  };

  // Source badge helper
  const getSourceBadge = (item: VideoItem) => {
    const { source } = item;
    if (source === 'giphy') return { label: 'GIF • GIPHY', color: 'text-pink-400' };
    if (source === 'ai') return { label: 'AI Generated', color: 'text-purple-400' };
    if (source === 'movie') return { label: 'Movie • AI Semantic', color: 'text-emerald-400' };
    if (source === 'stock' && item.tags?.includes('pixabay')) return { label: 'Stock • Pixabay', color: 'text-cyan-400' };
    return { label: 'Stock • Pexels', color: 'text-blue-400' };
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/97 backdrop-blur-3xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-none border-b border-white/5">
        <div>
          <h2 className="text-xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
            <Film size={22} className="text-purple-500" />
            B-Roll <span className="text-purple-500">Hunter</span>
          </h2>
          <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mt-0.5">Finding visual energy for your scene</p>
        </div>
        <button 
          onClick={onClose}
          className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
        >
          <X size={22} />
        </button>
      </div>

      {/* ── SEARCH RESULTS ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-4">
        {isSearching || isOptimizing ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-20">
            <div className="relative">
              <RefreshCcw size={48} className="text-purple-500 animate-spin opacity-20" />
              <Sparkles size={24} className="text-purple-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/30 animate-pulse">
              {isOptimizing ? 'AI Optimizing Prompt...' : 'Scanning Visual Vault...'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {videos.map((item) => {
              const badge = getSourceBadge(item);
              return (
                <div
                  key={item.id}
                  onClick={() => setPreviewVideo(item)}
                  className="group relative overflow-hidden bg-white/5 border border-white/8 hover:border-purple-500/50 cursor-pointer transition-all rounded-lg"
                  style={{ aspectRatio: '9/16' }}
                >
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-purple-900/20 backdrop-blur-sm">
                      <RefreshCcw size={24} className="text-purple-400 animate-spin" />
                      <span className="text-[8px] font-black text-purple-300 uppercase tracking-widest animate-pulse">Synthesizing...</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

                  {/* Play, Upload icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play, Upload size={18} className="text-white fill-white ml-0.5" />
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 z-10">
                    <span className={`text-[8px] font-black uppercase mb-0.5 block tracking-widest ${badge.color}`}>
                      {badge.label}
                    </span>
                    <h4 className="text-white font-bold uppercase tracking-tight text-[10px] leading-tight opacity-70 line-clamp-1">
                      {item.title}
                    </h4>
                  </div>
                </div>
              );
            })}
            {videos.length === 0 && (
              <div className="col-span-2 py-16 flex flex-col items-center justify-center gap-4 border border-dashed border-white/10 rounded-xl">
                <Video size={36} className="text-white/10" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 text-center">No clips found</p>
                <button
                  onClick={() => handleSearch()}
                  className="px-5 py-2 bg-white/5 rounded-xl text-[9px] font-black uppercase text-white/40"
                >
                  Retry Search
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FOOTER ACTIONS ── */}
      <div className="flex-none px-4 py-4 border-t border-white/5 space-y-3">
        <div className="bg-white/5 rounded-lg px-4 py-3 border border-white/8 flex gap-3 items-center">
          <textarea
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSearch())}
            rows={1}
            className="flex-1 bg-transparent text-sm font-bold text-white italic outline-none resize-none placeholder:text-white/20 leading-relaxed"
            placeholder="Describe the mood or action..."
          />
          <button
            onClick={() => handleSearch()}
            disabled={isSearching}
            className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center flex-none transition-all active:scale-95"
          >
            {isSearching ? <RefreshCcw size={13} className="animate-spin" /> : <Search size={13} />}
          </button>
        </div>


        <div className="flex gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 h-14 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Upload size={16} /> My Media
          </button>
          
          <button
            onClick={handleGenerateAI}
            disabled={isGenerating || !searchQuery}
            className="flex-[2] h-14 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-[0.15em] text-[11px] flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50 transition-all"
          >
            {isGenerating
              ? <><RefreshCcw size={16} className="animate-spin" /> Generating...</>
              : <><Sparkles size={16} /> Generate AI Scene <ArrowRight size={14} /></>
            }
          </button>
        </div>
        
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="video/*,image/*" 
          className="hidden" 
          onChange={handleFileUpload}
        />

      </div>

      {/* ── FULL SCREEN PREVIEW OVERLAY ── */}
      {previewVideo && (
        <div className="fixed inset-0 z-[120] bg-black flex flex-col">
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-5 z-20">
            <button
              onClick={() => setPreviewVideo(null)}
              className="p-3 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-white active:scale-95"
            >
              <ArrowRight size={20} className="rotate-180" />
            </button>
            <div className="px-4 py-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase tracking-widest">
              {getSourceBadge(previewVideo).label}
            </div>
          </div>

          {/* Video */}
            <div className="relative w-full h-full">
              {isVideoLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-4 z-10">
                  <RefreshCcw size={36} className="text-purple-500 animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Loading Scene...</p>
                </div>
              )}
              <video
                ref={videoRef}
                key={previewVideo.videoUrl}
                src={previewVideo.videoUrl}
                autoPlay, Upload
                muted
                loop
                playsInline
                crossOrigin="anonymous"
                onLoadStart={() => setIsVideoLoading(true)}
                onCanPlay, Upload={() => {
                  if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
                  setIsVideoLoading(false);
                  videoRef.current?.play().catch(e => console.warn('Autoplay prevented', e));
                }}
                onLoadedData={() => {
                  if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
                  setIsVideoLoading(false);
                }}
                onError={() => setIsVideoLoading(false)}
                className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoLoading ? 'opacity-0' : 'opacity-100'}`}
              />
            </div>

          {/* Bottom bar */}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-20 space-y-3">
            <div className="p-5 rounded-xl bg-black/70 backdrop-blur-xl border border-white/10 space-y-1">
              <h3 className="text-lg font-black italic uppercase text-white tracking-tighter">{previewVideo.title}</h3>
              <p className="text-xs text-white/40 font-medium">{previewVideo.tags?.join(' • ')}</p>
            </div>
            <button
              onClick={() => {
                onSelect(previewVideo.videoUrl);
                setPreviewVideo(null);
              }}
              className="w-full h-16 rounded-xl bg-white text-black font-black uppercase tracking-[0.3em] text-sm shadow-[0_0_40px_rgba(255,255,255,0.2)] active:scale-95 transition-all"
            >
              Select This Clip
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BRollPickerModal;
