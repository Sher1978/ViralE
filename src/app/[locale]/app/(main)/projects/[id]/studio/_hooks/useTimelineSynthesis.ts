'use client';

import { useState } from 'react';
import { projectService } from '@/lib/services/projectService';
import { renderService } from '@/lib/services/renderService';
import { idb } from '@/lib/idb';
import { ProductionManifest } from '@/lib/types/studio';

export interface UseTimelineSynthesisOptions {
  projectId: string;
  manifest: ProductionManifest | null;
  setManifest: React.Dispatch<React.SetStateAction<ProductionManifest | null>>;
  lastRecordingUrl: string | null;
  setLastRecordingUrl: React.Dispatch<React.SetStateAction<string | null>>;
  handleTabChange: (tab: any) => void;
}

export function useTimelineSynthesis({
  projectId,
  manifest,
  setManifest,
  lastRecordingUrl,
  setLastRecordingUrl,
  handleTabChange
}: UseTimelineSynthesisOptions) {
  const [fusionSegments, setFusionSegments] = useState<any[]>([]);
  const [fusedVideoUrl, setFusedVideoUrl] = useState<string | null>(null);
  const [fusionStatus, setFusionStatus] = useState<'segmenting' | 'processing' | 'stitching' | 'completed' | 'failed'>('segmenting');
  const [fusionProgress, setFusionProgress] = useState(0);
  const [fusionCompletedSegments, setFusionCompletedSegments] = useState(0);
  const [fusionError, setFusionError] = useState<string | null>(null);

  const handleTimelineGeneration = async (timelineSegments: any[]) => {
    setFusionSegments(timelineSegments);
    handleTabChange('fusion');
    setFusionStatus('segmenting');
    setFusionProgress(5);
    setFusionError(null);
    
    try {
      // Prefer the Supabase URL from manifest over lastRecordingUrl.
      // lastRecordingUrl can be a revoked blob URL (revokeObjectURL was called to free RAM
      // before mounting VideoEditor/FFmpeg), which causes 0-byte uploads to process-timeline.
      const manifestVideoUrl = (manifest as any)?.videoUrl || (manifest as any)?.aRollUrl;
      let finalVideoUrl: string | null = null;

      if (manifestVideoUrl && !manifestVideoUrl.startsWith('blob:')) {
        // Best case: we already have a persisted Supabase/CDN URL
        finalVideoUrl = manifestVideoUrl;
        console.log('[Fusion] Using persisted Supabase URL from manifest:', finalVideoUrl);
      } else if (lastRecordingUrl && !lastRecordingUrl.startsWith('blob:')) {
        // Supabase URL in state
        finalVideoUrl = lastRecordingUrl;
        console.log('[Fusion] Using Supabase URL from lastRecordingUrl state:', finalVideoUrl);
      } else if (lastRecordingUrl && lastRecordingUrl.startsWith('blob:')) {
        // Blob URL — try to fetch it (only works if not revoked)
        setFusionStatus('segmenting');
        setFusionProgress(10);
        console.log('[Fusion] Attempting to fetch live blob URL for upload...');
        let videoBlob: Blob;
        try {
          const blobRes = await fetch(lastRecordingUrl);
          videoBlob = await blobRes.blob();
        } catch (fetchErr) {
          // Blob was revoked — try to recover from IndexedDB
          console.warn('[Fusion] Blob URL is dead (revoked). Attempting IDB recovery...');
          const idbBlob = await idb.get(`video_file_${projectId}`, 'MediaBuffer').catch(() => null);
          if (!idbBlob || !(idbBlob instanceof Blob)) {
            throw new Error('Исходное видео не найдено. Blob URL был освобождён из памяти и файл недоступен в кэше. Пожалуйста, запишите видео заново.');
          }
          videoBlob = idbBlob;
          console.log(`[Fusion] IDB recovery successful: ${videoBlob.size} bytes`);
        }

        if (videoBlob.size < 1000) {
          throw new Error(`Записанное видео пустое или повреждено (${videoBlob.size} байт). Пожалуйста, запишите видео заново.`);
        }
        
        console.log(`[Fusion] Uploading blob to Supabase. Size: ${videoBlob.size} bytes, type: ${videoBlob.type}`);
        const uploadResult = await renderService.uploadMedia(projectId, videoBlob, 'video');
        if (!uploadResult || !uploadResult.publicUrl) {
          throw new Error('Не удалось загрузить видео в хранилище.');
        }
        finalVideoUrl = uploadResult.publicUrl;
        console.log('[Fusion] Blob uploaded to Supabase:', finalVideoUrl);
        
        // Persist the public URL so future calls don't need to re-upload
        setManifest(prev => {
          if (!prev) return prev;
          const next = { ...prev, videoUrl: finalVideoUrl || '' };
          projectService.updateLatestVersionManifest(projectId, next);
          return next;
        });
        setLastRecordingUrl(finalVideoUrl);
      }

      if (!finalVideoUrl) {
        throw new Error('Не удалось определить источник видео. Попробуйте обновить страницу.');
      }
      
      setFusionProgress(35);
      setFusionStatus('processing');

      // Smooth progress ticker to avoid hanging at 50% during processing
      const progressInterval = setInterval(() => {
        setFusionProgress(prev => {
          if (prev >= 92) return prev;
          return prev + Math.floor(Math.random() * 4) + 2;
        });
      }, 700);

      try {
        const response = await fetch('/api/ai/fal/process-timeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            videoUrl: finalVideoUrl,
            segments: timelineSegments
          })
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Synthesis failed');
        }

        const data = await response.json();

        if (data.status === 'completed' && data.videoUrl) {
          setFusionStatus('completed');
          setFusionProgress(100);
          setFusedVideoUrl(data.videoUrl); 
          setTimeout(() => handleTabChange('fusion_preview'), 1000);
        } else {
          throw new Error('Synthesis failed to return a result');
        }
      } catch (err: any) {
        clearInterval(progressInterval);
        throw err;
      }

    } catch (err: any) {
      console.error('[Fusion] Failed:', err);
      setFusionStatus('failed');
      setFusionError(err.message || 'Unknown error during synthesis');
    }
  };

  return {
    fusionSegments,
    setFusionSegments,
    fusedVideoUrl,
    setFusedVideoUrl,
    fusionStatus,
    setFusionStatus,
    fusionProgress,
    setFusionProgress,
    fusionCompletedSegments,
    fusionError,
    setFusionError,
    handleTimelineGeneration
  };
}
