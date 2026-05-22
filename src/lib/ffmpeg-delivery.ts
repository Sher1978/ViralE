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

      // Helper function to race loading against a timeout to prevent hanging on mobile/slow networks
      const loadWithTimeout = (inst: any, config: any, ms: number) => {
        return Promise.race([
          inst.load(config),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`FFmpeg load timed out after ${ms}ms`)), ms)
          )
        ]);
      };

      try {
        console.log('[FFmpeg] Attempting to load from local assets with 6s timeout...');
        await loadWithTimeout(instance, { coreURL: localCore, wasmURL: localWasm }, 6000);
        console.log('[FFmpeg] Loaded successfully from local assets');
        ffmpeg = instance;
        return instance;
      } catch (e) {
        console.warn('[FFmpeg] Local load failed or timed out, falling back to CDN. Error:', e);
        try {
          instance.terminate();
        } catch (err) {}

        const cdnInstance = new FFmpeg();
        try {
          console.log('[FFmpeg] Attempting to load from CDN with 10s timeout...');
          await loadWithTimeout(cdnInstance, { coreURL: cdnCore, wasmURL: cdnWasm }, 10000);
          console.log('[FFmpeg] Loaded successfully from CDN');
          ffmpeg = cdnInstance;
          return cdnInstance;
        } catch (cdnErr) {
          console.error('[FFmpeg] CDN load also failed or timed out. Error:', cdnErr);
          try {
            cdnInstance.terminate();
          } catch (err) {}
          throw cdnErr;
        }
      }
    } catch (err) {
      console.error('[FFmpeg] Critical initialization failure, resetting singleton:', err);
      loadPromise = null;
      ffmpeg = null;
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
