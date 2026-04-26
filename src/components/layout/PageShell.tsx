'use client';

import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { BottomNav } from './BottomNav';
import { GlobalStrategist } from '../global/GlobalStrategist';

interface PageShellProps {
  children: React.ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  const pathname = usePathname();
  const locale = useLocale();

  const isAppPath = pathname.includes('/app');
  const isMarketingPath = !isAppPath;

  if (isMarketingPath) {
    return (
      <div className="relative w-full min-h-screen overflow-x-hidden">
        {/* Full-width background gradient for marketing */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at 30% 0%, rgba(155, 95, 255, 0.07) 0%, transparent 55%),
              radial-gradient(ellipse at 70% 90%, rgba(0, 255, 204, 0.05) 0%, transparent 55%),
              radial-gradient(circle at 50% 50%, #0B1229 0%, #020408 100%)
            `,
          }}
        />
        <main className="relative z-10 w-full min-h-screen">
          {children}
        </main>
      </div>
    );
  }

  // Mobile-constrained shell for the App
  return (
    <div
      className="relative mx-auto min-h-screen w-full overflow-x-hidden"
      style={{ maxWidth: '500px' }}
    >
      {/* Constrained background gradient for the App */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          maxWidth: '500px',
          margin: '0 auto',
          background: `
            radial-gradient(ellipse at 30% 0%, rgba(155, 95, 255, 0.07) 0%, transparent 55%),
            radial-gradient(ellipse at 70% 90%, rgba(0, 255, 204, 0.05) 0%, transparent 55%),
            radial-gradient(circle at 50% 50%, #0B1229 0%, #020408 100%)
          `,
        }}
      />

      <main className="relative z-10 pb-32 px-5 pt-14 min-h-screen">
        {children}
      </main>
      <BottomNav />
      <GlobalStrategist />
    </div>
  );
}
