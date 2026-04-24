'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Loader2 } from 'lucide-react';

export default function TelegramAuthPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const [botConfig, setBotConfig] = useState<{ botId: string; botUsername: string } | null>(null);

  useEffect(() => {
    // 1. Fetch Bot Config
    fetch('/api/auth/telegram/config')
      .then(res => res.json())
      .then(data => {
        if (data.botId) {
          setBotConfig({ botId: data.botId, botUsername: data.botUsername });
        }
      });
  }, []);

  useEffect(() => {
    if (!botConfig) return;

    // 2. Load Telegram Widget Script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botConfig.botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-auth-url', `${window.location.origin}/api/auth/telegram?next=/${locale}/app/projects`);
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    const container = document.getElementById('telegram-widget-container');
    if (container) {
      container.appendChild(script);
    }
  }, [botConfig, locale]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold italic tracking-tight uppercase">
            Confirming <span className="text-cyan-400">Telegram</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Press the button below to securely connect your Telegram account and start creating.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[100px] bg-white/5 rounded-3xl border border-white/10 p-8">
          {!botConfig ? (
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          ) : (
            <div id="telegram-widget-container" className="animate-in fade-in zoom-in duration-500" />
          )}
        </div>

        <button 
          onClick={() => router.back()}
          className="text-[10px] text-white/40 uppercase tracking-widest hover:text-white transition-colors"
        >
          ← Cancel and go back
        </button>
      </div>
    </div>
  );
}
