'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from '@/navigation';
import { useLocale } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { useAppData } from '@/components/providers/AppDataProvider';
import {
  Images,
  Trash2,
  ChevronLeft,
  Upload,
  Check,
  Loader2,
  X,
  ImageIcon,
  Star,
  StarOff,
} from 'lucide-react';

interface UserPhoto {
  name: string;
  path: string;
  url: string;
  size: number;
  createdAt: string;
}

export default function PhotoGalleryPage() {
  const router = useRouter();
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateProfile } = useAppData();

  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<UserPhoto | null>(null);
  const [settingAvatar, setSettingAvatar] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPhotos = async () => {
    try {
      const res = await fetch('/api/profile/photos');
      const data = await res.json();
      if (data.photos) setPhotos(data.photos);
    } catch (e) {
      console.error('[Gallery] Failed to load photos:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentAvatar = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      if (data?.avatar_url) setCurrentAvatarUrl(data.avatar_url);
    } catch (e) {}
  };

  useEffect(() => {
    loadPhotos();
    loadCurrentAvatar();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target as any).files?.[0];
    if (!file) return;
    (e.target as any).value = '';

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = file.name.split('.').pop() || 'jpg';
      const path = `avatars/${user.id}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage.from('media').upload(path, file);
      if (error) throw error;

      showToast(locale === 'ru' ? 'Фото загружено!' : 'Photo uploaded!');
      await loadPhotos();
    } catch (err: any) {
      showToast(err.message || (locale === 'ru' ? 'Ошибка загрузки' : 'Upload error'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: UserPhoto) => {
    setDeletingPath(photo.path);
    try {
      const res = await fetch('/api/profile/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: photo.path }),
      });
      if (!res.ok) throw new Error(locale === 'ru' ? 'Ошибка удаления' : 'Delete error');
      setPhotos(prev => prev.filter(p => p.path !== photo.path));
      if (selectedPhoto?.path === photo.path) setSelectedPhoto(null);
      showToast(locale === 'ru' ? 'Фото удалено' : 'Photo deleted');
    } catch (err: any) {
      showToast(err.message || (locale === 'ru' ? 'Ошибка' : 'Error'), 'error');
    } finally {
      setDeletingPath(null);
    }
  };

  const handleSetAsAvatar = async (photo: UserPhoto) => {
    setSettingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: photo.url })
        .eq('id', user.id);
      if (error) throw error;

      setCurrentAvatarUrl(photo.url);
      updateProfile({ avatar_url: photo.url });
      setSelectedPhoto(null);
      showToast(locale === 'ru' ? 'Фото профиля обновлено!' : 'Profile photo updated!');
    } catch (err: any) {
      showToast(err.message || (locale === 'ru' ? 'Ошибка' : 'Error'), 'error');
    } finally {
      setSettingAvatar(false);
    }
  };

  const isCurrentAvatar = (photo: UserPhoto) =>
    currentAvatarUrl && photo.url === currentAvatarUrl;

  return (
    <div className="min-h-screen bg-[#050508] text-white pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#050508]/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center gap-4 px-4 h-14">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all active:scale-90"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Images size={16} className="text-purple-400" />
          <h1 className="text-sm font-black uppercase tracking-widest text-white/80">
            {locale === 'ru' ? 'Мои фотографии' : 'My Photos'}
          </h1>
        </div>
        <button
          onClick={() => (fileInputRef.current as any)?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500 text-white text-xs font-bold uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Upload size={12} />
          )}
          {uploading 
            ? (locale === 'ru' ? 'Загрузка...' : 'Uploading...') 
            : (locale === 'ru' ? 'Добавить' : 'Add')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 size={32} className="animate-spin text-purple-400/50" />
            <p className="text-xs text-white/20 uppercase tracking-widest">
              {locale === 'ru' ? 'Загрузка фото...' : 'Loading photos...'}
            </p>
          </div>
        ) : photos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-6"
          >
            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
              <ImageIcon size={32} className="text-white/20" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-black text-white/40 uppercase tracking-widest">
                {locale === 'ru' ? 'Фотографий пока нет' : 'No photos yet'}
              </p>
              <p className="text-xs text-white/20">
                {locale === 'ru' 
                  ? 'Загрузите фото для аватара и синтеза AI-видео' 
                  : 'Upload photos for your avatar and AI video synthesis'}
              </p>
            </div>
            <button
              onClick={() => (fileInputRef.current as any)?.click()}
              className="px-8 py-4 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-bold uppercase tracking-widest active:scale-95 transition-all"
            >
              {locale === 'ru' ? 'Загрузить первое фото' : 'Upload first photo'}
            </button>
          </motion.div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs text-white/30 font-medium">
                {photos.length} {locale === 'ru' 
                  ? (photos.length === 1 ? 'фото' : photos.length < 5 ? 'фото' : 'фотографий') 
                  : (photos.length === 1 ? 'photo' : 'photos')}
              </span>
              {currentAvatarUrl && (
                <span className="text-xs text-yellow-400/60 font-medium flex items-center gap-1">
                  <Star size={10} className="fill-yellow-400 text-yellow-400" />
                  {locale === 'ru' ? 'Фото профиля выбрано' : 'Profile photo selected'}
                </span>
              )}
            </div>

            {/* Photo grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-3 gap-1.5"
            >
              {photos.map((photo, idx) => (
                <motion.div
                  key={photo.path}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }}
                  className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.url}
                    alt=""
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  {/* Current avatar badge */}
                  {isCurrentAvatar(photo) && (
                    <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
                      <Star size={10} className="fill-black text-black" />
                    </div>
                  )}
                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(photo); }}
                    disabled={deletingPath === photo.path}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 active:scale-90 transition-all text-white/70 hover:text-red-400 hover:bg-red-500/20"
                  >
                    {deletingPath === photo.path ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Trash2 size={10} />
                    )}
                  </button>
                  {/* Dark overlay on hover */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </div>

      {/* Photo detail modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex flex-col"
            onClick={() => setSelectedPhoto(null)}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-4 h-14 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 active:scale-90 transition-all"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-2">
                {isCurrentAvatar(selectedPhoto) && (
                  <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20">
                    {locale === 'ru' ? '★ Фото профиля' : '★ Profile Photo'}
                  </span>
                )}
              </div>
            </div>

            {/* Large photo view */}
            <div
              className="flex-1 flex items-center justify-center p-6"
              onClick={() => setSelectedPhoto(null)}
            >
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                src={selectedPhoto.url}
                alt=""
                className="max-w-full max-h-full rounded-3xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Action buttons */}
            <div
              className="flex-shrink-0 p-4 flex flex-col gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              {!isCurrentAvatar(selectedPhoto) ? (
                <button
                  onClick={() => handleSetAsAvatar(selectedPhoto)}
                  disabled={settingAvatar}
                  className="w-full py-4 rounded-2xl bg-white text-black text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {settingAvatar ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Star size={16} />
                  )}
                  {settingAvatar 
                    ? (locale === 'ru' ? 'Сохраняем...' : 'Saving...') 
                    : (locale === 'ru' ? 'Сделать фото профиля' : 'Set as Profile Photo')}
                </button>
              ) : (
                <div className="w-full py-4 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2">
                  <Check size={16} />
                  {locale === 'ru' ? 'Текущее фото профиля' : 'Current Profile Photo'}
                </div>
              )}
              <button
                onClick={() => handleDelete(selectedPhoto)}
                disabled={deletingPath === selectedPhoto.path}
                className="w-full py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                {deletingPath === selectedPhoto.path ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                {locale === 'ru' ? 'Удалить фото' : 'Delete Photo'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md border shadow-2xl whitespace-nowrap ${
              toast.type === 'error'
                ? 'bg-red-500/20 border-red-500/30 text-red-300'
                : 'bg-green-500/20 border-green-500/30 text-green-300'
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
