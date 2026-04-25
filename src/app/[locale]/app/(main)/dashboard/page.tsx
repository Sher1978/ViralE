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
    router.push(`/${locale}/app/projects/new/script?topic=${encodeURIComponent(prompt)}&engine=${selectedEngine}`);
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

      {/* DNA LAB - Monolithic Block */}
      <section className="border-b border-white/10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group cursor-pointer"
        >
          <Link href={`/${locale}/app/profile/dna`}>
            <div className="bg-black/50 overflow-hidden relative">
              <div 
                className="relative bg-gradient-to-br from-purple-600/10 via-purple-900/30 to-transparent p-8 h-[180px] flex items-center gap-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                  <Dna className="w-6 h-6 text-purple-400" />
                </div>
                
                <div className="space-y-1">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">DNA <span className="text-purple-500">Lab</span></h2>
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">Calibrate AI Voice Shadow</p>
                </div>

                <div className="ml-auto hidden sm:block">
                   <div className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/30 group-hover:bg-purple-500 group-hover:text-black transition-all">
                      Recalibrate
                   </div>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </section>

      {/* COMMAND CENTER - Professional Input Hub */}
      <section className="space-y-0 border-b border-white/10">
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
              className="w-full bg-transparent border-none p-0 text-xl font-bold text-white placeholder:text-white/10 focus:outline-none resize-none min-h-[120px]"
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

      {/* AI Strategist Recommendations (Discover) */}
      <div className="space-y-8">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#9B5FFF]/10 flex items-center justify-center border border-[#9B5FFF]/20">
              <Compass className="w-5 h-5 text-[#9B5FFF]" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-white">
                {t('discoverTitle')}
              </h2>
              <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5">{t('discoverDesc')}</span>
            </div>
          </div>
          <div className="hidden sm:flex gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
             <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
             <div className="w-1.5 h-1.5 rounded-full bg-[#9B5FFF] animate-pulse" />
          </div>
        </div>

        {/* Discovery Feed */}
        <div className="grid grid-cols-1 gap-0 bg-black border-y border-white/10">
          {IDEAS.map((idea, i) => (
            <motion.div
              key={idea.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 + 0.3 }}
              className="group border-b border-white/10 last:border-0"
            >
              <div className="bg-white/[0.02] p-8 flex flex-col space-y-6 hover:bg-white/[0.05] transition-all duration-500 cursor-pointer relative overflow-hidden"
                   onClick={() => router.push(`/app/projects/new/script?topic=${encodeURIComponent(idea.topic)}`)}>
                
                <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                   <ArrowRight className="w-6 h-6 text-[#00FFCC]" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-4 rounded-full" style={{ background: idea.tagColor }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: idea.tagColor }}>
                      {idea.tag}
                  </span>
                </div>

                <h3 className="text-2xl font-black text-white/90 leading-[1.1] tracking-tight group-hover:text-white transition-colors max-w-sm">
                  {idea.topic}
                </h3>

                <div className="flex flex-col space-y-6">
                  <div className="p-5 bg-black/40 border border-white/5 group-hover:border-[#00FFCC]/20 transition-colors">
                    <p className="text-[12px] text-white/40 leading-relaxed font-semibold italic line-clamp-3">
                      &ldquo;{idea.reason}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-col">
                       <span className="text-[28px] font-black leading-none mb-1" style={{ color: idea.tagColor }}>{idea.viral}%</span>
                       <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{t('viralLabel')}</span>
                    </div>
                    
                    <button className="flex items-center gap-3 px-6 py-3.5 bg-white shadow-xl text-black rounded-xl text-[11px] font-black uppercase tracking-tighter transition-all group-hover:scale-105 active:scale-95">
                      {t('boostToStudio')}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Global Hub Access */}
        <Link href={`/${locale}/app/archive`} className="block px-1">
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="py-10 border border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-white/10 hover:text-white/40 hover:border-white/20 hover:bg-white/[0.01] transition-all group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/5 group-hover:scale-110 group-hover:border-white/20 transition-all">
              <Monitor className="w-6 h-6" />
            </div>
            <div className="text-center">
              <span className="text-[12px] font-black uppercase tracking-[0.4em] block">{mocks('viewAllIdeas')}</span>
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] mt-1 opacity-40">Access Personal Library Hub</span>
            </div>
          </motion.div>
        </Link>
      </div>

      <PremiumLimitModal 
        isOpen={!!error}
        onClose={() => setError(null)}
        title={locale === 'ru' ? 'Внимание' : 'Attention'}
        description={error || ''}
        type="tier"
        locale={locale}
      />
    </div>
  );
}
