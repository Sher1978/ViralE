'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider 
      attribute="data-theme" 
      defaultTheme="dark" 
      enableSystem={false}
      storageKey="virale-theme"
    >
      <LazyMotion features={domAnimation}>
        {children}
      </LazyMotion>
    </ThemeProvider>
  );
}
