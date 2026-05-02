'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Sparkles, TrendingUp, ArrowRight, Search, Link2, Mic, 
  Brain, Key, AlertTriangle, Loader2, Zap, Radio, Cpu, 
  Dna, Compass, FlaskConical, Target, Rocket, ChevronRight,
  Eye, Monitor
} from 'lucide-react';
import { CreditBadge } from '@/components/ui/CreditBadge';
import { useRouter } from '@/navigation';
import { useState, useEffect } from 'react';
import { profileService, Profile } from '@/lib/services/profileService';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumLimitModal } from '@/components/ui/PremiumLimitModal';


export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const common = useTranslations('common');
  const mocks = useTranslations('mocks');
  const locale = useLocale();
  const router = useRouter();

  const [prompt, setPrompt] = useState('');
  const [selectedEngine, setSelectedEngine] = useState<'gemini' | 'claude' | 'claude-byok' | 'groq'>('gemini');
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadProfile() {
      try {
        const p = await profileService.getOrCreateProfile();
        setUser(p);
      } catch (err) {
        console.error('Error loading profile:', err);
      }
    }
    loadProfile();
  }, []);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    router.push(`/app/projects/new/script?topic=${encodeURIComponent(prompt)}&engine=${selectedEngine}`);
  };

  const IDEAS = [
    {
      id: 1,
      topic: mocks('idea1Topic'),
      viral: 91,
      reason: mocks('idea1Reason'),
      tag: t('tagTrend'),
      tagColor: '#00FFCC',
    },
    {
      id: 2,
      topic: mocks('idea2Topic'),
      viral: 84,
      reason: mocks('idea2Reason'),
      tag: t('tagViral'),
      tagColor: '#D4AF37',
    },
    {
      id: 3,
      topic: mocks('idea3Topic'),
      viral: 78,
      reason: mocks('idea3Reason'),
      tag: t('tagEver'),
      tagColor: '#9B5FFF',
    },
  ];

  if (!mounted) return null;

  return (
    <div className="space-y-0 pb-40 max-w-5xl mx-auto overflow-x-hidden">
      {/* Minimal Header - Aligned with Global Strategist */}
      <div className="flex items-center justify-between pt-4 mb-8 pl-16 pr-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
          <h1 className="text-xs font-black uppercase tracking-[0.4em] text-white/40 italic">System <span className="text-white/20">Online</span></h1>
        </div>
        <div className="flex items-center gap-4">
           <CreditBadge credits={user?.credits_balance || 0} packs={Math.floor((user?.credits_balance || 0) / 100)} />
        </div>
      </div>

      {/* COMMAND CENTER - Professional Input Hub */}
      <section className="space-y-0 border-b border-white/10 pt-10">
        <div className="flex items-baseline justify-between pt-8 pb-4 pl-16 pr-4">
           <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Command <span className="text-cyan-500">Hub</span></h2>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative bg-black"
        >
          <div className="bg-white/[0.02] p-8 space-y-6 relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-transparent border-none p-0 text-xl font-bold text-white placeholder:text-white/10 focus:outline-none resize-none min-h-[160px]"
              placeholder="Inject your content idea..."
            />
            
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
               <div className="flex gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-xl border border-white/5">
                     <Cpu className="w-3.5 h-3.5 text-cyan-500" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{selectedEngine}</span>
                  </div>
               </div>

               <button 
                onClick={handleGenerate}
                disabled={!prompt.trim() || isLoading}
                className="px-10 h-[60px] bg-white text-black rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-20"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                Launch Session
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      <PremiumLimitModal 
        isOpen={!!error}
        onClose={() => setError(null)}
        title={locale === 'ru' ? 'Сбой Системы' : 'System Notice'}
        description={error || ''}
        advice={locale === 'ru' ? 'Попробуй проверить соединение или освежить сессию. Конвейер иногда требует перезагрузки.' : 'Try checking your connection or refreshing your session. The engine occasionally needs a restart.'}
        type="error"
        locale={locale}
      />
    </div>
  );
}
