import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Bebas_Neue, JetBrains_Mono, Inter } from "next/font/google";
import "../globals.css";
import { SessionSync } from "@/components/auth/SessionSync";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { PageShell } from "@/components/layout/PageShell";
import { FFmpegPreloader } from "@/components/ffmpeg/FFmpegPreloader";
import { SplashHider } from "@/components/layout/SplashHider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: ["400"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Viral Engine — AI Content Production",
  description: "Your digital shadow works while you rest. Premium AI content factory in your pocket.",
  keywords: ["viral engine", "AI content", "reels", "shorts", "content automation"],
  icons: {
    icon: "/icon-512x512.png",
    apple: "/icon-512x512.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#020408",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { Providers } from "@/components/Providers";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'en' | 'ru')) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning style={{ background: '#050505' }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${bebasNeue.variable} ${jetbrainsMono.variable} ${inter.variable} antialiased min-h-screen`}
        style={{ background: '#050505', color: '#F5F0E8' }}
      >
        {/* Instant Splash Screen (Pre-hydration) */}
        <div id="instant-splash" style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#050505',
          backgroundImage: 'url(/splash_bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.8s ease',
          pointerEvents: 'none'
        }}>
          {/* Minimal overlay to ensure text/icons remain readable if added later */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)'
          }}></div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          function hideSplash() {
            var splash = document.getElementById('instant-splash');
            if (splash && splash.style.opacity !== '0') {
              splash.style.opacity = '0';
              setTimeout(function() { splash.style.display = 'none'; }, 800);
            }
          }
          // Hide on load OR after 1.5s safety timeout
          window.addEventListener('load', hideSplash);
          setTimeout(hideSplash, 1500);

          // 🔥 Global Self-Healing Chunk Error Recovery Handler
          window.addEventListener('error', function(e) {
            var msg = (e && e.message) || '';
            var target = e && e.target;
            var url = (target && (target.src || target.href)) || '';
            
            var isChunkError = 
              msg.indexOf('ChunkLoadError') !== -1 || 
              msg.indexOf('Loading chunk') !== -1 || 
              msg.indexOf('Failed to fetch') !== -1 ||
              (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK') && url.indexOf('/_next/static/') !== -1);

            if (isChunkError) {
              console.warn('[System Recovery] Dynamic chunk or asset failed to load. Forcing a hard reload to latest version...', e);
              var lastReload = localStorage.getItem('last_chunk_reload');
              var now = Date.now();
              // Prevent infinite loop if user is completely offline
              if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                localStorage.setItem('last_chunk_reload', now.toString());
                window.location.reload();
              }
            }
          }, true); // true = capture phase to intercept failed script tags before they crash

          // 🔥 Link Click Throttle to prevent cancelled/aborted fetch requests in WebViews
          var lastClickTime = 0;
          document.addEventListener('click', function(e) {
            var target = e.target;
            while (target && target.tagName !== 'A') {
              target = target.parentNode;
            }
            if (target && target.tagName === 'A') {
              var href = target.getAttribute('href') || '';
              // Ignore hash anchors or JS executions
              if (!href || href.indexOf('#') === 0 || href.indexOf('javascript:') === 0) {
                return;
              }
              var now = Date.now();
              if (now - lastClickTime < 450) {
                e.preventDefault();
                e.stopPropagation();
                console.warn('[System Recovery] Throttled rapid link click to prevent WebView fetch cancellation.');
                return false;
              }
              lastClickTime = now;
            }
          }, true); // Intercept in capture phase before Next.js processes the navigation
        `}} />

        <Providers>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <SplashHider />
            <SessionSync />
            <FFmpegPreloader />
            
            {/* Decorative Orbs (Global) */}
            <div className="orb orb-gold" />
            <div className="orb orb-mint" />
            <div className="orb orb-purple" />

            <PageShell>
              {children}
            </PageShell>
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
