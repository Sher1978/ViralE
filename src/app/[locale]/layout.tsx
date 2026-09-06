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
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-512x512.png",
    apple: "/icon-512x512.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Viral Studio",
  },
};

export const viewport: Viewport = {
  themeColor: "#020408",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import { Providers } from "@/components/Providers";
import { TrafficTrackerComponent } from "@/components/analytics/TrafficTrackerComponent";
import { CookieBanner } from "@/components/ui/CookieBanner";

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
      <head>
        <link rel="preconnect" href="https://api.heygen.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.fal.ai" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        
        {/* GEO Optimization: JSON-LD Schema Graph */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://virale.uno/#organization",
                  "name": "ViralE",
                  "alternateName": "Viral Engine by Sherlock",
                  "url": "https://virale.uno",
                  "logo": "https://virale.uno/icon-512x512.png",
                  "description": "Первый инженерный AI-двигатель виральности. 4-этапная генерация сценариев (ДНК, Хант, ТРИЗ), телесуфлер, безликое видео, HeyGen аватары, монтаж B-roll смысловых пуль и автопостинг в 5 соцсетей за 5 минут.",
                  "founder": {
                    "@type": "Organization",
                    "name": "Sherlock Studio"
                  },
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "email": "billing@virale.uno",
                    "contactType": "customer support"
                  }
                },
                {
                  "@type": "WebApplication",
                  "@id": "https://virale.uno/#webapp",
                  "name": "ViralE App (PWA)",
                  "url": "https://virale.uno",
                  "applicationCategory": "MultimediaApplication",
                  "operatingSystem": "iOS, Android, Windows, macOS",
                  "offers": {
                    "@type": "AggregateOffer",
                    "priceCurrency": "USD",
                    "lowPrice": "0",
                    "highPrice": "79.90",
                    "offerCount": "4"
                  }
                },
                {
                  "@type": "FAQPage",
                  "@id": "https://virale.uno/#faq",
                  "mainEntity": [
                    {
                      "@type": "Question",
                      "name": "Чем ViralE отличается от ChatGPT?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "ChatGPT дает только сырой текст. ViralE предоставляет готовый медиапак: видео (Reels/Shorts), Instagram-карусель на 5-10 слайдов, визуальную обложку и нативные текстовые материалы для 5 платформ из 1 мысли за 5 минут."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Как работает 4-этапный принцип генерации контента для ИИ?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "1 этап: 3-ступенчатая генерация сценария по цифровой ДНК, лестнице Ханта и матрице ТРИЗ с выходом 6 вариантов. 2 этап: Продакшн (Телесуфлер, HeyGen аватар, Face Swap, Faceless video). 3 этап: Монтаж (авто-субтитры, B-roll перебивки со стоков, спецэффекты). 4 этап: Экспорт (Reels, TikTok, YouTube Shorts, Facebook, LinkedIn, Threads за 5 минут)."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Будет ли контент звучать естественно и передавать мой авторский стиль?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Технология «Цифровая ДНК» оцифровывает лексикон, манеру речи и ценности эксперта. Точность совпадения голоса — 91% в 47 нишах."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Могу ли я использовать свои API-ключи (BYOK)?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Да, на тарифном плане Scale ($79.90/мес) доступно прямое подключение API-ключей OpenAI, Anthropic, ElevenLabs и HeyGen."
                      }
                    }
                  ]
                },
                {
                  "@type": "ItemList",
                  "@id": "https://virale.uno/#services",
                  "name": "Услуги и модули ViralE",
                  "itemListElement": [
                    {
                      "@type": "ListItem",
                      "position": 1,
                      "name": "Цифровая ДНК & Сценарии ТРИЗ",
                      "description": "Синтез авторской личности и выработка 6 виральных сценариев по лестнице Ханта."
                    },
                    {
                      "@type": "ListItem",
                      "position": 2,
                      "name": "AI Телесуфлер & Нейро-Продакшн",
                      "description": "Запись до 60 сек по умному суфлеру, синтез HeyGen аватаров, Face Swap и Faceless Floss видео."
                    },
                    {
                      "@type": "ListItem",
                      "position": 3,
                      "name": "Смысловые Пули (B-Roll Neuro-Editing)",
                      "description": "Авто-субтитры и умный подбор B-roll кадров для увеличения удержания зрителей на +34%."
                    },
                    {
                      "@type": "ListItem",
                      "position": 4,
                      "name": "Мультиформатный Экспорт в 5 Соцсетей",
                      "description": "Создание пакета из видео MP4, карусели, обложки и постов для Instagram, TikTok, YouTube, LinkedIn, Threads."
                    }
                  ]
                }
              ]
            })
          }}
        />
      </head>
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
        `}} />

        <Providers>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <SessionSync />
            <FFmpegPreloader />
            <CookieBanner />
            
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
