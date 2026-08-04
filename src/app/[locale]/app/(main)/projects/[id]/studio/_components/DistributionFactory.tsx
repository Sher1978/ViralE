'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Share2, Play, Download, 
  Copy, Check, Sparkles, Loader2, Image as ImageIcon,
  ChevronRight, ChevronLeft, RefreshCw, Layers, Monitor, Brain,
  Zap, ExternalLink, Wand2, ArrowLeft, X, Eye, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface DistributionFactoryProps {
  manifest: any;
  scriptText: string;
  projectId: string;
  locale: string;
  projectTitle?: string;
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

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof globalThis === 'undefined' || !(globalThis as any).localStorage) return null;
    try {
      return (globalThis as any).localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof globalThis === 'undefined' || !(globalThis as any).localStorage) return;
    try {
      (globalThis as any).localStorage.setItem(key, value);
    } catch (e) {}
  }
};

const safeAlert = (msg: string) => {
  if (typeof globalThis !== 'undefined' && (globalThis as any).alert) {
    (globalThis as any).alert(msg);
  } else {
    console.log('[Alert Fallback]:', msg);
  }
};

const safeDocument = typeof globalThis !== 'undefined' ? (globalThis as any).document : null;
const safeImage = typeof globalThis !== 'undefined' ? (globalThis as any).Image : null;
const safeWindow = typeof globalThis !== 'undefined' ? (globalThis as any) : null;

export default function DistributionFactory({ manifest, scriptText, projectId, locale, projectTitle, onUpdateManifest }: DistributionFactoryProps) {
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
  const [carouselBgMode, setCarouselBgMode] = useState<'gradient' | 'solid'>('gradient');
  const [carouselBg1, setCarouselBg1] = useState<string>('#0d071b');
  const [carouselBg2, setCarouselBg2] = useState<string>('#230b42');
  const [carouselTextColor, setCarouselTextColor] = useState<string>('#ffffff');
  const [carouselAccentColor, setCarouselAccentColor] = useState<string>('#c084fc');
  const [customSlideTexts, setCustomSlideTexts] = useState<Record<number, string>>({});
  const [customImagePrompts, setCustomImagePrompts] = useState<Record<number, string>>({});
  const [customPostDescription, setCustomPostDescription] = useState<string>('');
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);
  const [isRegeneratingAll, setIsRegeneratingAll] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxType, setLightboxType] = useState<'carousel' | 'banner' | null>(null);

  const isAnyImageGenerating = Object.values(isGeneratingImages).some(Boolean);
  const isAnyGenerationActive = isGenerating || isRegeneratingAll || isAnyImageGenerating;

  // Visual DNA JSON Schema editor states
  const [visualDnaConfig, setVisualDnaConfig] = useState<string>('');
  const [visualDnaError, setVisualDnaError] = useState<string | null>(null);
  const [isSavingDna, setIsSavingDna] = useState<boolean>(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'parameters' | 'design_json'>('parameters');

  // Load User Custom Visual DNA Config
  useEffect(() => {
    const fetchVisualDna = async () => {
      const defaultTemplate = {
        "typography": {
          "primary_font_family": "Outfit, sans-serif",
          "accent_font_family": "Fira Code, monospace",
          "base_font_size_mobile": "14px",
          "base_font_size_desktop": "18px",
          "line_height": 1.35,
          "letter_spacing": "-0.02em",
          "text_transform": "uppercase",
          "font_weights": { "regular": 400, "bold": 700, "black": 900 }
        },
        "color_system": {
          "palette_mode": "dark",
          "background": {
            "canvas_color": "#060608",
            "gradient_start": "#0A0A0F",
            "gradient_end": "#020204",
            "ambient_glow_color": "rgba(168, 85, 247, 0.15)"
          },
          "typography_colors": {
            "primary": "#FFFFFF",
            "secondary": "rgba(255, 255, 255, 0.6)",
            "muted": "rgba(255, 255, 255, 0.3)"
          },
          "accents": {
            "primary_brand_color": "#A855F7",
            "secondary_brand_color": "#06B6D4",
            "border_color": "rgba(255, 255, 255, 0.05)"
          }
        },
        "layout_and_positioning": {
          "overlay_anchor_y": "center",
          "overlay_anchor_x": "center",
          "text_alignment": "center",
          "container_card": {
            "has_backing_card": true,
            "backing_type": "glassmorphism",
            "blur_strength": "16px",
            "opacity": 0.85,
            "border_radius": "24px",
            "border_width": "1.5px"
          }
        },
        "image_generation_dna": {
          "style_preset": "cyberpunk_synthwave",
          "master_prefix": "Premium 3D render in octane render engine, cyberpunk tech aesthetic, holographic wireframes, glowing neon elements, high-tech abstract nodes, dark ambient atmospheric lighting, ultra high resolution 8k, cinematic color grading, rich textures --no text, words, subtitles",
          "negative_prompt": "text, letters, words, subtitles, signatures, ugly, lowres, blurry, human face, photo, portrait, realistic skin"
        }
      };

      try {
        // Try local storage first
        const localDna = safeLocalStorage.getItem('viral_engine_visual_dna');
        if (localDna) {
          setVisualDnaConfig(localDna);
        } else {
          setVisualDnaConfig(JSON.stringify(defaultTemplate, null, 2));
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('visual_dna_config')
            .eq('id', user.id)
            .single();
          
          if (!error && data?.visual_dna_config) {
            setVisualDnaConfig(JSON.stringify(data.visual_dna_config, null, 2));
            safeLocalStorage.setItem('viral_engine_visual_dna', JSON.stringify(data.visual_dna_config, null, 2));
          }
        }
      } catch (e) {
        console.warn('[Visual DNA Fetch Failed, using localStorage fallback]:', e);
      }
    };
    fetchVisualDna();
  }, []);

  const handleSaveVisualDna = async () => {
    setVisualDnaError(null);
    setIsSavingDna(true);
    try {
      const parsed = JSON.parse(visualDnaConfig);
      
      // Save locally first to guarantee persistence
      safeLocalStorage.setItem('viral_engine_visual_dna', JSON.stringify(parsed, null, 2));

      // Attempt DB save
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ visual_dna_config: parsed })
          .eq('id', user.id);
          
        if (error) {
          console.warn('[Save Visual DNA to DB skipped/failed, fallback to localStorage successful]:', error);
        }
      }
      
      safeAlert(locale === 'ru' ? 'Дизайн-система ДНК успешно сохранена!' : 'Brand DNA design system saved successfully!');
    } catch (err: any) {
      console.error('[Save Visual DNA error]:', err);
      setVisualDnaError(err.message || 'Invalid JSON syntax');
    } finally {
      setIsSavingDna(false);
    }
  };

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

  const generateFullGalleryAtOnce = async () => {
    setIsRegeneratingAll(true);
    console.log('[Unified Gen] Starting unified gallery generation flow...');
    try {
      let currentAssets = assets;
      
      // Step 1: Generate texts and structure if not already present
      if (!currentAssets?.ig_carousel) {
        console.log('[Unified Gen] Step 1: Generating text structure and prompts...');
        const resText = await fetch('/api/ai/ig-carousel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            scriptText, 
            projectId, 
            ideaTitle: projectTitle || (manifest as any)?.ideaTitle,
            locale, 
            ctaWord, 
            toneMode, 
            styleSeed, 
            userBrief,
            customVisualDna: safeLocalStorage.getItem('viral_engine_visual_dna') 
              ? JSON.parse(safeLocalStorage.getItem('viral_engine_visual_dna')!) 
              : null
          })
        });
        
        if (!resText.ok) {
          const errorData = await resText.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to generate carousel texts');
        }
        
        const textData = await resText.json();
        currentAssets = {
          ...(assets || {}),
          ig_carousel: textData
        } as any;
        
        setAssets(currentAssets);
        
        if (onUpdateManifest) {
          onUpdateManifest({
            ...manifest,
            distributionAssets: currentAssets
          });
        }
      }
      
      // Step 2: Generate Cover Image background ONLY for Slide 1
      if (!currentAssets || !currentAssets.ig_carousel) {
        throw new Error(locale === 'ru' ? 'Текст карусели не был сгенерирован' : 'Carousel texts were not generated');
      }
      const rawCarousel = currentAssets.ig_carousel as any;
      const resolvedSlides = rawCarousel.slides || [];
      const coverSlide = resolvedSlides.find((s: any) => s.slide_number === 1);

      if (coverSlide && coverSlide.image_prompt) {
        const key = `carousel-0`;
        const prompt = customImagePrompts[1] || coverSlide.image_prompt;
        await generateSingleImage(prompt, '4:5', key);
      }
      
    } catch (err: any) {
      console.error('[Unified Gen Error]:', err);
      safeAlert(locale === 'ru' 
        ? `Ошибка комплексной генерации галереи: ${err.message || err}` 
        : `Failed to generate unified gallery: ${err.message || err}`
      );
    } finally {
      setIsRegeneratingAll(false);
    }
  };

  const exportSlideToCanvas = (slideNum: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = safeDocument ? safeDocument.createElement('canvas') : null;
      if (!canvas) {
        reject(new Error('Document not available'));
        return;
      }
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context could not be created'));
        return;
      }

      const drawContent = (img: any) => {
        const slideData = assets?.ig_carousel?.slides?.find((s: any) => s.slide_number === slideNum);
        const textToDraw = customSlideTexts[slideNum] || slideData?.text_on_slide || `Слайд ${slideNum}`;

        if (slideNum === 1) {
          // --- SLIDE 1: COVER SLIDE ---
          if (img) {
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

            const coverGrad = ctx.createLinearGradient(0, 0, 0, 1350);
            coverGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
            coverGrad.addColorStop(0.5, 'rgba(0,0,0,0.6)');
            coverGrad.addColorStop(1, 'rgba(0,0,0,0.95)');
            ctx.fillStyle = coverGrad;
            ctx.fillRect(0, 0, 1080, 1350);
          } else {
            const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
            bgGrad.addColorStop(0, carouselBg1);
            bgGrad.addColorStop(1, carouselBgMode === 'gradient' ? carouselBg2 : carouselBg1);
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 1080, 1350);
          }

          const coverHeadline = textToDraw || projectTitle || (manifest as any)?.ideaTitle || 'Хук вашего видео';

          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 4;

          ctx.fillStyle = carouselTextColor || '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 56px sans-serif';

          const maxTextWidth = 920;
          const lines = wrapCanvasText(ctx, coverHeadline.toUpperCase(), maxTextWidth);
          const startY = 1350 / 2 - ((lines.length - 1) * 76) / 2;
          lines.forEach((line, idx) => {
            ctx.fillText(line, 1080 / 2, startY + (idx * 76));
          });
        } else {
          // --- SLIDES 2-6: BODY SLIDES (SOLID / 2-COLOR GRADIENT, NO BG IMAGE, NO CARDS) ---
          if (carouselBgMode === 'gradient') {
            const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
            bgGrad.addColorStop(0, carouselBg1);
            bgGrad.addColorStop(1, carouselBg2);
            ctx.fillStyle = bgGrad;
          } else {
            ctx.fillStyle = carouselBg1;
          }
          ctx.fillRect(0, 0, 1080, 1350);

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;

          // Header Tag / Badge
          ctx.fillStyle = carouselAccentColor || '#c084fc';
          ctx.font = '900 24px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(`KEY TAKEAWAY 0${slideNum - 1}`, 100, 160);

          // Subtitle-derived text rendered cleanly directly on background
          ctx.fillStyle = carouselTextColor || '#ffffff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.font = 'bold 44px sans-serif';

          const maxTextWidth = 880;
          const lines = wrapCanvasText(ctx, textToDraw, maxTextWidth);
          const startY = 260;
          lines.forEach((line, idx) => {
            ctx.fillText(line, 100, startY + (idx * 66));
          });
        }

        // Slide numbering & branding footer
        ctx.shadowColor = 'transparent';
        const isLight = carouselTextColor === '#000000' || carouselTextColor === '#0f172a';
        ctx.fillStyle = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`0${slideNum} / 06`, 980, 1260);

        ctx.textAlign = 'left';
        ctx.fillText('@viral_engine', 100, 1260);

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          resolve(dataUrl);
        } catch (e) {
          reject(e);
        }
      };

      // Load image ONLY for Slide 1 (Cover)
      const bgUrl = slideNum === 1 ? imageResults[`carousel-0`] : null;
      if (bgUrl) {
        const img = safeImage ? new safeImage() : null;
        if (img) {
          img.crossOrigin = 'anonymous';
          img.onload = () => drawContent(img);
          img.onerror = () => drawContent(null);
          img.src = bgUrl;
        } else {
          drawContent(null);
        }
      } else {
        drawContent(null);
      }
    });
  };

  const drawRoundRect = (ctx: any, x: number, y: number, w: number, h: number, r: number) => {
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

  const wrapCanvasText = (ctx: any, text: string, maxWidth: number): string[] => {
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
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `slide_${slideNum}_cover_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      const nav = globalThis.navigator as any;
      if (nav?.share && nav?.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({
            files: [file],
            title: `Обложка слайда #${slideNum}`,
            text: `Обложка/слайд #${slideNum} из ViralEngine`
          });
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      const link = safeDocument ? safeDocument.createElement('a') : null;
      if (link) {
        const objectUrl = URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = fileName;
        safeDocument.body.appendChild(link);
        link.click();
        safeDocument.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      }
    } catch (e) {
      console.error('[Slide Render Error]:', e);
      safeAlert('Ошибка рендеринга слайда. Попробуйте еще раз.');
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

  const exportBannerToCanvas = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = safeDocument ? safeDocument.createElement('canvas') : null;
      if (!canvas) {
        reject(new Error('Document not available'));
        return;
      }
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context could not be created'));
        return;
      }

      const drawContent = (img: any) => {
        // 1. Draw Background (Image or Gradient)
        if (img) {
          const imgRatio = img.width / img.height;
          const canvasRatio = 1080 / 1920;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (imgRatio > canvasRatio) {
            sw = img.height * canvasRatio;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / canvasRatio;
            sy = (img.height - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1080, 1920);
        } else {
          const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
          bgGrad.addColorStop(0, '#0a0a16');
          bgGrad.addColorStop(0.5, '#05050b');
          bgGrad.addColorStop(1, '#0e0e24');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, 1080, 1920);
        }

        // 2. Overlay bg-black/20
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, 1080, 1920);

        // 3. Draw Text Banner/Ribbon Overlay
        const textToDraw = assets?.video_banner?.text_on_banner || (locale === 'ru' ? 'Хук вашего видео' : 'Your video hook');
        
        ctx.save();
        
        // Measure text and wrap it
        ctx.font = 'italic 900 50px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const paddingX = 84;
        const paddingY = 54;
        const maxTextWidth = 800; // 972 - 168 = 804, so 800 is perfect
        
        const lines = wrapCanvasText(ctx, textToDraw.toUpperCase(), maxTextWidth);
        const lineHeight = 68;
        const textBlockHeight = lines.length * lineHeight;
        
        let maxLineWidth = 0;
        lines.forEach(line => {
          const metrics = ctx.measureText(line);
          if (metrics.width > maxLineWidth) {
            maxLineWidth = metrics.width;
          }
        });
        
        const ribbonWidth = Math.max(300, maxLineWidth + paddingX * 2);
        const ribbonHeight = textBlockHeight + paddingY * 2;
        
        const centerY = 1920 - 340 - ribbonHeight / 2;
        const centerX = 1080 / 2;
        
        ctx.translate(centerX, centerY);
        ctx.rotate(-3 * Math.PI / 180);
        
        const shadowOffset = 8;
        const notch = 30; // scaled notch depth

        const drawRibbonPath = (c: any, w: number, h: number, notchDepth: number) => {
          const halfW = w / 2;
          const halfH = h / 2;
          c.beginPath();
          c.moveTo(-halfW, -halfH);
          c.lineTo(halfW, -halfH);
          // Right notch
          c.lineTo(halfW, -notchDepth);
          c.lineTo(halfW - notchDepth, 0);
          c.lineTo(halfW, notchDepth);
          c.lineTo(halfW, halfH);
          c.lineTo(-halfW, halfH);
          // Left notch
          c.lineTo(-halfW, notchDepth);
          c.lineTo(-halfW + notchDepth, 0);
          c.lineTo(-halfW, -notchDepth);
          c.closePath();
        };

        // Draw Shadow Ribbon (black)
        ctx.fillStyle = '#000000';
        ctx.save();
        ctx.translate(shadowOffset, shadowOffset);
        drawRibbonPath(ctx, ribbonWidth, ribbonHeight, notch);
        ctx.fill();
        ctx.restore();
        
        // Draw Foreground Ribbon (yellow #FFE600)
        ctx.fillStyle = '#FFE600';
        drawRibbonPath(ctx, ribbonWidth, ribbonHeight, notch);
        ctx.fill();
        
        // Draw black border around foreground ribbon
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 9;
        drawRibbonPath(ctx, ribbonWidth, ribbonHeight, notch);
        ctx.stroke();
        
        // Draw the text (black)
        ctx.fillStyle = '#000000';
        const startY = -textBlockHeight / 2 + lineHeight / 2;
        lines.forEach((line, idx) => {
          ctx.fillText(line, 0, startY + idx * lineHeight);
        });
        
        ctx.restore();

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          resolve(dataUrl);
        } catch (e) {
          reject(e);
        }
      };

      const bgUrl = imageResults['banner'];
      if (bgUrl) {
        const img = safeImage ? new safeImage() : null;
        if (img) {
          img.crossOrigin = 'anonymous';
          img.onload = () => drawContent(img);
          img.onerror = () => drawContent(null);
          img.src = bgUrl;
        } else {
          drawContent(null);
        }
      } else {
        drawContent(null);
      }
    });
  };

  const downloadRenderedBanner = async () => {
    try {
      const dataUrl = await exportBannerToCanvas();
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `video_cover_banner_${projectId || 'viral'}_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      const nav = globalThis.navigator as any;
      if (nav?.share && nav?.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({
            files: [file],
            title: 'Обложка для видео',
            text: 'Обложка видео сгенерированная в ViralEngine'
          });
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      const link = safeDocument ? safeDocument.createElement('a') : null;
      if (link) {
        const objectUrl = URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = fileName;
        safeDocument.body.appendChild(link);
        link.click();
        safeDocument.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      }
    } catch (e) {
      console.error('[Banner Render Error]:', e);
      safeAlert(locale === 'ru' ? 'Ошибка рендеринга обложки. Попробуйте еще раз.' : 'Error rendering cover. Please try again.');
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

  const generateCoverImage = async () => {
    let currentBannerPrompt = assets?.video_banner?.image_prompt;
    
    // If video_banner prompt is not generated yet, generate concept on-the-fly using the transcript text!
    if (!currentBannerPrompt) {
      setIsGenerating(true);
      try {
        const textToUse = scriptText || (manifest as any)?.customScript || (manifest as any)?.scriptText || manifest?.transcript?.text || '';
        const res = await fetch('/api/ai/distribution-assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            scriptText: textToUse, 
            projectId, 
            ideaTitle: projectTitle || manifest?.ideaTitle || manifest?.projectTitle,
            locale 
          })
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to generate cover concept');
        }
        const data = await res.json();
        const updatedAssets = { ...(assets || {}), ...data };
        setAssets(updatedAssets);
        if (onUpdateManifest) {
          onUpdateManifest({
            ...manifest,
            distributionAssets: updatedAssets
          });
        }
        currentBannerPrompt = data?.video_banner?.image_prompt;
      } catch (err: any) {
        console.error('[Generate Cover Asset Error]:', err);
        safeAlert(locale === 'ru' 
          ? `Ошибка генерации концепта обложки: ${err.message || err}` 
          : `Failed to generate cover concept: ${err.message || err}`
        );
        return;
      } finally {
        setIsGenerating(false);
      }
    }

    if (currentBannerPrompt) {
      await generateSingleImage(currentBannerPrompt, '9:16', 'banner');
    } else {
      const textToUse = scriptText || projectTitle || (locale === 'ru' ? 'Обложка видео' : 'Video cover');
      const fallbackPrompt = `Cinematic keyframe graphic representing: ${textToUse}. High contrast 9:16 banner --no text, words`;
      await generateSingleImage(fallbackPrompt, '9:16', 'banner');
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
          userBrief,
          customVisualDna: safeLocalStorage.getItem('viral_engine_visual_dna') 
            ? JSON.parse(safeLocalStorage.getItem('viral_engine_visual_dna')!) 
            : null
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
      safeAlert(locale === 'ru' 
        ? `Ошибка генерации карусели: ${err.message || err}` 
        : `Failed to generate carousel: ${err.message || err}`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSingleImage = async (prompt: string, ar: string, key: string) => {
    setIsGeneratingImages(prev => ({ ...prev, [key]: true }));
    console.log(`[Image Gen] Starting generation for key "${key}" with prompt: "${prompt}"`);
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
        console.log(`[Image Gen] Success for key "${key}"! Received image URL:`, data.url);
        const newResults = { ...imageResults, [key]: data.url };
        setImageResults(newResults);

        if (onUpdateManifest) {
          onUpdateManifest({
            ...manifest,
            distributionImages: newResults
          });
        }
      } else {
        const errText = await res.text();
        console.error(`[Image Gen] Failed for key "${key}"! Status: ${res.status}, Error:`, errText);
        safeAlert(locale === 'ru' 
          ? `Ошибка генерации изображения (${key}): ${errText || 'Неизвестная ошибка сервера'}` 
          : `Failed to generate image (${key}): ${errText || 'Unknown server error'}`
        );
      }
    } catch (err: any) {
      console.error(`[Image Gen] Catch error for key "${key}":`, err);
      safeAlert(locale === 'ru' 
        ? `Сетевая ошибка при генерации (${key}): ${err.message || err}` 
        : `Network error during generation (${key}): ${err.message || err}`
      );
    } finally {
      setIsGeneratingImages(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleCopy = (text: string, id: string) => {
    (navigator as any).clipboard.writeText(text);
    setCopying(id);
    setTimeout(() => setCopying(null), 2000);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = safeDocument ? safeDocument.createElement('a') : null;
      if (link) {
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
      }
    } catch (err) {
      if (safeWindow && safeWindow.open) {
        safeWindow.open(url, '_blank');
      }
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
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: title || 'Viral Engine Content',
          text: text,
          url: safeWindow ? safeWindow.location.href : '',
        });
      } catch (err) {
        console.log('Share failed:', err);
      }
    } else {
      const encodedText = encodeURIComponent(text);
      const urls: Record<string, string> = {
        telegram: `https://t.me/share/url?url=${encodeURIComponent(safeWindow ? safeWindow.location.href : '')}&text=${encodedText}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(safeWindow ? safeWindow.location.href : '')}`,
      };

      if (urls[platform]) {
        if (safeWindow && safeWindow.open) safeWindow.open(urls[platform], '_blank');
      } else {
        if (safeWindow && safeWindow.open) safeWindow.open('https://t.me/ViralEngine_Bot', '_blank');
      }
    }
  };

  const saveTextAsFile = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = safeDocument ? safeDocument.createElement('a') : null;
    if (a) {
      a.href = url;
      a.download = filename;
      a.click();
    }
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
                <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/30 backdrop-blur-md relative z-10 safe-top">
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
                              {selectedDetail === 'sfv' ? (assets?.sfv_description?.text ? assets.sfv_description.text.replace(/^(Для\s+)?(TikTok|Тикток|Рилс|Reels)(\/|\s+)?(TikTok|Тикток|Рилс|Reels)?:?\s*/i, '').trim() : '') : 
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
                        <div className="flex flex-col gap-6 p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-md">
                          {/* Navigation Back Button */}
                          <button
                            onClick={() => setSelectedDetail(null)}
                            className="self-start flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                          >
                            <ArrowLeft size={14} /> {locale === 'ru' ? 'НАЗАД В МАТРИЦУ' : 'BACK TO MATRIX'}
                          </button>

                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-3">
                                <Sparkles size={20} className="text-purple-400" />
                                {locale === 'ru' ? 'Instagram Студия Галерей' : 'Instagram Carousel Studio'}
                              </h3>
                              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                                {locale === 'ru' ? 'Визуальный холст + тексты постов на базе ДНК' : 'Visual Canvas + Brand DNA Post Optimizer'}
                              </p>
                            </div>
                          
                            <div className="flex flex-wrap gap-3">
                              <button
                                onClick={generateFullGalleryAtOnce}
                                disabled={isAnyGenerationActive}
                                className={cn(
                                  "px-3 sm:px-6 py-2.5 sm:py-4 rounded-2xl sm:rounded-3xl text-[8px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-[0.2em] flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg disabled:opacity-50 border border-white/10",
                                  isAnyGenerationActive
                                    ? "bg-purple-600/30 text-purple-200 border-purple-500/30"
                                    : "bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/10"
                                )}
                              >
                                {isAnyGenerationActive ? (
                                  <>
                                    <Loader2 size={12} className="animate-spin text-white" />
                                    {locale === 'ru' ? 'СОЗДАЕМ...' : 'GENERATING...'}
                                  </>
                                ) : (
                                  <>
                                    <Wand2 size={12} className="text-white animate-pulse" />
                                    {locale === 'ru' ? 'Сгенерировать всю галерею (6 слайдов)' : 'Generate Full Gallery (6 Slides)'}
                                  </>
                                )}
                              </button>

                              {assets?.ig_carousel && (
                                <button
                                  onClick={downloadAllRenderedSlides}
                                  disabled={isExportingAll}
                                  className="px-3 sm:px-6 py-2.5 sm:py-4 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-[0.2em] flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                  {isExportingAll ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                  {locale === 'ru' ? 'Скачать карусель (6 JPG)' : 'Download Carousel (6 JPGs)'}
                                </button>
                              )}
                            </div>
                        </div>
                      </div>

                        {/* 2. Configuration Accordion */}
                        <div className="rounded-[2.5rem] bg-white/[0.01] border border-white/5 overflow-hidden">
                          <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                                <Brain size={20} />
                              </div>
                              <span className="font-black uppercase tracking-widest text-[12px] text-purple-400">
                                {locale === 'ru' ? 'Настройка Генерации Карусели' : 'Configure Carousel Pipeline'}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-white/30 hover:text-white/60 transition-colors uppercase tracking-widest">
                              {showSettings ? (locale === 'ru' ? 'Скрыть ✕' : 'Hide ✕') : (locale === 'ru' ? 'Открыть настройки ⚙' : 'Configure ⚙')}
                            </span>
                          </button>

                                                    {showSettings && (
                            <div className="px-6 pb-6 pt-2 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                              {/* Tab Selection */}
                              <div className="flex gap-2 mb-6 border-b border-white/5 pb-3">
                                <button
                                  type="button"
                                  onClick={() => setActiveSettingsTab('parameters')}
                                  className={cn(
                                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border",
                                    activeSettingsTab === 'parameters'
                                      ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20"
                                      : "bg-white/[0.02] border-white/10 text-white/50 hover:text-white"
                                  )}
                                >
                                  ⚙ {locale === 'ru' ? 'Параметры текста' : 'Text Parameters'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveSettingsTab('design_json')}
                                  className={cn(
                                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border",
                                    activeSettingsTab === 'design_json'
                                      ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20"
                                      : "bg-white/[0.02] border-white/10 text-white/50 hover:text-white"
                                  )}
                                >
                                  🎨 {locale === 'ru' ? 'Бренд-код (JSON)' : 'Visual DNA JSON'}
                                </button>
                              </div>

                              {activeSettingsTab === 'parameters' ? (
                                <div className="space-y-4 animate-in fade-in-50 duration-200">
                                  <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                                      🎭 {locale === 'ru' ? 'Модель вещания (Tone Mode)' : 'Tone Model Mode'}
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                      {(['expert', 'mentor', 'provocateur'] as const).map(mode => (
                                        <button
                                          key={mode}
                                          type="button"
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

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                                        🔑 {locale === 'ru' ? 'Кодовое слово (CTA)' : 'Automation Code Word'}
                                      </label>
                                      <input
                                        type="text"
                                        value={ctaWord}
                                        onChange={(e) => setCtaWord((e.target as any).value.toUpperCase())}
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
                                          type="button"
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

                                  <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                                      💬 {locale === 'ru' ? 'Твоё пожелание к карусели' : 'Your creative brief'}
                                    </label>
                                    <textarea
                                      value={userBrief}
                                      onChange={(e) => setUserBrief((e.target as any).value)}
                                      placeholder={locale === 'ru'
                                        ? 'Например: сделай упор на боли новичков, используй юмор...'
                                        : 'E.g. focus on beginner pain points, use humor...'}
                                      rows={2}
                                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-[12px] text-white/80 placeholder-white/20 focus:border-purple-500/50 focus:outline-none transition-all resize-none custom-scrollbar"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-4 animate-in fade-in-50 duration-200">
                                  <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
                                        <FileText size={10} />
                                        {locale === 'ru' ? 'Спецификация бренд-кода (JSON)' : 'Visual DNA Schema Config'}
                                      </label>
                                      {visualDnaError && (
                                        <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest">
                                          ⚠️ {visualDnaError}
                                        </span>
                                      )}
                                    </div>
                                    <textarea
                                      value={visualDnaConfig}
                                      onChange={(e) => {
                                        setVisualDnaConfig((e.target as any).value);
                                        setVisualDnaError(null);
                                      }}
                                      rows={14}
                                      className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 font-mono text-[10px] text-green-400 placeholder-white/20 focus:border-purple-500/50 focus:outline-none transition-all resize-y custom-scrollbar"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleSaveVisualDna}
                                      disabled={isSavingDna}
                                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl disabled:opacity-50"
                                    >
                                      {isSavingDna ? <Loader2 size={12} className="animate-spin text-white" /> : <Sparkles size={12} />}
                                      {locale === 'ru' ? 'Валидировать и сохранить ДНК' : 'Validate & Save Visual DNA'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                      </div>

                        {/* 3. Pre-rendered 6 Image Slots Grid */}
                        <div className="space-y-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                            <span className="text-[12px] font-black text-white uppercase tracking-widest">
                              {locale === 'ru' ? 'Визуальная Матрица (6 Слайдов)' : 'Visual Matrix (6 Slides)'}
                            </span>
                            
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                              {/* Theme Toggles inside matrix header */}
                              <div className="p-1 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-1">
                                {(['minimalist', 'cyber', 'business', 'glow'] as const).map(theme => (
                                  <button
                                    key={theme}
                                    onClick={() => setActiveTheme(theme)}
                                    className={cn(
                                      "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all",
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

                              {/* ONE Main Unified Generation Action in the Upper Right Corner */}
                              <button
                                onClick={generateFullGalleryAtOnce}
                                disabled={isAnyGenerationActive}
                                className={cn(
                                  "px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50",
                                  isAnyGenerationActive
                                    ? "bg-purple-600/30 text-purple-200 border border-purple-500/30 cursor-not-allowed"
                                    : "bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-white/10"
                                )}
                              >
                                {isAnyGenerationActive ? (
                                  <>
                                    <Loader2 size={10} className="animate-spin text-white" />
                                    {locale === 'ru' ? 'СОЗДАЕМ...' : 'GENERATING...'}
                                  </>
                                ) : (
                                  <>
                                    <Wand2 size={10} className="text-white animate-pulse" />
                                    {locale === 'ru' ? 'Сгенерировать всё' : 'Generate All'}
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* 1. Horizontal Scroll Track of Previews ONLY */}
                          <div className="relative">
                            <div 
                              id="carousel-scroller"
                              className="flex overflow-x-auto gap-4 pb-6 snap-x snap-mandatory scrollbar-none scroll-smooth -mx-5 px-5"
                              onScroll={(e) => {
                                const target = e.currentTarget as any;
                                const scrollLeft = target.scrollLeft;
                                const width = target.offsetWidth;
                                const cardWidth = scrollLeft / (width * 0.7);
                                const index = Math.min(5, Math.max(0, Math.round(cardWidth)));
                                if (index !== activeSlideIndex) {
                                  setActiveSlideIndex(index);
                                }
                              }}
                            >
                              {(() => {
                                const rawCarousel = assets?.ig_carousel as any;
                                const generatedSlides = rawCarousel?.slides || rawCarousel?.prompts?.map((p: string, i: number) => ({
                                  slide_number: i + 1,
                                  image_prompt: p,
                                  text_on_slide: `Слайд ${i + 1}`
                                })) || [];

                                const highlightText = (text: string) => {
                                  if (!text) return '';
                                  const words = text.split(/(\s+)/);
                                  return words.map((word, idx) => {
                                    const clean = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()""''«»]/g,"");
                                    if (word.startsWith('"') || word.endsWith('"') || word.startsWith('«') || word.endsWith('»')) {
                                      return <span key={idx} className="text-yellow-400 font-extrabold">{word}</span>;
                                    }
                                    if (clean.length > 2 && clean === clean.toUpperCase() && !/^\d+$/.test(clean)) {
                                      return <span key={idx} className="text-purple-400 font-black">{word}</span>;
                                    }
                                    return word;
                                  });
                                };

                                return [...Array(6)].map((_, i) => {
                                  const num = i + 1;
                                  const slideData = generatedSlides[i];
                                  const key = `carousel-${num - 1}`;
                                  const url = imageResults[key];
                                  const isGen = isGeneratingImages[key];

                                  return (
                                    <div 
                                      key={num}
                                      onClick={() => {
                                        setActiveSlideIndex(i);
                                        const container = safeDocument ? safeDocument.getElementById('carousel-scroller') : null;
                                        if (container) {
                                          const cardWidth = (container as any).scrollWidth / 6;
                                          container.scrollTo({
                                            left: i * cardWidth,
                                            behavior: 'smooth'
                                          });
                                        }
                                      }}
                                      className={cn(
                                        "w-[75vw] sm:w-[280px] shrink-0 snap-center transition-all duration-300 cursor-pointer p-1 rounded-[2rem]",
                                        activeSlideIndex === i 
                                          ? "scale-100 opacity-100 ring-2 ring-purple-500/50 shadow-[0_0_25px_rgba(168,85,247,0.2)]" 
                                          : "scale-95 opacity-50 hover:opacity-80"
                                      )}
                                    >
                                      {/* Beautiful Slide Preview Canvas */}
                                      <div className="relative w-full aspect-[4/5] rounded-[1.8rem] overflow-hidden bg-[#0a0a0f] border border-white/5 flex flex-col items-center justify-center p-6 group/canvas">
                                        {url ? (
                                          <>
                                            <img 
                                              src={url} 
                                              alt={`Slide ${num}`} 
                                              crossOrigin="anonymous"
                                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/canvas:scale-105"
                                              loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/80" />
                                          </>
                                        ) : (
                                          <>
                                            {/* Glowing ambient backlight inside empty card */}
                                            <div className="absolute -inset-10 bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 rounded-full blur-3xl opacity-60 group-hover/canvas:opacity-80 group-hover/canvas:scale-110 transition-all duration-700" />
                                            
                                            {/* Digital Tech Grid Overlay */}
                                            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px]" />
                                            <div className="absolute inset-0 bg-radial-gradient" />
                                            
                                            {/* Tech Brackets & Status */}
                                            <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-[7px] font-mono tracking-widest text-white/20 uppercase">
                                              <span>[sensor_active]</span>
                                              <span>4:5 AR</span>
                                            </div>
                                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-[7px] font-mono tracking-widest text-white/20 uppercase">
                                              <span>[empty_canvas]</span>
                                              <span>sl_0{num}</span>
                                            </div>
                                            
                                            <div className="absolute top-4 left-4 w-2 h-2 border-t border-l border-white/15" />
                                            <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-white/15" />
                                            <div className="absolute bottom-4 left-4 w-2 h-2 border-b border-l border-white/15" />
                                            <div className="absolute bottom-4 right-4 w-2 h-2 border-b border-r border-white/15" />
                                          </>
                                        )}

                                        {/* Watermark branding header */}
                                        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
                                          <span className="text-[7px] font-black uppercase tracking-[0.25em] text-white/50 bg-black/30 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/5">
                                            @viral_engine
                                          </span>
                                          <span className="text-[7px] font-black text-purple-400/90 bg-purple-500/10 backdrop-blur-md px-2 py-0.5 rounded-full border border-purple-500/20">
                                            0{num} / 06
                                          </span>
                                        </div>

                                        {/* Dynamic Theme Subtitles ALWAYS Rendered */}
                                        <div className="absolute inset-x-6 top-[28%] bottom-16 flex flex-col justify-center items-center text-center z-10 pointer-events-none">
                                          {activeTheme === 'minimalist' && (
                                            <div className="w-full p-4 rounded-2xl bg-black/75 backdrop-blur-md border border-white/10 flex items-center justify-center text-center shadow-xl">
                                              <p className="text-white font-extrabold text-[11px] md:text-xs leading-snug tracking-tight">
                                                {highlightText(customSlideTexts[num] !== undefined ? customSlideTexts[num] : (slideData?.text_on_slide || `Slide ${num}`))}
                                              </p>
                                            </div>
                                          )}
                                          {activeTheme === 'cyber' && (
                                            <div className="w-full p-4 rounded-xl bg-black/90 backdrop-blur-md border border-pink-500/50 shadow-lg text-left space-y-1.5">
                                              <div className="w-6 h-0.5 bg-cyan-400 rounded-full" />
                                              <p className="text-white font-black text-[9px] md:text-[10px] leading-relaxed tracking-wide uppercase line-clamp-4">
                                                {highlightText(customSlideTexts[num] !== undefined ? customSlideTexts[num] : (slideData?.text_on_slide || `Slide ${num}`))}
                                              </p>
                                            </div>
                                          )}
                                          {activeTheme === 'business' && (
                                            <div className="w-full p-4 rounded-xl bg-white border border-slate-200 shadow-xl text-left mt-auto space-y-1">
                                              <span className="text-[6px] font-black text-indigo-600 uppercase tracking-widest">KEY TAKEAWAY #{num}</span>
                                              <p className="text-slate-800 font-bold text-[9px] md:text-[10px] leading-snug line-clamp-3">
                                                {customSlideTexts[num] !== undefined ? customSlideTexts[num] : (slideData?.text_on_slide || `Slide ${num}`)}
                                              </p>
                                            </div>
                                          )}
                                          {activeTheme === 'glow' && (
                                            <div className="w-full text-center mt-auto pb-2">
                                              <p className="text-white font-black text-[11px] md:text-xs leading-snug tracking-tighter drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] line-clamp-4">
                                                {highlightText(customSlideTexts[num] !== undefined ? customSlideTexts[num] : (slideData?.text_on_slide || `Slide ${num}`))}
                                              </p>
                                            </div>
                                          )}
                                        </div>

                                        {/* Loading / Tap state Overlay */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover/canvas:opacity-100 transition-opacity duration-300 z-20">
                                          {isGen ? (
                                            <div className="flex flex-col items-center gap-2">
                                              <Loader2 className="animate-spin text-purple-400" size={24} />
                                              <span className="text-[8px] font-mono tracking-widest text-white/50 uppercase">Rendering...</span>
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center gap-1.5 px-4 text-center">
                                              <span className="text-[8px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                                                {activeSlideIndex === i ? (locale === 'ru' ? 'Активный слайд' : 'Active Slide') : (locale === 'ru' ? 'Выбрать слайд' : 'Select Slide')}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>

                          {/* Pagination dots */}
                          <div className="flex items-center justify-center gap-1.5 pt-2 pb-4">
                            {[...Array(6)].map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setActiveSlideIndex(idx);
                                  const container = safeDocument ? safeDocument.getElementById('carousel-scroller') : null;
                                  if (container) {
                                    const cardWidth = (container as any).scrollWidth / 6;
                                    container.scrollTo({
                                      left: idx * cardWidth,
                                      behavior: 'smooth'
                                    });
                                  }
                                }}
                                className={cn(
                                  "w-2 h-2 rounded-full transition-all duration-300",
                                  activeSlideIndex === idx 
                                    ? "bg-purple-500 w-5" 
                                    : "bg-white/20 hover:bg-white/40"
                                )}
                                aria-label={`Перейти к слайду ${idx + 1}`}
                              />
                            ))}
                          </div>

                          {/* 2. Unified Selected Slide Editor Panel */}
                          {(() => {
                            const rawCarousel = assets?.ig_carousel as any;
                            const generatedSlides = rawCarousel?.slides || rawCarousel?.prompts?.map((p: string, i: number) => ({
                              slide_number: i + 1,
                              image_prompt: p,
                              text_on_slide: `Слайд ${i + 1}`
                            })) || [];
                            
                            const num = activeSlideIndex + 1;
                            const slideData = generatedSlides[activeSlideIndex];
                            const key = `carousel-${activeSlideIndex}`;
                            const url = imageResults[key];
                            const isGen = isGeneratingImages[key];

                            return (
                              <div className="p-6 rounded-[2.5rem] bg-white/[0.01] border border-white/5 space-y-4 my-4">
                                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">
                                      {locale === 'ru' ? 'Редактор слайда' : 'Active Slide Editor'} 0{num}
                                    </span>
                                  </div>
                                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                                    {num === 1 ? (locale === 'ru' ? 'Хук / Зацепка' : 'Hook') :
                                     num === 2 ? (locale === 'ru' ? 'Проблема / Боль' : 'Problem') :
                                     num === 3 ? (locale === 'ru' ? 'Разворот / Интрига' : 'Pivot') :
                                     num === 4 ? (locale === 'ru' ? 'Польза / Шаг 1' : 'Takeaway 1') :
                                     num === 5 ? (locale === 'ru' ? 'Польза / Шаг 2' : 'Takeaway 2') :
                                     (locale === 'ru' ? 'Призыв к действию' : 'CTA')}
                                  </span>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-white/30">
                                    {locale === 'ru' ? 'Текст на слайде' : 'Visual Text Overlay'}
                                  </label>
                                  <input
                                    type="text"
                                    value={customSlideTexts[num] !== undefined ? customSlideTexts[num] : (slideData?.text_on_slide || '')}
                                    onChange={(e) => setCustomSlideTexts(prev => ({ ...prev, [num]: (e.target as any).value }))}
                                    placeholder={locale === 'ru' ? 'Введите текст...' : 'Enter text...'}
                                    className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] font-bold text-white focus:outline-none focus:border-purple-500/50 transition-all"
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-white/30">
                                    {locale === 'ru' ? 'Промпт для изображения' : 'Background Image Prompt'}
                                  </label>
                                  <textarea
                                    value={customImagePrompts[num] !== undefined ? customImagePrompts[num] : (slideData?.image_prompt || '')}
                                    onChange={(e) => setCustomImagePrompts(prev => ({ ...prev, [num]: (e.target as any).value }))}
                                    placeholder={locale === 'ru' ? 'Опишите фоновый образ...' : 'Describe visual...'}
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[10px] text-white/70 focus:outline-none focus:border-purple-500/50 transition-all resize-none custom-scrollbar"
                                  />
                                </div>

                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={() => {
                                      const prompt = customImagePrompts[num] || slideData?.image_prompt || '';
                                      generateSingleImage(prompt, '4:5', key);
                                    }}
                                    disabled={isAnyGenerationActive}
                                    className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white/70 hover:text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                                  >
                                    {isGen ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                                    {url ? (locale === 'ru' ? 'Перерисовать' : 'Regen') : (locale === 'ru' ? 'Сгенерировать' : 'Generate')}
                                  </button>
                                  
                                  {url && (
                                    <button
                                      onClick={() => downloadSingleRenderedSlide(num)}
                                      className="px-3 py-3 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-[9px] font-bold uppercase tracking-widest transition-all shadow-sm"
                                      title={locale === 'ru' ? 'Скачать слайд с текстом' : 'Download Slide Render'}
                                    >
                                      <Download size={10} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Space padding separator */}
                          <div className="pt-2" />
                        </div>

                        {/* 4. Caption Console Section */}
                        {assets?.ig_carousel && (
                          <div className="p-6 rounded-[2.5rem] bg-white/[0.01] border border-white/5 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                <FileText size={20} />
                              </div>
                              <h4 className="text-[12px] font-black text-blue-400 uppercase tracking-widest">
                                {locale === 'ru' ? 'Текст описания к посту (Caption)' : 'Instagram Caption Console'}
                              </h4>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                                {locale === 'ru' ? 'Откалибровано под ToV вашего ДНК' : 'Calibrated and aligned with your voice DNA'}
                              </p>
                              <button
                                onClick={() => {
                                  (navigator as any).clipboard.writeText(customPostDescription);
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
                              onChange={(e) => setCustomPostDescription((e.target as any).value)}
                              rows={5}
                              className="w-full px-5 py-4 rounded-[1.5rem] bg-white/[0.02] border border-white/5 text-[12px] md:text-[13px] text-white/80 focus:outline-none focus:border-purple-500/50 transition-all resize-none custom-scrollbar"
                            />
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
                                "{assets?.video_banner?.text_on_banner || manifest?.ideaTitle || manifest?.projectTitle || projectTitle || (locale === 'ru' ? 'Хук вашего видео' : 'Your video hook')}"
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
                              onClick={generateCoverImage}
                              disabled={isAnyGenerationActive}
                              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer"
                            >
                              {isGeneratingImages['banner'] || isGenerating ? <Loader2 size={18} className="animate-spin text-white" /> : <Wand2 size={18} />}
                              {imageResults['banner'] 
                                ? (locale === 'ru' ? 'ПЕРЕСОЗДАТЬ ОБЛОЖКУ' : 'REGENERATE THUMBNAIL') 
                                : (locale === 'ru' ? 'СГЕНЕРИРОВАТЬ ОБЛОЖКУ' : 'GENERATE THUMBNAIL')}
                            </button>

                            {imageResults['banner'] && (
                              <div className="flex gap-3">
                                <button 
                                  onClick={downloadRenderedBanner}
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
                                <img src={imageResults['banner']} crossOrigin="anonymous" className="w-full h-full object-cover" />
                                {/* TEXT OVERLAY SIMULATION */}
                                <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center p-6 text-center">
                                  <div className="relative mt-auto mb-16 max-w-[90%] transform -rotate-3 hover:rotate-0 transition-transform duration-300 select-none pointer-events-none">
                                    <div 
                                      className="absolute inset-0 bg-black translate-x-1.5 translate-y-1.5"
                                      style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% calc(50% - 8px), calc(100% - 8px) 50%, 100% calc(50% + 8px), 100% 100%, 0% 100%, 0% calc(50% + 8px), 8px 50%, 0% calc(50% - 8px))' }}
                                    />
                                    <div 
                                      className="relative bg-[#FFE600] text-black px-5 py-3.5 font-black italic uppercase tracking-tighter text-xs flex items-center justify-center text-center leading-snug border-2 border-black"
                                      style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% calc(50% - 8px), calc(100% - 8px) 50%, 100% calc(50% + 8px), 100% 100%, 0% 100%, 0% calc(50% + 8px), 8px 50%, 0% calc(50% - 8px))' }}
                                    >
                                      {assets?.video_banner?.text_on_banner || manifest?.ideaTitle || manifest?.projectTitle || projectTitle || (locale === 'ru' ? 'Хук вашего видео' : 'Your video hook')}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Eye indicator on hover (desktop) */}
                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none duration-300">
                                  <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl scale-90 group-hover:scale-100 transition-all duration-300">
                                    <Eye size={22} />
                                  </div>
                                </div>

                                {/* Always-visible Zoom Eye indicator for touch/mobile devices */}
                                <div className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 shadow-2xl z-20 pointer-events-none active:scale-95 transition-all">
                                  <Eye size={15} />
                                </div>
                                
                                <button 
                                  onClick={downloadRenderedBanner}
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
          {/* Close button in top-left corner with premium micro-interaction */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setLightboxType(null);
              setLightboxIndex(null);
            }}
            className="absolute top-[calc(env(safe-area-inset-top,0px)+1.5rem)] left-6 px-4 py-2.5 rounded-full bg-white/10 border border-white/15 flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/20 active:scale-95 transition-all z-20 shadow-xl backdrop-blur-md text-xs font-black uppercase tracking-wider"
          >
            <X size={18} />
            <span>{locale === 'ru' ? 'ЗАКРЫТЬ' : 'CLOSE'}</span>
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
                return <img src={url} crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" alt="Full Slide" />;
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
          {/* Close button in top-left corner with premium micro-interaction */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setLightboxType(null);
            }}
            className="absolute top-[calc(env(safe-area-inset-top,0px)+1.5rem)] left-6 px-4 py-2.5 rounded-full bg-white/10 border border-white/15 flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/20 active:scale-95 transition-all z-20 shadow-xl backdrop-blur-md text-xs font-black uppercase tracking-wider"
          >
            <X size={18} />
            <span>{locale === 'ru' ? 'ЗАКРЫТЬ' : 'CLOSE'}</span>
          </button>

          {/* Lightbox Banner Container */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px] aspect-[9/16] rounded-[3rem] border border-white/15 overflow-hidden shadow-2xl bg-black flex flex-col animate-in zoom-in-95 duration-200"
          >
            {/* Banner Image */}
            {imageResults['banner'] ? (
              <>
                <img src={imageResults['banner']} crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" alt="Full Cover" />
                <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center p-8 text-center">
                  <div className="relative mt-auto mb-20 max-w-[90%] transform -rotate-3 transition-transform duration-300">
                    <div 
                      className="absolute inset-0 bg-black translate-x-2 translate-y-2"
                      style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% calc(50% - 10px), calc(100% - 10px) 50%, 100% calc(50% + 10px), 100% 100%, 0% 100%, 0% calc(50% + 10px), 10px 50%, 0% calc(50% - 10px))' }}
                    />
                    <div 
                      className="relative bg-[#FFE600] text-black px-7 py-4.5 font-black italic uppercase tracking-tighter text-md flex items-center justify-center text-center leading-snug border-[3px] border-black"
                      style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% calc(50% - 10px), calc(100% - 10px) 50%, 100% calc(50% + 10px), 100% 100%, 0% 100%, 0% calc(50% + 10px), 10px 50%, 0% calc(50% - 10px))' }}
                    >
                      {assets?.video_banner?.text_on_banner || manifest?.ideaTitle || manifest?.projectTitle || projectTitle || (locale === 'ru' ? 'Хук вашего видео' : 'Your video hook')}
                    </div>
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
