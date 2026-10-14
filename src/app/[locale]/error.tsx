'use client';

import { useEffect } from 'react';
import { isChunkLoadError, recoverFromChunkError } from '@/lib/utils/chunkSafety';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}) {
  useEffect(() => {
    // 1. Auto-recover immediately if the error was caused by a stale deployment chunk
    if (isChunkLoadError(error)) {
      const recovered = recoverFromChunkError();
      if (recovered) return;
    }

    // 2. Log error details for diagnostics
    console.error('[App Segment Error Boundary Caught]:', error);
  }, [error]);

  const isRussian = typeof window !== 'undefined' 
    ? window.location.pathname.startsWith('/ru')
    : false;

  const handleRetry = () => {
    if (isChunkLoadError(error)) {
      window.location.reload();
      return;
    }
    if (typeof reset === 'function') {
      reset();
    } else if (typeof unstable_retry === 'function') {
      unstable_retry();
    } else {
      window.location.reload();
    }
  };

  const handleHardRefresh = () => {
    try {
      window.sessionStorage?.removeItem('virale_chunk_recovery_ts');
    } catch {}
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#050508] text-white select-none">
      <div className="max-w-md w-full bg-[#12121A]/90 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-xl text-center space-y-6 relative overflow-hidden">
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-2 bg-gradient-to-r from-purple-500 via-amber-500 to-purple-500 rounded-full blur-sm" />

        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <AlertTriangle className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black italic uppercase tracking-tight text-white">
            {isRussian ? 'Обновление Системы' : 'System Update in Progress'}
          </h2>
          <p className="text-xs text-white/50 leading-relaxed font-medium">
            {isRussian
              ? 'Была развернута новая версия платформы или прервалось сетевое соединение. Перезагрузите страницу для загрузки актуальной версии.'
              : 'A new version of the platform was deployed or network was interrupted. Refresh to load the latest build.'}
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <button
            onClick={handleHardRefresh}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
          >
            <RefreshCw size={15} />
            {isRussian ? 'Перезагрузить страницу' : 'Refresh Page'}
          </button>

          <button
            onClick={handleRetry}
            className="w-full py-3 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-bold uppercase text-[11px] tracking-wider transition-all"
          >
            {isRussian ? 'Попробовать снова' : 'Try Again'}
          </button>

          <a
            href={isRussian ? '/ru/app/ideas' : '/en/app/ideas'}
            className="inline-flex items-center justify-center gap-1.5 text-[11px] text-white/40 hover:text-white transition-colors pt-1"
          >
            <Home size={13} />
            <span>{isRussian ? 'Перейти в идеи' : 'Go to Ideas'}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
