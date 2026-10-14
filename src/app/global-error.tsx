'use client';

import { useEffect } from 'react';
import { isChunkLoadError, recoverFromChunkError } from '@/lib/utils/chunkSafety';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      recoverFromChunkError();
    }
    console.error('[Global Root Error Caught]:', error);
  }, [error]);

  const handleReload = () => {
    if (isChunkLoadError(error)) {
      try {
        window.sessionStorage?.removeItem('virale_chunk_recovery_ts');
      } catch {}
      window.location.reload();
      return;
    }
    if (typeof reset === 'function') {
      reset();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <html lang="ru">
      <body style={{ margin: 0, padding: 0, background: '#050508', color: '#FFFFFF', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ maxWidth: '420px', width: '100%', background: '#12121A', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', padding: '36px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', margin: '0 0 12px 0' }}>
              Обновление Платформы
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              Версия приложения обновилась. Пожалуйста, перезагрузите страницу.
            </p>
            <button
              onClick={handleReload}
              style={{
                width: '100%',
                padding: '14px',
                background: '#F59E0B',
                color: '#000000',
                border: 'none',
                borderRadius: '16px',
                fontWeight: 800,
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                cursor: 'pointer'
              }}
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
