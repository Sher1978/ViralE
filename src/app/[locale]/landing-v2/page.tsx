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
  Share2
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
              {t('hero.cta').split(' ')[0]} {t('hero.cta').split(' ')[1]}
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
              <span className="text-neon-mint text-xs font-black uppercase tracking-[0.3em]">{t('hero.tagline')}</span>
            </motion.div>
            <h1 className="text-7xl md:text-[8rem] font-black uppercase tracking-tighter leading-[0.85] italic">
              {t('hero.title').split(' ').map((word, i) => (
                <span key={i} className={i === 1 ? 'gradient-text-gold block not-italic' : 'block'}>
                  {word}
                </span>
              ))}
            </h1>
            <p className="text-white/40 text-xl md:text-2xl max-w-2xl mx-auto font-medium leading-relaxed">
              {t('hero.subtitle')}
            </p>
          </div>

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

          <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-center gap-12 pt-20 z-10">
            <Link href="/auth?next=/app/onboarding">
              <motion.button 
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="px-16 py-8 rounded-[3rem] bg-sherlock-gold text-black font-black text-3xl uppercase tracking-tighter shadow-glow-gold group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                {t('hero.cta')}
              </motion.button>
            </Link>
            <div className="flex gap-10 border-l border-white/10 pl-12 h-20 items-center">
               <div className="flex flex-col items-start">
                  <span className="text-neon-mint font-black text-3xl tracking-tighter italic">50K+</span>
                  <span className="text-white/40 text-[10px] uppercase font-bold tracking-[0.3em]">{t('hero.stats.creators')}</span>
               </div>
               <div className="w-px h-10 bg-white/10" />
               <div className="flex flex-col items-start">
                  <span className="text-sherlock-gold font-black text-3xl tracking-tighter italic">AI-GOLD</span>
                  <span className="text-white/40 text-[10px] uppercase font-bold tracking-[0.3em]">{t('hero.stats.quality')}</span>
               </div>
            </div>
          </motion.div>
        </section>

        {/* HOW IT WORKS / FLOW */}
        <section id="works" className="space-y-24">
          <div className="flex flex-col lg:flex-row items-end justify-between gap-10 border-b border-white/5 pb-10">
            <div className="space-y-4">
              <span className="text-sherlock-gold text-[10px] font-black uppercase tracking-[0.4em]">{t('features.flow.title')}</span>
              <h2 className="text-6xl font-black uppercase tracking-tighter">{t('features.flow.description').split(' ')[0]} <span className="text-white/20 italic">{t('features.flow.description').split(' ').slice(1).join(' ')}</span></h2>
            </div>
            <p className="text-white/40 max-w-sm text-right font-medium">
              We've engineered a sequence that maximizes impact while minimizing effort.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="grid grid-cols-1 gap-8">
              {[
                { id: '01', title: t('features.flow.step1'), desc: 'Feed the core with your raw idea or a reference link.', icon: Zap, color: 'gold' },
                { id: '02', title: t('features.flow.step2'), desc: 'Our multi-engine system synthesizes the DNA and scripts.', icon: Cpu, color: 'mint' },
                { id: '03', title: t('features.flow.step3'), desc: 'Get your video, cover, and texts in minutes.', icon: Share2, color: 'gold' }
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
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">{t('features.synthesis.title')}</h2>
              <p className="text-white/40 text-xl font-medium leading-relaxed">
                {t('features.synthesis.description')}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                <Dna className="w-5 h-5 text-sherlock-gold" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Voice Cloning</span>
              </div>
              <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                <Layers className="w-5 h-5 text-neon-mint" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Style Calibration</span>
              </div>
            </div>
          </div>
        </section>

        {/* OUTPUT SHOWCASE */}
        <section id="outputs" className="space-y-24">
          <div className="text-center space-y-4">
            <span className="text-neon-mint text-[10px] font-black uppercase tracking-[0.4em]">{t('showcase.title')}</span>
            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter">{t('showcase.description')}</h2>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="glass rounded-[3rem] p-4 md:p-8 overflow-hidden border-white/10 shadow-2xl relative">
              <img 
                src="/v2/showcase.png" 
                alt="Multi-format outputs" 
                className="w-full h-full object-cover rounded-[2rem]"
              />
              
              {/* Floating Labels - adjusted for the collage */}
              <div className="absolute top-[15%] left-[10%] p-4 glass-dark rounded-2xl border-neon-mint/30 animate-float">
                <span className="text-[10px] font-black uppercase tracking-widest text-neon-mint">{t('showcase.video')}</span>
              </div>
              <div className="absolute top-[40%] right-[10%] p-4 glass-dark rounded-2xl border-sherlock-gold/30 animate-float" style={{ animationDelay: '1.5s' }}>
                <span className="text-[10px] font-black uppercase tracking-widest text-sherlock-gold">{t('showcase.carousel')}</span>
              </div>
              <div className="absolute bottom-[20%] left-[15%] p-4 glass-dark rounded-2xl border-white/30 animate-float" style={{ animationDelay: '2.5s' }}>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{t('showcase.text')} & {t('showcase.cover')}</span>
              </div>
            </div>
            
            {/* Metadata Badge */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-10 py-4 glass-gold rounded-full border-sherlock-gold/50 shadow-glow-gold backdrop-blur-xl">
               <span className="text-xs font-black uppercase tracking-[0.4em] text-sherlock-gold">{t('showcase.metadata')}</span>
            </div>
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
              <h2 className="text-8xl md:text-[12rem] font-black uppercase tracking-tighter italic leading-[0.8] gradient-text-gold">{t('cta.title')}</h2>
              <p className="text-white/60 text-2xl max-w-2xl mx-auto font-medium">{t('cta.subtitle')}</p>
            </div>
            
            <Link href="/auth?next=/app/onboarding">
              <motion.button 
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="px-20 py-10 rounded-[3rem] bg-sherlock-gold text-black font-black text-4xl uppercase tracking-tighter shadow-glow-gold group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                {t('cta.launch')}
              </motion.button>
            </Link>

            <div className="flex items-center gap-10 opacity-20">
              <Share2 className="w-8 h-8" />
              <Smartphone className="w-8 h-8" />
              <Globe className="w-8 h-8" />
              <Layers className="w-8 h-8" />
            </div>
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
                    <li key={item}><Link href="#" className="text-sm font-medium text-white/40 hover:text-sherlock-gold transition-colors capitalize">{item}</Link></li>
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
