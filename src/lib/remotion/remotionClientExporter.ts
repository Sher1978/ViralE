import { RemotionArchitectCutSheet } from '@/lib/types/remotionArchitect';
import { idb } from '@/lib/idb';
import { resolveUserBrandStyle } from '@/lib/remotion/stylePresets';

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

  log('Инициализация Remotion AI Cinematic Engine...', 5);

  const activeStyle = resolveUserBrandStyle(
    cutSheet?.renderSettings?.presetKey || cutSheet?.renderSettings?.stylePreset,
    cutSheet?.renderSettings?.userBrandDna
  );

  let sourceUrl = typeof speakerVideoBlobOrUrl === 'string' ? speakerVideoBlobOrUrl : '';
  if (speakerVideoBlobOrUrl instanceof Blob) {
    sourceUrl = URL.createObjectURL(speakerVideoBlobOrUrl);
  }

  if (!sourceUrl) {
    throw new Error('Исходное видео не найдено для рендеринга Remotion.');
  }

  log('Загрузка исходного медиапотока...', 15);

  const durationSec = await getVideoDuration(sourceUrl);
  const fps = cutSheet?.renderSettings?.fps || 30;
  const totalFrames = Math.ceil(durationSec * fps);

  log(`Продолжительность: ${durationSec.toFixed(1)}s (${totalFrames} кадров, пресет: ${activeStyle.name})...`, 25);

  const canvas = document.createElement('canvas');
  canvas.width = 720;  // 720p mobile export resolution
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Не удалось инициализировать 2D контекст Canvas');
  }

  const videoEl = document.createElement('video');
  videoEl.src = sourceUrl;
  videoEl.muted = true;
  videoEl.playsInline = true;
  await videoEl.load();

  log('Запуск аппаратного кодировщика H.264 на устройстве...', 55);

  const stream = canvas.captureStream(fps);
  
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

      if (currentTime === lastTime) {
        sameTimeFrameCount++;
      } else {
        sameTimeFrameCount = 0;
        lastTime = currentTime;
      }

      const isEnded = videoEl.ended;
      const isTimeEnded = currentTime >= durationSec;
      const isFrameEnded = currentFrame >= totalFrames;
      const isStalledNearEnd = sameTimeFrameCount > 60 && currentTime >= (durationSec - 0.05);
      const isTimeout = (Date.now() - startTime) > maxDurationMs;

      if (isEnded || isTimeEnded || isFrameEnded || isStalledNearEnd || isTimeout) {
        log('Рендеринг завершен, финализация медиапотока...', 96);
        setTimeout(() => {
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
        }, 150);
        return;
      }

      // 1. Fill background with active style gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, activeStyle.colors.background);
      bgGrad.addColorStop(1, '#030712');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Dynamic Z-Axis Live Camera Motion for Speaker Video
      const activeCut = cameraCuts.find(
        (c) => currentFrame >= c.startFrame && currentFrame < c.startFrame + c.durationFrames
      );

      ctx.save();

      let targetScale = 1.0;
      let targetX = 0;
      let targetY = 0;
      let isCircle = false;
      let radius = 0;

      if (activeCut) {
        const cutElapsed = currentFrame - activeCut.startFrame;
        const animProgress = Math.min(1, Math.max(0, cutElapsed / 10));
        const ease = 1 - Math.pow(1 - animProgress, 3);

        if (activeCut.action === 'micro_zoom') {
          // Smooth continuous micro-zoom (1.0 -> 1.03) over speaking segment
          const durationFr = activeCut.durationFrames || 100;
          const microProgress = Math.min(1, cutElapsed / durationFr);
          targetScale = 1.0 + 0.03 * microProgress;

        } else if (activeCut.action === 'punch_zoom') {
          // Instant energetic punch zoom (1.12) on hook/punch words
          const punchProgress = Math.min(1, Math.max(0, cutElapsed / 5));
          targetScale = 1.0 + 0.12 * (1 - Math.pow(1 - punchProgress, 4));

        } else if (activeCut.action === 'scale_to_circle') {
          targetScale = 0.5 * ease + 1.0 * (1 - ease);
          targetX = (canvas.width * 0.28) * ease;
          targetY = (canvas.height * 0.45) * ease + (canvas.height * 0.5) * (1 - ease);
          radius = Math.min(canvas.width, canvas.height) * 0.22 * ease;
          isCircle = true;

        } else if (activeCut.action === 'move_left') {
          targetScale = 0.75 * ease + 1.0 * (1 - ease);
          targetX = (-canvas.width * 0.15) * ease;

        } else if (activeCut.action === 'pip_right') {
          const pipW = canvas.width * 0.4;
          const pipH = canvas.height * 0.4;
          const pipX = canvas.width - pipW - 30;
          const pipY = canvas.height - pipH - 40;

          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          ctx.lineWidth = 4;
          ctx.strokeStyle = activeStyle.colors.accent;
          ctx.strokeRect(pipX, pipY, pipW, pipH);
        }
      } else {
        // Default subtle continuous Z-axis breathing micro-zoom
        const phase = (currentFrame / totalFrames) * Math.PI * 2;
        targetScale = 1.0 + 0.015 * Math.sin(phase);
      }

      if (isCircle && radius > 5) {
        // Strictly isolated circular clipping for speaker video only
        ctx.save();
        ctx.beginPath();
        ctx.arc(targetX, targetY, radius, 0, Math.PI * 2);
        ctx.clip();

        const vidW = canvas.width * targetScale;
        const vidH = canvas.height * targetScale;
        const vidX = targetX - vidW / 2;
        const vidY = targetY - vidH / 2;
        ctx.drawImage(videoEl, vidX, vidY, vidW, vidH);
        ctx.restore();

        // Stroke circle border outside clip
        ctx.save();
        ctx.beginPath();
        ctx.arc(targetX, targetY, radius, 0, Math.PI * 2);
        ctx.lineWidth = 6;
        ctx.strokeStyle = activeStyle.colors.accent;
        ctx.stroke();
        ctx.restore();

      } else if (activeCut?.action !== 'pip_right') {
        if (targetX !== 0 || targetY !== 0 || targetScale !== 1.0) {
          const vidW = canvas.width * targetScale;
          const vidH = canvas.height * targetScale;
          const vidX = (canvas.width - vidW) / 2 + targetX;
          const vidY = (canvas.height - vidH) / 2 + targetY;
          ctx.drawImage(videoEl, vidX, vidY, vidW, vidH);
        } else {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        }
      }

      ctx.restore();

      // 3. Render Active Infographic Remotion Elements with Safe Zones & Brand Colors
      const activeElements = bRollElements.filter(
        (e) => currentFrame >= e.startFrame && currentFrame <= e.endFrame
      );

      for (const elem of activeElements) {
        const elemElapsed = currentFrame - elem.startFrame;
        const elemAnim = Math.min(1, Math.max(0, elemElapsed / 8));
        const scaleAnim = 0.8 + 0.2 * elemAnim;
        const opacityAnim = elemAnim;

        // Mathematical Seed Jitter: Angle between -4deg and +4deg
        const seedJitter = (elem.visualSeed || 42) % 9 - 4;
        const jitterRad = (seedJitter * activeStyle.jitterRangeDeg * Math.PI) / 180;

        ctx.save();
        ctx.globalAlpha = opacityAnim;

        if (elem.type === 'chart') {
          // Right side panel if circle cut active, otherwise Bottom Sheet (y = 0.68)
          const isSidePanel = isCircle || (activeCut && (activeCut.action === 'scale_to_circle' || activeCut.action === 'move_left'));
          const cardX = isSidePanel ? canvas.width * 0.48 : canvas.width * 0.06;
          const cardY = isSidePanel ? canvas.height * 0.25 : canvas.height * 0.68;
          const cardW = isSidePanel ? canvas.width * 0.46 : canvas.width * 0.88;
          const cardH = isSidePanel ? 340 : 220;

          ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
          ctx.rotate(jitterRad);
          ctx.scale(scaleAnim, scaleAnim);
          ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

          // Card BG & Glassmorphism stroke using Brandbook colors
          ctx.fillStyle = activeStyle.colors.cardBg;
          ctx.strokeStyle = activeStyle.colors.cardBorder;
          ctx.lineWidth = 2;
          ctx.roundRect(cardX, cardY, cardW, cardH, 20);
          ctx.fill();
          ctx.stroke();

          // Title
          ctx.fillStyle = activeStyle.colors.text;
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText(elem.props.title || 'Рост вовлеченности', cardX + 20, cardY + 36);

          // Bar Chart
          const values: number[] = elem.props.values || [40, 65, 80, 95];
          const barWidth = (cardW - 40 - (values.length - 1) * 12) / values.length;
          const maxBarH = isSidePanel ? 200 : 120;

          values.forEach((val, idx) => {
            const barProgress = Math.min(1, Math.max(0, (elemElapsed - idx * 2) / 10));
            const barH = (val / 100) * maxBarH * barProgress;
            const bx = cardX + 20 + idx * (barWidth + 12);
            const by = cardY + cardH - 24 - barH;

            const barGrad = ctx.createLinearGradient(bx, by, bx, by + barH);
            barGrad.addColorStop(0, activeStyle.colors.accent);
            barGrad.addColorStop(1, activeStyle.colors.secondary);
            ctx.fillStyle = barGrad;
            ctx.roundRect(bx, by, barWidth, barH, 8);
            ctx.fill();

            // Label
            ctx.fillStyle = activeStyle.colors.text;
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`${val}%`, bx + barWidth / 4, by - 6);
          });

        } else if (elem.type === 'tweet_card' || elem.type === 'kinetic_quote') {
          // TOP BANNER (y = 0.05 / 64px top offset - safely above speaker face)
          const cardX = canvas.width * 0.06;
          const cardY = canvas.height * 0.05;
          const cardW = canvas.width * 0.88;
          const cardH = 140;

          ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
          ctx.rotate(jitterRad);
          ctx.scale(scaleAnim, scaleAnim);
          ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

          ctx.fillStyle = activeStyle.colors.cardBg;
          ctx.strokeStyle = activeStyle.colors.cardBorder;
          ctx.lineWidth = 2;
          ctx.roundRect(cardX, cardY, cardW, cardH, 20);
          ctx.fill();
          ctx.stroke();

          // Author / Quote Mark
          ctx.fillStyle = activeStyle.colors.accent;
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText(elem.type === 'kinetic_quote' ? '“' : (elem.props.author || 'Virali AI Strategist'), cardX + 20, cardY + 36);

          ctx.fillStyle = activeStyle.colors.text;
          ctx.font = '14px sans-serif';
          ctx.fillText(elem.props.handle || `@${activeStyle.key}`, cardX + 20, cardY + 60);

          // Body
          ctx.fillStyle = activeStyle.colors.text;
          ctx.font = 'bold 16px sans-serif';
          const bodyText = elem.props.text || elem.props.quote || 'High retention AI video scaling engine active.';
          ctx.fillText(bodyText.substring(0, 80), cardX + 20, cardY + 98);

        } else if (elem.type === 'list') {
          // BOTTOM SHEET (y = 0.68 / 870px top offset - safely below speaker chin)
          const cardX = canvas.width * 0.06;
          const cardY = canvas.height * 0.68;
          const cardW = canvas.width * 0.88;
          const items: string[] = elem.props.items || ['Высокая динамика', 'Инфографика', 'Рост Retention'];

          items.forEach((item, idx) => {
            const itemProgress = Math.min(1, Math.max(0, (elemElapsed - idx * 3) / 8));
            const iy = cardY + idx * 60;
            const ix = cardX + (1 - itemProgress) * 30;

            ctx.translate(ix + cardW / 2, iy + 25);
            ctx.rotate(jitterRad * 0.3);
            ctx.translate(-(ix + cardW / 2), -(iy + 25));

            ctx.fillStyle = activeStyle.colors.cardBg;
            ctx.strokeStyle = activeStyle.colors.cardBorder;
            ctx.lineWidth = 2;
            ctx.roundRect(ix, iy, cardW, 52, 14);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = activeStyle.colors.accent;
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('✓', ix + 16, iy + 33);

            ctx.fillStyle = activeStyle.colors.text;
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(item, ix + 45, iy + 33);
          });
        } else if (elem.type === 'stat_callout') {
          // BOTTOM SHEET (y = 0.68 / 870px top offset - safely below speaker chin)
          const cardX = canvas.width * 0.06;
          const cardY = canvas.height * 0.68;
          const cardW = canvas.width * 0.88;
          const cardH = 150;

          ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
          ctx.rotate(jitterRad);
          ctx.scale(scaleAnim, scaleAnim);
          ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

          ctx.fillStyle = activeStyle.colors.cardBg;
          ctx.strokeStyle = activeStyle.colors.cardBorder;
          ctx.lineWidth = 2;
          ctx.roundRect(cardX, cardY, cardW, cardH, 20);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = activeStyle.colors.accent;
          ctx.font = 'black 36px sans-serif';
          ctx.fillText(elem.props.statValue || '+350%', cardX + 24, cardY + 60);

          ctx.fillStyle = activeStyle.colors.text;
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(elem.props.statLabel || 'Рост удержания', cardX + 24, cardY + 105);
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

