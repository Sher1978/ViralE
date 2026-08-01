'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, AlignLeft, Sparkles, FileText, CheckCircle2, Copy, Check } from 'lucide-react';

interface ScriptEditorViewProps {
  scriptText: string;
  onSave: (text: string) => void;
  onNext: () => void;
  onBack: () => void;
  locale: string;
}

export const ScriptEditorView: React.FC<ScriptEditorViewProps> = ({
  scriptText,
  onSave,
  onNext,
  onBack,
  locale
}) => {
  const [text, setText] = useState(scriptText);
  const [isSavedLocal, setIsSavedLocal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

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
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
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

  const stats = useMemo(() => {
    const charCount = text.length;
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    // Estimate reading time: ~140 words per minute
    const durationSec = Math.round((wordCount / 140) * 60);
    return { charCount, wordCount, durationSec };
  }, [text]);

  const handleNextClick = () => {
    onSave(text);
    onNext();
  };

  const isRu = locale === 'ru';

  return (
    <div className="h-full flex flex-col px-8 py-8 md:px-12 max-w-4xl mx-auto overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col space-y-6"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-lg">
              <FileText size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tight text-white leading-none mb-1">
                {isRu ? 'Финальный сценарий' : 'Final Script'}
              </h2>
              <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">
                {isRu ? 'Отредактируйте текст перед записью' : 'Edit your text before recording'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              disabled={!text.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-2xl text-purple-300 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 shadow-md"
            >
              {isCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              {isCopied ? (isRu ? 'Скопировано!' : 'Copied!') : (isRu ? 'Копировать сценарий' : 'Copy Script')}
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

        {/* Text Editor Card */}
        <div className="relative flex-1 min-h-[300px] flex flex-col group">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-[2rem] blur opacity-30 group-hover:opacity-50 transition duration-500" />
          <div className="relative flex-1 bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col transition-all group-hover:border-white/10">
            <textarea
              value={text}
              onChange={(e) => setText((e.target as any).value)}
              placeholder={isRu ? 'Вставьте или напишите ваш сценарий здесь...' : 'Paste or write your script here...'}
              className="flex-1 w-full bg-transparent resize-none text-white text-base md:text-lg font-medium leading-relaxed placeholder:text-white/10 focus:outline-none custom-scrollbar"
            />
            
            {/* Word counters / Readability indicators */}
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap justify-between items-center text-[10px] font-bold text-white/40 uppercase tracking-widest gap-2">
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
                  {isRu ? `~${stats.durationSec} сек. чтения` : `~${stats.durationSec}s read time`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Action Panel */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <button
            onClick={onBack}
            className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/5 rounded-[1.5rem] text-white/45 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <ArrowLeft size={12} />
            {isRu ? 'В лабораторию идей' : 'Back to Idea Lab'}
          </button>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              disabled={!text.trim()}
              className="flex-1 sm:flex-initial px-6 py-5 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-black text-[11px] uppercase tracking-[0.15em] rounded-[2rem] transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg"
            >
              {isCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-purple-300" />}
              {isCopied ? (isRu ? 'Скопировано' : 'Copied') : (isRu ? 'Копировать' : 'Copy')}
            </button>

            <button
              onClick={handleNextClick}
              disabled={text.trim().length === 0}
              className="flex-1 sm:flex-initial px-8 py-5 bg-purple-600 hover:bg-purple-500 text-white font-black text-[12px] uppercase tracking-[0.2em] rounded-[2rem] shadow-2xl shadow-purple-600/30 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all flex items-center justify-center gap-2"
            >
              {isRu ? 'Далее к записи' : 'Proceed to Recording'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
