'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Download, Copy, Check, Loader2, Image as ImageIcon,
  ChevronRight, ChevronLeft, RefreshCw, Wand2, ArrowLeft, X, Fingerprint, Share2, ListOrdered, BookOpen, Flame
} from 'lucide-react';



import { cn } from '@/lib/utils';
import { parseScriptTextToPayload } from '@/lib/studio-utils';

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
    accentColor: '#ffe600', // Vibrant Yellow
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

// Helper to extract a short, punchy Reels Script Hook snippet for Slide 1 cover title
const cleanHeadlineSnippet = (text: string): string => {
  if (!text) return '';
  let cleaned = text
    .replace(/^["'«\s]+|["'»\s]+$/g, '')
    .replace(/^(?:ХУК|HOOK|ИНТРО|ЗАЦЕПКА):\s*/i, '')
    .trim();
  const firstSentence = cleaned.split(/[.!?\n]/)[0].trim();
  const words = firstSentence.split(/\s+/);
  if (words.length > 8) {
    return words.slice(0, 8).join(' ');
  }
  return firstSentence;
};

const getReelsScriptHook = (scriptText: string, manifest: any): string => {
  if (manifest?.customScript) {
    const parsed = parseScriptTextToPayload(manifest.customScript);
    if (parsed.hook) return cleanHeadlineSnippet(parsed.hook);
  }
  if (scriptText) {
    const parsed = parseScriptTextToPayload(scriptText);
    if (parsed.hook) return cleanHeadlineSnippet(parsed.hook);
  }
  if (manifest?.segments && manifest.segments.length > 0) {
    const introSeg = manifest.segments.find((s: any) => s.type === 'intro_avatar' || s.type === 'hook') || manifest.segments[0];
    if (introSeg?.scriptText) return cleanHeadlineSnippet(introSeg.scriptText);
  }
  return '';
};


export const DEFAULT_SLIDE_FALLBACKS: Record<number, string> = {
  2: "ПЕРВАЯ ПРИЧИНА ПРОВАЛА\nБольшинство экспертов теряют клиентов, потому что выстраивают хаотичный контент вместо системной воронки.",
  3: "ОШИБКА В ПОЗИЦИОНИРОВАНИИ\nПопытка продавать всем подряд размывает экспертность и снижает конверсию ровно в 3 раза.",
  4: "КЛЮЧЕВОЙ РЫЧАГ РОСТА\nФокусируйтесь на узкой боли аудитории и давайте 1 конкретное решение в каждом ролике.",
  5: "СЕКРЕТ ВЫСОКИХ ПРОДАЖ\nСоздавайте легкий переход от просмотра короткого видео к получению полезного лид-магнита.",
  6: "ЗАБЕРИТЕ ПОЛНУЮ СИСТЕМУ\nПишите кодовое слово в комментариях под этим постом, чтобы получить пошаговый разбор!"
};

export function parseTwoTierSlideText(rawText: string): { title: string; body: string } {
  if (!rawText) return { title: '', body: '' };

  const clean = rawText.trim();

  // 1. Explicit newline break (\n or \n\n)
  if (clean.includes('\n')) {
    const parts = clean.split('\n').map(p => p.trim()).filter(Boolean);
    return {
      title: parts[0],
      body: parts.slice(1).join(' ')
    };
  }

  // 2. Colon separator (e.g. "ТЕЗИС: Подробное описание...")
  if (clean.includes(':')) {
    const idx = clean.indexOf(':');
    const head = clean.substring(0, idx + 1).trim();
    const rest = clean.substring(idx + 1).trim();
    if (rest.length > 5) {
      return { title: head, body: rest };
    }
  }

  // 3. Sentence split (. ! ?)
  const sentenceMatch = clean.match(/^([^.!?]+[.!?])\s*([\s\S]+)$/);
  if (sentenceMatch && sentenceMatch[2]?.trim().length > 5) {
    return {
      title: sentenceMatch[1].trim(),
      body: sentenceMatch[2].trim()
    };
  }


  // 4. Fallback for longer phrases: first 4 words as title, rest as body
  const words = clean.split(/\s+/);
  if (words.length > 8) {
    const titleWords = words.slice(0, 4).join(' ');
    const bodyWords = words.slice(4).join(' ');
    return { title: titleWords, body: bodyWords };
  }

  return {
    title: clean,
    body: ''
  };
}

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
  const [usePhotoBackdrop, setUsePhotoBackdrop] = useState<boolean>(true);
  const [backdropDarkness, setBackdropDarkness] = useState<number>(60);

  // Gallery Data States
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [customSlideTexts, setCustomSlideTexts] = useState<Record<number, string>>({});
  const [customImagePrompts, setCustomImagePrompts] = useState<Record<number, string>>({});
  const [customPostDescription, setCustomPostDescription] = useState<string>('');
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);
  const [isRegeneratingAll, setIsRegeneratingAll] = useState<boolean>(false);

  const reelsHook = getReelsScriptHook(scriptText, manifest);

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

  // Generate Single Image via AI endpoint (/api/ai/image-gen)
  const generateSingleImage = async (prompt: string, aspectRatio: '1:1' | '9:16' | '16:9' | '4:5' = '4:5', key: string) => {
    setIsGeneratingImages(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch('/api/ai/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
          projectId,
          provider: 'flux'
        })
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `HTTP error ${res.status}`);
      }

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

  // Narrative Presets for Carousel Format Selection
  const CAROUSEL_FORMAT_BRIEFS: Record<string, string> = {
    standard: 'Оформи карусель в емком экспертном стиле. Слайды 2-6 должны содержать 2-этажный текст (Строка 1: Крупный тезис, Строка 2: Раскрытие мысли).',
    numbered_list: 'ОФОРМИ СЛАЙДЫ 2-6 В ВИДЕ СТРОГОГО НУМЕРОВАННОГО СПИСКА (Пункт 01, Пункт 02, Пункт 03, Пункт 04, Пункт 05). Каждый слайд 2-6 должен иметь крупный нумерованный заголовок на 1-й строчке (например: "01. ПЕРВАЯ ПРИЧИНА" или "01. СПОСОБ #1"), а на 2-й строчке подробное экспертное пояснение!',
    storytelling: 'ОФОРМИ КАРУСЕЛЬ В СТИЛЕ ЭМОЦИОНАЛЬНОГО СТОРИТЕЛЛИНГА через личный опыт автора. Слайд 2: Интригующая завязка истории. Слайд 3: Неожиданный переломный момент. Слайд 4: Переживания и инсайт. Слайд 5: Практический вывод и урок. Слайд 6: Призыв написать кодовое слово в комментариях!',
    provocation: 'ОФОРМИ КАРУСЕЛЬ В ПРОВОКАЦИОННОМ СТИЛЕ РАЗОБЛАЧЕНИЯ МИФОВ. Слайд 2: Громкое сокрушение популярного стереотипа. Слайд 3: Разоблачение и твердые факты. Слайд 4: Почему 90% экспертов ошибаются. Слайд 5: Новый подход. Слайд 6: Призыв написать кодовое слово!'
  };

  const [activeFormatStyle, setActiveFormatStyle] = useState<string>('standard');

  // Full Unified Generation Action
  const generateFullGalleryAtOnce = async (formatStyle: 'standard' | 'numbered_list' | 'storytelling' | 'provocation' = 'standard') => {
    setIsRegeneratingAll(true);
    setActiveFormatStyle(formatStyle);
    try {
      const activeHook = getReelsScriptHook(scriptText, manifest);
      const userBrief = CAROUSEL_FORMAT_BRIEFS[formatStyle] || CAROUSEL_FORMAT_BRIEFS.standard;

      // 1. Generate text structure and Slide 1 prompt from script text & reels hook
      const resText = await fetch('/api/ai/ig-carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptText,
          projectId,
          ideaTitle: activeHook || projectTitle || (manifest as any)?.ideaTitle,
          locale,
          toneMode: formatStyle === 'provocation' ? 'provocateur' : 'mentor',
          userBrief
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
      const coverPrompt = coverSlide?.image_prompt || `${activeHook || 'Professional topic'}, cinematic 8k photography, ambient lighting --no text`;

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

  // Canvas Exporter (Exact replica of screenshot for Slide 1 + Gradient/Photo for Slides 2-6)
  const exportSlideToCanvas = (slideNum: number): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      const canvas = safeDocument ? safeDocument.createElement('canvas') : null;
      if (!canvas) {
        reject(new Error('Document not available'));
        return;
      }
      if (safeDocument?.fonts?.ready) {
        try {
          await safeDocument.fonts.ready;
        } catch (e) {}
      }
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context could not be created'));
        return;
      }

      const drawContent = (img: any) => {
        const slideData = generatedSlides[slideNum - 1] || assets?.ig_carousel?.slides?.find((s: any) => s.slide_number === slideNum);
        const textToDraw = (customSlideTexts[slideNum] !== undefined && customSlideTexts[slideNum].trim() !== '')
          ? customSlideTexts[slideNum]
          : (slideData?.text_on_slide || (slideNum === 1 ? reelsHook || 'Хук сценария рилса' : DEFAULT_SLIDE_FALLBACKS[slideNum] || `Тезис слайда ${slideNum}`));

        if (slideNum === 1) {
          // --- SLIDE 1: COVER SLIDE (Exact screenshot replica) ---
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

          // Bottom Dark Gradient Overlay ("подкладка" как на скриншоте)
          const bottomGrad = ctx.createLinearGradient(0, 500, 0, 1350);
          bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          bottomGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.7)');
          bottomGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.95)');
          bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
          ctx.fillStyle = bottomGrad;
          ctx.fillRect(0, 500, 1080, 850);

          // 3. Draw Title Text with Yellow Highlighted Keywords
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          ctx.shadowBlur = 24;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4;

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '800 48px Inter, "Space Grotesk", system-ui, -apple-system, sans-serif';

          const maxTextWidth = 920;
          const words = textToDraw.toUpperCase().split(/\s+/);

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

          const lineHeight = 66;
          const startY = 1350 - 330 - ((lines.length - 1) * lineHeight) / 2;

          lines.forEach((l, idx) => {
            const y = startY + (idx * lineHeight);
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

          // Bottom Center Fingerprint Logo Icon
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;

          ctx.fillStyle = '#FFE600';
          ctx.beginPath();
          ctx.arc(1080 / 2, 1270, 18, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.font = '900 16px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('V', 1080 / 2, 1271);


        } else {
          // --- SLIDES 2-6: BODY SLIDES (SHARP PHOTO EDGES + INNER CLIPPED GLASS CARD) ---
          const cardX = 40;
          const cardY = 50;
          const cardW = 1000;
          const cardH = 1250;
          const cardR = 44;

          if (img && usePhotoBackdrop) {
            // 1. Draw Full Canvas Sharp, Crisp, Unblurred Cover Photo
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

            // Draw full crisp image on canvas background (edges outside card remain 100% sharp & unblurred!)
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1080, 1350);

            // 2. Inner Glass Card Clipping with Moderate Blur (8px-10px) & Controlled Glass Scrim
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
            ctx.clip(); // Restrict blur and dark tint strictly INSIDE the card!

            if ('filter' in ctx) {
              // Moderate blur (9px) so the photo is strongly visible under the glass
              (ctx as any).filter = 'blur(9px) brightness(0.85)';
              ctx.drawImage(img, sx, sy, sw, sh, -20, -20, 1120, 1390);
              (ctx as any).filter = 'none';
            }

            // Glass tint scrim inside card for text contrast
            const alpha = (backdropDarkness / 100) * 0.65;
            const cardScrim = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
            cardScrim.addColorStop(0, `rgba(9, 8, 20, ${alpha * 0.95})`);
            cardScrim.addColorStop(1, `rgba(18, 12, 32, ${alpha * 1.1})`);
            ctx.fillStyle = cardScrim;
            ctx.fillRect(cardX, cardY, cardW, cardH);

            // Subtle color tint from chosen palette
            const colorBlend = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
            colorBlend.addColorStop(0, carouselBg1);
            colorBlend.addColorStop(1, carouselBg2);
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = colorBlend;
            ctx.fillRect(cardX, cardY, cardW, cardH);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;

            ctx.restore(); // Exit clipping
          } else {
            // 1b. Vibrant Gradient Backdrop Fallback
            const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
            bgGrad.addColorStop(0, carouselBg1);
            bgGrad.addColorStop(1, carouselBg2);
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 1080, 1350);

            // Ambient Radial Light Highlight
            const orbGrad = ctx.createRadialGradient(880, 200, 40, 880, 200, 650);
            orbGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
            orbGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = orbGrad;
            ctx.fillRect(0, 0, 1080, 1350);

            // Draw Card Fill for Gradient Fallback
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fill();
            ctx.restore();
          }

          // 3. Draw Card Outer Shadow & Glossy Border Stroke
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 40;
          ctx.shadowOffsetY = 16;

          // Glossy Border Highlight
          const glassBorder = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
          glassBorder.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
          glassBorder.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
          glassBorder.addColorStop(1, 'rgba(255, 255, 255, 0.28)');
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = glassBorder;
          ctx.stroke();
          ctx.restore();

          // 3. Glassmorphism Pill Badge for 02 / 06 inside card
          const badgeX = cardX + 45;
          const badgeY = cardY + 45;
          const badgeW = 145;
          const badgeH = 50;
          const badgeR = 25;

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeR);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.stroke();

          ctx.fillStyle = carouselAccentColor || '#FFE600';
          ctx.font = '700 22px Inter, "Space Grotesk", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`0${slideNum} / 06`, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);
          ctx.restore();

          // 4. Two-Tier Text Structure (Thesis + Explanation) inside Glass Card
          const wrapTextLines = (text: string, font: string): string[] => {
            if (!text) return [];
            ctx.font = font;
            const explicitLines = text.split('\n');
            const lines: string[] = [];

            explicitLines.forEach(expLine => {
              const cleanExp = expLine.trim();
              if (!cleanExp) return;
              const words = cleanExp.split(/\s+/);
              let line = '';
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
              if (line.trim()) lines.push(line.trim());
            });

            return lines;
          };

          // Bold Large Typography Across All Body Slides (Slides 2-6)
          const cleanTextToDraw = textToDraw.length > 220 ? textToDraw.slice(0, 220) : textToDraw;
          const { title: tierTitle, body: tierBody } = parseTwoTierSlideText(cleanTextToDraw);

          const maxTextWidth = 900;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
          ctx.shadowBlur = 16;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 3;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';

          let titleFontSize = 54;
          let bodyFontSize = 36;
          const maxCardContentHeight = 940;

          let titleFont = `800 ${titleFontSize}px Inter, "Space Grotesk", system-ui, -apple-system, sans-serif`;
          let bodyFont = `500 ${bodyFontSize}px Inter, system-ui, -apple-system, sans-serif`;

          let titleLineHeight = Math.round(titleFontSize * 1.35);
          let bodyLineHeight = Math.round(bodyFontSize * 1.45);

          let titleLines = wrapTextLines((tierTitle || '').toUpperCase(), titleFont);
          let bodyLines = tierBody ? wrapTextLines(tierBody, bodyFont) : [];
          let gap = (titleLines.length > 0 && bodyLines.length > 0) ? 36 : 0;
          let totalTextHeight = (titleLines.length * titleLineHeight) + gap + (bodyLines.length * bodyLineHeight);

          // If text height exceeds card content area, scale down font sizes gracefully
          if (totalTextHeight > maxCardContentHeight) {
            const scale = Math.max(0.68, Math.min(0.95, maxCardContentHeight / totalTextHeight));
            titleFontSize = Math.max(34, Math.round(titleFontSize * scale));
            bodyFontSize = Math.max(22, Math.round(bodyFontSize * scale));

            titleFont = `800 ${titleFontSize}px Inter, "Space Grotesk", system-ui, -apple-system, sans-serif`;
            bodyFont = `500 ${bodyFontSize}px Inter, system-ui, -apple-system, sans-serif`;
            titleLineHeight = Math.round(titleFontSize * 1.35);
            bodyLineHeight = Math.round(bodyFontSize * 1.45);

            titleLines = wrapTextLines((tierTitle || '').toUpperCase(), titleFont);
            bodyLines = tierBody ? wrapTextLines(tierBody, bodyFont) : [];
            gap = (titleLines.length > 0 && bodyLines.length > 0) ? Math.round(36 * scale) : 0;
            totalTextHeight = (titleLines.length * titleLineHeight) + gap + (bodyLines.length * bodyLineHeight);
          }

          let currentY = (cardY + cardH / 2) - (totalTextHeight / 2);

          // Draw Tier 1 (Тезис - Bold Accent)
          ctx.font = titleFont;
          ctx.fillStyle = carouselAccentColor || '#FFE600';
          titleLines.forEach((tLine) => {
            ctx.fillText(tLine, cardX + 50, currentY);
            currentY += titleLineHeight;
          });

          currentY += gap;

          // Draw Tier 2 (Пояснение - Regular Light Text)
          if (bodyLines.length > 0) {
            ctx.font = bodyFont;
            ctx.fillStyle = carouselTextColor || '#FFFFFF';
            bodyLines.forEach((bLine) => {
              ctx.fillText(bLine, cardX + 50, currentY);
              currentY += bodyLineHeight;
            });
          }


          // 5. Glass Footer Watermarks (Matching Preview Card 1:1)
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.font = '700 20px Inter, system-ui, sans-serif';

          ctx.textAlign = 'left';
          ctx.fillText('@viral_engine', cardX + 50, cardY + cardH - 50);

          ctx.textAlign = 'right';
          ctx.fillText(`СЛАЙД ${slideNum}`, cardX + cardW - 50, cardY + cardH - 50);
        }


        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          resolve(dataUrl);
        } catch (e) {
          reject(e);
        }
      };

      const bgUrl = (slideNum === 1 || usePhotoBackdrop) ? imageResults[`carousel-0`] : null;
      if (bgUrl) {
        if (bgUrl.startsWith('data:')) {
          // Direct base64 dataUrl - draw directly onto canvas without calling fetch() in Safari
          const img = safeImage ? new safeImage() : null;
          if (img) {
            img.onload = () => drawContent(img);
            img.onerror = () => drawContent(null);
            img.src = bgUrl;
          } else {
            drawContent(null);
          }
        } else {
          // External http(s) URL -> fetch blob to prevent CORS canvas tainting
          fetch(bgUrl)
            .then(res => res.blob())
            .then(blob => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const img = safeImage ? new safeImage() : null;
                if (img) {
                  img.onload = () => drawContent(img);
                  img.onerror = () => drawContent(null);
                  img.src = reader.result as string;
                } else {
                  drawContent(null);
                }
              };
              reader.onerror = () => drawContent(null);
              reader.readAsDataURL(blob);
            })
            .catch(() => {
              // Fallback direct image load
              const img = safeImage ? new safeImage() : null;
              if (img) {
                img.crossOrigin = 'anonymous';
                img.onload = () => drawContent(img);
                img.onerror = () => drawContent(null);
                img.src = bgUrl;
              } else {
                drawContent(null);
              }
            });
        }
      } else {
        drawContent(null);
      }
    });
  };

  // State for mobile image preview modal
  const [modalShareImages, setModalShareImages] = useState<{ url: string; num: number }[] | null>(null);

  const downloadSingleRenderedSlide = async (slideNum: number) => {
    try {
      const dataUrl = await exportSlideToCanvas(slideNum);
      const fileName = `gallery_slide_${slideNum}.jpg`;

      // 1. Direct browser download trigger
      const link = safeDocument ? safeDocument.createElement('a') : null;
      if (link) {
        link.href = dataUrl;
        link.download = fileName;
        safeDocument.body.appendChild(link);
        link.click();
        safeDocument.body.removeChild(link);
      }

      // 2. Open in-app save modal so user can long-press to save to Photos without leaving page
      setModalShareImages([{ url: dataUrl, num: slideNum }]);
    } catch (e) {
      console.error('[Slide Render Error]:', e);
      safeAlert(isRu ? 'Ошибка рендеринга слайда. Попробуйте еще раз.' : 'Error rendering slide.');
    }
  };

  const handleShareSingleFile = async (dataUrl: string, slideNum: number) => {
    try {
      let blob: Blob;
      if (dataUrl.startsWith('data:')) {
        // Convert data URL to Blob directly without calling fetch() in Safari
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } else {
        const res = await fetch(dataUrl);
        blob = await res.blob();
      }

      const fileName = `gallery_slide_${slideNum}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      const nav = globalThis.navigator as any;
      if (nav?.share && nav?.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({
            files: [file],
            title: `Слайд #${slideNum}`,
            text: `Слайд #${slideNum} карусели`
          });
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      // Fallback: direct download link
      const link = safeDocument ? safeDocument.createElement('a') : null;
      if (link) {
        link.href = dataUrl;
        link.download = fileName;
        safeDocument.body.appendChild(link);
        link.click();
        safeDocument.body.removeChild(link);
      }
    } catch (err) {
      console.error('[Share Single File Error]:', err);
    }
  };

  const downloadAllRenderedSlides = async () => {
    setIsExportingAll(true);
    try {
      const allModalImages: { url: string; num: number }[] = [];

      for (let i = 1; i <= 6; i++) {
        const dataUrl = await exportSlideToCanvas(i);
        allModalImages.push({ url: dataUrl, num: i });

        // Direct anchor download trigger
        const link = safeDocument ? safeDocument.createElement('a') : null;
        if (link) {
          link.href = dataUrl;
          link.download = `gallery_slide_${i}.jpg`;
          safeDocument.body.appendChild(link);
          link.click();
          safeDocument.body.removeChild(link);
        }
        await new Promise(r => setTimeout(r, 150));
      }

      // Open in-app save modal with all 6 slides (stays 100% inside page without system context reset)
      setModalShareImages(allModalImages);
    } catch (err) {
      console.error('[Batch Export Error]:', err);
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.37),inset_0_1px_1px_rgba(255,255,255,0.1)]">
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
              onClick={() => generateFullGalleryAtOnce(activeFormatStyle as any)}
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

        {/* Carousel Narrative Format Selector Toolbar */}
        <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.37),inset_0_1px_1px_rgba(255,255,255,0.1)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
              <Sparkles size={14} className="text-purple-400" />
              {isRu ? 'Быстрый выбор формата и подачи карусели:' : 'Quick Carousel Format Selection:'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'standard', nameRu: '✦ Стандарт', nameEn: 'Standard', icon: Sparkles, hint: 'Экспертный разбор' },
              { id: 'numbered_list', nameRu: '🔢 Список (1-5)', nameEn: 'List (1-5)', icon: ListOrdered, hint: 'Нумерованные пункты' },
              { id: 'storytelling', nameRu: '📖 Сторителлинг', nameEn: 'Storytelling', icon: BookOpen, hint: 'Личный опыт и история' },
              { id: 'provocation', nameRu: '🔥 Провокация', nameEn: 'Provocation', icon: Flame, hint: 'Разбор мифов и хайп' }
            ].map((fmt) => {
              const IconComp = fmt.icon;
              const isActive = activeFormatStyle === fmt.id;
              return (
                <button
                  key={fmt.id}
                  onClick={() => generateFullGalleryAtOnce(fmt.id as any)}
                  disabled={isAnyGenerationActive}
                  className={cn(
                    "p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-20 group active:scale-98 disabled:opacity-50",
                    isActive
                      ? "border-purple-500 bg-white/10 ring-2 ring-purple-500/50 shadow-lg"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                  )}
                >
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      <IconComp size={14} className={isActive ? "text-purple-300 animate-pulse" : "text-white/60"} />
                      {isRu ? fmt.nameRu : fmt.nameEn}
                    </span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                    )}
                  </div>
                  <span className="text-[8px] font-mono uppercase tracking-widest text-white/40 z-10 pt-1">
                    {fmt.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 Color Palette Selector */}

        <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.37),inset_0_1px_1px_rgba(255,255,255,0.1)] space-y-4">
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
                      ? "border-purple-500 bg-white/[0.08] backdrop-blur-xl ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
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

          {/* Color & Backdrop Fine-tuner */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

            {/* Photo Backdrop & Contrast Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 border-t border-white/5 bg-white/[0.02] p-3 rounded-2xl border border-white/10">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={usePhotoBackdrop}
                  onChange={(e) => setUsePhotoBackdrop(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/40 accent-purple-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    🖼️ {isRu ? 'Четкое фото по краям + стекло карточки (Glassmorphism)' : 'Crisp Photo Edges + Glassmorphic Card'}
                  </span>
                  <span className="text-[8px] font-mono text-white/40 block">
                    {isRu ? 'Края слайда сочные и четкие, под карточкой умеренный blur и затемнение' : 'Sharp image margins outside card, moderate blur inside glass card'}
                  </span>
                </div>
              </label>

              {usePhotoBackdrop && (
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[9px] font-black uppercase tracking-widest text-purple-300">
                    {isRu ? `Прозрачность стекла (Контраст): ${backdropDarkness}%` : `Glass Tint: ${backdropDarkness}%`}
                  </span>
                  <input
                    type="range"
                    min="40"
                    max="92"
                    step="2"
                    value={backdropDarkness}
                    onChange={(e) => setBackdropDarkness(Number(e.target.value))}
                    className="w-32 accent-purple-500 cursor-pointer"
                  />
                </div>
              )}
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
                const textContent = customSlideTexts[num] !== undefined ? customSlideTexts[num] : (slideData?.text_on_slide || (num === 1 ? reelsHook || 'Хук вашего видео-сценария' : DEFAULT_SLIDE_FALLBACKS[num] || `Тезис слайда ${num}`));


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
                      className="relative w-full aspect-[4/5] rounded-[1.8rem] overflow-hidden border border-white/10 flex flex-col justify-between p-6 group/canvas shadow-2xl"
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
                            <h3 className="text-white font-extrabold text-xs md:text-sm uppercase tracking-wide leading-relaxed drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] font-sans">
                              {renderHighlightText(textContent)}
                            </h3>
                          </div>

                          {/* Bottom Center Fingerprint Logo Icon */}
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                            <div className="w-5 h-5 rounded-full bg-[#ffe600] flex items-center justify-center shadow-md">
                              <Fingerprint size={12} className="text-black" />
                            </div>
                          </div>

                        </>
                      ) : (
                        /* SLIDES 2-6 (BODY SLIDES - SHARP PHOTO EDGES + CLIPPED INNER GLASS CARD) */
                        <div className="w-full h-full p-1 relative overflow-hidden rounded-[1.8rem]">
                          {/* Photo Backdrop from Slide 1 - Sharp & Unblurred Edges */}
                          {imageResults['carousel-0'] && usePhotoBackdrop ? (
                            <img
                              src={imageResults['carousel-0']}
                              alt={`Slide ${num} Backdrop`}
                              crossOrigin="anonymous"
                              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                            />
                          ) : (
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{ background: `linear-gradient(135deg, ${carouselBg1}, ${carouselBg2})` }}
                            />
                          )}

                          <div
                            className="relative z-10 w-full h-full rounded-[1.4rem] border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_32px_rgba(0,0,0,0.5)] p-3.5 flex flex-col justify-between overflow-hidden"
                            style={{
                              backgroundColor: usePhotoBackdrop ? `rgba(9, 8, 20, ${(backdropDarkness / 100) * 0.65})` : 'rgba(255, 255, 255, 0.08)',
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)'
                            }}
                          >
                            <div className="flex justify-between items-center z-10">
                              <span
                                className="text-[8px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-sm"
                                style={{ color: carouselAccentColor }}
                              >
                                0{num} / 06
                              </span>
                            </div>

                            <div className="my-auto py-3 text-left z-10 flex flex-col justify-center space-y-2.5">
                              {(() => {
                                const { title: tHead, body: tBody } = parseTwoTierSlideText(textContent);
                                return (
                                  <>
                                    <h4
                                      className="font-black text-sm md:text-base leading-snug uppercase tracking-tight drop-shadow-lg"
                                      style={{ color: carouselAccentColor || '#FFE600' }}
                                    >
                                      {tHead}
                                    </h4>
                                    {tBody && (
                                      <p
                                        className="font-medium text-xs md:text-[13px] leading-relaxed opacity-95 drop-shadow-md font-sans"
                                        style={{ color: carouselTextColor || '#FFFFFF' }}
                                      >
                                        {tBody}
                                      </p>
                                    )}
                                  </>
                                );
                              })()}
                            </div>

                            {/* Glass Footer Watermark (Matching Canvas 1:1) */}
                            <div className="flex justify-between items-center z-10 text-[7.5px] font-bold uppercase tracking-widest opacity-50 font-sans" style={{ color: carouselTextColor || '#FFFFFF' }}>
                              <span>@viral_engine</span>
                              <span>СЛАЙД {num}</span>
                            </div>
                          </div>
                        </div>
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
        <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.37),inset_0_1px_1px_rgba(255,255,255,0.1)] space-y-6">
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
            {(() => {
              const activeVal = customSlideTexts[currentSlideNum] !== undefined ? customSlideTexts[currentSlideNum] : (currentSlideData?.text_on_slide || (currentSlideNum === 1 ? reelsHook || 'Хук вашего видео-сценария' : ''));
              const charCount = activeVal.length;
              const maxCharLimit = currentSlideNum === 1 ? 140 : 220;

              return (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                      📝 {currentSlideNum === 1 ? (isRu ? 'Заголовок на обложке (из Хука сценария)' : 'Cover Headline Text') : (isRu ? 'Текст слайда (Тезис + Мысль)' : 'Slide Thought Text')}
                    </label>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full font-mono text-[8px] font-bold tracking-wider transition-all",
                      charCount <= 110 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                      charCount <= 135 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                      "bg-red-500/20 text-red-400 border border-red-500/30 font-black"
                    )}>
                      {charCount} / {maxCharLimit} {isRu ? 'символов' : 'chars'}
                      {charCount >= maxCharLimit && (isRu ? ' • Лимит' : ' • Limit')}
                    </span>
                  </div>
                  <textarea
                    value={activeVal}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, maxCharLimit);
                      setCustomSlideTexts(prev => ({ ...prev, [currentSlideNum]: val }));
                    }}
                    maxLength={maxCharLimit}
                    rows={3}
                    className="w-full p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-[12px] text-white focus:border-purple-500/50 focus:outline-none transition-all resize-none font-sans"
                  />
                </div>
              );
            })()}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                  🎨 {isRu ? 'Промпт для фото-обложки' : 'Cover Photo Prompt'}
                </label>
                {currentSlideNum === 1 && (
                  <button
                    onClick={() => {
                      const prompt = customImagePrompts[1] || currentSlideData?.image_prompt || `${reelsHook || 'Professional topic'}, cinematic 8k photography, ambient lighting --no text`;
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
                placeholder={currentSlideNum === 1 ? 'English image prompt for cover background...' : 'Промпт не нужен для слайдов 2-6...'}
                disabled={currentSlideNum !== 1}
                className="w-full p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-[11px] text-white/80 focus:border-purple-500/50 focus:outline-none transition-all resize-none disabled:opacity-30"
              />
            </div>
          </div>
        </div>

        {/* Post Caption Card */}
        <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.37),inset_0_1px_1px_rgba(255,255,255,0.1)] space-y-4">
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

        {/* Fullscreen Mobile Save & Share Modal */}
        <AnimatePresence>
          {modalShareImages && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl p-4 md:p-8 flex flex-col items-center justify-center overflow-y-auto"
            >
              <div className="max-w-2xl w-full bg-[#0d0d16] border border-white/10 rounded-[2.5rem] p-6 space-y-6 shadow-2xl relative my-auto">
                <button
                  onClick={() => setModalShareImages(null)}
                  className="absolute top-6 right-6 p-2.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white active:scale-95 transition-all"
                >
                  <X size={18} />
                </button>

                <div className="space-y-1 pr-12">
                  <h3 className="text-lg font-black text-white uppercase italic tracking-wider flex items-center gap-2">
                    <Download size={18} className="text-purple-400" />
                    {isRu ? 'Сохранить слайды в Галерею' : 'Save Slides to Photos'}
                  </h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                    {isRu ? 'Нажмите и удерживайте изображение, чтобы сохранить в фотопленку' : 'Long-press any image to save to your photo gallery'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[58vh] overflow-y-auto custom-scrollbar p-1">
                  {modalShareImages.map((img) => (
                    <div key={img.num} className="space-y-3 text-center bg-white/[0.03] border border-white/10 rounded-3xl p-3 flex flex-col justify-between">
                      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-lg">
                        <img 
                          src={img.url} 
                          alt={`Slide ${img.num}`} 
                          className="w-full h-full object-cover select-auto touch-auto cursor-pointer"
                          style={{
                            WebkitTouchCallout: 'default',
                            WebkitUserSelect: 'auto',
                            userSelect: 'auto',
                            touchAction: 'manipulation'
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-white/50 font-bold block">Слайд #{img.num}</span>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleShareSingleFile(img.url, img.num)}
                            className="flex-1 py-2 px-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 text-purple-300 text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95 shadow-md"
                          >
                            <Share2 size={12} />
                            {isRu ? 'Поделиться' : 'Share'}
                          </button>

                          <button
                            onClick={() => {
                              const link = safeDocument ? safeDocument.createElement('a') : null;
                              if (link) {
                                link.href = img.url;
                                link.download = `gallery_slide_${img.num}.jpg`;
                                safeDocument.body.appendChild(link);
                                link.click();
                                safeDocument.body.removeChild(link);
                              }
                            }}
                            className="py-2 px-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95"
                          >
                            <Download size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>


                <button
                  onClick={() => setModalShareImages(null)}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-98 transition-all"
                >
                  {isRu ? 'Готово' : 'Done'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

