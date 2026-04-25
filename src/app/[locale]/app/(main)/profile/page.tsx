'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { 
  ChevronRight, 
  LogOut, 
  Fingerprint, 
  UserCircle2, 
  Send, 
  Bell, 
  Moon, 
  Languages, 
  Key, 
  ShieldCheck, 
  Cpu, 
  BarChart3, 
  Settings2,
  Sparkles,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { CreditBadge } from '@/components/ui/CreditBadge';
import { useEffect, useState } from 'react';
import { profileService } from '@/lib/services/profileService';
import { Profile } from '@/lib/services/profileService';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    profileService.getOrCreateProfile().then(setProfile);
  }, []);

  const SETTINGS_SECTIONS = [
    {
      title: t('sectionProfile'),
      items: [
        { icon: Fingerprint, label: t('dnaLabel'), sub: t('dnaSub'), href: `/${locale}/app/profile/dna`, accent: '#D4AF37' },
        { icon: UserCircle2, label: t('avatarLabel'), sub: t('avatarSub'), href: `/${locale}/app/profile/avatar`, accent: '#00FFCC' },
        { icon: Send, label: t('telegramLabel'), sub: t('telegramSub'), href: `/${locale}/app/profile/telegram`, accent: '#4D9EFF' },
      ],
    },
    {
      title: t('sectionPro'),
      items: [
        { icon: Key, label: t('byokLabel'), sub: t('byokSub'), href: `/${locale}/app/profile/byok`, accent: '#D4AF37' },
        { icon: ShieldCheck, label: t('securityLabel'), sub: t('securitySub'), href: `/${locale}/app/profile/security`, accent: '#FF4D6D' },
      ],
    },
    {
      title: t('sectionSettings'),
      items: [
        { icon: Bell, label: t('notifLabel'), sub: t('notifSub'), href: `/${locale}/app/profile/notifications`, accent: '#9B5FFF' },
        { icon: Moon, label: t('themeLabel'), sub: t('themeSub'), href: `/${locale}/app/profile/theme`, accent: '#4D9EFF' },
        { icon: Languages, label: t('langLabel'), sub: locale === 'ru' ? 'Русский' : 'English', href: `/${locale}/app/profile/language`, accent: '#00FFCC' },
      ],
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-24"
    >
      {/* Profile Header - Aligned with Strategist */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden pt-4 pb-8 pl-16 pr-4 border-b border-white/10 bg-black/50"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 blur-sm">
          <Settings2 size={100} strokeWidth={1} className="text-yellow-500" />
        </div>

        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-5">
            {/* Avatar with dynamic glow */}
            <div className="relative">
              <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center text-3xl shadow-xl">
                🧑‍💻
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#00FFCC] w-6 h-6 rounded-full border-4 border-[#0b1229] flex items-center justify-center">
                <Zap size={10} className="text-black fill-black" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-black text-white/90 tracking-tight leading-none mb-1">
                {locale === 'ru' ? 'Авто Эксперт' : 'Car Expert'}
              </h1>
              <p className="text-xs text-white/40 font-medium mb-3">expert@auto.io</p>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-[9px] font-black uppercase text-yellow-400 tracking-wider">
                    PRO STATUS
                  </span>
                </div>
                <CreditBadge credits={840} packs={8} />
              </div>
            </div>
          </div>
        </div>

        {/* DNA Quick Preview - Gold Style */}
        {profile?.digital_shadow_prompt && (
          <div className="mt-8 p-5 bg-yellow-500/5 border-y border-yellow-500/10 backdrop-blur-sm -mx-16">
            <div className="flex items-center gap-2 mb-2 px-16">
              <Fingerprint size={12} className="text-[#FACC15]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#FACC15]/80">DNA Signature</span>
            </div>
            <p className="text-[11px] text-white/50 px-16 line-clamp-2 leading-relaxed italic">
              "{profile.digital_shadow_prompt}"
            </p>
          </div>
        )}

        {/* Micro Stats Row - Golden Highlights */}
        <div className="grid grid-cols-3 gap-0 mt-8 -mx-16 border-t border-white/5 bg-black/20">
          {[
            { label: t('statVideos'), value: '12', icon: Sparkles, color: 'text-yellow-400' },
            { label: t('statFollowers'), value: '24K', icon: UserCircle2, color: 'text-amber-400' },
            { label: t('statReach'), value: '180K', icon: BarChart3, color: 'text-white/40' },
          ].map((stat, idx) => (
            <div key={stat.label} className={`p-6 flex flex-col items-center justify-center ${idx < 2 ? 'border-r border-white/5' : ''}`}>
              <div className="flex items-center gap-1.5 mb-1 opacity-50">
                <stat.icon size={10} />
                <span className="text-[8px] font-bold uppercase tracking-widest leading-none">{stat.label}</span>
              </div>
              <div className={`text-xl font-black tracking-tighter ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Main Settings List */}
      <div className="space-y-8 px-1">
        {SETTINGS_SECTIONS.map((section, sIdx) => (
          <motion.div 
            key={section.title} 
            variants={itemVariants}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 px-2">
              <div className="w-1 h-3 rounded-full bg-white/20" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                {section.title}
              </h2>
            </div>
            
            <div className="overflow-hidden border-y border-white/[0.06] bg-black">
              {section.items.map((item, i) => (
                <Link key={item.label} href={item.href}>
                  <div className="group flex items-center gap-4 p-5 transition-all hover:bg-white/[0.05] active:scale-[0.98]">
                    <div 
                      className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ 
                        background: `${item.accent}12`,
                        border: `1px solid ${item.accent}20`,
                        color: item.accent
                      }}
                    >
                      <item.icon size={20} strokeWidth={2} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white/90 mb-0.5 group-hover:text-white transition-colors">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-white/30 font-medium group-hover:text-white/50 transition-colors">
                        {item.sub}
                      </div>
                    </div>
                    
                    <ChevronRight size={16} className="text-white/10 group-hover:translate-x-1 transition-all" />
                  </div>
                  {i < section.items.length - 1 && (
                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-5" />
                  )}
                </Link>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Logout & Footer */}
      <motion.div variants={itemVariants} className="px-1 space-y-6">
        <button
          className="w-full flex items-center justify-center gap-3 py-5 rounded-[2rem] text-sm font-black transition-all hover:bg-[#FF4D6D]/10 active:scale-95 group"
          style={{
            background: 'rgba(255,77,109,0.05)',
            border: '1px solid rgba(255,77,109,0.15)',
            color: '#FF4D6D',
          }}
        >
          <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
          {commonT('logout').toUpperCase()}
        </button>

        <div className="text-center space-y-2 pb-8">
          <div className="flex items-center justify-center gap-2 opacity-20">
            <Cpu size={12} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">
              {t('version')}
            </p>
          </div>
          <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest">
            © 2026 SHERLOCK DIGITAL CORE
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
