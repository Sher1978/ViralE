/**
 * ffmpeg-delivery.ts
 * Global FFmpeg singleton for video rendering pipeline.
 *
 * CRITICAL: No static imports of @ffmpeg/ffmpeg or @ffmpeg/util here.
 * Both Turbopack and webpack fail to bundle @ffmpeg/ffmpeg because it
 * uses `new Worker(new URL(classWorkerURL, import.meta.url))` with a
 * variable URL and `await import(_coreURL)` inside worker.js.
 *
 * Solution: Use `new Function('return import(m)')` which is opaque to
 * ALL bundlers — neither webpack nor Turbopack will try to statically
 * analyze or bundle the imported module.
 */

// eslint-disable-next-line no-new-func
const runtimeImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;

let ffmpeg: any | null = null;
let loadPromise: Promise<any> | null = null;

/**
 * Global singleton for FFmpeg to prevent multiple WASM initializations.
 * This is CRITICAL for mobile (iOS/Safari) memory management.
 */
export async function getFFmpeg(): Promise<any> {
  if (ffmpeg?.loaded) return ffmpeg;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const { FFmpeg } = await runtimeImport('https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/esm/index.js');
      const instance = new FFmpeg();
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const localCore = `${base}/ffmpeg/ffmpeg-core.js`;
      const localWasm = `${base}/ffmpeg/ffmpeg-core.wasm`;

      const cdnBase = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      const cdnCore = `${cdnBase}/ffmpeg-core.js`;
      const cdnWasm = `${cdnBase}/ffmpeg-core.wasm`;

      try {
        await instance.load({ coreURL: localCore, wasmURL: localWasm });
        console.log('[FFmpeg] Loaded from local assets');
        ffmpeg = instance;
        return instance;
      } catch (e) {
        console.warn('[FFmpeg] Local load failed, falling back to CDN:', e);
        const cdnInstance = new FFmpeg();
        await cdnInstance.load({ coreURL: cdnCore, wasmURL: cdnWasm });
        console.log('[FFmpeg] Loaded from CDN');
        ffmpeg = cdnInstance;
        return cdnInstance;
      }
    } catch (err) {
      console.error('[FFmpeg] Initialization failed, resetting for retry:', err);
      loadPromise = null;
      throw err;
    }
  })();

  return loadPromise;
}

/**
 * Returns the `fetchFile` utility from @ffmpeg/util loaded at runtime.
 * Use this instead of `import { fetchFile } from '@ffmpeg/util'`.
 */
export async function getFetchFile(): Promise<(input: string | Blob | ArrayBuffer | Uint8Array) => Promise<Uint8Array>> {
  const { fetchFile } = await runtimeImport('https://unpkg.com/@ffmpeg/util@0.12.2/dist/esm/index.js');
  return fetchFile;
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
