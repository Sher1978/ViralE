import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg"],

  async headers() {
    return [
      {
        source: '/ffmpeg/:file*',
        headers: [
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // COOP/COEP headers — required for SharedArrayBuffer (multithreaded FFmpeg)
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Base redirects (Fallback to RU if locale missing)
      { source: '/app/projects/:path*', destination: '/ru/app/projects/:path*', permanent: false },
      { source: '/projects/:path*', destination: '/ru/app/projects/:path*', permanent: false },
      { source: '/dashboard', destination: '/ru/app/dashboard', permanent: true },
      { source: '/ideas', destination: '/ru/app/ideas', permanent: true },
      { source: '/onboarding', destination: '/ru/app/onboarding', permanent: true },
      { source: '/profile', destination: '/ru/app/profile', permanent: true },
      { source: '/billing', destination: '/ru/app/billing', permanent: true },

      // Auth / Registration aliases (prevent 404 for clients looking for /register, /signup, etc.)
      { source: '/register', destination: '/ru/auth', permanent: false },
      { source: '/registration', destination: '/ru/auth', permanent: false },
      { source: '/signup', destination: '/ru/auth', permanent: false },
      { source: '/sign-up', destination: '/ru/auth', permanent: false },
      { source: '/login', destination: '/ru/auth', permanent: false },
      { source: '/signin', destination: '/ru/auth', permanent: false },
      { source: '/sign-in', destination: '/ru/auth', permanent: false },
      { source: '/join', destination: '/ru/auth', permanent: false },

      // Localized redirects
      { source: '/:locale(en|ru)/projects', destination: '/:locale/app/projects', permanent: true },
      { source: '/:locale(en|ru)/dashboard', destination: '/:locale/app/dashboard', permanent: true },
      { source: '/:locale(en|ru)/ideas', destination: '/:locale/app/ideas', permanent: true },
      { source: '/:locale(en|ru)/onboarding', destination: '/:locale/app/onboarding', permanent: true },
      { source: '/:locale(en|ru)/profile', destination: '/:locale/app/profile', permanent: true },
      { source: '/:locale(en|ru)/billing', destination: '/:locale/app/billing', permanent: true },
      { source: '/:locale(en|ru)/register', destination: '/:locale/auth', permanent: false },
      { source: '/:locale(en|ru)/registration', destination: '/:locale/auth', permanent: false },
      { source: '/:locale(en|ru)/signup', destination: '/:locale/auth', permanent: false },
      { source: '/:locale(en|ru)/sign-up', destination: '/:locale/auth', permanent: false },
      { source: '/:locale(en|ru)/login', destination: '/:locale/auth', permanent: false },
      { source: '/:locale(en|ru)/signin', destination: '/:locale/auth', permanent: false },
      { source: '/:locale(en|ru)/sign-in', destination: '/:locale/auth', permanent: false },
      { source: '/:locale(en|ru)/join', destination: '/:locale/auth', permanent: false },
    ];
  },

};

export default withNextIntl(nextConfig);
