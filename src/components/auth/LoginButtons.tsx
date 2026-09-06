'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/navigation';
import { Wrench, ShieldAlert, CheckSquare, Square, Lock } from 'lucide-react';

export default function LoginButtons() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/app/projects';
  const [isLoading, setIsLoading] = useState<string | null>(null);
  
  // Mandatory Consent state for Personal Data Processing under Law of Ukraine No. 2297-VI
  const [isConsentChecked, setIsConsentChecked] = useState(false);

  // Technical Maintenance Mode toggle (Blocks login for all users as requested)
  const isMaintenanceActive = process.env.NEXT_PUBLIC_MAINTENANCE_MODE !== 'false';

  const handleGoogleLogin = async () => {
    if (isMaintenanceActive || !isConsentChecked) return;
    setIsLoading('google');
    try {
      const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
      let activeLocale = locale;
      if (globalObj && globalObj.window) {
        const storedLocale = globalObj.window.localStorage.getItem('NEXT_LOCALE');
        if (storedLocale === 'en' || storedLocale === 'ru') {
          activeLocale = storedLocale;
        }
      }
      
      const redirectPath = next.startsWith('/') ? next : `/${next}`;
      const localizedNext = activeLocale === 'ru' ? `/ru${redirectPath}` : redirectPath;
      
      const win = (globalThis as any).window;
      const canonicalOrigin = win ? win.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://www.virale.uno');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${canonicalOrigin}/api/auth/callback?next=${encodeURIComponent(localizedNext)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in with Google:', error);
      setIsLoading(null);
    }
  };

  const handleTelegramLogin = async () => {
    if (isMaintenanceActive || !isConsentChecked) return;
    setIsLoading('telegram');
    try {
      const configRes = await fetch('/api/auth/telegram/config');
      const { botUsername } = await configRes.json();
      
      if (!botUsername) throw new Error('Telegram bot not configured');

      const win = (globalThis as any).window;
      if (win) {
        win.location.href = `https://t.me/${botUsername}?start=auth`;
      }

    } catch (error) {
      console.error('Telegram login error:', error);
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Technical Maintenance Banner */}
      {isMaintenanceActive && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-left space-y-2 backdrop-blur-xl relative overflow-hidden"
        >
          <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider text-amber-400">
            <Wrench className="w-4 h-4 animate-bounce" />
            <span>Technical Maintenance in Progress</span>
          </div>
          <div className="text-xs text-amber-200/80 font-medium leading-relaxed">
            Ведутся Технические работы. Вход и регистрация временно приостановлены в связи с плановым обновлением системы.
          </div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-amber-400/60 pt-1 flex items-center gap-1">
            <Lock size={12} /> Login Screen Locked
          </div>
        </motion.div>
      )}

      {/* Mandatory Personal Data Processing Consent Checkbox (Law of Ukraine No. 2297-VI) */}
      <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-left space-y-2">
        <label htmlFor="consent-checkbox" className="flex items-start gap-3 cursor-pointer select-none">
          <input
            id="consent-checkbox"
            type="checkbox"
            checked={isConsentChecked}
            onChange={(e) => setIsConsentChecked(e.target.checked)}
            disabled={isMaintenanceActive}
            className="mt-1 w-4 h-4 rounded border-white/20 bg-black/40 text-purple-500 focus:ring-purple-500/40 shrink-0 cursor-pointer disabled:opacity-40"
          />
          <span className="text-xs text-gray-300 font-medium leading-normal">
            I consent to the processing of my personal data under the <strong>Law of Ukraine &quot;On Protection of Personal Data&quot; (No. 2297-VI)</strong> and agree to the{' '}
            <Link 
              href="/privacy" 
              target="_blank" 
              className="text-purple-400 underline hover:text-purple-300 transition-colors font-bold"
            >
              Privacy Policy
            </Link>.
          </span>
        </label>
        {!isConsentChecked && !isMaintenanceActive && (
          <p className="text-[10px] text-purple-400/70 font-semibold pl-7">
            * Check box to enable sign-in options.
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="space-y-4">
        {/* Google Button */}
        <motion.button
          whileHover={!isMaintenanceActive && isConsentChecked ? { scale: 1.02 } : {}}
          whileTap={!isMaintenanceActive && isConsentChecked ? { scale: 0.98 } : {}}
          onClick={handleGoogleLogin}
          disabled={isMaintenanceActive || !isConsentChecked || isLoading !== null}
          className="w-full h-14 bg-white text-black font-semibold rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading === 'google' ? (
            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t('googleBtn')}
            </>
          )}
        </motion.button>

        {/* Telegram Button */}
        <motion.button
          whileHover={!isMaintenanceActive && isConsentChecked ? { scale: 1.02 } : {}}
          whileTap={!isMaintenanceActive && isConsentChecked ? { scale: 0.98 } : {}}
          onClick={handleTelegramLogin}
          disabled={isMaintenanceActive || !isConsentChecked || isLoading !== null}
          className="w-full h-14 bg-[#24A1DE] text-white font-semibold rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-[#208fca] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading === 'telegram' ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM17.1518 8.16335L15.4216 16.3242C15.2912 16.9004 14.9504 17.0437 14.466 16.7725L11.8291 14.8279L10.5566 16.0526C10.4156 16.1936 10.2979 16.3129 10.0267 16.3129L10.2162 13.6288L15.0991 9.21558C15.3114 9.02685 15.0534 8.92188 14.7693 9.11122L8.73037 12.9137L6.13317 12.1009C5.56832 11.9247 5.5583 11.5358 6.25052 11.2655L16.4045 7.35242C16.8746 7.17721 17.2858 7.45802 17.1518 8.16335Z" fill="currentColor"/>
              </svg>
              {t('telegramBtn')}
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
