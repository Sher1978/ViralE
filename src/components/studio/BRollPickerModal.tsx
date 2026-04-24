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
  source: 'giphy' | 'mixkit' | 'ai';
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
  emotionTags = ['cinematic', 'dynamic', 'vibrant'],
  projectId
}) => {
  const [activeSource, setActiveSource] = useState<'all' | 'giphy' | 'mixkit' | 'ai'>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  // Mock data for demo
  const stockItems: BRollOption[] = [
    { id: '1', source: 'giphy', previewUrl: '/mock/giphy-1.webp' },
    { id: '2', source: 'mixkit', previewUrl: '/mock/mixkit-1.webp' },
    { id: '3', source: 'giphy', previewUrl: '/mock/giphy-2.webp' },
    { id: '4', source: 'mixkit', previewUrl: '/mock/mixkit-2.webp' },
  ];

  const handleGenerateAI = async () => {
    if (!projectId || !segmentText) return;
    setIsGenerating(true);
    try {
      await veoService.generateBRoll({
        prompt: segmentText,
        projectId: projectId,
        aspectRatio: '9:16'
      });
      // In a real app we'd wait for status or notify user
      setTimeout(() => setIsGenerating(false), 3000);
    } catch (error) {
      console.error("Veo generation failed", error);
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
          <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-[2.5rem] border border-purple-500/20 p-8 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 transform group-hover:scale-110 transition-transform">
                <Sparkles size={48} className="text-purple-400 opacity-20" />
             </div>
             
             <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 mb-6">
                   <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                   <span className="text-[8px] font-black uppercase tracking-widest text-purple-300">Veo 3 Video Engine</span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">Magic Visual Synthesis</h3>
                <p className="text-white/50 text-xs mb-6 max-w-sm">Generate completely unique visual metaphors based on your scene context and branding.</p>
                
                <div className="flex gap-2">
                   <button 
                     onClick={handleGenerateAI}
                     disabled={isGenerating}
                     className="flex-1 h-14 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-purple-200 transition-all disabled:opacity-50"
                   >
                     {isGenerating ? (
                       <RefreshCcw size={18} className="animate-spin" />
                     ) : (
                       <>
                         Generate B-Roll
                         <ArrowRight size={16} />
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

        {/* Source Tabs */}
        <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
           {['all', 'giphy', 'mixkit', 'ai'].map(source => (
              <button
                key={source}
                onClick={() => setActiveSource(source as any)}
                className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  activeSource === source 
                  ? 'bg-white text-black shadow-xl shadow-white/10' 
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                {source}
              </button>
           ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {stockItems.map((item) => (
                 <div 
                   key={item.id}
                   onClick={() => onSelect(item.previewUrl)}
                   className="group relative aspect-video rounded-3xl overflow-hidden bg-white/5 border border-white/5 hover:border-purple-500/50 cursor-pointer transition-all"
                 >
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors z-10" />
                    <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                       <Video size={24} className="text-white/10" />
                    </div>
                    
                    <div className="absolute top-4 left-4 z-20">
                       <span className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[8px] font-black uppercase text-white/60 border border-white/10">
                          {item.source}
                       </span>
                    </div>

                    <div className="absolute inset-0 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-purple-600/40">
                       <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                          <Check size={20} />
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
