'use client';

import React, { useState } from 'react';
import { veoService } from '@/lib/services/veoService';
import { 
  X, Search, Sparkles, Film, 
  TrendingUp, Clock, Check, 
  RefreshCcw, ArrowRight, Video
} from 'lucide-react';

interface BRollOption {
  id: string;
  source: 'movie' | 'ai';
  title?: string;
  previewUrl: string;
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
  const [activeSource, setActiveSource] = useState<'vault' | 'ai'>('vault');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState(segmentText || '');
  const [videos, setVideos] = useState<any[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // ⚡ SYNC PRE-FETCHED RESULTS
  React.useEffect(() => {
    if (isOpen && preFetchedResults && preFetchedResults.length > 0) {
      setVideos(preFetchedResults);
    } else if (isOpen && (!videos.length || searchQuery !== segmentText)) {
      handleSearch();
    }
  }, [isOpen, preFetchedResults]);

  React.useEffect(() => {
    if (isOpen && searchQuery) {
      handleSearch();
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/ai/broll-search?query=${encodeURIComponent(searchQuery)}`);
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
        body: JSON.stringify({ context: segmentText })
      });
      const data = await res.json();
      if (data.optimized) {
        setSearchQuery(data.optimized);
      }
    } catch (err) {
      console.error('Optimization failed', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  if (!isOpen) return null;

  const handleGenerateAI = async () => {
    if (!segmentText) return;
    setIsGenerating(true);
    try {
      // 1. Submit Generation Job
      const res = await fetch('/api/ai/generate-broll', {
        method: 'POST',
        body: JSON.stringify({ prompt: searchQuery || segmentText })
      });
      const { jobId } = await res.json();
      
      if (!jobId) throw new Error('Failed to start generation');

      // 2. Poll for results
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const statusRes = await fetch(`/api/ai/generate-broll?jobId=${jobId}`);
        const { status, url } = await statusRes.json();
        
        if (status === 'completed' && url) {
          clearInterval(poll);
          setIsGenerating(false);
          onSelect(url);
        } else if (status === 'failed' || attempts > 20) {
          clearInterval(poll);
          setIsGenerating(false);
          alert('AI Synthesis failed. Please try a different prompt.');
        }
      }, 3000);

    } catch (error) {
      console.error("Higgsfield generation failed", error);
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl p-4 md:p-8 overflow-hidden flex flex-col no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-none">
        <div>
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
             <Film size={28} className="text-purple-500" />
             B-Roll <span className="text-purple-500">Hunter</span>
          </h2>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Finding visual energy for your scene</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
             <input 
               type="text"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
               placeholder="Search Stock Library..."
               className="w-64 h-12 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all font-medium"
             />
             <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" />
          </div>
          <button 
            onClick={onClose}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all transform active:rotate-90"
          >
            <X size={24} />
          </button>
        </div>
      </div>

        {/* ── SEARCH RESULTS (Top Priority) ── */}
        <div className="flex-1 min-h-0 flex flex-col">
           {isSearching ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                 <RefreshCcw size={40} className="text-white/10 animate-spin" />
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Scanning Vault...</p>
              </div>
           ) : (
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-10 custom-scrollbar pr-2">
                {videos.map((item) => (
                   <div 
                     key={item.id}
                     onClick={() => onSelect(item.videoUrl)}
                     className="group relative aspect-[9/16] rounded-[2rem] overflow-hidden bg-white/5 border border-white/5 hover:border-purple-500/50 cursor-pointer transition-all"
                   >
                      <img src={item.previewUrl} className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity z-10" />
                      
                      <div className="absolute bottom-4 left-4 right-4 z-20">
                         <span className="text-[9px] font-black uppercase text-purple-500 mb-1 block tracking-widest">Portrait Fragment</span>
                         <h4 className="text-white font-black italic uppercase tracking-tighter text-[10px] leading-tight opacity-40 line-clamp-2">{item.title}</h4>
                      </div>
  
                      <div className="absolute inset-0 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-purple-600/30">
                         <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                            <Check size={20} />
                         </div>
                      </div>
                   </div>
                ))}
                {videos.length === 0 && (
                   <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/5 rounded-[3rem]">
                      <Video size={40} className="text-white/10" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">No matching fragments found</p>
                      <button onClick={handleSearch} className="px-6 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase text-white/40">Retry Search</button>
                   </div>
                )}
             </div>
           )}
        </div>

        {/* ── FOOTER ACTIONS (Secondary) ── */}
        <div className="flex-none pt-6 border-t border-white/5 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Context (Left) */}
            <div className="lg:col-span-2 relative group">
               <div className="bg-white/5 rounded-3xl p-6 border border-white/5 focus-within:border-purple-500/50 transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/30 block">Generation & Search Prompt</span>
                    <button 
                      onClick={handleOptimizePrompt}
                      disabled={isOptimizing}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-black uppercase hover:bg-purple-500/20 transition-all active:scale-95"
                    >
                      {isOptimizing ? <RefreshCcw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      AI Optimize
                    </button>
                  </div>
                  <textarea 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    rows={2}
                    className="w-full bg-transparent text-xs font-medium text-white italic outline-none resize-none placeholder:text-white/10"
                    placeholder="Enter visual description..."
                  />
               </div>
            </div>

            {/* AI Action (Right) */}
            <button 
                onClick={handleGenerateAI}
                disabled={isGenerating || !searchQuery}
                className="h-16 rounded-3xl bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50 transition-all px-8 group"
            >
                {isGenerating ? (
                    <RefreshCcw size={16} className="animate-spin" />
                ) : (
                    <>
                        <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
                        Synthesize AI-Clip ($0.10)
                        <ArrowRight size={14} />
                    </>
                )}
            </button>
        </div>
      </div>
  );
};

export default BRollPickerModal;
