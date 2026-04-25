'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Zap, 
  Sparkles, 
  Rocket, 
  CheckCircle2, 
  Plus, 
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { profileService, Profile } from '@/lib/services/profileService';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/navigation';

export default function SubscriptionPage() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const router = useRouter();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const p = await profileService.getOrCreateProfile();
    setProfile(p);
    setIsLoading(false);
  };

  const handleUpdateTier = async (tier: 'free' | 'creator' | 'pro') => {
    if (!profile) return;
    setUpdateLoading(tier);
    try {
      const success = await profileService.updateProfile(profile.id, { tier });
      if (success) {
        await fetchProfile();
      }
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleAddCredits = async (amount: number) => {
    if (!profile) return;
    setUpdateLoading(`credits-${amount}`);
    try {
      const success = await profileService.updateProfile(profile.id, { 
        credits_balance: (profile.credits_balance || 0) + amount 
      });
      if (success) {
        await fetchProfile();
      }
    } finally {
      setUpdateLoading(null);
    }
  };

  const TIERS = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      icon: Zap,
      color: 'from-slate-400 to-slate-600',
      features: ['5 Daily Ideas', 'Standard Engine', 'Community Support'],
      popular: false
    },
    {
      id: 'creator',
      name: 'Creator',
      price: '$29',
      icon: Sparkles,
      color: 'from-purple-500 to-indigo-600',
      features: ['20 Generations /mo', 'Advanced DNA', 'Script Refinement'],
      popular: true
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$99',
      icon: Rocket,
      color: 'from-amber-400 to-orange-600',
      features: ['Unlimited Scale', 'Pilot Strategist', 'Priority Rendering'],
      popular: false
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-32">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Secure Billing Lab</span>
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic">
           Power up your <span className="gradient-text-purple">Engine</span>
        </h1>
        <p className="text-white/40 text-xs max-w-xs mx-auto uppercase tracking-widest font-bold">
           Switch tiers or top up your virtual credits balance
        </p>
      </div>

      {/* Credit Status Card */}
      <div className="glass-premium rounded-[2.5rem] p-8 border border-white/10 relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-1000">
            <CreditCard size={120} />
         </div>
         
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
            <div>
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Available Resources</p>
               <div className="text-5xl font-black tabular-nums tracking-tighter flex items-end gap-2">
                  {profile?.credits_balance || 0}
                  <span className="text-lg text-purple-400 mb-1">CR</span>
               </div>
               <div className="mt-2 inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <span className="text-[9px] font-black uppercase tracking-wider opacity-60">System Tier: </span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-purple-400">{profile?.tier}</span>
               </div>
            </div>

            <div className="flex gap-3">
               <button 
                  onClick={() => handleAddCredits(100)}
                  disabled={!!updateLoading}
                  className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all text-[11px] font-black uppercase tracking-widest"
               >
                  {updateLoading === 'credits-100' ? 'Updating...' : '+100 CC'}
               </button>
               <button 
                  onClick={() => handleAddCredits(500)}
                  disabled={!!updateLoading}
                  className="px-8 py-4 rounded-2xl bg-purple-600 text-white shadow-xl shadow-purple-600/20 hover:bg-purple-500 active:scale-95 transition-all text-[11px] font-black uppercase tracking-widest flex items-center gap-2"
               >
                  <Plus size={14} strokeWidth={3} />
                  {updateLoading === 'credits-500' ? 'Updating...' : 'Add 500'}
               </button>
            </div>
         </div>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIERS.map((tier) => {
          const isCurrent = profile?.tier === tier.id;
          const Icon = tier.icon;
          
          return (
            <div 
              key={tier.id}
              className={`relative rounded-[2.5rem] p-8 border transition-all duration-500 flex flex-col ${
                isCurrent 
                  ? 'bg-white/5 border-purple-500/50 shadow-2xl shadow-purple-500/10' 
                  : 'bg-black/20 border-white/5 hover:border-white/20'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 px-6 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">
                   Recommended
                </div>
              )}

              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center shadow-lg mb-6`}>
                 <Icon className="text-white w-7 h-7" />
              </div>

              <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">{tier.name}</h2>
              <div className="flex items-baseline gap-1 mb-8">
                 <span className="text-3xl font-black">{tier.price}</span>
                 <span className="text-[10px] uppercase font-bold text-white/20">/ month</span>
              </div>

              <div className="flex-1 space-y-4 mb-10">
                 {tier.features.map(f => (
                   <div key={f} className="flex items-center gap-3">
                      <CheckCircle2 size={16} className={isCurrent ? 'text-purple-400' : 'text-white/20'} />
                      <span className="text-xs font-bold text-white/60">{f}</span>
                   </div>
                 ))}
              </div>

              <button
                onClick={() => handleUpdateTier(tier.id as any)}
                disabled={isCurrent || !!updateLoading}
                className={`w-full py-5 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  isCurrent 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                    : 'bg-white text-black hover:scale-105 active:scale-95'
                }`}
              >
                {isCurrent ? 'Active Plan' : updateLoading === tier.id ? 'Switching...' : 'Select Plan'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Industrial Footer Info */}
      <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 text-center">
         <div className="flex items-center justify-center gap-3 opacity-20 mb-3">
            <Lock size={12} />
            <span className="text-[9px] font-black uppercase tracking-[0.4em]">Sandbox Environment v.3.1</span>
         </div>
         <p className="text-[10px] text-white/30 font-bold uppercase leading-relaxed max-w-sm mx-auto">
            Transactions in this lab are simulated for beta testing purposes. 
            Real payment gateway activation scheduled for next cycle.
         </p>
      </div>
    </div>
  );
}
