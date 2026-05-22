'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Wand2, RefreshCcw, Sparkles, ArrowLeft,
  Play, Check, MessageSquare, Zap, Pencil, Film
} from 'lucide-react';

type Screen = 'search' | 'generate' | 'edit-prompt';

interface VideoItem {
  id: string;
  source: 'stock' | 'giphy';
  previewUrl: string;
  videoUrl: string;
  title?: string;
  tags?: string[];
}

export interface BRollClipMeta {
  id: string;
  label: string;
  startTime: number;
  endTime: number;
  prompt: string;
  visual_prompt?: string;
  scene_concept?: string;
  anchor_type?: 'Literal' | 'Conceptual' | 'Emotional' | 'Data';
  url: string;
  spoken_text?: string;
}

interface Props {
  clip: BRollClipMeta | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (clipId: string, videoUrl: string, label?: string) => void;
  onDelete?: (clipId: string) => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

const BRollEditorModal: React.FC<Props> = ({ clip, isOpen, onClose, onSelect, onDelete }) => {
  const [screen, setScreen] = useState<Screen>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<VideoItem[]>([]);
  const [previewItem, setPreviewItem] = useState<VideoItem | null>(null);

  // Generate state
  const [visualPrompt, setVisualPrompt] = useState('');
  const [editPromptDraft, setEditPromptDraft] = useState('');
  const [userComment, setUserComment] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [genJobId, setGenJobId] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (clip && isOpen) {
      setVisualPrompt(clip.visual_prompt || clip.prompt || '');
      setEditPromptDraft(clip.visual_prompt || clip.prompt || '');
      setScreen('search');
      setResults([]);
      setPreviewItem(null);
      setGeneratedUrl('');
      setGenJobId('');
      setUserComment('');

      const initializeSearch = async () => {
        // If we have spoken text, calculate a highly optimized search query using AI
        if (clip.spoken_text && clip.spoken_text.trim().length > 0) {
          console.log('[BRollEditor] Optimizing search query based on spoken text:', clip.spoken_text);
          setIsSearching(true);
          setSearchQuery('Анализ...');
          try {
            const res = await fetch('/api/ai/optimize-prompt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ context: clip.spoken_text, mode: 'search' })
            });
            const data = await res.json();
            if (data.optimized) {
              const optimizedQuery = data.optimized.trim();
              console.log('[BRollEditor] Got optimized query:', optimizedQuery);
              setSearchQuery(optimizedQuery);
              // Trigger search
              setIsSearching(true);
              const searchRes = await fetch(`/api/ai/broll-search?query=${encodeURIComponent(optimizedQuery)}`);
              const searchData = await searchRes.json();
              setResults(searchData.videos || []);
              setIsSearching(false);
              return;
            }
          } catch (e) {
            console.error('[BRollEditor] Spoken text optimization failed, falling back', e);
          }
        }

        // Fallback to traditional keywords or prompt
        const words = (clip.prompt || '').split(/\s+/).slice(0, 3).join(' ');
        setSearchQuery(words);
        handleSearch(words);
      };

      initializeSearch();
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [clip?.id, isOpen]);

  const handleSearch = async (q?: string) => {
    const query = (q ?? searchQuery).trim();
    if (!query) return;
    setIsSearching(true);
    setResults([]);
    try {
      const res = await fetch(`/api/ai/broll-search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.videos || []);
    } catch (e) {
      console.error('[BRollEditor] search failed', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRefinePrompt = async () => {
    if (!editPromptDraft && !userComment) return;
    setIsRefining(true);
    try {
      const context = userComment
        ? `Original: "${editPromptDraft}". User feedback: "${userComment}".`
        : editPromptDraft;
      const res = await fetch('/api/ai/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, mode: 'search' })
      });
      const data = await res.json();
      if (data.optimized) setEditPromptDraft(data.optimized);
    } catch (e) {
      console.error('[BRollEditor] refine failed', e);
    } finally {
      setIsRefining(false);
    }
  };

  const handleSavePrompt = () => {
    setVisualPrompt(editPromptDraft);
    setScreen('generate');
  };

  const handleGenerate = async () => {
    if (!visualPrompt) return;
    setIsGenerating(true);
    setGeneratedUrl('');
    try {
      const res = await fetch('/api/ai/generate-broll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: visualPrompt })
      });
      const data = await res.json();
      if (!data.jobId) throw new Error(data.error || 'No jobId');
      setGenJobId(data.jobId);
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const sr = await fetch(`/api/ai/generate-broll?jobId=${data.jobId}`);
          const sd = await sr.json();
          if (sd.status === 'completed' && sd.url) {
            clearInterval(pollRef.current!);
            setGeneratedUrl(sd.url);
            setIsGenerating(false);
          } else if (sd.status === 'failed' || attempts > 40) {
            clearInterval(pollRef.current!);
            setIsGenerating(false);
            const win = (globalThis as any).window; if (win) win.alert('Генерация не удалась. Попробуйте другой промпт.');
          }
        } catch { /* keep polling */ }
      }, 3000);
    } catch (e: any) {
      setIsGenerating(false);
      const win = (globalThis as any).window; if (win) win.alert(`Ошибка: ${e.message}`);
    }
  };

  const getSourceBadge = (item: VideoItem) => {
    if (item.source === 'giphy') return { label: 'GIF', color: 'text-pink-400' };
    if (item.tags?.includes('pixabay')) return { label: 'Pixabay', color: 'text-cyan-400' };
    return { label: 'Pexels', color: 'text-blue-400' };
  };

  if (!isOpen || !clip) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-black flex flex-col overflow-hidden"
    >
      {/* ── HEADER ── */}
      <div className="flex-none flex items-center gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] md:pt-3 border-b border-white/[0.06]">
        <button
          onClick={screen === 'search' ? onClose : () => setScreen(screen === 'edit-prompt' ? 'generate' : 'search')}
          className="p-2.5 rounded-2xl bg-white/5 border border-white/8 active:scale-95 transition-all"
        >
          <ArrowLeft size={16} className="text-white/60" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-[12px] font-black uppercase tracking-widest text-white truncate">
            {screen === 'search' && clip.label}
            {screen === 'generate' && 'Генерация Б-ролла'}
            {screen === 'edit-prompt' && 'Редактор промпта'}
          </h2>
          <p className="text-[8px] text-white/30 font-bold uppercase tracking-[0.15em]">
            {fmt(clip.startTime)} → {fmt(clip.endTime)} · {(clip.endTime - clip.startTime).toFixed(1)}s
          </p>
        </div>
        {screen === 'search' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const win = (globalThis as any).window; if (win && win.confirm('Вы уверены, что хотите удалить этот Б-ролл?')) {
                  onDelete?.(clip.id);
                  onClose();
                }
              }}
              className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              Удалить
            </button>
            <button
              onClick={() => { setEditPromptDraft(visualPrompt); setScreen('generate'); }}
              className="px-3 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Zap size={11} /> Генерировать
            </button>
          </div>
        )}
        {screen !== 'search' && (
          <button onClick={onClose} className="p-2 text-white/25 hover:text-white transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── SCREEN: SEARCH ── */}
      {screen === 'search' && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {/* Search bar */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 flex items-center gap-2 bg-white/[0.04] border border-white/8 rounded-2xl px-3 py-2.5 focus-within:border-purple-500/40 transition-colors">
                <Search size={13} className="text-white/25 flex-shrink-0" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery((e.target as any).value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="1-3 ключевых слова..."
                  className="flex-1 bg-transparent text-[12px] text-white font-semibold outline-none placeholder:text-white/20"
                />
              </div>
              <button
                onClick={() => handleSearch()}
                disabled={isSearching}
                className="px-4 rounded-2xl bg-white/8 border border-white/10 text-white/60 active:scale-95 transition-all disabled:opacity-40"
              >
                {isSearching ? <RefreshCcw size={14} className="animate-spin" /> : <Search size={14} />}
              </button>
            </div>

            {/* Results */}
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="relative">
                  <RefreshCcw size={36} className="text-purple-500/30 animate-spin" />
                  <Sparkles size={16} className="text-purple-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 animate-pulse">Поиск клипов...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5">
                {results.map(item => {
                  const badge = getSourceBadge(item);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setPreviewItem(item)}
                      className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/8 hover:border-purple-500/40 cursor-pointer transition-all"
                      style={{ aspectRatio: '9/16' }}
                    >
                      {item.previewUrl && (
                        <img src={item.previewUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play size={14} className="text-white fill-white ml-0.5" />
                        </div>
                      </div>
                      <span className={`absolute bottom-2 left-2 text-[7px] font-black uppercase tracking-widest ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-3 border border-dashed border-white/8 rounded-2xl">
                <Film size={28} className="text-white/10" />
                <p className="text-[9px] font-black uppercase tracking-widest text-white/20 text-center">
                  Введите запрос и нажмите поиск
                </p>
              </div>
            )}
          </div>

          {/* Footer: Generate button */}
          <div className="flex-none px-4 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] border-t border-white/[0.06]">
            <button
              onClick={() => { setEditPromptDraft(visualPrompt); setScreen('generate'); }}
              className="w-full py-4 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[11px] text-white shadow-xl shadow-purple-900/30 active:scale-95 transition-all relative overflow-hidden"
            >
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] pointer-events-none"
              />
              <Zap size={16} /> Генерировать Б-ролл
            </button>
          </div>
        </>
      )}

      {/* ── SCREEN: GENERATE ── */}
      {screen === 'generate' && (
        <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] gap-4">
          {/* Prompt card */}
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/30">Промпт</span>
                {clip.anchor_type && (
                  <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border ${
                    clip.anchor_type === 'Literal'    ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' :
                    clip.anchor_type === 'Conceptual' ? 'bg-violet-500/15 border-violet-500/30 text-violet-400' :
                    clip.anchor_type === 'Emotional'  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                                                        'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  }`}>
                    {clip.anchor_type}
                  </span>
                )}
              </div>
              <button
                onClick={() => { setEditPromptDraft(visualPrompt); setScreen('edit-prompt'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-white/50 text-[9px] font-black uppercase tracking-widest hover:text-white hover:bg-white/8 transition-all active:scale-95"
              >
                <Pencil size={10} /> Изменить
              </button>
            </div>
            {clip.scene_concept && (
              <p className="text-[10px] text-white/40 italic leading-snug border-l-2 border-white/10 pl-3">{clip.scene_concept}</p>
            )}
            <p className="text-[11px] text-white/80 leading-relaxed font-medium">{visualPrompt || '— промпт не задан —'}</p>
          </div>

          {/* Generate button or status */}
          {!generatedUrl && !isGenerating && (
            <button
              onClick={handleGenerate}
              disabled={!visualPrompt}
              className="w-full py-5 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 flex flex-col items-center gap-1.5 font-black uppercase tracking-widest text-[12px] text-white shadow-xl shadow-purple-900/30 active:scale-95 transition-all disabled:opacity-40 relative overflow-hidden"
            >
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] pointer-events-none"
              />
              <Zap size={20} />
              Запустить генерацию
              <span className="text-[8px] font-bold text-white/50 uppercase tracking-[0.15em] normal-case">
                Higgsfield · 9:16 · ~60s
              </span>
            </button>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-10 gap-5 bg-white/[0.02] border border-white/8 rounded-2xl">
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-14 h-14 rounded-full border-2 border-purple-500/30 border-t-purple-500"
                />
                <Sparkles size={20} className="text-purple-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-[11px] font-black uppercase tracking-widest text-white">Генерирую видео...</p>
                <p className="text-[8px] text-white/30 font-bold uppercase tracking-[0.15em]">Обычно 40–90 секунд</p>
              </div>
            </div>
          )}

          {/* Preview */}
          {generatedUrl && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-white/8" style={{ aspectRatio: '9/16', maxHeight: '40vh' }}>
                <video
                  key={generatedUrl}
                  src={generatedUrl}
                  autoPlay muted loop playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                  <span className="text-[8px] font-black uppercase tracking-widest text-green-400">AI Generated</span>
                </div>
              </div>
              <button
                onClick={() => { onSelect(clip.id, generatedUrl, 'AI Generated'); onClose(); }}
                className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[12px] flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Check size={18} /> Использовать этот клип
              </button>
              <button
                onClick={() => { setGeneratedUrl(''); setGenJobId(''); }}
                className="w-full py-3 rounded-2xl bg-white/5 border border-white/8 text-white/40 font-black uppercase tracking-widest text-[9px] active:scale-95 transition-all"
              >
                Переделать
              </button>
            </div>
          )}

          <button
            onClick={() => setScreen('search')}
            className="w-full py-3 rounded-2xl bg-white/[0.03] border border-white/8 text-white/35 font-black uppercase tracking-widest text-[9px] active:scale-95 transition-all"
          >
            ← Назад к поиску Pexels
          </button>
        </div>
      )}

      {/* ── SCREEN: EDIT-PROMPT ── */}
      {screen === 'edit-prompt' && (
        <div className="flex-1 flex flex-col px-4 pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] gap-4 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase tracking-[0.25em] text-white/30 flex items-center gap-1.5">
              <Sparkles size={9} /> Визуальный промпт
            </label>
            <div className="bg-white/[0.04] border border-white/8 rounded-2xl px-4 py-3 focus-within:border-purple-500/40 transition-colors">
              <textarea
                value={editPromptDraft}
                onChange={e => setEditPromptDraft((e.target as any).value)}
                rows={6}
                className="w-full bg-transparent text-[12px] text-white/85 outline-none resize-none placeholder:text-white/20 leading-relaxed"
                placeholder="Детальный cinematic промпт..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase tracking-[0.25em] text-white/30 flex items-center gap-1.5">
              <MessageSquare size={9} /> Комментарий (ИИ учтёт при доработке)
            </label>
            <div className="bg-white/[0.04] border border-white/8 rounded-2xl px-4 py-3 focus-within:border-amber-500/30 transition-colors">
              <textarea
                value={userComment}
                onChange={e => setUserComment((e.target as any).value)}
                rows={2}
                className="w-full bg-transparent text-[11px] text-white/70 outline-none resize-none placeholder:text-white/20 leading-relaxed"
                placeholder="Хочу больше движения, ночная съёмка..."
              />
            </div>
          </div>

          <button
            onClick={handleRefinePrompt}
            disabled={isRefining}
            className="w-full py-4 rounded-2xl bg-gradient-to-br from-amber-600/80 to-orange-600/80 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[11px] text-white active:scale-95 transition-all disabled:opacity-50"
          >
            {isRefining ? <RefreshCcw size={15} className="animate-spin" /> : <Wand2 size={15} />}
            {isRefining ? 'ИИ улучшает...' : 'Уточнить с ИИ'}
          </button>

          <button
            onClick={handleSavePrompt}
            className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Check size={16} /> Сохранить и генерировать
          </button>
        </div>
      )}

      {/* ── FULL-SCREEN VIDEO PREVIEW (search result) ── */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[130] bg-black flex flex-col"
          >
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+16px)] md:pt-4 z-20">
              <button onClick={() => setPreviewItem(null)} className="p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white active:scale-95">
                <ArrowLeft size={18} />
              </button>
            </div>
            <video
              key={previewItem.videoUrl}
              src={previewItem.videoUrl}
              autoPlay muted loop playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] md:pb-4 space-y-2.5 z-20 bg-gradient-to-t from-black via-black/80 to-transparent">
              <button
                onClick={() => { onSelect(clip.id, previewItem.videoUrl, previewItem.title || 'Stock Clip'); setPreviewItem(null); onClose(); }}
                className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-[12px] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Check size={18} /> Использовать
              </button>
              <button onClick={() => setPreviewItem(null)} className="w-full h-10 rounded-xl bg-white/5 border border-white/8 text-white/40 font-black uppercase tracking-widest text-[9px] active:scale-95 transition-all">
                Выбрать другой
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BRollEditorModal;
