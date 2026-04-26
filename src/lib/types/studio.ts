export type SegmentType = 'intro_avatar' | 'outro_avatar' | 'animated_still' | 'broll' | 'transition' | 'user_recording';
export type AvatarProvider = 'heygen' | 'higgsfield';
export type AnimationStyle = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'glitch' | 'none';

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
}

export interface ProductionManifest {
  version: string;
  projectId: string;
  versionId: string;
  segments: SceneSegment[];
  videoUrl?: string;
  totalDuration: number;
  config: {
    resolution: string;
    fps: number;
    musicUrl?: string;
    musicVolume: number;
    defaultProvider?: AvatarProvider;
  };
}
