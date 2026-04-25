import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "../globals.css";
import { SessionSync } from "@/components/auth/SessionSync";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { PageShell } from "@/components/layout/PageShell";

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
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased min-h-screen`}
      >
        <Providers>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <SessionSync />
            
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
