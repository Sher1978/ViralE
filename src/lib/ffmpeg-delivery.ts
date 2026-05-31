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
      const base = typeof globalThis !== 'undefined' && (globalThis as any).window ? (globalThis as any).window.location.origin : '';
      const localFFmpeg = `${base}/ffmpeg/ffmpeg-esm/index.js`;
      const localUtil = `${base}/ffmpeg/util-esm/index.js`;

      const { FFmpeg } = await runtimeImport(localFFmpeg);
      const { toBlobURL } = await runtimeImport(localUtil);
      const instance = new FFmpeg();

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
        console.log('[FFmpeg] Attempting to load from local assets via safe Blob URLs...');
        const coreURL = await toBlobURL(`${base}/ffmpeg/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${base}/ffmpeg/ffmpeg-core.wasm`, 'application/wasm');
        const workerURL = await toBlobURL(`${base}/ffmpeg/ffmpeg-esm/worker.js`, 'text/javascript');
        
        await loadWithTimeout(instance, { 
          coreURL, 
          wasmURL,
          classWorkerURL: workerURL
        }, 45000);
        console.log('[FFmpeg] Loaded successfully from local assets via Blob URLs');
      } catch (localErr) {
        console.warn('[FFmpeg] Local load failed, attempting resilient CDN fallback...', localErr);
        // Fallback to resilient UMD core CDN URLs
        const cdnCore = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js';
        const cdnWasm = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm';
        
        const cdnCoreURL = await toBlobURL(cdnCore, 'text/javascript');
        const cdnWasmURL = await toBlobURL(cdnWasm, 'application/wasm');
        
        await loadWithTimeout(instance, { 
          coreURL: cdnCoreURL, 
          wasmURL: cdnWasmURL,
        }, 45000);
        console.log('[FFmpeg] Loaded successfully from CDN fallback');
      }
      ffmpeg = instance;
      return instance;
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
  const base = typeof globalThis !== 'undefined' && (globalThis as any).window ? (globalThis as any).window.location.origin : '';
  const localUtil = `${base}/ffmpeg/util-esm/index.js`;
  const { fetchFile } = await runtimeImport(localUtil);
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
