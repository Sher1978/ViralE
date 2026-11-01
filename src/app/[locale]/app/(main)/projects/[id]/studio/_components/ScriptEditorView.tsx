'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlignLeft, Sparkles, FileText, CheckCircle2, Copy, Check, Video, Upload, Mic, FlaskConical } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { useAppData } from '@/components/providers/AppDataProvider';

interface ScriptEditorViewProps {
  scriptText: string;
  onSave: (text: string) => void;
  onNext: () => void;
  onRecordTeleprompter?: () => void;
  onUploadToMontage?: () => void;
  onFaceless?: () => void;
  onBack: () => void;
  locale: string;
}

export const ScriptEditorView: React.FC<ScriptEditorViewProps> = ({
  scriptText,
  onSave,
  onNext,
  onRecordTeleprompter,
  onUploadToMontage,
  onFaceless,
  onBack,
  locale
}) => {
  const [text, setText] = useState(scriptText);
  const [isSavedLocal, setIsSavedLocal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  let hasLabAccess = false;
  try {
    hasLabAccess = useAppData().hasLabAccess;
  } catch (e) {}

  const stats = useMemo(() => {
    const charCount = text.length;
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    // Estimate reading time: ~140 words per minute
    const durationSec = Math.round((wordCount / 140) * 60);
    return { charCount, wordCount, durationSec };
  }, [text]);

  const handleCopy = async () => {
    if (!text.trim()) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      trackEvent('script_copied', {
        source: 'studio_script_editor',
        wordCount: stats.wordCount,
        durationSec: stats.durationSec,
      });
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 4000);
    } catch (e) {
      console.error('Failed to copy text', e);
    }
  };

  useEffect(() => {
    setText(scriptText);
  }, [scriptText]);

  // Debounced autosave
  useEffect(() => {
    const timer = setTimeout(() => {
      if (text !== scriptText) {
        onSave(text);
        setIsSavedLocal(true);
        const resetTimer = setTimeout(() => setIsSavedLocal(false), 2000);
        return () => clearTimeout(resetTimer);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [text, onSave, scriptText]);

  const isRu = locale === 'ru';

  return (
    <div className="h-full flex flex-col px-4 sm:px-8 py-6 md:px-12 max-w-4xl mx-auto overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col space-y-5"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-lg">
              <FileText size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-white leading-none mb-1">
                {isRu ? '1. Текст для Телесуфлёра' : '1. Teleprompter Script'}
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-bold">
                {isRu ? 'Проверьте текст и выберите способ создания ролика ниже' : 'Review your script and choose how to create your video below'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <ArrowLeft size={12} />
              {isRu ? 'К генератору идей' : 'Idea Lab'}
            </button>

            <button
              onClick={handleCopy}
              disabled={!text.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-300 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 shadow-md"
            >
              {isCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              {isCopied ? (isRu ? 'Скопировано!' : 'Copied!') : (isRu ? 'Копировать' : 'Copy')}
            </button>

            {isSavedLocal && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[9px] text-green-400 font-bold uppercase tracking-widest"
              >
                <CheckCircle2 size={10} />
                {isRu ? 'Сохранено' : 'Saved'}
              </motion.div>
            )}
          </div>
        </div>

        {/* Helpful nudge when user copies script */}
        <AnimatePresence>
          {isCopied && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border border-cyan-400/30 flex items-center justify-between gap-4"
            >
              <p className="text-xs text-cyan-200 font-medium leading-relaxed">
                {isRu
                  ? '💡 Текст скопирован! Но 80% удержания дают динамичные Караоке-субтитры и B-Roll вставки. Запишите дубль через наш Телесуфлёр ниже — ИИ смонтирует ролик сам за 1 минуту!'
                  : '💡 Script copied! Record with our built-in Teleprompter below so AI can automatically add Karaoke Subtitles and B-Roll in 1 minute!'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Editor Card */}
        <div className="relative flex-1 min-h-[240px] flex flex-col group">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-[2rem] blur opacity-30 group-hover:opacity-50 transition duration-500" />
          <div className="relative flex-1 bg-white/[0.02] border border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col transition-all group-hover:border-white/20">
            <textarea
              value={text}
              onChange={(e) => setText((e.target as any).value)}
              placeholder={isRu ? 'Вставьте или напишите ваш сценарий здесь...' : 'Paste or write your script here...'}
              className="flex-1 w-full bg-transparent resize-none text-white text-base md:text-lg font-medium leading-relaxed placeholder:text-white/15 focus:outline-none custom-scrollbar"
            />
            
            {/* Word counters / Readability indicators */}
            <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap justify-between items-center text-[10px] font-bold text-white/40 uppercase tracking-widest gap-2">
              <div className="flex items-center gap-2">
                <AlignLeft size={12} className="text-purple-400" />
                <span>
                  {isRu ? `Слов: ${stats.wordCount}` : `Words: ${stats.wordCount}`}
                </span>
                <span className="opacity-20">•</span>
                <span>
                  {isRu ? `Символов: ${stats.charCount}` : `Characters: ${stats.charCount}`}
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-300">
                <Sparkles size={10} className="text-purple-400" />
                <span>
                  {isRu ? `~${stats.durationSec} сек. чтения вслух` : `~${stats.durationSec}s read time`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GOLDEN PATH: 3 Direct Action Buttons */}
        <div className="space-y-3 pt-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 text-center">
            {isRu ? 'ШАГ 2: ВЫБЕРИТЕ КАК СОЗДАТЬ ВИДЕО' : 'STEP 2: CHOOSE HOW TO CREATE YOUR VIDEO'}
          </p>

          {/* Primary Button: Record with Teleprompter */}
          <button
            onClick={() => {
              onSave(text);
              if (onRecordTeleprompter) onRecordTeleprompter();
              else onNext();
            }}
            disabled={text.trim().length === 0}
            className="w-full py-5 px-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:brightness-110 text-white font-black text-xs sm:text-sm uppercase tracking-[0.15em] rounded-2xl shadow-[0_15px_35px_rgba(147,51,234,0.35)] active:scale-[0.99] disabled:opacity-40 transition-all flex items-center justify-center gap-3"
          >
            <Video size={20} className="text-cyan-300 animate-pulse" />
            <span>
              {isRu ? '🎥 Записать с Телесуфлёром (Камера + Текст)' : '🎥 Record with Teleprompter (Camera + Script)'}
            </span>
          </button>

          {/* Secondary Row: Upload existing video OR Faceless mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                onSave(text);
                if (onUploadToMontage) onUploadToMontage();
                else onNext();
              }}
              className="py-4 px-5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/40 rounded-2xl text-white font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 active:scale-95"
            >
              <Upload size={16} className="text-purple-400 shrink-0" />
              <div className="text-left">
                <div className="leading-tight">{isRu ? '📁 Загрузить своё видео' : '📁 Upload Own Video'}</div>
                <div className="text-[8px] text-white/40 font-bold tracking-widest mt-0.5">
                  {isRu ? 'Сразу в Автомонтаж (Субтитры + B-Roll)' : 'Straight to Auto-Edit (CC + B-Roll)'}
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                onSave(text);
                if (onFaceless) onFaceless();
                else onNext();
              }}
              disabled={text.trim().length === 0}
              className="py-4 px-5 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12] border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl text-white font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 active:scale-95 disabled:opacity-40"
            >
              <Mic size={16} className="text-emerald-400 shrink-0" />
              <div className="text-left">
                <div className="leading-tight text-emerald-200">{isRu ? '🎙️ Собрать без камеры (Faceless)' : '🎙️ Create Without Camera (Faceless)'}</div>
                <div className="text-[8px] text-emerald-300/50 font-bold tracking-widest mt-0.5">
                  {isRu ? 'ИИ-озвучка вашего текста + видеоряд' : 'AI Voiceover + Auto Visuals'}
                </div>
              </div>
            </button>
          </div>

          {/* Optional Lab Button for Scale / Dev Lab users */}
          {hasLabAccess && (
            <button
              onClick={() => {
                onSave(text);
                onNext();
              }}
              className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 rounded-xl text-amber-300 font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
            >
              <FlaskConical size={14} className="text-amber-400" />
              <span>{isRu ? '🧪 Открыть меню AI Lab (Face Swap / HeyGen Аватары / Инста-Карусели)' : '🧪 Open AI Lab Menu (Face Swap / Avatars / Carousels)'}</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
