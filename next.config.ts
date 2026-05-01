import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Base redirects
      { source: '/projects', destination: '/app/projects', permanent: true },
      { source: '/dashboard', destination: '/app/dashboard', permanent: true },
      { source: '/ideas', destination: '/app/ideas', permanent: true },
      { source: '/onboarding', destination: '/app/onboarding', permanent: true },
      { source: '/profile', destination: '/app/profile', permanent: true },
      { source: '/billing', destination: '/app/billing', permanent: true },

      // Localized redirects
      { source: '/:locale(en|ru)/projects', destination: '/:locale/app/projects', permanent: true },
      { source: '/:locale(en|ru)/dashboard', destination: '/:locale/app/dashboard', permanent: true },
      { source: '/:locale(en|ru)/ideas', destination: '/:locale/app/ideas', permanent: true },
      { source: '/:locale(en|ru)/onboarding', destination: '/:locale/app/onboarding', permanent: true },
      { source: '/:locale(en|ru)/profile', destination: '/:locale/app/profile', permanent: true },
      { source: '/:locale(en|ru)/billing', destination: '/:locale/app/billing', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
