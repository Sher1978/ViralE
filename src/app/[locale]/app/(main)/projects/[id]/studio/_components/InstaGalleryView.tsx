'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Download, Copy, Check, Loader2, Image as ImageIcon,
  ChevronRight, ChevronLeft, RefreshCw, Wand2, ArrowLeft, X, Fingerprint
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstaGalleryViewProps {
  manifest: any;
  scriptText: string;
  projectId: string;
  locale: string;
  projectTitle?: string;
  onUpdateManifest?: (manifest: any) => void;
  onBack: () => void;
}

interface PalettePreset {
  id: string;
  nameRu: string;
  nameEn: string;
  bg1: string;
  bg2: string;
  textColor: string;
  accentColor: string;
}

const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: 'midnight_cyber',
    nameRu: '🌌 Кибер Тьма',
    nameEn: '🌌 Midnight Cyber',
    bg1: '#090814',
    bg2: '#1d0c36',
    textColor: '#ffffff',
    accentColor: '#ffe600', // Vibrant Yellow as requested
  },
  {
    id: 'emerald_biohack',
    nameRu: '🌿 Изумруд и Лес',
    nameEn: '🌿 Emerald Biohack',
    bg1: '#041410',
    bg2: '#0d2822',
    textColor: '#ffffff',
    accentColor: '#34d399',
  },
  {
    id: 'obsidian_sunset',
    nameRu: '🪐 Магма и Закат',
    nameEn: '🪐 Obsidian Sunset',
    bg1: '#120c10',
    bg2: '#2a0e1a',
    textColor: '#ffffff',
    accentColor: '#fb7185',
  },
];

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
  const isRu = locale === 'ru';
  const [assets, setAssets] = useState<any>(manifest?.distributionAssets || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState<Record<string, boolean>>({});
  const [imageResults, setImageResults] = useState<Record<string, string>>({}); // prompt-hash -> url
  const [copying, setCopying] = useState<string | null>(null);

  // Palette & Color States
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('midnight_cyber');
  const [carouselBg1, setCarouselBg1] = useState<string>(PALETTE_PRESETS[0].bg1);
  const [carouselBg2, setCarouselBg2] = useState<string>(PALETTE_PRESETS[0].bg2);
  const [carouselTextColor, setCarouselTextColor] = useState<string>(PALETTE_PRESETS[0].textColor);
  const [carouselAccentColor, setCarouselAccentColor] = useState<string>(PALETTE_PRESETS[0].accentColor);

  // Gallery Data States
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [customSlideTexts, setCustomSlideTexts] = useState<Record<number, string>>({});
  const [customImagePrompts, setCustomImagePrompts] = useState<Record<number, string>>({});
  const [customPostDescription, setCustomPostDescription] = useState<string>('');
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);
  const [isRegeneratingAll, setIsRegeneratingAll] = useState<boolean>(false);

  const isAnyImageGenerating = Object.values(isGeneratingImages).some(Boolean);
  const isAnyGenerationActive = isGenerating || isRegeneratingAll || isAnyImageGenerating;

  // Apply Palette Preset
  const handleSelectPalette = (preset: PalettePreset) => {
    setSelectedPaletteId(preset.id);
    setCarouselBg1(preset.bg1);
    setCarouselBg2(preset.bg2);
    setCarouselTextColor(preset.textColor);
    setCarouselAccentColor(preset.accentColor);
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
    }
  }, [assets]);

  // Generate Single Image via AI endpoint
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
      safeAlert(isRu ? `Ошибка генерации изображения: ${err.message}` : `Image generation error: ${err.message}`);
    } finally {
      setIsGeneratingImages(prev => ({ ...prev, [key]: false }));
    }
  };

  // Full Unified Generation Action
  const generateFullGalleryAtOnce = async () => {
    setIsRegeneratingAll(true);
    try {
      // 1. Generate text structure and Slide 1 prompt from script text
      const resText = await fetch('/api/ai/ig-carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scriptText, 
          projectId, 
          ideaTitle: projectTitle || (manifest as any)?.ideaTitle || (manifest as any)?.title,
          locale, 
          toneMode: 'mentor',
        })
      });
      
      if (!resText.ok) {
        const errorData = await resText.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate carousel texts');
      }
      
      const textData = await resText.json();
      const newAssets = {
        ...(assets || {}),
        ig_carousel: textData
      } as any;
      
      setAssets(newAssets);
      
      if (onUpdateManifest) {
        onUpdateManifest({
          ...manifest,
          distributionAssets: newAssets
        });
      }

      // 2. Automatically generate Slide 1 Cover Photo in context
      const coverSlide = textData?.slides?.find((s: any) => s.slide_number === 1);
      const coverPrompt = coverSlide?.image_prompt || `${projectTitle || 'Professional topic'}, cinematic 8k photography, ambient lighting --no text`;

      if (coverPrompt) {
        await generateSingleImage(coverPrompt, '4:5', 'carousel-0');
      }

    } catch (err: any) {
      console.error('[Gallery Gen Error]:', err);
      safeAlert(isRu 
        ? `Ошибка генерации галереи: ${err.message || err}` 
        : `Failed to generate gallery: ${err.message || err}`
      );
    } finally {
      setIsRegeneratingAll(false);
    }
  };

  // Render text with Yellow Key Word Highlighting (exact screenshot match)
  const renderHighlightText = (text: string) => {
    if (!text) return null;
    const words = text.split(/(\s+)/);
    return words.map((word, idx) => {
      const clean = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()""''«»]/g, "");
      // Highlight uppercase words, words in quotes, or key emphasis words
      const isHighlighted = 
        word.startsWith('"') || word.endsWith('"') || 
        word.startsWith('«') || word.endsWith('»') ||
        (clean.length > 2 && clean === clean.toUpperCase() && !/^\d+$/.test(clean));

      if (isHighlighted) {
        return (
          <span key={idx} className="text-[#ffe600] font-black drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            {word}
          </span>
        );
      }
      return word;
    });
  };

  // Canvas Exporter (Exact replica of screenshot for Slide 1 + Gradient for Slides 2-6)
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
        const textToDraw = customSlideTexts[slideNum] || slideData?.text_on_slide || (slideNum === 1 ? projectTitle || 'Хук вашей идеи' : `Тезис слайда ${slideNum}`);

        if (slideNum === 1) {
          // --- SLIDE 1: COVER SLIDE (Exact screenshot replica) ---
          // 1. Draw Full Background Image
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
          } else {
            const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
            bgGrad.addColorStop(0, carouselBg1);
            bgGrad.addColorStop(1, carouselBg2);
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 1080, 1350);
          }

          // 2. Draw Bottom Dark Gradient Overlay ("подкладка" как на скриншоте)
          const bottomGrad = ctx.createLinearGradient(0, 500, 0, 1350);
          bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          bottomGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.7)');
          bottomGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.95)');
          bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
          ctx.fillStyle = bottomGrad;
          ctx.fillRect(0, 500, 1080, 850);

          // 3. Draw Title Text with Yellow Highlighted Keywords
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          ctx.shadowBlur = 20;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4;

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 52px sans-serif';

          const maxTextWidth = 940;
          const words = textToDraw.toUpperCase().split(' ');
          
          // Wrap text lines
          let line = '';
          const lines: { text: string; words: { word: string; isYellow: boolean }[] }[] = [];
          
          let currentLineWords: { word: string; isYellow: boolean }[] = [];
          for (let n = 0; n < words.length; n++) {
            const word = words[n];
            const clean = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()""''«»]/g, "");
            const isYellow = word.startsWith('"') || word.endsWith('"') || (clean.length > 2 && clean === clean.toUpperCase() && !/^\d+$/.test(clean));

            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxTextWidth && n > 0) {
              lines.push({ text: line.trim(), words: currentLineWords });
              line = word + ' ';
              currentLineWords = [{ word, isYellow }];
            } else {
              line = testLine;
              currentLineWords.push({ word, isYellow });
            }
          }
          if (line.trim()) {
            lines.push({ text: line.trim(), words: currentLineWords });
          }

          const startY = 1350 - 320 - ((lines.length - 1) * 72) / 2;

          lines.forEach((l, idx) => {
            const y = startY + (idx * 72);
            // Calculate line width for center alignment
            let lineTotalWidth = 0;
            const wordWidths = l.words.map(w => {
              const width = ctx.measureText(w.word + ' ').width;
              lineTotalWidth += width;
              return { ...w, width };
            });

            let currentX = (1080 - lineTotalWidth) / 2;
            wordWidths.forEach(w => {
              ctx.fillStyle = w.isYellow ? '#FFE600' : '#FFFFFF';
              ctx.textAlign = 'left';
              ctx.fillText(w.word + ' ', currentX, y);
              currentX += w.width;
            });
          });

          // 4. Draw Bottom Watermark (Left) + Fingerprint Logo (Center)
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;

          // Watermark on the left bottom
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = 'bold 20px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(projectTitle || 'ViralEngine | экспертный контент', 70, 1260);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.font = '16px sans-serif';
          ctx.fillText('Качественно • По делу • Смысл', 70, 1288);

          // Center Logo Icon / Badge
          ctx.fillStyle = '#FFE600';
          ctx.beginPath();
          ctx.arc(1080 / 2, 1270, 18, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.font = '900 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('V', 1080 / 2, 1271);

        } else {
          // --- SLIDES 2-6: BODY SLIDES (2-Color Gradient + Clean Typography) ---
          const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
          bgGrad.addColorStop(0, carouselBg1);
          bgGrad.addColorStop(1, carouselBg2);
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, 1080, 1350);

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;

          // Slide Badge Header
          ctx.fillStyle = carouselAccentColor || '#FFE600';
          ctx.font = '900 26px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(`0${slideNum} / 06`, 100, 140);

          // Single Thought Text (10-18 words max)
          ctx.fillStyle = carouselTextColor || '#ffffff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.font = 'bold 46px sans-serif';

          const maxTextWidth = 880;
          const words = textToDraw.split(' ');
          let line = '';
          const lines: string[] = [];

          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxTextWidth && n > 0) {
              lines.push(line.trim());
              line = words[n] + ' ';
            } else {
              line = testLine;
            }
          }
          lines.push(line.trim());

          const startY = 320;
          lines.forEach((lineText, idx) => {
            ctx.fillText(lineText, 100, startY + (idx * 68));
          });

          // Footer Watermark
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('@viral_engine', 100, 1240);

          ctx.textAlign = 'right';
          ctx.fillText(`Слайд ${slideNum}`, 980, 1240);
        }

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

  const downloadSingleRenderedSlide = async (slideNum: number) => {
    try {
      const dataUrl = await exportSlideToCanvas(slideNum);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `gallery_slide_${slideNum}_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      const nav = globalThis.navigator as any;
      if (nav?.share && nav?.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({
            files: [file],
            title: `Слайд #${slideNum}`,
            text: `Слайд #${slideNum} из ViralEngine`
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
      safeAlert(isRu ? 'Ошибка рендеринга слайда. Попробуйте еще раз.' : 'Error rendering slide.');
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
          <div className="space-y-1.5">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              <ArrowLeft size={14} /> {isRu ? 'НАЗАД К ВЫБОРУ' : 'BACK TO SELECTION'}
            </button>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3 pt-1">
              <Sparkles size={24} className="text-pink-400" />
              {isRu ? 'Инста Студия Галерей' : 'Insta Gallery Studio'}
            </h2>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
              {isRu ? '1-клик генерация обложки и лаконичных слайдов по вашему рилсу' : '1-tap cover photo & concise slide generation from your script'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={generateFullGalleryAtOnce}
              disabled={isAnyGenerationActive}
              className={cn(
                "px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg border border-white/10 disabled:opacity-50",
                isAnyGenerationActive
                  ? "bg-purple-600/30 text-purple-200 border-purple-500/30"
                  : "bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-500/20"
              )}
            >
              {isAnyGenerationActive ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  {isRu ? 'ГЕНЕРАЦИЯ...' : 'GENERATING...'}
                </>
              ) : (
                <>
                  <Wand2 size={14} className="text-white animate-pulse" />
                  {isRu ? 'Сгенерировать галерею (6 слайдов)' : 'Generate Gallery (6 Slides)'}
                </>
              )}
            </button>

            {assets?.ig_carousel && (
              <button
                onClick={downloadAllRenderedSlides}
                disabled={isExportingAll}
                className="px-5 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isExportingAll ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {isRu ? 'Скачать 6 JPG' : 'Download 6 JPGs'}
              </button>
            )}
          </div>
        </div>

        {/* 3 Color Palette Selector */}
        <div className="p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">
                🎨 {isRu ? 'Палитра для слайдов галереи (3 Пресета)' : 'Gallery Slide Palettes (3 Presets)'}
              </h3>
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5">
                {isRu ? 'Выберите цветовую тему градиента и текста для слайдов 2-6' : 'Select gradient theme & accent color for slides 2-6'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PALETTE_PRESETS.map((preset) => {
              const isSelected = selectedPaletteId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPalette(preset)}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-24 group",
                    isSelected 
                      ? "border-purple-500 bg-white/[0.05] ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/10" 
                      : "border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]"
                  )}
                >
                  <div 
                    className="absolute inset-0 opacity-25 group-hover:opacity-40 transition-opacity"
                    style={{ background: `linear-gradient(135deg, ${preset.bg1}, ${preset.bg2})` }}
                  />
                  <div className="relative z-10 flex justify-between items-center">
                    <span className="text-[11px] font-black uppercase tracking-wider text-white">
                      {isRu ? preset.nameRu : preset.nameEn}
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                    )}
                  </div>

                  <div className="relative z-10 flex items-center gap-2 mt-auto">
                    <div className="w-5 h-5 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: preset.bg1 }} />
                    <div className="w-5 h-5 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: preset.bg2 }} />
                    <div className="w-5 h-5 rounded-full border border-white/20 shadow-inner flex items-center justify-center font-bold text-[8px]" style={{ backgroundColor: preset.accentColor, color: '#000' }}>
                      A
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Color Fine-tuner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Градиент 1</label>
              <input 
                type="color" 
                value={carouselBg1} 
                onChange={(e) => setCarouselBg1(e.target.value)}
                className="w-full h-8 rounded-lg bg-transparent border border-white/10 cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Градиент 2</label>
              <input 
                type="color" 
                value={carouselBg2} 
                onChange={(e) => setCarouselBg2(e.target.value)}
                className="w-full h-8 rounded-lg bg-transparent border border-white/10 cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Цвет текста</label>
              <input 
                type="color" 
                value={carouselTextColor} 
                onChange={(e) => setCarouselTextColor(e.target.value)}
                className="w-full h-8 rounded-lg bg-transparent border border-white/10 cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Акцент (Желтый)</label>
              <input 
                type="color" 
                value={carouselAccentColor} 
                onChange={(e) => setCarouselAccentColor(e.target.value)}
                className="w-full h-8 rounded-lg bg-transparent border border-white/10 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 6-Slide Visual Matrix Scroller */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <span className="text-[12px] font-black text-white uppercase tracking-widest">
              {isRu ? 'Предпросмотр 6 Слайдов' : '6 Slides Preview'}
            </span>
          </div>

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
                const textContent = customSlideTexts[num] !== undefined ? customSlideTexts[num] : (slideData?.text_on_slide || (num === 1 ? projectTitle || 'Хук вашей идеи' : `Тезис слайда ${num}`));

                return (
                  <div 
                    key={num}
                    onClick={() => setActiveSlideIndex(i)}
                    className={cn(
                      "w-[260px] md:w-[280px] shrink-0 snap-center transition-all duration-300 cursor-pointer p-1 rounded-[2rem]",
                      activeSlideIndex === i 
                        ? "scale-100 opacity-100 ring-2 ring-purple-500/50 shadow-[0_0_25px_rgba(168,85,247,0.2)]" 
                        : "scale-95 opacity-50 hover:opacity-80"
                    )}
                  >
                    {/* Visual Card Canvas */}
                    <div 
                      className="relative w-full aspect-[4/5] rounded-[1.8rem] overflow-hidden border border-white/10 flex flex-col justify-between p-6 group/canvas"
                      style={num === 1 ? {} : { background: `linear-gradient(135deg, ${carouselBg1}, ${carouselBg2})` }}
                    >
                      {/* SLIDE 1 (COVER PHOTO & EXACT SCREENSHOT DESIGN) */}
                      {num === 1 ? (
                        <>
                          {url ? (
                            <img 
                              src={url} 
                              alt="Slide 1 Cover" 
                              crossOrigin="anonymous"
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/canvas:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black to-slate-900" />
                          )}

                          {/* Dark Bottom Gradient Overlay ("подкладка" как на скриншоте) */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent pointer-events-none" />

                          {/* Main Title / Headline Text Overlaid on dark backdrop */}
                          <div className="relative z-10 mt-auto pb-10 space-y-2 text-center">
                            <h3 className="text-white font-black text-sm md:text-base uppercase tracking-tight leading-snug drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                              {renderHighlightText(textContent)}
                            </h3>
                          </div>

                          {/* Bottom Branding (Left: Watermark, Center: Fingerprint Logo) */}
                          <div className="absolute bottom-4 inset-x-5 flex items-center justify-between z-10">
                            <div className="text-left space-y-0.5">
                              <p className="text-[7px] font-extrabold text-white/80 uppercase tracking-widest line-clamp-1">
                                {projectTitle || 'ViralEngine'}
                              </p>
                              <p className="text-[6px] font-bold text-white/40 uppercase tracking-widest">
                                Экспертный Контент
                              </p>
                            </div>
                            
                            <div className="w-5 h-5 rounded-full bg-[#ffe600] flex items-center justify-center shadow-md">
                              <Fingerprint size={12} className="text-black" />
                            </div>
                          </div>
                        </>
                      ) : (
                        /* SLIDES 2-6 (BODY SLIDES - CONCISE 1 THOUGHT) */
                        <>
                          <div className="flex justify-between items-center z-10">
                            <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/10 bg-black/30 backdrop-blur-md" style={{ color: carouselAccentColor }}>
                              0{num} / 06
                            </span>
                          </div>

                          <div className="my-auto text-left z-10 space-y-2">
                            <p className="font-bold text-xs md:text-sm leading-relaxed" style={{ color: carouselTextColor }}>
                              {textContent}
                            </p>
                          </div>

                          <div className="flex justify-between items-center z-10 text-[7px] font-bold opacity-40 uppercase tracking-widest" style={{ color: carouselTextColor }}>
                            <span>@viral_engine</span>
                            <span>Слайд {num}</span>
                          </div>
                        </>
                      )}

                      {/* Loading State Overlay */}
                      <AnimatePresence>
                        {isGen && (
                          <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-30"
                          >
                            <Loader2 size={24} className="animate-spin text-purple-400" />
                            <span className="text-[8px] font-mono uppercase tracking-widest text-white/60">Rendering Photo...</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active Slide Text & Photo Prompt Editor */}
        <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest border border-purple-500/30">
                Слайд #{currentSlideNum}
              </span>
              <h3 className="text-base font-black uppercase tracking-wider text-white">
                {currentSlideNum === 1 ? (isRu ? 'Обложка (Слайд 1)' : 'Cover (Slide 1)') : (isRu ? `Редактор Слайда #${currentSlideNum}` : `Edit Slide #${currentSlideNum}`)}
              </h3>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => downloadSingleRenderedSlide(currentSlideNum)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
              >
                <Download size={12} /> {isRu ? 'Скачать слайд JPG' : 'Download Slide JPG'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                📝 {currentSlideNum === 1 ? (isRu ? 'Заголовок на обложке' : 'Cover Headline Text') : (isRu ? 'Текст слайда (1 мысль, до 15 слов)' : 'Slide Thought Text')}
              </label>
              <textarea
                value={customSlideTexts[currentSlideNum] !== undefined ? customSlideTexts[currentSlideNum] : (currentSlideData?.text_on_slide || '')}
                onChange={(e) => setCustomSlideTexts(prev => ({ ...prev, [currentSlideNum]: e.target.value }))}
                rows={3}
                className="w-full p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-[12px] text-white focus:border-purple-500/50 focus:outline-none transition-all resize-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                  🎨 {isRu ? 'Промпт для фото-обложки' : 'Cover Photo Prompt'}
                </label>
                {currentSlideNum === 1 && (
                  <button
                    onClick={() => {
                      const prompt = customImagePrompts[1] || currentSlideData?.image_prompt;
                      if (prompt) generateSingleImage(prompt, '4:5', 'carousel-0');
                    }}
                    disabled={isGeneratingImages['carousel-0']}
                    className="text-[8px] font-black uppercase tracking-widest text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    {isGeneratingImages['carousel-0'] ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                    {isRu ? 'Перегенерировать фото' : 'Regenerate Photo'}
                  </button>
                )}
              </div>
              <textarea
                value={customImagePrompts[currentSlideNum] !== undefined ? customImagePrompts[currentSlideNum] : (currentSlideData?.image_prompt || '')}
                onChange={(e) => setCustomImagePrompts(prev => ({ ...prev, [currentSlideNum]: e.target.value }))}
                rows={3}
                placeholder={currentSlideNum === 1 ? 'English image prompt for cover background...' : 'Pромпт не нужен для слайдов 2-6...'}
                disabled={currentSlideNum !== 1}
                className="w-full p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-[11px] text-white/80 focus:border-purple-500/50 focus:outline-none transition-all resize-none disabled:opacity-30"
              />
            </div>
          </div>
        </div>

        {/* Post Caption Card */}
        <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Copy size={16} className="text-pink-400" />
              {isRu ? 'Текст Поста для Instagram / TikTok' : 'Instagram / TikTok Post Caption'}
            </h3>
            <button
              onClick={() => copyText(customPostDescription, 'post-caption')}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
            >
              {copying === 'post-caption' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copying === 'post-caption' ? (isRu ? 'Скопировано!' : 'Copied!') : (isRu ? 'Скопировать' : 'Copy')}
            </button>
          </div>

          <textarea
            value={customPostDescription}
            onChange={(e) => setCustomPostDescription(e.target.value)}
            rows={5}
            placeholder={isRu ? 'Текст поста генерируется автоматически вместе с галереей...' : 'Post caption generates automatically...'}
            className="w-full p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-[12px] text-white/90 leading-relaxed focus:border-purple-500/50 focus:outline-none transition-all resize-none custom-scrollbar"
          />
        </div>

      </div>
    </div>
  );
};
