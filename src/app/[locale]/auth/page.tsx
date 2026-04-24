'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Link } from '@/navigation';
import LoginButtons from '@/components/auth/LoginButtons';
import { Sparkles, Bot, Terminal } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push(`/${locale}/app/projects`);
      }
    };
    checkUser();
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
          
            <div className="text-center mb-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-6"
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
              className="mb-10 p-5 rounded-2xl bg-white/[0.03] border border-white/10 relative group hover:bg-white/[0.05] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-400">{t('strategistGreeting')}</span>
                    <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">
                    {t('strategistPrompt')}
                  </p>
                </div>
              </div>
              <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Terminal className="w-12 h-12 rotate-[-15deg]" />
              </div>
            </motion.div>

          <LoginButtons />

          <div className="mt-10 pt-8 border-t border-white/5 space-y-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-medium text-center">
              {t('footer')}
            </p>
            <div className="flex flex-col gap-2 items-center">
              <span className="text-[9px] text-white/20 uppercase tracking-[0.3em] italic">{t('aestheticPhrase1')}</span>
              <span className="text-[9px] text-white/20 uppercase tracking-[0.3em] italic">{t('aestheticPhrase2')}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Aesthetic Footer Branding */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-20 flex items-center gap-2 grayscale group hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
        <span className="text-xs font-black tracking-[0.4em] uppercase italic">Virale<span className="text-cyan-400">.uno</span></span>
      </div>
    </main>
  );
}
