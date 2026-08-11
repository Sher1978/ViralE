export type CameraCutAction = 'scale_to_circle' | 'move_left' | 'full_screen' | 'pip_right';

export interface CameraCut {
  startTime: string;       // "MM:SS.SS" или секунды в строке "1.5"
  startFrame: number;     // Вычисленный фрейм (startTimeSec * fps)
  duration: number;        // Секунды
  durationFrames: number; // duration * fps
  action: CameraCutAction;
}

export type BRollElementType = 'chart' | '3d_icon' | 'list' | 'tweet_card';

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
}

export interface BRollElement {
  id: string;
  type: BRollElementType;
  startTime: string;      // "MM:SS.SS" или секунды
  endTime: string;        // "MM:SS.SS" или секунды
  startFrame: number;
  endFrame: number;
  visualSeed: number;     // 0-100 для процедуры рандомизации теней, наклонов и пружин
  props: BRollElementProps;
}

export interface RemotionArchitectSettings {
  preset?: string;
  globalJitter?: number;  // 0.1 - 0.5
  fps?: number;           // default 30
}

export interface RemotionArchitectCutSheet {
  cameraCuts: CameraCut[];
  bRollElements: BRollElement[];
  renderSettings: RemotionArchitectSettings;
}
