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
}

const BRollPickerModal: React.FC<BRollPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  segmentText,
  emotionTags = ['cinematic', 'dynamic', 'hollywood'],
  projectId
}) => {
  const [activeSource, setActiveSource] = useState<'vault' | 'ai'>('vault');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  // Movie Vault Mock Data
  const movieItems: BRollOption[] = [
    { id: 'mv-1', source: 'movie', title: 'The Great Gatsby', previewUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=400&h=225&fit=crop' },
    { id: 'mv-2', source: 'movie', title: 'The Wolf of Wall Street', previewUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=400&h=225&fit=crop' },
    { id: 'mv-3', source: 'movie', title: 'Interstellar', previewUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=400&h=225&fit=crop' },
    { id: 'mv-4', source: 'movie', title: 'Inception', previewUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400&h=225&fit=crop' },
  ];

  const handleGenerateAI = async () => {
    if (!segmentText) return;
    setIsGenerating(true);
    try {
      // 1. Submit Generation Job
      const res = await fetch('/api/[locale]/api/ai/generate-broll', {
        method: 'POST',
        body: JSON.stringify({ prompt: segmentText })
      });
      const { jobId } = await res.json();
      
      if (!jobId) throw new Error('Failed to start generation');

      // 2. Poll for results
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const statusRes = await fetch(`/api/[locale]/api/ai/generate-broll?jobId=${jobId}`);
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
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl p-4 md:p-8 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
             <Film size={28} className="text-purple-500" />
             B-Roll <span className="text-purple-500">Hunter</span>
          </h2>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Finding visual energy for your scene</p>
        </div>
        <button 
          onClick={onClose}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all transform active:rotate-90"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 gap-6">
        {/* Search & Generation Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Generator Card */}
          <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 rounded-[2.5rem] border border-purple-500/30 p-10 relative overflow-hidden group shadow-[0_0_50px_rgba(168,85,247,0.1)]">
             <div className="absolute top-0 right-0 p-8 transform group-hover:scale-110 transition-transform">
                <Sparkles size={64} className="text-purple-400 opacity-20" />
             </div>
             
             <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 mb-8">
                   <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,1)]" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-purple-200">Stability AI Engine</span>
                </div>
                
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-3">AI Synthesis</h3>
                <p className="text-white/50 text-sm mb-8 max-w-sm leading-relaxed font-medium">
                  Can't find the right movie clip? Generate a unique cinematic visual concept matching your expert brand DNA.
                </p>
                
                <div className="flex gap-2">
                   <button 
                     onClick={handleGenerateAI}
                     disabled={isGenerating}
                     className="flex-1 h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-purple-200 transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                   >
                     {isGenerating ? (
                       <RefreshCcw size={20} className="animate-spin text-purple-600" />
                     ) : (
                       <>
                         Synthesize Now ($0.10)
                         <ArrowRight size={18} />
                       </>
                     )}
                   </button>
                </div>
             </div>
          </div>

          {/* Context Card */}
          <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-8 flex flex-col justify-center">
             <span className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-4">Scene Context</span>
             <p className="text-lg font-medium text-white italic line-clamp-3 mb-6 leading-relaxed">
               "{segmentText || 'Select a segment to see context...'}"
             </p>
             <div className="flex flex-wrap gap-2">
                {emotionTags.map(tag => (
                   <span key={tag} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold text-white/60">
                      #{tag}
                   </span>
                ))}
             </div>
          </div>
        </div>

        {/* Source Headers */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
           <div className="flex gap-8">
              <button onClick={() => setActiveSource('vault')} 
                className={`text-[12px] font-black uppercase tracking-widest transition-all ${activeSource === 'vault' ? 'text-white' : 'text-white/20'}`}>
                Movie Vault
              </button>
              <button onClick={() => setActiveSource('ai')}
                className={`text-[12px] font-black uppercase tracking-widest transition-all ${activeSource === 'ai' ? 'text-purple-400' : 'text-white/20'}`}>
                AI Generated
              </button>
           </div>
        </div>

         <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
               {movieItems.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => onSelect(item.previewUrl)}
                    className="group relative aspect-video rounded-[2rem] overflow-hidden bg-white/5 border border-white/5 hover:border-purple-500/50 cursor-pointer transition-all"
                  >
                     <img src={item.previewUrl} className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity z-10" />
                     
                     <div className="absolute bottom-6 left-6 z-20">
                        <span className="text-[10px] font-black uppercase text-white/40 mb-1 block">Movie Fragment</span>
                        <h4 className="text-white font-black italic uppercase tracking-tighter text-lg">{item.title}</h4>
                     </div>
 
                     <div className="absolute inset-0 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-purple-600/30">
                        <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                           <Check size={28} />
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default BRollPickerModal;
