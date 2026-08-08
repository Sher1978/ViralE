'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Cpu, Zap, Wand2, Share2, AlertTriangle, Info, MessageSquare, RefreshCw } from 'lucide-react';

interface SingleScriptEditorProps {
  scriptData: any;
  locale: string;
  selectedStyle?: string | null;
  onUpdate: (updatedScript: any) => void;
  onRefine: (instruction: string) => void;
  onAccept: () => void;
  onCopy: () => void;
  isSaving?: boolean;
  isGenerating?: boolean;
}

export function SingleScriptEditor({
  scriptData,
  locale,
  selectedStyle,
  onUpdate,
  onRefine,
  onAccept,
  onCopy,
  isSaving,
  isGenerating
}: SingleScriptEditorProps) {
  const [copied, setCopied] = useState(false);
  const [refineInput, setRefineInput] = useState('');

  // Handle nested or flat extraction safely
  const getBlockValue = (blockKey: string, subKey?: string) => {
    const block = scriptData?.[blockKey];
    if (!block) return '';
    if (typeof block === 'string') {
      return subKey === 'words' || !subKey ? block : '';
    }
    if (subKey) {
      return block[subKey] || (subKey === 'words' ? (block.words || block.text || block.content || '') : '');
    }
    return block.words || block.text || block.content || '';
  };

  const handleBlockChange = (blockKey: string, value: string, subKey?: string) => {
    const updated = { ...scriptData };
    if (!updated[blockKey]) {
      updated[blockKey] = subKey ? {} : '';
    }

    if (subKey) {
      if (typeof updated[blockKey] === 'string') {
        updated[blockKey] = { words: updated[blockKey] };
      }
      updated[blockKey][subKey] = value;
    } else {
      if (typeof updated[blockKey] === 'object') {
        updated[blockKey] = { ...updated[blockKey], words: value };
      } else {
        updated[blockKey] = value;
      }
    }
    onUpdate(updated);
  };

  // Word count and timing logic
  const hookWords = getBlockValue('hook', 'words');
  const bodyWords = getBlockValue('body');
  const trizWords = getBlockValue('triz_inversion') || getBlockValue('meat');
  const ctaWords = getBlockValue('cta');

  const totalWords = [hookWords, bodyWords, trizWords, ctaWords]
    .map(w => w.split(/\s+/).filter(Boolean).length)
    .reduce((a, b) => a + b, 0);

  const totalSeconds = Math.ceil(totalWords / 2.8);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefineSubmit = () => {
    if (!refineInput.trim()) return;
    onRefine(refineInput);
    setRefineInput('');
  };

  // Verification checks
  const incompleteBlocks = [
    { name: 'HOOK', val: hookWords },
    { name: 'BODY', val: bodyWords },
    { name: 'TRIZ', val: trizWords },
    { name: 'CTA', val: ctaWords }
  ].filter(b => !b.val || b.val.trim().length < 10);

  const styleLabel = selectedStyle
    ? {
        evergreen: locale === 'ru' ? 'Вечнозеленый' : 'Evergreen',
        trends: locale === 'ru' ? 'Тренды' : 'Trends',
        edutainment: locale === 'ru' ? 'Польза' : 'Edutainment',
        controversial: locale === 'ru' ? 'Провокация' : 'Controversial',
        detective: locale === 'ru' ? 'Детектив' : 'Detective',
        napkin_explainer: locale === 'ru' ? 'Маркер и доска' : 'Marker & Board'
      }[selectedStyle] || selectedStyle
    : (locale === 'ru' ? 'Сценарий' : 'Script');

  const styleColor = selectedStyle
    ? {
        evergreen: '#10B981',
        trends: '#F59E0B',
        edutainment: '#3B82F6',
        controversial: '#EF4444',
        detective: '#06B6D4',
        napkin_explainer: '#A855F7'
      }[selectedStyle] || '#A855F7'
    : '#A855F7';

  return (
    <div className="relative pb-40 space-y-8 max-w-4xl mx-auto">
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md pointer-events-none flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent" />
            <div className="w-full h-[2px] bg-purple-500/20 absolute top-0 animate-scanner shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
            <div className="flex flex-col items-center gap-3 bg-black/60 p-8 rounded-[2rem] border border-white/10 relative z-50">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
              <p className="text-xs uppercase tracking-widest font-black text-white">
                {locale === 'ru' ? 'ИИ пересобирает сценарий...' : 'AI is rebuilding script...'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Narrative HUD - Timing Tracker */}
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-[2rem] backdrop-blur-2xl border-2 transition-all duration-1000 flex items-center justify-between relative overflow-hidden ${
            incompleteBlocks.length > 0
              ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/5 shadow-[0_0_50px_rgba(245,158,11,0.1)]'
              : totalSeconds > 50
                ? 'border-red-500/30 bg-gradient-to-r from-red-500/10 via-transparent to-red-500/5 shadow-[0_0_50px_rgba(239,68,68,0.1)]'
                : 'border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/5 shadow-[0_0_50px_rgba(168,85,247,0.1)]'
          }`}
        >
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />

          <div className="flex flex-col relative z-10">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
              <Cpu className="w-3 h-3 text-purple-400 animate-spin-slow" />
              {incompleteBlocks.length > 0 ? 'INTEGRITY AUDIT: ACTION REQUIRED' : 'NARRATIVE EFFICIENCY METRICS'}
            </span>

            {incompleteBlocks.length > 0 ? (
              <span className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight uppercase italic">
                {locale === 'ru' ? 'Заполните пустые блоки' : `${incompleteBlocks.length} Block(s) Empty`}
              </span>
            ) : (
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl font-black tabular-nums tracking-tighter italic ${totalSeconds > 50 ? 'text-red-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300'}`}>
                  {totalSeconds}s
                </span>
                <span className="text-xs font-black opacity-30 text-white tracking-widest uppercase">
                  {locale === 'ru' ? '/ ЦЕЛЬ < 50с' : '/ TARGET < 50s'}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 relative z-10">
            <motion.div
              animate={incompleteBlocks.length > 0 || totalSeconds > 50 ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`w-14 h-14 rounded-3xl flex items-center justify-center border transition-all duration-500 ${
                incompleteBlocks.length > 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                totalSeconds > 50 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                'bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
              }`}
            >
              {incompleteBlocks.length > 0 ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <Zap className="w-6 h-6 fill-current" />
              )}
            </motion.div>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">
              {incompleteBlocks.length > 0 ? 'FIX REQUIRED' : 'READY TO RECORD'}
            </span>
          </div>
        </motion.div>

        {incompleteBlocks.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 backdrop-blur-md flex items-center gap-3">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-[10px] text-amber-400/80 font-medium leading-relaxed tracking-wide">
              <span className="font-black uppercase tracking-[0.15em] mr-2">Core Warning:</span>
              {locale === 'ru' 
                ? 'Некоторые части сценария не заполнены. Вы можете написать их вручную или запустить повторную ИИ-генерацию.'
                : 'Some script blocks contain null values. Edit them manually or refine via AI prompt below.'}
            </p>
          </div>
        )}
      </div>

      {/* Editor Body */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2.5rem] border border-purple-500/20 bg-[#0d0d16]/95 backdrop-blur-2xl overflow-hidden flex flex-col shadow-2xl relative"
      >
        {/* Scanner line animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
          <div className="w-[200%] h-[2px] bg-gradient-to-r from-transparent via-purple-500/25 to-transparent absolute top-0 left-[-50%] animate-scanner" />
        </div>

        {/* Card Header */}
        <div className="px-8 py-5 flex items-center justify-between border-b border-white/[0.03] bg-black/35 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentcolor] animate-pulse"
              style={{ backgroundColor: styleColor, color: styleColor }}
            />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-white">
              {locale === 'ru' ? 'Активный сценарий:' : 'Active Script Style:'} <span className="text-purple-400">{styleLabel}</span>
            </span>
          </div>

          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/50">
            {totalWords} {locale === 'ru' ? 'слов' : 'words'}
          </div>
        </div>

        {/* Form Fields */}
        <div className="p-8 space-y-6 relative z-10 max-h-[550px] overflow-y-auto custom-scrollbar">
          {/* HOOK block */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
            <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest block">
              1. {locale === 'ru' ? 'ХУК' : 'HOOK'} (0 - 5s)
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                  {locale === 'ru' ? 'Кадр / Визуал' : 'Visual Scene Metaphor'}
                </label>
                <input
                  type="text"
                  value={getBlockValue('hook', 'visual')}
                  onChange={(e) => handleBlockChange('hook', (e.target as any).value, 'visual')}
                  className="w-full bg-[#07070f] border border-white/10 rounded-xl px-4 py-3 text-xs text-white/80 focus:outline-none focus:border-purple-500/35 focus:bg-white/[0.02] transition-all"
                  placeholder={locale === 'ru' ? 'Опишите визуальный ряд...' : 'Describe visual action...'}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                  {locale === 'ru' ? 'Текст на экране' : 'On-Screen Text'}
                </label>
                <input
                  type="text"
                  value={getBlockValue('hook', 'screen_text')}
                  onChange={(e) => handleBlockChange('hook', (e.target as any).value, 'screen_text')}
                  className="w-full bg-[#07070f] border border-white/10 rounded-xl px-4 py-3 text-xs text-white/80 focus:outline-none focus:border-purple-500/35 focus:bg-white/[0.02] transition-all font-bold"
                  placeholder={locale === 'ru' ? '3-5 крупных слов...' : '3-5 bold words...'}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                {locale === 'ru' ? 'Голос диктора' : 'Spoken words'}
              </label>
              <textarea
                value={getBlockValue('hook', 'words')}
                onChange={(e) => handleBlockChange('hook', (e.target as any).value, 'words')}
                className="w-full bg-[#07070f] border border-white/10 rounded-xl p-4 text-xs text-white leading-relaxed font-medium focus:outline-none focus:border-purple-500/35 focus:bg-white/[0.02] transition-all h-24 resize-none"
                placeholder={locale === 'ru' ? 'Вступление и интрига ролива...' : 'Actor speech words...'}
              />
            </div>
          </div>

          {/* BODY block */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
            <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest block">
              2. {locale === 'ru' ? 'ТЕЛО / КОНТЕКСТ' : 'BODY / CONTEXT'} (5 - 15s)
            </span>
            <textarea
              value={getBlockValue('body')}
              onChange={(e) => handleBlockChange('body', (e.target as any).value)}
              className="w-full bg-[#07070f] border border-white/10 rounded-xl p-4 text-xs text-white leading-relaxed font-medium focus:outline-none focus:border-purple-500/35 focus:bg-white/[0.02] transition-all h-32 resize-none"
              placeholder={locale === 'ru' ? 'Раскрытие проблемы ролива...' : 'Body content speech...'}
            />
          </div>

          {/* TRIZ block */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
            <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest block">
              3. {locale === 'ru' ? 'ТРИЗ-ПЕРЕВЕРТЫШ / МЯСО' : 'TRIZ INVERSION / MEAT'} (15 - 45s)
            </span>
            <textarea
              value={getBlockValue('triz_inversion') || getBlockValue('meat')}
              onChange={(e) => handleBlockChange('triz_inversion', (e.target as any).value)}
              className="w-full bg-[#07070f] border border-white/10 rounded-xl p-4 text-xs text-white leading-relaxed font-medium focus:outline-none focus:border-purple-500/35 focus:bg-white/[0.02] transition-all h-40 resize-none"
              placeholder={locale === 'ru' ? 'Неочевидный поворот темы и решение...' : 'Meat content speech...'}
            />
          </div>

          {/* CTA block */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
            <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest block">
              4. {locale === 'ru' ? 'CTA / ПРИЗЫВ' : 'CTA / OUTRO'} (45 - 60s)
            </span>
            <textarea
              value={getBlockValue('cta')}
              onChange={(e) => handleBlockChange('cta', (e.target as any).value)}
              className="w-full bg-[#07070f] border border-white/10 rounded-xl p-4 text-xs text-white leading-relaxed font-medium focus:outline-none focus:border-purple-500/35 focus:bg-white/[0.02] transition-all h-24 resize-none"
              placeholder={locale === 'ru' ? 'Кодовое слово для перехода в воронку...' : 'Call to action speech...'}
            />
          </div>
        </div>

        {/* Refinement Panel at bottom of script */}
        <div className="p-8 bg-black/40 border-t border-white/[0.03] space-y-4 relative z-10">
          <div className="flex items-center gap-2 text-white/50">
            <MessageSquare size={14} className="text-purple-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {locale === 'ru' ? 'ПРАВКА СЦЕНАРИЯ С ИИ' : 'ADJUST SCRIPT WITH AI'}
            </span>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={refineInput}
              onChange={(e) => setRefineInput((e.target as any).value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRefineSubmit()}
              placeholder={locale === 'ru' ? 'Напр: Сделай хук более агрессивным, или добавь шутку в 3 блок...' : 'E.g.: Make hook more punchy, or add humor...'}
              className="flex-1 bg-[#07070f] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 focus:bg-black/50 transition-all"
            />
            <button
              onClick={handleRefineSubmit}
              disabled={isGenerating || !refineInput.trim()}
              className="px-6 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:scale-100 flex items-center gap-2"
            >
              <Wand2 size={12} className="fill-current" />
              {locale === 'ru' ? 'Отправить' : 'Send'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Editor Footer Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleCopy}
          className="p-6 bg-white/5 border border-white/10 rounded-[2rem] text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95 group shadow-xl"
          title={locale === 'ru' ? 'Скопировать весь текст' : 'Copy Full Text'}
        >
          {copied ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Activity className="w-5 h-5 text-emerald-400" />
            </motion.div>
          ) : (
            <Share2 className="w-5 h-5" />
          )}
        </button>

        <button
          onClick={onAccept}
          disabled={isSaving || isGenerating || incompleteBlocks.length > 0}
          className="flex-1 py-6 bg-white text-black font-black uppercase tracking-[0.25em] text-xs rounded-[2rem] flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(255,255,255,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:scale-100"
        >
          {isSaving ? (locale === 'ru' ? 'Синхронизация...' : 'Synchronizing...') : (locale === 'ru' ? 'Сохранить и продолжить в Студию' : 'Accept Script & Go to Studio')}
          <Wand2 className="w-4 h-4 fill-black" />
        </button>
      </div>
    </div>
  );
}
