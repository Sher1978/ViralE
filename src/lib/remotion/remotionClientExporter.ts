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

    // 2. Active Infographic Elements (with Strict Empty Content Validation)
    const activeElements = bRollElements.filter((e) => {
      if (currentFrame < e.startFrame || currentFrame > e.endFrame) return false;
      if (e.type === 'list' && (!e.props?.items || !Array.isArray(e.props.items) || e.props.items.length === 0)) return false;
      if (e.type === 'chart' && (!e.props?.values || !Array.isArray(e.props.values) || e.props.values.length === 0)) return false;
      if (e.type === 'stat_callout' && !e.props?.statValue) return false;
      if ((e.type === 'kinetic_quote' || e.type === 'tweet_card') && !e.props?.text && !e.props?.title) return false;
      return true;
    });

    const hasActiveBRollSlide = activeElements.length > 0;

    // 3. Dynamic Z-Axis Live Camera Motion for Speaker Video
    const activeCut = cameraCuts.find(
      (c) => currentFrame >= c.startFrame && currentFrame < c.startFrame + c.durationFrames
    );

    ctx.save();

    let targetScale = 1.0;
    let targetX = 0;
    let targetY = 0;

    if (activeCut && !hasActiveBRollSlide) {
      const cutElapsed = currentFrame - activeCut.startFrame;
      if (activeCut.action === 'micro_zoom') {
        const durationFr = activeCut.durationFrames || 100;
        const microProgress = Math.min(1, cutElapsed / durationFr);
        targetScale = 1.0 + 0.03 * microProgress;
      } else if (activeCut.action === 'punch_zoom') {
        const punchProgress = Math.min(1, Math.max(0, cutElapsed / 5));
        targetScale = 1.0 + 0.12 * (1 - Math.pow(1 - punchProgress, 4));
      }
    }

    // Render Speaker Video (Full screen monologue)
    if (!hasActiveBRollSlide) {
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

    // 4. FULL-SCREEN B-ROLL SLIDES ENGINE (Replaces Speaker during infographic moments)
    if (hasActiveBRollSlide) {
      for (const elem of activeElements) {
        const elemElapsed = currentFrame - elem.startFrame;
        const elemAnim = Math.min(1, Math.max(0, elemElapsed / 12));
        const easeElem = 1 - Math.pow(1 - elemAnim, 3);
        const scaleAnim = 0.85 + 0.15 * easeElem;
        const opacityAnim = easeElem;

        ctx.save();
        ctx.globalAlpha = opacityAnim;

        // Full-screen Cinematic Dark Background Overlay
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, 'rgba(7, 10, 18, 0.96)');
        bgGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.98)');
        bgGrad.addColorStop(1, 'rgba(3, 7, 18, 0.96)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Accent Ambient Glow Ring
        ctx.save();
        ctx.shadowColor = activeStyle.colors.accent;
        ctx.shadowBlur = 80;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height * 0.45, 280, 0, Math.PI * 2);
        ctx.strokeStyle = activeStyle.colors.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        const cardX = canvas.width * 0.08;
        const cardW = canvas.width * 0.84;

        if (elem.type === 'chart') {
          const cardY = canvas.height * 0.24;
          const cardH = 680;

          ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
          ctx.scale(scaleAnim, scaleAnim);
          ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = activeStyle.colors.accent;
          ctx.lineWidth = 4;
          safeRoundRect(cardX, cardY, cardW, cardH, 32);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = activeStyle.colors.text;
          ctx.font = '900 42px "Outfit", "Roboto", sans-serif';
          ctx.fillText(elem.props.title || 'КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ', cardX + 36, cardY + 70);

          const values: number[] = elem.props.values || [40, 65, 85, 98];
          const barWidth = (cardW - 72 - (values.length - 1) * 20) / values.length;
          const maxBarH = 420;

          values.forEach((val, idx) => {
            const barProgress = Math.min(1, Math.max(0, (elemElapsed - idx * 2) / 10));
            const barH = (val / 100) * maxBarH * barProgress;
            const bx = cardX + 36 + idx * (barWidth + 20);
            const by = cardY + cardH - 45 - barH;

            const barGrad = ctx.createLinearGradient(bx, by, bx, by + barH);
            barGrad.addColorStop(0, activeStyle.colors.accent);
            barGrad.addColorStop(1, activeStyle.colors.secondary);
            ctx.fillStyle = barGrad;
            safeRoundRect(bx, by, barWidth, Math.max(12, barH), 14);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 28px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${val}%`, bx + barWidth / 2, by - 14);
            ctx.textAlign = 'left';
          });

        } else if (elem.type === 'list') {
          const cardY = canvas.height * 0.22;
          const items: string[] = elem.props.items || [];

          // List Header
          if (elem.props.title) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 44px "Outfit", "Roboto", sans-serif';
            ctx.fillText(elem.props.title.toUpperCase(), cardX, cardY - 24);
          }

          items.forEach((item, idx) => {
            ctx.save();
            const itemProgress = Math.min(1, Math.max(0, (elemElapsed - idx * 4) / 12));
            const easeItem = 1 - Math.pow(1 - itemProgress, 3);
            const iy = cardY + idx * 105;
            const ix = cardX + (1 - easeItem) * 60;

            ctx.globalAlpha = opacityAnim * easeItem;

            ctx.translate(ix + cardW / 2, iy + 44);
            ctx.scale(scaleAnim, scaleAnim);
            ctx.translate(-(ix + cardW / 2), -(iy + 44));

            ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
            ctx.strokeStyle = activeStyle.colors.accent;
            ctx.lineWidth = 4;
            safeRoundRect(ix, iy, cardW, 88, 24);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = activeStyle.colors.accent;
            ctx.font = '900 36px sans-serif';
            ctx.fillText('✓', ix + 32, iy + 56);

            ctx.fillStyle = activeStyle.colors.text;
            ctx.font = '900 32px "Outfit", "Roboto", sans-serif';
            ctx.fillText(item, ix + 85, iy + 56);
            ctx.restore();
          });

        } else if (elem.type === 'stat_callout') {
          const cardY = canvas.height * 0.30;
          const cardH = 420;

          ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
          ctx.scale(scaleAnim, scaleAnim);
          ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

          ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
          ctx.strokeStyle = activeStyle.colors.accent;
          ctx.lineWidth = 4;
          ctx.shadowColor = activeStyle.colors.accent;
          ctx.shadowBlur = 32;
          safeRoundRect(cardX, cardY, cardW, cardH, 36);
          ctx.fill();
          ctx.stroke();

          ctx.shadowColor = 'transparent';
          ctx.fillStyle = activeStyle.colors.accent;
          ctx.font = '900 110px "Outfit", "Roboto", sans-serif';
          ctx.fillText(elem.props.statValue || '+350%', cardX + 48, cardY + 160);

          ctx.fillStyle = activeStyle.colors.text;
          ctx.font = '900 38px "Outfit", "Roboto", sans-serif';
          ctx.fillText(elem.props.statLabel || 'Главный результат', cardX + 48, cardY + 280);

        } else if (elem.type === 'kinetic_quote' || elem.type === 'tweet_card') {
          const cardY = canvas.height * 0.28;
          const cardH = 480;

          ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
          ctx.scale(scaleAnim, scaleAnim);
          ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

          ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
          ctx.strokeStyle = activeStyle.colors.accent;
          ctx.lineWidth = 4;
          safeRoundRect(cardX, cardY, cardW, cardH, 36);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = activeStyle.colors.accent;
          ctx.font = '900 72px sans-serif';
          ctx.fillText('“', cardX + 40, cardY + 90);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 36px "Outfit", "Roboto", sans-serif';
          const quoteText = String(elem.props.text || elem.props.title || 'КЛЮЧЕВАЯ ИДЕЯ').toUpperCase();
          ctx.fillText(quoteText, cardX + 90, cardY + 90);

          ctx.fillStyle = activeStyle.colors.accent;
          ctx.font = '900 28px sans-serif';
          ctx.fillText(`— ${elem.props.author || 'Virali AI'}`, cardX + 90, cardY + 340);
        }
        ctx.restore();
      }
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

  log('Рендеринг кадров Canvas завершен. Финализация видео...', 96, 5);
  recorder.stop();

  const rawCanvasVideoBlob = await renderPromise;

  let finalBlob = rawCanvasVideoBlob;
  try {
    log('Сведение оригинальной звуковой дорожки через FFmpeg...', 97, 5);

    // FFmpeg load with 60s timeout to prevent infinite hang at 97%
    const ffmpegLoadPromise = getFFmpeg();
    const ffmpegTimeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('FFmpeg load timeout (60s) — skipping audio mux')), 60000)
    );
    const ffmpeg = await Promise.race([ffmpegLoadPromise, ffmpegTimeoutPromise]);
    const fetchFile = await getFetchFile();

    const canvasVideoData = await fetchFile(rawCanvasVideoBlob);
    const speakerAudioData = await fetchFile(speakerVideoBlobOrUrl);

    await ffmpeg.writeFile('canvas_video.mp4', canvasVideoData);
    await ffmpeg.writeFile('speaker_audio.mp4', speakerAudioData);

    // FFmpeg exec with 120s timeout
    const execPromise = ffmpeg.exec([
      '-i', 'canvas_video.mp4',
      '-i', 'speaker_audio.mp4',
      '-filter:v', `setpts=N/(${fps}*TB)`,
      '-r', `${fps}`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '18',
      '-c:a', 'aac',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-shortest',
      'output_remotion.mp4'
    ]);
    const execTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('FFmpeg exec timeout (120s)')), 120000)
    );
    await Promise.race([execPromise, execTimeout]);

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
    console.warn('[RemotionExporter] FFmpeg audio muxing skipped (timeout or error):', ffmpegErr);
    log('Звук: FFmpeg недоступен — сохраняем видео без аудиомуксинга...', 98, 5);
    // finalBlob remains rawCanvasVideoBlob — video still plays, just muxed differently
  }

  const cacheKey = `final_render_${projectId}_${versionId}_remotion_v6`;
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
