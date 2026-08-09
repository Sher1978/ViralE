/**
 * Utility to check browser capabilities for rendering.
 * Specifically checks for SharedArrayBuffer support (required for multithreaded FFmpeg)
 * and hardware acceleration.
 */
export const browserCapabilities = {
  /**
   * Checks if the browser supports SharedArrayBuffer.
   * Required for multi-threaded WASM.
   */
  hasSharedArrayBuffer(): boolean {
    const win = typeof globalThis !== 'undefined' ? (globalThis as any).window : null;
    return !!win && typeof win.SharedArrayBuffer !== 'undefined';
  },

  /**
   * Checks if the browser is mobile (Safari iOS, Android).
   * Mobile browsers often have strict memory limits for WASM.
   */
  isMobile(): boolean {
    return typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  },

  /**
   * Suggests the best render mode based on capabilities.
   */
  suggestRenderMode(): 'shotstack' | 'ffmpeg' {
    // Shotstack cloud rendering disabled per user request — always use local FFmpeg
    return 'ffmpeg';
  }
};
