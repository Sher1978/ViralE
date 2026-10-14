'use client';

/**
 * Next.js & Turbopack Chunk Loading Self-Healing & Auto-Recovery
 * 
 * Prevents user lockouts and false-alarm admin alerts when a new deployment
 * is published to Vercel while a client holds references to old chunk hashes.
 */

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  
  const errObj = error as { name?: string; message?: string; stack?: string } | null;
  const msg = typeof error === 'string' 
    ? error 
    : (errObj?.message || errObj?.name || String(error));
  const stack = typeof error === 'object' && errObj?.stack ? String(errObj.stack) : '';

  return (
    errObj?.name === 'ChunkLoadError' ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Failed to load chunk') ||
    msg.includes('Loading chunk') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('missing: /_next/static/chunks/') ||
    (msg.includes('turbopack') && msg.includes('Failed to load')) ||
    (stack.includes('turbopack') && stack.includes('Failed to load chunk')) ||
    stack.includes('ChunkLoadError')
  );
}

export function recoverFromChunkError(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const RELOAD_KEY = 'virale_chunk_recovery_ts';
    const lastReload = window.sessionStorage?.getItem(RELOAD_KEY);
    const now = Date.now();

    // Throttle reloads to at most once per 20 seconds to prevent endless loops
    if (!lastReload || now - parseInt(lastReload, 10) > 20000) {
      window.sessionStorage?.setItem(RELOAD_KEY, String(now));
      console.warn('[ChunkSafety] Detected stale deployment chunk. Hard reloading page to sync with latest build...');
      
      // Perform clean reload to pull latest HTML and chunk manifests
      window.location.reload();
      return true;
    }
  } catch {
    // If sessionStorage is unavailable/restricted, reload
    try {
      window.location.reload();
      return true;
    } catch {
      // Ignore
    }
  }
  return false;
}

// Global window event listener initialization
if (typeof window !== 'undefined') {
  // Catch script/chunk loading errors
  window.addEventListener('error', (event: ErrorEvent) => {
    const error = event.error || event.message;
    if (isChunkLoadError(error)) {
      if (recoverFromChunkError()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }, true);

  // Catch dynamic import rejection errors
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    if (isChunkLoadError(reason)) {
      if (recoverFromChunkError()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  });
}
