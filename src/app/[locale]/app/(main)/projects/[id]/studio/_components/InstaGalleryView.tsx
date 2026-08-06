'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Download, Copy, Check, Loader2, Image as ImageIcon,
  ChevronRight, ChevronLeft, RefreshCw, Layers, Monitor, Brain,
  Zap, ExternalLink, Wand2, ArrowLeft, X, Eye, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface InstaGalleryViewProps {
  manifest: any;
  scriptText: string;
  projectId: string;
  locale: string;
  projectTitle?: string;
  onUpdateManifest?: (manifest: any) => void;
  onBack: () => void;
}

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

export const InstaGalleryView: React.FC<InstaGalleryViewProps> = ({
  manifest,
  scriptText,
  projectId,
  locale,
  projectTitle,
  onUpdateManifest,
  onBack,
}) => {
  const [assets, setAssets] = useState<any>(manifest?.distributionAssets || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState<Record<string, boolean>>({});
  const [imageResults, setImageResults] = useState<Record<string, string>>({}); // prompt-hash -> url
  const [copying, setCopying] = useState<string | null>(null);

  // Pipeline configuration states
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
        "image_generation_dna": {
          "style_preset": "cyberpunk_synthwave",
          "master_prefix": "Premium 3D render in octane render engine, cyberpunk tech aesthetic, holographic wireframes, glowing neon elements, high-tech abstract nodes, dark ambient atmospheric lighting, ultra high resolution 8k, cinematic color grading, rich textures --no text, words, subtitles",
          "negative_prompt": "text, letters, words, subtitles, signatures, ugly, lowres, blurry, human face, photo, portrait, realistic skin"
        }
      };

      try {
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
        console.warn('[Visual DNA Fetch Failed]:', e);
      }
    };
    fetchVisualDna();
  }, []);

  const handleSaveVisualDna = async () => {
    setVisualDnaError(null);
    setIsSavingDna(true);
    try {
      const parsed = JSON.parse(visualDnaConfig);
      safeLocalStorage.setItem('viral_engine_visual_dna', JSON.stringify(parsed, null, 2));

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ visual_dna_config: parsed })
          .eq('id', user.id);
      }
      
      safeAlert(locale === 'ru' ? 'Дизайн-система ДНК успешно сохранена!' : 'Brand DNA design system saved successfully!');
    } catch (err: any) {
      setVisualDnaError(err.message || 'Invalid JSON syntax');
    } finally {
      setIsSavingDna(false);
    }
  };

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

      if (rawCarousel.styleSeed !== undefined) setStyleSeed(rawCarousel.styleSeed);
      if (rawCarousel.cta_word) setCtaWord(rawCarousel.cta_word);
    }
  }, [assets]);

  const generateSingleImage = async (prompt: string, aspectRatio: '1:1' | '9:16' | '16:9' | '4:5' = '4:5', key: string) => {
    setIsGeneratingImages(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          projectId,
          stylePreset: 'digital_art'
        })
      });

      if (!res.ok) throw new Error('Image generation request failed');
      const data = await res.json();
      if (data.url) {
        setImageResults(prev => ({ ...prev, [key]: data.url }));
      } else {
        throw new Error(data.error || 'No URL returned');
      }
    } catch (err: any) {
      console.error('[Image Gen Error]:', err);
      safeAlert(locale === 'ru' ? `Ошибка генерации изображения: ${err.message}` : `Image generation error: ${err.message}`);
    } finally {
      setIsGeneratingImages(prev => ({ ...prev, [key]: false }));
    }
  };

  const generateFullGalleryAtOnce = async () => {
    setIsRegeneratingAll(true);
    try {
      let currentAssets = assets;
      
      if (!currentAssets?.ig_carousel) {
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
      
      if (currentAssets?.ig_carousel) {
        const rawCarousel = currentAssets.ig_carousel as any;
        const resolvedSlides = rawCarousel.slides || [];
        const coverSlide = resolvedSlides.find((s: any) => s.slide_number === 1);

        if (coverSlide && coverSlide.image_prompt) {
          const key = `carousel-0`;
          const prompt = customImagePrompts[1] || coverSlide.image_prompt;
          await generateSingleImage(prompt, '4:5', key);
        }
      }
    } catch (err: any) {
      console.error('[Gallery Gen Error]:', err);
      safeAlert(locale === 'ru' 
        ? `Ошибка генерации галереи: ${err.message || err}` 
        : `Failed to generate gallery: ${err.message || err}`
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

          ctx.fillStyle = carouselAccentColor || '#c084fc';
          ctx.font = '900 24px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(`KEY TAKEAWAY 0${slideNum - 1}`, 100, 160);

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
        await new Promise(r => setTimeout(r, 150));
        await downloadSingleRenderedSlide(i);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingAll(false);
    }
  };

  const copyText = (text: string, id: string) => {
    if (!text) return;
    if (globalThis.navigator?.clipboard) {
      globalThis.navigator.clipboard.writeText(text);
      setCopying(id);
      setTimeout(() => setCopying(null), 2000);
    }
  };

  const currentSlideNum = activeSlideIndex + 1;
  const rawCarousel = assets?.ig_carousel as any;
  const generatedSlides = rawCarousel?.slides || rawCarousel?.prompts?.map((p: string, i: number) => ({
    slide_number: i + 1,
    image_prompt: p,
    text_on_slide: `Слайд ${i + 1}`
  })) || [];
  const currentSlideData = generatedSlides[activeSlideIndex];

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-[#050508] p-4 md:p-8 custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
        
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-md">
          <div className="space-y-2">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              <ArrowLeft size={14} /> {locale === 'ru' ? 'НАЗАД К ВЫБОРУ' : 'BACK TO SELECTION'}
            </button>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3 pt-2">
              <Sparkles size={24} className="text-pink-400" />
              {locale === 'ru' ? 'Инста Студия Галерей' : 'Insta Gallery Studio'}
            </h2>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
              {locale === 'ru' ? 'Создание каруселей из 6 слайдов с визуальным ДНК и текстами' : '6-Slide Carousel Visual Studio & Post Copywriter'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={generateFullGalleryAtOnce}
              disabled={isAnyGenerationActive}
              className={cn(
                "px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg border border-white/10 disabled:opacity-50",
                isAnyGenerationActive
                  ? "bg-purple-600/30 text-purple-200 border-purple-500/30"
                  : "bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-500/20"
              )}
            >
              {isAnyGenerationActive ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  {locale === 'ru' ? 'ГЕНЕРАЦИЯ...' : 'GENERATING...'}
                </>
              ) : (
                <>
                  <Wand2 size={14} className="text-white animate-pulse" />
                  {locale === 'ru' ? 'Сгенерировать галерею (6 слайдов)' : 'Generate Full Gallery (6 Slides)'}
                </>
              )}
            </button>

            {assets?.ig_carousel && (
              <button
                onClick={downloadAllRenderedSlides}
                disabled={isExportingAll}
                className="px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isExportingAll ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {locale === 'ru' ? 'Скачать карусель (6 JPG)' : 'Download Carousel (6 JPGs)'}
              </button>
            )}
          </div>
        </div>

        {/* Configuration Pipeline Accordion */}
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
                {locale === 'ru' ? 'Настройка Промптов и Бренд-ДНК' : 'Configure AI Prompt & Visual DNA'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-white/30 hover:text-white/60 transition-colors uppercase tracking-widest">
              {showSettings ? (locale === 'ru' ? 'Скрыть ✕' : 'Hide ✕') : (locale === 'ru' ? 'Открыть настройки ⚙' : 'Configure ⚙')}
            </span>
          </button>

          {showSettings && (
            <div className="px-6 pb-6 pt-2 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
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
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                      🎭 {locale === 'ru' ? 'Модель вещания (Tone Mode)' : 'Tone Mode'}
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
                        🔑 {locale === 'ru' ? 'Кодовое слово (CTA)' : 'Automation CTA Word'}
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
                      💬 {locale === 'ru' ? 'Твоё пожелание к карусели' : 'Your Creative Brief'}
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
                <div className="space-y-4">
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
                      rows={12}
                      className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 font-mono text-[10px] text-pink-400 placeholder-white/20 focus:border-purple-500/50 focus:outline-none transition-all resize-y custom-scrollbar"
                    />
                    <button
                      type="button"
                      onClick={handleSaveVisualDna}
                      disabled={isSavingDna}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                    >
                      {isSavingDna ? <Loader2 size={12} className="animate-spin text-white" /> : <Sparkles size={12} />}
                      {locale === 'ru' ? 'Сохранить ДНК' : 'Save Visual DNA'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6-Slide Visual Matrix */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
            <span className="text-[12px] font-black text-white uppercase tracking-widest">
              {locale === 'ru' ? 'Визуальная Матрица (6 Слайдов)' : 'Visual Matrix (6 Slides)'}
            </span>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="p-1 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-1">
                {(['minimalist', 'cyber', 'business', 'glow'] as const).map(theme => (
                  <button
                    key={theme}
                    onClick={() => setActiveTheme(theme)}
                    className={cn(
                      "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all",
                      activeTheme === theme 
                        ? "bg-pink-600 text-white shadow-lg shadow-pink-500/20" 
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
            </div>
          </div>

          {/* Horizontal Scroller of Cards */}
          <div className="relative">
            <div 
              id="carousel-scroller"
              className="flex overflow-x-auto gap-4 pb-6 snap-x snap-mandatory scrollbar-none scroll-smooth px-1"
            >
              {[...Array(6)].map((_, i) => {
                const num = i + 1;
                const slideData = generatedSlides[i];
                const key = `carousel-${num - 1}`;
                const url = imageResults[key];
                const isGen = isGeneratingImages[key];

                return (
                  <div 
                    key={num}
                    onClick={() => setActiveSlideIndex(i)}
                    className={cn(
                      "w-[260px] md:w-[280px] shrink-0 snap-center transition-all duration-300 cursor-pointer p-1 rounded-[2rem]",
                      activeSlideIndex === i 
                        ? "scale-100 opacity-100 ring-2 ring-pink-500/50 shadow-[0_0_25px_rgba(236,72,153,0.2)]" 
                        : "scale-95 opacity-50 hover:opacity-80"
                    )}
                  >
                    <div className="relative w-full aspect-[4/5] rounded-[1.8rem] overflow-hidden bg-[#0a0a0f] border border-white/5 flex flex-col items-center justify-center p-6 group/canvas">
                      {url ? (
                        <>
                          <img 
                            src={url} 
                            alt={`Slide ${num}`} 
                            crossOrigin="anonymous"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/canvas:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/80" />
                        </>
                      ) : (
                        <>
                          <div className="absolute -inset-10 bg-gradient-to-tr from-pink-500/20 to-purple-500/20 rounded-full blur-3xl opacity-60" />
                          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px]" />
                        </>
                      )}

                      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
                        <span className="text-[7px] font-black uppercase tracking-[0.25em] text-white/50 bg-black/30 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/5">
                          @viral_engine
                        </span>
                        <span className="text-[7px] font-black text-pink-400 bg-pink-500/10 backdrop-blur-md px-2 py-0.5 rounded-full border border-pink-500/20">
                          0{num} / 06
                        </span>
                      </div>

                      <div className="absolute inset-x-6 top-[28%] bottom-16 flex flex-col justify-center items-center text-center z-10 pointer-events-none">
                        <div className="w-full p-4 rounded-2xl bg-black/75 backdrop-blur-md border border-white/10 flex items-center justify-center text-center shadow-xl">
                          <p className="text-white font-extrabold text-[11px] leading-snug tracking-tight">
                            {customSlideTexts[num] !== undefined ? customSlideTexts[num] : (slideData?.text_on_slide || `Slide ${num}`)}
                          </p>
                        </div>
                      </div>

                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover/canvas:opacity-100 transition-opacity duration-300 z-20">
                        {isGen ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="animate-spin text-pink-400" size={24} />
                            <span className="text-[8px] font-mono tracking-widest text-white/50 uppercase">Rendering...</span>
                          </div>
                        ) : (
                          <span className="text-[8px] font-black uppercase tracking-widest text-pink-400 bg-pink-500/10 border border-pink-500/20 px-3 py-1 rounded-full">
                            {activeSlideIndex === i ? (locale === 'ru' ? 'Активный слайд' : 'Active Slide') : (locale === 'ru' ? 'Выбрать слайд' : 'Select Slide')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active Slide Control Card */}
        <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 text-[10px] font-black uppercase tracking-widest border border-pink-500/30">
                Слайд #{currentSlideNum}
              </span>
              <h3 className="text-lg font-black uppercase tracking-wider text-white">
                Редактор Слайда #{currentSlideNum}
              </h3>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => downloadSingleRenderedSlide(currentSlideNum)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
              >
                <Download size={12} /> {locale === 'ru' ? 'Скачать слайд JPG' : 'Download Slide JPG'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-pink-400">
                📝 {locale === 'ru' ? 'Текст на слайде' : 'Text on Slide'}
              </label>
              <textarea
                value={customSlideTexts[currentSlideNum] !== undefined ? customSlideTexts[currentSlideNum] : (currentSlideData?.text_on_slide || '')}
                onChange={(e) => setCustomSlideTexts(prev => ({ ...prev, [currentSlideNum]: e.target.value }))}
                rows={3}
                className="w-full p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-[12px] text-white focus:border-pink-500/50 focus:outline-none transition-all resize-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black uppercase tracking-widest text-pink-400">
                  🎨 {locale === 'ru' ? 'ИИ Промпт Обложки (Слайд 1)' : 'Cover Image Prompt'}
                </label>
                {currentSlideNum === 1 && (
                  <button
                    onClick={() => {
                      const prompt = customImagePrompts[1] || currentSlideData?.image_prompt;
                      if (prompt) generateSingleImage(prompt, '4:5', 'carousel-0');
                    }}
                    disabled={isGeneratingImages['carousel-0']}
                    className="text-[8px] font-black uppercase tracking-widest text-pink-400 hover:text-pink-300 flex items-center gap-1"
                  >
                    {isGeneratingImages['carousel-0'] ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                    {locale === 'ru' ? 'Сгенерировать фото' : 'Generate Cover Photo'}
                  </button>
                )}
              </div>
              <textarea
                value={customImagePrompts[currentSlideNum] !== undefined ? customImagePrompts[currentSlideNum] : (currentSlideData?.image_prompt || '')}
                onChange={(e) => setCustomImagePrompts(prev => ({ ...prev, [currentSlideNum]: e.target.value }))}
                rows={3}
                placeholder={currentSlideNum === 1 ? 'Промпт для фонового фото обложки...' : 'Промпт слайда...'}
                className="w-full p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-[11px] text-white/80 focus:border-pink-500/50 focus:outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Post Description / Caption Card */}
        <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Copy size={16} className="text-pink-400" />
              {locale === 'ru' ? 'Текст Поста для Инстаграм' : 'Instagram Post Caption'}
            </h3>
            <button
              onClick={() => copyText(customPostDescription, 'post-caption')}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
            >
              {copying === 'post-caption' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copying === 'post-caption' ? (locale === 'ru' ? 'Скопировано!' : 'Copied!') : (locale === 'ru' ? 'Скопировать' : 'Copy')}
            </button>
          </div>

          <textarea
            value={customPostDescription}
            onChange={(e) => setCustomPostDescription(e.target.value)}
            rows={5}
            placeholder={locale === 'ru' ? 'Текст поста будет сгенерирован вместе с галереей...' : 'Post text will be generated with the gallery...'}
            className="w-full p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-[12px] text-white/90 leading-relaxed focus:border-pink-500/50 focus:outline-none transition-all resize-none custom-scrollbar"
          />
        </div>

      </div>
    </div>
  );
};
