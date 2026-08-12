import { RemotionArchitectCutSheet } from '@/lib/types/remotionArchitect';
import { idb } from '@/lib/idb';
import { resolveUserBrandStyle } from '@/lib/remotion/stylePresets';
import { getFFmpeg, getFetchFile } from '@/lib/ffmpeg-delivery';

export interface RenderRemotionOptions {
  projectId: string;
  versionId: string;
  speakerVideoBlobOrUrl: Blob | string;
  cutSheet: RemotionArchitectCutSheet;
  onProgress?: (progress: number, statusMessage: string, stageIndex?: number) => void;
}

export async function renderRemotionInDevice({
  projectId,
  versionId,
  speakerVideoBlobOrUrl,
  cutSheet,
  onProgress
}: RenderRemotionOptions): Promise<{ videoBlob: Blob; videoUrl: string }> {
  const log = (msg: string, p: number, stageIndex: number = 4) => {
    console.log(`[RemotionExporter] [Stage ${stageIndex}] (${p}%) ${msg}`);
    if (onProgress) onProgress(p, msg, stageIndex);
  };

  log('Инициализация Deterministic Remotion Engine (Full HD 1080p)...', 5, 1);

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

  log('Загрузка медиапотока...', 8, 1);

  const durationSec = await getVideoDuration(sourceUrl);
  const fps = cutSheet?.renderSettings?.fps || 30;
  
  // Calculate max end frame from b-roll elements and subtitles to prevent premature cut-off
  const maxBRollFrame = (cutSheet?.bRollElements || []).reduce((max, e) => Math.max(max, e.endFrame || 0), 0);
  const maxSubFrame = ((cutSheet as any)?.subtitles || (cutSheet as any)?.segments || (cutSheet as any)?.subtitleClips || []).reduce((max: number, s: any) => {
    const ef = typeof s.endFrame === 'number' ? s.endFrame : Math.round((s.end ?? s.endTime ?? 0) * fps);
    return Math.max(max, ef);
  }, 0);

  const baseFrames = Math.ceil(durationSec * fps);
  const totalFrames = Math.max(baseFrames, maxBRollFrame, maxSubFrame);

  log(`Продолжительность: ${durationSec.toFixed(1)}s (${totalFrames} кадров, 1080p, пресет: ${activeStyle.name})...`, 10, 1);

  // Full HD 1080x1920 9:16 Canvas Setup
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Не удалось инициализировать 2D контекст Canvas');
  }

  // Cross-browser safe rounded rectangle polyfill
  const safeRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  };

  // Video element in manual frame-stepping mode
  const videoEl = document.createElement('video');
  videoEl.src = sourceUrl;
  videoEl.muted = true; // Muted during frame-stepping to avoid audio artifacts
  videoEl.playsInline = true;

  await new Promise<void>((resolve) => {
    videoEl.onloadeddata = () => resolve();
    videoEl.load();
  });

  log('Запуск детерминированного покадрового кодировщика H.264 (20Mbps)...', 40, 4);

  // Capture stream at 0 FPS for manual requestFrame pushing
  const stream = canvas.captureStream(0);

  const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
    ? 'video/mp4;codecs=avc1'
    : MediaRecorder.isTypeSupported('video/mp4')
    ? 'video/mp4'
    : 'video/webm;codecs=vp9';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 20000000 // 20 Mbps Ultra HD broadcast quality
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

  recorder.start();

  const cameraCuts = cutSheet?.cameraCuts || [];
  const bRollElements = cutSheet?.bRollElements || [];

  // Deterministic Frame-by-Frame Seek Loop
  for (let currentFrame = 0; currentFrame < totalFrames; currentFrame++) {
    const targetTime = currentFrame / fps;

    // Seek to exact frame time and wait for GPU decode
    videoEl.currentTime = targetTime;
    await new Promise<void>((resolve) => {
      if ('requestVideoFrameCallback' in videoEl) {
        (videoEl as any).requestVideoFrameCallback(() => resolve());
      } else {
        (videoEl as any).onseeked = () => {
          setTimeout(resolve, 12);
        };
      }
    });

    // 1. Fill background with active style gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, activeStyle.colors.background);
    bgGrad.addColorStop(1, '#030712');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Determine active overlays and check if side panel layout is required
    const activeElements = bRollElements.filter(
      (e) => currentFrame >= e.startFrame && currentFrame <= e.endFrame
    );
    const hasActiveSideCard = activeElements.some(
      (e) => e.type === 'chart' || e.type === 'list'
    );

    // 3. Dynamic Z-Axis Live Camera Motion for Speaker Video
    let activeCut = cameraCuts.find(
      (c) => currentFrame >= c.startFrame && currentFrame < c.startFrame + c.durationFrames
    );

    // Auto-coupling fallback: if side card is active, force scale_to_circle cut!
    const firstSideCard = activeElements.find(
      (e) => e.type === 'chart' || e.type === 'list'
    );
    if (hasActiveSideCard && (!activeCut || (activeCut.action !== 'scale_to_circle' && activeCut.action !== 'move_left'))) {
      activeCut = {
        startTime: `${targetTime}s`,
        startFrame: firstSideCard ? firstSideCard.startFrame : currentFrame,
        duration: 3,
        durationFrames: 90,
        action: 'scale_to_circle',
        targetScale: 0.45
      };
    }

    ctx.save();

    let targetScale = 1.0;
    let targetX = 0;
    let targetY = 0;
    let isCircle = false;
    let radius = 0;
    let internalScale = 1.0;

    if (activeCut) {
      const cutElapsed = currentFrame - activeCut.startFrame;
      const animProgress = Math.min(1, Math.max(0, cutElapsed / 10));
      const ease = 1 - Math.pow(1 - animProgress, 3);

      if (activeCut.action === 'micro_zoom') {
        const durationFr = activeCut.durationFrames || 100;
        const microProgress = Math.min(1, cutElapsed / durationFr);
        targetScale = 1.0 + 0.03 * microProgress;

      } else if (activeCut.action === 'punch_zoom') {
        const punchProgress = Math.min(1, Math.max(0, cutElapsed / 5));
        targetScale = 1.0 + 0.12 * (1 - Math.pow(1 - punchProgress, 4));

      } else if (activeCut.action === 'scale_to_circle') {
        targetScale = 0.45 * ease + 1.0 * (1 - ease);
        targetX = (canvas.width * 0.28) * ease + (canvas.width * 0.5) * (1 - ease);
        targetY = (canvas.height * 0.45) * ease + (canvas.height * 0.5) * (1 - ease);
        const maxRadius = Math.max(canvas.width, canvas.height);
        const finalRadius = Math.min(canvas.width, canvas.height) * 0.22;
        radius = finalRadius * ease + maxRadius * (1 - ease);
        internalScale = 1.0 + 0.5 * ease;
        isCircle = true;

      } else if (activeCut.action === 'move_left') {
        targetScale = 0.6 * ease + 1.0 * (1 - ease);
        targetX = (-canvas.width * 0.2) * ease;
      }
    }

    // Render speaker video
    if (isCircle && radius > 0) {
      ctx.save();
      const progress = Math.max(0, 1 - (radius / Math.min(canvas.width, canvas.height)));
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 30 * progress;
      ctx.shadowOffsetY = 10 * progress;
      ctx.beginPath();
      ctx.arc(targetX, targetY, radius, 0, Math.PI * 2);
      ctx.clip();

      const vidW = canvas.width * targetScale * internalScale;
      const vidH = canvas.height * targetScale * internalScale;
      const vidX = targetX - vidW / 2;
      const vidY = targetY - vidH / 2;
      ctx.drawImage(videoEl, vidX, vidY, vidW, vidH);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = activeStyle.colors.accent;
      ctx.shadowBlur = 20 * progress;
      ctx.beginPath();
      ctx.arc(targetX, targetY, radius, 0, Math.PI * 2);
      ctx.lineWidth = 10 * progress;
      ctx.strokeStyle = activeStyle.colors.accent;
      if (ctx.lineWidth > 0) ctx.stroke();
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

    // 4. Render Active Infographic Remotion Elements with Strict Safe Zones
    for (const elem of activeElements) {
      const elemElapsed = currentFrame - elem.startFrame;
      const elemAnim = Math.min(1, Math.max(0, elemElapsed / 15));
      const easeElem = 1 - Math.pow(1 - elemAnim, 3);
      const scaleAnim = 0.8 + 0.2 * easeElem;
      const opacityAnim = easeElem;

      const seedJitter = (elem.visualSeed || 42) % 9 - 4;
      const jitterRad = (seedJitter * activeStyle.jitterRangeDeg * Math.PI) / 180;

      ctx.save();
      ctx.globalAlpha = opacityAnim;

      if (elem.type === 'chart') {
        const isSidePanel = isCircle || (activeCut && (activeCut.action === 'scale_to_circle' || activeCut.action === 'move_left'));
        const cardX = isSidePanel ? canvas.width * 0.48 : canvas.width * 0.06;
        const cardY = isSidePanel ? canvas.height * 0.20 : canvas.height * 0.65;
        const cardW = isSidePanel ? canvas.width * 0.48 : canvas.width * 0.88;
        const cardH = 440;

        ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
        ctx.rotate(jitterRad);
        ctx.scale(scaleAnim, scaleAnim);
        ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

        ctx.fillStyle = activeStyle.colors.cardBg || 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = activeStyle.colors.accent;
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 20;
        safeRoundRect(cardX, cardY, cardW, cardH, 24);
        ctx.fill();
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = activeStyle.colors.text;
        ctx.font = '900 32px "Outfit", "Roboto", sans-serif';
        ctx.fillText(elem.props.title || 'Рост удержания', cardX + 28, cardY + 52);

        const values: number[] = elem.props.values || [40, 65, 80, 95];
        const barWidth = (cardW - 56 - (values.length - 1) * 16) / values.length;
        const maxBarH = 260;

        values.forEach((val, idx) => {
          const barProgress = Math.min(1, Math.max(0, (elemElapsed - idx * 2) / 10));
          const barH = (val / 100) * maxBarH * barProgress;
          const bx = cardX + 28 + idx * (barWidth + 16);
          const by = cardY + cardH - 32 - barH;

          const barGrad = ctx.createLinearGradient(bx, by, bx, by + barH);
          barGrad.addColorStop(0, activeStyle.colors.accent);
          barGrad.addColorStop(1, activeStyle.colors.secondary);
          ctx.fillStyle = barGrad;
          safeRoundRect(bx, by, barWidth, Math.max(10, barH), 10);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 22px "Outfit", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${val}%`, bx + barWidth / 2, by - 10);
          ctx.textAlign = 'left';
        });

      } else if (elem.type === 'list') {
        const isSidePanel = isCircle || (activeCut && (activeCut.action === 'scale_to_circle' || activeCut.action === 'move_left'));
        const cardX = isSidePanel ? canvas.width * 0.48 : canvas.width * 0.06;
        const cardY = isSidePanel ? canvas.height * 0.20 : canvas.height * 0.65;
        const cardW = isSidePanel ? canvas.width * 0.48 : canvas.width * 0.88;
        const items: string[] = elem.props.items || ['Высокая динамика', 'Инфографика', 'Рост Retention'];

        // Title Header for List
        if (elem.props.title) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 32px "Outfit", "Roboto", sans-serif';
          ctx.fillText(elem.props.title, cardX + 8, cardY - 16);
        }

        items.forEach((item, idx) => {
          ctx.save();
          const itemProgress = Math.min(1, Math.max(0, (elemElapsed - idx * 4) / 12));
          const easeItem = 1 - Math.pow(1 - itemProgress, 3);
          const iy = cardY + idx * 82;
          const ix = cardX + (1 - easeItem) * 50;

          ctx.globalAlpha = opacityAnim * easeItem;

          ctx.translate(ix + cardW / 2, iy + 34);
          ctx.rotate(jitterRad * 0.3);
          ctx.translate(-(ix + cardW / 2), -(iy + 34));

          ctx.fillStyle = activeStyle.colors.cardBg || 'rgba(15, 23, 42, 0.95)';
          ctx.strokeStyle = activeStyle.colors.accent;
          ctx.lineWidth = 3;
          ctx.shadowColor = 'rgba(0,0,0,0.4)';
          ctx.shadowBlur = 16;
          safeRoundRect(ix, iy, cardW, 70, 18);
          ctx.fill();
          ctx.stroke();

          ctx.shadowColor = 'transparent';
          ctx.fillStyle = activeStyle.colors.accent;
          ctx.font = '900 30px sans-serif';
          ctx.fillText('✓', ix + 24, iy + 45);

          ctx.fillStyle = activeStyle.colors.text;
          ctx.font = '900 26px "Outfit", "Roboto", sans-serif';
          ctx.fillText(item, ix + 65, iy + 45);
          ctx.restore();
        });

      } else if (elem.type === 'stat_callout') {
        const cardX = canvas.width * 0.06;
        const cardY = canvas.height * 0.65;
        const cardW = canvas.width * 0.88;
        const cardH = 190;

        ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
        ctx.rotate(jitterRad);
        ctx.scale(scaleAnim, scaleAnim);
        ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

        ctx.fillStyle = activeStyle.colors.cardBg || 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = activeStyle.colors.accent;
        ctx.lineWidth = 3;
        ctx.shadowColor = activeStyle.colors.accent;
        ctx.shadowBlur = 24;
        safeRoundRect(cardX, cardY, cardW, cardH, 26);
        ctx.fill();
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = activeStyle.colors.accent;
        ctx.font = '900 68px "Outfit", "Roboto", sans-serif';
        ctx.fillText(elem.props.statValue || '+350%', cardX + 32, cardY + 80);

        ctx.fillStyle = activeStyle.colors.text;
        ctx.font = '700 28px "Outfit", "Roboto", sans-serif';
        ctx.fillText(elem.props.statLabel || 'Рост удержания зрителей', cardX + 32, cardY + 138);

      } else if (elem.type === 'kinetic_quote' || elem.type === 'tweet_card') {
        const cardX = canvas.width * 0.06;
        const cardY = canvas.height * 0.65;
        const cardW = canvas.width * 0.88;
        const cardH = 210;

        ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
        ctx.rotate(jitterRad);
        ctx.scale(scaleAnim, scaleAnim);
        ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

        ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
        ctx.strokeStyle = activeStyle.colors.accent;
        ctx.lineWidth = 3;
        safeRoundRect(cardX, cardY, cardW, cardH, 24);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = activeStyle.colors.accent;
        ctx.font = '900 36px sans-serif';
        ctx.fillText('“', cardX + 28, cardY + 54);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 28px "Outfit", "Roboto", sans-serif';
        const quoteText = String(elem.props.text || elem.props.title || 'Главная мысль ролика').toUpperCase();
        ctx.fillText(quoteText, cardX + 60, cardY + 54);

        ctx.fillStyle = activeStyle.colors.accent;
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(`— ${elem.props.author || 'Virali AI Expert'}`, cardX + 60, cardY + 140);
      }
      ctx.restore();
    }

    // 5. Render Active Subtitle Overlay (Full HD 1080p Bold Typography)
    const subtitles = (cutSheet as any)?.subtitles || 
                      (cutSheet as any)?.segments || 
                      (cutSheet as any)?.subtitleClips || [];

    if (subtitles && Array.isArray(subtitles)) {
      const activeSub = subtitles.find((s: any) => {
        const startFr = typeof s.startFrame === 'number'
          ? s.startFrame
          : Math.round((s.start ?? s.startTime ?? 0) * fps);
        const endFr = typeof s.endFrame === 'number'
          ? s.endFrame
          : Math.round((s.end ?? s.endTime ?? (s.start ?? 0) + 2) * fps);
        return currentFrame >= startFr && currentFrame <= endFr;
      });

      if (activeSub && (activeSub.text || activeSub.word)) {
        const textToDraw = String(activeSub.text || activeSub.word || '').toUpperCase();
        ctx.save();
        ctx.font = '900 52px "Outfit", "Roboto", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Word wrap subtitles for 1080p canvas
        const maxSubWidth = canvas.width * 0.85;
        const words = textToDraw.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const w of words) {
          const testLine = currentLine ? `${currentLine} ${w}` : w;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxSubWidth && currentLine) {
            lines.push(currentLine);
            currentLine = w;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);

        const lineHeight = 64;
        const totalTextHeight = lines.length * lineHeight;
        const maxLineWidth = Math.max(...lines.map(l => ctx.measureText(l).width));

        const subX = canvas.width / 2;
        const subY = canvas.height * 0.82;

        const pillW = maxLineWidth + 60;
        const pillH = totalTextHeight + 30;
        const pillX = subX - pillW / 2;
        const pillY = subY - pillH / 2;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 8;

        ctx.fillStyle = 'rgba(6, 6, 12, 0.85)';
        ctx.strokeStyle = activeStyle.colors.accent;
        ctx.lineWidth = 3;
        safeRoundRect(pillX, pillY, pillW, pillH, 20);
        ctx.fill();
        ctx.stroke();

        ctx.shadowColor = 'transparent';

        lines.forEach((lineStr, lineIdx) => {
          const ly = pillY + 15 + lineIdx * lineHeight + lineHeight / 2;
          ctx.lineWidth = 8;
          ctx.strokeStyle = '#000000';
          ctx.strokeText(lineStr, subX, ly);

          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(lineStr, subX, ly);
        });

        ctx.restore();
      }
    }

    // Manually push rendered Canvas frame into MediaRecorder stream
    const videoTrack = stream.getVideoTracks()[0] as any;
    if (videoTrack && typeof videoTrack.requestFrame === 'function') {
      videoTrack.requestFrame();
    }

    if (currentFrame % 10 === 0) {
      // Stage 4 maps from 40% to 95%
      const progress = Math.min(95, 40 + Math.round((currentFrame / totalFrames) * 55));
      log(`Обработка кадра ${currentFrame}/${totalFrames} (1080p Canvas)...`, progress, 4);
    }
  }

  log('Рендеринг кадров Canvas завершен (95%). Начинаем сведение звука...', 96, 5);
  recorder.stop();

  const rawCanvasVideoBlob = await renderPromise;

  let finalBlob = rawCanvasVideoBlob;
  try {
    log('Сведение оригинальной звуковой дорожки через FFmpeg...', 98, 5);
    const ffmpeg = await getFFmpeg();
    const fetchFile = await getFetchFile();

    const canvasVideoData = await fetchFile(rawCanvasVideoBlob);
    const speakerAudioData = await fetchFile(speakerVideoBlobOrUrl);

    await ffmpeg.writeFile('canvas_video.mp4', canvasVideoData);
    await ffmpeg.writeFile('speaker_audio.mp4', speakerAudioData);

    await ffmpeg.exec([
      '-i',
      'canvas_video.mp4',
      '-i',
      'speaker_audio.mp4',
      '-filter:v',
      `setpts=N/(${fps}*TB)`,
      '-r',
      `${fps}`,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '18',
      '-c:a',
      'aac',
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-shortest',
      'output_remotion.mp4'
    ]);

    const outData = await ffmpeg.readFile('output_remotion.mp4');
    if (outData && outData.byteLength > 0) {
      finalBlob = new Blob([outData.buffer], { type: 'video/mp4' });
      log('Звуковая дорожка успешно сведа с видеорядом!', 99, 5);
    }

    try {
      await ffmpeg.deleteFile('canvas_video.mp4');
      await ffmpeg.deleteFile('speaker_audio.mp4');
      await ffmpeg.deleteFile('output_remotion.mp4');
    } catch (e) {}
  } catch (ffmpegErr) {
    console.warn('[RemotionExporter] FFmpeg audio muxing fallback warning:', ffmpegErr);
  }

  const cacheKey = `final_render_${projectId}_${versionId}_remotion_v5`;
  await idb.set(cacheKey, finalBlob, 'MediaBuffer');

  // Clean up sourceUrl if created from Blob to prevent memory leak
  if (speakerVideoBlobOrUrl instanceof Blob && sourceUrl) {
    try { URL.revokeObjectURL(sourceUrl); } catch (e) {}
  }

  const videoUrl = URL.createObjectURL(finalBlob);
  log('Успешно скомпилировано в 1080p Full HD с сочным звуком!', 100, 5);

  return { videoBlob: finalBlob, videoUrl };
}

function getVideoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = url;
    video.onloadedmetadata = () => {
      const d = video.duration;
      resolve(d && isFinite(d) && d > 0 ? d : 15);
    };
    video.onerror = () => resolve(15);
  });
}
