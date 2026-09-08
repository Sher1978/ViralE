'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/navigation';
import LoginButtons from '@/components/auth/LoginButtons';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { Sparkles, Bot, Terminal } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from '@/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Redirect to Studio (Projects hub)
        router.push(`/app/projects`);
      }
    };
    checkUser();

    // Listen for hash-based auth resolution (implicit flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('[AuthPage] Caught SIGNED_IN event, redirecting to projects');
        router.push(`/app/projects`);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, locale]);

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center relative overflow-hidden p-6">
      {/* Background Neon Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-grid opacity-[0.03]" />

      {/* Decorative Factory Text */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none select-none">
        <span className="text-[15rem] font-black tracking-tighter uppercase tracking-[0.1em]">{t('titleAccent')}</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md pt-12"
      >
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
          {/* Internal Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/10 blur-[60px] rounded-full" />
          
            <div className="text-center mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest mb-4"
              >
                <Terminal className="w-3 h-3" />
                {t('greeting')}
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-black uppercase tracking-tight mb-4"
              >
                {t('title')} <span className="gradient-text-cosmic text-glow-mint">{t('titleAccent')}</span>
              </motion.h1>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                {t('subtitle')}
              </p>
            </div>

            {/* AI Strategist Message */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-8 p-5 rounded-2xl bg-white/[0.03] border border-white/10 relative group hover:bg-white/[0.05] transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-400">{t('strategistGreeting')}</span>
                    <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">
                    {t('strategistPrompt')}
                  </p>
                </div>
              </div>
            </motion.div>

          <LoginButtons />

          <div className="mt-8 pt-6 border-t border-white/10 space-y-4 text-center">
            {/* Legal Documents Footer */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-400">
              <Link href="/terms" target="_blank" className="hover:text-purple-400 transition-colors font-medium">
                Terms of Service
              </Link>
              <span>•</span>
              <Link href="/privacy" target="_blank" className="hover:text-purple-400 transition-colors font-medium">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link href="/subprocessors" target="_blank" className="hover:text-purple-400 transition-colors font-medium">
                Subprocessor Registry
              </Link>
              <span>•</span>
              <Link href="/refund" target="_blank" className="hover:text-purple-400 transition-colors font-medium">
                Refund Policy
              </Link>
            </div>
            <p className="text-[10px] text-gray-500 font-medium">
              Law of Ukraine No. 2297-VI & GDPR Art. 6/7 Compliant Platform
            </p>
          </div>
        </div>
      </motion.div>

      {/* Aesthetic Footer Branding */}
      <div className="mt-8 opacity-40 flex items-center gap-2 text-xs font-bold tracking-widest text-gray-400">
        <span>VIRALI ENGINE © 2026</span>
      </div>
    </main>
  );
}
