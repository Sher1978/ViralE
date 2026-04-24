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
    <div className="space-y-12 pb-40 px-1">
      {/* Neural Status Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00FFCC] animate-pulse" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[#00FFCC] blur-md animate-pulse opacity-50" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 leading-none">Neural Hub</span>
            <span className="text-[8px] font-bold text-[#00FFCC]/60 uppercase tracking-[0.2em] mt-1">Profile: Active & Synced</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex flex-col items-end">
             <CreditBadge credits={user?.credits_balance || 0} packs={Math.floor((user?.credits_balance || 0) / 100)} />
             <Link href={`/${locale}/app/billing`} className="mt-1.5 group">
                <span className="text-[9px] text-white/20 group-hover:text-[#D4AF37] transition-colors uppercase tracking-widest font-black flex items-center gap-1">
                  {common('topUp')} <ChevronRight className="w-3 h-3" />
                </span>
             </Link>
           </div>
        </div>
      </div>

      {/* DNA Calibration Lab Peek */}
      <section className="relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-premium rounded-[2.5rem] p-8 border border-white/5 overflow-hidden group hover:border-[#9B5FFF]/30 transition-all duration-700"
        >
          {/* Animated Background Gradients */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full group-hover:bg-[#9B5FFF]/10 transition-colors duration-1000" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#9B5FFF]/5 blur-[80px] rounded-full" />
          
          <div className="flex flex-col lg:flex-row gap-10 relative z-10">
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <Dna className="w-7 h-7 text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black uppercase tracking-tight">{t('dnaLab')}</h2>
                    <span className="text-[10px] font-black bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 uppercase">Persona-Locked</span>
                  </div>
                  <p className="text-[11px] text-white/30 font-bold uppercase tracking-widest mt-1">{t('dnaLabDesc')}</p>
                </div>
              </div>

              <div className="p-6 bg-black/40 rounded-[2rem] border border-white/5 relative group/dna overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover/dna:opacity-100 transition-opacity" />
                <div className="line-clamp-3 text-[12px] font-medium text-white/50 leading-relaxed italic relative z-10">
                  {user?.digital_shadow_prompt || "Sequence not initialized. Calibrate your DNA to lock in your production style."}
                </div>
                <div className="mt-5 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                      <div className="w-2 h-2 rounded-full bg-cyan-400/40" />
                      <div className="w-2 h-2 rounded-full bg-cyan-300/20" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/60">
                      {t('dnaStatus')}
                    </span>
                  </div>
                  <Link href={`/${locale}/app/profile/dna`}>
                    <button className="text-[10px] font-black uppercase tracking-[0.1em] px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 flex items-center gap-2 group/btn">
                      {t('dnaEdit')}
                      <Sparkles className="w-3.5 h-3.5 group-hover/btn:scale-125 transition-transform" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="lg:w-px bg-white/5 hidden lg:block self-stretch" />

            <div className="lg:w-[300px] flex flex-col justify-between space-y-6">
               <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{t('engineSelector')}</span>
                    <Cpu className="w-3.5 h-3.5 text-white/10" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5">
                    {['gemini', 'claude'].map((eng) => (
                      <button
                        key={eng}
                        onClick={() => setSelectedEngine(eng as any)}
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          selectedEngine === eng 
                            ? 'bg-white/10 text-white shadow-xl border border-white/10' 
                            : 'text-white/20 hover:text-white/40'
                        }`}
                      >
                        {eng}
                      </button>
                    ))}
                  </div>
               </div>
               
               <div className="p-4 bg-gradient-to-br from-white/5 to-transparent rounded-[1.5rem] border border-white/5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Global Reach</span>
                    <span className="text-[9px] font-bold text-emerald-500 uppercase">Optimized for Viral</span>
                  </div>
               </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Main Command Console */}
      <section className="relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-premium rounded-[3rem] p-8 space-y-8 overflow-hidden border border-white/5 shadow-2xl"
        >
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
                {t('title')} <span className="gradient-text-gold">{t('titleAccent')}</span>
              </h1>
              <div className="flex items-center gap-3 bg-white/5 p-2 rounded-full border border-white/5 w-fit">
                 <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                 <span className="text-[9px] font-black uppercase tracking-widest text-white/40 pr-2">Profile Engine Ready</span>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="flex p-1.5 bg-black/40 rounded-2xl border border-white/5 w-fit">
              {[
                { icon: Mic, label: t('modeTopic'), active: true },
                { icon: Link2, label: t('modeLink') },
                { icon: Search, label: t('modeSearch') },
              ].map((mode, i) => (
                <button
                  key={i}
                  className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] transition-all ${
                    mode.active 
                      ? 'bg-white/10 text-white shadow-lg border border-white/10' 
                      : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  <mode.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              ))}
            </div>

            {/* Input Terminal */}
            <div className="relative group">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-black/60 border border-white/5 rounded-[2rem] p-8 text-lg font-medium text-white placeholder:text-white/5 focus:outline-none focus:border-purple-500/30 transition-all resize-none min-h-[180px] shadow-inner"
                placeholder={t('placeholder')}
              />
              <div className="absolute bottom-6 right-8 flex items-center gap-4 opacity-30 group-focus-within:opacity-100 transition-opacity">
                <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-white font-mono">
                  {prompt.length > 0 ? `SIZE: ${prompt.length} CH` : 'IDLE'}
                </span>
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={!prompt.trim() || isLoading}
              className="w-full h-[72px] bg-white text-black rounded-3xl text-[15px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale group relative overflow-hidden shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 flex items-center gap-3">
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Rocket className="w-6 h-6" />}
                {t('generateBtn')}
              </span>
            </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-1">
          {IDEAS.map((idea, i) => (
            <motion.div
              key={idea.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 + 0.3 }}
              className="group"
            >
              <div className="glass-premium rounded-[2.5rem] p-7 h-full flex flex-col space-y-6 border border-white/5 hover:border-[#00FFCC]/30 transition-all duration-500 cursor-pointer relative overflow-hidden"
                   onClick={() => router.push(`/${locale}/app/projects/new/script?topic=${encodeURIComponent(idea.topic)}`)}>
                
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                   <ArrowRight className="w-6 h-6 text-[#00FFCC]" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-2 h-5 rounded-full" style={{ background: idea.tagColor }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: idea.tagColor }}>
                      {idea.tag}
                  </span>
                </div>

                <h3 className="text-2xl font-black text-white/90 leading-[1.1] tracking-tight group-hover:text-white transition-colors">
                  {idea.topic}
                </h3>

                <div className="flex-1 flex flex-col justify-end space-y-6">
                  <div className="p-5 bg-black/40 rounded-[1.5rem] border border-white/10 group-hover:border-[#00FFCC]/20 transition-colors">
                    <p className="text-[12px] text-white/40 leading-relaxed font-semibold italic line-clamp-3">
                      &ldquo;{idea.reason}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-col">
                       <span className="text-[28px] font-black leading-none mb-1" style={{ color: idea.tagColor }}>{idea.viral}%</span>
                       <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{t('viralLabel')}</span>
                    </div>
                    
                    <button className="flex items-center gap-3 px-6 py-3.5 bg-white shadow-xl text-black rounded-3xl text-[11px] font-black uppercase tracking-tighter transition-all group-hover:scale-105 active:scale-95">
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
    </div>
  );
}
