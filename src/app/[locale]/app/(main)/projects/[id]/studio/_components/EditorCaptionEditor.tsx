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
  initialSelectedId?: string | null;
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
  onClose,
  initialSelectedId
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || null);
  const [editingText, setEditingText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-select based on current time if nothing selected or initialSelectedId provided
  useEffect(() => {
    if (initialSelectedId) {
        setSelectedId(initialSelectedId);
        const sub = subtitleClips.find(s => s.id === initialSelectedId);
        if (sub) setEditingText(sub.text);
    } else {
        const active = subtitleClips.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
        if (active && !selectedId) {
          setSelectedId(active.id);
          setEditingText(active.text);
        }
    }
  }, [initialSelectedId, currentTime, subtitleClips]);

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
    <div className="flex flex-col h-full bg-[#0a0a0c] text-white">
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
              id={`sub-item-${sub.id}`}
              onClick={() => handleSelect(sub)}
              className={`w-full text-left p-4 rounded-2xl transition-all border ${
                isActive 
                  ? 'bg-yellow-500/10 border-yellow-500/30 shadow-lg shadow-yellow-500/5' 
                  : isCurrent 
                    ? 'bg-white/5 border-white/20' 
                    : 'bg-transparent border-transparent opacity-40 hover:opacity-100 hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`text-[10px] font-bold tabular-nums mt-1 ${isActive ? 'text-yellow-400' : isCurrent ? 'text-white/60' : 'text-white/20'}`}>
                  {fmt(sub.startTime)}
                </span>
                <p className={`text-[15px] leading-snug font-black italic uppercase tracking-tighter ${isActive ? 'text-yellow-400' : 'text-white/70'}`}>
                  {sub.text}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Editing Toolbar & Input */}
      <div className="bg-black/90 backdrop-blur-3xl border-t border-white/10 p-6 space-y-6">
        {/* Context Actions */}
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-6">
                <button className="flex flex-col items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
                    <ArrowUp size={20} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Merge Up</span>
                </button>
                <button 
                    onClick={handleSplit}
                    className="flex flex-col items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity"
                >
                    <Scissors size={20} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Split</span>
                </button>
                <button 
                    onClick={handleDelete}
                    className="flex flex-col items-center gap-1.5 text-red-500/40 hover:text-red-500 transition-colors"
                >
                    <Trash2 size={20} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-500/60">Delete</span>
                </button>
            </div>
            
            <button 
                onClick={onClose}
                className="px-6 py-2 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 transition-all"
            >
                <span className="text-[10px] font-black uppercase tracking-widest">Done</span>
            </button>
        </div>

        {/* Text Input */}
        <div className="relative">
            <textarea
                ref={inputRef}
                value={editingText}
                onChange={(e) => handleUpdateText(e.target.value)}
                placeholder="Select a caption to edit..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 text-white text-[18px] font-black italic uppercase tracking-tighter focus:outline-none focus:border-yellow-500/50 transition-all resize-none h-24 placeholder:text-white/10"
                onFocus={() => {
                    if (!selectedId && subtitleClips.length > 0) {
                        setSelectedId(subtitleClips[0].id);
                        setEditingText(subtitleClips[0].text);
                    }
                }}
            />
            <div className="absolute bottom-4 right-6 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500/60">Live Edit</span>
            </div>
        </div>

        {/* Style/Secondary Actions */}
        <div className="flex items-center justify-around py-2">
            <button className="flex items-center gap-3 text-white/30 hover:text-yellow-400 transition-colors group">
                <Palette size={18} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Styles</span>
            </button>
            <div className="w-[1px] h-4 bg-white/10" />
            <button className="flex items-center gap-3 text-white/30 hover:text-yellow-400 transition-colors group">
                <Highlighter size={18} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Highlight</span>
            </button>
            <div className="w-[1px] h-4 bg-white/10" />
            <button className="flex items-center gap-3 text-white/30 hover:text-yellow-400 transition-colors group">
                <Replace size={18} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Magic Fix</span>
            </button>
        </div>
      </div>
    </div>
  );
};
