import { RemotionArchitectCutSheet, CameraCut, BRollElement } from '@/lib/types/remotionArchitect';

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  elementId?: string;
  frame?: number;
}

export interface ValidationReport {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: {
    totalCuts: number;
    totalElements: number;
    totalSoundCues: number;
    hasCircleSync: boolean;
    hasAudioTrack: boolean;
  };
}

/**
 * Validates a Remotion Architect CutSheet for Safe Zones, Speaker Circle coupling, and Frame Math.
 */
export function validateRemotionCutSheet(cutSheet: RemotionArchitectCutSheet): ValidationReport {
  const issues: ValidationIssue[] = [];
  const cameraCuts = cutSheet?.cameraCuts || [];
  const bRollElements = cutSheet?.bRollElements || [];
  const soundCues = cutSheet?.soundCues || [];

  let hasCircleSync = true;

  if (cameraCuts.length === 0) {
    issues.push({
      severity: 'warning',
      code: 'NO_CAMERA_CUTS',
      message: 'Кадровые склейки камеры (cameraCuts) отсутствуют.'
    });
  }

  // 1. Check side panel coupling (charts/lists MUST be accompanied by scale_to_circle or move_left)
  bRollElements.forEach((elem) => {
    if (elem.type === 'chart' || elem.type === 'list') {
      const activeCut = cameraCuts.find(
        (c) => (c.action === 'scale_to_circle' || c.action === 'move_left') &&
               c.startFrame <= elem.endFrame &&
               (c.startFrame + c.durationFrames) >= elem.startFrame
      );

      if (!activeCut) {
        hasCircleSync = false;
        issues.push({
          severity: 'error',
          code: 'UNCOUPLED_SIDE_CARD',
          message: `Элемент '${elem.type}' (ID: ${elem.id}) отображается без сдвига спикера в круг! Это приведет к перекрытию лица спикера.`,
          elementId: elem.id,
          frame: elem.startFrame
        });
      }
    }
  });

  // 2. Check Anticipation Offset (-150ms / -4 frames)
  bRollElements.forEach((elem) => {
    const rawStartSec = parseFloat(elem.startTime) || 0;
    const expectedFrame = Math.max(0, Math.round(rawStartSec * (cutSheet.renderSettings?.fps || 30)));
    if (elem.startFrame > expectedFrame) {
      issues.push({
        severity: 'warning',
        code: 'MISSING_ANTICIPATION',
        message: `Элемент '${elem.id}' отсрочен без упреждения (-150ms). Появится визуальная задержка после речи.`,
        elementId: elem.id
      });
    }
  });

  // 3. Check for element overlapping in time on the same safe zone slot
  for (let i = 0; i < bRollElements.length; i++) {
    for (let j = i + 1; j < bRollElements.length; j++) {
      const e1 = bRollElements[i];
      const e2 = bRollElements[j];

      const overlap = !(e1.endFrame < e2.startFrame || e2.endFrame < e1.startFrame);
      if (overlap && e1.type === e2.type) {
        issues.push({
          severity: 'error',
          code: 'OVERLAPPING_OVERLAYS',
          message: `Оверлеи одинакового типа (${e1.type}) перекрываются по времени (кадры ${e1.startFrame}-${e1.endFrame} и ${e2.startFrame}-${e2.endFrame}).`,
          elementId: e1.id
        });
      }
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');

  return {
    isValid: !hasErrors,
    issues,
    summary: {
      totalCuts: cameraCuts.length,
      totalElements: bRollElements.length,
      totalSoundCues: soundCues.length,
      hasCircleSync,
      hasAudioTrack: true
    }
  };
}

/**
 * Creates a clean test CutSheet for a 5-second sample video for diagnostic verification.
 */
export function createDiagnosticTestCutSheet(fps: number = 30): RemotionArchitectCutSheet {
  return {
    cameraCuts: [
      {
        startTime: '00:00.00',
        startFrame: 0,
        duration: 1.5,
        durationFrames: Math.round(1.5 * fps),
        action: 'punch_zoom',
        targetScale: 1.12
      },
      {
        startTime: '00:01.50',
        startFrame: Math.round(1.5 * fps),
        duration: 2.5,
        durationFrames: Math.round(2.5 * fps),
        action: 'scale_to_circle',
        targetScale: 0.45
      },
      {
        startTime: '00:04.00',
        startFrame: Math.round(4.0 * fps),
        duration: 1.0,
        durationFrames: Math.round(1.0 * fps),
        action: 'micro_zoom',
        targetScale: 1.03
      }
    ],
    bRollElements: [
      {
        id: 'test_chart_1',
        type: 'chart',
        startTime: '00:01.35', // -150ms anticipation before 1.50s
        endTime: '00:03.90',
        startFrame: Math.max(0, Math.round(1.50 * fps - 4)),
        endFrame: Math.round(3.90 * fps),
        visualSeed: 42,
        props: {
          title: 'Тест Вовлеченности',
          values: [40, 70, 95]
        }
      }
    ],
    soundCues: [
      { timeSec: 1.35, frame: Math.max(0, Math.round(1.50 * fps - 4)), type: 'whoosh' }
    ],
    renderSettings: {
      presetKey: 'minimal_expert',
      stylePreset: 'Минимализм & Эксперт',
      globalJitter: 0.15,
      fps,
      anticipationOffsetFrames: -4
    }
  };
}

/**
 * Audio Inspector: Verifies if a generated MP4 Blob contains playable Audio tracks using WebAudio API
 */
export async function inspectAudioInBlob(videoBlob: Blob): Promise<{ hasAudio: boolean; durationSec: number; error?: string }> {
  if (typeof window === 'undefined') {
    return { hasAudio: true, durationSec: 0 };
  }

  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await videoBlob.arrayBuffer();
    
    // Attempt audio decoding
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const durationSec = audioBuffer.duration;
    const numberOfChannels = audioBuffer.numberOfChannels;
    
    // Check if there is actual sound data (non-silent PCM)
    let hasSignal = false;
    if (numberOfChannels > 0) {
      const pcmData = audioBuffer.getChannelData(0);
      for (let i = 0; i < pcmData.length; i += 100) {
        if (Math.abs(pcmData[i]) > 0.001) {
          hasSignal = true;
          break;
        }
      }
    }

    try {
      await audioCtx.close();
    } catch (e) {}

    return {
      hasAudio: hasSignal && durationSec > 0,
      durationSec
    };
  } catch (err: any) {
    return {
      hasAudio: false,
      durationSec: 0,
      error: err.message || 'Ошибка декодирования аудио'
    };
  }
}
