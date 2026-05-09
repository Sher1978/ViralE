'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import BRollModal from '@/components/studio/BRollPickerModal';
import { SubtitleClip, TranscriptWord, BRollClip } from '../_hooks/useStudioState';

interface StudioModalsProps {
  // Subtitle Editor
  subtitleEditorOpen: boolean;
  setSubtitleEditorOpen: (open: boolean) => void;
  subtitleEditText: string;
  setSubtitleEditText: (text: string) => void;
  editingSubtitleId: string | null;
  setSubtitleClips: React.Dispatch<React.SetStateAction<SubtitleClip[]>>;
  setSelectedClipId: (id: string | null) => void;

  // Phrase Picker
  phrasePickerOpen: boolean;
  setPhrasePickerOpen: (open: boolean) => void;
  setEditingPhraseId: (id: string | null) => void;
  transcript: TranscriptWord[];
  handleSwapPhrase: (word: TranscriptWord) => void;

  // B-Roll Modal
  brollModalOpen: boolean;
  setBrollModalOpen: (open: boolean) => void;
  setActiveBrollPhraseId: (id: string | null) => void;
  setStage: (stage: any) => void;
  handleBRollSelect: (url: string, label: string) => void;
  activeBrollPrompt: string;
  projectId: string;
  preFetchedBrolls: Record<string, any[]>;
  activeBrollPhraseId: string | null;
  brollClips: BRollClip[];
  setBrollClips: React.Dispatch<React.SetStateAction<BRollClip[]>>;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

export const StudioModals: React.FC<StudioModalsProps> = ({
  subtitleEditorOpen, setSubtitleEditorOpen, subtitleEditText, setSubtitleEditText, editingSubtitleId, setSubtitleClips, setSelectedClipId,
  phrasePickerOpen, setPhrasePickerOpen, setEditingPhraseId, transcript, handleSwapPhrase,
  brollModalOpen, setBrollModalOpen, setActiveBrollPhraseId, setStage, handleBRollSelect, activeBrollPrompt, projectId, preFetchedBrolls, activeBrollPhraseId, brollClips, setBrollClips
}) => {
  return (
    <>
      {/* SUBTITLE EDITOR MODAL */}
      <AnimatePresence>
        {subtitleEditorOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-[#12121a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-black uppercase tracking-widest text-white/40">Edit Subtitle</h3>
                <button onClick={() => setSubtitleEditorOpen(false)} className="p-2 text-white/20 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <textarea
                value={subtitleEditText}
                onChange={(e) => setSubtitleEditText(e.target.value)}
                className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-purple-500 transition-all resize-none"
                placeholder="Enter text..."
              />

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    if (editingSubtitleId) {
                      setSubtitleClips(prev => prev.map(s => s.id === editingSubtitleId ? { ...s, text: subtitleEditText } : s));
                    }
                    setSubtitleEditorOpen(false);
                  }}
                  className="w-full py-4 bg-purple-500 rounded-2xl text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    if (editingSubtitleId) {
                      setSubtitleClips(prev => prev.filter(s => s.id !== editingSubtitleId));
                      setSelectedClipId(null);
                    }
                    setSubtitleEditorOpen(false);
                  }}
                  className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-black uppercase tracking-widest text-[11px] active:scale-95 transition-all"
                >
                  Delete Subtitle
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHRASE PICKER */}
      <AnimatePresence>
        {phrasePickerOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] bg-black/90 backdrop-blur-md flex flex-col"
          >
            <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-white/5">
              <div>
                <h3 className="text-[12px] font-black uppercase tracking-widest text-white">Select Phrase</h3>
                <p className="text-[9px] text-white/30 mt-0.5">Tap a line to use as the B-Roll moment</p>
              </div>
              <button onClick={() => { setPhrasePickerOpen(false); setEditingPhraseId(null); }}
                className="p-2.5 rounded-2xl bg-white/5 border border-white/10 active:scale-95">
                <X size={15} className="text-white/60" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
              {transcript.map((word, i) => (
                <button key={i} onClick={() => handleSwapPhrase(word)}
                  className="w-full text-left p-4 rounded-2xl bg-white/[0.04] border border-white/8 hover:bg-purple-500/10 hover:border-purple-500/20 active:scale-98 transition-all group">
                  <div className="flex items-start gap-4">
                    <span className="text-[10px] font-black text-white/30 tabular-nums pt-0.5 flex-shrink-0">{fmt(word.start)}</span>
                    <span className="text-[13px] text-white/80 leading-snug group-hover:text-white transition-colors">{word.text}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* B-ROLL AI MODAL */}
      <BRollModal
        isOpen={brollModalOpen}
        onClose={() => {
          setBrollModalOpen(false);
          setActiveBrollPhraseId(null);
          setStage('editing');
        }}
        onSelect={handleBRollSelect}
        segmentText={activeBrollPrompt}
        projectId={projectId}
        preFetchedResults={activeBrollPhraseId ? preFetchedBrolls[activeBrollPhraseId] : undefined}
        onDelete={() => {
           if (activeBrollPhraseId) {
              const clip = brollClips.find(c => c.phraseId === activeBrollPhraseId || c.id === activeBrollPhraseId);
              if (clip) {
                 setBrollClips(prev => prev.filter(c => c.id !== clip.id));
                 setSelectedClipId(null);
                 setBrollModalOpen(false);
              }
           }
        }}
      />
    </>
  );
};
