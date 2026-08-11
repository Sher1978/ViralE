/**
 * dynamicPrompting.ts
 * Dynamic Prompt Generator with 3D Medium Rotation & Contextual Filtering for Virali AI.
 * Prevents template fatigue by rotating rendering mediums and applying jitter seeds.
 */

export type ArtMedium = 
  | 'glassmorphism_3d' 
  | 'claymation_stopmotion' 
  | 'isometric_line_art' 
  | 'matte_frosted_plastic' 
  | 'holographic_neon_glass';

export interface DynamicPromptConfig {
  presetKey: string;
  keyword: string;
  mediumOverride?: ArtMedium;
}

export const ART_MEDIUM_PROMPTS: Record<ArtMedium, { name: string; promptSuffix: string }> = {
  glassmorphism_3d: {
    name: '3D Glassmorphism',
    promptSuffix: 'rendered in premium 3D frosted glassmorphism, translucent glass layers, soft ambient refraction, 8k octane render'
  },
  claymation_stopmotion: {
    name: 'Claymation Stop-Motion',
    promptSuffix: 'tactile claymation style, handcrafted plasticine texture, soft studio lighting, stop-motion animation aesthetic'
  },
  isometric_line_art: {
    name: 'Isometric 3D Line Art',
    promptSuffix: 'clean isometric 3D vector line art, glowing accent borders, minimalist tech aesthetic, smooth gradient shading'
  },
  matte_frosted_plastic: {
    name: 'Matte Frosted Plastic',
    promptSuffix: 'soft-touch matte plastic 3D model, satin surface finish, subtle drop shadow, sleek industrial design'
  },
  holographic_neon_glass: {
    name: 'Holographic Neon Glass',
    promptSuffix: 'futuristic holographic neon glass, cybernetic glow effects, vibrant edge lighting, 3D metallic accents'
  }
};

const MEDIUM_KEYS: ArtMedium[] = [
  'glassmorphism_3d',
  'claymation_stopmotion',
  'isometric_line_art',
  'matte_frosted_plastic',
  'holographic_neon_glass'
];

/**
 * Deterministically or randomly picks a 3D Art Medium based on index or visual seed
 */
export function getRotatedArtMedium(seed: number = 42): { mediumKey: ArtMedium; details: typeof ART_MEDIUM_PROMPTS[ArtMedium] } {
  const index = Math.abs(seed) % MEDIUM_KEYS.length;
  const mediumKey = MEDIUM_KEYS[index];
  return {
    mediumKey,
    details: ART_MEDIUM_PROMPTS[mediumKey]
  };
}

/**
 * Builds a dynamic asset generation prompt combining Preset Style + Keyword + 3D Medium Rotation
 */
export function buildDynamicAssetPrompt(config: DynamicPromptConfig, visualSeed: number = 42): string {
  const medium = config.mediumOverride 
    ? { mediumKey: config.mediumOverride, details: ART_MEDIUM_PROMPTS[config.mediumOverride] }
    : getRotatedArtMedium(visualSeed);

  return `${config.keyword}, ${medium.details.promptSuffix}, preset style: ${config.presetKey}, high retention viral graphic asset, --no text, distortion, noise`;
}
