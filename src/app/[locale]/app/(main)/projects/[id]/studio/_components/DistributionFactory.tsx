'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Share2, Play, Download, 
  Copy, Check, Sparkles, Loader2, Image as ImageIcon,
  ChevronRight, RefreshCw, Layers, Monitor, Brain,
  Instagram, Facebook, Linkedin, Twitter, Zap,
  ExternalLink, Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DistributionFactoryProps {
  manifest: any;
  scriptText: string;
  projectId: string;
  locale: string;
  onUpdateManifest?: (manifest: any) => void;
}

interface GeneratedAsset {
  user_context_applied: string;
  sfv_description: {
    text: string;
    platform_notes: string;
  };
  deep_content: {
    threads_fb_text: string;
  };
  linkedin_executive: {
    text: string;
  };
  ig_carousel: {
    technical_specs: string;
    prompts: string[];
  };
  video_banner: {
    image_prompt: string;
    text_on_banner: string;
  };
}

interface ImageResult {
  url: string;
  prompt: string;
  aspectRatio: string;
}

type Platform = 'sfv' | 'threads' | 'linkedin' | 'carousel' | 'banner';

export default function DistributionFactory({ manifest, scriptText, projectId, locale, onUpdateManifest }: DistributionFactoryProps) {
  const [activePlatform, setActivePlatform] = useState<Platform>('sfv');
  const [assets, setAssets] = useState<GeneratedAsset | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState<Record<string, boolean>>({});
  const [imageResults, setImageResults] = useState<Record<string, string>>({}); // prompt-hash -> url
  const [copying, setCopying] = useState<string | null>(null);

  // Sync with manifest if pre-generated
  useEffect(() => {
    if (manifest?.distributionAssets) {
      setAssets(manifest.distributionAssets);
      // If we have cached images in manifest, load them too
      if (manifest.distributionImages) {
        setImageResults(manifest.distributionImages);
      }
    } else if (scriptText && scriptText.length > 20 && !assets && !isGenerating) {
      generateAssets();
    }
  }, [manifest, scriptText]);

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
      
      // Save to manifest
      if (onUpdateManifest) {
        onUpdateManifest({
          ...manifest,
          distributionAssets: data
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSingleImage = async (prompt: string, ar: string, key: string) => {
    setIsGeneratingImages(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch('/api/ai/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspect_ratio: ar })
      });
      if (res.ok) {
        const data = await res.json();
        const newResults = { ...imageResults, [key]: data.url };
        setImageResults(newResults);

        // Save to manifest
        if (onUpdateManifest) {
          onUpdateManifest({
            ...manifest,
            distributionImages: newResults
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImages(prev => ({ ...prev, [key]: false }));
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

  const platforms: { id: Platform; label: string; icon: any }[] = [
    { id: 'sfv', label: 'Shorts/Reels', icon: Zap },
    { id: 'threads', label: 'Threads/FB', icon: Share2 },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
    { id: 'carousel', label: 'IG Carousel', icon: Camera },
    { id: 'banner', label: 'Banner', icon: ImageIcon },
  ];

  return (
    <div className="h-full flex flex-col bg-[#05050a] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      
      {/* Header */}
      <div className="p-8 border-b border-white/5 flex items-center justify-between relative z-10 bg-black/20 backdrop-blur-md">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
            Distribution <span className="text-purple-500">Suite</span>
          </h2>
          {assets?.user_context_applied && (
            <p className="text-[9px] text-purple-400 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
              <Brain size={12} /> {assets.user_context_applied}
            </p>
          )}
        </div>

        <button 
          onClick={generateAssets}
          disabled={isGenerating}
          className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {assets ? 'REGENERATE ALL' : 'GENERATE CONTENT PACK'}
        </button>
      </div>

      {!assets && !isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="w-24 h-24 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-center mb-8 relative">
            <Layers size={40} className="text-white/10" />
            <motion.div 
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="absolute inset-0 rounded-[2.5rem] bg-purple-500/10 blur-xl" 
            />
          </div>
          <h3 className="text-white font-black uppercase tracking-[0.2em] mb-3">Awaiting Production Finalization</h3>
          <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest max-w-xs leading-relaxed">
            Once your A-Roll is ready, our Strategist will architect your entire social media presence.
          </p>
        </div>
      ) : isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <div className="relative w-32 h-32 mb-10">
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
               className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full shadow-[0_0_50px_rgba(168,85,247,0.2)]"
             />
             <motion.div 
               animate={{ rotate: -360 }}
               transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
               className="absolute inset-4 border-2 border-t-blue-400 border-r-transparent border-b-purple-400 border-l-transparent rounded-full opacity-50"
             />
             <div className="absolute inset-8 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/5">
                <Brain size={32} className="text-white animate-pulse" />
             </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.5em] text-white">Synthesizing Digital DNA</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">Applying Virality Patterns 2026</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex px-4 py-3 bg-white/[0.02] border-b border-white/5 gap-2 shrink-0 overflow-x-auto no-scrollbar">
             {platforms.map(p => (
               <button
                 key={p.id}
                 onClick={() => setActivePlatform(p.id)}
                 className={cn(
                   "px-6 py-3 rounded-2xl flex items-center justify-center gap-3 text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                   activePlatform === p.id 
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-[0_10px_20px_rgba(168,85,247,0.2)]" 
                    : "text-white/30 hover:bg-white/5 border border-transparent hover:border-white/5"
                 )}
               >
                 <p.icon size={14} />
                 {p.label}
               </button>
             ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePlatform}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-5xl mx-auto"
              >
                {/* 1. TEXT PLATFORMS (SFV, Threads, LinkedIn) */}
                {(activePlatform === 'sfv' || activePlatform === 'threads' || activePlatform === 'linkedin') && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
                          <Copy size={14} /> Optimized Copy
                        </h3>
                        <button 
                          onClick={() => {
                            const text = activePlatform === 'sfv' ? assets.sfv_description.text : 
                                        activePlatform === 'threads' ? assets.deep_content.threads_fb_text : 
                                        assets.linkedin_executive.text;
                            handleCopy(text, activePlatform);
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest transition-all active:scale-90"
                        >
                          {copying === activePlatform ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          {copying === activePlatform ? 'COPIED' : 'COPY TEXT'}
                        </button>
                      </div>
                      
                      <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 relative group min-h-[300px]">
                        <pre className="text-[15px] text-white/80 leading-relaxed font-sans whitespace-pre-wrap">
                          {activePlatform === 'sfv' ? assets.sfv_description.text : 
                           activePlatform === 'threads' ? assets.deep_content.threads_fb_text : 
                           assets.linkedin_executive.text}
                        </pre>
                      </div>
                    </div>

                    <div className="space-y-8">
                       <div>
                         <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-400 mb-4 flex items-center gap-2">
                           <Zap size={12} /> Strategic Context
                         </h4>
                         <div className="p-5 rounded-3xl bg-purple-500/5 border border-purple-500/10 text-[11px] text-white/50 leading-relaxed italic">
                           {activePlatform === 'sfv' ? assets.sfv_description.platform_notes : 
                            activePlatform === 'threads' ? 'Narrative structure using the "But/Therefore" formula for maximum retention.' : 
                            'Executive-level analysis focused on ROI, systemic logic, and industry facts.'}
                         </div>
                       </div>
                       
                       <div className="pt-6 border-t border-white/5">
                         <div className="flex flex-col gap-3">
                           {activePlatform === 'sfv' && (
                             <>
                               <div className="flex items-center gap-3 text-[10px] font-black text-white/30 uppercase tracking-widest">
                                 <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> YouTube Shorts OK
                               </div>
                               <div className="flex items-center gap-3 text-[10px] font-black text-white/30 uppercase tracking-widest">
                                 <div className="w-1.5 h-1.5 rounded-full bg-pink-500" /> Instagram Reels OK
                               </div>
                               <div className="flex items-center gap-3 text-[10px] font-black text-white/30 uppercase tracking-widest">
                                 <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> TikTok Viral Pattern
                               </div>
                             </>
                           )}
                           {activePlatform === 'threads' && (
                             <div className="flex items-center gap-3 text-[10px] font-black text-white/30 uppercase tracking-widest">
                               <div className="w-1.5 h-1.5 rounded-full bg-white/40" /> Facebook/Threads Deep Dive
                             </div>
                           )}
                           {activePlatform === 'linkedin' && (
                             <div className="flex items-center gap-3 text-[10px] font-black text-white/30 uppercase tracking-widest">
                               <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> LinkedIn Professional Grade
                             </div>
                           )}
                         </div>
                       </div>
                    </div>
                  </div>
                )}

                {/* 2. CAROUSEL (IG) */}
                {activePlatform === 'carousel' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Instagram Carousel Series</h3>
                        <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-1">6-Slide Narrative Visualization (AR 4:5)</p>
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40">
                         {assets.ig_carousel.technical_specs}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {assets.ig_carousel.prompts.map((prompt, i) => {
                         const key = `carousel-${i}`;
                         const url = imageResults[key];
                         const isGen = isGeneratingImages[key];

                         return (
                           <div key={i} className="space-y-4">
                             <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Slide {i + 1}</span>
                                {url && (
                                  <button 
                                    onClick={() => handleDownload(url, `carousel_slide_${i+1}.webp`)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                                  >
                                    <Download size={14} />
                                  </button>
                                )}
                             </div>
                             
                             <div className="relative aspect-[4/5] rounded-[2rem] bg-white/[0.02] border border-white/5 overflow-hidden group">
                                {url ? (
                                  <img src={url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                ) : (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                    {isGen ? (
                                      <Loader2 size={32} className="text-purple-500 animate-spin mb-4" />
                                    ) : (
                                      <ImageIcon size={32} className="text-white/5 mb-4" />
                                    )}
                                    <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest leading-relaxed">
                                      {isGen ? 'Rendering slide...' : 'No visual generated'}
                                    </p>
                                  </div>
                                )}
                                
                                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                   <p className="text-[8px] text-white/60 leading-relaxed line-clamp-3 italic">
                                     {prompt}
                                   </p>
                                </div>

                                {!url && !isGen && (
                                  <button 
                                    onClick={() => generateSingleImage(prompt, '4:5', key)}
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <div className="px-4 py-2 rounded-xl bg-white text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                      <Wand2 size={12} /> Generate
                                    </div>
                                  </button>
                                )}
                             </div>
                           </div>
                         );
                       })}
                    </div>
                  </div>
                )}

                {/* 3. BANNER (SFV COVER) */}
                {activePlatform === 'banner' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                     <div className="space-y-8">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white mb-2">Video Cover Master</h3>
                          <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">
                            A high-impact 9:16 banner for Reels, Shorts, and TikTok. 
                            Includes a hard-hitting headline for maximum click-through rate.
                          </p>
                        </div>

                        <div className="space-y-6">
                           <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                              <h4 className="text-[9px] font-black uppercase tracking-widest text-purple-400">Main Headline</h4>
                              <div className="text-xl font-black italic uppercase tracking-tighter text-white leading-tight">
                                "{assets.video_banner.text_on_banner}"
                              </div>
                           </div>

                           <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                              <h4 className="text-[9px] font-black uppercase tracking-widest text-blue-400">Visual Concept</h4>
                              <p className="text-xs text-white/50 leading-relaxed italic">
                                {assets.video_banner.image_prompt}
                              </p>
                           </div>
                        </div>

                        <button 
                          onClick={() => generateSingleImage(assets.video_banner.image_prompt, '9:16', 'banner')}
                          disabled={isGeneratingImages['banner']}
                          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {isGeneratingImages['banner'] ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                          {imageResults['banner'] ? 'REGENERATE BANNER' : 'GENERATE BANNER IMAGE'}
                        </button>
                     </div>

                     <div className="flex justify-center">
                        <div className="relative w-full max-w-[320px] aspect-[9/16] rounded-[3rem] bg-white/[0.02] border border-white/10 overflow-hidden shadow-2xl group">
                           {imageResults['banner'] ? (
                             <>
                               <img src={imageResults['banner']} className="w-full h-full object-cover" />
                               {/* TEXT OVERLAY SIMULATION */}
                               <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center p-8 text-center">
                                  <div className="mt-auto mb-20 bg-white text-black px-4 py-2 font-black italic uppercase tracking-tighter text-lg transform -rotate-2 shadow-2xl">
                                    {assets.video_banner.text_on_banner}
                                  </div>
                               </div>
                               
                               <button 
                                 onClick={() => handleDownload(imageResults['banner'], 'video_banner.webp')}
                                 className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-2xl"
                               >
                                 <Download size={20} />
                               </button>
                             </>
                           ) : (
                             <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                                {isGeneratingImages['banner'] ? (
                                  <div className="flex flex-col items-center gap-6">
                                     <div className="w-16 h-16 border-4 border-t-purple-500 border-white/5 rounded-full animate-spin" />
                                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Rendering Banner...</span>
                                  </div>
                                ) : (
                                  <>
                                    <ImageIcon size={48} className="text-white/5 mb-6" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Banner Preview</span>
                                  </>
                                )}
                             </div>
                           )}
                           
                           {/* UI Decoration */}
                           <div className="absolute inset-0 border-[12px] border-black pointer-events-none rounded-[3rem] opacity-20" />
                        </div>
                     </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
