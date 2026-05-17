import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Global singleton for FFmpeg to prevent multiple WASM initializations.
 * This is CRITICAL for mobile (iOS/Safari) memory management.
 */
export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const instance = new FFmpeg();
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const cdnBase = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      
      try {
        await instance.load({
          coreURL: `${base}/ffmpeg/ffmpeg-core.js`,
          wasmURL: `${base}/ffmpeg/ffmpeg-core.wasm`,
        });
        console.log('[FFmpeg] Loaded from local assets directly');
        ffmpeg = instance;
        return instance;
      } catch (e) {
        console.warn('[FFmpeg] Local direct load failed, instantiating new FFmpeg object for CDN fallback:', e);
        const cdnInstance = new FFmpeg();
        await cdnInstance.load({
          coreURL: await toBlobURL(`${cdnBase}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${cdnBase}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        console.log('[FFmpeg] Loaded from CDN');
        ffmpeg = cdnInstance;
        return cdnInstance;
      }
    } catch (err) {
      console.error('[FFmpeg] Initialization failed globally, resetting promise to allow retry:', err);
      loadPromise = null; // RESET SO NEXT CALL CAN RETRY!
      throw err;
    }
  })();

  return loadPromise;
}


/**
 * Resets FFmpeg instance. Use this if the engine crashes or becomes unresponsive.
 */
export function resetFFmpeg() {
  if (ffmpeg) {
    try {
      ffmpeg.terminate();
    } catch (e) {
      console.warn('[FFmpeg] Error during termination:', e);
    }
  }
  ffmpeg = null;
  loadPromise = null;
}
