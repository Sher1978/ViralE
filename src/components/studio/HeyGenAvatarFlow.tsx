'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, ChevronRight, ChevronLeft, Upload, Check, Loader2,
  AlertCircle, X, Mic, Globe2, Bot, Sparkles, Play, Pause,
  Download, Scissors, RefreshCw, ExternalLink, Video, Camera
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeyGenAvatar {
  id: string;
  url: string;
  label: string;
  type: 'talking_photo' | 'avatar';
  previewVideoUrl?: string;
}

interface HeyGenVoice {
  id: string;
  name: string;
  preview_audio?: string | null;
  isAvatarVoice: boolean;
}

interface Language {
  code: string;
  label: string;
  flag: string;
}

interface HeyGenAvatarFlowProps {
  manifest: any;
  projectId: string;
  onSendToMontage: (videoUrl: string) => void;
  onBack: () => void;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'API Ключ' },
  { id: 2, label: 'Аватар' },
  { id: 3, label: 'Голос & Текст' },
  { id: 4, label: 'Генерация' },
  { id: 5, label: 'Результат' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HeyGenAvatarFlow({
  manifest,
  projectId,
  onSendToMontage,
  onBack,
}: HeyGenAvatarFlowProps) {
  const [step, setStep] = useState(1);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [actualDeductedCredits, setActualDeductedCredits] = useState<number | null>(null);
  const [finalDuration, setFinalDuration] = useState<number | null>(null);

  // Step 1 — BYOK
  const [heygenKey, setHeygenKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);

  // Step 2 — Avatar
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([]);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<HeyGenAvatar | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Step 3 — Script, Voice, Language
  const scriptText = (() => {
    if (!manifest) return '';
    if (manifest.useCustomScript && manifest.customScript) return manifest.customScript;
    const segs = manifest.segments || [];
    return segs.map((s: any) => s.scriptText || s.text || '').filter(Boolean).join('\n\n');
  })();
  const [editedScript, setEditedScript] = useState(scriptText);
  const [voices, setVoices] = useState<HeyGenVoice[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState('ru');
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const audioRef = useRef<any>(null);

  // Step 4 — Generation
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const pollIntervalRef = useRef<any>(null);

  // Step 5 — Result
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const resultVideoRef = useRef<HTMLVideoElement>(null);

  // ─── Step 1: Load BYOK status ───────────────────────────────────────────────

  useEffect(() => {
    const checkKey = async () => {
      try {
        const res = await fetch('/api/profile/byok');
        const data = await res.json();
        if (data.heygen?.hasKey) {
          setHasKey(true);
          setMaskedKey(data.heygen.maskedKey);
        }
        if (data.credits_balance !== undefined) {
          setUserBalance(data.credits_balance);
        }
      } catch (e) {
        console.warn('[HeyGenFlow] Could not check BYOK status');
      }
    };
    checkKey();
  }, []);

  const handleSaveKey = async () => {
    if (!heygenKey.trim()) return;
    setIsSavingKey(true);
    setKeyError(null);
    try {
      const res = await fetch('/api/profile/byok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heygenKey: heygenKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка сохранения ключа');
      setHasKey(true);
      setMaskedKey(heygenKey.trim().slice(0, 4) + '••••••' + heygenKey.trim().slice(-4));
      setHeygenKey('');
      setStep(2);
    } catch (e: any) {
      setKeyError(e.message);
    } finally {
      setIsSavingKey(false);
    }
  };

  // ─── Step 2: Load Avatars ───────────────────────────────────────────────────

  const loadAvatars = useCallback(async () => {
    setIsLoadingAvatars(true);
    try {
      const res = await fetch('/api/ai/heygen/avatars');
      const data = await res.json();
      if (data.avatars) {
        const seenIds = new Set<string>();
        const uniqueAvatars: HeyGenAvatar[] = [];
        for (const a of data.avatars) {
          if (a.id && !seenIds.has(a.id)) {
            seenIds.add(a.id);
            uniqueAvatars.push({
              id: a.id,
              url: a.url,
              label: a.label || 'Avatar',
              type: a.type || 'talking_photo',
            });
          }
        }
        setAvatars(uniqueAvatars);
      }
    } catch (e) {
      console.error('[HeyGenFlow] Failed to load avatars:', e);
    } finally {
      setIsLoadingAvatars(false);
    }
  }, []);

  useEffect(() => {
    if (step === 2) loadAvatars();
  }, [step, loadAvatars]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target as any).files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setUploadError(null);

    try {
      // 1. Upload to Supabase
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `heygen-avatars/${user?.id || 'anon'}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('media').upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);

      // 2. Create Talking Photo on HeyGen (reuse existing route)
      const res = await fetch('/api/ai/heygen/talking-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: publicUrl, avatarType: 'talking_photo', projectId }),
      });
      // This route now creates the talking photo — but we need the talking_photo_id
      // For the avatar flow, we'll use the Supabase photo directly as a preview
      // and rely on the video-generate API to do the HeyGen upload inline

      const newAvatar: HeyGenAvatar = {
        id: `local_${Date.now()}`,
        url: publicUrl,
        label: file.name.replace(/\.[^.]+$/, ''),
        type: 'talking_photo',
      };
      setAvatars(prev => [newAvatar, ...prev]);
      setSelectedAvatar(newAvatar);
    } catch (e: any) {
      setUploadError(e.message || 'Ошибка загрузки фото');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // ─── Step 3: Load Voices ────────────────────────────────────────────────────

  const loadVoices = useCallback(async () => {
    if (!selectedAvatar) return;
    setIsLoadingVoices(true);
    try {
      const params = new URLSearchParams({
        language: selectedLang,
        ...(selectedAvatar.id && !selectedAvatar.id.startsWith('local_')
          ? { avatarId: selectedAvatar.id }
          : {}),
      });
      const res = await fetch(`/api/ai/heygen/voices?${params}`);
      const data = await res.json();
      if (data.voices) {
        setVoices(data.voices);
        if (data.voices.length > 0 && !selectedVoice) {
          setSelectedVoice(data.voices[0].id);
        }
      }
      if (data.languages) setLanguages(data.languages);
    } catch (e) {
      console.error('[HeyGenFlow] Failed to load voices:', e);
    } finally {
      setIsLoadingVoices(false);
    }
  }, [selectedAvatar, selectedLang]);

  useEffect(() => {
    if (step === 3) loadVoices();
  }, [step, selectedLang, loadVoices]);

  const playVoicePreview = (audioUrl: string, voiceId: string) => {
    const audio = audioRef.current as any;
    if (playingPreview === voiceId) {
      audio?.pause();
      setPlayingPreview(null);
      return;
    }
    if (audio) {
      audio.pause();
      audio.src = audioUrl;
      audio.play().catch(() => {});
    }
    setPlayingPreview(voiceId);
  };

  // ─── Step 4: Generate ───────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!selectedAvatar || !selectedVoice || !editedScript.trim()) return;
    setIsGenerating(true);
    setGenError(null);
    setStep(4);

    try {
      const res = await fetch('/api/ai/heygen/video-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarId: selectedAvatar.id.startsWith('local_')
            ? undefined // will upload via photoUrl in server
            : selectedAvatar.id,
          avatarType: selectedAvatar.type,
          scriptText: editedScript.trim(),
          voiceId: selectedVoice,
          language: selectedLang,
          projectId,
          photoUrl: selectedAvatar.id.startsWith('local_') ? selectedAvatar.url : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка запуска генерации');
      setVideoId(data.videoId);
      startPolling(data.videoId);
    } catch (e: any) {
      setGenError(e.message);
      setIsGenerating(false);
    }
  };

  const startPolling = (vid: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai/heygen/video-status?videoId=${vid}`);
        const data = await res.json();
        if (data.status === 'completed' && data.videoUrl) {
          clearInterval(pollIntervalRef.current);
          setIsGenerating(false);
          setResultVideoUrl(data.videoUrl);
          setFinalDuration(data.duration || null);
          
          if (!hasKey) {
            const actualDuration = data.duration || 0;
            const costRate = selectedAvatar?.type === 'avatar' ? (20 / 60) : (50 / 60);
            const actualCost = Math.round(actualDuration * costRate);
            setActualDeductedCredits(actualCost);
            
            // Refresh balance
            try {
              const balanceRes = await fetch('/api/profile/byok');
              const balanceData = await balanceRes.json();
              if (balanceData.credits_balance !== undefined) {
                setUserBalance(balanceData.credits_balance);
              }
            } catch (e) {
              console.warn('[HeyGenFlow] Failed to refresh balance after completion');
            }
          } else {
            setActualDeductedCredits(0);
          }
          
          setStep(5);
        } else if (data.status === 'failed') {
          clearInterval(pollIntervalRef.current);
          setGenError(data.error || 'Генерация завершилась с ошибкой');
          setIsGenerating(false);
        }
      } catch (e) {
        // polling error, keep trying
      }
    }, 5000); // poll every 5s
  };

  useEffect(() => {
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  // ─── Step 5: Result ─────────────────────────────────────────────────────────

  const toggleResultPlay = () => {
    const v = resultVideoRef.current as any;
    if (!v) return;
    if (isVideoPlaying) { v.pause(); setIsVideoPlaying(false); }
    else { v.play(); setIsVideoPlaying(true); }
  };

  const handleDownload = () => {
    if (!resultVideoUrl) return;
    const a = (globalThis as any).document?.createElement('a');
    if (a) {
      a.href = resultVideoUrl;
      a.download = `heygen_avatar_${Date.now()}.mp4`;
      a.click();
    }
  };

  // ─── Render Helpers ─────────────────────────────────────────────────────────

  const wordCount = editedScript.trim().split(/\s+/).filter(Boolean).length;
  const estDuration = Math.max(5, Math.ceil(wordCount / 2.3));
  const costRate = selectedAvatar?.type === 'avatar' ? (20 / 60) : (50 / 60);
  const estCost = Math.round(estDuration * costRate);
  const estimatedCost = hasKey ? 0 : estCost;
  const hasInsufficientBalance = !hasKey && userBalance < estimatedCost;

  const canProceedStep1 = hasKey;
  const canProceedStep2 = !!selectedAvatar;
  const canProceedStep3 = !!selectedVoice && editedScript.trim().length > 5 && !hasInsufficientBalance;

  return (
    <div className="h-full w-full flex flex-col bg-[#020205] text-white overflow-hidden">
      <audio ref={audioRef as any} onEnded={() => setPlayingPreview(null)} />

      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#020205]/80 backdrop-blur-2xl z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
              <Bot size={18} className="text-purple-400" />
              HeyGen Avatar
            </h2>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">
              AI Video Generation · BYOK
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-1.5 transition-all ${step >= s.id ? 'opacity-100' : 'opacity-25'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border ${
                  step > s.id
                    ? 'bg-purple-500 border-purple-500 text-white'
                    : step === s.id
                    ? 'bg-white/10 border-purple-500 text-white'
                    : 'bg-white/5 border-white/10 text-white/30'
                }`}>
                  {step > s.id ? <Check size={10} strokeWidth={3} /> : s.id}
                </div>
                <span className="hidden md:block text-[8px] font-black uppercase tracking-widest text-white/40">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-white/10" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ────────── STEP 1: BYOK ────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="flex flex-col items-center justify-center min-h-full p-8"
            >
              <div className="max-w-lg w-full space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(168,85,247,0.15)]">
                    <Key size={32} className="text-purple-400" />
                  </div>
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                    HeyGen <span className="text-purple-400">API Ключ</span>
                  </h3>
                  <p className="text-[11px] text-white/30 font-bold uppercase tracking-widest">
                    Bring Your Own Key — стоимость генерации списывается с вашего аккаунта HeyGen
                  </p>
                </div>

                {hasKey ? (
                  <div className="p-6 rounded-[2rem] bg-green-500/10 border border-green-500/20 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-green-500/20 flex items-center justify-center">
                        <Check size={20} className="text-green-400" strokeWidth={3} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">Ключ подключён</p>
                        <p className="text-[10px] font-mono text-white/30">{maskedKey}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStep(2)}
                      className="w-full py-5 rounded-[2rem] bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2"
                    >
                      Продолжить <ChevronRight size={16} />
                    </motion.button>
                    <button
                      onClick={() => setHasKey(false)}
                      className="w-full text-[9px] text-white/20 uppercase tracking-widest font-black hover:text-white/40 transition-colors"
                    >
                      Изменить ключ
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Where to get the key */}
                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                      <AlertCircle size={16} className="text-blue-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-white/70 uppercase tracking-wider">Где взять ключ HeyGen?</p>
                        <p className="text-[10px] text-white/40 leading-relaxed">
                          1. Войдите на{' '}
                          <a
                            href="https://app.heygen.com/settings?nav=API"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline inline-flex items-center gap-0.5"
                          >
                            app.heygen.com/settings <ExternalLink size={10} />
                          </a>
                          <br />
                          2. Раздел <b>«API»</b> → кнопка <b>«Generate API Token»</b><br />
                          3. Скопируйте токен и вставьте ниже
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] pl-1">
                        HeyGen API Token
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          autoComplete="new-password"
                          placeholder="NjY3..."
                          value={heygenKey}
                          onChange={e => setHeygenKey((e.target as any).value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveKey(); }}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-purple-500/50 font-mono text-sm"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 text-[8px] font-black uppercase tracking-widest border border-purple-500/20">
                          Secure
                        </div>
                      </div>
                    </div>

                    {keyError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                        <AlertCircle size={14} />
                        {keyError}
                      </div>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSaveKey}
                      disabled={isSavingKey || !heygenKey.trim()}
                      className="w-full py-5 rounded-[2rem] bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-purple-500/20 disabled:opacity-30 flex items-center justify-center gap-2"
                    >
                      {isSavingKey ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                      {isSavingKey ? 'Сохранение...' : 'Сохранить и продолжить'}
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ────────── STEP 2: AVATAR SELECTION ────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                    Выберите <span className="text-purple-400">Аватар</span>
                  </h3>
                  <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mt-1">
                    Ваши аватары из HeyGen · Фото (Avatar 4) или Видео
                  </p>
                </div>
                <button
                  onClick={() => (photoInputRef.current as any)?.click()}
                  disabled={isUploadingPhoto}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest hover:bg-purple-600/20 transition-all disabled:opacity-30"
                >
                  {isUploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Загрузить фото
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                  <AlertCircle size={14} />
                  {uploadError}
                </div>
              )}

              {isLoadingAvatars ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="aspect-[3/4] rounded-[2rem] bg-white/5 animate-pulse border border-white/5" />
                  ))}
                </div>
              ) : avatars.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Bot size={28} className="text-white/20" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white/30 uppercase tracking-wider">Аватары не найдены</p>
                    <p className="text-[10px] text-white/20 mt-1">Создайте аватар в вашем HeyGen аккаунте или загрузите фото выше</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {avatars.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`relative aspect-[3/4] rounded-[2rem] overflow-hidden border-2 transition-all ${
                        selectedAvatar?.id === avatar.id
                          ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.2)]'
                          : 'border-white/5 hover:border-white/20'
                      }`}
                    >
                      {avatar.url ? (
                        <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" crossOrigin="anonymous" />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                          <Bot size={32} className="text-white/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-[9px] font-black uppercase text-white truncate">{avatar.label}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {avatar.type === 'talking_photo' ? (
                            <Camera size={8} className="text-purple-400" />
                          ) : (
                            <Video size={8} className="text-blue-400" />
                          )}
                          <span className="text-[7px] font-black uppercase tracking-wider text-white/40">
                            {avatar.type === 'talking_photo' ? 'Avatar 4 (фото)' : 'Video Avatar'}
                          </span>
                        </div>
                      </div>
                      {selectedAvatar?.id === avatar.id && (
                        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center shadow-xl">
                          <Check size={14} strokeWidth={3} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-[#020205] to-transparent">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className="w-full py-5 rounded-[2rem] bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black uppercase tracking-[0.2em] text-sm shadow-xl disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  Далее: Голос & Текст <ChevronRight size={16} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ────────── STEP 3: SCRIPT + VOICE + LANGUAGE ────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="p-6 space-y-6"
            >
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                Голос & <span className="text-purple-400">Текст</span>
              </h3>

              {/* Language selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <Globe2 size={12} /> Язык генерации
                </label>
                <div className="flex flex-wrap gap-2">
                  {(languages.length > 0 ? languages : [
                    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
                    { code: 'en', label: 'English', flag: '🇺🇸' },
                    { code: 'zh', label: '中文', flag: '🇨🇳' },
                    { code: 'es', label: 'Español', flag: '🇪🇸' },
                    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
                    { code: 'fr', label: 'Français', flag: '🇫🇷' },
                    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
                    { code: 'pt', label: 'Português', flag: '🇧🇷' },
                    { code: 'ja', label: '日本語', flag: '🇯🇵' },
                    { code: 'ko', label: '한국어', flag: '🇰🇷' },
                  ]).map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLang(lang.code)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                        selectedLang === lang.code
                          ? 'bg-purple-600/20 border-purple-500/50 text-white'
                          : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                      }`}
                    >
                      <span className="text-sm">{lang.flag}</span>
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <Mic size={12} /> Голос ({voices.length}/10)
                </label>
                {isLoadingVoices ? (
                  <div className="flex items-center gap-3 p-4 text-white/30">
                    <Loader2 size={16} className="animate-spin text-purple-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Загрузка голосов...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {voices.map((voice) => (
                      <div
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                          selectedVoice === voice.id
                            ? 'bg-purple-600/10 border-purple-500/40'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          voice.isAvatarVoice ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-white/5 border border-white/10'
                        }`}>
                          <Mic size={14} className={voice.isAvatarVoice ? 'text-purple-400' : 'text-white/30'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-white truncate">{voice.name}</p>
                          {voice.isAvatarVoice && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-purple-400">Голос аватара</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {voice.preview_audio && (
                            <button
                              onClick={(e) => { e.stopPropagation(); playVoicePreview(voice.preview_audio!, voice.id); }}
                              className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                            >
                              {playingPreview === voice.id ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                            </button>
                          )}
                          {selectedVoice === voice.id && (
                            <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                              <Check size={10} strokeWidth={3} className="text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Script editor */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                  Текст сценария
                </label>
                <textarea
                  value={editedScript}
                  onChange={e => setEditedScript((e.target as any).value)}
                  rows={8}
                  placeholder="Введите текст для озвучки аватаром..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm leading-relaxed resize-none"
                />
                <p className="text-[9px] text-white/20 font-black uppercase tracking-widest text-right">
                  {editedScript.length} символов
                </p>
              </div>

              {/* Cost display */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                  <span className="text-white/40">Оценка длительности:</span>
                  <span className="text-white font-mono">{estDuration} сек</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                  <span className="text-white/40">Расход баланса:</span>
                  {hasKey ? (
                    <span className="text-green-400">0 Кредитов (HeyGen BYOK)</span>
                  ) : (
                    <span className={userBalance < estCost ? 'text-red-400' : 'text-purple-400'}>
                      {estCost} Кредитов
                    </span>
                  )}
                </div>
                {!hasKey && (
                  <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-wider border-t border-white/5 pt-2.5 mt-1.5">
                    <span className="text-white/20">Ваш текущий баланс:</span>
                    <span className="text-white/40 font-mono">{userBalance} Кредитов</span>
                  </div>
                )}
              </div>

              {/* Insufficient balance warning */}
              {hasInsufficientBalance && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>Недостаточно кредитов на балансе для генерации этого видео.</span>
                  </div>
                  <button
                    onClick={() => {
                      const win = (globalThis as any).window;
                      if (win) {
                        const currentLocale = win.location.pathname.split('/')[1] || 'ru';
                        win.open(`/${currentLocale}/app/profile`, '_blank');
                      }
                    }}
                    className="self-start text-[8px] font-black uppercase tracking-widest text-white hover:underline bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/20 transition-all"
                  >
                    Пополнить баланс →
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-[#020205] to-transparent flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-4 rounded-[2rem] bg-white/5 border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px] hover:text-white transition-all"
                >
                  <ChevronLeft size={14} className="inline mr-1" /> Назад
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerate}
                  disabled={!canProceedStep3}
                  className="flex-1 py-4 rounded-[2rem] bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black uppercase tracking-[0.2em] text-sm shadow-xl disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  Сгенерировать Аватар
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ────────── STEP 4: GENERATION PROGRESS ────────── */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-full p-8 text-center"
            >
              <div className="max-w-md w-full space-y-8">
                {genError ? (
                  <div className="space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                      <AlertCircle size={36} className="text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">Ошибка генерации</h3>
                      <p className="text-xs text-red-400 mt-2 leading-relaxed">{genError}</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setStep(3); setGenError(null); }}
                        className="flex-1 py-4 rounded-[2rem] bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest text-[10px]"
                      >
                        Изменить настройки
                      </button>
                      <button
                        onClick={() => { setGenError(null); handleGenerate(); }}
                        className="flex-1 py-4 rounded-[2rem] bg-purple-600 text-white font-black uppercase tracking-widest text-[10px]"
                      >
                        Повторить
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Animated avatar preview */}
                    <div className="relative w-32 h-32 mx-auto">
                      <div className="absolute inset-0 rounded-3xl overflow-hidden border border-purple-500/30">
                        {selectedAvatar?.url && (
                          <img src={selectedAvatar.url} alt="" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/50" />
                      </div>
                      {/* Rotating ring */}
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        className="absolute -inset-2 rounded-[2rem] border-2 border-dashed border-purple-500/40"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 size={32} className="text-purple-400 animate-spin" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">
                        Генерация<br /><span className="text-purple-400">Аватара...</span>
                      </h3>
                      <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em] mt-3">
                        HeyGen обрабатывает ваш запрос · ~1-3 минуты
                      </p>
                    </div>

                    {/* Progress animation */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="h-full w-1/3 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-left">
                      {[
                        { label: 'Аватар', value: selectedAvatar?.label || '—' },
                        { label: 'Тип', value: selectedAvatar?.type === 'talking_photo' ? 'Avatar 4' : 'Video Avatar' },
                        { label: 'Язык', value: selectedLang.toUpperCase() },
                        { label: 'Символов', value: editedScript.length.toString() },
                      ].map(item => (
                        <div key={item.label} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/30">{item.label}</p>
                          <p className="text-[11px] font-black text-white mt-0.5 truncate">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ────────── STEP 5: RESULT ────────── */}
          {step === 5 && resultVideoUrl && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center p-6 space-y-6"
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check size={12} strokeWidth={3} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                    Видео <span className="text-green-400">Готово!</span>
                  </h3>
                </div>
                <p className="text-[9px] text-white/30 font-black uppercase tracking-widest">
                  Ваш HeyGen Avatar видео успешно сгенерирован
                </p>
              </div>

              {/* Video player */}
              <div
                className="relative w-full max-w-[280px] mx-auto aspect-[9/16] bg-black rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl shadow-purple-500/10 cursor-pointer"
                onClick={toggleResultPlay}
              >
                <video
                  ref={resultVideoRef}
                  src={resultVideoUrl}
                  className="w-full h-full object-cover"
                  playsInline
                  loop
                  onEnded={() => setIsVideoPlaying(false)}
                />
                <AnimatePresence>
                  {!isVideoPlaying && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/40"
                    >
                      <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center">
                        <Play size={28} className="text-white translate-x-0.5" fill="currentColor" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action buttons */}
              <div className="w-full max-w-md space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSendToMontage(resultVideoUrl)}
                  className="w-full py-5 rounded-[2rem] bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                  <Scissors size={16} />
                  Отправить в Монтажку (А-Ролл)
                </motion.button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleDownload}
                    className="py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 hover:bg-white/10 transition-all"
                  >
                    <Download size={12} />
                    Скачать MP4
                  </button>
                  <button
                    onClick={() => { setStep(2); setResultVideoUrl(null); setSelectedAvatar(null); }}
                    className="py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <RefreshCw size={12} />
                    Новый аватар
                  </button>
                </div>
              </div>

              {/* Cost reference */}
              <div className="w-full max-w-md p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-1.5">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-white/40">
                  <span>Фактическая длительность:</span>
                  <span className="text-white font-mono">{finalDuration !== null ? `${finalDuration} сек` : '...'}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-white/40">
                  <span>Списано кредитов:</span>
                  <span className={actualDeductedCredits === 0 ? 'text-green-400' : 'text-purple-400 font-mono'}>
                    {actualDeductedCredits !== null ? `${actualDeductedCredits} CC` : '...'}
                  </span>
                </div>
              </div>

              {/* Video URL for reference */}
              <div className="w-full max-w-md p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1">Прямая ссылка HeyGen</p>
                <a
                  href={resultVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-blue-400 hover:text-blue-300 font-mono break-all underline"
                >
                  {resultVideoUrl.length > 60 ? resultVideoUrl.substring(0, 60) + '...' : resultVideoUrl}
                </a>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
