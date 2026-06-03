import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg"],

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/ffmpeg/:file*',
        headers: [
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // COOP/COEP headers — required for SharedArrayBuffer (multithreaded FFmpeg WASM)
      // IMPORTANT: Use 'credentialless' (NOT 'require-corp') — require-corp breaks Safari/iOS:
      // it blocks fetch() of blob: URLs that the Studio transcription pipeline uses for
      // decodeAudioData, causing fallback to FFmpeg WASM and showing 'FFmpeg: init core...' in editor.
      // 'credentialless' still enables SharedArrayBuffer for Delivery page FFmpeg render.
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Base redirects (Fallback to RU if locale missing)
      { source: '/app/projects/:path*', destination: '/ru/app/projects/:path*', permanent: false },
      { source: '/projects/:path*', destination: '/ru/app/projects/:path*', permanent: false },
      { source: '/dashboard', destination: '/ru/app/ideas', permanent: true },
      { source: '/ideas', destination: '/ru/app/ideas', permanent: true },
      { source: '/onboarding', destination: '/ru/app/onboarding', permanent: true },
      { source: '/profile', destination: '/ru/app/profile', permanent: true },
      { source: '/billing', destination: '/ru/app/billing', permanent: true },

      // Localized redirects
      { source: '/:locale(en|ru)/projects', destination: '/:locale/app/projects', permanent: true },
      { source: '/:locale(en|ru)/dashboard', destination: '/:locale/app/ideas', permanent: true },
      { source: '/:locale(en|ru)/app/dashboard', destination: '/:locale/app/ideas', permanent: true },
      { source: '/:locale(en|ru)/ideas', destination: '/:locale/app/ideas', permanent: true },
      { source: '/:locale(en|ru)/onboarding', destination: '/:locale/app/onboarding', permanent: true },
      { source: '/:locale(en|ru)/profile', destination: '/:locale/app/profile', permanent: true },
      { source: '/:locale(en|ru)/billing', destination: '/:locale/app/billing', permanent: true },
    ];
  },

};

export default withNextIntl(nextConfig);
