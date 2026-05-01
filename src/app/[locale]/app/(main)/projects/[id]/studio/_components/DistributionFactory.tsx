'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Share2, Play, Download, 
  Copy, Check, Sparkles, Loader2, Image as ImageIcon,
  ChevronRight, RefreshCw, Layers, Monitor, Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DistributionFactoryProps {
  scriptText: string;
  projectId: string;
  locale: string;
}

interface GeneratedAsset {
  instagram: {
    caption: string;
    carouselPrompts: string[];
  };
  facebook: {
    caption: string;
  };
  youtube: {
    description: string;
    thumbnailPrompt: string;
  };
}

interface ImageResult {
  url: string;
  prompt: string;
  aspectRatio: string;
}

export default function DistributionFactory({ scriptText, projectId, locale }: DistributionFactoryProps) {
  const [activePlatform, setActivePlatform] = useState<'instagram' | 'facebook' | 'youtube'>('instagram');
  const [assets, setAssets] = useState<GeneratedAsset | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageResults, setImageResults] = useState<Record<string, ImageResult[]>>({
    instagram: [],
    youtube: []
  });
  const [copying, setCopying] = useState<string | null>(null);

  const generateAssets = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/distribution-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptText, projectId, locale })
      });
      if (!res.ok) throw new Error('Failed to generate assets');
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateImagesForPlatform = async (platform: 'instagram' | 'youtube') => {
    if (!assets) return;
    setIsGeneratingImages(true);
    const prompts = platform === 'instagram' 
      ? assets.instagram.carouselPrompts 
      : [assets.youtube.thumbnailPrompt];
    
    const ar = platform === 'instagram' ? '1:1' : '16:9';
    const newResults: ImageResult[] = [];

    try {
      for (const prompt of prompts) {
        const res = await fetch('/api/ai/image-gen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, aspect_ratio: ar })
        });
        if (res.ok) {
          const data = await res.json();
          newResults.push({ url: data.url, prompt, aspectRatio: ar });
          setImageResults(prev => ({
            ...prev,
            [platform]: [...(prev[platform] || []), { url: data.url, prompt, aspectRatio: ar }]
          }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopying(id);
    setTimeout(() => setCopying(null), 2000);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#05050a] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      {/* Header */}
      <div className="p-8 border-b border-white/5 flex items-center justify-between relative z-10">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
            Distribution <span className="text-purple-500">Suite</span>
          </h2>
          <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em] mt-1 italic">
            Multiplying your content across the digital void
          </p>
        </div>

        <button 
          onClick={generateAssets}
          disabled={isGenerating}
          className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {assets ? 'REGENERATE PACK' : 'GENERATE ASSET PACK'}
        </button>
      </div>

      {!assets && !isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <Layers size={32} className="text-white/20" />
          </div>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed">
            Click the button above to architect your social media presence based on your script.
          </p>
        </div>
      ) : isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <div className="relative w-24 h-24 mb-6">
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
               className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full shadow-[0_0_30px_rgba(168,85,247,0.3)]"
             />
             <div className="absolute inset-4 rounded-full bg-white/5 flex items-center justify-center">
                <Brain size={24} className="text-white animate-pulse" />
             </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400">Architecting Assets...</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex p-2 bg-white/5 gap-1 shrink-0">
             {(['instagram', 'facebook', 'youtube'] as const).map(p => (
               <button
                 key={p}
                 onClick={() => setActivePlatform(p)}
                 className={cn(
                   "flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all",
                   activePlatform === p ? "bg-white text-black shadow-xl" : "text-white/30 hover:bg-white/5"
                 )}
               >
                 {p === 'instagram' && <Camera size={14} />}
                 {p === 'facebook' && <Share2 size={14} />}
                 {p === 'youtube' && <Play size={14} />}
                 {p}
               </button>
             ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              {/* Left Column: Formatted Text */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <Copy size={14} /> Smart Copy
                  </h3>
                  <button 
                    onClick={() => {
                      if (!assets) return;
                      const text = activePlatform === 'instagram' ? assets.instagram.caption : 
                                  activePlatform === 'facebook' ? assets.facebook.caption : 
                                  assets.youtube.description;
                      handleCopy(text, activePlatform);
                    }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all active:scale-90"
                  >
                    {copying === activePlatform ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
                
                <div className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 relative group">
                  <pre className="text-sm text-white/80 leading-relaxed font-sans whitespace-pre-wrap">
                    {assets && (activePlatform === 'instagram' ? assets.instagram.caption : 
                     activePlatform === 'facebook' ? assets.facebook.caption : 
                     assets.youtube.description)}
                  </pre>
                </div>
              </div>

              {/* Right Column: Visual Assets */}
              <div className="space-y-6">
                {(activePlatform === 'instagram' || activePlatform === 'youtube') && (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                        <ImageIcon size={14} /> {activePlatform === 'instagram' ? 'Carousel Assets' : 'Video Cover'}
                      </h3>
                      <button 
                        onClick={() => generateImagesForPlatform(activePlatform)}
                        disabled={isGeneratingImages}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 text-purple-400 text-[9px] font-black uppercase tracking-widest border border-purple-500/20 hover:bg-purple-600/30 transition-all disabled:opacity-50"
                      >
                        {isGeneratingImages ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        {imageResults[activePlatform].length > 0 ? 'REGENERATE IMAGES' : 'GENERATE VISUALS'}
                      </button>
                    </div>

                    {imageResults[activePlatform].length === 0 && !isGeneratingImages ? (
                      <div className="aspect-video rounded-[2rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-white/10">
                        <ImageIcon size={48} className="mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">No visuals yet</span>
                      </div>
                    ) : (
                      <div className={cn(
                        "grid gap-4",
                        activePlatform === 'instagram' ? "grid-cols-2" : "grid-cols-1"
                      )}>
                        {imageResults[activePlatform].map((img, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="group relative rounded-2xl overflow-hidden border border-white/10 aspect-square"
                            style={{ aspectRatio: activePlatform === 'youtube' ? '16/9' : '1/1' }}
                          >
                            <img src={img.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                               <button 
                                 onClick={() => handleDownload(img.url, `viral_asset_${activePlatform}_${i}.webp`)}
                                 className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform shadow-2xl"
                               >
                                 <Download size={20} />
                               </button>
                            </div>
                          </motion.div>
                        ))}
                        
                        {isGeneratingImages && (
                          <div className={cn(
                            "rounded-2xl border border-white/5 bg-white/5 flex items-center justify-center",
                            activePlatform === 'instagram' ? "aspect-square" : "aspect-video"
                          )}>
                             <Loader2 size={24} className="text-purple-400 animate-spin" />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                {activePlatform === 'facebook' && (
                  <div className="h-full flex items-center justify-center text-white/10">
                    <div className="text-center">
                       <Share2 size={48} className="mx-auto mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Facebook uses project video & copy</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
