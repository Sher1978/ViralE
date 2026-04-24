'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function TelegramCallbackPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const locale = params.locale;

  useEffect(() => {
    async function finalizeAuth() {
      const authData: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        authData[key] = value;
      });

      if (!authData.hash) {
        console.error('No hash provided in Telegram callback');
        router.replace(`/${locale}/auth?error=missing_hash`);
        return;
      }

      try {
        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authData)
        });

        if (!response.ok) {
          throw new Error('Failed to verify Telegram data');
        }

        const { session } = await response.json();
        const { error: sessionError } = await supabase.auth.setSession(session);
        
        if (sessionError) throw sessionError;

        // Redirect to app
        router.replace(`/${locale}/app`);
      } catch (error) {
        console.error('Auth finalization error:', error);
        router.replace(`/${locale}/auth?error=auth_failed`);
      }
    }

    finalizeAuth();
  }, [searchParams, router, supabase, locale]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] text-white">
      <div className="w-16 h-16 border-4 border-[#ff4d00] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-xl font-medium">Authenticating...</p>
      <p className="text-gray-400 mt-2 text-sm">Please wait while we secure your session</p>
    </div>
  );
}
