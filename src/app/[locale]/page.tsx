'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Link } from '@/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  Lock,
  ChevronRight,
  Dna,
  Layers,
  Activity
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

// Premium DNA Icon Component
const PremiumDnaIcon = ({ className = "w-8 h-8" }) => {
  return (
    <div className={`relative ${className} group/dna flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Animated Double Helix SVG */}
        <defs>
          <linearGradient id="dnaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {[...Array(12)].map((_, i) => (
          <motion.g key={i}>
            <motion.circle
              cx="50"
              cy={15 + i * 6}
              r="2"
              fill="url(#dnaGradient)"
              animate={{
                cx: [35, 65, 35],
                opacity: [0.4, 1, 0.4],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeInOut"
              }}
              style={{ filter: 'url(#glow)' }}
            />
            <motion.circle
              cx="50"
              cy={15 + i * 6}
              r="2"
              fill="url(#dnaGradient)"
              animate={{
                cx: [65, 35, 65],
                opacity: [1, 0.4, 1],
                scale: [1.2, 0.8, 1.2]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeInOut"
              }}
              style={{ filter: 'url(#glow)' }}
            />
            <motion.line
              x1="35" y1={15 + i * 6}
              x2="65" y2={15 + i * 6}
              stroke="url(#dnaGradient)"
              strokeWidth="0.5"
              strokeOpacity="0.2"
              animate={{
                x1: [35, 65, 35],
                x2: [65, 35, 65],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeInOut"
              }}
            />
          </motion.g>
        ))}
      </svg>
      
      {/* Radial Glow */}
      <div className="absolute inset-0 bg-cyan-500/10 blur-2xl rounded-full scale-150 animate-pulse pointer-events-none" />
      
      {/* Particle Orbits */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[-50%] pointer-events-none"
      >
        <div className="absolute top-0 left-1/2 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]" />
        <div className="absolute bottom-0 left-1/2 w-1 h-1 bg-purple-400 rounded-full shadow-[0_0_8px_#a855f7]" />
      </motion.div>
    </div>
  );
};

// Custom Store Badge Component
const StoreBadge = ({ type, text, subtext, toastMessage, href = "#" }: { type: 'apple' | 'google', text: string, subtext: string, toastMessage: string, href?: string }) => {
  const [showToast, setShowToast] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (href === "#") {
      e.preventDefault();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  return (
    <div className="relative group">
      <motion.a 
        href={href}
        onClick={handleClick}
        target={href === "#" ? undefined : "_blank"}
        rel={href === "#" ? undefined : "noopener noreferrer"}
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-cyan-500/30 transition-all cursor-pointer backdrop-blur-2xl relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors shadow-inner">
          <Smartphone className="w-6 h-6 text-white/50 group-hover:text-cyan-400 transition-colors" />
        </div>
        <div className="text-left relative z-10">
          <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none mb-1.5">{subtext}</div>
          <div className="text-base font-black text-white leading-none tracking-tight">{text}</div>
        </div>
      </motion.a>

      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-xl z-50 whitespace-nowrap"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function LandingPage() {
  const t = useTranslations('landing');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const checkRedirect = async () => {
      const mode = searchParams?.get('mode');
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || mode === 'standalone';
      
      // If PWA mode, we ALWAYS go to the flow
      if (isStandalone) {
        setIsRedirecting(true);
        router.push(`/${locale}/app/projects`);
        return;
      }

      // For standard browser users, redirect if they are logged in
      const { data: { session } } = await supabase.auth.getSession();

      if (session && !session.user.is_anonymous) {
        setIsRedirecting(true);
        router.push(`/${locale}/app/projects`);
      }
    };
    
    checkRedirect();
  }, [locale, router, searchParams]);

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-[#020408] flex items-center justify-center">
        <motion.div 
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.98, 1, 0.98] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-cyan-400 font-black tracking-[0.5em] uppercase text-xs"
        >
          {t('title')}
        </motion.div>
      </div>
    );
  }

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
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any }
    }
  };

  return (
    <div className="min-h-screen bg-[#020408] text-white selection:bg-cyan-500/30 overflow-x-hidden font-sans">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-cyan-500/[0.07] blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-purple-600/[0.07] blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-500/[0.03] blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-grid opacity-[0.03]" />
      </div>

      <nav className="relative z-50 flex justify-between items-center px-8 py-8 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group cursor-pointer">
            <Zap className="w-6 h-6 text-white fill-current group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase italic">
            Virale<span className="text-cyan-400">.uno</span>
          </span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6"
        >
          <div className="flex items-center gap-6 mr-4">
             <Link href="/" locale={locale === 'ru' ? 'en' : 'ru'} className="group flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">
                {locale === 'ru' ? 'EN' : 'RU'}
              </span>
              <Globe className="w-3.5 h-3.5 text-white/20 group-hover:text-cyan-400 transition-colors" />
            </Link>
          </div>
          <Link href="/auth">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-md"
            >
              {t('login')}
            </motion.button>
          </Link>
        </motion.div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-16 lg:py-32 space-y-40">
        
        {/* HERO SECTION */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="flex flex-col items-center text-center space-y-12"
        >
          {/* AI Tech Badge */}
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-cyan-500/5 border border-cyan-500/20 text-[11px] font-black uppercase tracking-[0.3em] text-cyan-400 shadow-inner">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>{t('badge')}</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div variants={itemVariants} className="space-y-8">
            <h1 className="text-7xl md:text-[10rem] font-black tracking-[calc(-0.06em)] leading-[0.82] uppercase">
              {t('title')}<br />
              <span className="gradient-text-cosmic text-glow-mint">
                {t('titleAccent')}
              </span>
            </h1>
            <p className="text-white/40 text-xl md:text-2xl max-w-2xl mx-auto font-medium leading-relaxed tracking-tight">
              {t('subtitle')}
            </p>
          </motion.div>

          {/* Main CTA */}
          <motion.div variants={itemVariants} className="flex flex-col items-center gap-10 w-full max-w-xl">
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <Link href="/auth?next=/app/projects" className="flex-[2]">
                <motion.button 
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-20 rounded-3xl bg-white text-black font-black text-2xl uppercase tracking-tighter flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(255,255,255,0.15)] group"
                >
                  <Play className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
                  {t('cta')}
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
              
              <Link href="/auth?next=/app/onboarding" className="flex-1">
                <motion.button 
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-20 rounded-3xl bg-white/5 border border-white/10 text-white font-black text-base uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-white/10 transition-all backdrop-blur-xl relative overflow-hidden group shadow-[0_0_50px_rgba(34,211,238,0.15)]"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--x,_50%)_var(--y,_50%),rgba(34,211,238,0.15)_0%,transparent_50%)] opacity-0 group-hover:opacity-100 transition-opacity" 
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.style.setProperty('--x', `${e.clientX - rect.left}px`);
                      e.currentTarget.style.setProperty('--y', `${e.clientY - rect.top}px`);
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent -translate-x-[200%] animate-scan group-hover:animate-scan-fast" />
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 animate-mesh" />
                  <PremiumDnaIcon className="w-7 h-7 relative z-10" />
                  <span className="relative z-10">{t('startOnboarding')}</span>
                </motion.button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <StoreBadge 
                type="apple" 
                text={t('appStore')} 
                subtext={t('comingSoon')} 
                toastMessage={`${t('comingSoon')} ${t('appStore')}`}
              />
              <StoreBadge 
                type="google" 
                text={t('googlePlay')} 
                subtext={t('comingSoon')} 
                toastMessage={`${t('comingSoon')} ${t('googlePlay')}`}
              />
            </div>

            <Link href="/auth?next=/app/projects" className="group flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all">
              <Globe className="w-4 h-4 text-white/30 group-hover:text-cyan-400 transition-colors" />
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/30 group-hover:text-white transition-colors">
                {t('webVersion')}
              </span>
            </Link>
          </motion.div>

          {/* Social Proof */}
          <motion.div variants={itemVariants} className="pt-8 space-y-4">
            <div className="flex justify-center gap-1.5 text-yellow-500">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current shadow-glow-gold" />)}
            </div>
            <p className="text-xs text-white/20 uppercase tracking-[0.5em] font-black">{t('socialProof')}</p>
          </motion.div>
        </motion.section>

        {/* SINGLE WINDOW HUB VISUAL */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: "-100px" }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-purple-600/10 rounded-[5rem] blur-[120px] opacity-40 animate-pulse" />
          
          <div className="relative glass rounded-[4rem] p-12 lg:p-24 overflow-hidden border-white/10 shadow-2xl">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-full h-full bg-grid opacity-[0.02] pointer-events-none" />
            <div className="absolute -top-[20%] -right-[20%] w-[60%] h-[60%] bg-cyan-500/[0.05] blur-[100px] rounded-full" />
            
            <div className="flex flex-col lg:flex-row items-center gap-20 relative z-10">
              
              {/* Input Side */}
              <div className="w-full lg:w-2/5 space-y-10">
                <div className="space-y-4">
                  <div className="inline-flex px-4 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">Core Engine</div>
                  <h3 className="text-5xl font-black uppercase tracking-tighter leading-[0.9]">{t('featureHub')}</h3>
                  <p className="text-white/40 text-lg leading-relaxed font-medium">{t('featureHubSub')}</p>
                </div>
                
                <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6 backdrop-blur-3xl shadow-inner relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                        <Zap className="w-6 h-6 text-cyan-400 fill-current" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
                           <motion.div 
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className="w-1/2 h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent" 
                           />
                        </div>
                        <div className="text-[10px] text-cyan-400/60 font-black uppercase tracking-widest tracking-tighter">Processing...</div>
                      </div>
                    </div>
                    <div className="text-white/10 font-bold text-lg tracking-widest">01</div>
                  </div>
                  <div className="text-sm text-white/30 font-mono italic flex items-center gap-2 bg-black/20 p-3 rounded-lg border border-white/5">
                    <span className="text-cyan-500">{'>'}</span>
                    <span>Analyzing niche trends...</span>
                  </div>
                </div>
              </div>

              {/* Central Engine Visual */}
              <div className="hidden lg:flex flex-col items-center justify-center relative h-80 w-32 text-white/5">
                <div className="w-px h-full bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-48 h-48 rounded-full border border-white/[0.03] flex items-center justify-center">
                    <div className="w-36 h-36 rounded-full border border-white/[0.05] flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full border border-white/[0.08]" />
                    </div>
                  </div>
                </motion.div>
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute w-20 h-20 rounded-2xl bg-white/[0.05] backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-[0_0_50px_rgba(34,211,238,0.2)] z-10"
                >
                  <Zap className="w-10 h-10 text-cyan-400 fill-current drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                </motion.div>
              </div>

              {/* Output Grid */}
              <div className="w-full lg:w-1/2 grid grid-cols-2 gap-5">
                {[
                  { image: '/previews/viral_video.png', label: t('hubVideo'), meta: 'NEURAL RENDER 4K', color: 'from-cyan-900/40' },
                  { image: '/previews/carousel.png', label: t('hubCarousel'), meta: 'HD VECTOR LAYERS', color: 'from-purple-900/40' },
                  { image: '/previews/text.png', label: t('hubText'), meta: 'GPT-O1 OPTIMIZED', color: 'from-indigo-900/40' },
                  { image: '/previews/shorts.png', label: t('hubShorts'), meta: 'VERTICAL VEO 3.1', color: 'from-blue-900/40' }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05, y: -8 }}
                    className="group relative h-56 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col items-center justify-end bg-[#0a0c10]"
                  >
                    <img 
                      src={item.image} 
                      alt={item.label}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale-[0.2] group-hover:grayscale-0"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${item.color} via-black/20 to-transparent opacity-80 group-hover:opacity-40 transition-opacity duration-500`} />
                    
                    {/* Glass Footer */}
                    <div className="relative w-full p-5 glass-card border-none rounded-none border-t border-white/10 backdrop-blur-3xl translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                       <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/90 group-hover:text-cyan-400 transition-colors">{item.label}</span>
                            <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[7px] font-black uppercase tracking-widest text-cyan-400/80 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-all">{item.meta}</div>
                          </div>
                          <div className="flex gap-1 h-0.5 mt-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              whileInView={{ width: '100%' }}
                              transition={{ duration: 1.5, delay: 0.1 * i }}
                              className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 bg-[length:200%_auto] animate-mesh"
                            />
                          </div>
                       </div>
                    </div>

                    {/* Lens Flare Overlay */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-700 bg-[radial-gradient(circle_at_var(--x,_50%)_var(--y,_50%),rgba(255,255,255,0.15)_0%,transparent_50%)]" 
                       onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        e.currentTarget.style.setProperty('--x', `${e.clientX - rect.left}px`);
                        e.currentTarget.style.setProperty('--y', `${e.clientY - rect.top}px`);
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* KILLER FEATURES GRID */}
        <section className="space-y-16">
          <div className="text-center space-y-6">
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic">{t('stackTitle').split(' ')[0]} <span className="text-cyan-400 underline decoration-cyan-500/30">{t('stackTitle').split(' ').slice(1).join(' ')}</span></h2>
            <p className="text-white/30 uppercase text-[11px] font-black tracking-[0.6em]">{t('stackSub')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1: AI Consultant */}
            <motion.div 
              whileHover={{ y: -12 }}
              className="group glass-card rounded-[3rem] p-10 space-y-12 border-white/5 hover:border-cyan-500/30 transition-all overflow-hidden relative shadow-2xl"
            >
              <div className="absolute top-0 right-0 p-24 bg-cyan-500/[0.07] blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shadow-inner group-hover:scale-110 transition-transform">
                <Globe className="w-8 h-8" />
              </div>
              <div className="space-y-5 relative z-10">
                <h4 className="text-3xl font-black uppercase tracking-tighter leading-none">{t('featureConsultant')}</h4>
                <p className="text-white/40 text-base leading-relaxed font-medium">{t('featureConsultantSub')}</p>
              </div>
              <div className="pt-4 flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400/60 group-hover:text-cyan-400 transition-colors">
                {t('learnMore')} <ArrowRight className="ml-2 w-3 h-3" />
              </div>
            </motion.div>

            {/* Feature 2: Teleprompter */}
            <motion.div 
              whileHover={{ y: -12 }}
              className="group glass-card rounded-[3rem] p-10 space-y-12 border-white/5 hover:border-purple-500/30 transition-all relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 p-24 bg-purple-500/[0.07] blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 shadow-inner group-hover:scale-110 transition-transform">
                <Smartphone className="w-8 h-8" />
              </div>
              <div className="space-y-5 relative z-10">
                <h4 className="text-3xl font-black uppercase tracking-tighter leading-none">{t('featurePrompter')}</h4>
                <p className="text-white/40 text-base leading-relaxed font-medium">{t('featurePrompterSub')}</p>
              </div>
              <div className="pt-4 flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-purple-400/60 group-hover:text-purple-400 transition-colors">
                {t('viewStudio')} <ArrowRight className="ml-2 w-3 h-3" />
              </div>
            </motion.div>

            {/* Feature 3: Factory */}
            <motion.div 
              whileHover={{ y: -12 }}
              className="group glass-card rounded-[3rem] p-10 space-y-12 border-white/5 hover:border-white/20 transition-all relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 p-24 bg-white/[0.05] blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform">
                <Cpu className="w-8 h-8" />
              </div>
              <div className="space-y-5 relative z-10">
                <h4 className="text-3xl font-black uppercase tracking-tighter leading-none">{t('featureFactory')}</h4>
                <p className="text-white/40 text-base leading-relaxed font-medium">{t('featureFactorySub')}</p>
              </div>
              <div className="pt-4 flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-white/30 group-hover:text-white transition-colors">
                {t('runFactory')} <ArrowRight className="ml-2 w-3 h-3" />
              </div>
            </motion.div>

          </div>
        </section>

        {/* BOTTOM CTA */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center py-24 border-t border-white/[0.03] space-y-16 relative overflow-hidden"
        >
          {/* Subtle bg glow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[120%] bg-cyan-600/[0.03] blur-[160px] rounded-full translate-y-1/2 pointer-events-none" />
          
          <div className="space-y-8 relative z-10">
            <h2 className="text-6xl md:text-[9rem] font-black uppercase tracking-tighter italic leading-none">
              {t('readyHeadline')} <span className="text-glow-mint text-cyan-400">{t('readyHeadlineAccent')}</span>
            </h2>
            <p className="text-white/40 text-xl font-medium max-w-xl mx-auto leading-relaxed">
              {t('readySubheadline')} <span className="text-white">{t('creditBonus')}</span>
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-16 relative z-10">
            <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl justify-center">
               <Link href="/auth?next=/app/onboarding" className="flex-1">
                <motion.button 
                  whileHover={{ scale: 1.04, y: -4 }}
                  whileTap={{ scale: 0.96 }}
                  className="w-full h-24 rounded-[2rem] bg-white text-black font-black text-2xl uppercase tracking-tighter flex items-center justify-center gap-4 transition-transform shadow-[0_25px_60px_rgba(255,255,255,0.15)] group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent -translate-x-[200%] animate-scan group-hover:animate-scan-fast" />
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity animate-mesh" />
                  <PremiumDnaIcon className="w-8 h-8 relative z-10" />
                  <span className="relative z-10">{t('startOnboarding')}</span>
                </motion.button>
              </Link>
              
              <Link href="/auth?next=/app/projects" className="flex-1">
                <motion.button 
                  whileHover={{ scale: 1.04, y: -4 }}
                  whileTap={{ scale: 0.96 }}
                  className="w-full h-24 rounded-[2rem] bg-white/[0.03] border border-white/10 text-white font-black text-2xl uppercase tracking-tighter flex items-center justify-center gap-4 hover:bg-white/[0.08] hover:border-white/20 transition-all backdrop-blur-xl group"
                >
                  {t('webVersion')}
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
            </div>
            
             <div className="space-y-8 w-full max-w-lg">
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                  <p className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20 whitespace-nowrap">{t('downloadTitle')}</p>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StoreBadge type="apple" text={t('appStore')} subtext={t('comingSoon')} toastMessage={`${t('comingSoon')} ${t('appStore')}`} />
                  <StoreBadge type="google" text={t('googlePlay')} subtext={t('comingSoon')} toastMessage={`${t('comingSoon')} ${t('googlePlay')}`} />
                </div>
             </div>
          </div>
        </motion.section>

      </main>

      <footer className="relative z-10 py-16 border-t border-white/[0.03] bg-white/[0.01] backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto px-10 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-3 grayscale opacity-30 hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer group">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400 fill-current" />
            </div>
            <span className="text-sm font-black uppercase tracking-tighter italic">Virale<span className="text-white/50 group-hover:text-cyan-400 transition-colors">.uno</span></span>
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.6em] text-white/20">{t('footer')}</p>
          <div className="flex gap-4">
            <Link href="#" className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-white/30 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"><Globe className="w-5 h-5" /></Link>
            <Link href="#" className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-white/30 hover:text-purple-400 hover:border-purple-500/30 transition-all"><Lock className="w-5 h-5" /></Link>
          </div>
        </div>
        <div className="text-center pt-8 opacity-[0.02] pointer-events-none">
          <span className="text-[15rem] font-black uppercase tracking-tighter select-none">{t('factoryFooter')}</span>
        </div>
      </footer>
    </div>
  );
}
