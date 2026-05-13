'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Palette, Highlighter, Replace, Undo2, Check
} from 'lucide-react';
import { SubtitleClip } from '../_hooks/useStudioState';
import { CaptionStyleSelector } from './CaptionStyleSelector';

interface EditorCaptionEditorProps {
  subtitleClips: SubtitleClip[];
  setSubtitleClips: React.Dispatch<React.SetStateAction<SubtitleClip[]>>;
  currentTime: number;
  onSeek: (time: number) => void;
  onClose: () => void;
  initialSelectedId?: string | null;
  subtitleStyle: number;
  setSubtitleStyle: (style: number) => void;
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
  initialSelectedId,
  subtitleStyle,
  setSubtitleStyle
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || null);
  const [view, setView] = useState<'list' | 'style'>('list');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSelectedId) {
        setSelectedId(initialSelectedId);
    } else {
        const active = subtitleClips.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
        if (active && !selectedId) setSelectedId(active.id);
    }
  }, [initialSelectedId, currentTime, subtitleClips]);

  const handleSelect = (sub: SubtitleClip) => {
    setSelectedId(sub.id);
    onSeek(sub.startTime);
  };

  const handleTextChange = (id: string, newText: string) => {
    setSubtitleClips(prev => prev.map(s => s.id === id ? { ...s, text: newText } : s));
  };

  if (view === 'style') {
    return (
      <CaptionStyleSelector 
        currentStyle={subtitleStyle}
        onSelect={(idx) => {
            setSubtitleStyle(idx);
            setView('list');
        }}
        onClose={() => setView('list')}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0d0d12] text-white rounded-t-[3rem] overflow-hidden">
      {/* Header */}
      <div className="relative flex items-center justify-between px-6 py-8 border-b border-white/5">
        <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
            <Undo2 size={24} />
        </button>
        <h2 className="text-xl font-bold tracking-tight uppercase">Edit captions</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Phrase List */}
      <div 
        ref={listRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar"
      >
        {subtitleClips.map((sub) => {
          const isActive = selectedId === sub.id;
          
          return (
            <div
              key={sub.id}
              className="w-full text-left transition-all flex items-start gap-6 group"
            >
              <button 
                onClick={() => handleSelect(sub)}
                className={`text-[13px] font-medium tabular-nums mt-1 w-10 shrink-0 ${isActive ? 'text-white/60' : 'text-white/20'}`}
              >
                {fmt(sub.startTime)}
              </button>
              
              {isActive ? (
                <div className="flex-1 relative">
                    <textarea 
                        autoFocus
                        value={sub.text}
                        onChange={(e) => handleTextChange(sub.id, e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[17px] leading-relaxed font-bold text-white focus:outline-none focus:border-purple-500 transition-all resize-none"
                        rows={2}
                    />
                </div>
              ) : (
                <button 
                    onClick={() => handleSelect(sub)}
                    className="text-[17px] leading-relaxed font-bold flex-1 text-left text-white/40 group-hover:text-white/60"
                >
                    {sub.text}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Tabs */}
      <div className="bg-[#0a0a0f] border-t border-white/5 px-8 pt-6 pb-10 flex items-center justify-between">
        <button 
            onClick={() => setView('style')}
            className="flex flex-col items-center gap-2 group"
        >
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                <Palette size={22} className="text-white/60 group-hover:text-white" />
            </div>
            <span className="text-[11px] font-bold text-white/40 group-hover:text-white/60">Style</span>
        </button>

        <button className="flex flex-col items-center gap-2 group opacity-20 pointer-events-none">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                <Highlighter size={22} className="text-white/60 group-hover:text-white" />
            </div>
            <span className="text-[11px] font-bold text-white/40 group-hover:text-white/60">Highlight</span>
        </button>

        <button className="flex flex-col items-center gap-2 group opacity-20 pointer-events-none">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                <Replace size={22} className="text-white/60 group-hover:text-white" />
            </div>
            <span className="text-[11px] font-bold text-white/40 group-hover:text-white/60">Replace</span>
        </button>
      </div>
    </div>
  );
};
