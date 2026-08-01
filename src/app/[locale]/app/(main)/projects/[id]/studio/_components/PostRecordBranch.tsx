'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Scissors, Sparkles, Download, Send, RotateCcw, Loader2, CheckCircle2, Share2 } from 'lucide-react';

interface PostRecordBranchProps {
  projectId?: string;
  videoUrl: string;
  recordedSize?: number | null;
  onSelect: (type: 'pure' | 'animate') => void;
  onRetake?: () => void;
  onDownload?: () => void;
  onDownloadMp4?: () => void;
  isMp4Converting?: boolean;
  mp4Url?: string | null;
  onTelegram?: () => void;
  t: (key: string) => string;
}

export const PostRecordBranch: React.FC<PostRecordBranchProps> = ({
  projectId = '',
  videoUrl,
  recordedSize = null,
  onSelect,
  onRetake,
  onDownload,
  onDownloadMp4,
  isMp4Converting = false,
  mp4Url = null,
  onTelegram,
  t
}) => {
  return (
    <div className="h-full w-full flex flex-col bg-[#050508] overflow-y-auto pb-10 relative">
      {/* iOS Style Retake Button */}
      <div className="absolute top-8 left-8 z-[60]">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetake}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-white/60 hover:text-white transition-all shadow-xl"
        >
          <RotateCcw size={14} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Переснять</span>
        </motion.button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 flex flex-col items-center">
          
          {/* Video Preview */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full aspect-[9/16] max-h-[35vh] bg-neutral-900 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group"
          >
            <video 
              src={videoUrl} 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover"
            />

            {/* Premium Background Normalization Status Badge */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 backdrop-blur-md bg-black/60 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl">
              {mp4Url ? (
                <>
                  <CheckCircle2 size={12} className="text-green-400 fill-green-400/20" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-green-400">MP4 Готов для AI</span>
                </>
              ) : isMp4Converting ? (
                <>
                  <Loader2 size={12} className="animate-spin text-cyan-400" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-cyan-400">Кодирование MP4 в фоне...</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Ожидание кодирования</span>
                </>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none">
              TAKE IS<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">MASTERED</span>
            </h2>
          </motion.div>

          {/* PRIMARY ACTIONS */}
          <div className="w-full space-y-3 pt-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect('pure')}
              className="w-full py-5 rounded-[2rem] bg-purple-600 text-white font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-purple-900/40 flex items-center justify-center gap-2"
            >
              В МОНТАЖ <Scissors size={16} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                try {
                  const { supabase } = await import('@/lib/supabase');
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single();
                    if (profile?.tier !== 'pro') {
                      (globalThis as any).alert?.("🔒 Опция Фейс Свап (Face Swap) доступна ТОЛЬКО в премиум-пакете SCALE ($79.90/мес).\nПожалуйста, перейдите в профиль и обновите подписку до тарифа Scale для доступа к нейро-замене лиц.");
                      return;
                    }
                  }
                } catch (e) {}
                onSelect('animate');
              }}
              className="w-full py-4 rounded-[2rem] bg-amber-500/10 border border-amber-500/30 text-amber-300 font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2"
            >
              FACE SWAP 👑 (SCALE ONLY) <Sparkles size={14} className="text-amber-400" />
            </motion.button>

            <div className="grid grid-cols-3 gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onDownload}
                className="py-3 rounded-[2rem] bg-blue-600/10 border border-blue-500/20 text-white font-black uppercase tracking-[0.2em] text-[9px] flex flex-col items-center justify-center gap-1 shadow-lg min-h-[52px]"
              >
                <span className="flex items-center gap-1">RAW <Download size={12} className="text-blue-400" /></span>
                {recordedSize && (
                  <span className="text-[7px] text-white/40 lowercase tracking-normal">
                    ({(recordedSize / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onDownloadMp4}
                className="py-3 rounded-[2rem] bg-green-600/10 border border-green-500/20 text-white font-black uppercase tracking-[0.2em] text-[9px] flex flex-col items-center justify-center gap-1 shadow-lg min-h-[52px]"
              >
                <span className="flex items-center gap-1">MP4 {isMp4Converting ? <Loader2 size={12} className="animate-spin text-green-400" /> : <Download size={12} className="text-green-400" />}</span>
                {recordedSize && !isMp4Converting && (
                  <span className="text-[7px] text-white/40 lowercase tracking-normal">
                    (~{(recordedSize * 0.8 / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  try {
                    const { gdriveService } = await import('@/lib/services/gdriveService');
                    const token = await gdriveService.getProviderToken();
                    if (!token) {
                      try {
                        localStorage.setItem(`pending_gdrive_upload_${projectId}`, 'true');
                      } catch (e) {}
                      (globalThis as any).alert?.('Для первого сохранения на Google Диск нужно авторизоваться. Вас направит на страницу Google, после чего видео автоматически сохранится.');
                      await gdriveService.signInWithGoogleDrive();
                      return;
                    }
                    (globalThis as any).alert?.('Загрузка видео на ваш Google Диск запущена...');
                    
                    let blob: Blob | null = null;
                    if (mp4Url) {
                      try {
                        const res = await fetch(mp4Url);
                        if (res.ok) blob = await res.blob();
                      } catch (e) {}
                    }
                    if (!blob && videoUrl) {
                      try {
                        const res = await fetch(videoUrl);
                        if (res.ok) blob = await res.blob();
                      } catch (e) {}
                    }
                    if (!blob && projectId) {
                      const { idb } = await import('@/lib/idb');
                      const cached = await idb.get(`video_file_${projectId}`, 'MediaBuffer');
                      if (cached instanceof Blob) blob = cached;
                    }

                    if (!blob) {
                      (globalThis as any).alert?.('Ошибка: Файл записи не найден в памяти устройства. Попробуйте переснять ролик.');
                      return;
                    }

                    const result = await gdriveService.uploadFileToDrive(blob, `ViralEngine_Record_${Date.now()}.mp4`);
                    if (result.webViewLink) {
                      (globalThis as any).alert?.(`Успешно сохранено на Google Диск!\n\nСсылка: ${result.webViewLink}`);
                    } else if (result.error) {
                      (globalThis as any).alert?.(`Ошибка Google Диска: ${result.error}`);
                    }
                  } catch (e: any) {
                    (globalThis as any).alert?.(`Ошибка записи: ${e.message || e}`);
                  }
                }}
                className="py-3 rounded-[2rem] bg-amber-600/10 border border-amber-500/20 text-white font-black uppercase tracking-[0.2em] text-[9px] flex flex-col items-center justify-center gap-1 shadow-lg min-h-[52px]"
              >
                <span className="flex items-center gap-1 text-amber-300">G-Drive <Share2 size={12} className="text-amber-400" /></span>
                <span className="text-[7px] text-amber-400/60 lowercase tracking-normal">
                  Google Диск
                </span>
              </motion.button>
            </div>

            {mp4Url && (
              <div className="w-full mt-1 p-4 rounded-3xl bg-white/[0.02] border border-white/5 text-center space-y-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-purple-400 block">Прямая ссылка на MP4:</span>
                <a 
                  href={mp4Url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[9px] text-blue-400 hover:text-blue-300 font-mono break-all underline block"
                >
                  {mp4Url}
                </a>
                <button
                  onClick={() => {
                    (globalThis.navigator as any)?.clipboard?.writeText(mp4Url);
                    (globalThis as any).alert?.('Прямая ссылка скопирована!');
                  }}
                  className="mx-auto flex items-center justify-center gap-1 text-[8px] font-black text-white/50 hover:text-white uppercase tracking-widest pt-1"
                >
                  <svg className="w-2.5 h-2.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                  </svg>
                  Копировать ссылку
                </button>
              </div>
            )}
          </div>

          {/* SECONDARY ACTIONS */}
          {onTelegram && (
            <div className="w-full pt-4 border-t border-white/5 flex flex-col items-center gap-2">
              <button
                onClick={onTelegram}
                className="flex items-center justify-center gap-2 py-3 px-8 rounded-full bg-[#0088cc]/10 border border-[#0088cc]/20 text-[#0088cc] hover:bg-[#0088cc]/20 active:scale-95 transition-all shadow-xl shadow-cyan-900/10"
              >
                <Send size={14} className="text-[#0088cc] fill-[#0088cc]/10 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest">Отправить в Telegram</span>
              </button>
              <span className="text-[7px] text-white/30 text-center tracking-normal leading-normal max-w-[280px]">
                Рекомендуется для мобильных устройств. Загружает файл в облако и отправляет ссылку для обхода ограничений iOS/Telegram.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
