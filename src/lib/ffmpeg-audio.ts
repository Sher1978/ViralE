/**
 * ffmpeg-audio.ts
 * Client-side audio extraction using FFmpeg.wasm (single-thread).
 * Converts any video (HEVC/MOV/MP4/WebM) to a tiny 16kHz mono MP3.
 * Works on iOS Safari, Android Chrome, Desktop.
 */
// import { FFmpeg } from '@ffmpeg/ffmpeg';
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

    // Detect input extension from MIME
    const mime = videoBlob.type || 'video/mp4';
    const inputExt = mime.includes('quicktime') || mime.includes('mov') ? 'mov'
                   : mime.includes('webm') ? 'webm'
                   : 'mp4';
    const inputName  = `input.${inputExt}`;
    const outputName = 'output.mp3';

    onProgress?.('Анализ видео (на устройстве)...');
    await ff.writeFile(inputName, await (window as any)._fetchFile(videoBlob));

    onProgress?.('Извлечение аудио...');
    await ff.exec([
      '-i', inputName,
      '-vn',          // no video
      '-ar', '16000', // 16kHz sample rate (optimal for speech AI)
      '-ac', '1',     // mono
      '-b:a', '32k',  // 32 kbps — tiny file, perfect speech quality
      '-f', 'mp3',
      outputName,
    ]);

    const data = await ff.readFile(outputName);
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
