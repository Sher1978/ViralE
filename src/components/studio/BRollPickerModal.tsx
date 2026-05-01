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
  const [previewVideo, setPreviewVideo] = useState<any | null>(null);

  // ⚡ AUTO-OPTIMIZE & SEARCH ON OPEN
  React.useEffect(() => {
    if (isOpen) {
      const init = async () => {
        // If we have pre-fetched results, use them first
        if (preFetchedResults && preFetchedResults.length > 0) {
          setVideos(preFetchedResults);
        } else {
          // Otherwise, optimize and search
          await handleOptimizePrompt();
        }
      };
      init();
    }
  }, [isOpen]);

  // Trigger search when searchQuery changes from optimization
  React.useEffect(() => {
    if (isOpen && searchQuery && searchQuery !== segmentText) {
      handleSearch();
    }
  }, [searchQuery, isOpen]);

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
        // handleSearch will be triggered by useEffect
      } else {
        // Fallback to direct search if optimization fails
        handleSearch(segmentText);
      }
    } catch (err) {
      console.error('Optimization failed', err);
      handleSearch(segmentText);
    } finally {
      setIsOptimizing(false);
    }
  };

  if (!isOpen) return null;

  const handleGenerateAI = async () => {
    if (!segmentText) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-broll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: searchQuery || segmentText })
      });
      const { jobId } = await res.json();
      if (!jobId) throw new Error('Failed to start generation');

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
      <div className="flex items-center justify-between mb-6 flex-none">
        <div>
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
             <Film size={28} className="text-purple-500" />
             B-Roll <span className="text-purple-500">Hunter</span>
          </h2>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Finding visual energy for your scene</p>
        </div>
        <button 
          onClick={onClose}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all transform active:rotate-90"
        >
          <X size={24} />
        </button>
      </div>

      {/* ── SEARCH RESULTS ── */}
      <div className="flex-1 min-h-0 flex flex-col">
         {isSearching || isOptimizing ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
               <div className="relative">
                 <RefreshCcw size={48} className="text-purple-500 animate-spin opacity-20" />
                 <Sparkles size={24} className="text-purple-400 absolute inset-0 m-auto animate-pulse" />
               </div>
               <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/30 animate-pulse">
                 {isOptimizing ? 'AI Optimizing Prompt...' : 'Scanning Visual Vault...'}
               </p>
            </div>
         ) : (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto pb-10 custom-scrollbar pr-2">
              {videos.map((item) => (
                 <div 
                   key={item.id}
                   onClick={() => setPreviewVideo(item)}
                   className="group relative aspect-[9/16] rounded-[2.5rem] overflow-hidden bg-white/5 border border-white/5 hover:border-purple-500/50 cursor-pointer transition-all shadow-2xl"
                 >
                    <img src={item.previewUrl} className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent opacity-90 group-hover:opacity-60 transition-opacity z-10" />
                    
                    <div className="absolute bottom-5 left-5 right-5 z-20">
                       <span className="text-[8px] font-black uppercase text-purple-400 mb-1 block tracking-[0.2em]">{item.source === 'movie' ? 'Library Clip' : 'AI Generated'}</span>
                       <h4 className="text-white font-bold italic uppercase tracking-tighter text-[11px] leading-tight opacity-60 line-clamp-2">{item.title}</h4>
                    </div>

                    <div className="absolute top-4 right-4 z-20">
                       <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Search size={14} className="text-white" />
                       </div>
                    </div>
                 </div>
              ))}
              {videos.length === 0 && (
                 <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/5 rounded-[3rem]">
                    <Video size={40} className="text-white/10" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">No matching fragments found</p>
                    <button onClick={() => handleSearch()} className="px-6 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase text-white/40">Retry Search</button>
                 </div>
              )}
           </div>
         )}
      </div>

      {/* ── FOOTER ACTIONS ── */}
      <div className="flex-none pt-6 border-t border-white/5 flex flex-col gap-5">
          <div className="bg-white/5 rounded-[2.5rem] p-5 border border-white/5 focus-within:border-purple-500/50 transition-all">
             <div className="flex justify-between items-center mb-3">
               <span className="text-[9px] font-black uppercase tracking-widest text-white/20 block ml-1">Search & Generation Prompt</span>
               <button 
                 onClick={handleOptimizePrompt}
                 disabled={isOptimizing}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-black uppercase hover:bg-purple-500/20 transition-all active:scale-95"
               >
                 <Sparkles size={10} />
                 Refine with AI
               </button>
             </div>
             <div className="flex gap-4 items-center">
               <textarea 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSearch())}
                 rows={1}
                 className="flex-1 bg-transparent text-sm font-bold text-white italic outline-none resize-none placeholder:text-white/10 leading-relaxed"
                 placeholder="Describe the mood or action..."
               />
               <button
                 onClick={() => handleSearch()}
                 disabled={isSearching}
                 className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all active:scale-95"
               >
                 {isSearching ? <RefreshCcw size={14} className="animate-spin" /> : <Search size={14} />}
               </button>
             </div>
          </div>

          <button 
              onClick={handleGenerateAI}
              disabled={isGenerating || !searchQuery}
              className="w-full h-16 rounded-[2rem] bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50 transition-all"
          >
              {isGenerating ? <RefreshCcw size={18} className="animate-spin" /> : <><Sparkles size={18} /> Generate Unique Scene ($0.10) <ArrowRight size={16} /></>}
          </button>
      </div>

      {/* ── FULL SCREEN PREVIEW OVERLAY ── */}
      {previewVideo && (
        <div className="fixed inset-0 z-[110] bg-black flex flex-col animate-in fade-in zoom-in duration-300">
           <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
              <button 
                onClick={() => setPreviewVideo(null)}
                className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white"
              >
                <ArrowRight size={24} className="rotate-180" />
              </button>
              <div className="px-4 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase tracking-widest">
                 Previewing Clip
              </div>
           </div>

           <video 
              src={previewVideo.videoUrl}
              autoPlay
              loop
              playsInline
              className="w-full h-full object-cover"
           />

           <div className="absolute bottom-10 left-6 right-6 z-20 space-y-4">
              <div className="p-6 rounded-[2.5rem] bg-black/60 backdrop-blur-xl border border-white/10 space-y-2">
                 <h3 className="text-xl font-black italic uppercase text-white tracking-tighter">{previewVideo.title}</h3>
                 <p className="text-xs text-white/40 font-medium leading-relaxed">{previewVideo.tags?.join(' • ')}</p>
              </div>
              
              <button 
                 onClick={() => {
                   onSelect(previewVideo.videoUrl);
                   setPreviewVideo(null);
                 }}
                 className="w-full h-20 rounded-[2.5rem] bg-white text-black font-black uppercase tracking-[0.3em] text-sm shadow-[0_0_50px_rgba(255,255,255,0.3)] active:scale-95 transition-all"
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
