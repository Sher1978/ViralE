'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowUp, ArrowDown, Scissors, Trash2, X, Check, 
  Palette, Highlighter, Replace, Undo2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SubtitleClip } from '../_hooks/useStudioState';

interface EditorCaptionEditorProps {
  subtitleClips: SubtitleClip[];
  setSubtitleClips: React.Dispatch<React.SetStateAction<SubtitleClip[]>>;
  currentTime: number;
  onSeek: (time: number) => void;
  onClose: () => void;
}

const fmt = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

export const EditorCaptionEditor: React.FC<EditorCaptionEditorProps> = ({
  subtitleClips,
  setSubtitleClips,
  currentTime,
  onSeek,
  onClose
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-select based on current time if nothing selected
  useEffect(() => {
    const active = subtitleClips.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
    if (active && !selectedId) {
      setSelectedId(active.id);
      setEditingText(active.text);
    }
  }, [currentTime, subtitleClips, selectedId]);

  const handleSelect = (sub: SubtitleClip) => {
    setSelectedId(sub.id);
    setEditingText(sub.text);
    onSeek(sub.startTime);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleUpdateText = (text: string) => {
    setEditingText(text);
    if (selectedId) {
      setSubtitleClips(prev => prev.map(s => s.id === selectedId ? { ...s, text } : s));
    }
  };

  const handleDelete = () => {
    if (!selectedId) return;
    setSubtitleClips(prev => prev.filter(s => s.id !== selectedId));
    setSelectedId(null);
    setEditingText('');
  };

  const handleSplit = () => {
    if (!selectedId) return;
    const sub = subtitleClips.find(s => s.id === selectedId);
    if (!sub) return;

    const midTime = sub.startTime + (sub.endTime - sub.startTime) / 2;
    const words = sub.text.split(' ');
    const half = Math.ceil(words.length / 2);
    const text1 = words.slice(0, half).join(' ');
    const text2 = words.slice(half).join(' ');

    const newSub1 = { ...sub, text: text1, endTime: midTime };
    const newSub2 = { 
        id: `sub_${Date.now()}`, 
        text: text2 || '...', 
        startTime: midTime, 
        endTime: sub.endTime,
        style: sub.style 
    };

    setSubtitleClips(prev => {
        const filtered = prev.filter(s => s.id !== selectedId);
        return [...filtered, newSub1, newSub2].sort((a, b) => a.startTime - b.startTime);
    });
    setSelectedId(newSub2.id);
    setEditingText(newSub2.text);
  };

  return (
    <div className="flex flex-col h-full bg-[#111] text-white">
      {/* List Area */}
      <div 
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar"
      >
        {subtitleClips.map((sub) => {
          const isActive = selectedId === sub.id;
          const isCurrent = currentTime >= sub.startTime && currentTime <= sub.endTime;
          
          return (
            <button
              key={sub.id}
              onClick={() => handleSelect(sub)}
              className={`w-full text-left p-4 rounded-2xl transition-all border ${
                isActive 
                  ? 'bg-white/10 border-white/20 shadow-lg' 
                  : isCurrent 
                    ? 'bg-white/5 border-purple-500/30' 
                    : 'bg-transparent border-transparent opacity-40'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`text-[10px] font-bold tabular-nums mt-1 ${isActive || isCurrent ? 'text-purple-400' : 'text-white/20'}`}>
                  {fmt(sub.startTime)}
                </span>
                <p className={`text-[15px] leading-snug font-medium ${isActive ? 'text-white' : 'text-white/70'}`}>
                  {sub.text}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Editing Toolbar & Input */}
      <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 space-y-4">
        {/* Context Actions */}
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
                <button className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
                    <ArrowUp size={18} />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Merge</span>
                </button>
                <button className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
                    <ArrowDown size={18} />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Merge</span>
                </button>
                <button 
                    onClick={handleSplit}
                    className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity"
                >
                    <Scissors size={18} />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Split</span>
                </button>
                <button 
                    onClick={handleDelete}
                    className="flex flex-col items-center gap-1 text-red-500/60 hover:text-red-500 transition-colors"
                >
                    <Trash2 size={18} />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Delete</span>
                </button>
            </div>
            
            <button 
                onClick={onClose}
                className="flex flex-col items-center gap-1 text-white/40 hover:text-white"
            >
                <X size={18} />
                <span className="text-[9px] font-bold uppercase tracking-tighter">Dismiss</span>
            </button>
        </div>

        {/* Text Input */}
        <div className="relative">
            <textarea
                ref={inputRef}
                value={editingText}
                onChange={(e) => handleUpdateText(e.target.value)}
                placeholder="Select a caption to edit..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-[16px] focus:outline-none focus:border-purple-500/50 transition-all resize-none h-20"
                onFocus={() => {
                    if (!selectedId && subtitleClips.length > 0) {
                        setSelectedId(subtitleClips[0].id);
                        setEditingText(subtitleClips[0].text);
                    }
                }}
            />
        </div>

        {/* Style/Secondary Actions */}
        <div className="flex items-center justify-center gap-8 py-2 border-t border-white/5">
            <button className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
                <Palette size={16} />
                <span className="text-[11px] font-bold uppercase tracking-widest">Style</span>
            </button>
            <button className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
                <Highlighter size={16} />
                <span className="text-[11px] font-bold uppercase tracking-widest">Highlight</span>
            </button>
            <button className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
                <Replace size={16} />
                <span className="text-[11px] font-bold uppercase tracking-widest">Replace</span>
            </button>
        </div>
      </div>
    </div>
  );
};
