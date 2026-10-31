'use client';

import Script from 'next/script';
import { useEffect } from 'react';

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || 'pyq560h8x9';

/**
 * Extracts Clarity session ID from document cookie _clsk or window.clarity
 */
export function getClaritySessionInfo(): { sessionId?: string; replayUrl?: string; projectId: string } {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || 'pyq560h8x9';
  if (typeof window === 'undefined') return { projectId };

  let sessionId: string | undefined = undefined;

  // 1. Try reading directly from window.clarity
  try {
    const win = window as any;
    if (typeof win.clarity === 'function') {
      sessionId = win.clarity('get', 'sessionId');
    }
  } catch (e) {
    // Ignore
  }

  // 2. Fallback: Parse from _clsk cookie
  // Format: _clsk=1abcde%2F1698765432%2F1%2F1%2F...
  if (!sessionId) {
    try {
      const match = document.cookie.match(/(?:^|;\s*)_clsk=([^;]+)/);
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]);
        const parts = decoded.split('/');
        if (parts[0]) {
          sessionId = parts[0];
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  const replayUrl = sessionId
    ? `https://clarity.microsoft.com/projects/view/${projectId}/sessions/${sessionId}`
    : `https://clarity.microsoft.com/projects/view/${projectId}`;

  return { sessionId, replayUrl, projectId };
}

export function ClarityAnalytics() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || 'pyq560h8x9';

  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      (window as any).__CLARITY_PROJECT_ID__ = projectId;
    }
  }, [projectId]);

  if (!projectId) return null;

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${projectId}");
        `,
      }}
    />
  );
}
