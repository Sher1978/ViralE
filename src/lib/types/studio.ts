export type SegmentType = 'intro_avatar' | 'outro_avatar' | 'animated_still' | 'broll' | 'transition' | 'user_recording';
export type AvatarProvider = 'heygen' | 'higgsfield';
export type AnimationStyle = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'glitch' | 'none';

export interface TimelineOverlay {
  id: string;
  type: 'broll' | 'subtitle' | 'whiteboard';
  startTime: number;
  duration: number;
  content: string; // URL for broll, Text for subtitle
  style?: any;
  speed?: number; // Speed factor multiplier (e.g. 1.0, 1.25, 0.8)
}

export interface SceneSegment {
  id: string;
  type: SegmentType;
  scriptText: string;
  duration?: number;
  assetUrl?: string; // URL of generated video/image
  voiceUrl?: string; // URL of the voiceover for this segment
  prompt: string;    // Prompt used for generation
  animationStyle?: AnimationStyle;
  overlayBroll?: string; // Optional B-roll URL
  status: 'pending' | 'rendering' | 'completed' | 'failed' | 'error';
  
  // Multi-provider support
  provider?: AvatarProvider;
  avatarId?: string;
  modelId?: string; // e.g. 'kling-3.0', 'nano-banana'
  refinementPrompt?: string;
  
  // B-roll Cycling
  brollSuggestions?: string[]; // Array of URLs from Giphy/Mixkit
  currentBrollIndex?: number;
  captionStyle?: string; // e.g. 'minimal', 'pop', 'bold'
  wordTimings?: WordToken[]; // Karaoke word-level timestamps
}

export interface WordToken {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

export interface DistributionAssets {
  instagram?: {
    caption: string;
    carouselPrompts: string[];
    carouselUrls?: string[];
  };
  facebook?: {
    caption: string;
  };
  youtube?: {
    description: string;
    thumbnailPrompt: string;
    thumbnailUrl?: string;
  };
  lastGenerated?: number;
}

export interface ProductionManifest {
  version: string;
  projectId: string;
  versionId: string;
  segments: SceneSegment[];
  brollClips?: TimelineOverlay[];    // NEW: Independent B-rolls
  subtitleClips?: TimelineOverlay[]; // NEW: Independent Subtitles
  whiteboardClips?: TimelineOverlay[]; // NEW: Whiteboard animations
  videoUrl?: string;
  transcript?: any[]; 
  totalDuration: number;
  customScript?: string;
  useCustomScript?: boolean;
  distributionAssets?: DistributionAssets;
  config: {
    resolution: string;
    fps: number;
    musicUrl?: string;
    musicVolume: number;
    defaultProvider?: AvatarProvider;
    aRollSpeed?: number;
  };
}
