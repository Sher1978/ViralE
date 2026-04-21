'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Link } from '@/navigation';
import LoginButtons from '@/components/auth/LoginButtons';

export default function AuthPage() {
  const t = useTranslations('auth');

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center relative overflow-hidden p-6">
      {/* Background Neon Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors mb-12 group"
        >
          <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
          {t('backToLanding')}
        </Link>

        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
          {/* Internal Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/10 blur-[60px] rounded-full" />
          
          <div className="text-center mb-10">
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-bold tracking-tight mb-4"
            >
              {t('title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">{t('titleAccent')}</span>
            </motion.h1>
            <p className="text-gray-400 text-sm md:text-base">
              {t('subtitle')}
            </p>
          </div>

          <LoginButtons />

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-medium">
              {t('footer')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Aesthetic Footer Branding */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-20 flex items-center gap-2">
        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-black rounded-sm transform rotate-45" />
        </div>
        <span className="text-xs font-bold tracking-widest uppercase">Viral Engine</span>
      </div>
    </main>
  );
}
