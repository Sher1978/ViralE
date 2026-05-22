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
        const { FFmpeg } = await runtimeImport('https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/esm/index.js');
        const { toBlobURL } = await runtimeImport('https://unpkg.com/@ffmpeg/util@0.12.2/dist/esm/index.js');
        const ff = new FFmpeg();
        
        const coreURL = await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm');

        // Helper function to race loading against a timeout
        const loadWithTimeout = (inst: any, config: any, ms: number) => {
          return Promise.race([
            inst.load(config),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`FFmpeg load timed out after ${ms}ms`)), ms)
            )
          ]);
        };

        console.log('[FFmpeg Audio] Loading FFmpeg WASM with 6s timeout...');
        await loadWithTimeout(ff, { coreURL, wasmURL }, 6000);
        console.log('[FFmpeg Audio] Loaded successfully');
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
