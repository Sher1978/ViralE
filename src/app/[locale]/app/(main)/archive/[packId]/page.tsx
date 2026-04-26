'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from '@/navigation';
import {
  ArrowLeft, Download, Copy, Check, Share2,
  Video, Image as ImageIcon, FileText, AlignLeft, Grid,
  Sparkles, Loader2, ExternalLink, ChevronDown, ChevronUp,
  Play, Pause, Archive, AlertCircle, PackageCheck
} from 'lucide-react';
import { ContentPack, PLATFORMS } from '@/lib/types/contentPack';

// ── Mock data loader (replace with real service later) ────────────────────
function getMockPack(packId: string): ContentPack {
  return {
    id: packId,
    projectId: 'proj_1',
    title: 'The Zero-to-Hero Framework',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    jtbd: 'post_today',
    videoUrl: undefined,
    coverImageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
    caption: `🔥 3 years ago I had no audience. No leads. No direction.\n\nHere's the exact framework I used to go from 0 to consistent inbound — without ads, without cold outreach, and without burning out.\n\nThe secret? Showing what you know before you sell what you have.\n\nSave this post if you're building your personal brand in 2024. 👇\n\n#PersonalBrand #ContentMarketing #CreatorEconomy #LinkedInTips #ViralEngine`,
    article: `# The Zero-to-Hero Framework: How I Built an Audience Without Ads

Three years ago, I sat in front of a blank screen wondering why nobody was paying attention to my work. I had expertise. I had results. But no platform, no audience, no momentum.

## The Problem With Traditional Approach

Most advice tells you to "just create content consistently." But consistency without strategy is just noise. I wasted 6 months posting daily with zero growth.

## The Three-Layer System

**Layer 1: Magnetic Core**
Your content needs one clear transformative idea. Not a topic — a transformation. "Productivity tips" is a topic. "Turn scattered ideas into income in 90 minutes a day" is a transformation.

**Layer 2: The Evidence Engine**
Every post should contain proof. Not testimonials — lived proof. Show the messy middle, the failed attempts, the unexpected discoveries. Authenticity is the algorithm.

**Layer 3: The Invitation Loop**
End every piece of content with a micro-commitment. Not "follow me" — "save this for when you're ready to start." Lower the barrier for action.

## The Results

Within 6 months of implementing this system: 40K organic reach per month, 3 inbound partnership deals, 1 premium course launch.

The framework works because it aligns with how humans actually make decisions — through evidence, trust, and invitation.

Start with Layer 1 today. Define your transformation in one sentence. That single clarity will change everything.`,
    galleryImages: [
      { id: 'g1', url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80', caption: 'Slide 1/5 · The Problem' },
      { id: 'g2', url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80', caption: 'Slide 2/5 · Layer 1: Magnetic Core' },
      { id: 'g3', url: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=600&q=80', caption: 'Slide 3/5 · Layer 2: Evidence Engine' },
      { id: 'g4', url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&q=80', caption: 'Slide 4/5 · Layer 3: Invitation Loop' },
      { id: 'g5', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80', caption: 'Slide 5/5 · Results' },
    ],
    galleryCaption: '5-slide carousel: The Zero-to-Hero Framework 🔥\nSwipe through all 5 slides and save for later!\n\n#ContentCreation #PersonalBrand #Framework',
    postedTo: [],
    assetsReady: 4,
  };
}

// ── Share helpers ─────────────────────────────────────────────────────────
function openShare(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function downloadAsset(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  } catch {
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
}

function copyText(text: string, setCopied: (k: string) => void, key: string) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  });
}

// ── Platform Share Button ─────────────────────────────────────────────────
function PlatformBtn({ platform, onPress, posted }: {
  platform: keyof typeof PLATFORMS;
  onPress: () => void;
  posted: boolean;
}) {
  const meta = PLATFORMS[platform];
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onPress}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[8px] font-black uppercase tracking-widest transition-all border active:scale-95 ${
        posted
          ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400'
          : 'bg-white/[0.04] border-white/8 text-white/50 hover:text-white/80 hover:border-white/15'
      }`}
    >
      <span className="text-[11px] leading-none">{meta.icon}</span>
      <span>{posted ? '✓ ' : ''}{meta.label}</span>
      <ExternalLink size={8} className="opacity-50" />
    </motion.button>
  );
}

// ── Expandable Section ────────────────────────────────────────────────────
function Section({
  id, icon: Icon, title, color, children, defaultOpen = false
}: {
  id: string;
  icon: React.FC<any>;
  title: string;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-3xl bg-white/[0.025] border border-white/5 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4"
      >
        <div className={`w-8 h-8 rounded-2xl bg-white/[0.04] flex items-center justify-center ${color}`}>
          <Icon size={14} />
        </div>
        <span className={`font-black uppercase tracking-widest text-[10px] flex-1 text-left ${color}`}>
          {title}
        </span>
        {open ? <ChevronUp size={14} className="text-white/20" /> : <ChevronDown size={14} className="text-white/20" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function ContentPackPage() {
  const params = useParams();
  const packId = params.packId as string;
  const locale = useLocale();
  const router = useRouter();

  const [pack, setPack] = useState<ContentPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [postedTo, setPostedTo] = useState<string[]>([]);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      const data = getMockPack(packId);
      setPack(data);
      setPostedTo(data.postedTo);
      setLoading(false);
    }, 600);
  }, [packId]);

  const markPosted = (platform: string) => {
    setPostedTo(prev => prev.includes(platform) ? prev : [...prev, platform]);
    openShare(PLATFORMS[platform as keyof typeof PLATFORMS]?.url || '#');
  };

  const mockGenerate = async (asset: string) => {
    setGenerating(asset);
    await new Promise(r => setTimeout(r, 1500));
    setGenerating(null);
  };

  if (loading || !pack) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60dvh] gap-4">
        <Loader2 size={24} className="text-cyan-400 animate-spin" />
        <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">Loading Pack...</p>
      </div>
    );
  }

  const isRu = locale === 'ru';

  return (
    <div className="pb-32 animate-fade-in">
      {/* Nav */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/app/archive')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/5 border border-white/8 text-white/40 text-[9px] font-black uppercase tracking-widest active:scale-95">
          <ArrowLeft size={11} /> {isRu ? 'Библиотека' : 'Library'}
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Post Today</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white leading-none">
          {pack.title}
        </h1>
        <p className="text-[8px] text-white/25 uppercase tracking-[0.25em] mt-1 font-bold">
          {new Date(pack.createdAt).toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
          &nbsp;·&nbsp; {pack.assetsReady}/5 {isRu ? 'активов готово' : 'assets ready'}
        </p>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${(pack.assetsReady / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Instructions chip */}
      <div className="flex items-start gap-2 p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 mb-6">
        <AlertCircle size={12} className="text-cyan-400 flex-shrink-0 mt-0.5" />
        <p className="text-[9px] text-white/40 leading-relaxed">
          {isRu
            ? 'Все материалы пакета готовы к публикации. Нажмите кнопку платформы — откроется нужное приложение. Для загрузки видео скачайте файл и загрузите вручную.'
            : 'All assets are ready to publish. Tap a platform button to open the app. For video uploads, download the file first and upload manually.'}
        </p>
      </div>

      <div className="space-y-3">

        {/* ── 1. VIDEO ── */}
        <Section id="video" icon={Video} title={isRu ? 'Видео' : 'Video'} color="text-purple-400" defaultOpen>
          <div className="aspect-video bg-black rounded-2xl overflow-hidden relative">
            {pack.videoUrl ? (
              <video src={pack.videoUrl} className="w-full h-full object-contain" controls playsInline />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Video size={32} className="text-white/10" />
                <p className="text-[9px] text-white/20 uppercase tracking-widest font-black">
                  {isRu ? 'Видео не добавлено' : 'No video attached'}
                </p>
                <button
                  onClick={() => router.push('/app/projects')}
                  className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-black uppercase active:scale-95"
                >
                  {isRu ? '→ Перейти в студию' : '→ Go to Studio'}
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {pack.videoUrl && (
              <button
                onClick={() => downloadAsset(pack.videoUrl!, `${pack.title}-video.mp4`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/5 border border-white/8 text-white/50 text-[8px] font-black uppercase active:scale-95"
              >
                <Download size={10} /> {isRu ? 'Скачать' : 'Save'}
              </button>
            )}
          </div>

          {/* Platform buttons */}
          <div>
            <p className="text-[7px] text-white/20 uppercase tracking-widest font-black mb-2">
              {isRu ? 'Опубликовать в' : 'Publish to'}
            </p>
            <div className="flex flex-wrap gap-2">
              {(['youtube', 'instagram', 'tiktok'] as const).map(p => (
                <PlatformBtn key={p} platform={p} posted={postedTo.includes(p)} onPress={() => markPosted(p)} />
              ))}
            </div>
          </div>

          <p className="text-[7px] text-white/15 leading-relaxed">
            {isRu
              ? '💡 Для YouTube и TikTok: скачайте файл, затем откройте приложение и загрузите вручную. Instagram: используйте «Поделиться» → «Instagram».'
              : '💡 For YouTube & TikTok: download the file, then open the app and upload manually. Instagram: use Share → Instagram.'}
          </p>
        </Section>

        {/* ── 2. COVER IMAGE ── */}
        <Section id="cover" icon={ImageIcon} title={isRu ? 'Обложка' : 'Cover Image'} color="text-blue-400">
          {pack.coverImageUrl ? (
            <div className="relative rounded-2xl overflow-hidden aspect-video">
              <img src={pack.coverImageUrl} className="w-full h-full object-cover" alt="Cover" />
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80">
                <p className="text-[8px] text-white/50 uppercase tracking-widest">
                  {isRu ? 'Сгенерировано на основе Brand DNA' : 'Generated from Brand DNA'}
                </p>
              </div>
            </div>
          ) : (
            <div className="aspect-video rounded-2xl bg-white/[0.02] border border-dashed border-white/8 flex flex-col items-center justify-center gap-3">
              <ImageIcon size={24} className="text-white/10" />
              <button
                onClick={() => mockGenerate('cover')}
                disabled={generating === 'cover'}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase active:scale-95"
              >
                {generating === 'cover' ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                {isRu ? 'Сгенерировать AI обложку' : 'Generate AI Cover'}
              </button>
            </div>
          )}

          {pack.coverImageUrl && (
            <button
              onClick={() => downloadAsset(pack.coverImageUrl!, `${pack.title}-cover.jpg`)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/5 border border-white/8 text-white/50 text-[8px] font-black uppercase active:scale-95"
            >
              <Download size={10} /> {isRu ? 'Скачать обложку' : 'Save Cover'}
            </button>
          )}
        </Section>

        {/* ── 3. SOCIAL CAPTION ── */}
        <Section id="caption" icon={FileText} title={isRu ? 'Подпись для соцсетей' : 'Social Caption'} color="text-amber-400">
          {pack.caption ? (
            <>
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 relative">
                <p className="text-[11px] text-white/70 leading-relaxed whitespace-pre-line">{pack.caption}</p>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                  <span className="text-[7px] text-white/20 font-black">{pack.caption.length}/600 chars</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => copyText(pack.caption!, setCopied, 'caption')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-black active:scale-95"
                    >
                      {copied === 'caption' ? <Check size={9} /> : <Copy size={9} />}
                      {copied === 'caption' ? (isRu ? 'Скопировано' : 'Copied!') : isRu ? 'Копировать' : 'Copy'}
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([pack.caption!], { type: 'text/plain' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `${pack.title}-caption.txt`;
                        a.click();
                      }}
                      className="p-1.5 rounded-xl bg-white/5 border border-white/8 text-white/40 active:scale-95"
                    >
                      <Download size={9} />
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[7px] text-white/20 uppercase tracking-widest font-black mb-1.5">{isRu ? 'Платформы' : 'Platforms'}</p>
                <div className="flex flex-wrap gap-2">
                  {(['instagram', 'tiktok'] as const).map(p => (
                    <PlatformBtn key={p} platform={p} posted={postedTo.includes(p + '_caption')} onPress={() => markPosted(p + '_caption')} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <button onClick={() => mockGenerate('caption')} disabled={generating === 'caption'}
              className="w-full py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase flex items-center justify-center gap-2 active:scale-95">
              {generating === 'caption' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {isRu ? 'Сгенерировать подпись AI' : 'Generate Caption'}
            </button>
          )}
        </Section>

        {/* ── 4. ARTICLE ── */}
        <Section id="article" icon={AlignLeft} title={isRu ? 'Статья-пост' : 'Long-form Article'} color="text-emerald-400">
          {pack.article ? (
            <>
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 max-h-40 overflow-y-auto">
                <p className="text-[10px] text-white/60 leading-relaxed whitespace-pre-line">{pack.article}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => copyText(pack.article!, setCopied, 'article')}
                  className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black active:scale-95"
                >
                  {copied === 'article' ? <Check size={9} /> : <Copy size={9} />}
                  {copied === 'article' ? (isRu ? 'Скопировано' : 'Copied!') : isRu ? 'Копировать' : 'Copy'}
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([pack.article!], { type: 'text/plain' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `${pack.title}-article.txt`;
                    a.click();
                  }}
                  className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-white/5 border border-white/8 text-white/40 text-[8px] font-black active:scale-95"
                >
                  <Download size={9} /> {isRu ? 'Скачать' : 'Save'}
                </button>
              </div>
              <div>
                <p className="text-[7px] text-white/20 uppercase tracking-widest font-black mb-1.5">{isRu ? 'Платформы для статьи' : 'For article'}</p>
                <div className="flex flex-wrap gap-2">
                  {(['linkedin', 'facebook', 'threads'] as const).map(p => (
                    <PlatformBtn key={p} platform={p} posted={postedTo.includes(p)} onPress={() => markPosted(p)} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <button onClick={() => mockGenerate('article')} disabled={generating === 'article'}
              className="w-full py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase flex items-center justify-center gap-2 active:scale-95">
              {generating === 'article' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {isRu ? 'Написать статью AI' : 'Generate Article'}
            </button>
          )}
        </Section>

        {/* ── 5. GALLERY ── */}
        <Section id="gallery" icon={Grid} title={isRu ? 'Галерея Instagram (5 изображений)' : 'Instagram Gallery (5 images)'} color="text-pink-400">
          {(pack.galleryImages?.length ?? 0) > 0 ? (
            <>
              {/* Slide viewer */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-black">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeGalleryIndex}
                    src={pack.galleryImages![activeGalleryIndex].url}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                  />
                </AnimatePresence>
                {/* Slide indicator */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {pack.galleryImages!.map((_, i) => (
                    <button key={i} onClick={() => setActiveGalleryIndex(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeGalleryIndex ? 'bg-white scale-125' : 'bg-white/30'}`} />
                  ))}
                </div>
                {/* Caption chip */}
                <div className="absolute top-3 left-3 right-3">
                  <div className="bg-black/60 backdrop-blur-sm rounded-xl px-2 py-1">
                    <p className="text-[8px] text-white/60">{pack.galleryImages![activeGalleryIndex].caption}</p>
                  </div>
                </div>
              </div>

              {/* Thumbnails row */}
              <div className="flex gap-2">
                {pack.galleryImages!.map((img, i) => (
                  <button key={img.id} onClick={() => setActiveGalleryIndex(i)}
                    className={`flex-1 aspect-square rounded-xl overflow-hidden border-2 transition-all ${i === activeGalleryIndex ? 'border-pink-400' : 'border-transparent opacity-40'}`}>
                    <img src={img.url} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>

              {/* Gallery caption */}
              {pack.galleryCaption && (
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3">
                  <p className="text-[9px] text-white/60 whitespace-pre-line">{pack.galleryCaption}</p>
                  <button onClick={() => copyText(pack.galleryCaption!, setCopied, 'gallery')}
                    className="mt-2 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[8px] font-black active:scale-95">
                    {copied === 'gallery' ? <Check size={9} /> : <Copy size={9} />}
                    {copied === 'gallery' ? (isRu ? 'Скопировано' : 'Copied!') : isRu ? 'Копировать подпись' : 'Copy Caption'}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => pack.galleryImages!.forEach((img, i) => setTimeout(() => downloadAsset(img.url, `${pack.title}-gallery-${i + 1}.jpg`), i * 300))}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/5 border border-white/8 text-white/50 text-[8px] font-black uppercase active:scale-95"
                >
                  <Download size={10} /> {isRu ? 'Скачать все 5' : 'Save All 5'}
                </button>
                <PlatformBtn platform="instagram" posted={postedTo.includes('instagram_gallery')} onPress={() => markPosted('instagram_gallery')} />
              </div>
            </>
          ) : (
            <button onClick={() => mockGenerate('gallery')} disabled={generating === 'gallery'}
              className="w-full py-3 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[9px] font-black uppercase flex items-center justify-center gap-2 active:scale-95">
              {generating === 'gallery' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {isRu ? 'Сгенерировать 5 изображений' : 'Generate 5 Gallery Images'}
            </button>
          )}
        </Section>

      </div>

      {/* ── Download All ── */}
      <div className="mt-6 p-4 rounded-3xl border border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3 mb-3">
          <PackageCheck size={16} className="text-cyan-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
            {isRu ? 'Скачать весь пакет' : 'Download Entire Pack'}
          </span>
        </div>
        <p className="text-[8px] text-white/20 leading-relaxed mb-3">
          {isRu
            ? 'Скачайте все материалы по отдельности или создайте ZIP-архив для хранения на диске.'
            : 'Download all assets individually or as a ZIP archive for local storage.'}
        </p>
        <button
          onClick={() => {
            const assets = [
              pack.videoUrl && { url: pack.videoUrl, name: 'video.mp4' },
              pack.coverImageUrl && { url: pack.coverImageUrl, name: 'cover.jpg' },
              ...(pack.galleryImages || []).map((g, i) => ({ url: g.url, name: `gallery-${i + 1}.jpg` })),
            ].filter(Boolean) as { url: string; name: string }[];
            assets.forEach((a, i) => setTimeout(() => downloadAsset(a.url, `${pack.title}-${a.name}`), i * 400));
          }}
          className="w-full py-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-cyan-500/15"
        >
          <Download size={13} /> {isRu ? 'Скачать все материалы' : 'Save All Assets'}
        </button>
      </div>
    </div>
  );
}
