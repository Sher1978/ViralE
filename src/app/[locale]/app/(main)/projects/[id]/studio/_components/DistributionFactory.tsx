'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Share2, Play, Download, 
  Copy, Check, Sparkles, Loader2, Image as ImageIcon,
  ChevronRight, RefreshCw, Layers, Monitor, Brain,
  Zap, ExternalLink, Wand2, ArrowLeft, X
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
  longread_article?: {
    title: string;
    text: string;
  };
  video_banner: {
    image_prompt: string;
    text_on_banner: string;
  };
}

type Platform = 'sfv' | 'threads' | 'linkedin' | 'article' | 'carousel' | 'banner';

export default function DistributionFactory({ manifest, scriptText, projectId, locale, onUpdateManifest }: DistributionFactoryProps) {
  const [activePlatform, setActivePlatform] = useState<Platform>('sfv');
  const [selectedDetail, setSelectedDetail] = useState<Platform | null>(null);
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
    { id: 'article', label: 'Longread Article', icon: Layers },
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
        <div className="flex-1 flex flex-col overflow-hidden text-white relative">
          {/* iOS-Style Distribution Grid / Channels */}
          <AnimatePresence mode="wait">
            {!selectedDetail ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar relative z-10"
              >
                <div className="max-w-4xl mx-auto space-y-8 pb-10">
                  <div className="text-center space-y-3 py-4">
                    <span className="text-[10px] font-black tracking-[0.4em] uppercase text-purple-400">Media Distribution Kit</span>
                    <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                      {locale === 'ru' ? 'Выберите формат' : 'Select Format'}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-white/30 uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                      {locale === 'ru' ? 'AI сгенерировал 6 готовых форматов для продвижения вашего видео' : 'AI generated 6 high-conversion distribution formats for your socials'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    {platforms.map((p, i) => {
                      const isRu = locale === 'ru';
                      const metas = {
                        sfv: {
                          title: isRu ? 'TikTok & Reels' : 'TikTok & Reels',
                          subtitle: isRu ? 'Вирусное описание и теги' : 'Viral copy & hashtags',
                          gradient: 'from-[#010101] via-[#00f2fe]/5 to-[#fe2c55]/10 hover:border-[#fe2c55]/30 shadow-[#fe2c55]/5',
                          iconColor: 'text-[#00f2fe]',
                          badge: isRu ? '⚡ Видео' : '⚡ Video',
                        },
                        threads: {
                          title: isRu ? 'Threads & FB' : 'Threads & FB',
                          subtitle: isRu ? 'Глубокий нарратив' : 'Deep narrative threads',
                          gradient: 'from-[#101010] via-white/5 to-[#1a1a1a] hover:border-white/20 shadow-white/5',
                          iconColor: 'text-white',
                          badge: isRu ? '✍️ Текст' : '✍️ Copy',
                        },
                        linkedin: {
                          title: isRu ? 'LinkedIn' : 'LinkedIn',
                          subtitle: isRu ? 'Бизнес-инсайт' : 'Executive post',
                          gradient: 'from-[#001c3d] via-[#0a66c2]/5 to-[#0077b5]/10 hover:border-[#0a66c2]/30 shadow-[#0a66c2]/5',
                          iconColor: 'text-[#0A66C2]',
                          badge: isRu ? '💼 Эксперт' : '💼 Expert',
                        },
                        article: {
                          title: isRu ? 'Longread Article' : 'Longread Article',
                          subtitle: isRu ? 'SEO-статья для блога' : 'Deep-dive blog post',
                          gradient: 'from-[#2b1800] via-[#ffb300]/5 to-[#f57c00]/10 hover:border-[#ffb300]/30 shadow-[#ffb300]/5',
                          iconColor: 'text-[#FFB300]',
                          badge: isRu ? '📰 Блог' : '📰 Blog',
                        },
                        carousel: {
                          title: isRu ? 'Instagram Carousel' : 'Instagram Carousel',
                          subtitle: isRu ? '6 слайдов сторителлинга' : '6-slide visual series',
                          gradient: 'from-[#2a0845] via-[#e1306c]/5 to-[#ffb347]/10 hover:border-[#e1306c]/30 shadow-[#e1306c]/5',
                          iconColor: 'text-[#E1306C]',
                          badge: isRu ? '📸 Галерея' : '📸 Gallery',
                        },
                        banner: {
                          title: isRu ? 'YouTube Banner' : 'YouTube Banner',
                          subtitle: isRu ? 'Обложка с высоким CTR' : 'High-CTR thumbnail',
                          gradient: 'from-[#3b0000] via-[#ff0000]/5 to-[#b22222]/10 hover:border-[#ff0000]/30 shadow-[#ff0000]/5',
                          iconColor: 'text-[#FF0000]',
                          badge: isRu ? '🖼️ Обложка' : '🖼️ Cover',
                        },
                      };
                      const meta = metas[p.id];
                      return (
                        <motion.button
                          key={p.id}
                          onClick={() => {
                            setActivePlatform(p.id);
                            setSelectedDetail(p.id);
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "relative group p-6 rounded-[2.5rem] bg-gradient-to-br border border-white/5 text-left transition-all duration-300 overflow-hidden flex flex-col justify-between aspect-square shadow-2xl",
                            meta.gradient
                          )}
                        >
                          {/* Glassmorphic Inner Glow */}
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-60 pointer-events-none group-hover:opacity-40 transition-opacity" />
                          
                          {/* Icon and Badge */}
                          <div className="relative z-10 flex items-center justify-between w-full">
                            <div className={cn("w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-110 transition-transform", meta.iconColor)}>
                              <p.icon size={22} />
                            </div>
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">
                              {meta.badge}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="relative z-10 space-y-1">
                            <h4 className="text-[14px] font-black text-white uppercase tracking-wider group-hover:translate-x-1 transition-transform">{meta.title}</h4>
                            <p className="text-[9px] text-white/40 font-bold uppercase tracking-wide leading-tight group-hover:text-white/60 transition-colors">{meta.subtitle}</p>
                          </div>

                          {/* Arrow indicator */}
                          <div className="absolute bottom-6 right-6 text-white/15 group-hover:text-white/60 transition-colors">
                            <ChevronRight size={18} />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Deep iOS Mobile-optimized Detail Overlay Sheet */
              <motion.div
                key="detail"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="absolute inset-0 bg-[#07070c]/98 backdrop-blur-3xl z-50 flex flex-col overflow-hidden text-white"
              >
                {/* Fixed Blurred Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/30 backdrop-blur-md relative z-10">
                  <button
                    onClick={() => setSelectedDetail(null)}
                    className="flex items-center gap-2 text-white/50 hover:text-white text-[11px] font-black uppercase tracking-widest active:opacity-60 transition-all"
                  >
                    <ArrowLeft size={16} /> {locale === 'ru' ? 'НАЗАД' : 'BACK'}
                  </button>

                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black tracking-[0.3em] text-purple-400 uppercase">
                      {locale === 'ru' ? 'ПРОСМОТР КОНТЕНТА' : 'CONTENT PREVIEW'}
                    </span>
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-0.5">
                      {platforms.find(p => p.id === selectedDetail)?.label}
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedDetail(null)}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Main scrollable detail contents */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar pb-24">
                  <div className="max-w-4xl mx-auto">
                    {/* 1. TEXT PLATFORMS (SFV, Threads, LinkedIn, Article) */}
                    {(selectedDetail === 'sfv' || selectedDetail === 'threads' || selectedDetail === 'linkedin' || selectedDetail === 'article') && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
                              <Copy size={14} /> Optimized Copy
                            </h3>
                            <button 
                              onClick={() => {
                                const text = selectedDetail === 'sfv' ? assets?.sfv_description.text : 
                                            selectedDetail === 'threads' ? assets?.deep_content.threads_fb_text : 
                                            selectedDetail === 'linkedin' ? assets?.linkedin_executive.text :
                                            assets?.longread_article?.text;
                                if(text) handleCopy(text, selectedDetail);
                              }}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
                            >
                              {copying === selectedDetail ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                              {copying === selectedDetail ? (locale === 'ru' ? 'СКОПИРОВАНО' : 'COPIED') : (locale === 'ru' ? 'КОПИРОВАТЬ' : 'COPY TEXT')}
                            </button>
                          </div>
                          
                          <div className="p-6 sm:p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 relative group min-h-[250px]">
                            <pre className="text-[14px] sm:text-[15px] text-white/90 leading-relaxed font-sans whitespace-pre-wrap selection:bg-purple-500/30">
                              {selectedDetail === 'sfv' ? assets?.sfv_description.text : 
                               selectedDetail === 'threads' ? assets?.deep_content.threads_fb_text : 
                               selectedDetail === 'linkedin' ? assets?.linkedin_executive.text :
                               selectedDetail === 'article' ? (
                                 <>
                                   {assets?.longread_article?.title && (
                                     <div className="text-xl sm:text-2xl font-black text-white mb-6 uppercase tracking-tight leading-tight">
                                       {assets.longread_article.title}
                                     </div>
                                   )}
                                   {assets?.longread_article?.text}
                                 </>
                               ) : null}
                            </pre>
                          </div>

                          <div className="flex flex-wrap gap-3 mt-6">
                            <button 
                              onClick={() => {
                                const text = selectedDetail === 'sfv' ? assets?.sfv_description.text : 
                                            selectedDetail === 'threads' ? assets?.deep_content.threads_fb_text : 
                                            selectedDetail === 'linkedin' ? assets?.linkedin_executive.text :
                                            assets?.longread_article?.text;
                                shareToSocial(selectedDetail, text || '');
                              }}
                              className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-purple-950/30"
                            >
                              <Share2 size={16} /> {locale === 'ru' ? 'ПОДЕЛИТЬСЯ' : 'SHARE OUT'}
                            </button>

                            <button 
                              onClick={() => {
                                const text = selectedDetail === 'sfv' ? assets?.sfv_description.text : 
                                            selectedDetail === 'threads' ? assets?.deep_content.threads_fb_text : 
                                            selectedDetail === 'linkedin' ? assets?.linkedin_executive.text :
                                            assets?.longread_article?.text;
                                saveTextAsFile(text || '', `${selectedDetail}_caption.txt`);
                              }}
                              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/80 text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                            >
                              <Download size={16} /> {locale === 'ru' ? 'СОХРАНИТЬ' : 'SAVE FILE'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 mb-3 flex items-center gap-2">
                              <Zap size={14} /> Strategic Analysis
                            </h4>
                            <div className="p-6 rounded-[2rem] bg-purple-500/5 border border-purple-500/10 text-[12px] text-white/60 leading-relaxed italic">
                              {selectedDetail === 'sfv' ? assets?.sfv_description.platform_notes : 
                               selectedDetail === 'threads' ? (locale === 'ru' ? 'Нарративный сторителлинг по формуле "Но/Следовательно" для удержания внимания.' : 'Narrative structure using the "But/Therefore" formula for maximum retention.') : 
                               selectedDetail === 'linkedin' ? (locale === 'ru' ? 'Профессиональный разбор с фокусом на ROI, системную логику и факты.' : 'Executive-level analysis focused on ROI, systemic logic, and industry facts.') :
                               (locale === 'ru' ? 'Всеобъемлющий лонгрид, оптимизированный под SEO и глубокий разбор темы.' : 'Comprehensive long-form analysis for high SEO and deep-dive value.')}
                            </div>
                          </div>
                          
                          <div className="pt-6 border-t border-white/5">
                            <div className="flex flex-col gap-3">
                              {selectedDetail === 'sfv' && (
                                <>
                                  <div className="flex items-center gap-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                    <div className="w-2 h-2 rounded-full bg-red-500" /> Shorts Compatible
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                    <div className="w-2 h-2 rounded-full bg-pink-500" /> Reels Ready
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                    <div className="w-2 h-2 rounded-full bg-cyan-400" /> TikTok Standard
                                  </div>
                                </>
                              )}
                              {selectedDetail === 'threads' && (
                                <div className="flex items-center gap-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                  <div className="w-2 h-2 rounded-full bg-white/40" /> Facebook & Threads
                                </div>
                              )}
                              {selectedDetail === 'linkedin' && (
                                <div className="flex items-center gap-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                  <div className="w-2 h-2 rounded-full bg-blue-600" /> professional network
                                </div>
                              )}
                              {selectedDetail === 'article' && (
                                <div className="flex items-center gap-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                  <div className="w-2 h-2 rounded-full bg-orange-500" /> Search Optimizations
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. INSTAGRAM CAROUSEL PLATFORM */}
                    {selectedDetail === 'carousel' && (
                      <div className="space-y-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-black uppercase tracking-wider text-white">Instagram Carousel Series</h3>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">6-Slide Narrative Visualization (AR 4:5)</p>
                          </div>
                          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-purple-400 text-center">
                            {assets?.ig_carousel.technical_specs}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {assets?.ig_carousel.prompts.map((prompt, i) => {
                            const key = `carousel-${i}`;
                            const url = imageResults[key];
                            const isGen = isGeneratingImages[key];

                            return (
                              <div key={i} className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                  <span className="text-[11px] font-black text-purple-400 uppercase tracking-widest">Slide {i + 1}</span>
                                  {url && (
                                    <button 
                                      onClick={() => handleDownload(url, `carousel_slide_${i+1}.webp`)}
                                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all active:scale-90"
                                    >
                                      <Download size={14} />
                                    </button>
                                  )}
                                </div>
                                
                                <div className="relative aspect-[4/5] rounded-[2rem] bg-white/[0.02] border border-white/10 overflow-hidden group flex shadow-xl">
                                  {url ? (
                                    <>
                                      <img src={url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button 
                                          onClick={() => handleDownload(url, `slide_${i+1}.webp`)}
                                          className="px-4 py-2 rounded-xl bg-purple-500/20 backdrop-blur-md border border-purple-500/30 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg"
                                        >
                                          <Download size={12} /> {locale === 'ru' ? 'Скачать' : 'Save'}
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
                                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                      {isGen ? (
                                        <Loader2 size={32} className="text-purple-500 animate-spin mb-4" />
                                      ) : (
                                        <ImageIcon size={36} className="text-white/5 mb-4" />
                                      )}
                                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">
                                        {isGen ? (locale === 'ru' ? 'Рисуем слайд...' : 'Rendering slide...') : (locale === 'ru' ? 'Изображение не создано' : 'No visual generated')}
                                      </p>
                                    </div>
                                  )}

                                  {!url && !isGen && (
                                    <button 
                                      onClick={() => generateSingleImage(prompt, '4:5', key)}
                                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <div className="px-5 py-2.5 rounded-xl bg-purple-600 border border-purple-500 text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg">
                                        <Wand2 size={12} /> {locale === 'ru' ? 'Сгенерировать' : 'Generate'}
                                      </div>
                                    </button>
                                  )}
                                </div>

                                {url && (
                                  <button 
                                    onClick={() => handleDownload(url, `slide_${i+1}.webp`)}
                                    className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                                  >
                                    <Download size={12} /> {locale === 'ru' ? `Скачать Слайд ${i+1}` : `Download Slide ${i+1}`}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3. YOUTUBE / VIDEO THUMBNAIL PLATFORM */}
                    {selectedDetail === 'banner' && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-8">
                          <div>
                            <h3 className="text-lg font-black uppercase tracking-wider text-white mb-2">Video Cover Master</h3>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                              {locale === 'ru' 
                                ? 'Обложка высокого разрешения (9:16) для привлечения кликов в Reels, Shorts и TikTok.' 
                                : 'A high-impact 9:16 banner for Reels, Shorts, and TikTok. Includes a hard-hitting headline for maximum click-through rate.'}
                            </p>
                          </div>

                          <div className="space-y-5">
                            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-3">
                              <h4 className="text-[9px] font-bold uppercase tracking-widest text-purple-400">{locale === 'ru' ? 'ЗАГОЛОВОК НА ОБЛОЖКЕ' : 'MAIN HEADLINE'}</h4>
                              <div className="text-xl font-black italic uppercase tracking-tighter text-white leading-tight">
                                "{assets?.video_banner.text_on_banner}"
                              </div>
                            </div>

                            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-3">
                              <h4 className="text-[9px] font-bold uppercase tracking-widest text-blue-400">{locale === 'ru' ? 'ВИЗУАЛЬНЫЙ КОНЦЕПТ' : 'VISUAL CONCEPT'}</h4>
                              <p className="text-[12px] text-white/50 leading-relaxed italic">
                                {assets?.video_banner.image_prompt}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 pt-4">
                            <button 
                              onClick={() => assets && generateSingleImage(assets.video_banner.image_prompt, '9:16', 'banner')}
                              disabled={isGeneratingImages['banner']}
                              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                              {isGeneratingImages['banner'] ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                              {imageResults['banner'] 
                                ? (locale === 'ru' ? 'ПЕРЕСОЗДАТЬ ОБЛОЖКУ' : 'REGENERATE THUMBNAIL') 
                                : (locale === 'ru' ? 'СГЕНЕРИРОВАТЬ ОБЛОЖКУ' : 'GENERATE THUMBNAIL')}
                            </button>

                            {imageResults['banner'] && (
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => handleDownload(imageResults['banner'], 'thumbnail.webp')}
                                  className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/10 border border-white/20 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all shadow-xl active:scale-95"
                                >
                                  <Download size={18} /> {locale === 'ru' ? 'СОХРАНИТЬ' : 'SAVE THUMB'}
                                </button>
                                <button 
                                  onClick={() => shareToSocial('youtube', assets!.video_banner.text_on_banner, 'YouTube Thumbnail')}
                                  className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all active:scale-90"
                                >
                                  <Share2 size={20} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-center items-start">
                          <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-[2.5rem] bg-white/[0.02] border border-white/10 overflow-hidden shadow-2xl group">
                            {imageResults['banner'] ? (
                              <>
                                <img src={imageResults['banner']} className="w-full h-full object-cover" />
                                {/* TEXT OVERLAY SIMULATION */}
                                <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center p-6 text-center">
                                  <div className="mt-auto mb-16 bg-white text-black px-4 py-2 font-black italic uppercase tracking-tighter text-md transform -rotate-2 shadow-2xl">
                                    {assets?.video_banner.text_on_banner}
                                  </div>
                                </div>
                                
                                <button 
                                  onClick={() => handleDownload(imageResults['banner'], 'video_banner.webp')}
                                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-90"
                                 >
                                  <Download size={16} />
                                </button>
                              </>
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white/[0.01]">
                                {isGeneratingImages['banner'] ? (
                                  <div className="flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 border-4 border-t-purple-500 border-white/5 rounded-full animate-spin" />
                                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">{locale === 'ru' ? 'Рисуем обложку...' : 'Rendering Banner...'}</span>
                                  </div>
                                ) : (
                                  <>
                                    <ImageIcon size={42} className="text-white/5 mb-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">{locale === 'ru' ? 'Превью обложки' : 'Banner Preview'}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
