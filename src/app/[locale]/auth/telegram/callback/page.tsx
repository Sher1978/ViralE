'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function TelegramCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeParams = useParams();
  const hookLocale = useLocale();
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Safely resolve locale avoiding Next.js 16 Promise prop de-opt
  const pathLocale = typeof window !== 'undefined' && window.location.pathname.startsWith('/en') ? 'en' : 'ru';
  const locale = (routeParams?.locale as string) || hookLocale || pathLocale || 'ru';
  const authUrl = locale === 'ru' ? '/ru/auth' : '/auth';
  const targetProjectsUrl = locale === 'ru' ? '/ru/app/projects' : '/app/projects';

  useEffect(() => {
    async function finalizeAuth() {
      const authData: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        authData[key] = value;
      });

      if (!authData.hash) {
        console.error('No hash provided in Telegram callback');
        setErrorStatus(locale === 'ru' ? 'Отсутствует проверочная подпись Telegram (hash).' : 'Missing Telegram auth hash.');
        setTimeout(() => {
          router.replace(`${authUrl}?error=missing_hash`);
        }, 2000);
        return;
      }

      try {
        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authData)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to verify Telegram data');
        }

        const { session } = await response.json();
        
        // Ensure auth token cookie is explicitly set in document.cookie for immediate server-side validation
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const projectRef = supabaseUrl.split('.')[0].split('//')[1];
        if (projectRef && session?.access_token) {
          const cookieName = `sb-${projectRef}-auth-token`;
          document.cookie = `${cookieName}=${session.access_token}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `virale_legal_consent=true; path=/; max-age=31536000; SameSite=Lax`;
        }

        if (session) {
          const { error: sessionError } = await supabase.auth.setSession(session);
          if (sessionError) console.warn('[TelegramAuth] Session sync warning:', sessionError);
        }

        // Hard navigation ensures server components reload with valid cookie
        window.location.href = targetProjectsUrl;
      } catch (error: any) {
        console.error('Auth finalization error:', error);
        setErrorStatus(error?.message || (locale === 'ru' ? 'Сбой подтверждения данных Telegram' : 'Failed to finalize Telegram session'));
        setTimeout(() => {
          router.replace(`${authUrl}?error=auth_failed`);
        }, 3000);
      }
    }

    finalizeAuth();
  }, [searchParams, router, locale, authUrl, targetProjectsUrl]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] text-white p-6">
      {errorStatus ? (
        <div className="max-w-md w-full p-8 rounded-3xl bg-red-500/10 border border-red-500/30 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-red-300">
            {locale === 'ru' ? 'Ошибка входа' : 'Authentication Error'}
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            {errorStatus}
          </p>
          <div className="pt-2">
            <Link
              href={authUrl}
              className="inline-block px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-all"
            >
              {locale === 'ru' ? '← Вернуться на страницу входа' : '← Back to Sign In'}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 border-4 border-[#ff4d00] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xl font-medium">
            {locale === 'ru' ? 'Авторизация в Студию...' : 'Authenticating...'}
          </p>
          <p className="text-gray-400 mt-2 text-sm">
            {locale === 'ru' ? 'Пожалуйста, подождите, мы настраиваем вашу сессию' : 'Please wait while we secure your session'}
          </p>
        </>
      )}
    </div>
  );
}
