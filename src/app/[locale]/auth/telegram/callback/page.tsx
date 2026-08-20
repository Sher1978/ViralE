'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function TelegramCallbackPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        
        // Ensure auth token cookie is explicitly set in document.cookie for immediate server-side validation
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const projectRef = supabaseUrl.split('.')[0].split('//')[1];
        if (projectRef && session?.access_token) {
          const cookieName = `sb-${projectRef}-auth-token`;
          document.cookie = `${cookieName}=${session.access_token}; path=/; max-age=604800; SameSite=Lax`;
        }

        const { error: sessionError } = await supabase.auth.setSession(session);
        
        if (sessionError) throw sessionError;

        // Hard navigation ensures server components reload with valid cookie
        window.location.href = `/${locale}/app/projects`;
      } catch (error) {
        console.error('Auth finalization error:', error);
        router.replace(`/${locale}/auth?error=auth_failed`);
      }
    }

    finalizeAuth();
  }, [searchParams, router, locale]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] text-white">
      <div className="w-16 h-16 border-4 border-[#ff4d00] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-xl font-medium">Authenticating...</p>
      <p className="text-gray-400 mt-2 text-sm">Please wait while we secure your session</p>
    </div>
  );
}
