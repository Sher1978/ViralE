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

import { DynamicThemeConfig, ChartVariant } from '@/lib/types/remotionArchitect';

/**
 * Generates an anti-template dynamic theme based on user prompt, visual seed, and brand DNA.
 */
export function buildDynamicThemeFromPrompt(
  prompt: string = '',
  presetKey?: string,
  visualSeed: number = 42,
  userBrandDna?: any
): DynamicThemeConfig {
  const p = prompt.toLowerCase();
  const seed = Math.abs(visualSeed);

  const isLight = p.includes('light') || p.includes('светл') || p.includes('бел') || p.includes('apple') || p.includes('white');
  const isNeon = p.includes('neon') || p.includes('неон') || p.includes('cyber') || p.includes('кибер') || p.includes('future');
  const isLuxury = p.includes('lux') || p.includes('люкс') || p.includes('премиум') || p.includes('gold') || p.includes('золот');
  const isHormozi = p.includes('hormozi') || p.includes('хормози') || p.includes('punch') || p.includes('энерги') || p.includes('желт');

  // Geometries rotation
  const geometries: DynamicThemeConfig['cardGeometry'][] = [
    'rounded_modern',
    'sharp_brutalist',
    'pill_soft',
    'minimal_borderless',
    'hud_tech'
  ];
  let cardGeometry: DynamicThemeConfig['cardGeometry'] = geometries[seed % geometries.length];
  if (p.includes('брутал') || p.includes('sharp')) cardGeometry = 'sharp_brutalist';
  else if (p.includes('hud') || p.includes('tech')) cardGeometry = 'hud_tech';
  else if (p.includes('без рамок') || p.includes('borderless')) cardGeometry = 'minimal_borderless';

  // Patterns rotation
  const patterns: DynamicThemeConfig['backgroundPattern'][] = [
    'aurora_ring',
    'tech_grid',
    'minimal_dots',
    'clean_gradient',
    'diagonal_mesh'
  ];
  let backgroundPattern: DynamicThemeConfig['backgroundPattern'] = patterns[(seed + 2) % patterns.length];
  if (p.includes('сетк') || p.includes('grid')) backgroundPattern = 'tech_grid';
  else if (p.includes('точк') || p.includes('dots')) backgroundPattern = 'minimal_dots';

  // Chart variant rotation
  const chartVariants: ChartVariant[] = ['vertical_bars', 'horizontal_progress', 'radial_gauge'];
  let chartVariant: ChartVariant = chartVariants[(seed + 1) % chartVariants.length];
  if (p.includes('круг') || p.includes('radial') || p.includes('ring')) chartVariant = 'radial_gauge';
  else if (p.includes('горизонт') || p.includes('полос') || p.includes('progress')) chartVariant = 'horizontal_progress';
  else if (p.includes('столб') || p.includes('бар') || p.includes('bars')) chartVariant = 'vertical_bars';

  // Speaker layout preference
  let defaultSpeakerLayout: DynamicThemeConfig['defaultSpeakerLayout'] = 'pip_circle_left';
  if (p.includes('50/50') || p.includes('split') || p.includes('пополам')) defaultSpeakerLayout = 'split_top_bottom';
  else if (p.includes('поверх') || p.includes('hud') || p.includes('overlay')) defaultSpeakerLayout = 'floating_overlay';
  else if (p.includes('справа') || p.includes('right')) defaultSpeakerLayout = 'pip_rounded_right';
  else if (p.includes('слайд') || p.includes('full')) defaultSpeakerLayout = 'full_cutaway';

  if (isLight) {
    return {
      themeMode: 'light',
      palette: {
        backgroundPrimary: '#F8FAFC',
        backgroundSecondary: '#EEF2F6',
        cardSurface: 'rgba(255, 255, 255, 0.94)',
        cardBorder: 'rgba(15, 23, 42, 0.12)',
        accentPrimary: userBrandDna?.accentColor || '#0284C7',
        accentSecondary: '#6366F1',
        textPrimary: '#0F172A',
        textMuted: '#64748B'
      },
      cardGeometry,
      backgroundPattern,
      defaultSpeakerLayout,
      chartVariant,
      animationCurve: 'smooth_editorial'
    };
  }

  if (isNeon) {
    return {
      themeMode: 'neon_high_contrast',
      palette: {
        backgroundPrimary: '#05050A',
        backgroundSecondary: '#0E0919',
        cardSurface: 'rgba(15, 10, 25, 0.95)',
        cardBorder: 'rgba(0, 242, 234, 0.5)',
        accentPrimary: userBrandDna?.accentColor || '#00F2EA',
        accentSecondary: '#FF007F',
        textPrimary: '#FFFFFF',
        textMuted: '#94A3B8'
      },
      cardGeometry: 'hud_tech',
      backgroundPattern: 'tech_grid',
      defaultSpeakerLayout,
      chartVariant,
      animationCurve: 'snappy_spring'
    };
  }

  if (isLuxury) {
    return {
      themeMode: 'dark',
      palette: {
        backgroundPrimary: '#0A110D',
        backgroundSecondary: '#050806',
        cardSurface: 'rgba(10, 17, 13, 0.94)',
        cardBorder: 'rgba(212, 175, 55, 0.45)',
        accentPrimary: userBrandDna?.accentColor || '#D4AF37',
        accentSecondary: '#F59E0B',
        textPrimary: '#F8FAFC',
        textMuted: '#94A3B8'
      },
      cardGeometry: 'rounded_modern',
      backgroundPattern: 'diagonal_mesh',
      defaultSpeakerLayout,
      chartVariant,
      animationCurve: 'smooth_editorial'
    };
  }

  if (isHormozi) {
    return {
      themeMode: 'dark',
      palette: {
        backgroundPrimary: '#09090B',
        backgroundSecondary: '#18181B',
        cardSurface: 'rgba(24, 24, 27, 0.96)',
        cardBorder: 'rgba(250, 204, 21, 0.6)',
        accentPrimary: userBrandDna?.accentColor || '#FACC15',
        accentSecondary: '#22D3EE',
        textPrimary: '#FFFFFF',
        textMuted: '#A1A1AA'
      },
      cardGeometry: 'sharp_brutalist',
      backgroundPattern: 'aurora_ring',
      defaultSpeakerLayout: 'split_top_bottom',
      chartVariant,
      animationCurve: 'kinetic_bounce'
    };
  }

  // Default: Minimal Expert Dark with random pattern & seed accents
  const baseStyle = resolveUserBrandStyle(presetKey, userBrandDna);
  return {
    themeMode: 'glass_translucent',
    palette: {
      backgroundPrimary: baseStyle.colors.background,
      backgroundSecondary: '#030712',
      cardSurface: baseStyle.colors.cardBg,
      cardBorder: baseStyle.colors.cardBorder,
      accentPrimary: baseStyle.colors.accent,
      accentSecondary: baseStyle.colors.secondary,
      textPrimary: baseStyle.colors.text,
      textMuted: '#94A3B8'
    },
    cardGeometry,
    backgroundPattern,
    defaultSpeakerLayout,
    chartVariant,
    animationCurve: 'snappy_spring'
  };
}
