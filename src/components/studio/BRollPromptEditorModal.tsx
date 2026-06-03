'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Wand2, RefreshCcw, Sparkles, ArrowLeft,
  Play, Check, MessageSquare, Film, ChevronRight
} from 'lucide-react';

interface VideoItem {
  id: string;
  source: 'stock' | 'movie' | 'ai' | 'giphy';
  title?: string;
  previewUrl: string;
  videoUrl: string;
  tags?: string[];
}

export interface BRollClipMeta {
  id: string;
  label: string;
  startTime: number;
  endTime: number;
  prompt: string;        // broll_topic / search query
  visual_prompt?: string; // full cinematic prompt
  url: string;
}

interface BRollPromptEditorModalProps {
  clip: BRollClipMeta | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (clipId: string, videoUrl: string, label?: string) => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

const BRollPromptEditorModal: React.FC<BRollPromptEditorModalProps> = ({
  clip, isOpen, onClose, onSelect
}) => {
  const [topic, setTopic] = useState('');
  const [visualPrompt, setVisualPrompt] = useState('');
  const [userComment, setUserComment] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [results, setResults] = useState<VideoItem[]>([]);
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (clip && isOpen) {
      setTopic(clip.prompt || '');
      setVisualPrompt(clip.visual_prompt || clip.prompt || '');
      setUserComment('');
      setResults([]);
      setPreviewVideo(null);
    }
  }, [clip, isOpen]);

  const handleSearch = async (queryOverride?: string) => {
    const query = queryOverride || topic;
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/ai/broll-search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.videos || []);
    } catch (err) {
      console.error('[BRollPromptEditor] Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRefineWithAI = async () => {
    if (!topic && !userComment) return;
    setIsRefining(true);
    try {
      const combinedContext = userComment
        ? `Original: "${topic}". User feedback: "${userComment}". Visual style: "${visualPrompt}"`
        : topic;

      const res = await fetch('/api/ai/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: combinedContext, mode: 'search' })
      });
      const data = await res.json();
      if (data.optimized) {
        setTopic(data.optimized);
        await handleSearch(data.optimized);
      } else {
        await handleSearch();
      }
    } catch (err) {
      console.error('[BRollPromptEditor] AI Refine failed:', err);
      await handleSearch();
    } finally {
      setIsRefining(false);
    }
  };

  const getSourceBadge = (item: VideoItem) => {
    if (item.source === 'giphy') return { label: 'GIF • GIPHY', color: 'text-pink-400' };
    if (item.source === 'ai') return { label: 'AI Generated', color: 'text-purple-400' };
    if (item.source === 'movie') return { label: 'Semantic AI', color: 'text-emerald-400' };
    if (item.tags?.includes('pixabay')) return { label: 'Pixabay', color: 'text-cyan-400' };
    return { label: 'Pexels', color: 'text-blue-400' };
  };

  if (!isOpen || !clip) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex-none flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/5 border border-white/8 active:scale-95 transition-all"
          >
            <ArrowLeft size={18} className="text-white/60" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[13px] font-black uppercase tracking-widest text-white truncate">
              {clip.label}
            </h2>
            <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.2em]">
              {fmt(clip.startTime)} → {fmt(clip.endTime)} · {(clip.endTime - clip.startTime).toFixed(1)}s
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Film size={12} className="text-indigo-400" />
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Редактор</span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Topic / Search Query */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 flex items-center gap-2">
              <Search size={10} /> Поисковый запрос
            </label>
            <div className="bg-white/[0.04] border border-white/8 rounded-2xl flex items-center gap-3 px-4 py-3 focus-within:border-purple-500/40 transition-colors">
              <textarea
                value={topic}
                onChange={e => setTopic((e.target as any).value)}
                rows={2}
                className="flex-1 bg-transparent text-sm text-white font-semibold italic outline-none resize-none placeholder:text-white/20 leading-relaxed"
                placeholder="cinematic urban shot, luxury..."
              />
            </div>
          </div>

          {/* Visual Prompt */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 flex items-center gap-2">
              <Sparkles size={10} /> Визуальный промпт (Veo / Runway)
            </label>
            <div className="bg-white/[0.04] border border-white/8 rounded-2xl px-4 py-3 focus-within:border-purple-500/40 transition-colors">
              <textarea
                value={visualPrompt}
                onChange={e => setVisualPrompt((e.target as any).value)}
                rows={4}
                className="w-full bg-transparent text-[12px] text-white/70 outline-none resize-none placeholder:text-white/20 leading-relaxed"
                placeholder="Detailed cinematic prompt for video generation..."
              />
            </div>
          </div>

          {/* User Comment for Regeneration */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 flex items-center gap-2">
              <MessageSquare size={10} /> Комментарий для переработки
            </label>
            <div className="bg-white/[0.04] border border-white/8 rounded-2xl px-4 py-3 focus-within:border-amber-500/40 transition-colors">
              <textarea
                value={userComment}
                onChange={e => setUserComment((e.target as any).value)}
                rows={2}
                className="w-full bg-transparent text-[12px] text-white/70 outline-none resize-none placeholder:text-white/20 leading-relaxed"
                placeholder="Хочу больше динамики, городской пейзаж, ночная съемка..."
              />
            </div>
            <p className="text-[9px] text-white/20 font-bold uppercase tracking-[0.15em] px-1">
              ИИ учтёт комментарий и улучшит поисковый запрос
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleRefineWithAI}
              disabled={isRefining || isSearching}
              className="py-4 rounded-2xl bg-gradient-to-br from-amber-600/80 to-orange-600/80 flex flex-col items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-orange-900/20"
            >
              {isRefining ? (
                <RefreshCcw size={18} className="animate-spin text-white/80" />
              ) : (
                <Wand2 size={18} className="text-white" />
              )}
              <span className="text-[10px] font-black uppercase tracking-widest text-white">
                {isRefining ? 'ИИ думает...' : 'Уточнить с ИИ'}
              </span>
            </button>
            <button
              onClick={() => handleSearch()}
              disabled={isSearching || isRefining}
              className="py-4 rounded-2xl bg-white/8 border border-white/10 flex flex-col items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSearching ? (
                <RefreshCcw size={18} className="animate-spin text-white/60" />
              ) : (
                <Search size={18} className="text-white/70" />
              )}
              <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                {isSearching ? 'Поиск...' : 'Найти клипы'}
              </span>
            </button>
          </div>

          {/* Results Grid */}
          {(isSearching || isRefining) && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative">
                <RefreshCcw size={40} className="text-purple-500/30 animate-spin" />
                <Sparkles size={20} className="text-purple-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 animate-pulse">
                {isRefining ? 'ИИ-режиссёр обрабатывает...' : 'Сканирование библиотеки...'}
              </p>
            </div>
          )}

          {!isSearching && !isRefining && results.length > 0 && (
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">
                Найдено {results.length} клипов — выберите
              </p>
              <div className="grid grid-cols-2 gap-3">
                {results.map(item => {
                  const badge = getSourceBadge(item);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setPreviewVideo(item)}
                      className="group relative overflow-hidden bg-white/5 border border-white/8 hover:border-purple-500/50 cursor-pointer transition-all rounded-2xl"
                      style={{ aspectRatio: '9/16' }}
                    >
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.title}
                          crossOrigin="anonymous"
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-purple-900/20">
                          <Play size={24} className="text-purple-400 opacity-50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play size={14} className="text-white fill-white ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 z-10">
                        <span className={`text-[7px] font-black uppercase tracking-widest block ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isSearching && !isRefining && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 border border-dashed border-white/8 rounded-2xl">
              <Film size={32} className="text-white/10" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20 text-center">
                Измените промпт и нажмите<br/>"Найти клипы"
              </p>
            </div>
          )}
        </div>

        {/* Full-screen video preview */}
        <AnimatePresence>
          {previewVideo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-0 z-[130] bg-black flex flex-col"
            >
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-5 z-20">
                <button
                  onClick={() => setPreviewVideo(null)}
                  className="p-3 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-white active:scale-95"
                >
                  <ArrowLeft size={18} />
                </button>
                <span className="px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/70">
                  {getSourceBadge(previewVideo).label}
                </span>
              </div>

              <video
                ref={videoRef}
                key={previewVideo.videoUrl}
                src={previewVideo.videoUrl}
                autoPlay muted loop playsInline crossOrigin="anonymous"
                className="w-full h-full object-cover"
              />

              <div className="absolute bottom-0 left-0 right-0 p-5 z-20 space-y-3">
                <button
                  onClick={() => {
                    if (clip) {
                      onSelect(clip.id, previewVideo.videoUrl, previewVideo.title || 'Stock Clip');
                    }
                    setPreviewVideo(null);
                    onClose();
                  }}
                  className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-[0.3em] text-sm active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <Check size={20} />
                  Использовать этот клип
                </button>
                <button
                  onClick={() => setPreviewVideo(null)}
                  className="w-full h-10 rounded-xl bg-white/5 border border-white/8 text-white/40 font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all"
                >
                  Выбрать другой
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default BRollPromptEditorModal;
