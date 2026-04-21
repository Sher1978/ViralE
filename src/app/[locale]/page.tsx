'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Play, 
  ArrowRight, 
  Star, 
  Cpu, 
  Video, 
  MessageSquare, 
  Layout, 
  Smartphone,
  Zap,
  Globe,
  Lock
} from 'lucide-react';

// Custom Store Badge Component (Mockup)
const StoreBadge = ({ type, text }: { type: 'apple' | 'google', text: string }) => (
  <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
    <Smartphone className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
    <div className="text-left">
      <div className="text-[10px] text-white/40 uppercase tracking-tight leading-none">Download on</div>
      <div className="text-xs font-bold text-white leading-none">{text}</div>
    </div>
  </div>
);

export default function LandingPage() {
  const t = useTranslations('landing');
  const locale = useLocale();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Zap className="w-5 h-5 text-white fill-current" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase italic">Virale<span className="text-cyan-400">.uno</span></span>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/${locale === 'ru' ? 'en' : 'ru'}`} className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
            {locale === 'ru' ? 'English' : 'Русский'}
          </Link>
          <Link href={`/${locale}/dashboard`} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">
            Login
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 lg:py-24 space-y-32">
        
        {/* HERO SECTION */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="flex flex-col items-center text-center space-y-10"
        >
          {/* AI Tech Badge */}
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/5 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
              <Sparkles className="w-3 h-3" />
              <span>{t('badge')}</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div variants={itemVariants} className="space-y-6">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] uppercase">
              {t('title')}<br />
              <span className="gradient-text-cosmic text-glow-cyan">
                {t('titleAccent')}
              </span>
            </h1>
            <p className="text-white/50 text-lg md:text-xl max-w-xl mx-auto font-medium leading-relaxed">
              {t('subtitle')}
            </p>
          </motion.div>

          {/* Main CTA */}
          <motion.div variants={itemVariants} className="flex flex-col items-center gap-6 w-full max-w-md">
            <Link href={`/${locale}/onboarding`} className="w-full">
              <button className="w-full py-6 rounded-2xl bg-white text-black font-black text-xl uppercase tracking-tight flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-white/10">
                <Play className="w-5 h-5 fill-current" />
                {t('cta')}
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            
            <div className="flex gap-4 w-full justify-center">
              <StoreBadge type="apple" text={t('appStore')} />
              <StoreBadge type="google" text={t('googlePlay')} />
            </div>
          </motion.div>

          {/* Rating */}
          <motion.div variants={itemVariants} className="space-y-2">
            <div className="flex justify-center gap-1 text-yellow-400">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
            </div>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-bold">Trusted by 10k+ Creators</p>
          </motion.div>
        </motion.section>

        {/* SINGLE WINDOW HUB VISUAL */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="relative py-20"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-purple-500/5 rounded-[4rem] blur-3xl opacity-50" />
          
          <div className="relative glass-card rounded-[3rem] p-12 lg:p-20 overflow-hidden">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              
              {/* Input Side */}
              <div className="w-full lg:w-1/3 space-y-6">
                <div className="inline-flex px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40">Input</div>
                <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">{t('featureHub')}</h3>
                <p className="text-white/50 text-sm">{t('featureHubSub')}</p>
                
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-cyan-400 fill-current" />
                    </div>
                    <div className="h-2 w-32 bg-white/10 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-1/2 h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent" 
                       />
                    </div>
                  </div>
                  <div className="text-xs text-white/30 font-mono italic"># Generating viral strategy...</div>
                </div>
              </div>

              {/* Central Divider / Engine */}
              <div className="hidden lg:flex flex-col items-center justify-center relative h-64">
                <div className="w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-32 h-32 rounded-full border border-white/5 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border border-white/10 animate-pulse" />
                  </div>
                </motion.div>
                <div className="absolute w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                  <Zap className="w-6 h-6 text-cyan-400 fill-current" />
                </div>
              </div>

              {/* Output Side */}
              <div className="w-full lg:w-1/2 grid grid-cols-2 gap-4">
                {[
                  { icon: Video, label: 'Viral Video', color: 'text-rose-400' },
                  { icon: Layout, label: 'Carousel', color: 'text-purple-400' },
                  { icon: MessageSquare, label: 'Deep Articles', color: 'text-cyan-400' },
                  { icon: Zap, label: 'Daily Shorts', color: 'text-amber-400' }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-center text-center space-y-3"
                  >
                    <div className={`p-4 rounded-2xl bg-white/5 ${item.color} border border-current/20 shadow-inner`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/70">{item.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* KILLER FEATURES GRID */}
        <section className="space-y-10">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black uppercase tracking-tighter">Production Stack 2.0</h2>
            <p className="text-white/40 uppercase text-[10px] font-bold tracking-[0.4em]">Everything you need to scale</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1: AI Consultant */}
            <motion.div 
              whileHover={{ y: -8 }}
              className="group glass-card rounded-[2.5rem] p-8 space-y-10 border-white/5 hover:border-cyan-500/30 transition-all overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 p-12 bg-cyan-500/10 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <Globe className="w-7 h-7" />
              </div>
              <div className="space-y-4 relative z-10">
                <h4 className="text-2xl font-black uppercase tracking-tighter">{t('featureConsultant')}</h4>
                <p className="text-white/50 text-sm leading-relaxed">{t('featureConsultantSub')}</p>
              </div>
            </motion.div>

            {/* Feature 2: Teleprompter */}
            <motion.div 
              whileHover={{ y: -8 }}
              className="group glass-card rounded-[2.5rem] p-8 space-y-10 border-white/5 hover:border-purple-500/30 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-12 bg-purple-500/10 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Smartphone className="w-7 h-7" />
              </div>
              <div className="space-y-4 relative z-10">
                <h4 className="text-2xl font-black uppercase tracking-tighter">{t('featurePrompter')}</h4>
                <p className="text-white/50 text-sm leading-relaxed">{t('featurePrompterSub')}</p>
              </div>
            </motion.div>

            {/* Feature 3: Factory */}
            <motion.div 
              whileHover={{ y: -8 }}
              className="group glass-card rounded-[2.5rem] p-8 space-y-10 border-white/5 hover:border-white/20 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-12 bg-white/10 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                <Cpu className="w-7 h-7" />
              </div>
              <div className="space-y-4 relative z-10">
                <h4 className="text-2xl font-black uppercase tracking-tighter">{t('featureFactory')}</h4>
                <p className="text-white/50 text-sm leading-relaxed">{t('featureFactorySub')}</p>
              </div>
            </motion.div>

          </div>
        </section>

        {/* BOTTOM CTA */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center py-20 border-t border-white/5 space-y-12"
        >
          <div className="space-y-6">
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic">Ready for <span className="text-glow-cyan">Takeoff?</span></h2>
            <p className="text-white/40 max-w-lg mx-auto">Start your content production today. Your first 100 credits are on us.</p>
          </div>
          
          <div className="flex flex-col items-center gap-8">
            <Link href={`/${locale}/onboarding`} className="group relative">
               <div className="absolute inset-0 bg-white blur-[20px] opacity-20 group-hover:opacity-40 transition-opacity" />
               <button className="relative px-12 py-6 rounded-2xl bg-white text-black font-black text-xl uppercase tracking-tighter flex items-center gap-4 transition-transform hover:scale-[1.05]">
                {t('startOnboarding')}
                <Zap className="w-6 h-6 fill-current" />
              </button>
            </Link>
            
             <div className="flex gap-4 opacity-50 hover:opacity-100 transition-opacity">
              <StoreBadge type="apple" text={t('appStore')} />
              <StoreBadge type="google" text={t('googlePlay')} />
            </div>
          </div>
        </motion.section>

      </main>

      <footer className="relative z-10 py-12 border-t border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 grayscale brightness-50">
            <Zap className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-tighter italic">Virale<span className="text-white/50">.uno</span></span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/20">{t('footer')}</p>
          <div className="flex gap-6">
            <Link href="#" className="p-2 rounded-lg bg-white/5 text-white/30 hover:text-white transition-colors"><Globe className="w-4 h-4" /></Link>
            <Link href="#" className="p-2 rounded-lg bg-white/5 text-white/30 hover:text-white transition-colors"><Lock className="w-4 h-4" /></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
