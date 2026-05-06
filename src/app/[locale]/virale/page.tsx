'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  ChevronRight, 
  Play, 
  Check, 
  Dna, 
  Brain, 
  Shield, 
  Timer, 
  Lightbulb, 
  Cpu, 
  Camera, 
  Film, 
  Rocket, 
  Plus, 
  X, 
  Star,
  Mail
} from 'lucide-react';

// --- Utility Components ---

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    className="font-jetbrains text-[11px] md:text-[13px] text-virale-orange uppercase tracking-[0.15em] mb-4"
  >
    {children}
  </motion.div>
);

const SectionTitle = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <motion.h2 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className={`font-bebas text-4xl md:text-6xl text-virale-text leading-tight mb-8 glitch-text ${className}`}
    data-text={typeof children === 'string' ? children : undefined}
  >
    {children}
  </motion.h2>
);

// --- Sections ---

const Navbar = () => {
  const t = useTranslations('landingVirale.nav');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 w-full z-[100] transition-all duration-300 ${
        isScrolled ? 'bg-virale-bg/85 backdrop-blur-xl border-b border-white/5 py-3' : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 flex items-center justify-between">
        <div className="font-bebas text-2xl md:text-3xl text-virale-text flex items-center gap-1">
          Viral<span className="text-virale-gold">E</span>
        </div>

        <nav className="hidden md:flex items-center gap-10">
          {['tech', 'how', 'reviews', 'pricing'].map((key) => (
            <a 
              key={key}
              href={`#${key}`}
              className="font-jetbrains text-[11px] text-virale-text-muted hover:text-virale-gold transition-colors uppercase tracking-wider"
            >
              {t(key)}
            </a>
          ))}
        </nav>

        <button className="bg-virale-gold text-virale-bg font-bebas text-lg px-6 py-2.5 rounded-full hover:bg-virale-orange hover:text-white transition-all active:scale-95 shadow-lg shadow-virale-gold/20">
          {t('cta')}
        </button>
      </div>
    </motion.header>
  );
};

const Hero = () => {
  const t = useTranslations('landingVirale.hero');
  const tf = useTranslations('landingVirale.form');
  const [email, setEmail] = useState('');
  const [niche, setNiche] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !niche) return;
    setStatus('loading');
    setTimeout(() => setStatus('success'), 1500);
  };

  return (
    <section className="relative min-h-screen pt-32 pb-20 overflow-hidden flex flex-col items-center justify-center">
      {/* Gradients */}
      <div className="absolute top-1/4 -right-1/4 w-[60%] h-[60%] bg-virale-orange/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 -left-1/4 w-[50%] h-[50%] bg-virale-gold/8 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-8 flex flex-col items-start text-left">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-virale-orange animate-pulse" />
            <span className="font-jetbrains text-[11px] md:text-[13px] text-virale-orange tracking-[0.15em]">
              {t('ticker')}
            </span>
          </motion.div>

          <div className="space-y-1 mb-8">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-bebas text-6xl md:text-8xl lg:text-[120px] leading-[0.9] text-virale-text glitch-text"
              data-text={t('title1')}
            >
              {t('title1')}
            </motion.h1>
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="font-bebas text-6xl md:text-8xl lg:text-[120px] leading-[0.9] text-virale-gold glitch-text"
              data-text={t('title2')}
            >
              {t('title2')}
            </motion.h1>
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="font-bebas text-6xl md:text-8xl lg:text-[120px] leading-[0.9] text-transparent"
              style={{ WebkitTextStroke: '2px var(--color-cyber-cyan)' }}
            >
              {t('title3')}
            </motion.h1>
          </div>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="font-inter text-lg md:text-xl text-virale-text-muted max-w-2xl mb-12 leading-relaxed"
          >
            {t('subtitle')}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="w-full max-w-xl"
          >
            {status === 'success' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-virale-card border border-virale-gold/30 p-6 rounded-2xl flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                  <Check size={24} />
                </div>
                <p className="font-inter text-virale-text">
                  {tf('success')}
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="email" 
                    required
                    placeholder={tf('emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-virale-card border border-white/10 rounded-xl px-5 py-4 text-virale-text focus:border-virale-gold outline-none transition-all"
                  />
                  <div className="relative">
                    <select 
                      required
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      className="w-full bg-virale-card border border-white/10 rounded-xl px-5 py-4 text-virale-text focus:border-virale-gold outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>{tf('nichePlaceholder')}</option>
                      {tf.raw('niches').map((n: string) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-virale-text-muted">
                      <ChevronRight size={16} className="rotate-90" />
                    </div>
                  </div>
                </div>
                <button 
                  disabled={status === 'loading'}
                  className="bg-virale-gold text-virale-bg font-bebas text-xl py-4 rounded-xl hover:bg-virale-orange hover:text-white transition-all shadow-xl shadow-virale-gold/10 flex items-center justify-center gap-3 group"
                >
                  {status === 'loading' ? (
                    <div className="w-6 h-6 border-2 border-virale-bg border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {t('ctaPrimary')}
                      <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-6 flex flex-wrap gap-6 items-center">
              {['noCard', 'anytime', 'support'].map((key) => (
                <div key={key} className="flex items-center gap-2 font-jetbrains text-[11px] text-virale-text-muted/60 uppercase">
                  {t(`trust.${key}`)}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-4 hidden lg:flex flex-col items-center justify-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="relative w-full aspect-square max-w-sm"
          >
            <div className="absolute inset-0 bg-cyber-cyan/20 blur-[100px] rounded-full animate-pulse" />
            <img 
              src="/images/cyber/hero.png" 
              alt="Cyber Hero" 
              className="w-full h-full object-cover rounded-2xl border-cyber relative z-10"
            />
            <div className="absolute -top-4 -right-4 w-24 h-24 border-r-2 border-t-2 border-virale-gold z-20" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 border-l-2 border-b-2 border-cyber-cyan z-20" />
          </motion.div>
        </div>
      </div>

      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-virale-text-muted/40"
      >
        <Play className="rotate-90" size={24} />
      </motion.div>
    </section>
  );
};

const Marquee = () => {
  const t = useTranslations('landingVirale');
  const items = t.raw('marquee');
  
  return (
    <div className="bg-virale-card border-y border-white/5 py-4 overflow-hidden relative group">
      <div className="flex animate-marquee group-hover:pause">
        {[...items, ...items, ...items, ...items].map((item, idx) => (
          <div key={idx} className="flex items-center mx-8 whitespace-nowrap">
            <span className={`font-bebas text-xl md:text-2xl uppercase tracking-wider ${
              idx % 2 === 0 ? 'text-virale-gold' : 'text-virale-text-muted/40'
            }`}>
              {item}
            </span>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          animation: marquee 20s linear infinite;
        }
        .pause { animation-play-state: paused; }
      `}</style>
    </div>
  );
};

const Technology = () => {
  const t = useTranslations('landingVirale.technology');
  const cards = t.raw('cards');
  const icons = [Dna, Brain, Shield];

  return (
    <section id="tech" className="py-24 max-w-[1280px] mx-auto px-5 md:px-10">
      <SectionLabel>{t('label')}</SectionLabel>
      <SectionTitle className="max-w-4xl">{t('title')}</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {cards.map((card: any, idx: number) => {
          const Icon = icons[idx];
          return (
            <motion.div 
              key={idx}
              whileHover={{ y: -10, scale: 1.02 }}
              className="group bg-virale-card border-cyber p-10 rounded-2xl relative overflow-hidden transition-all cyber-corner"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyber-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className={`mb-8 w-12 h-12 flex items-center justify-center rounded-lg ${idx % 2 === 0 ? 'text-cyber-cyan' : 'text-virale-gold'}`}>
                <Icon size={40} className="drop-shadow-[0_0_8px_currentColor]" />
              </div>
              <h3 className="font-bebas text-3xl text-virale-text mb-4 group-hover:text-cyber-cyan transition-colors">{card.title}</h3>
              <p className="font-inter text-virale-text-muted leading-relaxed mb-6 relative z-10">
                {card.desc}
              </p>
              <div className="font-jetbrains text-[12px] text-cyber-cyan mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                <span>{card.proof}</span>
                <div className="w-2 h-2 bg-cyber-cyan animate-ping rounded-full" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

const Workflow = () => {
  const t = useTranslations('landingVirale.workflow');
  const steps = t.raw('steps');
  const icons = [Lightbulb, Cpu, Camera, Film, Rocket];

  return (
    <section id="how" className="py-24 bg-virale-bg relative overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <div className="text-center mb-20">
          <SectionLabel>{t('label')}</SectionLabel>
          <h2 className="font-bebas text-5xl md:text-8xl text-virale-text leading-tight mb-4">
            {t('title1')} <span className="text-virale-gold">{t('title2')}</span>
          </h2>
          <p className="font-inter text-lg text-virale-text-muted mb-12 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="mb-24 flex items-center justify-center">
          <div className="w-full max-w-4xl aspect-[16/9] bg-virale-card border-cyber rounded-3xl flex flex-col items-center justify-center group relative overflow-hidden">
            <img 
              src="/images/cyber/workflow.png" 
              alt="Workflow" 
              className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-virale-bg via-transparent to-transparent" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-cyber-cyan/20 backdrop-blur-md rounded-full flex items-center justify-center border border-cyber-cyan shadow-[0_0_20px_rgba(0,243,255,0.4)] mb-4">
                <Play size={40} className="text-cyber-cyan translate-x-1" />
              </div>
              <span className="font-bebas text-2xl text-virale-text tracking-widest uppercase">
                {t('placeholder')}
              </span>
            </div>
            <div className="absolute top-6 left-6 font-jetbrains text-cyber-cyan text-2xl drop-shadow-glow">08:42</div>
            <div className="absolute bottom-6 right-6 font-jetbrains text-cyber-cyan text-sm opacity-50">REC ● SYSTEM_OK</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
          <div className="absolute top-6 left-0 w-full h-[1px] border-t border-dashed border-virale-gold/30 hidden md:block z-0" />
          
          {steps.map((step: any, idx: number) => {
            const Icon = icons[idx];
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col items-center text-center relative z-10"
              >
                <div className="w-12 h-12 bg-virale-bg border-2 border-virale-gold/50 rounded-lg flex items-center justify-center text-virale-gold mb-6">
                  <Icon size={24} />
                </div>
                <div className="font-jetbrains text-virale-gold text-2xl mb-2">{step.time}</div>
                <h4 className={`font-bebas text-xl mb-3 ${idx === 4 ? 'text-virale-gold' : 'text-virale-text'}`}>{step.title}</h4>
                <p className={`font-inter text-sm text-virale-text-muted leading-relaxed ${idx === 4 ? 'font-bold' : ''}`}>
                  {step.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const Comparison = () => {
  const t = useTranslations('landingVirale.comparison');
  const rows = t.raw('rows');
  const headers = t.raw('headers');

  return (
    <section className="py-24 max-w-[1280px] mx-auto px-5 md:px-10">
      <SectionLabel>{t('label')}</SectionLabel>
      <SectionTitle>{t('title')}</SectionTitle>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-6 font-bebas text-2xl text-virale-text-muted/60">{headers[0]}</th>
              <th className="py-6 font-bebas text-2xl text-virale-gold pl-10">{headers[1]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row: string[], idx: number) => (
              <motion.tr 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group"
              >
                <td className="py-6 font-inter text-virale-text-muted flex items-start gap-3">
                  <X size={18} className="text-red-500/60 mt-1 flex-shrink-0" />
                  {row[0]}
                </td>
                <td className="py-6 font-inter text-virale-text pl-10 font-medium relative overflow-hidden">
                  <div className="flex items-start gap-3 relative z-10">
                    <Check size={18} className="text-virale-gold mt-1 flex-shrink-0" />
                    {row[1]}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const SocialProof = () => {
  const t = useTranslations('landingVirale.social');
  const reviews = t.raw('reviews');

  return (
    <section id="reviews" className="py-24 max-w-[1280px] mx-auto px-5 md:px-10">
      <SectionLabel>{t('label')}</SectionLabel>
      <SectionTitle>
        {t('title1')} <br />
        <span className="text-virale-gold">{t('title2')}</span>
      </SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {reviews.map((review: any, idx: number) => (
          <motion.div 
            key={idx}
            whileHover={{ y: -6 }}
            className="bg-virale-card border border-white/5 p-10 rounded-2xl relative overflow-hidden group"
          >
            <div className="font-bebas text-[120px] absolute top-[-20px] right-5 text-virale-gold opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
              &quot;
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bebas text-2xl text-virale-bg`}
                style={{ backgroundColor: review.color === 'orange' ? '#FF5C00' : review.color === 'gold' ? '#D4AF37' : '#FF1744' }}
              >
                {review.avatar}
              </div>
              <div>
                <div className="font-bebas text-xl text-virale-text">{review.name}</div>
                <div className="font-jetbrains text-[10px] text-virale-text-muted uppercase">{review.handle}</div>
              </div>
            </div>

            <div className="flex gap-1 mb-6">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#D4AF37" className="text-virale-gold" />)}
            </div>

            <p className="font-inter italic text-lg text-virale-text leading-relaxed">
              {review.quote}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const Pricing = () => {
  const t = useTranslations('landingVirale.pricing');
  const [isYearly, setIsYearly] = useState(false);
  const tiers = ['free', 'creator', 'pro'];

  return (
    <section id="pricing" className="py-24 max-w-[1280px] mx-auto px-5 md:px-10">
      <div className="text-center mb-16">
        <SectionLabel>{t('label')}</SectionLabel>
        <h2 className="font-bebas text-5xl md:text-8xl text-virale-text leading-tight mb-4">
          {t('title1')} <br />
          <span className="text-virale-gold">{t('title2')}</span>
        </h2>
        <p className="font-inter text-lg text-virale-text-muted mb-12 max-w-2xl mx-auto">
          {t('subtitle', { count: 34 })}
        </p>

        <div className="flex items-center justify-center gap-4 mb-16">
          <span className={`font-jetbrains text-[12px] uppercase transition-colors ${!isYearly ? 'text-virale-text' : 'text-virale-text-muted'}`}>
            {t('toggle.0')}
          </span>
          <button 
            type="button"
            onClick={() => setIsYearly(!isYearly)}
            className="w-14 h-7 bg-virale-card rounded-full relative p-1 border border-white/10"
          >
            <motion.div 
              animate={{ x: isYearly ? 28 : 0 }}
              className="w-5 h-5 bg-virale-gold rounded-full"
            />
          </button>
          <span className={`font-jetbrains text-[12px] uppercase transition-colors ${isYearly ? 'text-virale-text' : 'text-virale-text-muted'}`}>
            {t('toggle.1')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {tiers.map((key) => {
          const tier = t.raw(`tiers.${key}`);
          const isFeatured = key === 'creator';
          const price = isYearly && tier.priceYearly ? tier.priceYearly : tier.price;

          return (
            <motion.div 
              key={key}
              whileHover={{ scale: 1.02 }}
              className={`rounded-3xl p-10 flex flex-col relative transition-all ${
                isFeatured 
                  ? 'bg-virale-gold text-virale-bg lg:-translate-y-6 shadow-2xl shadow-virale-gold/20' 
                  : 'bg-virale-card text-virale-text border border-white/5'
              }`}
            >
              {isFeatured && (
                <div className="absolute top-[-14px] left-1/2 -translate-x-1/2 bg-virale-orange text-white font-jetbrains text-[10px] px-4 py-1 rounded-full uppercase tracking-widest">
                  {tier.badge}
                </div>
              )}

              <div className="mb-10">
                <div className="font-bebas text-2xl uppercase tracking-widest mb-2">{tier.title}</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bebas text-6xl">{price}</span>
                  <span className="font-inter text-sm opacity-60">/mo</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10">
                {tier.features.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 font-inter text-sm leading-tight">
                    <Check size={16} className="mt-1 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button className={`mt-auto font-bebas text-xl py-4 rounded-xl transition-all active:scale-95 ${
                isFeatured 
                  ? 'bg-virale-bg text-virale-gold hover:bg-black' 
                  : 'bg-white/5 border border-white/10 text-virale-text hover:border-virale-gold hover:text-virale-gold'
              }`}>
                {tier.cta}
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-20 text-center">
        <div className="max-w-md mx-auto mb-10">
          <div className="flex justify-between font-jetbrains text-[11px] text-virale-text-muted mb-2 uppercase tracking-wider">
            <span>{t('urgency', { count: 66 })}</span>
          </div>
          <div className="h-2 bg-virale-card rounded-full overflow-hidden border border-white/5 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: '66%' }}
              className="h-full bg-virale-gold rounded-full"
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-10">
          {t.raw('trust').map((item: string, i: number) => (
            <div key={i} className="font-jetbrains text-[11px] text-virale-text-muted/60 uppercase flex items-center gap-2">
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FAQ = () => {
  const t = useTranslations('landingVirale.faq');
  const items = t.raw('items');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 max-w-4xl mx-auto px-5 md:px-10">
      <div className="text-center mb-16">
        <SectionLabel>{t('label')}</SectionLabel>
        <SectionTitle>{t('title')}</SectionTitle>
      </div>

      <div className="space-y-4">
        {items.map((item: any, idx: number) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className={`bg-virale-card border-l-4 transition-all ${isOpen ? 'border-virale-gold' : 'border-transparent'}`}>
              <button 
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full flex items-center justify-between p-8 text-left group"
              >
                <h4 className={`font-bebas text-2xl transition-colors ${isOpen ? 'text-virale-gold' : 'text-virale-text group-hover:text-virale-gold'}`}>
                  {item.q}
                </h4>
                {isOpen ? <X size={24} className="text-virale-gold" /> : <Plus size={24} className="text-virale-text-muted" />}
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-8 pb-8 font-inter text-virale-text-muted leading-relaxed border-t border-white/5 pt-6">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const FinalCTA = () => {
  const t = useTranslations('landingVirale.finalCta');
  const tf = useTranslations('landingVirale.form');
  const [email, setEmail] = useState('');
  const [niche, setNiche] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !niche) return;
    setStatus('loading');
    setTimeout(() => setStatus('success'), 1500);
  };

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-cta pointer-events-none" />
      <style jsx>{`
        .bg-radial-cta {
          background: radial-gradient(circle at center, rgba(255, 92, 0, 0.1) 0%, transparent 70%);
        }
      `}</style>

      <div className="max-w-[1280px] mx-auto px-5 md:px-10 text-center relative z-10">
        <h2 className="font-bebas text-6xl md:text-[140px] leading-tight text-virale-text mb-4">
          {t('title1')} <br />
          <span className="text-virale-gold">{t('title2')}</span>
        </h2>
        <p className="font-inter text-xl text-virale-text-muted mb-16 max-w-2xl mx-auto">
          {t('subtitle')}
        </p>

        <div className="w-full max-w-xl mx-auto">
          {status === 'success' ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-virale-card border border-virale-gold/30 p-8 rounded-2xl flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                <Check size={24} />
              </div>
              <p className="font-inter text-virale-text">
                {tf('success')}
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="email" 
                  required
                  placeholder={tf('emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-virale-card border border-white/10 rounded-xl px-5 py-4 text-virale-text focus:border-virale-gold outline-none transition-all"
                />
                <div className="relative">
                  <select 
                    required
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="w-full bg-virale-card border border-white/10 rounded-xl px-5 py-4 text-virale-text focus:border-virale-gold outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>{tf('nichePlaceholder')}</option>
                    {tf.raw('niches').map((n: string) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-virale-text-muted">
                    <ChevronRight size={16} className="rotate-90" />
                  </div>
                </div>
              </div>
              <button 
                disabled={status === 'loading'}
                className="bg-virale-gold text-virale-bg font-bebas text-xl py-5 rounded-xl hover:bg-virale-orange hover:text-white transition-all shadow-xl shadow-virale-gold/20 flex items-center justify-center gap-3 group"
              >
                {status === 'loading' ? (
                  <div className="w-6 h-6 border-2 border-virale-bg border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {t('ctaPrimary')}
                    <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}
          
          <div className="mt-8 font-jetbrains text-virale-gold uppercase tracking-[0.15em] text-[12px]">
            {t('urgency', { count: 34 })}
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  const t = useTranslations('landingVirale.footer');
  const links = t.raw('links');

  return (
    <footer className="py-20 bg-virale-card border-t border-white/5">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-20">
          <div>
            <div className="font-bebas text-3xl text-virale-gold mb-4">ViralE</div>
            <div className="font-jetbrains text-[10px] text-virale-text-muted uppercase mb-4 tracking-widest">Viral Engine by Sherlock</div>
            <p className="font-inter text-sm text-virale-text-muted/60 leading-relaxed max-w-xs">
              {t('slogan')}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {links.map((link: string, i: number) => (
              <a key={i} href="#" className="font-jetbrains text-[11px] text-virale-text-muted/60 hover:text-virale-gold transition-colors uppercase">
                {link}
              </a>
            ))}
          </div>

          <div className="flex gap-6 md:justify-end">
            <a href="#" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-virale-text-muted/60 hover:text-virale-gold hover:border-virale-gold transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="#" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-virale-text-muted/60 hover:text-virale-gold hover:border-virale-gold transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
            <a href="#" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-virale-text-muted/60 hover:text-virale-gold hover:border-virale-gold transition-all">
              <Mail size={20} />
            </a>
          </div>
        </div>

        <div className="pt-10 border-t border-white/5 text-center">
          <div className="font-jetbrains text-[11px] text-virale-text-muted/40 uppercase tracking-widest">
            {t('copyright')}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default function ViralELanding() {
  return (
    <main className="bg-virale-bg text-virale-text selection:bg-cyber-cyan/30 min-h-screen relative overflow-hidden">
      {/* Cyberpunk Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay" />
        <div className="absolute inset-0 bg-cyber-grid opacity-[0.05]" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyber-cyan to-transparent opacity-50 animate-scanline" />
      </div>

      <Navbar />
      <Hero />
      <Marquee />
      <Technology />
      <Workflow />
      <Comparison />
      <SocialProof />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        
        .animate-scanline {
          animation: scanline 8s linear infinite;
        }

        .bg-cyber-grid {
          background-image: linear-gradient(to right, #00F3FF 1px, transparent 1px),
                            linear-gradient(to bottom, #00F3FF 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .font-bebas { font-family: var(--font-bebas), sans-serif; }
        .font-jetbrains { font-family: var(--font-jetbrains), monospace; }
        .font-inter { font-family: var(--font-inter), sans-serif; }
        
        .text-virale-gold { color: var(--color-virale-gold); text-shadow: var(--glow-gold); }
        .text-virale-orange { color: var(--color-virale-orange); text-shadow: var(--glow-magenta); }
        .text-cyber-cyan { color: var(--color-cyber-cyan); text-shadow: var(--glow-cyan); }
        
        .text-virale-bg { color: var(--color-virale-bg); }
        .text-virale-text { color: var(--color-virale-text); }
        .text-virale-text-muted { color: var(--color-virale-text-muted); }
        
        .bg-virale-bg { background-color: var(--color-virale-bg); }
        .bg-virale-card { background-color: var(--color-virale-card); }
        .bg-virale-gold { background-color: var(--color-virale-gold); }
        .bg-virale-orange { background-color: var(--color-virale-orange); }
        
        .border-cyber {
          border: 1px solid rgba(0, 243, 255, 0.2);
          box-shadow: inset 0 0 10px rgba(0, 243, 255, 0.05);
        }
        
        .cyber-corner {
          position: relative;
        }
        .cyber-corner::before {
          content: '';
          position: absolute;
          top: -1px;
          left: -1px;
          width: 10px;
          height: 10px;
          border-top: 2px solid var(--color-cyber-cyan);
          border-left: 2px solid var(--color-cyber-cyan);
        }
        .cyber-corner::after {
          content: '';
          position: absolute;
          bottom: -1px;
          right: -1px;
          width: 10px;
          height: 10px;
          border-bottom: 2px solid var(--color-cyber-cyan);
          border-right: 2px solid var(--color-cyber-cyan);
        }

        /* Glitch Effect */
        .glitch-text {
          position: relative;
        }
        .glitch-text:hover::before {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 2px;
          text-shadow: -1px 0 #FF00FF;
          background: #050505;
          overflow: hidden;
          animation: glitch-anim 2s infinite linear alternate-reverse;
        }
        
        @keyframes glitch-anim {
          0% { clip: rect(44px, 9999px, 56px, 0); }
          20% { clip: rect(12px, 9999px, 88px, 0); }
          40% { clip: rect(67px, 9999px, 12px, 0); }
          60% { clip: rect(4px, 9999px, 34px, 0); }
          80% { clip: rect(90px, 9999px, 2px, 0); }
          100% { clip: rect(23px, 9999px, 95px, 0); }
        }
      `}</style>
    </main>
  );
}
