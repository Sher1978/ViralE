'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Zap, Sparkles, Trophy, Check, Info, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';

interface AnimationTiersProps {
  onSelect: (config: any) => void;
  currentConfig?: any;
}

export default function AnimationTiers({ onSelect, currentConfig }: AnimationTiersProps) {
  const t = useTranslations('production');
  const [selectedTier, setSelectedTier] = useState<'lite' | 'standard' | 'premium'>(currentConfig?.tier || 'lite');
  const [usePolish, setUsePolish] = useState(currentConfig?.aiPolish || false);

  // Sync state with parent
  React.useEffect(() => {
    onSelect({ tier: selectedTier, aiPolish: usePolish });
  }, [selectedTier, usePolish]);

  const tiers = [
    {
      id: 'lite',
      title: t('tierLite'),
      cost: t('costLite'),
      icon: Zap,
      description: "Fast animation by Luma/Pika. Good for standard vlogs.",
      color: "from-blue-500/20 to-cyan-500/10",
      accent: "blue"
    },
    {
      id: 'standard',
      title: t('tierStandard'),
      cost: t('costStandard'),
      icon: Trophy,
      description: "Google Veo 3.1. Cinematic motion & lifelike expressions.",
      color: "from-emerald-500/20 to-teal-500/10",
      accent: "emerald"
    },
    {
      id: 'premium',
      title: t('tierPremium'),
      cost: t('costPremium'),
      icon: Trophy,
      description: "Seedance/Kling. Best-in-class realism. High complexity.",
      color: "from-amber-500/20 to-orange-500/10",
      accent: "amber",
      premium: true
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
          Animation Tier
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
          <Info className="w-3.5 h-3.5 text-white/40" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Model Selection</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((tier) => (
          <button
            key={tier.id}
            onClick={() => setSelectedTier(tier.id as any)}
            className={clsx(
              "relative flex flex-col p-5 rounded-[2rem] border transition-all duration-500 text-left overflow-hidden group",
              selectedTier === tier.id 
                ? "bg-white/10 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] scale-[1.02]" 
                : "bg-white/5 border-white/5 grayscale-[0.6] hover:grayscale-0 hover:bg-white/[0.07]"
            )}
          >
            {/* Background Gradient */}
            <div className={clsx(
              "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
              tier.color
            )} />

            {/* Selection indicator */}
            {selectedTier === tier.id && (
              <motion.div 
                layoutId="active-check"
                className="absolute top-4 right-4 bg-white text-black rounded-full p-1"
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </motion.div>
            )}

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className={clsx(
                  "p-3 rounded-2xl bg-white/5 group-hover:scale-110 transition-transform duration-500",
                  selectedTier === tier.id && "bg-white/10"
                )}>
                  <tier.icon className={clsx(
                    "w-6 h-6",
                    tier.accent === 'blue' && "text-blue-400",
                    tier.accent === 'emerald' && "text-emerald-400",
                    tier.accent === 'amber' && "text-amber-400"
                  )} />
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-white tracking-tight">{tier.title}</h4>
                <p className="text-xs text-white/40 mt-1 line-clamp-2 leading-relaxed h-8">
                  {tier.description}
                </p>
              </div>

              <div className="pt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{tier.cost.split(' ')[0]}</span>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Credits</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* AI Look Polish - The Add-on */}
      <div 
        onClick={() => setUsePolish(!usePolish)}
        className={clsx(
          "p-6 rounded-[2.5rem] border transition-all duration-500 cursor-pointer group relative overflow-hidden",
          usePolish 
            ? "bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.1)]" 
            : "bg-white/5 border-white/5 grayscale-[0.8] hover:grayscale-0 hover:bg-white/[0.07]"
        )}
      >
        <div className="flex items-center gap-6 relative z-10">
          <div className={clsx(
            "p-4 rounded-full transition-all duration-500",
            usePolish ? "bg-indigo-500 text-white scale-110 shadow-[0_0_20px_rgba(99,102,241,0.5)]" : "bg-white/10 text-white/30"
          )}>
            <Sparkles className="w-6 h-6" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-white">{t('aiPolish')}</h4>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">DNA Sync</span>
            </div>
            <p className="text-xs text-white/40 mt-1">
              {t('polishNote')}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xl font-black text-white/90">10</div>
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Credits</div>
          </div>
        </div>

        {/* Shine effect */}
        {usePolish && (
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%]"
            animate={{ translateX: ["100%", "-100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>

      <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
        <p className="text-[11px] text-blue-300/60 leading-relaxed uppercase tracking-wide font-medium">
          Total Protection: Credits are deducted only after successful delivery. Unsuccessful renders are automatically refunded.
        </p>
      </div>
    </div>
  );
}
