'use client';

import { useState } from 'react';
import { useRouter } from '@/navigation';
import { projectService } from '@/lib/services/projectService';
import { renderService } from '@/lib/services/renderService';
import { idb } from '@/lib/idb';
import { ProductionManifest } from '@/lib/types/studio';

export interface UseStudioExportOptions {
  projectId: string;
  locale: string;
  currentVersionId: string | null;
  manifest: ProductionManifest | null;
  setManifest: React.Dispatch<React.SetStateAction<ProductionManifest | null>>;
  lastRecordingUrl: string | null;
  setLastRecordingUrl: React.Dispatch<React.SetStateAction<string | null>>;
  recordedBlobRef: React.MutableRefObject<Blob | null>;
  recordedSize: number | null;
  setRecordedSize: React.Dispatch<React.SetStateAction<number | null>>;
  backgroundMp4Url: string | null;
  addSystemLog: (msg: string) => void;
}

export function useStudioExport({
  projectId,
  locale,
  currentVersionId,
  manifest,
  setManifest,
  lastRecordingUrl,
  setLastRecordingUrl,
  recordedBlobRef,
  recordedSize,
  setRecordedSize,
  backgroundMp4Url,
  addSystemLog
}: UseStudioExportOptions) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // 1. Download raw recorded video with multi-platform sandboxing bypasses
  const downloadRawVideo = async () => {
    if (!lastRecordingUrl) return;

    if (isSharing) {
      addSystemLog('Предотвращение повторного шеринга: операция уже выполняется.');
      return;
    }

    try {
      setIsSharing(true);
      addSystemLog('Запуск скачивания RAW видео...');
      const isTelegram = typeof (globalThis as any).window !== 'undefined' && !!(globalThis as any).Telegram?.WebApp;
      const nav = (globalThis as any).navigator;
      const isMobile = typeof (globalThis as any).navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(nav?.userAgent || '');
      const isiOS = typeof (globalThis as any).navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(nav?.userAgent || '');
      addSystemLog(`Параметры окружения: Мобильный=${isMobile}, iOS=${isiOS}, TelegramWebApp=${isTelegram}`);

      // 1. INSTANT LOCAL DESKTOP DOWNLOAD (0 seconds!)
      if (lastRecordingUrl.startsWith('blob:') && !isMobile && !isTelegram) {
        addSystemLog('Запущено локальное скачивание на ПК из Blob URL...');
        let url = lastRecordingUrl;

        // If the current blob URL is broken or invalid, make a fresh one from IDB!
        try {
          const check = await fetch(lastRecordingUrl, { method: 'HEAD' });
          if (!check.ok) throw new Error("Revoked");
        } catch (e) {
          addSystemLog('Упреждающий шаг: Blob URL аннулирован, восстанавливаем из IDB...');
          const cached = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
          if (cached instanceof Blob) {
            url = URL.createObjectURL(cached);
            addSystemLog(`Создана новая Blob-ссылка: ${url}`);
          }
        }

        addSystemLog('Эмуляция клика по ссылке для скачивания...');
        const doc = (globalThis as any).document;
        if (doc) {
          const a = doc.createElement('a');
          a.href = url;
          a.download = `ViralEngine_Raw_${Date.now()}.webm`;
          doc.body.appendChild(a);
          a.click();
          doc.body.removeChild(a);
        }
        addSystemLog('Запрос на скачивание успешно отправлен браузеру ПК.');
        return;
      }

      // 2. INSTANT LOCAL MOBILE WEB SHARE (0 seconds!)
      if (lastRecordingUrl.startsWith('blob:') && isMobile && !isiOS && typeof globalThis.navigator !== 'undefined' && nav.share) {
        try {
          addSystemLog('Попытка мгновенного шеринга файла через Web Share API...');
          let fileBlob = recordedBlobRef.current;

          // Fallback to IndexedDB (stable) instead of async fetch
          if (!fileBlob) {
            addSystemLog('Упреждающий шаг: recordedBlobRef пуст, достаем оригинал из IndexedDB...');
            const cached = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
            if (cached instanceof Blob) {
              fileBlob = cached;
              recordedBlobRef.current = cached; // Cache back to ref
            }
          }

          if (!fileBlob) {
            throw new Error("Запись не найдена в памяти устройства (IndexedDB)");
          }

          addSystemLog(`Подготовка объекта File. Размер: ${(fileBlob.size / (1024 * 1024)).toFixed(2)} MB. Принудительный тип: video/mp4`);
          const file = new File([fileBlob], `ViralEngine_Raw_${Date.now()}.mp4`, { type: 'video/mp4' });

          if (nav.canShare && nav.canShare({ files: [file] })) {
            addSystemLog('Браузер подтвердил возможность передачи файла. Запуск Share Sheet...');
            await nav.share({
              files: [file],
              title: 'Viral Engine Video',
            });
            addSystemLog('Share Sheet успешно закрыт пользователем.');
            return;
          } else {
            addSystemLog('Браузер сообщил, что не может поделиться этим типом файла.');
          }
        } catch (shareErr: any) {
          addSystemLog(`Локальный Web Share отклонен или завершился ошибкой: ${shareErr.message || shareErr}`);
          console.warn('[useStudioExport] Synchronous mobile share failed, falling back to server-side flow:', shareErr);
        }
      }

      let downloadUrl = lastRecordingUrl;

      // 3. FALLBACK: Upload to Supabase and run normalization (needed for Telegram WebApp or incompatible platforms)
      if (lastRecordingUrl.startsWith('blob:')) {
        try {
          addSystemLog('Локальный шеринг недоступен. Запуск резервного облачного пути...');
          (globalThis as any).alert?.("Подготовка видео для скачивания... Пожалуйста, подождите несколько секунд, пока файл загружается на сервер.");

          let blob = recordedBlobRef.current;
          if (!blob) {
            addSystemLog('Загрузка: Fetching from IndexedDB для резервного аплоада...');
            const cached = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
            if (cached instanceof Blob) {
              blob = cached;
            }
          }

          if (!blob) {
            throw new Error("Файл записи не найден в локальном кэше IndexedDB.");
          }

          addSystemLog(`Начало загрузки файла (${(blob.size / (1024 * 1024)).toFixed(2)} MB) на Supabase Storage...`);
          const uploadResult = await renderService.uploadMedia(projectId, blob, 'video');
          if (uploadResult && uploadResult.publicUrl) {
            downloadUrl = uploadResult.publicUrl;
            addSystemLog(`Загрузка завершена. URL в облаке: ${downloadUrl}`);

            // Sync back to the manifest
            setManifest((prev: any) => {
              if (!prev) return prev;
              const next = { ...prev, videoUrl: downloadUrl || '' };
              projectService.updateLatestVersionManifest(projectId, next);
              return next;
            });
          } else {
            throw new Error("Не удалось сохранить файл на сервере.");
          }
        } catch (err: any) {
          addSystemLog(`Критическая ошибка подготовки видео в облаке: ${err.message}`);
          (globalThis as any).alert?.("Ошибка подготовки видео: " + err.message);
          return;
        }
      }

      // 4. Server-side H.264 (VP8/Opus) to universally compatible H.264 MP4 normalization
      if (downloadUrl && downloadUrl.includes('.webm')) {
        try {
          addSystemLog('Файл имеет тип .webm. Запуск транскодирования на сервере в H.264 MP4...');
          const normRes = await fetch('/api/studio/normalize-recording', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: downloadUrl, projectId })
          });

          if (normRes.ok) {
            const normData = await normRes.json();
            if (normData.publicUrl) {
              downloadUrl = normData.publicUrl;
              addSystemLog(`Транскодирование успешно! Новый MP4 URL: ${downloadUrl}`);

              // Sync back to the manifest
              setManifest((prev: any) => {
                if (!prev) return prev;
                const next = { ...prev, videoUrl: downloadUrl || '' };
                projectService.updateLatestVersionManifest(projectId, next);
                return next;
              });
            }
          } else {
            addSystemLog('Сервер вернул ошибку транскодирования.');
          }
        } catch (normErr: any) {
          addSystemLog(`Ошибка транскодирования: ${normErr.message || normErr}`);
          console.warn('[useStudioExport] H.264 normalization failed, falling back to raw video:', normErr);
        }
      }

      // 5. Telegram WebApp In-App WebView Sandbox Bypass
      const tgWebApp = typeof (globalThis as any).window !== 'undefined' && (globalThis as any).Telegram?.WebApp;
      if (tgWebApp && tgWebApp.openLink) {
        addSystemLog('Обнаружен Telegram WebApp. Открытие ссылки через openLink...');
        tgWebApp.openLink(downloadUrl);
        return;
      }

      // 6. Mobile Fallback path
      if (isMobile) {
        try {
          if (nav.share) {
            addSystemLog('Шеринг облачного файла на мобильном...');
            const response = await fetch(downloadUrl);
            const blob = await response.blob();
            const file = new File([blob], `ViralEngine_Take_${Date.now()}.mp4`, { type: 'video/mp4' });

            if (nav.canShare && nav.canShare({ files: [file] })) {
              await nav.share({
                files: [file],
                title: 'Viral Engine Video',
              });
              addSystemLog('Облачный файл успешно расшарен на мобильном.');
              return;
            }
          }
        } catch (shareErr: any) {
          addSystemLog(`Шеринг облачного файла не удался: ${shareErr.message || shareErr}`);
        }

        addSystemLog('Резервный мобильный переход: перенаправление на скачивание CDN...');
        if (typeof (globalThis as any).window !== 'undefined') {
          (globalThis as any).window.location.href = downloadUrl;
        }
        return;
      }

      // 7. Desktop PC Fallback path
      const doc2 = (globalThis as any).document;
      if (doc2) {
        const a = doc2.createElement('a');
        a.href = downloadUrl;
        a.download = `ViralEngine_Raw_${Date.now()}.mp4`;
        a.target = '_blank';
        doc2.body.appendChild(a);
        a.click();
        doc2.body.removeChild(a);
      }
      addSystemLog('Облачный файл успешно запрошен на ПК.');
    } finally {
      setIsSharing(false);
    }
  };

  // 2. Share raw recorded video link via Telegram share intent
  const sendRawToTelegram = async () => {
    if (!lastRecordingUrl) return;
    addSystemLog('Начало отправки видео в Telegram...');

    let urlToShare = lastRecordingUrl;

    if (lastRecordingUrl.startsWith('blob:')) {
      try {
        addSystemLog('Видео еще не загружено на сервер. Начинаем фоновую загрузку в облако для Telegram...');
        (globalThis as any).alert?.("Загружаем видео в облако для отправки в Telegram... Пожалуйста, подождите несколько секунд.");

        let blob = recordedBlobRef.current;
        if (!blob) {
          addSystemLog('Восстановление blob из IndexedDB для загрузки...');
          const cached = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
          if (cached instanceof Blob) {
            blob = cached;
          }
        }

        if (!blob) {
          throw new Error("Запись не найдена в локальной памяти.");
        }

        const uploadResult = await renderService.uploadMedia(projectId, blob, 'video');
        if (uploadResult && uploadResult.publicUrl) {
          urlToShare = uploadResult.publicUrl;
          addSystemLog(`Видео загружено успешно. URL для шаринга: ${urlToShare}`);
        } else {
          throw new Error("Не удалось загрузить видео на сервер.");
        }
      } catch (err: any) {
        addSystemLog(`Ошибка загрузки для Telegram: ${err.message || err}`);
        (globalThis as any).alert?.("Не удалось подготовить файл для Telegram: " + err.message);
        return;
      }
    }

    const descriptionText = (manifest as any)?.scriptText || manifest?.segments?.map((s: any) => s.scriptText).filter(Boolean).join('\n\n') || '';
    const shareText = descriptionText ? descriptionText.substring(0, 1000) : 'Мое новое видео из Viral Engine!';
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(urlToShare)}&text=${encodeURIComponent(shareText)}`;
    addSystemLog(`Открытие ссылки Telegram Share: ${tgUrl}`);

    if (typeof (globalThis as any).window !== 'undefined') {
      (globalThis as any).window.open(tgUrl, '_blank');
    }
  };

  // 3. Final Export Montage Compilation
  const handleFinalExport = async (
    broll?: any[],
    subs?: any[],
    explicitARollUrl?: string | null,
    subPos?: { x: number; y: number },
    subSize?: number,
    subStyle?: number,
    showSubtitles?: boolean,
    subColor?: string,
    subBgColor?: string
  ) => {
    setIsSaving(true);
    try {
      if (!manifest) {
        (globalThis as any).alert?.('Ошибка: манифест проекта не загружен. Попробуйте обновить страницу.');
        return;
      }

      const manifestAny = manifest as any;
      let resolvedARollUrl =
        (explicitARollUrl && !explicitARollUrl.startsWith('blob:') ? explicitARollUrl : null) ||
        (manifestAny.videoUrl && !manifestAny.videoUrl.startsWith('blob:') ? manifestAny.videoUrl : null) ||
        explicitARollUrl ||
        manifestAny.videoUrl ||
        manifestAny.aRollUrl ||
        manifestAny.segments?.find((s: any) => s.type === 'user_recording' && s.assetUrl)?.assetUrl ||
        manifestAny.segments?.[0]?.assetUrl ||
        null;

      if (resolvedARollUrl && resolvedARollUrl.startsWith('blob:')) {
        if (backgroundMp4Url && !backgroundMp4Url.startsWith('blob:')) {
          resolvedARollUrl = backgroundMp4Url;
          addSystemLog(`Export: Found pre-normalized cloud MP4. Using: ${resolvedARollUrl}`);
        } else {
          addSystemLog('Export: aRollUrl is a local blob URL. Using local IDB pipeline for export.');
        }
      }

      let resolvedBroll = broll || [];
      if (resolvedBroll.length > 0) {
        addSystemLog('Export: B-Roll clips detected. Local IDB pipeline will be used.');
      }

      const finalScriptText = subs?.map(s => s.text).join('\n\n') ||
                             manifest.segments?.map(s => s.scriptText).filter(Boolean).join('\n\n') || '';

      const updatedManifest: any = {
        ...manifest,
        aRollUrl: resolvedARollUrl,
        scriptText: finalScriptText,
        brollClips: resolvedBroll,
        subtitleClips: subs || [],
        subtitlePos: subPos || (manifest as any).subtitlePos || { x: 0, y: 0 },
        subtitleSize: subSize || (manifest as any).subtitleSize || 18,
        subtitleStyle: subStyle !== undefined ? subStyle : (manifest as any).subtitleStyle || 0,
        showSubtitles: showSubtitles !== undefined ? showSubtitles : true,
        subtitleColor: subColor !== undefined ? subColor : (manifest as any).subtitleColor || '',
        subtitleBgColor: subBgColor !== undefined ? subBgColor : (manifest as any).subtitleBgColor || '',
        _log_subs_count: subs?.length || 0,
        segments: manifest.segments.map((s: any, i: number) => i === 0 ? {
          ...s,
          brollClips: resolvedBroll,
          subtitleClips: subs || [],
          subtitleStyle: subStyle !== undefined ? subStyle : (manifest as any).subtitleStyle || 0,
          subtitleSize: subSize || (manifest as any).subtitleSize || 18,
          showSubtitles: showSubtitles !== undefined ? showSubtitles : true,
          subtitleColor: subColor !== undefined ? subColor : (manifest as any).subtitleColor || '',
          subtitleBgColor: subBgColor !== undefined ? subBgColor : (manifest as any).subtitleBgColor || ''
        } : s)
      };

      // Trigger background distribution asset generation
      fetch('/api/ai/distribution-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptText: finalScriptText, projectId, locale, background: true })
      })
        .then(res => res.json())
        .then(async assets => {
          if (assets && !assets.error) {
            await projectService.updateLatestVersionManifest(projectId, { ...updatedManifest, distributionAssets: assets });
          }
        })
        .catch(e => console.error('[useStudioExport] Prefetch failed:', e));

      let savedVersion = null;
      if (currentVersionId) {
        savedVersion = await projectService.updateVersion(currentVersionId, { script_data: updatedManifest });
      } else {
        savedVersion = await projectService.updateLatestVersionManifest(projectId, updatedManifest);
      }

      if (!savedVersion) {
        savedVersion = await projectService.createVersion({
          projectId,
          scriptData: updatedManifest,
          versionLabel: 'Initial Export'
        });
      }

      // Sync local draft for immediate recovery
      try {
        const key = `viral_editor_draft_${projectId}`;
        const state = {
          aRollUrl: resolvedARollUrl,
          brollClips: broll || [],
          subtitleClips: subs || [],
          transcript: manifest.transcript || [],
          stage: 'editing',
          subtitlePos: subPos || (manifest as any).subtitlePos || { x: 0, y: 0 },
          subtitleSize: subSize || (manifest as any).subtitleSize || 18,
          subtitleStyle: subStyle !== undefined ? subStyle : (manifest as any).subtitleStyle || 0,
          showSubtitles: showSubtitles !== undefined ? showSubtitles : true,
          subtitleColor: subColor !== undefined ? subColor : (manifest as any).subtitleColor || '',
          subtitleBgColor: subBgColor !== undefined ? subBgColor : (manifest as any).subtitleBgColor || ''
        };
        await idb.set(key, state, 'ProjectDrafts');
        console.log('[useStudioExport] Local draft synced for delivery session');
      } catch (e) {
        console.warn('[useStudioExport] Local draft sync failed:', e);
      }

      // Invalidate render cache
      try {
        if (savedVersion?.id) {
          await idb.delete(`final_render_${projectId}_${savedVersion.id}`, 'MediaBuffer');
        }
        await idb.delete(`final_render_${projectId}`, 'MediaBuffer');
        console.log('[useStudioExport] Render cache invalidated — delivery will re-render with subtitles');
      } catch (e) { /* ignore */ }

      // Final Redirect
      router.push(`/app/projects/new/delivery?projectId=${projectId}`);

    } catch (err: any) {
      console.error('Export failed:', err);
      (globalThis as any).alert?.(`Не удалось сохранить проект: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    setIsSaving,
    isSharing,
    downloadRawVideo,
    sendRawToTelegram,
    handleFinalExport
  };
}
