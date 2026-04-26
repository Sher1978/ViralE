'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from '@/navigation';
import {
  Archive, Search, Loader2, Plus, ChevronRight,
  Video, Image, FileText, AlignLeft, Grid,
  Flame, CheckCircle2, Clock, FileEdit
} from 'lucide-react';
import { ContentPack, JTBDCategory, JTBD_META } from '@/lib/types/contentPack';
import { profileService } from '@/lib/services/profileService';
import { projectService } from '@/lib/services/projectService';

// ── Mock service ──────────────────────────────────────────────────────────
function buildMockPacks(projects: any[]): ContentPack[] {
  return projects.map((p, i) => ({
    id: `pack_${p.id}`,
    projectId: p.id,
    title: p.title || `Content Pack ${i + 1}`,
    createdAt: p.created_at || new Date().toISOString(),
    updatedAt: p.updated_at || new Date().toISOString(),
    jtbd: (['post_today', 'published', 'in_progress', 'draft'] as JTBDCategory[])[i % 4],
    videoUrl: undefined,
    coverImageUrl: undefined,
    caption: undefined,
    article: undefined,
    galleryImages: [],
    postedTo: i % 4 === 1 ? ['youtube', 'instagram'] : [],
    assetsReady: [4, 5, 2, 1][i % 4],
  }));
}

// ── Asset icons for cards ──────────────────────────────────────────────────
const ASSET_DOTS = [
  { key: 'video', Icon: Video, color: 'text-purple-400' },
  { key: 'cover', Icon: Image, color: 'text-blue-400' },
  { key: 'caption', Icon: FileText, color: 'text-amber-400' },
  { key: 'article', Icon: AlignLeft, color: 'text-emerald-400' },
  { key: 'gallery', Icon: Grid, color: 'text-pink-400' },
];

const JTBD_ICONS: Record<JTBDCategory, React.FC<any>> = {
  post_today: Flame,
  published: CheckCircle2,
  in_progress: Clock,
  draft: FileEdit,
};

// ── Main Component ────────────────────────────────────────────────────────
export default function LibraryPage() {
  const locale = useLocale();
  const router = useRouter();

  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeJTBD, setActiveJTBD] = useState<JTBDCategory | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await profileService.getOrCreateProfile();
      if (!profile) return;
      const projects = await projectService.listProjects(profile.id);
      const mockPacks = buildMockPacks(projects);
      setPacks(mockPacks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = packs.filter(p => {
    const matchJTBD = activeJTBD === 'all' || p.jtbd === activeJTBD;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    return matchJTBD && matchSearch;
  });

  // Group by JTBD
  const groups: Partial<Record<JTBDCategory, ContentPack[]>> = {};
  const order: JTBDCategory[] = ['post_today', 'published', 'in_progress', 'draft'];
  for (const cat of order) {
    const items = filtered.filter(p => p.jtbd === cat);
    if (items.length > 0) groups[cat] = items;
  }

  return (
    <div className="space-y-6 pb-28 animate-fade-in">
      {/* Header */}
      <div className="pl-16 space-y-0.5">
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25">Content</p>
        <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">
          Library <span className="text-cyan-400">Vault</span>
        </h1>
        <p className="text-[9px] text-white/25 uppercase tracking-[0.2em] font-bold pt-1">
          Your production archive
        </p>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-cyan-400 transition-colors" />
        <input
          type="text"
          placeholder="Search packs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30 focus:bg-white/[0.05] transition-all"
        />
      </div>

      {/* JTBD Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        <button
          onClick={() => setActiveJTBD('all')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
            activeJTBD === 'all'
              ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'bg-white/5 text-white/30 border border-white/5'
          }`}
        >
          All
        </button>
        {order.map(cat => {
          const meta = JTBD_META[cat];
          const Icon = JTBD_ICONS[cat];
          const isActive = activeJTBD === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveJTBD(cat)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                isActive
                  ? `bg-white/10 ${meta.color} border-white/20`
                  : 'bg-white/[0.02] text-white/25 border-white/5'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isActive ? meta.dot : 'bg-white/15'}`} />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Archive className="w-8 h-8 text-white/5 mb-4" />
          <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">Loading vault...</p>
        </div>
      ) : Object.keys(groups).length === 0 ? (
        <EmptyState locale={locale} router={router} />
      ) : (
        <div className="space-y-8">
          {order.map(cat => {
            const items = groups[cat];
            if (!items) return null;
            const meta = JTBD_META[cat];
            const Icon = JTBD_ICONS[cat];
            return (
              <div key={cat}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${meta.dot} animate-pulse`} />
                  <span className={`text-[9px] font-black uppercase tracking-[0.25em] ${meta.color}`}>
                    {locale === 'ru' ? meta.labelRu : meta.label}
                  </span>
                  <span className="text-[8px] text-white/20 font-black">({items.length})</span>
                  <div className="flex-1 h-px bg-white/5 ml-1" />
                </div>

                {/* Pack Cards */}
                <div className="space-y-3">
                  {items.map((pack, i) => (
                    <motion.div
                      key={pack.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <PackCard pack={pack} locale={locale} router={router} />
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Pack Card ─────────────────────────────────────────────────────────────
function PackCard({ pack, locale, router }: { pack: ContentPack; locale: string; router: any }) {
  const meta = JTBD_META[pack.jtbd];

  const assetReady = [
    !!pack.videoUrl,
    !!pack.coverImageUrl,
    !!pack.caption,
    !!pack.article,
    (pack.galleryImages?.length ?? 0) > 0,
  ];

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(`/app/archive/${pack.id}`)}
      className="flex items-center gap-4 p-4 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/15 active:bg-white/[0.05] transition-all cursor-pointer group"
    >
      {/* Thumbnail / Status badge */}
      <div className="relative flex-shrink-0">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center justify-center overflow-hidden">
          {pack.coverImageUrl ? (
            <img src={pack.coverImageUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <Video size={24} className="text-white/10" />
          )}
        </div>
        {/* JTBD dot */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${meta.dot} border-2 border-[#0A0A10]`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-black text-white uppercase tracking-tight italic truncate group-hover:text-cyan-300 transition-colors">
          {pack.title}
        </p>
        <p className="text-[8px] text-white/25 font-bold mt-0.5">
          {new Date(pack.createdAt).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' })}
        </p>

        {/* Asset dots */}
        <div className="flex items-center gap-1.5 mt-2">
          {ASSET_DOTS.map(({ key, Icon, color }, idx) => (
            <div key={key} title={key}
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                assetReady[idx] ? `bg-white/8 ${color}` : 'bg-white/[0.02] text-white/10'
              }`}>
              <Icon size={9} />
            </div>
          ))}
          <span className="text-[8px] text-white/20 font-black ml-1">
            {pack.assetsReady}/5
          </span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight size={16} className="text-white/15 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
    </motion.div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────
function EmptyState({ locale, router }: { locale: string; router: any }) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center space-y-6 rounded-[2.5rem] bg-white/[0.02] border border-dashed border-white/8">
      <div className="relative">
        <div className="absolute inset-0 bg-cyan-500/15 blur-2xl rounded-full animate-pulse" />
        <div className="relative w-20 h-20 rounded-3xl bg-black border border-white/10 flex items-center justify-center">
          <Archive className="w-10 h-10 text-cyan-400" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-black uppercase italic tracking-tighter text-white">Vault Empty</h3>
        <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] leading-relaxed max-w-[200px]">
          Finish a production to auto-create your first content pack
        </p>
      </div>
      <button
        onClick={() => router.push('/app/projects')}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
      >
        <Plus size={13} /> Start Production
      </button>
    </div>
  );
}
