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
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume().catch(() => {});
  }
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
  await videoEl.play().catch((err) => console.warn('[RemotionExporter] videoEl.play warning:', err));

  let currentFrame = 0;
  let lastTime = -1;
  let sameTimeFrameCount = 0;
  const startTime = Date.now();
  const maxDurationMs = (durationSec + 5) * 1000;

  const cameraCuts = cutSheet?.cameraCuts || [];
  const bRollElements = cutSheet?.bRollElements || [];

  await new Promise<void>((resolve) => {
    const renderLoop = () => {
      const currentTime = videoEl.currentTime;
      currentFrame = Math.round(currentTime * fps);

      // Track stalling (currentTime not advancing near the end)
      if (currentTime === lastTime) {
        sameTimeFrameCount++;
      } else {
        sameTimeFrameCount = 0;
        lastTime = currentTime;
      }

      const isEnded = videoEl.ended;
      const isTimeEnded = currentTime >= (durationSec - 0.15);
      const isFrameEnded = currentFrame >= (totalFrames - 1);
      const isStalledNearEnd = sameTimeFrameCount > 15 && (currentTime >= durationSec * 0.85 || currentFrame >= totalFrames - 5);
      const isTimeout = (Date.now() - startTime) > maxDurationMs;

      if (isEnded || isTimeEnded || isFrameEnded || isStalledNearEnd || isTimeout) {
        log('Рендеринг завершен, финализация медиапотока...', 96);
        if (recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch (e) {
            console.warn('[RemotionExporter] recorder.stop error:', e);
          }
        }
        try {
          videoEl.pause();
        } catch (e) {}
        try {
          audioCtx.close().catch(() => {});
        } catch (e) {}
        resolve();
        return;
      }

      // 1. Fill background with sleek dark slate gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Camera Cuts Transformation for Speaker Video
      const activeCut = cameraCuts.find(
        (c) => currentFrame >= c.startFrame && currentFrame < c.startFrame + c.durationFrames
      );

      ctx.save();
      if (activeCut) {
        const cutElapsed = currentFrame - activeCut.startFrame;
        const animProgress = Math.min(1, Math.max(0, cutElapsed / 10)); // smooth 10-frame transition
        const ease = 1 - Math.pow(1 - animProgress, 3); // Ease-out cubic

        if (activeCut.action === 'scale_to_circle') {
          const targetScale = 0.5 * ease + 1.0 * (1 - ease);
          const targetX = (canvas.width * 0.28) * ease;
          const targetY = (canvas.height * 0.5) * ease + (canvas.height * 0.5) * (1 - ease);
          const radius = Math.min(canvas.width, canvas.height) * 0.22 * ease;

          if (radius > 5) {
            ctx.beginPath();
            ctx.arc(targetX, targetY, radius, 0, Math.PI * 2);
            ctx.clip();

            // Glow border around speaker circle
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#a855f7';
            ctx.stroke();
          }

          const vidW = canvas.width * targetScale;
          const vidH = canvas.height * targetScale;
          ctx.drawImage(videoEl, targetX - vidW / 2, targetY - vidH / 2, vidW, vidH);

        } else if (activeCut.action === 'move_left') {
          const targetScale = 0.75 * ease + 1.0 * (1 - ease);
          const targetX = (-canvas.width * 0.15) * ease;
          
          const vidW = canvas.width * targetScale;
          const vidH = canvas.height * targetScale;
          const vidY = (canvas.height - vidH) / 2;

          ctx.drawImage(videoEl, targetX, vidY, vidW, vidH);

        } else if (activeCut.action === 'pip_right') {
          const pipW = canvas.width * 0.4;
          const pipH = canvas.height * 0.4;
          const pipX = canvas.width - pipW - 30;
          const pipY = canvas.height - pipH - 40;

          // Draw full video or PiP box
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

          ctx.lineWidth = 4;
          ctx.strokeStyle = '#38bdf8';
          ctx.strokeRect(pipX, pipY, pipW, pipH);
        } else {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        }
      } else {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      }
      ctx.restore();

      // 3. Render Active Infographic Remotion Elements
      const activeElements = bRollElements.filter(
        (e) => currentFrame >= e.startFrame && currentFrame <= e.endFrame
      );

      for (const elem of activeElements) {
        const elemElapsed = currentFrame - elem.startFrame;
        const elemAnim = Math.min(1, Math.max(0, elemElapsed / 8));
        const scaleAnim = 0.8 + 0.2 * elemAnim;
        const opacityAnim = elemAnim;

        ctx.save();
        ctx.globalAlpha = opacityAnim;

        if (elem.type === 'chart') {
          // Glassmorphic Chart Overlay Card (Right side)
          const cardX = canvas.width * 0.48;
          const cardY = canvas.height * 0.25;
          const cardW = canvas.width * 0.46;
          const cardH = 340;

          ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
          ctx.scale(scaleAnim, scaleAnim);
          ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

          // Card BG
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
          ctx.lineWidth = 2;
          ctx.roundRect(cardX, cardY, cardW, cardH, 20);
          ctx.fill();
          ctx.stroke();

          // Title
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText(elem.props.title || 'Рост вовлеченности', cardX + 20, cardY + 40);

          // Bar Chart
          const values: number[] = elem.props.values || [40, 65, 80, 95];
          const barWidth = (cardW - 40 - (values.length - 1) * 12) / values.length;
          const maxBarH = 200;

          values.forEach((val, idx) => {
            const barProgress = Math.min(1, Math.max(0, (elemElapsed - idx * 2) / 10));
            const barH = (val / 100) * maxBarH * barProgress;
            const bx = cardX + 20 + idx * (barWidth + 12);
            const by = cardY + cardH - 30 - barH;

            const barGrad = ctx.createLinearGradient(bx, by, bx, by + barH);
            barGrad.addColorStop(0, '#38bdf8');
            barGrad.addColorStop(1, '#8b5cf6');
            ctx.fillStyle = barGrad;
            ctx.roundRect(bx, by, barWidth, barH, 8);
            ctx.fill();

            // Label
            ctx.fillStyle = '#cbd5e1';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`${val}%`, bx + barWidth / 4, by - 6);
          });

        } else if (elem.type === 'tweet_card') {
          // Tweet Card Overlay (Top Center)
          const cardX = canvas.width * 0.1;
          const cardY = canvas.height * 0.15;
          const cardW = canvas.width * 0.8;
          const cardH = 200;

          ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
          ctx.scale(scaleAnim, scaleAnim);
          ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 2;
          ctx.roundRect(cardX, cardY, cardW, cardH, 24);
          ctx.fill();
          ctx.stroke();

          // Author
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText(elem.props.author || 'Virali AI Strategist', cardX + 24, cardY + 45);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '16px sans-serif';
          ctx.fillText(elem.props.handle || '@virali_ai', cardX + 24, cardY + 75);

          // Tweet Body
          ctx.fillStyle = '#f1f5f9';
          ctx.font = '18px sans-serif';
          const tweetText = elem.props.text || 'High retention AI video scaling engine active.';
          ctx.fillText(tweetText.substring(0, 70), cardX + 24, cardY + 125);

        } else if (elem.type === 'list') {
          // Bullet List Overlay (Right Center)
          const cardX = canvas.width * 0.45;
          const cardY = canvas.height * 0.3;
          const cardW = canvas.width * 0.5;
          const items: string[] = elem.props.items || ['Высокая динамика', 'Инфографика', 'Рост Retention'];

          items.forEach((item, idx) => {
            const itemProgress = Math.min(1, Math.max(0, (elemElapsed - idx * 3) / 8));
            const iy = cardY + idx * 75;
            const ix = cardX + (1 - itemProgress) * 40;

            ctx.fillStyle = 'rgba(30, 41, 59, 0.92)';
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
            ctx.lineWidth = 2;
            ctx.roundRect(ix, iy, cardW, 60, 16);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#a855f7';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText('✓', ix + 16, iy + 38);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px sans-serif';
            ctx.fillText(item, ix + 48, iy + 38);
          });
        }
        ctx.restore();
      }

      const displayedFrame = Math.min(currentFrame, totalFrames);
      const progress = Math.min(95, 55 + Math.round((displayedFrame / totalFrames) * 40));
      log(`Рендеринг кадра ${displayedFrame}/${totalFrames}...`, progress);

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
      const d = video.duration;
      if (d && isFinite(d) && d > 0) {
        resolve(d);
      } else {
        resolve(15);
      }
    };
    video.onerror = () => resolve(15);
  });
}
