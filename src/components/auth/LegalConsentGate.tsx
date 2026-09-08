'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, CheckSquare, Square, Info, Lock } from 'lucide-react';
import LegalDocumentReaderModal from './LegalDocumentReaderModal';

export default function LegalConsentGate({ children }: { children: React.ReactNode }) {
  const [hasCheckedConsent, setHasCheckedConsent] = useState(false);
  const [needsConsentGate, setNeedsConsentGate] = useState(false);
  const [readerTab, setReaderTab] = useState<'terms' | 'privacy' | 'refund' | 'subprocessors' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [consents, setConsents] = useState({
    termsPrivacy: false,
    personalData: false,
    aiSubprocessors: false,
    telegramBot: false,
  });

  const isAllAccepted = Object.values(consents).every(Boolean);

  useEffect(() => {
    async function checkConsentStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasCheckedConsent(true);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('consent_given_at, legal_consent_version')
          .eq('id', user.id)
          .single();

        if (!profile || !profile.consent_given_at) {
          setNeedsConsentGate(true);
        }
      } catch (err) {
        console.warn('[LegalConsentGate] Failed to check consent status:', err);
      } finally {
        setHasCheckedConsent(true);
      }
    }

    checkConsentStatus();
  }, []);

  const toggleConsent = (key: keyof typeof consents) => {
    setConsents(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAcceptAll = () => {
    setConsents({
      termsPrivacy: true,
      personalData: true,
      aiSubprocessors: true,
      telegramBot: true,
    });
  };

  const handleConfirmConsents = async () => {
    if (!isAllAccepted || isSubmitting) return;
    setIsSubmitting(true);
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
      setNeedsConsentGate(false);
    } catch (e) {
      console.error('[LegalConsentGate] Failed to record consent:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasCheckedConsent) {
    return <>{children}</>;
  }

  return (
    <>
      {children}

      {/* Reader Modal */}
      {readerTab && (
        <LegalDocumentReaderModal
          isOpen={!!readerTab}
          initialTab={readerTab}
          onClose={() => setReaderTab(null)}
        />
      )}

      {/* Fullscreen Legal Consent Overlay */}
      <AnimatePresence>
        {needsConsentGate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative w-full max-w-xl bg-[#0C0C12] border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white text-left overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-4 border-b border-white/10 pb-5">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-white">Action Required: Legal Consent</h2>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    Under GDPR & Law of Ukraine No. 2297-VI, please confirm your consent before using ViralEngine.
                  </p>
                </div>
              </div>

              {/* Checkboxes List */}
              <div className="space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Mandatory Consents</span>
                  {!isAllAccepted && (
                    <button
                      onClick={handleAcceptAll}
                      className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/30"
                    >
                      Select All
                    </button>
                  )}
                </div>

                {/* 1. Terms & Privacy */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consents.termsPrivacy}
                    onChange={() => toggleConsent('termsPrivacy')}
                    className="mt-0.5 w-4 h-4 rounded border-white/20 bg-black/40 text-purple-500 focus:ring-purple-500/40 shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-gray-300 leading-normal">
                    I accept the{' '}
                    <button
                      type="button"
                      onClick={() => setReaderTab('terms')}
                      className="text-purple-400 underline font-bold"
                    >
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={() => setReaderTab('privacy')}
                      className="text-purple-400 underline font-bold"
                    >
                      Privacy Policy
                    </button>.
                  </span>
                </label>

                {/* 2. Personal Data */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consents.personalData}
                    onChange={() => toggleConsent('personalData')}
                    className="mt-0.5 w-4 h-4 rounded border-white/20 bg-black/40 text-purple-500 focus:ring-purple-500/40 shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-gray-300 leading-normal">
                    I consent to personal data processing under <strong>Law of Ukraine No. 2297-VI</strong> & GDPR Art. 6/7.
                  </span>
                </label>

                {/* 3. AI Subprocessors */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consents.aiSubprocessors}
                    onChange={() => toggleConsent('aiSubprocessors')}
                    className="mt-0.5 w-4 h-4 rounded border-white/20 bg-black/40 text-purple-500 focus:ring-purple-500/40 shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-gray-300 leading-normal">
                    I consent to processing via infrastructure listed in our{' '}
                    <button
                      type="button"
                      onClick={() => setReaderTab('subprocessors')}
                      className="text-purple-400 underline font-bold"
                    >
                      Subprocessor Registry
                    </button>.
                  </span>
                </label>

                {/* 4. Telegram */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consents.telegramBot}
                    onChange={() => toggleConsent('telegramBot')}
                    className="mt-0.5 w-4 h-4 rounded border-white/20 bg-black/40 text-purple-500 focus:ring-purple-500/40 shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-gray-300 leading-normal">
                    I agree to Telegram bot integration, account linking, and account deletion rules.
                  </span>
                </label>
              </div>

              {/* Action Button */}
              <button
                onClick={handleConfirmConsents}
                disabled={!isAllAccepted || isSubmitting}
                className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all shadow-xl shadow-purple-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock size={16} />
                    Confirm Consent & Continue
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
