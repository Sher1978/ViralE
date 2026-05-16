'use client';

import { useEffect } from 'react';
import { getFFmpeg } from '@/lib/ffmpeg-delivery';

/**
 * FFmpegPreloader starts downloading the FFmpeg WASM files in the background
 * as soon as it is mounted. This "warms up" the engine while the user
 * is still on the landing page or project list.
 */
export function FFmpegPreloader() {
  useEffect(() => {
    // We don't await here, just trigger the load
    console.log('[Preloader] Warming up FFmpeg WASM...');
    getFFmpeg()
      .then(() => console.log('[Preloader] FFmpeg WASM warmed up and ready.'))
      .catch(err => console.warn('[Preloader] FFmpeg warming failed (non-critical):', err));
  }, []);

  return null;
}
