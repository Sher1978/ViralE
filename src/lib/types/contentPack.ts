// Content Pack — shared data types

export type JTBDCategory = 'post_today' | 'published' | 'in_progress' | 'draft';

export interface GalleryImage {
  id: string;
  url: string;
  caption: string;
}

export interface ContentPack {
  id: string;
  projectId: string;
  title: string;
  createdAt: string; // ISO
  updatedAt: string;
  jtbd: JTBDCategory;

  // Assets
  videoUrl?: string;
  coverImageUrl?: string;
  caption?: string;          // ≤600 chars + hashtags
  article?: string;          // Long-form for LinkedIn/FB/Threads
  galleryImages?: GalleryImage[];
  galleryCaption?: string;

  // Tracking
  postedTo: string[];
  assetsReady: number; // 0-5
}

export const JTBD_META: Record<JTBDCategory, { label: string; labelRu: string; color: string; glow: string; dot: string }> = {
  post_today: {
    label: 'Post Today',
    labelRu: 'Опубликовать сегодня',
    color: 'text-amber-400',
    glow: 'shadow-[0_0_20px_rgba(251,191,36,0.2)]',
    dot: 'bg-amber-400',
  },
  published: {
    label: 'Published',
    labelRu: 'Опубликовано',
    color: 'text-emerald-400',
    glow: 'shadow-[0_0_20px_rgba(52,211,153,0.2)]',
    dot: 'bg-emerald-400',
  },
  in_progress: {
    label: 'In Progress',
    labelRu: 'В работе',
    color: 'text-blue-400',
    glow: 'shadow-[0_0_20px_rgba(96,165,250,0.2)]',
    dot: 'bg-blue-400',
  },
  draft: {
    label: 'Draft',
    labelRu: 'Черновик',
    color: 'text-white/30',
    glow: '',
    dot: 'bg-white/20',
  },
};

export const PLATFORMS = {
  youtube:   { label: 'YouTube',   icon: '▶', color: '#FF0000', url: 'https://studio.youtube.com/' },
  instagram: { label: 'Instagram', icon: '📷', color: '#E1306C', url: 'instagram://camera' },
  tiktok:    { label: 'TikTok',   icon: '♪', color: '#000000', url: 'https://www.tiktok.com/upload' },
  facebook:  { label: 'Facebook', icon: 'f', color: '#1877F2', url: 'https://www.facebook.com/' },
  linkedin:  { label: 'LinkedIn', icon: 'in', color: '#0A66C2', url: 'https://www.linkedin.com/feed/' },
  threads:   { label: 'Threads',  icon: '@', color: '#101010', url: 'https://www.threads.net/' },
} as const;
