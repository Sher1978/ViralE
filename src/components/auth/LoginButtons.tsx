'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Wrench, ShieldCheck, CheckSquare, Square, Lock, ExternalLink, Info } from 'lucide-react';
import LegalDocumentReaderModal from './LegalDocumentReaderModal';

export default function LoginButtons() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/app/projects';
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Reader Modal State
  const [readerTab, setReaderTab] = useState<'terms' | 'privacy' | 'refund' | 'subprocessors' | null>(null);

  // 4 Mandatory Opt-In Checkboxes (Law of Ukraine No. 2297-VI & GDPR)
  const [consents, setConsents] = useState({
    termsPrivacy: false,
    personalData: false,
    aiSubprocessors: false,
    telegramBot: false,
  });

  // Check if all mandatory consents are accepted
  const isAllConsentsAccepted = Object.values(consents).every(Boolean);

  const toggleConsent = (key: keyof typeof consents) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAcceptAll = () => {
    setConsents({
      termsPrivacy: true,
      personalData: true,
      aiSubprocessors: true,
      telegramBot: true,
    });
  };

  // Technical Maintenance Mode toggle (Defaults to FALSE unless explicitly set to 'true')
  const isMaintenanceActive = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';

  const saveConsentMetadataToProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({
            consent_given_at: new Date().toISOString(),
            legal_consent_version: '2026.1',
            legal_consents: {
              ...consents,
              timestamp: new Date().toISOString(),
              user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
            }
          })
          .eq('id', user.id);
      }
    } catch (e) {
      console.warn('[AuthConsent] Failed to record consent metadata:', e);
    }
  };

  const handleGoogleLogin = async () => {
    if (isMaintenanceActive || !isAllConsentsAccepted) return;
    setIsLoading('google');
    try {
      await saveConsentMetadataToProfile();
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
    if (isMaintenanceActive || !isAllConsentsAccepted) return;
    setIsLoading('telegram');
    try {
      await saveConsentMetadataToProfile();
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
    <div className="space-y-5">
      {/* Document Reader Modal */}
      {readerTab && (
        <LegalDocumentReaderModal
          isOpen={!!readerTab}
          initialTab={readerTab}
          onClose={() => setReaderTab(null)}
        />
      )}

      {/* Technical Maintenance Banner (if activated) */}
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
            Ведутся технические работы. Вход и регистрация временно приостановлены.
          </div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-amber-400/60 pt-1 flex items-center gap-1">
            <Lock size={12} /> Login Locked
          </div>
        </motion.div>
      )}

      {/* Mandatory GDPR & Law No. 2297-VI Legal Consent Box */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2 font-bold text-xs text-purple-300 uppercase tracking-wider">
            <ShieldCheck size={16} className="text-purple-400" />
            <span>Legal Consent & GDPR Compliance</span>
          </div>
          {!isAllConsentsAccepted && !isMaintenanceActive && (
            <button
              onClick={handleAcceptAll}
              className="text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-500/30"
            >
              Select All
            </button>
          )}
        </div>

        <div className="space-y-2.5 text-xs text-gray-300 font-medium">
          {/* Checkbox 1: Terms & Privacy */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={consents.termsPrivacy}
              onChange={() => toggleConsent('termsPrivacy')}
              disabled={isMaintenanceActive}
              className="mt-0.5 w-4 h-4 rounded border-white/20 bg-black/40 text-purple-500 focus:ring-purple-500/40 shrink-0 cursor-pointer disabled:opacity-40"
            />
            <span className="leading-snug">
              I accept the{' '}
              <button
                type="button"
                onClick={() => setReaderTab('terms')}
                className="text-purple-400 underline font-bold hover:text-purple-300 transition-colors"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => setReaderTab('privacy')}
                className="text-purple-400 underline font-bold hover:text-purple-300 transition-colors"
              >
                Privacy Policy
              </button>.
            </span>
          </label>

          {/* Checkbox 2: Personal Data Processing (Law No. 2297-VI) */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={consents.personalData}
              onChange={() => toggleConsent('personalData')}
              disabled={isMaintenanceActive}
              className="mt-0.5 w-4 h-4 rounded border-white/20 bg-black/40 text-purple-500 focus:ring-purple-500/40 shrink-0 cursor-pointer disabled:opacity-40"
            />
            <span className="leading-snug text-gray-300/90">
              I grant explicit consent for processing my personal data under the <strong>Law of Ukraine &quot;On Protection of Personal Data&quot; (No. 2297-VI)</strong> & GDPR Art. 6/7.
            </span>
          </label>

          {/* Checkbox 3: AI Data & Subprocessors */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={consents.aiSubprocessors}
              onChange={() => toggleConsent('aiSubprocessors')}
              disabled={isMaintenanceActive}
              className="mt-0.5 w-4 h-4 rounded border-white/20 bg-black/40 text-purple-500 focus:ring-purple-500/40 shrink-0 cursor-pointer disabled:opacity-40"
            />
            <span className="leading-snug text-gray-300/90">
              I consent to input processing via secure AI APIs & third-party infrastructure listed in our{' '}
              <button
                type="button"
                onClick={() => setReaderTab('subprocessors')}
                className="text-purple-400 underline font-bold hover:text-purple-300 transition-colors"
              >
                Subprocessor Registry
              </button>.
            </span>
          </label>

          {/* Checkbox 4: Telegram Bot Integration */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={consents.telegramBot}
              onChange={() => toggleConsent('telegramBot')}
              disabled={isMaintenanceActive}
              className="mt-0.5 w-4 h-4 rounded border-white/20 bg-black/40 text-purple-500 focus:ring-purple-500/40 shrink-0 cursor-pointer disabled:opacity-40"
            />
            <span className="leading-snug text-gray-300/90">
              I agree to Telegram bot authentication, notification data handling, and account erasure rules.
            </span>
          </label>
        </div>

        {!isAllConsentsAccepted && !isMaintenanceActive && (
          <div className="pt-1 flex items-center gap-1.5 text-[11px] text-amber-400/90 font-semibold">
            <Info size={13} className="shrink-0" />
            <span>Check all boxes (or click &quot;Select All&quot;) to unlock sign-in options.</span>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="space-y-3.5">
        {/* Google Button */}
        <motion.button
          whileHover={!isMaintenanceActive && isAllConsentsAccepted ? { scale: 1.02 } : {}}
          whileTap={!isMaintenanceActive && isAllConsentsAccepted ? { scale: 0.98 } : {}}
          onClick={handleGoogleLogin}
          disabled={isMaintenanceActive || !isAllConsentsAccepted || isLoading !== null}
          className="w-full h-14 bg-white text-black font-semibold rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg"
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
          whileHover={!isMaintenanceActive && isAllConsentsAccepted ? { scale: 1.02 } : {}}
          whileTap={!isMaintenanceActive && isAllConsentsAccepted ? { scale: 0.98 } : {}}
          onClick={handleTelegramLogin}
          disabled={isMaintenanceActive || !isAllConsentsAccepted || isLoading !== null}
          className="w-full h-14 bg-[#24A1DE] text-white font-semibold rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-[#208fca] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg"
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
