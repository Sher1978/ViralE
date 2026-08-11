'use client';

import { useEffect, useRef, useCallback } from 'react';

interface StudioVisibilityGuardOptions {
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  isPlaying?: boolean;
  setIsPlaying?: (playing: boolean) => void;
  currentTime?: number;
  setCurrentTime?: (time: number) => void;
  onRestore?: () => void;
}

/**
 * 🛡️ Studio App Visibility Guard & Window Focus Protection Hook
 * Prevents video distortion, canvas skewing, WebAudio clock drift, and studio freezes
 * when switching between apps or minimizing the browser window.
 */
export function useStudioVisibilityGuard({
  videoRef,
  isPlaying,
  setIsPlaying,
  currentTime,
  setCurrentTime,
  onRestore,
}: StudioVisibilityGuardOptions) {
  const savedTimeRef = useRef<number>(currentTime || 0);
  const wasPlayingRef = useRef<boolean>(false);
  const isBackgroundedRef = useRef<boolean>(false);

  // Keep savedTimeRef updated with active playback time
  useEffect(() => {
    if (currentTime !== undefined && !isBackgroundedRef.current) {
      savedTimeRef.current = currentTime;
    }
  }, [currentTime]);

  const handleVisibilityChange = useCallback(() => {
    const isHidden = document.hidden;
    const v = videoRef?.current;

    if (isHidden) {
      // 1. App is backgrounded / user switched to another app
      isBackgroundedRef.current = true;
      if (v) {
        savedTimeRef.current = v.currentTime;
      }
      if (isPlaying) {
        wasPlayingRef.current = true;
        if (setIsPlaying) setIsPlaying(false);
        if (v && !v.paused) {
          try {
            v.pause();
          } catch (e) {}
        }
      }
    } else {
      // 2. App returned to foreground / user switched back
      isBackgroundedRef.current = false;
      
      // Auto-resume WebAudio if suspended by browser policy
      try {
        const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
        if (globalObj.AudioContext || globalObj.webkitAudioContext) {
          const audioCtx = globalObj.__studio_audio_ctx;
          if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }
        }
      } catch (e) {}

      // Re-sync video currentTime to prevent desync or freeze
      if (v) {
        try {
          if (isFinite(savedTimeRef.current) && savedTimeRef.current >= 0) {
            v.currentTime = savedTimeRef.current;
            if (setCurrentTime) setCurrentTime(savedTimeRef.current);
          }
        } catch (e) {}
      }

      // Trigger window layout recalculation to fix 0px canvas aspect ratio skews
      try {
        window.dispatchEvent(new Event('resize'));
      } catch (e) {}

      if (onRestore) {
        onRestore();
      }
    }
  }, [videoRef, isPlaying, setIsPlaying, setCurrentTime, onRestore]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onBlur = () => {
      // Gentle pause on window blur if backgrounded
      if (document.hidden) {
        handleVisibilityChange();
      }
    };

    const onFocus = () => {
      if (!document.hidden && isBackgroundedRef.current) {
        handleVisibilityChange();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [handleVisibilityChange]);

  return {
    isBackgrounded: isBackgroundedRef.current,
  };
}
