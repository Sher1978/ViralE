'use client';

import { useEffect } from 'react';

export function DisableSwipeBack() {
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        startX = e.touches[0].pageX;
        startY = e.touches[0].pageY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const deltaX = touch.pageX - startX;
        const deltaY = touch.pageY - startY;

        // Detect horizontal edge swipe gestures (starting within 40px of left/right screen edge)
        const isLeftEdgeSwipe = startX < 40 && deltaX > 0;
        const isRightEdgeSwipe = startX > (window.innerWidth - 40) && deltaX < 0;

        if ((isLeftEdgeSwipe || isRightEdgeSwipe) && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return null;
}
