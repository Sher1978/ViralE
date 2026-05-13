'use client';

import { useEffect } from 'react';

export function SplashHider() {
  useEffect(() => {
    // 1. Immediate attempt
    const hide = () => {
      const splash = document.getElementById('instant-splash');
      if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            // Also cleanup to prevent any ghost overlays
            splash.remove();
        }, 800);
      }
    };

    // 2. Hide as soon as this component mounts (hydration start)
    hide();

    // 3. Robust safety backups
    const t1 = setTimeout(hide, 500);
    const t2 = setTimeout(hide, 1000);
    const t3 = setTimeout(hide, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return null;
}
