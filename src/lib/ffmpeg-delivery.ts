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
      const localCore = `${base}/ffmpeg/ffmpeg-core.js`;
      const localWasm = `${base}/ffmpeg/ffmpeg-core.wasm`;
      
      const cdnBase = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      const cdnCore = `${cdnBase}/ffmpeg-core.js`;
      const cdnWasm = `${cdnBase}/ffmpeg-core.wasm`;
      
      try {
        await instance.load({
          coreURL: localCore,
          wasmURL: localWasm,
        });
        console.log('[FFmpeg] Loaded ESM from local assets directly');
        ffmpeg = instance;
        return instance;
      } catch (e) {
        console.warn('[FFmpeg] Local ESM load failed, falling back to CDN ESM:', e);
        const cdnInstance = new FFmpeg();
        await cdnInstance.load({
          coreURL: cdnCore,
          wasmURL: cdnWasm,
        });
        console.log('[FFmpeg] Loaded ESM from CDN directly');
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
