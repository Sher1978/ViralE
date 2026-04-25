'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { 
  Zap, 
  ArrowRight, 
  Play, 
  Dna,
  Cpu,
  Layers,
  Sparkles,
  Smartphone,
  ChevronRight,
  Globe,
  Share2,
  Clock,
  TrendingDown,
  CircleDollarSign,
  CheckCircle2,
  Star,
  ZapOff
} from 'lucide-react';
import { Link } from '@/navigation';
import { useState } from 'react';

// Reusable components from main landing or adapted
const PremiumDnaIcon = ({ className = "w-8 h-8" }) => (
  <div className={`relative ${className} group/dna flex items-center justify-center`}>
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="v2DnaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="1" />
          <stop offset="100%" stopColor="#00FFCC" stopOpacity="1" />
        </linearGradient>
      </defs>
      {[...Array(12)].map((_, i) => (
        <motion.g key={i}>
          <motion.circle
            cx="50"
            cy={15 + i * 6}
            r="2"
            fill="url(#v2DnaGradient)"
            animate={{ cx: [38, 62, 38], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.15 }}
          />
          <motion.circle
            cx="50"
            cy={15 + i * 6}
            r="2"
            fill="url(#v2DnaGradient)"
            animate={{ cx: [62, 38, 62], opacity: [1, 0.4, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.15 }}
          />
        </motion.g>
      ))}
    </svg>
  </div>
);

export default function LandingV2Page() {
  const t = useTranslations('landingV2');
  const navT = useTranslations('nav');
  const locale = useLocale();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any }
    }
  };

  return (
    <div className="min-h-screen bg-[#020408] text-white selection:bg-sherlock-gold/30 overflow-x-hidden font-sans">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-sherlock-gold/[0.05] blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[60%] h-[60%] bg-neon-mint/[0.03] blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 bg-grid opacity-[0.02]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex justify-between items-center px-8 py-8 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sherlock-gold to-sherlock-gold-bright flex items-center justify-center shadow-lg shadow-sherlock-gold/20 group cursor-pointer">
            <Zap className="w-6 h-6 text-black fill-current group-hover:rotate-12 transition-transform" />
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase italic">
            {t('hero.title')}
          </span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:flex items-center gap-10"
        >
          {['works', 'outputs', 'pricing'].map((item) => (
            <Link key={item} href={`#${item}`} className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 hover:text-sherlock-gold transition-colors">
              {t(`nav.${item}`)}
            </Link>
          ))}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6"
        >
          <div className="flex items-center gap-6 mr-2">
             <Link href="/landing-v2" locale={locale === 'ru' ? 'en' : 'ru'} className="group flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">
                {locale === 'ru' ? 'EN' : 'RU'}
              </span>
              <Globe className="w-3.5 h-3.5 text-white/20 group-hover:text-sherlock-gold transition-colors" />
            </Link>
          </div>
          <Link href="/auth">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 rounded-full bg-sherlock-gold text-black text-[11px] font-black uppercase tracking-[0.2em] shadow-glow-gold hover:bg-sherlock-gold-bright transition-all"
            >
              {t('hero.cta')}
            </motion.button>
          </Link>
        </motion.div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-20 space-y-48">
        
        {/* HERO SECTION */}
        <section className="relative pt-20 pb-32 flex flex-col items-center text-center space-y-16">
          <div className="space-y-6 max-w-4xl z-10">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-block px-6 py-2 glass-mint rounded-full border border-neon-mint/30 mb-4"
            >
              <span className="text-neon-mint text-xs font-black uppercase tracking-[0.3em]">{t('hero.badge')}</span>
            </motion.div>
            <h1 className="text-7xl md:text-[8rem] font-black uppercase tracking-tighter leading-[0.85] italic">
              {t('hero.title')}
            </h1>
            <p className="text-white/40 text-xl md:text-2xl max-w-2xl mx-auto font-medium leading-relaxed">
              {t('hero.subtitle')}
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col md:flex-row items-center gap-6"
          >
            <Link href="/auth">
              <button className="px-12 py-6 rounded-full bg-sherlock-gold text-black font-black text-xl uppercase tracking-tighter shadow-glow-gold hover:scale-105 transition-all">
                {t('hero.cta')}
              </button>
            </Link>
            <span className="text-white/20 text-xs font-black uppercase tracking-widest">{t('hero.scrollHint')}</span>
          </motion.div>

          {/* Main Visual: Smartphone Mockup LOWERED with 5 Floating Previews in FOREGROUND */}
          <div className="relative mt-10 md:mt-20 flex justify-center w-full min-h-[700px] md:min-h-[900px]">
             {/* THE SMARTPHONE - Positioned Lower */}
             <motion.div 
                initial={{ y: 200, opacity: 0 }}
                whileInView={{ y: 250, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
                className="relative z-0 w-full max-w-[260px] md:max-w-[340px] aspect-[9/19] glass-dark rounded-[3.5rem] border border-white/10 shadow-2xl p-3 overflow-hidden brightness-50 grayscale-[0.3]"
             >
                <img 
                  src="/v2/hero.png" 
                  alt="App Interface" 
                  className="w-full h-full object-cover rounded-[2.8rem]"
                />
             </motion.div>

             {/* 5 Floating Preview Images - Larger and in the foreground (z-20) */}
             <div className="absolute inset-0 z-20 pointer-events-none">
                
                {/* 1. Viral Video Preview (Center-Left) */}
                <motion.div 
                  initial={{ x: -150, y: 100, opacity: 0, rotate: -15 }}
                  whileInView={{ x: -200, y: 0, opacity: 1, rotate: -8 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8, type: "spring", stiffness: 40 }}
                  className="absolute left-1/2 -translate-x-[180%] top-[10%] w-64 md:w-96 glass p-2 rounded-3xl shadow-3xl border-neon-mint/40 backdrop-blur-xl"
                >
                  <img src="/v2/showcase.png" className="rounded-2xl aspect-[9/16] object-cover" alt="Video" />
                  <div className="absolute top-6 right-6 bg-neon-mint text-black text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-glow-mint">VIDEO</div>
                </motion.div>

                {/* 2. Thumbnail Cover Preview (Center-Right) */}
                <motion.div 
                  initial={{ x: 150, y: 150, opacity: 0, rotate: 15 }}
                  whileInView={{ x: 160, y: 50, opacity: 1, rotate: 5 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.0, type: "spring", stiffness: 35 }}
                  className="absolute left-1/2 -translate-x-[0%] top-[20%] w-72 md:w-[28rem] glass-gold p-2 rounded-3xl shadow-3xl border-sherlock-gold/40 backdrop-blur-xl"
                >
                  <img src="/v2/cover.png" className="rounded-2xl aspect-[16/9] object-cover shadow-2xl" alt="Cover" />
                  <div className="absolute -top-4 -right-4 bg-sherlock-gold text-black text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-glow-gold">COVER</div>
                </motion.div>

                {/* 3. Social Caption Preview (Bottom-Left) */}
                <motion.div 
                  initial={{ x: -250, y: 300, opacity: 0, scale: 0.8 }}
                  whileInView={{ x: -160, y: 320, opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.2, type: "spring" }}
                  className="absolute left-1/2 -translate-x-[160%] top-[40%] w-64 md:w-[22rem] glass p-6 rounded-3xl border-white/20 shadow-2xl backdrop-blur-2xl"
                >
                  <img src="/v2/social.png" className="w-full h-auto rounded-xl mb-4 opacity-90" alt="Caption" />
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-white/20 rounded-full" />
                    <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                  </div>
                  <div className="mt-6 text-[10px] font-black uppercase text-neon-mint tracking-widest">SOCIAL TEXT</div>
                </motion.div>

                {/* 4. Production Hub (Bottom-Right, overlapping phone) */}
                <motion.div 
                  initial={{ x: 200, y: 450, opacity: 0 }}
                  whileInView={{ x: 100, y: 400, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.4 }}
                  className="absolute left-1/2 -translate-x-[0%] top-[50%] w-56 md:w-80 glass-dark p-3 rounded-2xl border-white/10 shadow-2xl rotate-12 backdrop-blur-xl"
                >
                  <img src="/v2/flow.png" className="rounded-xl w-full h-auto grayscale brightness-75 opacity-60" alt="Flow" />
                </motion.div>

                {/* 5. Success/Badge (Top-Center, covering phone top) */}
                <motion.div 
                  initial={{ y: -100, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.6, ease: "backOut" }}
                  className="absolute left-1/2 -translate-x-1/2 top-[0%] glass-mint px-10 py-5 rounded-2xl border-neon-mint/30 shadow-glow-mint backdrop-blur-3xl z-30 scale-125"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-full bg-neon-mint flex items-center justify-center text-black">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] font-black text-neon-mint uppercase tracking-widest">{t('showcase.title')}</div>
                      <div className="text-2xl font-black text-white uppercase italic leading-none">AI ENGINE</div>
                    </div>
                  </div>
                </motion.div>

             </div>

             {/* Background Effects - Tech-Zen Atmosphere */}
             <div className="absolute inset-0 -z-10 mt-40">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-sherlock-gold/10 rounded-full blur-[180px]" />
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-neon-mint/5 rounded-full blur-[140px]" />
             </div>
          </div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-20 z-10 w-full max-w-4xl">
            <div className="flex flex-col items-center space-y-2 glass p-8 rounded-3xl border-white/5">
              <span className="text-neon-mint font-black text-4xl tracking-tighter italic">10×</span>
              <span className="text-white/40 text-[10px] uppercase font-bold tracking-[0.3em]">{t('hero.stats.content')}</span>
            </div>
            <div className="flex flex-col items-center space-y-2 glass p-8 rounded-3xl border-white/5">
              <span className="text-sherlock-gold font-black text-4xl tracking-tighter italic">6+</span>
              <span className="text-white/40 text-[10px] uppercase font-bold tracking-[0.3em]">{t('hero.stats.outputs')}</span>
            </div>
            <div className="flex flex-col items-center space-y-2 glass p-8 rounded-3xl border-white/5">
              <span className="text-white font-black text-4xl tracking-tighter italic">1</span>
              <span className="text-white/40 text-[10px] uppercase font-bold tracking-[0.3em]">{t('hero.stats.prompt')}</span>
            </div>
          </motion.div>
        </section>

        {/* PROBLEM SECTION */}
        <section id="problem" className="space-y-24">
          <div className="flex flex-col items-center text-center space-y-6">
            <span className="text-sherlock-gold text-[10px] font-black uppercase tracking-[0.4em]">{t('problem.label')}</span>
            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter max-w-4xl">{t('problem.title')}</h2>
            <p className="text-white/40 text-xl md:text-2xl max-w-3xl mx-auto font-medium">{t('problem.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-10 rounded-[3rem] border-white/5 space-y-6 hover:border-sherlock-gold/20 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                <Clock className="w-8 h-8 text-sherlock-gold" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">{t('problem.item1Title')}</h3>
              <p className="text-white/40 font-medium leading-relaxed">{t('problem.item1Desc')}</p>
            </div>
            <div className="glass p-10 rounded-[3rem] border-white/5 space-y-6 hover:border-neon-mint/20 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                <CircleDollarSign className="w-8 h-8 text-neon-mint" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">{t('problem.item2Title')}</h3>
              <p className="text-white/40 font-medium leading-relaxed">{t('problem.item2Desc')}</p>
            </div>
            <div className="glass p-10 rounded-[3rem] border-white/5 space-y-6 hover:border-white/20 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                <TrendingDown className="w-8 h-8 text-white/60" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">{t('problem.item3Title')}</h3>
              <p className="text-white/40 font-medium leading-relaxed">{t('problem.item3Desc')}</p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS / FLOW */}
        <section id="works" className="space-y-24">
          <div className="flex flex-col lg:flex-row items-end justify-between gap-10 border-b border-white/5 pb-10">
            <div className="space-y-4">
              <span className="text-sherlock-gold text-[10px] font-black uppercase tracking-[0.4em]">{t('process.label')}</span>
              <h2 className="text-6xl font-black uppercase tracking-tighter">{t('process.title')}</h2>
            </div>
            <p className="text-white/40 max-w-sm text-right font-medium">
              We've engineered a sequence that maximizes impact while minimizing effort.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="grid grid-cols-1 gap-8">
              {[
                { id: t('process.step1Number'), title: t('process.step1Title'), desc: t('process.step1Desc'), icon: Dna, color: 'gold' },
                { id: t('process.step2Number'), title: t('process.step2Title'), desc: t('process.step2Desc'), icon: Cpu, color: 'mint' },
                { id: t('process.step3Number'), title: t('process.step3Title'), desc: t('process.step3Desc'), icon: Share2, color: 'gold' }
              ].map((step, i) => (
                <motion.div 
                  key={step.id}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.2 }}
                  viewport={{ once: true }}
                  className="group relative flex gap-8 p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-sherlock-gold/20 hover:bg-sherlock-gold/[0.02] transition-all"
                >
                  <div className="text-4xl font-black text-white/5 group-hover:text-sherlock-gold/10 transition-colors uppercase italic">{step.id}</div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <step.icon className={`w-5 h-5 text-sherlock-gold`} />
                      <h4 className="text-xl font-black uppercase tracking-tight">{step.title}</h4>
                    </div>
                    <p className="text-white/40 font-medium leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="relative glass rounded-[3rem] overflow-hidden border-white/10 group">
              <img 
                src="/v2/flow.png" 
                alt="Production Pipeline" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3000ms]"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-sherlock-gold/20 via-transparent to-transparent opacity-40" />
            </div>
          </div>
        </section>

        {/* NEURAL SYNTHESIS SECTION */}
        <section className="relative py-24">
          <div className="absolute inset-0 bg-sherlock-gold/[0.02] blur-[120px] rounded-full" />
          <div className="relative glass rounded-[4rem] p-16 md:p-24 border-white/10 flex flex-col items-center text-center space-y-12">
            <PremiumDnaIcon className="w-32 h-32" />
            <div className="space-y-6 max-w-3xl">
              <span className="text-sherlock-gold text-[10px] font-black uppercase tracking-[0.4em]">{t('dna.label')}</span>
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">{t('dna.title')}</h2>
              <p className="text-white/40 text-xl font-medium leading-relaxed">
                {t('dna.subtitle')}
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-neon-mint" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{t(`dna.item${i}`)}</span>
                </div>
              ))}
            </div>

            {/* DNA Visualization */}
            <div className="w-full max-w-4xl glass-dark p-8 rounded-[3rem] border-white/5 space-y-8 mt-12 bg-black/50">
                <div className="flex justify-between items-center px-4">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">{t('dna.stats.label')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-neon-mint animate-pulse" />
                    <span className="text-[10px] font-black text-neon-mint uppercase tracking-widest">CALIBRATED</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span>{t('dna.stats.tone')}</span>
                        <span className="text-sherlock-gold">98%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: '98%' }} className="h-full bg-sherlock-gold shadow-glow-gold" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span>{t('dna.stats.authority')}</span>
                        <span className="text-neon-mint">92%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: '92%' }} className="h-full bg-neon-mint shadow-glow-mint" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center items-center p-6 border border-white/5 rounded-[2rem] bg-white/[0.02]">
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">{t('dna.stats.nicheDetected')}</div>
                    <div className="text-xl font-black text-white uppercase italic tracking-tight">{t('dna.stats.nicheValue')}</div>
                  </div>
                </div>
            </div>
          </div>
        </section>

        {/* OUTPUT SHOWCASE */}
        <section id="outputs" className="space-y-24">
          <div className="text-center space-y-4">
            <span className="text-neon-mint text-[10px] font-black uppercase tracking-[0.4em]">{t('showcase.label')}</span>
            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter">{t('showcase.title')}</h2>
            <p className="text-white/40 text-xl font-medium">{t('showcase.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
            {/* Primary Video Showcase */}
            <div className="lg:col-span-8 glass p-2 rounded-[3.5rem] border-white/10 shadow-2xl relative overflow-hidden group">
               <div className="relative aspect-video rounded-[3rem] overflow-hidden">
                <img src="/v2/showcase.png" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[5s]" />
                <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-12 space-y-6">
                  <div className="inline-block px-4 py-1.5 glass rounded-full border border-neon-mint/30 w-fit">
                    <span className="text-neon-mint text-[10px] font-black uppercase tracking-widest">{t('showcase.videoBadge')}</span>
                  </div>
                  <h3 className="text-4xl font-black uppercase tracking-tighter">{t('showcase.videoTitle')}</h3>
                  <p className="text-white/60 max-w-lg">{t('showcase.videoDesc')}</p>
                </div>
               </div>
            </div>

            {/* Secondary Showcase (Carousel/Other) */}
            <div className="lg:col-span-4 flex flex-col gap-8">
              <div className="flex-1 glass p-8 rounded-[3rem] border-white/5 space-y-4 flex flex-col justify-center">
                 <div className="flex items-center gap-4">
                    <Smartphone className="w-8 h-8 text-sherlock-gold" />
                    <div>
                      <h4 className="text-xl font-black uppercase tracking-tight">{t('showcase.instaTitle')}</h4>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{t('showcase.instaDesc')}</p>
                    </div>
                 </div>
                 <p className="text-white/40 text-sm leading-relaxed">{t('showcase.instaSub')}</p>
              </div>
              <div className="flex-1 glass p-8 rounded-[3rem] border-white/5 space-y-4 flex flex-col justify-center">
                 <div className="flex items-center gap-4">
                    <Layers className="w-8 h-8 text-neon-mint" />
                    <div>
                      <h4 className="text-xl font-black uppercase tracking-tight">{t('showcase.socialTitle')}</h4>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{t('showcase.socialDesc')}</p>
                    </div>
                 </div>
                 <p className="text-white/40 text-sm leading-relaxed">{t('showcase.socialSub')}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-12">
            <div className="px-10 py-4 glass-dark rounded-full border-white/10 shadow-glow-gold backdrop-blur-xl">
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic">RE-RENDERED · 4K · NEURAL CALIBRATED</span>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="space-y-24">
           <div className="flex flex-col items-center text-center space-y-4">
              <span className="text-sherlock-gold text-[10px] font-black uppercase tracking-[0.4em]">{t('pricing.label')}</span>
              <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter">{t('pricing.title')}</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Free Plan */}
              <div className="glass p-12 rounded-[3.5rem] border-white/5 flex flex-col space-y-8 relative overflow-hidden group">
                 <div className="space-y-2">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white/40">{t('pricing.free.title')}</h3>
                    <div className="flex items-baseline gap-2">
                       <span className="text-5xl font-black tracking-tighter">{t('pricing.free.price')}</span>
                       <span className="text-white/20 text-xs font-bold uppercase tracking-widest">{t('pricing.free.period')}</span>
                    </div>
                 </div>
                 <ul className="space-y-4 flex-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                       <li key={i} className="flex items-center gap-3 text-sm text-white/40 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-white/10" />
                          {t(`pricing.free.feature${i}`)}
                       </li>
                    ))}
                 </ul>
                 <Link href="/auth">
                    <button className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">{t('pricing.free.cta')}</button>
                 </Link>
              </div>

              {/* Creator Plan */}
              <div className="glass-gold p-12 rounded-[3.5rem] border-sherlock-gold/30 flex flex-col space-y-8 relative overflow-hidden scale-105 shadow-glow-gold z-10">
                 <div className="absolute top-6 right-8 px-4 py-1 bg-sherlock-gold text-black text-[10px] font-black uppercase tracking-widest rounded-full">{t('pricing.creator.badge')}</div>
                 <div className="space-y-2">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-sherlock-gold">{t('pricing.creator.title')}</h3>
                    <div className="flex items-baseline gap-2">
                       <span className="text-5xl font-black tracking-tighter">{t('pricing.creator.price')}</span>
                       <span className="text-black/40 text-xs font-bold uppercase tracking-widest">{t('pricing.creator.period')}</span>
                    </div>
                 </div>
                 <ul className="space-y-4 flex-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                       <li key={i} className="flex items-center gap-3 text-sm text-black font-bold">
                          <CheckCircle2 className="w-4 h-4 text-black/20" />
                          {t(`pricing.creator.feature${i}`)}
                       </li>
                    ))}
                 </ul>
                 <Link href="/auth">
                    <button className="w-full py-6 rounded-2xl bg-black text-sherlock-gold font-black text-sm uppercase tracking-widest shadow-lg hover:scale-105 transition-all">{t('pricing.creator.cta')}</button>
                 </Link>
              </div>

              {/* Pro Plan */}
              <div className="glass p-12 rounded-[3.5rem] border-white/5 flex flex-col space-y-8 relative overflow-hidden group">
                 <div className="space-y-2">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white/40">{t('pricing.pro.title')}</h3>
                    <div className="flex items-baseline gap-2">
                       <span className="text-5xl font-black tracking-tighter">{t('pricing.pro.price')}</span>
                       <span className="text-white/20 text-xs font-bold uppercase tracking-widest">/ month</span>
                    </div>
                 </div>
                 <ul className="space-y-4 flex-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                       <li key={i} className="flex items-center gap-3 text-sm text-white/40 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-white/10" />
                          {t(`pricing.pro.feature${i}`)}
                       </li>
                    ))}
                 </ul>
                 <Link href="/auth">
                    <button className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">{t('pricing.pro.cta')}</button>
                 </Link>
              </div>
           </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section id="testimonials" className="space-y-24">
           <div className="flex flex-col items-center text-center space-y-4">
              <span className="text-neon-mint text-[10px] font-black uppercase tracking-[0.4em]">{t('testimonials.label')}</span>
              <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter">{t('testimonials.title')}</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                 <div key={i} className="glass p-12 rounded-[3.5rem] border-white/5 space-y-8 flex flex-col">
                    <div className="flex gap-1">
                       {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-sherlock-gold text-sherlock-gold" />)}
                    </div>
                    <p className="text-xl font-medium leading-relaxed flex-1 italic text-white/80">{t(`testimonials.item${i}Text`)}</p>
                    <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                       <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-sherlock-gold font-black italic">
                          {t(`testimonials.item${i}Author`)[0]}
                       </div>
                       <div>
                          <div className="text-sm font-black uppercase tracking-widest">{t(`testimonials.item${i}Author`)}</div>
                          <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{t(`testimonials.item${i}Handle`)}</div>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </section>

        {/* FINAL CTA SECTON */}
        <section className="relative py-40 overflow-hidden rounded-[4rem]">
          <div className="absolute inset-0 bg-[#0a0c10]" />
          <img 
            src="/v2/cta.png" 
            className="absolute inset-0 w-full h-full object-cover opacity-20 filter grayscale" 
            alt="CTA Background"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020408] via-transparent to-transparent" />
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-16">
            <div className="space-y-6">
              <h2 className="text-8xl md:text-[8rem] font-black uppercase tracking-tighter italic leading-[0.8] gradient-text-gold">{t('footer.title')}</h2>
              <p className="text-white/60 text-2xl max-w-2xl mx-auto font-medium">{t('footer.subtitle')}</p>
            </div>
            
            <Link href="/auth">
              <motion.button 
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="px-20 py-10 rounded-[3rem] bg-sherlock-gold text-black font-black text-4xl uppercase tracking-tighter shadow-glow-gold group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                {t('footer.cta')}
              </motion.button>
            </Link>

            <Link href="#works" className="text-white/20 text-xs font-black uppercase tracking-[0.5em] hover:text-white transition-colors">
              {t('footer.demo')}
            </Link>
          </div>
        </section>

      </main>

      <footer className="relative z-10 py-20 border-t border-white/5 bg-black/40 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto px-10 flex flex-col md:flex-row justify-between items-start gap-20">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sherlock-gold/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-sherlock-gold fill-current" />
              </div>
              <span className="text-xl font-black uppercase tracking-tighter italic">VIRALE</span>
            </div>
            <p className="max-w-xs text-white/30 text-sm font-medium">
              Viral Engine by Sherlock Studio. <br />
              Coded with precision, synthesized with intelligence.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-20">
            <div className="space-y-6">
               <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">PRODUCT</h5>
               <ul className="space-y-4">
                  {['works', 'outputs', 'pricing'].map(item => (
                    <li key={item}><Link href={`#${item}`} className="text-sm font-medium text-white/40 hover:text-sherlock-gold transition-colors capitalize">{item}</Link></li>
                  ))}
               </ul>
            </div>
            <div className="space-y-6">
               <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">LEGAL</h5>
               <ul className="space-y-4">
                  <li><Link href="#" className="text-sm font-medium text-white/40 hover:text-sherlock-gold transition-colors">Privacy</Link></li>
                  <li><Link href="#" className="text-sm font-medium text-white/40 hover:text-sherlock-gold transition-colors">Terms</Link></li>
               </ul>
            </div>
          </div>
        </div>
        <div className="text-center pt-20 pb-5 opacity-[0.03] select-none">
           <span className="text-[12vw] font-black uppercase tracking-tighter">SYNTHESIS</span>
        </div>
      </footer>
    </div>
  );
}
