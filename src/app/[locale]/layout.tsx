import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "../globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { SessionSync } from "@/components/auth/SessionSync";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

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

export const metadata: Metadata = {
  title: "Viral Engine — AI Content Production",
  description: "Your digital shadow works while you rest. Premium AI content factory in your pocket.",
  keywords: ["viral engine", "AI content", "reels", "shorts", "content automation"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Viral Studio",
  },
  icons: {
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
    <html lang={locale} className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased min-h-screen`}
        style={{ background: '#020408' }}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionSync />
          {/* Decorative Orbs */}
          <div className="orb orb-gold" />
          <div className="orb orb-mint" />
          <div className="orb orb-purple" />

          <div
            className="relative mx-auto min-h-screen w-full overflow-x-hidden"
            style={{ maxWidth: '500px' }}
          >
            {/* Background gradient */}
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
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
