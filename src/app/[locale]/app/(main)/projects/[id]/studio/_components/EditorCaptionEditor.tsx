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
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || null);
  const [isBulkEdit, setIsBulkEdit] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSelectedId) {
        setSelectedId(initialSelectedId);
    } else {
        const active = subtitleClips.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
        if (active && !selectedId) setSelectedId(active.id);
    }
  }, [initialSelectedId, currentTime, subtitleClips]);

  useEffect(() => {
    if (isBulkEdit) {
      setBulkText(subtitleClips.map(s => s.text).join('\n'));
    }
  }, [isBulkEdit, subtitleClips]);

  const handleSelect = (sub: SubtitleClip) => {
    setSelectedId(sub.id);
    onSeek(sub.startTime);
  };

  const handleTextChange = (id: string, newText: string) => {
    setSubtitleClips(prev => prev.map(s => s.id === id ? { ...s, text: newText } : s));
  };

  const handleBulkChange = (val: string) => {
    setBulkText(val);
    const lines = val.split('\n');
    setSubtitleClips(prev => prev.map((s, i) => ({
      ...s,
      text: lines[i] || s.text // Preserve original if lines run out, or just empty
    })));
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d12] text-white rounded-t-[3rem] overflow-hidden">
      {/* Header */}
      <div className="relative flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
        <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
            <Undo2 size={22} />
        </button>
        <div className="flex flex-col items-center">
            <h2 className="text-lg font-black tracking-tight uppercase italic">Script Editor</h2>
            <button 
                onClick={() => setIsBulkEdit(!isBulkEdit)}
                className="text-[10px] font-bold uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors"
            >
                {isBulkEdit ? '‹ Back to List' : 'Edit All Text ›'}
            </button>
        </div>
        <div className="w-10" />
      </div>

      {/* Phrase List or Bulk Editor */}
      <div 
        ref={listRef}
        className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar"
      >
        {isBulkEdit ? (
          <div className="h-full flex flex-col gap-4">
            <textarea 
              autoFocus
              value={bulkText}
              onChange={(e) => handleBulkChange(e.target.value)}
              placeholder="Paste your script here..."
              className="flex-1 bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 text-[15px] leading-relaxed font-bold text-white focus:outline-none focus:border-purple-500 transition-all resize-none custom-scrollbar"
            />
            <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest text-center">
                Each line represents one subtitle clip
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {subtitleClips.map((sub) => {
              const isActive = selectedId === sub.id;
              
              return (
                <div
                  key={sub.id}
                  className="w-full text-left transition-all flex items-start gap-4 group"
                >
                  <button 
                    onClick={() => handleSelect(sub)}
                    className={`text-[11px] font-bold tabular-nums mt-1 w-10 shrink-0 ${isActive ? 'text-purple-400' : 'text-white/20'}`}
                  >
                    {fmt(sub.startTime)}
                  </button>
                  
                  {isActive ? (
                    <div className="flex-1 relative">
                        <textarea 
                            autoFocus
                            value={sub.text}
                            onChange={(e) => handleTextChange(sub.id, e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[15px] leading-snug font-bold text-white focus:outline-none focus:border-purple-500 transition-all resize-none"
                            rows={2}
                        />
                    </div>
                  ) : (
                    <button 
                        onClick={() => handleSelect(sub)}
                        className="text-[15px] leading-snug font-bold flex-1 text-left text-white/40 group-hover:text-white/60 transition-colors"
                    >
                        {sub.text}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="h-20" />
      </div>
    </div>
  );
};
