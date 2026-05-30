/**
 * ffmpeg-audio.ts
 * Client-side audio extraction using FFmpeg.wasm (single-thread).
 * Converts any video (HEVC/MOV/MP4/WebM) to a tiny 16kHz mono MP3.
 *
 * CRITICAL: No static imports of @ffmpeg/ffmpeg or @ffmpeg/util.
 * Use runtimeImport (new Function trick) so bundlers never try to bundle
 * these packages — they contain unbundleable dynamic Worker patterns.
 */

// eslint-disable-next-line no-new-func
const runtimeImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;

let ffmpegInstance: any | null = null;
let loadPromise: Promise<boolean> | null = null;

const CORE_BASE = '/ffmpeg';

/** Singleton — loads FFmpeg WASM once, reuses instance */
async function getFFmpeg(): Promise<any> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const base = typeof globalThis !== 'undefined' && (globalThis as any).window ? (globalThis as any).window.location.origin : '';
        const localFFmpeg = `${base}/ffmpeg/ffmpeg-esm/index.js`;
        const localUtil = `${base}/ffmpeg/util-esm/index.js`;

        const { FFmpeg } = await runtimeImport(localFFmpeg);
        const { toBlobURL } = await runtimeImport(localUtil);
        const ff = new FFmpeg();
        
        const coreURL = await toBlobURL(`${base}${CORE_BASE}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${base}${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm');

        // Helper function to race loading against a timeout
        const loadWithTimeout = (inst: any, config: any, ms: number) => {
          return Promise.race([
            inst.load(config),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`FFmpeg load timed out after ${ms}ms`)), ms)
            )
          ]);
        };

        try {
          console.log('[FFmpeg Audio] Attempting to load from local assets via safe Blob URLs...');
          const coreURL = await toBlobURL(`${base}${CORE_BASE}/ffmpeg-core.js`, 'text/javascript');
          const wasmURL = await toBlobURL(`${base}${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm');
          const workerURL = await toBlobURL(`${base}/ffmpeg/ffmpeg-esm/worker.js`, 'text/javascript');
          
          await loadWithTimeout(ff, { 
            coreURL, 
            wasmURL,
            classWorkerURL: workerURL
          }, 45000);
          console.log('[FFmpeg Audio] Loaded successfully from local assets via Blob URLs');
        } catch (localErr) {
          console.warn('[FFmpeg Audio] Local load failed, attempting resilient CDN fallback...', localErr);
          // Fallback to resilient UMD core CDN URLs
          const cdnCore = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js';
          const cdnWasm = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm';
          
          const cdnCoreURL = await toBlobURL(cdnCore, 'text/javascript');
          const cdnWasmURL = await toBlobURL(cdnWasm, 'application/wasm');
          
          await loadWithTimeout(ff, { 
            coreURL: cdnCoreURL, 
            wasmURL: cdnWasmURL,
          }, 45000);
          console.log('[FFmpeg Audio] Loaded successfully from CDN fallback');
        }
        ffmpegInstance = ff;
        return true;
      } catch (err) {
        console.error('[FFmpeg Audio] Load failed, resetting promise:', err);
        loadPromise = null;
        ffmpegInstance = null;
        throw err;
      }
    })();
  }

  await loadPromise;
  return ffmpegInstance!;
}

export interface ExtractAudioOptions {
  onProgress?: (message: string) => void;
}

/**
 * Extracts audio from any video Blob using FFmpeg.wasm.
 * Returns a compact MP3 Blob (~240KB for 60 seconds).
 * Returns null if FFmpeg fails (caller should fall back to raw file).
 */
export async function extractAudioFFmpeg(
  videoBlob: Blob,
  options: ExtractAudioOptions = {}
): Promise<Blob | null> {
  const { onProgress } = options;

  try {
    onProgress?.('Загрузка аудио-движка...');
    const ff = await getFFmpeg();

    ff.on('log', ({ message }: { message: string }) => {
      console.log(`[FFmpeg Log] ${message}`);
    });

    if (videoBlob.size === 0) {
      throw new Error('Input video blob is empty');
    }

    const mime = videoBlob.type || 'video/mp4';
    let inputExt = 'mp4';
    if (mime.includes('quicktime') || mime.includes('mov')) inputExt = 'mov';
    else if (mime.includes('webm')) inputExt = 'webm';
    else if (mime.includes('mkv')) inputExt = 'mkv';
    else if (mime.includes('avi')) inputExt = 'avi';
    const inputName  = `input.${inputExt}`;
    const outputName = 'output.mp3';

    onProgress?.('Анализ видео (на устройстве)...');

    let buffer: ArrayBuffer | null = await videoBlob.arrayBuffer();
    await ff.writeFile(inputName, new Uint8Array(buffer));
    buffer = null; // Free memory immediately

    onProgress?.('Извлечение аудио...');
    const result = await ff.exec([
      '-y', '-i', inputName,
      '-vn', '-ar', '16000', '-ac', '1', '-b:a', '32k', '-f', 'mp3',
      outputName,
    ]);

    if (result !== 0) {
      throw new Error(`FFmpeg failed with exit code ${result}`);
    }

    const data = await ff.readFile(outputName);
    if (!data || data.length === 0) {
      throw new Error('FFmpeg produced an empty file');
    }

    const mp3Blob = new Blob([data as any], { type: 'audio/mpeg' });

    await ff.deleteFile(inputName).catch(() => {});
    await ff.deleteFile(outputName).catch(() => {});

    console.log(
      `[FFmpeg] Audio extracted: ${(videoBlob.size / 1024 / 1024).toFixed(1)}MB → ` +
      `${(mp3Blob.size / 1024).toFixed(0)}KB`
    );

    return mp3Blob;
  } catch (err: any) {
    console.error('[FFmpeg] Extraction failed:', err.message);
    return null;
  }
}
