import React from 'react';
import { DynamicThemeConfig } from '@/lib/types/remotionArchitect';

export interface ResolvedThemeStyles {
  cardStyle: React.CSSProperties;
  accentGradient: string;
  accentPrimary: string;
  accentSecondary: string;
  textPrimary: string;
  textMuted: string;
  cardSurface: string;
  cardBorder: string;
  fontFamily: string;
  headerTransform: 'uppercase' | 'none';
  borderRadius: string;
  isNeon: boolean;
  isLight: boolean;
}

export function getThemeCardStyles(theme?: DynamicThemeConfig): ResolvedThemeStyles {
  const geom = theme?.cardGeometry || 'rounded_modern';
  const isNeon = theme?.themeMode === 'neon_high_contrast';
  const isLight = theme?.themeMode === 'light';

  let borderRadius = '24px';
  let defaultBorder = '1px solid rgba(255, 255, 255, 0.15)';

  if (geom === 'sharp_brutalist') {
    borderRadius = '0px';
    defaultBorder = `2px solid ${theme?.palette?.cardBorder || theme?.palette?.accentPrimary || '#FACC15'}`;
  } else if (geom === 'hud_tech') {
    borderRadius = '10px';
    defaultBorder = `1.5px solid ${theme?.palette?.cardBorder || 'rgba(0, 242, 234, 0.5)'}`;
  } else if (geom === 'pill_soft') {
    borderRadius = '40px';
    defaultBorder = `1px solid ${theme?.palette?.cardBorder || 'rgba(255, 255, 255, 0.14)'}`;
  } else if (geom === 'minimal_borderless') {
    borderRadius = '20px';
    defaultBorder = 'none';
  } else {
    // rounded_modern
    borderRadius = '24px';
    defaultBorder = `1px solid ${theme?.palette?.cardBorder || 'rgba(255, 255, 255, 0.15)'}`;
  }

  const fontFamily = theme?.typography?.fontFamily || (geom === 'hud_tech' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif');
  const headerTransform = theme?.typography?.headerTransform || (geom === 'sharp_brutalist' ? 'uppercase' : 'none');

  const cardSurface = theme?.palette?.cardSurface || (isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.92)');
  const cardBorder = theme?.palette?.cardBorder || (isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.15)');
  const accentPrimary = theme?.palette?.accentPrimary || '#8B5CF6';
  const accentSecondary = theme?.palette?.accentSecondary || '#06B6D4';
  const textPrimary = theme?.palette?.textPrimary || (isLight ? '#0F172A' : '#FFFFFF');
  const textMuted = theme?.palette?.textMuted || (isLight ? '#64748B' : '#94A3B8');

  const shadow = isNeon
    ? `0 20px 50px rgba(0,0,0,0.85), 0 0 25px ${accentPrimary}44`
    : isLight
    ? '0 20px 45px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
    : '0 25px 60px rgba(0, 0, 0, 0.75)';

  const cardStyle: React.CSSProperties = {
    backgroundColor: cardSurface,
    border: defaultBorder,
    borderRadius,
    fontFamily,
    boxShadow: shadow,
    color: textPrimary
  };

  const accentGradient = `linear-gradient(135deg, ${accentPrimary}, ${accentSecondary})`;

  return {
    cardStyle,
    accentGradient,
    accentPrimary,
    accentSecondary,
    textPrimary,
    textMuted,
    cardSurface,
    cardBorder,
    fontFamily,
    headerTransform,
    borderRadius,
    isNeon,
    isLight
  };
}
