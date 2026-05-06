/**
 * ffmpeg-audio.ts
 * Client-side audio extraction using FFmpeg.wasm (single-thread).
 * Converts any video (HEVC/MOV/MP4/WebM) to a tiny 16kHz mono MP3.
 * Works on iOS Safari, Android Chrome, Desktop.
 */
import type { FFmpeg } from '@ffmpeg/ffmpeg';
// import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<boolean> | null = null;

const CORE_BASE = '/ffmpeg';

/** Singleton — loads FFmpeg WASM once, reuses instance */
async function getFFmpeg(): Promise<any> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  if (!loadPromise) {
    // 🔥 Dynamic imports inside singleton
    const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
      import('@ffmpeg/ffmpeg'),
      import('@ffmpeg/util')
    ]);

    const ff = new FFmpeg();
    loadPromise = ff.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`,   'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    await loadPromise;
    ffmpegInstance = ff;
    (window as any)._fetchFile = fetchFile; // Store for reuse
  } else {
    await loadPromise;
  }

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
    
    // Add logging to catch errors in browser console
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
    
    // 🔥 Memory optimization: Read as ArrayBuffer and immediately convert to Uint8Array
    let buffer: ArrayBuffer | null = await videoBlob.arrayBuffer();
    await ff.writeFile(inputName, new Uint8Array(buffer));
    
    // 🔥 CRITICAL: Nullify buffer immediately to free memory for WASM heap
    buffer = null;

    onProgress?.('Извлечение аудио...');
    const result = await ff.exec([
      '-y',           // Overwrite if exists
      '-i', inputName,
      '-vn',          // no video
      '-ar', '16000', // 16kHz sample rate (optimal for speech AI)
      '-ac', '1',     // mono
      '-b:a', '32k',  // 32 kbps — tiny file, perfect speech quality
      '-f', 'mp3',
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

    // Cleanup FFmpeg virtual FS
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
