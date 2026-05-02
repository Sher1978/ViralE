import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
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

      // Localized redirects
      { source: '/:locale(en|ru)/projects', destination: '/:locale/app/projects', permanent: true },
      { source: '/:locale(en|ru)/dashboard', destination: '/:locale/app/dashboard', permanent: true },
      { source: '/:locale(en|ru)/ideas', destination: '/:locale/app/ideas', permanent: true },
      { source: '/:locale(en|ru)/onboarding', destination: '/:locale/app/onboarding', permanent: true },
      { source: '/:locale(en|ru)/profile', destination: '/:locale/app/profile', permanent: true },
      { source: '/:locale(en|ru)/billing', destination: '/:locale/app/billing', permanent: true },
    ];
  },

};

export default withNextIntl(nextConfig);
