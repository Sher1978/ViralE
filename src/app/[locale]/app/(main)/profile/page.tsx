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
  Loader2,
  Images,
  Lock,
  Smartphone
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
  
  // StoryBrand and dynamic routing states
  const [projectCount, setProjectCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [uploadingStoryBrand, setUploadingStoryBrand] = useState(false);
  const [storyBrandText, setStoryBrandText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [storyBrandError, setStoryBrandError] = useState<string | null>(null);
  const [expandedPreview, setExpandedPreview] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyBrandInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    profileService.getOrCreateProfile().then(async p => {
      setProfile(p);
      if (p?.full_name) {
        setEditName(p.full_name);
      }
      
      // Load user StoryBrand text if exists
      if (p && (p as any).storybrand_raw_content) {
        setStoryBrandText((p as any).storybrand_raw_content);
      }
      
      if (p?.id) {
        try {
          const { count, error } = await supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', p.id);
          
          if (!error && count !== null) {
            setProjectCount(count);
          }
        } catch (e) {
          console.warn('[ProfilePage] Failed to fetch project count:', e);
        }
      }
      setLoadingCount(false);
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
    const file = (e.currentTarget as any).files?.[0];
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

  const handleStoryBrandUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.currentTarget as any).files?.[0];
    if (!file) return;

    setUploadingStoryBrand(true);
    setStoryBrandError(null);
    try {
      const reader = new FileReader();
      
      const fileText = await new Promise<string>((resolve, reject) => {
        reader.onload = (event) => resolve(event.target?.result as string || '');
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
      });

      if (fileText.trim().length < 50) {
        throw new Error(locale === 'ru' 
          ? 'Текст файла слишком короткий. Минимальный размер СториБренда — 50 символов.' 
          : 'File text is too short. Minimum StoryBrand length is 50 characters.');
      }

      const res = await fetch('/api/profile/storybrand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fileText,
          filename: file.name,
          size: file.size
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setProfile(prev => prev ? {
        ...prev,
        storybrand_raw_content: fileText,
        storybrand_filename: file.name,
        storybrand_file_size: file.size,
        storybrand_updated_at: new Date().toISOString()
      } as any : null);

      setStoryBrandText(fileText);
      setSuccessMsg(locale === 'ru' ? 'СториБренд успешно сохранен!' : 'StoryBrand saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setStoryBrandError(err.message || 'Ошибка загрузки файла');
    } finally {
      setUploadingStoryBrand(false);
      (e.currentTarget as any).value = '';
    }
  };

  const handleSavePastedStoryBrand = async () => {
    if (!storyBrandText.trim() || storyBrandText.trim().length < 50) {
      setStoryBrandError(locale === 'ru' 
        ? 'Текст слишком короткий. Минимальный размер — 50 символов.' 
        : 'Text is too short. Minimum is 50 characters.');
      return;
    }

    setUploadingStoryBrand(true);
    setStoryBrandError(null);
    try {
      const sizeBytes = new Blob([storyBrandText]).size;
      const res = await fetch('/api/profile/storybrand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: storyBrandText,
          filename: 'storybrand_manual.txt',
          size: sizeBytes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      setProfile(prev => prev ? {
        ...prev,
        storybrand_raw_content: storyBrandText,
        storybrand_filename: 'storybrand_manual.txt',
        storybrand_file_size: sizeBytes,
        storybrand_updated_at: new Date().toISOString()
      } as any : null);

      setSuccessMsg(locale === 'ru' ? 'СториБренд сохранен!' : 'StoryBrand saved!');
      setTimeout(() => setSuccessMsg(null), 3000);
      setShowPasteArea(false);
    } catch (err: any) {
      setStoryBrandError(err.message || 'Ошибка сохранения текста');
    } finally {
      setUploadingStoryBrand(false);
    }
  };

  const handleDeleteStoryBrand = async () => {
    const confirmDelete = (globalThis as any).confirm?.(locale === 'ru' 
      ? 'Вы уверены, что хотите удалить СториБренд и вернуться к базовой ДНК?' 
      : 'Are you sure you want to delete the StoryBrand and fallback to base DNA?');
    
    if (!confirmDelete) return;

    setUploadingStoryBrand(true);
    try {
      const res = await fetch('/api/profile/storybrand', { method: 'DELETE' });
      if (!res.ok) throw new Error('Deletion failed');

      setProfile(prev => prev ? {
        ...prev,
        storybrand_raw_content: null,
        storybrand_filename: null,
        storybrand_file_size: null,
        storybrand_updated_at: null
      } as any : null);

      setStoryBrandText('');
      setSuccessMsg(locale === 'ru' ? 'СториБренд удален!' : 'StoryBrand deleted!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setStoryBrandError(err.message || 'Ошибка удаления');
    } finally {
      setUploadingStoryBrand(false);
    }
  };

  const isHeyGenLocked = !profile || (profile.tier !== 'creator' && profile.tier !== 'pro');

  const SETTINGS_SECTIONS = [
    {
      title: t('sectionProfile'),
      items: [
        { icon: Fingerprint, label: t('dnaLabel'), sub: t('dnaSub'), href: `/app/profile/dna`, accent: '#D4AF37' },
        { icon: UserCircle2, label: t('avatarLabel'), sub: t('avatarSub'), href: `/app/profile/avatar`, accent: '#00FFCC', locked: isHeyGenLocked },
        { icon: Images, label: 'Мои фотографии', sub: 'Управление библиотекой фото для AI-синтеза', href: `/app/profile/photos`, accent: '#A855F7' },
        { icon: Send, label: t('telegramLabel'), sub: t('telegramSub'), href: `/app/profile/telegram`, accent: '#4D9EFF' },
      ],
    },
    {
      title: t('sectionPro'),
      items: [
        { icon: Key, label: t('byokLabel'), sub: t('byokSub'), href: `/app/profile/byok`, accent: '#D4AF37', locked: isHeyGenLocked },
        { icon: ShieldCheck, label: t('securityLabel'), sub: t('securitySub'), href: `/app/profile/security`, accent: '#FF4D6D' },
      ],
    },
    {
      title: t('sectionSettings'),
      items: [
        { icon: Bell, label: t('notifLabel'), sub: t('notifSub'), href: `/app/profile/notifications`, accent: '#9B5FFF' },
        { 
          icon: Languages, 
          label: locale === 'ru' ? 'Язык Интерфейса' : 'Interface Language', 
          sub: locale === 'ru' ? 'Текущий: Русский' : 'Current: English', 
          onClick: () => {
            const nextLocale = locale === 'ru' ? 'en' : 'ru';
            
            const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
            if (globalObj && typeof globalObj.document !== 'undefined') {
              globalObj.document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
            }
            if (globalObj && typeof globalObj.window !== 'undefined') {
              globalObj.window.localStorage.setItem('NEXT_LOCALE', nextLocale);
            }
            
            if (profile?.id) {
              supabase.from('profiles').update({ preferred_language: nextLocale }).eq('id', profile.id).then();
            }
            
            router.replace(pathname, { locale: nextLocale });
          }, 
          accent: '#00FFCC' 
        },
        { icon: Moon, label: t('themeLabel'), sub: theme === 'dark' ? 'Dark Mode (Deep Space)' : 'Light Mode (Industrial Gray)', onClick: toggleTheme, accent: '#4D9EFF' },
        { 
          icon: Smartphone, 
          label: locale === 'ru' ? 'Установить PWA Приложение' : 'Install PWA App', 
          sub: locale === 'ru' ? 'Полноэкранный режим без рамок браузера' : 'Immersive fullscreen application', 
          href: `/install`, 
          accent: '#FACC15' 
        },
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
      variants={containerVariants as any}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-24"
    >
      {/* Profile Header - Dynamic & Fully Interactive */}
      <motion.div
        variants={itemVariants as any}
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
                onClick={() => !uploading && (fileInputRef.current as any)?.click()}
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
                      onChange={(e) => setEditName((e.currentTarget as any).value)}
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

      {/* --- STORYBRAND WIDGET (Mobile-First / Count Lock) --- */}
      <motion.div
        variants={itemVariants as any}
        className="mx-4 p-6 rounded-[2rem] bg-[#0c0c14]/80 border border-white/5 backdrop-blur-xl relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="text-purple-400" size={16} />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              {locale === 'ru' ? 'СториБренд (Расширенный ДНК)' : 'StoryBrand (Extended DNA)'}
            </h3>
          </div>
          {projectCount >= 3 && (
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-black uppercase tracking-wider">
              {locale === 'ru' ? 'АКТИВЕН (4+ пакет)' : 'ACTIVE (4+ pack)'}
            </span>
          )}
        </div>

        {loadingCount ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="animate-spin text-purple-400" size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Проверка прогресса...</span>
          </div>
        ) : projectCount < 3 ? (
          // LOCKED / PROGRESS STATE (First 3 packages)
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  {locale === 'ru' ? 'Прогресс пакетов' : 'Package progress'}
                </span>
                <span className="text-[10px] font-black text-purple-400">
                  {projectCount} / 3
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-[0_0_10px_rgba(168,85,247,0.4)] transition-all duration-500" 
                  style={{ width: `${(projectCount / 3) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/10">
              <Lock size={16} className="text-yellow-500/80 shrink-0 mt-0.5" />
              <p className="text-[11px] text-white/50 leading-relaxed font-medium">
                {locale === 'ru' ? (
                  <>
                    Опция загрузки файла <b>СториБренда</b> станет доступна на 4-м пакете контента. 
                    Сейчас ИИ использует вашу стартовую «Цифровую ДНК» из 10 вопросов для стабилизации Tone of Voice. 
                    Создайте еще {3 - projectCount} {3 - projectCount === 1 ? 'проект' : 'проекта'}, чтобы разблокировать расширенный режим.
                  </>
                ) : (
                  <>
                    The <b>StoryBrand</b> upload feature will unlock on your 4th content pack.
                    The AI currently uses your onboarding 10-question "Digital DNA" to stabilize your Tone of Voice.
                    Create {3 - projectCount} more {3 - projectCount === 1 ? 'project' : 'projects'} to unlock the extended mode.
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          // UNLOCKED STATE (4th+ Package)
          <div className="space-y-4">
            <input 
              type="file" 
              ref={storyBrandInputRef} 
              onChange={handleStoryBrandUpload} 
              className="hidden" 
              accept=".txt,.md,.json" 
            />

            {profile && (profile as any).storybrand_filename ? (
              // StoryBrand uploaded successfully
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-white truncate">
                      📄 {(profile as any).storybrand_filename}
                    </p>
                    <p className="text-[9px] text-white/30 uppercase font-black mt-0.5">
                      {((profile as any).storybrand_file_size / 1024).toFixed(1)} KB · {locale === 'ru' ? 'Обновлен' : 'Updated'}: {new Date((profile as any).storybrand_updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <button
                    onClick={handleDeleteStoryBrand}
                    disabled={uploadingStoryBrand}
                    className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all disabled:opacity-30"
                    title={locale === 'ru' ? 'Сбросить' : 'Reset'}
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Subtitle / visual note */}
                <div className="p-3.5 rounded-xl bg-green-500/5 border border-green-500/10 flex gap-2">
                  <Check size={14} className="text-green-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-white/60 leading-relaxed font-bold">
                    {locale === 'ru' 
                      ? 'ИИ автоматически переключился на использование данных из вашего СториБренда для генерации сценариев и постов.' 
                      : 'AI has automatically switched to using your StoryBrand document for generating scripts and posts.'}
                  </p>
                </div>

                {/* Extracted Text Preview block with fadeout */}
                {storyBrandText && (
                  <div className="border border-white/5 rounded-2xl bg-black/40 overflow-hidden relative">
                    <div className="p-3 border-b border-white/5 flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-wider text-white/40">
                        {locale === 'ru' ? 'Содержимое документа' : 'Document content'}
                      </span>
                      <button
                        onClick={() => setExpandedPreview(!expandedPreview)}
                        className="text-[9px] font-black uppercase text-purple-400 hover:text-purple-300"
                      >
                        {expandedPreview ? (locale === 'ru' ? 'Свернуть' : 'Collapse') : (locale === 'ru' ? 'Развернуть' : 'Expand')}
                      </button>
                    </div>
                    <div className={`p-4 text-[10.5px] text-white/50 font-mono leading-relaxed overflow-y-auto ${expandedPreview ? 'max-h-60' : 'max-h-16'}`}>
                      {storyBrandText}
                    </div>
                    {!expandedPreview && (
                      <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-[#0e0e14] to-transparent pointer-events-none" />
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => (storyBrandInputRef.current as any)?.click()}
                    disabled={uploadingStoryBrand}
                    className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-30"
                  >
                    {uploadingStoryBrand ? <Loader2 className="animate-spin" size={12} /> : '📁'} 
                    {locale === 'ru' ? 'Заменить файл' : 'Replace file'}
                  </button>

                  <button
                    onClick={() => {
                      setStoryBrandText((profile as any).storybrand_raw_content || '');
                      setShowPasteArea(true);
                      setStoryBrandError(null);
                    }}
                    className="py-3.5 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all"
                  >
                    {locale === 'ru' ? 'Редактировать' : 'Edit Text'}
                  </button>
                </div>
              </div>
            ) : (
              // Empty state
              <div className="space-y-4">
                <div className="text-center py-5 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                    {locale === 'ru' ? 'СториБренд не загружен' : 'StoryBrand not loaded'}
                  </p>
                  <p className="text-[9px] text-white/20 mt-1 max-w-[200px] mx-auto leading-relaxed">
                    {locale === 'ru' 
                      ? 'Загрузите текстовый файл или вставьте описание эксперта вручную' 
                      : 'Upload a text file or paste your expert description manually'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => (storyBrandInputRef.current as any)?.click()}
                    disabled={uploadingStoryBrand}
                    className="flex-1 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-30"
                  >
                    {uploadingStoryBrand ? <Loader2 className="animate-spin text-white" size={12} /> : '📁'} 
                    {locale === 'ru' ? 'Загрузить файл' : 'Upload File'}
                  </button>

                  <button
                    onClick={() => {
                      setStoryBrandText('');
                      setShowPasteArea(true);
                      setStoryBrandError(null);
                    }}
                    className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    📝 {locale === 'ru' ? 'Вставить текст' : 'Paste Text'}
                  </button>
                </div>
              </div>
            )}

            {/* Paste/Edit Dialog Block */}
            {showPasteArea && (
              <div className="mt-3 p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 block">
                  {locale === 'ru' ? 'Ручной ввод СториБренда' : 'Manual StoryBrand Input'}
                </span>
                <textarea
                  value={storyBrandText}
                  onChange={(e) => setStoryBrandText((e.currentTarget as any).value)}
                  rows={6}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-[11px] text-white/70 focus:border-purple-500/50 transition-all resize-none outline-none leading-relaxed font-medium placeholder:text-white/20"
                  placeholder={locale === 'ru' 
                    ? "Вставьте подробную информацию об эксперте, продукте, методологии и аудитории..." 
                    : "Paste detailed information about the expert, product, methodology, and audience..."}
                />
                
                {storyBrandError && (
                  <p className="text-red-400 text-[9.5px] font-bold">{storyBrandError}</p>
                )}

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowPasteArea(false)}
                    className="px-3.5 py-2 rounded-lg border border-white/10 text-white/50 hover:bg-white/5 text-[9px] font-black uppercase tracking-wider transition-all"
                  >
                    {locale === 'ru' ? 'Отмена' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSavePastedStoryBrand}
                    disabled={uploadingStoryBrand}
                    className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1 disabled:opacity-30"
                  >
                    {uploadingStoryBrand && <Loader2 className="animate-spin" size={10} />}
                    {locale === 'ru' ? 'Сохранить' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Main Settings List */}
      <div className="space-y-8 px-1">
        {SETTINGS_SECTIONS.map((section, sIdx) => (
          <motion.div 
            key={section.title} 
            variants={section as any ? (itemVariants as any) : undefined}
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
                      <div className="text-sm font-bold text-white/90 mb-0.5 group-hover:text-white transition-colors flex items-center gap-2">
                        {item.label}
                        {(item as any).locked && (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Lock size={8} className="fill-yellow-500/20" />
                            PRO
                          </span>
                        )}
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
                      <div onClick={(item as any).onClick}>{content}</div>
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
      <motion.div variants={itemVariants as any} className="px-1 space-y-6">
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
