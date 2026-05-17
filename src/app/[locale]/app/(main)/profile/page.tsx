'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname, Link } from '@/navigation';
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
  Settings2,
  Sparkles,
  Zap,
  Camera,
  Check,
  X,
  Edit2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditBadge } from '@/components/ui/CreditBadge';
import React, { useEffect, useState, useRef } from 'react';
import { profileService } from '@/lib/services/profileService';
import { Profile } from '@/lib/services/profileService';
import { supabase } from '@/lib/supabase';

import { useTheme } from 'next-themes';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    profileService.getOrCreateProfile().then(p => {
      setProfile(p);
      if (p?.full_name) {
        setEditName(p.full_name);
      }
    });
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSuccessMsg(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload image to public 'media' storage bucket (reusing existing schema)
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // Save to profile
      const success = await profileService.updateProfile(user.id, {
        avatar_url: publicUrl
      });

      if (success) {
        setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
        setSuccessMsg(t('uploadSuccess'));
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error uploading avatar:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile || !editName.trim()) return;
    setSaving(true);
    setSuccessMsg(null);
    try {
      const success = await profileService.updateProfile(profile.id, {
        full_name: editName
      });
      if (success) {
        setProfile(prev => prev ? { ...prev, full_name: editName } : null);
        setIsEditing(false);
        setSuccessMsg(t('updateSuccess'));
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

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
        { 
          icon: Languages, 
          label: locale === 'ru' ? 'Язык Интерфейса' : 'Interface Language', 
          sub: locale === 'ru' ? 'Текущий: Русский' : 'Current: English', 
          onClick: () => {
            const nextLocale = locale === 'ru' ? 'en' : 'ru';
            router.replace(pathname, { locale: nextLocale });
          }, 
          accent: '#00FFCC' 
        },
        { icon: Moon, label: t('themeLabel'), sub: theme === 'dark' ? 'Dark Mode (Deep Space)' : 'Light Mode (Industrial Gray)', onClick: toggleTheme, accent: '#4D9EFF' },
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

  // Determine fallback initial letter
  const defaultInitial = profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'M';
  // Determine stable number in case full_name is missing
  const stableNum = profile ? parseInt(profile.id.slice(0, 4), 16) % 10000 : 0;
  const defaultName = locale === 'ru' ? `Медиа Криейтор #${stableNum}` : `Media Creator #${stableNum}`;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-24"
    >
      {/* Profile Header - Dynamic & Fully Interactive */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden pt-4 pb-8 pl-16 pr-4 border-b border-white/10 bg-black/50"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 blur-sm">
          <Settings2 size={100} strokeWidth={1} className="text-yellow-500" />
        </div>

        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-5">
            
            {/* Dynamic Avatar with photo upload & micro-animations */}
            <div className="relative group">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarUpload} 
                className="hidden" 
                accept="image/*" 
              />
              <div 
                onClick={() => !uploading && fileInputRef.current?.click()}
                className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer shadow-xl relative transition-all group-hover:scale-105 group-hover:border-cyan-500/50"
              >
                {uploading ? (
                  <Loader2 className="animate-spin text-cyan-400" size={24} />
                ) : profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.full_name || 'Avatar'} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-3xl font-black text-cyan-400 select-none">
                    {defaultInitial}
                  </span>
                )}
                
                {/* Upload Hover Overlay */}
                {!uploading && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                    <Camera size={16} className="text-white" />
                    <span className="text-[8px] font-black uppercase text-white/80 tracking-wider">
                      {t('uploadNewPhoto')}
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#00FFCC] w-6 h-6 rounded-full border-4 border-[#0b1229] flex items-center justify-center shadow-lg">
                <Zap size={10} className="text-black fill-black" />
              </div>
            </div>

            {/* Dynamic Details with Inline Edit Mode */}
            <div className="space-y-1">
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-2"
                  >
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={t('editNamePlaceholder')}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white font-black text-lg tracking-tight focus:outline-none focus:border-cyan-500/50 w-full max-w-[200px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveProfile();
                        if (e.key === 'Escape') setIsEditing(false);
                      }}
                      autoFocus
                    />
                    <button 
                      onClick={handleSaveProfile}
                      disabled={saving || !editName.trim()}
                      className="p-2 rounded-xl bg-green-500/20 border border-green-500/30 hover:bg-green-500/30 text-green-400 hover:scale-105 active:scale-95 transition-all"
                    >
                      {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 hover:scale-105 active:scale-95 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-2.5"
                  >
                    <h1 className="text-2xl font-black text-white/90 tracking-tight leading-none">
                      {profile?.full_name || defaultName}
                    </h1>
                    <button 
                      onClick={() => {
                        setEditName(profile?.full_name || defaultName);
                        setIsEditing(true);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/15 transition-all text-white/40 hover:text-white/80"
                      title={t('editProfile')}
                    >
                      <Edit2 size={11} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-xs text-white/40 font-medium">{profile?.email || 'creator@virale.io'}</p>
              
              <div className="flex items-center gap-2 pt-1">
                {/* Dynamically Styled Tier Badge */}
                <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-[9px] font-black uppercase text-yellow-400 tracking-wider">
                    {profile?.tier ? `${profile.tier} STATUS` : 'FREE STATUS'}
                  </span>
                </div>
                {/* Dynamic Calculated Credits Packs */}
                <CreditBadge 
                  credits={profile?.credits_balance ?? 0} 
                  packs={Math.max(0, Math.floor((profile?.credits_balance ?? 0) / 100))} 
                />
              </div>
            </div>

          </div>
        </div>

        {/* Global Toast Success Message */}
        <AnimatePresence>
          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 right-4 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl z-20 backdrop-blur-md"
            >
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

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
              {section.items.map((item, i) => {
                const content = (
                  <div className="group flex items-center gap-4 p-5 transition-all hover:bg-white/[0.05] active:scale-[0.98] cursor-pointer">
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
                );

                return (
                  <React.Fragment key={item.label}>
                    {item.href ? (
                      <Link href={item.href}>{content}</Link>
                    ) : (
                      <div onClick={item.onClick}>{content}</div>
                    )}
                    {i < section.items.length - 1 && (
                      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-5" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Logout & Footer */}
      <motion.div variants={itemVariants} className="px-1 space-y-6">
        <button
          onClick={handleLogout}
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
