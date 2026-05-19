'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Share2, Play, Download, 
  Copy, Check, Sparkles, Loader2, Image as ImageIcon,
  ChevronRight, ChevronLeft, RefreshCw, Layers, Monitor, Brain,
  Zap, ExternalLink, Wand2, ArrowLeft, X, Eye
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
  ig_carousel?: {
    slides: Array<{
      slide_number: number;
      role: 'hook' | 'problem' | 'pivot' | 'takeaway1' | 'takeaway2' | 'cta';
      text_on_slide: string;
      image_prompt: string;
      metaphor_tag: string;
    }>;
    cta_word: string;
    central_metaphor: string;
    visual_style_prefix: string;
    post_description: string;
    styleSeed?: number;
    _sourceHash?: string;
  } | null;
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
  const [generationError, setGenerationError] = useState<string | null>(null);

  const isPlatformGenerated = (platformId: string) => {
    if (platformId === 'sfv') return !!assets?.sfv_description?.text;
    if (platformId === 'threads') return !!assets?.deep_content?.threads_fb_text;
    if (platformId === 'linkedin') return !!assets?.linkedin_executive?.text;
    if (platformId === 'article') return !!assets?.longread_article?.text;
    if (platformId === 'carousel') return !!assets?.ig_carousel;
    if (platformId === 'banner') return !!imageResults?.banner;
    return false;
  };
  const [copying, setCopying] = useState<string | null>(null);

  // Upgrade Flow states (Phase 2 & 3 & 4)
  const [toneMode, setToneMode] = useState<'expert' | 'mentor' | 'provocateur'>('mentor');
  const [ctaWord, setCtaWord] = useState<string>('');
  const [userBrief, setUserBrief] = useState<string>('');
  const [styleSeed, setStyleSeed] = useState<number>(() => Math.floor(Math.random() * 9999));
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Instagram Gallery Studio specific states
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [activeTheme, setActiveTheme] = useState<'minimalist' | 'cyber' | 'business' | 'glow'>('minimalist');
  const [customSlideTexts, setCustomSlideTexts] = useState<Record<number, string>>({});
  const [customImagePrompts, setCustomImagePrompts] = useState<Record<number, string>>({});
  const [customPostDescription, setCustomPostDescription] = useState<string>('');
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);
  const [isRegeneratingAll, setIsRegeneratingAll] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxType, setLightboxType] = useState<'carousel' | 'banner' | null>(null);

  // Sync state with assets when loaded
  useEffect(() => {
    if (assets?.ig_carousel) {
      const initialTexts: Record<number, string> = {};
      const initialPrompts: Record<number, string> = {};
      const rawCarousel = assets.ig_carousel as any;
      const resolvedSlides = rawCarousel.slides || rawCarousel.prompts?.map((p: string, i: number) => ({
        slide_number: i + 1,
        image_prompt: p,
        text_on_slide: `Slide ${i + 1}`
      })) || [];

      resolvedSlides.forEach((slide: any) => {
        initialTexts[slide.slide_number] = slide.text_on_slide || '';
        initialPrompts[slide.slide_number] = slide.image_prompt || '';
      });
      setCustomSlideTexts(initialTexts);
      setCustomImagePrompts(initialPrompts);
      setCustomPostDescription(rawCarousel.post_description || assets.sfv_description?.text || '');

      // Sync backend outputs back to active controls
      if (rawCarousel.styleSeed !== undefined) {
        setStyleSeed(rawCarousel.styleSeed);
      }
      if (rawCarousel.cta_word) {
        setCtaWord(rawCarousel.cta_word);
      }
    }
  }, [assets]);

  const generateAllCarouselImages = async () => {
    if (!assets?.ig_carousel) return;
    setIsRegeneratingAll(true);
    try {
      const rawCarousel = assets.ig_carousel as any;
      const resolvedSlides = rawCarousel.slides || rawCarousel.prompts?.map((p: string, i: number) => ({
        slide_number: i + 1,
        image_prompt: p,
        text_on_slide: `Слайд ${i + 1}`
      })) || [];

      for (const slide of resolvedSlides) {
        const key = `carousel-${slide.slide_number - 1}`;
        if (!imageResults[key]) {
          const prompt = customImagePrompts[slide.slide_number] || slide.image_prompt;
          await generateSingleImage(prompt, '4:5', key);
        }
      }
    } catch (err) {
      console.error('All-slide gen failed:', err);
    } finally {
      setIsRegeneratingAll(false);
    }
  };

  const exportSlideToCanvas = (slideNum: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context could not be created'));
        return;
      }

      const drawContent = (img: HTMLImageElement | null) => {
        // 1. Draw Background (Image or Gradient)
        if (img) {
          // Object-fit cover math
          const imgRatio = img.width / img.height;
          const canvasRatio = 1080 / 1350;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (imgRatio > canvasRatio) {
            sw = img.height * canvasRatio;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / canvasRatio;
            sy = (img.height - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1080, 1350);
        } else {
          // Default Dark Gradient Background
          const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
          bgGrad.addColorStop(0, '#0a0a16');
          bgGrad.addColorStop(0.5, '#05050b');
          bgGrad.addColorStop(1, '#0e0e24');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, 1080, 1350);
        }

        // Reset shadow for overlays
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // 2. Draw Style Overlay & Card Details
        const textToDraw = customSlideTexts[slideNum] || `Слайд ${slideNum}`;

        if (activeTheme === 'minimalist') {
          // Minimalist Dark Overlay
          ctx.fillStyle = 'rgba(5, 5, 10, 0.6)';
          ctx.fillRect(0, 0, 1080, 1350);

          // Neon Border
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
          ctx.lineWidth = 6;
          ctx.strokeRect(50, 50, 980, 1250);

          // Render Text (Centered)
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'bold 50px sans-serif';

          // Word wrap
          const maxTextWidth = 800;
          const lines = wrapCanvasText(ctx, textToDraw, maxTextWidth);
          const startY = 1350 / 2 - ((lines.length - 1) * 70) / 2;
          lines.forEach((line, idx) => {
            ctx.fillText(line, 1080 / 2, startY + (idx * 70));
          });
        } 
        else if (activeTheme === 'cyber') {
          // Cyber style
          ctx.fillStyle = 'rgba(3, 3, 5, 0.4)';
          ctx.fillRect(0, 0, 1080, 1350);

          // Dark transparent card in center
          ctx.fillStyle = 'rgba(9, 9, 20, 0.9)';
          ctx.strokeStyle = '#e1306c';
          ctx.lineWidth = 4;
          
          drawRoundRect(ctx, 100, 300, 880, 750, 40);
          ctx.fill();
          ctx.stroke();

          // Cyber accent neon line
          ctx.fillStyle = '#00f2fe';
          ctx.fillRect(160, 380, 80, 8);

          // Text inside card
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.font = 'bold 46px sans-serif';

          const maxTextWidth = 760;
          const lines = wrapCanvasText(ctx, textToDraw, maxTextWidth);
          lines.forEach((line, idx) => {
            ctx.fillText(line, 160, 440 + (idx * 65));
          });
        } 
        else if (activeTheme === 'business') {
          // Pristine bottom white card style
          ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.fillRect(0, 0, 1080, 1350);

          // White rounded card at bottom half
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#eef2f6';
          ctx.lineWidth = 1;
          drawRoundRect(ctx, 80, 680, 920, 580, 32);
          ctx.fill();
          ctx.stroke();

          // Text inside card
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.font = 'bold 42px Georgia, serif';

          // Small tag inside card
          ctx.fillStyle = '#4f46e5';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText(`KEY TAKEAWAY #${slideNum}`, 140, 740);

          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 42px sans-serif';
          const maxTextWidth = 800;
          const lines = wrapCanvasText(ctx, textToDraw, maxTextWidth);
          lines.forEach((line, idx) => {
            ctx.fillText(line, 140, 800 + (idx * 62));
          });
        } 
        else if (activeTheme === 'glow') {
          // Bottom gradient dark shadow
          const gradient = ctx.createLinearGradient(0, 1350, 0, 400);
          gradient.addColorStop(0, 'rgba(0,0,0,0.95)');
          gradient.addColorStop(0.5, 'rgba(0,0,0,0.6)');
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 1080, 1350);

          // Text lower aligned with drop shadow
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 12;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 3;
          ctx.font = '900 52px sans-serif';

          const maxTextWidth = 900;
          const lines = wrapCanvasText(ctx, textToDraw, maxTextWidth);
          const startY = 1220 - ((lines.length - 1) * 75);
          lines.forEach((line, idx) => {
            ctx.fillText(line, 1080 / 2, startY + (idx * 75));
          });
        }

        // 3. Draw slide numbers / branding (Clean)
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.fillStyle = activeTheme === 'business' ? '#94a3b8' : 'rgba(255,255,255,0.4)';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`0${slideNum} / 06`, 980, 120);

        ctx.textAlign = 'left';
        ctx.fillText('@viral_engine', 100, 120);

        // Resolve data URL
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          resolve(dataUrl);
        } catch (e) {
          reject(e);
        }
      };

      // Load background image safely
      const bgUrl = imageResults[`carousel-${slideNum - 1}`];
      if (bgUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // critical for CORS issues on external URLs
        img.onload = () => drawContent(img);
        img.onerror = () => drawContent(null);
        img.src = bgUrl;
      } else {
        drawContent(null);
      }
    });
  };

  const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const wrapCanvasText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    let line = '';
    const lines: string[] = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());
    return lines.filter(Boolean);
  };

  const downloadSingleRenderedSlide = async (slideNum: number) => {
    try {
      const dataUrl = await exportSlideToCanvas(slideNum);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `slide_${slideNum}_rendered.jpg`;
      link.click();
    } catch (e) {
      console.error('[Slide Render Error]:', e);
      alert('Ошибка рендеринга слайда. Попробуйте еще раз.');
    }
  };

  const downloadAllRenderedSlides = async () => {
    setIsExportingAll(true);
    try {
      for (let i = 1; i <= 6; i++) {
        await new Promise(r => setTimeout(r, 150)); // subtle delay to prevent browser download locks
        await downloadSingleRenderedSlide(i);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingAll(false);
    }
  };

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
    setGenerationError(null);
    try {
      const res = await fetch('/api/ai/distribution-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptText, projectId, locale })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate assets');
      }
      const data = await res.json();
      setAssets(data);
      
      if (onUpdateManifest) {
        onUpdateManifest({
          ...manifest,
          distributionAssets: data
        });
      }
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || 'Unknown generation error');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCarouselOnly = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/ig-carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scriptText, 
          projectId, 
          locale, 
          ctaWord, 
          toneMode, 
          styleSeed, 
          userBrief 
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate Instagram Carousel');
      }
      const data = await res.json();
      
      const updatedAssets = {
        ...(assets || {}),
        ig_carousel: data
      } as any;
      
      setAssets(updatedAssets);
      
      if (onUpdateManifest) {
        onUpdateManifest({
          ...manifest,
          distributionAssets: updatedAssets
        });
      }
    } catch (err: any) {
      console.error('[Generate IG Carousel Error]:', err);
      alert(locale === 'ru' 
        ? `Ошибка генерации карусели: ${err.message || err}` 
        : `Failed to generate carousel: ${err.message || err}`
      );
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
          provider: 'flux',
          seed: styleSeed // Pass deterministic style seed
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
    <div className="w-full flex flex-col bg-[#05050a] rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      
      {generationError && (
        <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 font-bold uppercase tracking-widest flex items-center justify-between gap-4 animate-bounce relative z-10">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{locale === 'ru' ? `Ошибка генерации: ${generationError}` : `Generation Error: ${generationError}`}</span>
          </div>
          <button 
            onClick={() => setGenerationError(null)}
            className="text-red-400 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <div className="w-full flex flex-col text-white relative">
        {/* Global Glassmorphic Loader Overlay when generating all text platforms */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-45 flex flex-col items-center justify-center space-y-6">
            <div className="relative w-24 h-24 text-white animate-pulse">
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                 className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full shadow-[0_0_40px_rgba(168,85,247,0.3)]"
               />
               <div className="absolute inset-6 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/5">
                  <Brain size={24} className="text-white animate-pulse" />
               </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.5em] text-white">Synthesizing Digital DNA</span>
              <span className="text-[9px] text-white/40 uppercase tracking-widest">{locale === 'ru' ? 'Это займет около 3 секунд...' : 'Takes about 3 seconds...'}</span>
            </div>
          </div>
        )}

        {/* iOS-Style Distribution Grid / Channels */}
        <AnimatePresence mode="wait">
          {!selectedDetail ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full p-6 sm:p-8 relative z-10"
            >
              <div className="max-w-4xl mx-auto space-y-8 pb-10">
                <div className="flex flex-col items-center text-center space-y-2 py-2">
                  <span className="text-[10px] font-black tracking-[0.3em] uppercase text-purple-500">DIGITAL DNA SYNC</span>
                  <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                    {locale === 'ru' ? 'КАНАЛЫ ДИСТРИБУЦИИ' : 'DISTRIBUTION CHANNELS'}
                  </h3>
                </div>

                {/* 1. Large Centralized Call-to-Action if pack is not generated yet */}
                {!assets && (
                  <div className="flex flex-col items-center justify-center p-8 rounded-[2.5rem] bg-gradient-to-br from-purple-900/10 to-indigo-900/10 border border-purple-500/15 text-center space-y-5 max-w-2xl mx-auto shadow-xl">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <Sparkles size={28} className="animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-black uppercase tracking-wider text-white">{locale === 'ru' ? 'AI Дистрибуция готова' : 'AI Distribution Ready'}</h4>
                      <p className="text-[11px] text-white/40 uppercase tracking-widest leading-relaxed max-w-md">
                        {locale === 'ru' 
                          ? 'Сгенерируйте сразу 6 вирусных форматов продвижения под вашу ДНК бренда в один клик' 
                          : 'Generate 6 high-conversion social promo formats tailored to your Brand DNA in one tap'}
                      </p>
                    </div>
                    <button
                      onClick={generateAssets}
                      disabled={isGenerating}
                      className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      {locale === 'ru' ? 'СГЕНЕРИРОВАТЬ ВЕСЬ ПАКЕТ' : 'GENERATE FULL PACK'}
                    </button>
                  </div>
                )}

                {/* 2. Premium iOS App Icon Widgets */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                  {platforms.map((p, i) => {
                    const isRu = locale === 'ru';
                    const hasContent = isPlatformGenerated(p.id);
                    
                    const metas = {
                      sfv: {
                        title: isRu ? 'TikTok & Reels' : 'TikTok & Reels',
                        subtitle: isRu ? 'Вирусное описание' : 'Viral description',
                        gradient: hasContent 
                          ? 'from-[#0a0a0f] via-[#fe2c55]/[0.03] to-[#00f2fe]/[0.03] border-[#fe2c55]/30 shadow-[#fe2c55]/5' 
                          : 'from-neutral-950/40 to-neutral-950/60 border-white/5 border-dashed',
                        iconColor: hasContent ? 'text-[#fe2c55]' : 'text-white/20',
                      },
                      threads: {
                        title: isRu ? 'Threads & FB' : 'Threads & FB',
                        subtitle: isRu ? 'Глубокий пост' : 'Deep-dive text',
                        gradient: hasContent 
                          ? 'from-[#0a0a0f] via-white/[0.03] to-[#101015] border-white/20 shadow-white/5' 
                          : 'from-neutral-950/40 to-neutral-950/60 border-white/5 border-dashed',
                        iconColor: hasContent ? 'text-white' : 'text-white/20',
                      },
                      linkedin: {
                        title: isRu ? 'LinkedIn' : 'LinkedIn',
                        subtitle: isRu ? 'Бизнес-инсайт' : 'Executive insight',
                        gradient: hasContent 
                          ? 'from-[#051120] via-[#0a66c2]/[0.04] to-[#005c9e]/[0.04] border-[#0a66c2]/35 shadow-[#0a66c2]/5' 
                          : 'from-neutral-950/40 to-neutral-950/60 border-white/5 border-dashed',
                        iconColor: hasContent ? 'text-[#0A66C2]' : 'text-white/20',
                      },
                      article: {
                        title: isRu ? 'Longread Blog' : 'Longread Blog',
                        subtitle: isRu ? 'SEO-статья' : 'Deep article',
                        gradient: hasContent 
                          ? 'from-[#1a1005] via-[#ffb300]/[0.03] to-[#c28500]/[0.03] border-[#ffb300]/30 shadow-[#ffb300]/5' 
                          : 'from-neutral-950/40 to-neutral-950/60 border-white/5 border-dashed',
                        iconColor: hasContent ? 'text-[#FFB300]' : 'text-white/20',
                      },
                      carousel: {
                        title: isRu ? 'IG Carousel' : 'IG Carousel',
                        subtitle: isRu ? '6 слайдов галереи' : '6-slide storyboard',
                        gradient: hasContent 
                          ? 'from-[#1a0515] via-[#e1306c]/[0.04] to-[#f77737]/[0.04] border-[#e1306c]/30 shadow-[#e1306c]/5' 
                          : 'from-neutral-950/40 to-neutral-950/60 border-white/5 border-dashed',
                        iconColor: hasContent ? 'text-[#E1306C]' : 'text-white/20',
                      },
                      banner: {
                        title: isRu ? 'YouTube Cover' : 'YouTube Cover',
                        subtitle: isRu ? 'Высокий CTR клик' : 'High-CTR thumbnail',
                        gradient: hasContent 
                          ? 'from-[#200505] via-[#ff0000]/[0.04] to-[#b21212]/[0.04] border-[#ff0000]/30 shadow-[#ff0000]/5' 
                          : 'from-neutral-950/40 to-neutral-950/60 border-white/5 border-dashed',
                        iconColor: hasContent ? 'text-[#FF0000]' : 'text-white/20',
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
                        whileHover={{ scale: 1.04, y: -4 }}
                        whileTap={{ scale: 0.96 }}
                        className={cn(
                          "relative group p-6 sm:p-8 rounded-[2.2rem] sm:rounded-[2.6rem] border-2 text-left transition-all duration-300 overflow-hidden flex flex-col justify-between aspect-square shadow-2xl",
                          meta.gradient,
                          hasContent ? "hover:border-purple-400/50 shadow-[0_12px_30px_rgba(0,0,0,0.4)]" : "hover:border-white/20 hover:bg-white/[0.02]"
                        )}
                      >
                        {/* Glassmorphic Inner Glow */}
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-60 pointer-events-none group-hover:opacity-40 transition-opacity" />
                        
                        {/* Icon and Sleek iOS Tag */}
                        <div className="relative z-10 flex items-center justify-between w-full">
                          <div className={cn(
                            "w-14 h-14 sm:w-16 sm:h-16 rounded-[1.2rem] sm:rounded-[1.4rem] bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:bg-white/[0.08] transition-all duration-300", 
                            meta.iconColor
                          )}>
                            <p.icon size={28} />
                          </div>
                          <span className={cn(
                            "px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1 shadow-sm",
                            hasContent 
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                              : "bg-purple-500/10 border-purple-500/20 text-purple-400 group-hover:bg-purple-500/20"
                          )}>
                            {hasContent ? (locale === 'ru' ? '• ГОТОВО' : '• READY') : (locale === 'ru' ? '+ СОЗДАТЬ' : '+ CREATE')}
                          </span>
                        </div>

                        {/* Text and visual indicator */}
                        <div className="relative z-10 space-y-1 sm:space-y-1.5 mt-4">
                          <h4 className="text-[15px] sm:text-[18px] font-black text-white uppercase tracking-tight group-hover:text-purple-300 transition-colors leading-tight">
                            {meta.title}
                          </h4>
                          <p className="text-[9px] sm:text-[10px] text-white/40 font-bold uppercase tracking-widest leading-none group-hover:text-white/60 transition-colors">
                            {meta.subtitle}
                          </p>
                        </div>

                        {/* Subtle Chevron indicator */}
                        <div className="absolute bottom-6 right-6 text-white/15 group-hover:text-white/60 group-hover:translate-x-1 transition-all">
                          <ChevronRight size={20} />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* 3. Subtle iOS Secondary Regenerate Bar */}
                {assets && (
                  <div className="flex justify-center pt-4">
                    <button 
                      onClick={generateAssets}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-md"
                    >
                      {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      {locale === 'ru' ? 'ПЕРЕСОЗДАТЬ ВСЕ ФОРМАТЫ' : 'REGENERATE ALL FORMATS'}
                    </button>
                  </div>
                )}
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
                className="fixed inset-0 bg-[#07070c]/98 backdrop-blur-3xl z-[9999] flex flex-col overflow-hidden text-white"
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
                      <div className="max-w-4xl mx-auto w-full">
                        {!isPlatformGenerated(selectedDetail) ? (
                          /* Setup / Onboarding panel for this specific text platform */
                          <div className="max-w-xl mx-auto py-16 px-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-3xl text-center space-y-8 animate-in fade-in duration-300 shadow-2xl relative overflow-hidden">
                            {/* Ambient background glow */}
                            <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-[80px]" />
                            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px]" />
                            
                            <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto shadow-inner relative z-10">
                              <Sparkles size={28} className="animate-pulse" />
                            </div>
                            
                            <div className="space-y-3 relative z-10">
                              <h3 className="text-2xl font-black uppercase tracking-wider text-white">
                                {locale === 'ru' ? 'AI Копирайтер готов' : 'AI Copywriter Ready'}
                              </h3>
                              <p className="text-[11px] sm:text-xs text-white/40 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                                {locale === 'ru' 
                                  ? `Нейросеть готова адаптировать ваш сценарий под формат ${platforms.find(p => p.id === selectedDetail)?.label} с использованием вашего уникального цифрового ДНК.`
                                  : `The AI is ready to adapt your script into ${platforms.find(p => p.id === selectedDetail)?.label} format, fully aligned with your Digital DNA.`}
                              </p>
                            </div>

                            {generationError && (
                              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-[10px] font-mono text-red-400 text-left max-w-md mx-auto relative z-10">
                                ⚠️ Error: {generationError}
                              </div>
                            )}

                            <button
                              onClick={generateAssets}
                              disabled={isGenerating}
                              className="relative z-10 w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 mx-auto"
                            >
                              {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                              {locale === 'ru' ? '✨ Запустить генерацию контента' : '✨ Start Content Generation'}
                            </button>
                          </div>
                        ) : (
                          /* The standard generated workspace (optimised copy, analysis, actions) */
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
                      </div>
                    )}

                    {/* 2. INSTAGRAM CAROUSEL PLATFORM */}
                    {selectedDetail === 'carousel' && (
                      <div className="space-y-8 animate-in fade-in duration-300">
                        {/* 1. Header with Global Actions */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-md">
                          <div>
                            <h3 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-3">
                              <Sparkles size={20} className="text-purple-400" />
                              {locale === 'ru' ? 'Instagram Студия Галерей' : 'Instagram Carousel Studio'}
                            </h3>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                              {locale === 'ru' ? 'Визуальный холст + тексты постов на базе ДНК' : 'Visual Canvas + Brand DNA Post Optimizer'}
                            </p>
                          </div>
                          
                          {assets?.ig_carousel && (
                            <div className="flex flex-wrap gap-3">
                              <button
                                onClick={generateAllCarouselImages}
                                disabled={isRegeneratingAll}
                                className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                              >
                                {isRegeneratingAll ? <Loader2 size={12} className="animate-spin text-purple-400" /> : <Wand2 size={12} className="text-purple-400" />}
                                {locale === 'ru' ? 'Сгенерировать все фоны' : 'Generate All Backgrounds'}
                              </button>

                              <button
                                onClick={downloadAllRenderedSlides}
                                disabled={isExportingAll}
                                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg disabled:opacity-50"
                              >
                                {isExportingAll ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                {locale === 'ru' ? 'Скачать готовую карусель (6 JPG)' : 'Download Finished Carousel (6 JPGs)'}
                              </button>
                            </div>
                          )}
                        </div>

                        {!assets?.ig_carousel ? (
                          /* LAZY LOADING SETUP COMPONENT */
                          <div className="max-w-3xl mx-auto p-8 md:p-12 rounded-[2.5rem] bg-white/[0.01] border border-white/5 backdrop-blur-md space-y-8 animate-in zoom-in-95 duration-300">
                            <div className="text-center space-y-3">
                              <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400 animate-pulse">
                                <Sparkles size={28} />
                              </div>
                              <h4 className="text-lg font-black uppercase tracking-wider text-white">
                                {locale === 'ru' ? 'Настройка Генерации Карусели' : 'Configure Carousel Pipeline'}
                              </h4>
                              <p className="text-[11px] text-white/40 leading-relaxed max-w-md mx-auto">
                                {locale === 'ru' 
                                  ? 'Создай вовлекающую карусель из 6 слайдов, адаптированную под твою ДНК личности, с единым визуальным стилем.'
                                  : 'Create an engaging 6-slide carousel calibrated through your Brand DNA with visual cohesion.'}
                              </p>
                            </div>

                            <div className="space-y-6">
                              {/* 1. Tone Switch */}
                              <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                                  🎭 {locale === 'ru' ? 'Модель вещания (Tone Mode)' : 'Tone Model Mode'}
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                  {(['expert', 'mentor', 'provocateur'] as const).map(mode => (
                                    <button
                                      key={mode}
                                      onClick={() => setToneMode(mode)}
                                      className={cn(
                                        "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-[1.02] active:scale-[0.98]",
                                        toneMode === mode
                                          ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/25"
                                          : "bg-white/[0.02] border-white/10 text-white/50 hover:text-white/80"
                                      )}
                                    >
                                      {mode === 'expert' && (locale === 'ru' ? '🎓 Эксперт' : '🎓 Expert')}
                                      {mode === 'mentor' && (locale === 'ru' ? '🤝 Наставник' : '🤝 Mentor')}
                                      {mode === 'provocateur' && (locale === 'ru' ? '🔥 Провокатор' : '🔥 Provocateur')}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* 2. CTA word & Seed */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                                    🔑 {locale === 'ru' ? 'Кодовое слово (CTA)' : 'Automation Code Word'}
                                  </label>
                                  <input
                                    type="text"
                                    value={ctaWord}
                                    onChange={(e) => setCtaWord(e.target.value.toUpperCase())}
                                    placeholder={locale === 'ru' ? 'Например: СТАРТ' : 'E.g. START'}
                                    className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-[12px] text-white/80 placeholder-white/20 focus:border-purple-500/50 focus:outline-none transition-all"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                                      🎲 {locale === 'ru' ? 'Генеративный сид' : 'Generative Seed'}
                                    </label>
                                    <button 
                                      onClick={() => setStyleSeed(Math.floor(Math.random() * 9999))}
                                      className="text-[8px] font-bold text-white/30 uppercase tracking-widest hover:text-white/60 flex items-center gap-1"
                                    >
                                      <RefreshCw size={8} /> {locale === 'ru' ? 'Случайный' : 'Shuffle'}
                                    </button>
                                  </div>
                                  <div className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-[12px] font-mono text-purple-400 font-bold">
                                    #{styleSeed}
                                  </div>
                                </div>
                              </div>

                              {/* 3. User brief / prompt wishes */}
                              <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                                  💬 {locale === 'ru' ? 'Твоё пожелание к карусели (Опционально)' : 'Your creative brief / wishes (Optional)'}
                                </label>
                                <textarea
                                  value={userBrief}
                                  onChange={(e) => setUserBrief(e.target.value)}
                                  placeholder={locale === 'ru'
                                    ? 'Например: сделай упор на боли новичков, используй юмор, упомяни мой курс по продажам...'
                                    : 'E.g. focus on beginner pain points, use humor, mention my sales course...'}
                                  rows={3}
                                  className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-[12px] text-white/80 placeholder-white/20 focus:border-purple-500/50 focus:outline-none transition-all resize-none"
                                />
                                <p className="text-[8px] text-white/25 font-bold uppercase tracking-widest">
                                  {locale === 'ru'
                                    ? 'Пожелание будет откалибровано через ДНК и подстроено под твой голос автоматически'
                                    : 'Your brief will be filtered through your Brand DNA and adapted to your voice automatically'}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={generateCarouselOnly}
                              disabled={isGenerating}
                              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl disabled:opacity-50"
                            >
                              {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                              {locale === 'ru' ? '✨ Запустить генерацию карусели' : '✨ Start Carousel Generation'}
                            </button>
                          </div>
                        ) : (
                          /* 2. Main Active Workspace Layout */
                          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                            
                            {/* LEFT PANE (Columns 5): Live Mockup Card & Controls */}
                            <div className="xl:col-span-5 space-y-6 flex flex-col">
                              <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                                  {locale === 'ru' ? 'Предварительный просмотр' : 'Instagram Mockup Preview'}
                                </span>
                                <span className="text-[10px] font-bold text-white/40">
                                  {activeSlideIndex + 1} / 6
                                </span>
                              </div>

                              {/* Instagram Slide Canvas Container */}
                              <div 
                                onClick={() => {
                                  const key = `carousel-${activeSlideIndex}`;
                                  if (imageResults[key]) {
                                    setLightboxType('carousel');
                                    setLightboxIndex(activeSlideIndex);
                                  }
                                }}
                                className={cn(
                                  "relative w-full aspect-[4/5] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl bg-black flex flex-col group transition-all duration-300",
                                  imageResults[`carousel-${activeSlideIndex}`] ? "cursor-zoom-in hover:scale-[1.01] hover:border-purple-500/30" : ""
                                )}
                              >
                                {/* Eye indicator on hover */}
                                {imageResults[`carousel-${activeSlideIndex}`] && (
                                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none duration-300 z-30">
                                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl scale-90 group-hover:scale-100 transition-all duration-300">
                                      <Eye size={22} />
                                    </div>
                                  </div>
                                )}

                                {/* Background Image / Placeholder */}
                                {(() => {
                                  const key = `carousel-${activeSlideIndex}`;
                                  const url = imageResults[key];
                                  const isGen = isGeneratingImages[key];

                                  if (url) {
                                    return <img src={url} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-102" alt="Slide BG" />;
                                  }
                                  if (isGen) {
                                    return (
                                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                                        <Loader2 size={40} className="text-purple-500 animate-spin mb-4" />
                                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{locale === 'ru' ? 'Рисуем фон слайда...' : 'Generating background...'}</p>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-zinc-950 flex flex-col items-center justify-center p-8 text-center border-b border-white/5">
                                      <ImageIcon size={32} className="text-white/10 mb-4" />
                                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">
                                        {locale === 'ru' ? 'Фон не сгенерирован' : 'No visual background generated'}
                                      </p>
                                      <button
                                        onClick={() => {
                                          const prompt = customImagePrompts[activeSlideIndex + 1] || (assets?.ig_carousel as any)?.slides?.[activeSlideIndex]?.image_prompt || (assets?.ig_carousel as any)?.prompts?.[activeSlideIndex] || '';
                                          generateSingleImage(prompt, '4:5', key);
                                        }}
                                        className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                                      >
                                        {locale === 'ru' ? 'Сгенерировать' : 'Generate Visual'}
                                      </button>
                                    </div>
                                  );
                                })()}

                                {/* Styled Live Text Overlay (Updates in Realtime!) */}
                                <div className="absolute inset-0 flex flex-col justify-between p-10 z-10 pointer-events-none select-none">
                                  {/* Slide Top branding */}
                                  <div className="flex items-center justify-between text-white/50 font-bold text-[11px] tracking-wider">
                                    <span>@viral_engine</span>
                                    <span className={cn("px-2 py-0.5 rounded bg-black/30 backdrop-blur-md border border-white/10 text-[9px]", activeTheme === 'business' && 'text-slate-500 bg-transparent border-none')}>
                                      0{activeSlideIndex + 1} / 06
                                    </span>
                                  </div>

                                  {/* Slide Body Content Based on Theme */}
                                  <div className="flex-1 flex flex-col justify-center">
                                    {activeTheme === 'minimalist' && (
                                      <div className="w-full h-full absolute inset-0 bg-black/60 border-[4px] border-purple-500/30 flex items-center justify-center p-12 text-center">
                                        <p className="text-white font-extrabold text-2xl md:text-3xl leading-snug tracking-tight drop-shadow-md">
                                          {customSlideTexts[activeSlideIndex + 1] || `Slide ${activeSlideIndex + 1}`}
                                        </p>
                                      </div>
                                    )}

                                    {activeTheme === 'cyber' && (
                                      <div className="w-full p-8 rounded-3xl bg-black/85 border border-pink-500/50 shadow-lg text-left space-y-4">
                                        <div className="w-16 h-1.5 bg-cyan-400 rounded-full" />
                                        <p className="text-white font-black text-xl md:text-2xl leading-relaxed tracking-wide uppercase">
                                          {customSlideTexts[activeSlideIndex + 1] || `Slide ${activeSlideIndex + 1}`}
                                        </p>
                                      </div>
                                    )}

                                    {activeTheme === 'business' && (
                                      <div className="w-full p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-left mt-auto space-y-3">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">KEY TAKEAWAY #{activeSlideIndex + 1}</span>
                                        <p className="text-slate-800 font-bold text-lg md:text-xl leading-snug">
                                          {customSlideTexts[activeSlideIndex + 1] || `Slide ${activeSlideIndex + 1}`}
                                        </p>
                                      </div>
                                    )}

                                    {activeTheme === 'glow' && (
                                      <div className="w-full text-center mt-auto pb-4">
                                        <p className="text-white font-black text-2xl md:text-3xl leading-snug tracking-tighter drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)]">
                                          {customSlideTexts[activeSlideIndex + 1] || `Slide ${activeSlideIndex + 1}`}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Navigation Chevrons inside preview */}
                                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between z-20 pointer-events-none">
                                  <button
                                    onClick={() => setActiveSlideIndex(prev => (prev > 0 ? prev - 1 : 5))}
                                    className="pointer-events-auto p-2.5 rounded-full bg-black/60 border border-white/10 text-white hover:bg-black/80 transition-all hover:scale-105 active:scale-95 shadow-xl"
                                  >
                                    <ChevronLeft size={16} />
                                  </button>
                                  <button
                                    onClick={() => setActiveSlideIndex(prev => (prev < 5 ? prev + 1 : 0))}
                                    className="pointer-events-auto p-2.5 rounded-full bg-black/60 border border-white/10 text-white hover:bg-black/80 transition-all hover:scale-105 active:scale-95 shadow-xl"
                                  >
                                    <ChevronRight size={16} />
                                  </button>
                                </div>
                              </div>

                              {/* Slide indicators dot list */}
                              <div className="flex justify-center gap-2">
                                {[...Array(6)].map((_, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setActiveSlideIndex(i)}
                                    className={cn(
                                      "w-2 h-2 rounded-full transition-all duration-300",
                                      activeSlideIndex === i ? "w-6 bg-purple-500" : "bg-white/20 hover:bg-white/40"
                                    )}
                                  />
                                ))}
                              </div>

                              {/* Theme Segmented Toggles */}
                              <div className="p-1 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-1">
                                {(['minimalist', 'cyber', 'business', 'glow'] as const).map(theme => (
                                  <button
                                    key={theme}
                                    onClick={() => setActiveTheme(theme)}
                                    className={cn(
                                      "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                      activeTheme === theme 
                                        ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" 
                                        : "text-white/40 hover:text-white/70"
                                    )}
                                  >
                                    {theme === 'minimalist' && (locale === 'ru' ? 'Мини' : 'Min')}
                                    {theme === 'cyber' && (locale === 'ru' ? 'Кибер' : 'Cyber')}
                                    {theme === 'business' && (locale === 'ru' ? 'Бизнес' : 'Biz')}
                                    {theme === 'glow' && (locale === 'ru' ? 'Свечение' : 'Glow')}
                                  </button>
                                ))}
                              </div>

                              <button
                                onClick={() => downloadSingleRenderedSlide(activeSlideIndex + 1)}
                                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
                              >
                                <Download size={14} className="text-purple-400" />
                                {locale === 'ru' ? `Скачать Слайд ${activeSlideIndex + 1} (Рендер с текстом)` : `Download Slide ${activeSlideIndex + 1} (Rendered)`}
                              </button>
                            </div>

                            {/* RIGHT PANE (Columns 7): Tabbed Editor Console & Brief Settings */}
                            <div className="xl:col-span-7 flex flex-col space-y-6">
                              
                              {/* 1. Collapsible AI Tuning Accordion */}
                              <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4">
                                <button
                                  onClick={() => setShowSettings(!showSettings)}
                                  className="flex items-center justify-between w-full text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    <Brain size={14} className="text-purple-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
                                      {locale === 'ru' ? 'AI Пульт Настройки ДНК' : 'AI Brand DNA Calibration'}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-bold text-purple-400 hover:text-purple-300 transition-all uppercase tracking-widest">
                                    {showSettings ? (locale === 'ru' ? 'Скрыть ✕' : 'Hide ✕') : (locale === 'ru' ? 'Настроить ⚙' : 'Configure ⚙')}
                                  </span>
                                </button>

                                {showSettings && (
                                  <div className="space-y-6 pt-4 border-t border-white/5 animate-in slide-in-from-top-4 duration-300">
                                    {/* Tone Mode pills */}
                                    <div className="space-y-2">
                                      <label className="text-[8px] font-black uppercase tracking-widest text-white/30">
                                        {locale === 'ru' ? 'Модель вещания (Tone Mode)' : 'Tone Model Mode'}
                                      </label>
                                      <div className="grid grid-cols-3 gap-2">
                                        {(['expert', 'mentor', 'provocateur'] as const).map(mode => (
                                          <button
                                            key={mode}
                                            onClick={() => setToneMode(mode)}
                                            className={cn(
                                              "py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95",
                                              toneMode === mode
                                                ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20"
                                                : "bg-white/[0.02] border-white/10 text-white/40 hover:text-white/80"
                                            )}
                                          >
                                            {mode === 'expert' && (locale === 'ru' ? 'Эксперт' : 'Expert')}
                                            {mode === 'mentor' && (locale === 'ru' ? 'Наставник' : 'Mentor')}
                                            {mode === 'provocateur' && (locale === 'ru' ? 'Провокатор' : 'Provocateur')}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* CTA Word & Seed */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-white/30">
                                          {locale === 'ru' ? 'Кодовое слово' : 'CTA Code Word'}
                                        </label>
                                        <input
                                          type="text"
                                          value={ctaWord}
                                          onChange={(e) => setCtaWord(e.target.value.toUpperCase())}
                                          placeholder={locale === 'ru' ? 'СТАРТ' : 'START'}
                                          className="w-full px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-[11px] text-white/80 placeholder-white/20 focus:border-purple-500/50 focus:outline-none transition-all"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                          <label className="text-[8px] font-black uppercase tracking-widest text-white/30">
                                            {locale === 'ru' ? 'Визуальный seed' : 'Style Seed'}
                                          </label>
                                          <button 
                                            onClick={() => setStyleSeed(Math.floor(Math.random() * 9999))}
                                            className="text-[8px] font-bold text-purple-400 hover:text-purple-300 transition-all flex items-center gap-1"
                                          >
                                            <RefreshCw size={8} /> {locale === 'ru' ? 'Случайный' : 'Shuffle'}
                                          </button>
                                        </div>
                                        <div className="w-full px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-[11px] font-mono text-purple-400 font-bold">
                                          #{styleSeed}
                                        </div>
                                      </div>
                                    </div>

                                    {/* User brief wishes */}
                                    <div className="space-y-1.5">
                                      <label className="text-[8px] font-black uppercase tracking-widest text-white/30">
                                        {locale === 'ru' ? 'Твоё пожелание к карусели' : 'Your creative brief'}
                                      </label>
                                      <textarea
                                        value={userBrief}
                                        onChange={(e) => setUserBrief(e.target.value)}
                                        placeholder={locale === 'ru'
                                          ? 'Например: сделай упор на боли новичков, используй юмор...'
                                          : 'E.g. focus on beginner pain points, use humor...'}
                                        rows={2}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-[11px] text-white/80 placeholder-white/20 focus:border-purple-500/50 focus:outline-none transition-all resize-none"
                                      />
                                    </div>

                                    {/* Re-generate button inside expanded settings */}
                                    <button
                                      onClick={generateCarouselOnly}
                                      disabled={isGenerating}
                                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl disabled:opacity-50"
                                    >
                                      {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                      {locale === 'ru' ? '✨ Перегенерировать тексты карусели' : '✨ Regenerate Carousel Texts'}
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Editor Mode Tabs */}
                              <div className="p-1.5 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-2">
                                <button
                                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                                >
                                  <Layers size={14} className="text-purple-400" />
                                  {locale === 'ru' ? 'Контент Слайдов' : 'Slide Contents'}
                                </button>
                              </div>

                              {/* TAB CONTENT: Slide Details list */}
                              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {(() => {
                                  const rawCarousel = assets?.ig_carousel as any;
                                  const resolvedSlides = rawCarousel?.slides || rawCarousel?.prompts?.map((p: string, i: number) => ({
                                    slide_number: i + 1,
                                    image_prompt: p,
                                    text_on_slide: `Слайд ${i + 1}`
                                  })) || [];

                                  return resolvedSlides.map((slide: any) => {
                                    const num = slide.slide_number;
                                    const isActive = activeSlideIndex === num - 1;
                                    const key = `carousel-${num - 1}`;
                                    const url = imageResults[key];
                                    const isGen = isGeneratingImages[key];

                                    return (
                                      <div
                                        key={num}
                                        onClick={() => setActiveSlideIndex(num - 1)}
                                        className={cn(
                                          "p-6 rounded-[2rem] bg-white/[0.01] border transition-all duration-300 cursor-pointer flex flex-col md:flex-row gap-6 items-start",
                                          isActive 
                                            ? "border-purple-500 bg-purple-500/[0.02] shadow-[0_0_20px_rgba(168,85,247,0.05)]" 
                                            : "border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                                        )}
                                      >
                                        {/* Mini Thumbnail */}
                                        <div 
                                          onClick={(e) => {
                                            if (url) {
                                              e.stopPropagation();
                                              setLightboxType('carousel');
                                              setLightboxIndex(num - 1);
                                            }
                                          }}
                                          className={cn(
                                            "w-20 aspect-[4/5] rounded-xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center relative transition-all duration-300 group/thumb",
                                            url ? "cursor-zoom-in hover:border-purple-500/50 hover:scale-[1.05]" : ""
                                          )}
                                        >
                                          {url ? (
                                            <>
                                              <img src={url} className="w-full h-full object-cover" alt="Thumb" />
                                              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity pointer-events-none duration-300">
                                                <Eye size={12} className="text-white" />
                                              </div>
                                            </>
                                          ) : isGen ? (
                                            <Loader2 size={16} className="text-purple-500 animate-spin" />
                                          ) : (
                                            <ImageIcon size={20} className="text-white/10" />
                                          )}
                                        </div>

                                        {/* Editors */}
                                        <div className="flex-1 space-y-4 w-full">
                                          <div className="flex items-center justify-between w-full">
                                            <span className="text-[11px] font-black text-purple-400 uppercase tracking-widest">
                                              Slide {num} — {
                                                num === 1 ? (locale === 'ru' ? 'Хук / Зацепка' : 'Hook') :
                                                num === 2 ? (locale === 'ru' ? 'Проблема / Боль' : 'Problem') :
                                                num === 3 ? (locale === 'ru' ? 'Разворот / Интрига' : 'Pivot / Contrast') :
                                                num === 4 ? (locale === 'ru' ? 'Польза / Шаг 1' : 'Takeaway 1') :
                                                num === 5 ? (locale === 'ru' ? 'Польза / Шаг 2' : 'Takeaway 2') :
                                                (locale === 'ru' ? 'Призыв к действию' : 'Frictionless CTA')
                                              }
                                            </span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                generateSingleImage(customImagePrompts[num] || slide.image_prompt, '4:5', key);
                                              }}
                                              disabled={isGen}
                                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white/70 hover:text-white flex items-center gap-1.5 transition-all"
                                            >
                                              {isGen ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                                              {locale === 'ru' ? 'Перерисовать' : 'Regen'}
                                            </button>
                                          </div>

                                          {/* Overlay text field */}
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-white/30">{locale === 'ru' ? 'Текст на слайде' : 'Visual Text Overlay'}</label>
                                            <input
                                              type="text"
                                              value={customSlideTexts[num] || ''}
                                              onChange={(e) => {
                                                setCustomSlideTexts(prev => ({ ...prev, [num]: e.target.value }));
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              placeholder={locale === 'ru' ? 'Введите текст для слайда...' : 'Enter text overlay...'}
                                              className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 text-[12px] font-bold text-white focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.04] transition-all"
                                            />
                                          </div>

                                          {/* Image Prompt field */}
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-white/30">{locale === 'ru' ? 'Промпт для изображения' : 'Background Image Prompt'}</label>
                                            <textarea
                                              value={customImagePrompts[num] || ''}
                                              onChange={(e) => {
                                                setCustomImagePrompts(prev => ({ ...prev, [num]: e.target.value }));
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              placeholder={locale === 'ru' ? 'Опишите фоновый образ...' : 'Describe visual concept...'}
                                              rows={2}
                                              className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/70 leading-relaxed focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.04] transition-all resize-none"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>

                              {/* Caption Console Section */}
                              <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1">
                                    <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-widest">
                                      {locale === 'ru' ? 'Текст описания к посту' : 'Instagram Caption Console'}
                                    </h4>
                                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                                      {locale === 'ru' ? 'Откалибровано под ToV вашего ДНК' : 'Calibrated and aligned with your voice DNA'}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(customPostDescription);
                                      setCopying('caption');
                                      setTimeout(() => setCopying(null), 2000);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"
                                  >
                                    {copying === 'caption' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                    {copying === 'caption' ? (locale === 'ru' ? 'Скопировано!' : 'Copied!') : (locale === 'ru' ? 'Скопировать' : 'Copy')}
                                  </button>
                                </div>

                                <textarea
                                  value={customPostDescription}
                                  onChange={(e) => setCustomPostDescription(e.target.value)}
                                  rows={5}
                                  className="w-full px-5 py-4 rounded-2xl bg-white/[0.01] border border-white/5 text-[12px] text-white/90 leading-relaxed focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.03] transition-all custom-scrollbar resize-none"
                                />

                                {/* Caption details/stats */}
                                <div className="flex gap-4 text-[9px] font-bold text-white/30 uppercase tracking-widest">
                                  <span>{locale === 'ru' ? 'Символов' : 'Chars'}: {customPostDescription.length}</span>
                                  <span>{locale === 'ru' ? 'Слов' : 'Words'}: {customPostDescription.split(/\s+/).filter(Boolean).length}</span>
                                  <span>{locale === 'ru' ? 'Хэштеги' : 'Hashtags'}: {customPostDescription.split('#').length - 1}</span>
                                </div>
                              </div>

                            </div>
                          </div>
                        )}
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
                                "{assets?.video_banner?.text_on_banner || (locale === 'ru' ? 'Хук вашего видео' : 'Your video hook')}"
                              </div>
                            </div>

                            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-3">
                              <h4 className="text-[9px] font-bold uppercase tracking-widest text-blue-400">{locale === 'ru' ? 'ВИЗУАЛЬНЫЙ КОНЦЕПТ' : 'VISUAL CONCEPT'}</h4>
                              <p className="text-[12px] text-white/50 leading-relaxed italic">
                                {assets?.video_banner?.image_prompt || (locale === 'ru' ? 'Визуальный концепт обложки будет создан после полной генерации дистрибуции.' : 'Cover visual concept will be created after generating distribution assets.')}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 pt-4">
                            <button 
                              onClick={() => assets?.video_banner && generateSingleImage(assets.video_banner.image_prompt, '9:16', 'banner')}
                              disabled={!assets?.video_banner || isGeneratingImages['banner']}
                              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30"
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
                                  onClick={() => assets?.video_banner && shareToSocial('youtube', assets.video_banner.text_on_banner, 'YouTube Thumbnail')}
                                  className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all active:scale-90"
                                >
                                  <Share2 size={20} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-center items-start">
                          <div 
                            onClick={() => imageResults['banner'] && setLightboxType('banner')}
                            className={cn(
                              "relative w-full max-w-[280px] aspect-[9/16] rounded-[2.5rem] bg-white/[0.02] border border-white/10 overflow-hidden shadow-2xl group transition-all duration-300",
                              imageResults['banner'] ? "cursor-zoom-in hover:scale-[1.02] hover:border-purple-500/35" : ""
                            )}
                          >
                            {imageResults['banner'] ? (
                              <>
                                <img src={imageResults['banner']} className="w-full h-full object-cover" />
                                {/* TEXT OVERLAY SIMULATION */}
                                <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center p-6 text-center">
                                  <div className="mt-auto mb-16 bg-white text-black px-4 py-2 font-black italic uppercase tracking-tighter text-md transform -rotate-2 shadow-2xl">
                                    {assets?.video_banner.text_on_banner}
                                  </div>
                                </div>
                                
                                {/* Eye indicator on hover */}
                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none duration-300">
                                  <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl scale-90 group-hover:scale-100 transition-all duration-300">
                                    <Eye size={22} />
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

      {/* Premium iOS Image & Carousel Lightbox Modal */}
      {lightboxType === 'carousel' && lightboxIndex !== null && (
        <div 
          onClick={() => {
            setLightboxType(null);
            setLightboxIndex(null);
          }}
          className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-10 animate-in fade-in duration-200"
        >
          {/* Close button with premium micro-interaction */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setLightboxType(null);
              setLightboxIndex(null);
            }}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all z-20 shadow-lg"
          >
            <X size={24} />
          </button>

          {/* Lightbox Slide Container */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px] aspect-[4/5] rounded-[3rem] border border-white/15 overflow-hidden shadow-2xl bg-black flex flex-col animate-in zoom-in-95 duration-200"
          >
            {/* Slide Image */}
            {(() => {
              const key = `carousel-${lightboxIndex}`;
              const url = imageResults[key];
              if (url) {
                return <img src={url} className="absolute inset-0 w-full h-full object-cover" alt="Full Slide" />;
              }
              return (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white/20">
                  <ImageIcon size={48} />
                  <p className="mt-4 text-xs font-bold uppercase tracking-widest">{locale === 'ru' ? 'Изображение не сгенерировано' : 'No image generated'}</p>
                </div>
              );
            })()}

            {/* Styled Live Text Overlay (Full-screen version!) */}
            <div className="absolute inset-0 flex flex-col justify-between p-10 z-10 pointer-events-none select-none">
              <div className="flex items-center justify-between text-white/50 font-bold text-[10px] tracking-wider">
                <span>@viral_engine</span>
                <span className={cn("px-2 py-0.5 rounded bg-black/30 backdrop-blur-md border border-white/10 text-[9px]", activeTheme === 'business' && 'text-slate-500 bg-transparent border-none')}>
                  0{lightboxIndex + 1} / 06
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                {activeTheme === 'minimalist' && (
                  <div className="w-full h-full absolute inset-0 bg-black/60 border-[4px] border-purple-500/30 flex items-center justify-center p-12 text-center">
                    <p className="text-white font-extrabold text-2xl md:text-3xl leading-snug tracking-tight drop-shadow-md">
                      {customSlideTexts[lightboxIndex + 1] || `Slide ${lightboxIndex + 1}`}
                    </p>
                  </div>
                )}

                {activeTheme === 'cyber' && (
                  <div className="w-full p-8 rounded-3xl bg-black/85 border border-pink-500/50 shadow-lg text-left space-y-4">
                    <div className="w-16 h-1.5 bg-cyan-400 rounded-full" />
                    <p className="text-white font-black text-xl md:text-2xl leading-relaxed tracking-wide uppercase">
                      {customSlideTexts[lightboxIndex + 1] || `Slide ${lightboxIndex + 1}`}
                    </p>
                  </div>
                )}

                {activeTheme === 'business' && (
                  <div className="w-full p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-left mt-auto space-y-3">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">KEY TAKEAWAY #{lightboxIndex + 1}</span>
                    <p className="text-slate-800 font-bold text-lg md:text-xl leading-snug">
                      {customSlideTexts[lightboxIndex + 1] || `Slide ${lightboxIndex + 1}`}
                    </p>
                  </div>
                )}

                {activeTheme === 'glow' && (
                  <div className="w-full text-center mt-auto pb-4">
                    <p className="text-white font-black text-2xl md:text-3xl leading-snug tracking-tighter drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)]">
                      {customSlideTexts[lightboxIndex + 1] || `Slide ${lightboxIndex + 1}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Left and Right navigation buttons */}
          <div className="absolute inset-x-4 sm:inset-x-12 top-1/2 -translate-y-1/2 flex justify-between z-20 pointer-events-none">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(prev => prev !== null ? (prev === 0 ? 5 : prev - 1) : 0);
              }}
              className="w-14 h-14 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white text-white/60 flex items-center justify-center backdrop-blur-md transition-all active:scale-90 pointer-events-auto shadow-xl"
            >
              <ChevronLeft size={28} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(prev => prev !== null ? (prev === 5 ? 0 : prev + 1) : 0);
              }}
              className="w-14 h-14 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white text-white/60 flex items-center justify-center backdrop-blur-md transition-all active:scale-90 pointer-events-auto shadow-xl"
            >
              <ChevronRight size={28} />
            </button>
          </div>

          {/* Page Counter Label */}
          <div className="mt-6 text-sm font-bold text-white/40 uppercase tracking-[0.2em]">
            {locale === 'ru' ? `Слайд ${lightboxIndex + 1} из 6` : `Slide ${lightboxIndex + 1} of 6`}
          </div>
        </div>
      )}

      {/* Premium iOS YouTube Cover Lightbox Modal */}
      {lightboxType === 'banner' && (
        <div 
          onClick={() => setLightboxType(null)}
          className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-10 animate-in fade-in duration-200"
        >
          {/* Close button with premium micro-interaction */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setLightboxType(null);
            }}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all z-20 shadow-lg"
          >
            <X size={24} />
          </button>

          {/* Lightbox Banner Container */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px] aspect-[9/16] rounded-[3rem] border border-white/15 overflow-hidden shadow-2xl bg-black flex flex-col animate-in zoom-in-95 duration-200"
          >
            {/* Banner Image */}
            {imageResults['banner'] ? (
              <>
                <img src={imageResults['banner']} className="absolute inset-0 w-full h-full object-cover" alt="Full Cover" />
                <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center p-8 text-center">
                  <div className="mt-auto mb-20 bg-white text-black px-6 py-3 font-black italic uppercase tracking-tighter text-xl transform -rotate-2 shadow-2xl">
                    {assets?.video_banner?.text_on_banner}
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white/20">
                <ImageIcon size={48} />
                <p className="mt-4 text-xs font-bold uppercase tracking-widest">{locale === 'ru' ? 'Обложка не сгенерирована' : 'No cover generated'}</p>
              </div>
            )}
          </div>

          <div className="mt-6 text-sm font-bold text-white/40 uppercase tracking-[0.2em]">
            {locale === 'ru' ? 'Предпросмотр обложки' : 'Video Cover Preview'}
          </div>
        </div>
      )}
    </div>
  );
}
