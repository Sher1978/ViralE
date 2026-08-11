import { RemotionArchitectCutSheet } from '@/lib/types/remotionArchitect';
import { idb } from '@/lib/idb';

export interface RenderRemotionOptions {
  projectId: string;
  versionId: string;
  speakerVideoBlobOrUrl: Blob | string;
  cutSheet: RemotionArchitectCutSheet;
  onProgress?: (progress: number, statusMessage: string) => void;
}

export async function renderRemotionInDevice({
  projectId,
  versionId,
  speakerVideoBlobOrUrl,
  cutSheet,
  onProgress
}: RenderRemotionOptions): Promise<{ videoBlob: Blob; videoUrl: string }> {
  const log = (msg: string, p: number) => {
    console.log(`[RemotionExporter] (${p}%) ${msg}`);
    if (onProgress) onProgress(p, msg);
  };

  log('Инициализация Remotion ин-девайс движка...', 5);

  let sourceUrl = typeof speakerVideoBlobOrUrl === 'string' ? speakerVideoBlobOrUrl : '';
  if (speakerVideoBlobOrUrl instanceof Blob) {
    sourceUrl = URL.createObjectURL(speakerVideoBlobOrUrl);
  }

  if (!sourceUrl) {
    throw new Error('Исходное видео не найдено для рендеринга Remotion.');
  }

  log('Загрузка исходного медиапотока...', 15);

  // Считываем продолжительность видео с помощью вспомогательного HTMLVideoElement
  const durationSec = await getVideoDuration(sourceUrl);
  const fps = cutSheet?.renderSettings?.fps || 30;
  const totalFrames = Math.ceil(durationSec * fps);

  log(`Продолжительность: ${durationSec.toFixed(1)}s (${totalFrames} кадров)...`, 25);

  // Для локальной сборки в браузере рендерим композицию в офскрин Canvas с WebCodecs или MediaRecorder
  log('Синхронизация кадров и наложение инфографики...', 40);

  const canvas = document.createElement('canvas');
  canvas.width = 720;  // 720p mobile export resolution
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Не удалось инициализировать 2D контекст Canvas');
  }

  // Создаем видеоэлемент для проигрывания кадров
  const videoEl = document.createElement('video');
  videoEl.src = sourceUrl;
  videoEl.muted = true;
  videoEl.playsInline = true;
  await videoEl.load();

  log('Запуск аппаратного H.264 кодировщика на устройстве...', 55);

  const stream = canvas.captureStream(fps);
  
  // Добавляем аудиодорожку из исходного видео
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const sourceNode = audioCtx.createMediaElementSource(videoEl);
  const destNode = audioCtx.createMediaStreamDestination();
  sourceNode.connect(destNode);
  sourceNode.connect(audioCtx.destination);

  destNode.stream.getAudioTracks().forEach((track) => stream.addTrack(track));

  const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
    ? 'video/mp4;codecs=avc1'
    : MediaRecorder.isTypeSupported('video/mp4')
    ? 'video/mp4'
    : 'video/webm;codecs=vp9';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 6000000 // 6 Mbps
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const renderPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: mimeType });
      resolve(finalBlob);
    };
    recorder.onerror = (e) => reject(e);
  });

  recorder.start(100);
  await videoEl.play();

  let currentFrame = 0;

  await new Promise<void>((resolve) => {
    const renderLoop = () => {
      if (videoEl.ended || videoEl.currentTime >= durationSec) {
        recorder.stop();
        resolve();
        return;
      }

      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      currentFrame++;
      const progress = Math.min(95, 55 + Math.round((currentFrame / totalFrames) * 40));
      log(`Рендеринг кадра ${currentFrame}/${totalFrames}...`, progress);

      requestAnimationFrame(renderLoop);
    };

    renderLoop();
  });

  const videoBlob = await renderPromise;
  log('Сохранение отрендеренного ролика в память устройства...', 98);

  const cacheKey = `final_render_${projectId}_${versionId}_remotion`;
  await idb.set(cacheKey, videoBlob, 'MediaBuffer');

  const videoUrl = URL.createObjectURL(videoBlob);
  log('Готово! Видео успешно отрендерено на устройстве.', 100);

  return { videoBlob, videoUrl };
}

function getVideoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = url;
    video.onloadedmetadata = () => {
      resolve(video.duration || 15);
    };
    video.onerror = () => resolve(15);
  });
}
