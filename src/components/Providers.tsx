'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import { DisableSwipeBack } from '@/components/ui/DisableSwipeBack';
import '@/lib/utils/domSafety';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider 
      attribute="data-theme" 
      defaultTheme="dark" 
      enableSystem={false}
      storageKey="virale-theme"
    >
      <DisableSwipeBack />
      <LazyMotion features={domAnimation}>
        {children}
      </LazyMotion>
    </ThemeProvider>
  );
}
