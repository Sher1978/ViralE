'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Share2, Play, Download, 
  Copy, Check, Sparkles, Loader2, Image as ImageIcon,
  ChevronRight, RefreshCw, Layers, Monitor, Brain,
  Zap, ExternalLink, Wand2
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
      if (manifest.distributionImages) {
        setImageResults(manifest.distributionImages);
      }
    } else if (scriptText && scriptText.length > 5 && !assets && !isGenerating) {
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
        body: JSON.stringify({ 
          prompt,
          aspect_ratio: ar || '4:5',
          provider: 'grok' 
        })
      });
      if (res.ok) {
        const data = await res.json();
        const newResults = { ...imageResults, [key]: data.url };
        setImageResults(newResults);

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
    { id: 'sfv', label: 'TikTok & Reels', icon: Zap },
    { id: 'threads', label: 'Threads & FB', icon: Share2 },
    { id: 'linkedin', label: 'LinkedIn', icon: Monitor },
    { id: 'carousel', label: 'Instagram Carousel', icon: Camera },
    { id: 'banner', label: 'YouTube Thumbnail', icon: ImageIcon },
  ];

  const shareToSocial = async (platform: string, text: string, title?: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Viral Engine Content',
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share failed:', err);
      }
    } else {
      const encodedText = encodeURIComponent(text);
      const urls: Record<string, string> = {
        telegram: `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodedText}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
      };

      if (urls[platform]) {
        window.open(urls[platform], '_blank');
      } else {
        window.open('https://t.me/ViralEngine_Bot', '_blank');
      }
    }
  };

  const saveTextAsFile = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-[#05050a] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      
      {/* Header */}
      <div className="p-8 border-b border-white/5 flex items-center justify-between relative z-10 bg-black/20 backdrop-blur-md">
        <div>
          <h2 className="text-3xl font-bold italic uppercase tracking-tighter text-white">
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
          className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-purple-600/20 backdrop-blur-md border border-purple-500/30 text-purple-100 text-[10px] font-bold uppercase tracking-widest hover:bg-purple-600/40 hover:border-purple-500/60 active:scale-95 transition-all disabled:opacity-50 shadow-[0_0_30px_rgba(168,85,247,0.1)]"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {assets ? 'REGENERATE ALL' : 'GENERATE CONTENT PACK'}
        </button>
      </div>

      {!assets && !isGenerating ? (
        <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto w-full space-y-12 py-10">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest animate-pulse">
                <Brain size={12} /> Strategist Ready to Architect
              </div>
              <h3 className="text-3xl font-bold uppercase tracking-tighter text-white">Social Distribution <span className="text-purple-500">Blueprint</span></h3>
              <p className="text-[11px] text-white/30 font-medium uppercase tracking-widest max-w-lg mx-auto leading-relaxed">
                Our AI Strategist has analyzed your script and is ready to expand it into a full-scale digital ecosystem.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {platforms.map((p, i) => (
                <div key={p.id} className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-4 group hover:border-purple-500/20 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-white/[0.03] flex items-center justify-center text-white/20 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-all">
                      <p.icon size={20} />
                    </div>
                    <span className="text-[8px] font-black text-white/10 uppercase tracking-widest">Phase 0{i+1}</span>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-white uppercase tracking-widest mb-1">{p.label}</h4>
                    <p className="text-[9px] text-white/30 font-medium leading-relaxed">
                      {p.id === 'sfv' ? 'High-retention captions with viral hooks and trending hashtags.' : 
                       p.id === 'threads' ? 'Multi-part narrative threads designed for deep engagement.' : 
                       p.id === 'linkedin' ? 'Professional insights and executive-level summaries.' : 
                       p.id === 'carousel' ? '6-slide visual sequence with AI-generated storytelling.' : 
                       'Custom high-CTR thumbnail with hard-hitting headlines.'}
                    </p>
                  </div>
                  <div className="pt-4 flex gap-1">
                    <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full w-1/3 bg-white/10 group-hover:bg-purple-500/20 transition-all" />
                    </div>
                    <div className="h-1 flex-1 bg-white/5 rounded-full" />
                    <div className="h-1 flex-1 bg-white/5 rounded-full" />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-10 flex flex-col items-center">
              <button 
                onClick={generateAssets}
                className="group relative px-10 py-5 rounded-[2rem] bg-purple-600 text-white text-[13px] font-black uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(168,85,247,0.3)] hover:scale-105 active:scale-95 transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-[length:200%_auto] animate-gradient-x" />
                <span className="relative flex items-center gap-3">
                  <Zap size={18} /> Architect Social Ecosystem
                </span>
              </button>
              <p className="mt-6 text-[9px] text-white/20 font-black uppercase tracking-[0.3em]">Estimated synthesis time: ~15 seconds</p>
            </div>
          </div>
        </div>
      ) : isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <div className="relative w-32 h-32 mb-10 text-white">
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
               className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full shadow-[0_0_50px_rgba(168,85,247,0.2)]"
             />
             <div className="absolute inset-8 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/5">
                <Brain size={32} className="text-white animate-pulse" />
             </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.5em] text-white">Synthesizing Digital DNA</span>
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
                   "px-6 py-3 rounded-2xl flex items-center justify-center gap-3 text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
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
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar text-white">
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
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
                          <Copy size={14} /> Optimized Copy
                        </h3>
                        <button 
                          onClick={() => {
                            const text = activePlatform === 'sfv' ? assets?.sfv_description.text : 
                                        activePlatform === 'threads' ? assets?.deep_content.threads_fb_text : 
                                        assets?.linkedin_executive.text;
                            if(text) handleCopy(text, activePlatform);
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold uppercase tracking-widest transition-all active:scale-90"
                        >
                          {copying === activePlatform ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          {copying === activePlatform ? 'COPIED' : 'COPY TEXT'}
                        </button>
                      </div>
                      
                      <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 relative group min-h-[300px]">
                        <pre className="text-[15px] text-white/80 leading-relaxed font-sans whitespace-pre-wrap">
                          {activePlatform === 'sfv' ? assets?.sfv_description.text : 
                           activePlatform === 'threads' ? assets?.deep_content.threads_fb_text : 
                           assets?.linkedin_executive.text}
                        </pre>
                      </div>

                      <div className="flex flex-wrap gap-3 mt-6">
                         <button 
                           onClick={() => shareToSocial(activePlatform, activePlatform === 'sfv' ? assets!.sfv_description.text : assets!.deep_content.threads_fb_text)}
                           className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-900/20"
                         >
                           <Share2 size={14} /> Post to {activePlatform === 'sfv' ? 'TikTok/Reels' : activePlatform === 'threads' ? 'Threads/FB' : 'LinkedIn'}
                         </button>

                         <button 
                           onClick={() => saveTextAsFile(activePlatform === 'sfv' ? assets!.sfv_description.text : assets!.deep_content.threads_fb_text, `${activePlatform}_caption.txt`)}
                           className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                         >
                           <Download size={14} /> Save Text
                         </button>

                         <button 
                           onClick={() => handleCopy(activePlatform === 'sfv' ? assets!.sfv_description.text : assets!.deep_content.threads_fb_text, activePlatform)}
                           className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                         >
                           {copying === activePlatform ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                           Copy
                         </button>
                      </div>
                    </div>

                    <div className="space-y-8">
                       <div>
                         <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-purple-400 mb-4 flex items-center gap-2">
                           <Zap size={12} /> Strategic Context
                         </h4>
                         <div className="p-5 rounded-3xl bg-purple-500/5 border border-purple-500/10 text-[11px] text-white/50 leading-relaxed italic">
                           {activePlatform === 'sfv' ? assets?.sfv_description.platform_notes : 
                            activePlatform === 'threads' ? 'Narrative structure using the "But/Therefore" formula for maximum retention.' : 
                            'Executive-level analysis focused on ROI, systemic logic, and industry facts.'}
                         </div>
                       </div>
                       
                       <div className="pt-6 border-t border-white/5">
                         <div className="flex flex-col gap-3">
                           {activePlatform === 'sfv' && (
                             <>
                               <div className="flex items-center gap-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                 <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> YouTube Shorts OK
                               </div>
                               <div className="flex items-center gap-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                 <div className="w-1.5 h-1.5 rounded-full bg-pink-500" /> Instagram Reels OK
                               </div>
                               <div className="flex items-center gap-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                 <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> TikTok Viral Pattern
                               </div>
                             </>
                           )}
                           {activePlatform === 'threads' && (
                             <div className="flex items-center gap-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                               <div className="w-1.5 h-1.5 rounded-full bg-white/40" /> Facebook/Threads Deep Dive
                             </div>
                           )}
                           {activePlatform === 'linkedin' && (
                             <div className="flex items-center gap-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                               <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> LinkedIn Professional Grade
                             </div>
                           )}
                         </div>
                       </div>
                    </div>
                  </div>
                )}

                {activePlatform === 'carousel' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-white">Instagram Carousel Series</h3>
                        <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-1">6-Slide Narrative Visualization (AR 4:5)</p>
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[9px] font-bold uppercase tracking-widest text-white/40">
                         {assets?.ig_carousel.technical_specs}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {assets?.ig_carousel.prompts.map((prompt, i) => {
                         const key = `carousel-${i}`;
                         const url = imageResults[key];
                         const isGen = isGeneratingImages[key];

                         return (
                           <div key={i} className="space-y-4">
                             <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Slide {i + 1}</span>
                                {url && (
                                  <button 
                                    onClick={() => handleDownload(url, `carousel_slide_${i+1}.webp`)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                                  >
                                    <Download size={14} />
                                  </button>
                                )}
                             </div>
                             
                             <div className="relative aspect-[4/5] rounded-[2rem] bg-white/[0.02] border border-white/5 overflow-hidden group flex">
                                {url ? (
                                  <>
                                    <img src={url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                       <button 
                                         onClick={() => handleDownload(url, `slide_${i+1}.webp`)}
                                         className="px-4 py-2 rounded-xl bg-purple-500/20 backdrop-blur-md border border-purple-500/30 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg"
                                       >
                                         <Download size={12} /> Save
                                       </button>
                                       <button 
                                         onClick={() => shareToSocial('instagram', prompt, `Carousel Slide ${i+1}`)}
                                         className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-all"
                                       >
                                         <Share2 size={14} />
                                       </button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
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

                                {!url && !isGen && (
                                  <button 
                                    onClick={() => generateSingleImage(prompt, '4:5', key)}
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <div className="px-4 py-2 rounded-xl bg-purple-500/20 backdrop-blur-md border border-purple-500/30 text-white text-[9px] font-bold uppercase tracking-widest flex items-center gap-2">
                                      <Wand2 size={12} /> Generate
                                    </div>
                                  </button>
                                )}
                             </div>

                             {url && (
                               <button 
                                 onClick={() => handleDownload(url, `slide_${i+1}.webp`)}
                                 className="w-full py-2.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                               >
                                 <Download size={12} /> Download Slide {i+1}
                               </button>
                             )}
                           </div>
                         );
                       })}
                    </div>
                  </div>
                )}

                {activePlatform === 'banner' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                     <div className="space-y-8">
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-white mb-2">Video Cover Master</h3>
                          <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">
                            A high-impact 9:16 banner for Reels, Shorts, and TikTok. 
                            Includes a hard-hitting headline for maximum click-through rate.
                          </p>
                        </div>

                        <div className="space-y-6">
                           <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                              <h4 className="text-[9px] font-bold uppercase tracking-widest text-purple-400">Main Headline</h4>
                              <div className="text-xl font-bold italic uppercase tracking-tighter text-white leading-tight">
                                "{assets?.video_banner.text_on_banner}"
                              </div>
                           </div>

                           <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                              <h4 className="text-[9px] font-bold uppercase tracking-widest text-blue-400">Visual Concept</h4>
                              <p className="text-xs text-white/50 leading-relaxed italic">
                                {assets?.video_banner.image_prompt}
                              </p>
                           </div>
                        </div>

                        <div className="flex flex-col gap-3">
                           <button 
                             onClick={() => assets && generateSingleImage(assets.video_banner.image_prompt, '9:16', 'banner')}
                             disabled={isGeneratingImages['banner']}
                             className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                           >
                             {isGeneratingImages['banner'] ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                             {imageResults['banner'] ? 'REGENERATE THUMBNAIL' : 'GENERATE THUMBNAIL'}
                           </button>

                           {imageResults['banner'] && (
                             <div className="flex gap-3">
                               <button 
                                 onClick={() => handleDownload(imageResults['banner'], 'thumbnail.webp')}
                                 className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all shadow-xl"
                               >
                                 <Download size={18} /> Save Thumbnail
                               </button>
                               <button 
                                 onClick={() => shareToSocial('youtube', assets!.video_banner.text_on_banner, 'YouTube Thumbnail')}
                                 className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                               >
                                 <Share2 size={20} />
                               </button>
                             </div>
                           )}
                        </div>
                     </div>

                     <div className="flex justify-center">
                        <div className="relative w-full max-w-[320px] aspect-[9/16] rounded-[3rem] bg-white/[0.02] border border-white/10 overflow-hidden shadow-2xl group">
                           {imageResults['banner'] ? (
                             <>
                               <img src={imageResults['banner']} className="w-full h-full object-cover" />
                               {/* TEXT OVERLAY SIMULATION */}
                               <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center p-8 text-center">
                                  <div className="mt-auto mb-20 bg-white text-black px-4 py-2 font-black italic uppercase tracking-tighter text-lg transform -rotate-2 shadow-2xl">
                                    {assets?.video_banner.text_on_banner}
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
                                     <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Rendering Banner...</span>
                                  </div>
                                ) : (
                                  <>
                                    <ImageIcon size={48} className="text-white/5 mb-6" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Banner Preview</span>
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
