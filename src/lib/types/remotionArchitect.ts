export type CameraCutAction =
  | 'micro_zoom'
  | 'punch_zoom'
  | 'scale_to_circle'
  | 'move_left'
  | 'full_screen'
  | 'pip_right'
  | 'split_screen';

export interface CameraCut {
  startTime: string;       // "MM:SS.SS" or seconds string
  startFrame: number;     // Calculated frame (startTimeSec * fps)
  duration: number;        // Seconds
  durationFrames: number; // duration * fps
  action: CameraCutAction;
  targetScale?: number;    // e.g. 1.03 for micro-zoom, 1.12 for punch-zoom
}

export type BRollElementType =
  | 'chart'
  | '3d_icon'
  | 'list'
  | 'tweet_card'
  | 'kinetic_quote'
  | 'stat_callout';

export interface BRollElementProps {
  title?: string;
  subtitle?: string;
  items?: string[];
  values?: number[];
  labels?: string[];
  iconName?: string;
  author?: string;
  handle?: string;
  avatarUrl?: string;
  text?: string;
  quote?: string;
  statValue?: string;
  statLabel?: string;
}

export interface BRollElement {
  id: string;
  type: BRollElementType;
  startTime: string;
  endTime: string;
  startFrame: number;
  endFrame: number;
  visualSeed: number;     // 0-100 for procedural jitter, angles, entrance vectors
  props: BRollElementProps;
}

export interface SoundCue {
  frame: number;
  timeSec: number;
  type: 'whoosh' | 'pop' | 'click' | 'glitch' | 'rise';
}

export interface SemanticBeat {
  startFrame: number;
  endFrame: number;
  emotion: string;
  pacing: 'fast' | 'normal' | 'slow';
  isHook: boolean;
  punchWords: string[];
}

export interface UserBrandDnaConfig {
  accentColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  subtitleTextColor?: string;
  subtitleBgColor?: string;
  stylePreset?: string;
  niche?: string;
}

export interface RemotionArchitectSettings {
  presetKey?: string;
  stylePreset?: string;
  globalJitter?: number;  // 0.1 - 0.5
  fps?: number;           // default 30
  userBrandDna?: UserBrandDnaConfig;
  anticipationOffsetFrames?: number; // default -4 (150ms)
}

export interface QaDiagnostics {
  provider: 'groq' | 'gemini' | 'openai' | 'procedural';
  passed: boolean;
  score: number;
  attempts: number;
  issues: string[];
  generationTimeMs: number;
}

export interface RemotionArchitectCutSheet {
  cameraCuts: CameraCut[];
  bRollElements: BRollElement[];
  renderSettings: RemotionArchitectSettings;
  soundCues?: SoundCue[];
  semanticBeats?: SemanticBeat[];
  qaDiagnostics?: QaDiagnostics;
}
