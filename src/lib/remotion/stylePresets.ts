export interface StylePreset {
  key: string;
  name: string;
  description: string;
  colors: {
    accent: string;
    secondary: string;
    background: string;
    cardBg: string;
    cardBorder: string;
    text: string;
    glow: string;
  };
  subtitleColors: {
    fontColor: string;
    boxColor: string;
    borderColor: string;
  };
  fontFamily: string;
  springConfig: {
    mass: number;
    damping: number;
    stiffness: number;
  };
  jitterRangeDeg: number;
  anticipationMs: number;
}

export const STYLE_PRESETS: Record<string, StylePreset> = {
  warm_empathic: {
    key: 'warm_empathic',
    name: 'Теплый Эмпатичный',
    description: 'Для психологов, коучей, менторов и душевно-экспертного сторителлинга',
    colors: {
      accent: '#E07A5F',       // Warm Terracotta
      secondary: '#F4F1DE',    // Warm Sand Cream
      background: '#1F1A17',   // Deep Warm Dark
      cardBg: 'rgba(40, 32, 28, 0.92)',
      cardBorder: 'rgba(224, 122, 95, 0.35)',
      text: '#F4F1DE',
      glow: 'rgba(224, 122, 95, 0.25)'
    },
    subtitleColors: {
      fontColor: '#F4F1DE',
      boxColor: 'rgba(224, 122, 95, 0.85)',
      borderColor: '#E07A5F'
    },
    fontFamily: 'Roboto-Bold',
    springConfig: { mass: 0.9, damping: 18, stiffness: 120 },
    jitterRangeDeg: 2,
    anticipationMs: 150
  },

  minimal_expert: {
    key: 'minimal_expert',
    name: 'Минимализм & Эксперт',
    description: 'Для бизнес-консультантов, аналитиков и строгой аналитики',
    colors: {
      accent: '#38BDF8',       // Sky Cyan
      secondary: '#818CF8',    // Indigo Accent
      background: '#0F172A',   // Slate Dark
      cardBg: 'rgba(15, 23, 42, 0.90)',
      cardBorder: 'rgba(56, 189, 248, 0.3)',
      text: '#F8FAFC',
      glow: 'rgba(56, 189, 248, 0.2)'
    },
    subtitleColors: {
      fontColor: '#FFFFFF',
      boxColor: 'rgba(15, 23, 42, 0.8)',
      borderColor: '#38BDF8'
    },
    fontFamily: 'Roboto-Bold',
    springConfig: { mass: 0.8, damping: 14, stiffness: 140 },
    jitterRangeDeg: 1.5,
    anticipationMs: 150
  },

  hormozi_bold: {
    key: 'hormozi_bold',
    name: 'Hormozi High Energy',
    description: 'Максимальное удержание для маркетинга, продаж и мотивации',
    colors: {
      accent: '#FACC15',       // Punch Yellow
      secondary: '#22D3EE',    // Cyan
      background: '#09090B',   // Pitch Black
      cardBg: 'rgba(24, 24, 27, 0.96)',
      cardBorder: 'rgba(250, 204, 21, 0.6)',
      text: '#FFFFFF',
      glow: 'rgba(250, 204, 21, 0.4)'
    },
    subtitleColors: {
      fontColor: '#09090B',
      boxColor: '#FACC15',
      borderColor: '#09090B'
    },
    fontFamily: 'Roboto-Bold',
    springConfig: { mass: 0.6, damping: 9, stiffness: 180 },
    jitterRangeDeg: 4,
    anticipationMs: 200
  },

  editorial_luxury: {
    key: 'editorial_luxury',
    name: 'Премиум & Глянец',
    description: 'Для премиальных брендов, недвижимости, моды и премиум-услуг',
    colors: {
      accent: '#D4AF37',       // Champagne Gold
      secondary: '#E2E8F0',    // Soft Silver
      background: '#0A110D',   // Dark Emerald Slate
      cardBg: 'rgba(10, 17, 13, 0.94)',
      cardBorder: 'rgba(212, 175, 55, 0.4)',
      text: '#F8FAFC',
      glow: 'rgba(212, 175, 55, 0.25)'
    },
    subtitleColors: {
      fontColor: '#D4AF37',
      boxColor: 'rgba(10, 17, 13, 0.9)',
      borderColor: '#D4AF37'
    },
    fontFamily: 'Roboto-BoldItalic',
    springConfig: { mass: 1.0, damping: 16, stiffness: 100 },
    jitterRangeDeg: 1.0,
    anticipationMs: 150
  },

  vibrant_creator: {
    key: 'vibrant_creator',
    name: 'Поп-Креатор & Лайфстайл',
    description: 'Для влогов, блогеров, трендов TikTok, Instagram Reels',
    colors: {
      accent: '#F43F5E',       // Rose Pink
      secondary: '#10B981',    // Emerald Green
      background: '#18181B',   // Dark Gray
      cardBg: 'rgba(39, 39, 42, 0.92)',
      cardBorder: 'rgba(244, 63, 94, 0.4)',
      text: '#FFFFFF',
      glow: 'rgba(244, 63, 94, 0.3)'
    },
    subtitleColors: {
      fontColor: '#FFFFFF',
      boxColor: 'rgba(244, 63, 94, 0.85)',
      borderColor: '#FFFFFF'
    },
    fontFamily: 'Roboto-Bold',
    springConfig: { mass: 0.7, damping: 11, stiffness: 160 },
    jitterRangeDeg: 3,
    anticipationMs: 180
  },

  cyberpunk_neon: {
    key: 'cyberpunk_neon',
    name: 'Неоновый Киберпанк',
    description: 'Для AI-сервисов, Web3, крипты и гейминга',
    colors: {
      accent: '#00F2EA',       // Neon Cyan
      secondary: '#FF007F',    // Neon Pink
      background: '#05050A',   // Deep Space Black
      cardBg: 'rgba(15, 10, 25, 0.95)',
      cardBorder: 'rgba(0, 242, 234, 0.5)',
      text: '#FFFFFF',
      glow: 'rgba(0, 242, 234, 0.4)'
    },
    subtitleColors: {
      fontColor: '#00F2EA',
      boxColor: 'rgba(255, 0, 127, 0.85)',
      borderColor: '#00F2EA'
    },
    fontFamily: 'Roboto-Bold',
    springConfig: { mass: 0.65, damping: 10, stiffness: 170 },
    jitterRangeDeg: 3.5,
    anticipationMs: 180
  },

  tech_futuristic: {
    key: 'tech_futuristic',
    name: 'Tech & High Architecture',
    description: 'Для IT-разработчиков, хайтек продуктов и инженерных обзоров',
    colors: {
      accent: '#A855F7',       // Electric Purple
      secondary: '#3B82F6',    // Cobalt Blue
      background: '#030712',   // Midnight Dark
      cardBg: 'rgba(15, 23, 42, 0.92)',
      cardBorder: 'rgba(168, 85, 247, 0.4)',
      text: '#F8FAFC',
      glow: 'rgba(168, 85, 247, 0.3)'
    },
    subtitleColors: {
      fontColor: '#A855F7',
      boxColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: '#A855F7'
    },
    fontFamily: 'Roboto-Bold',
    springConfig: { mass: 0.8, damping: 13, stiffness: 135 },
    jitterRangeDeg: 2,
    anticipationMs: 150
  }
};

/**
 * Merges a chosen preset style with the user's custom brand DNA (from DB visual_dna_config).
 */
export function resolveUserBrandStyle(presetKey?: string, userBrandDna?: any): StylePreset {
  const basePreset = STYLE_PRESETS[presetKey || 'minimal_expert'] || STYLE_PRESETS.minimal_expert;

  if (!userBrandDna) return basePreset;

  const customAccent = userBrandDna.accentColor || userBrandDna.primaryColor || basePreset.colors.accent;
  const customSecondary = userBrandDna.secondaryColor || basePreset.colors.secondary;
  const customFont = userBrandDna.fontFamily || basePreset.fontFamily;

  return {
    ...basePreset,
    colors: {
      ...basePreset.colors,
      accent: customAccent,
      secondary: customSecondary,
      cardBorder: customAccent ? `${customAccent}66` : basePreset.colors.cardBorder,
      glow: customAccent ? `${customAccent}40` : basePreset.colors.glow
    },
    subtitleColors: {
      ...basePreset.subtitleColors,
      fontColor: userBrandDna.subtitleTextColor || basePreset.subtitleColors.fontColor,
      boxColor: userBrandDna.subtitleBgColor || basePreset.subtitleColors.boxColor
    },
    fontFamily: customFont
  };
}
